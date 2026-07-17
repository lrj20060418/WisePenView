import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';

import type {
  InlineComment,
  InlineCommentDraft,
  InlineCommentThread,
} from '../entity/inlineComment';
import type { IInteractService } from '../service/index.type';

const CHANGE_POLL_INTERVAL = 8_000;

export interface InlineCommentSessionSnapshot {
  threads: readonly InlineCommentThread[];
  loading: boolean;
  error?: unknown;
}

function compareThreads(a: InlineCommentThread, b: InlineCommentThread): number {
  return b.updatedAt - a.updatedAt || b.createdAt - a.createdAt;
}

export class InlineCommentSession {
  readonly resourceId: string;
  private readonly interactService: IInteractService;
  private readonly threadsById = new Map<string, InlineCommentThread>();
  private readonly knownRevisions = new Map<string, number>();
  private readonly subscribers = new Set<() => void>();
  private snapshot: InlineCommentSessionSnapshot = { threads: [], loading: false };
  private cursor?: string;
  private startPromise?: Promise<void>;
  private changesPromise?: Promise<void>;
  private pollTimer: number | null = null;
  private destroyed = false;

  constructor(resourceId: string, interactService: IInteractService) {
    this.resourceId = resourceId;
    this.interactService = interactService;
  }

  getSnapshot = (): InlineCommentSessionSnapshot => this.snapshot;

  subscribe = (listener: () => void): (() => void) => {
    this.subscribers.add(listener);
    return () => this.subscribers.delete(listener);
  };

  start(): Promise<void> {
    if (this.startPromise) return this.startPromise;
    this.startPromise = this.loadInitialThreads();
    return this.startPromise;
  }

  destroy(): void {
    this.destroyed = true;
    if (this.pollTimer !== null) {
      window.clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    this.subscribers.clear();
  }

  async createThread(
    params: InlineCommentDraft & { content: string; idempotencyKey: string }
  ): Promise<InlineCommentThread> {
    const thread = await this.interactService.createInlineCommentThread({
      resourceId: this.resourceId,
      idempotencyKey: params.idempotencyKey,
      anchor: params.anchor,
      quoteText: params.quoteText,
      content: params.content,
    });
    this.upsertThread(thread);
    return thread;
  }

  async addComment(
    threadId: string,
    content: string,
    idempotencyKey: string
  ): Promise<InlineComment> {
    const comment = await this.interactService.addInlineComment({
      threadId,
      idempotencyKey,
      content,
    });
    this.markKnownRevision(threadId, comment.revision);
    const cachedThread = this.threadsById.get(threadId);
    if (!cachedThread) {
      await this.recallThread(threadId);
      return comment;
    }

    const existingIndex = cachedThread.items.findIndex(
      (item) => item.commentId === comment.commentId
    );
    const items = [...cachedThread.items];
    if (existingIndex >= 0) {
      items[existingIndex] = comment;
    } else if (comment.revision === cachedThread.revision + 1) {
      items.push(comment);
    } else {
      await this.recallThread(threadId);
      return comment;
    }
    this.upsertThread({
      ...cachedThread,
      items,
      revision: Math.max(cachedThread.revision, comment.revision),
      updatedAt: Math.max(cachedThread.updatedAt, comment.createdAt),
    });
    return comment;
  }

  async recallThread(threadId: string): Promise<InlineCommentThread> {
    const thread = await this.interactService.getInlineCommentThread({ threadId });
    const knownRevision = this.knownRevisions.get(threadId) ?? 0;
    if (thread.revision < knownRevision) {
      throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
        reason: `批注 Thread ${threadId} 尚未同步到 revision ${knownRevision}`,
      });
    }
    this.upsertThread(thread);
    return thread;
  }

  async recallComment(threadId: string, commentId: string): Promise<InlineComment | undefined> {
    const cachedThread = this.threadsById.get(threadId);
    const knownRevision = this.knownRevisions.get(threadId) ?? cachedThread?.revision ?? 0;
    const authoritativeThread =
      cachedThread && cachedThread.revision >= knownRevision
        ? cachedThread
        : await this.recallThread(threadId);
    return authoritativeThread.items.find((comment) => comment.commentId === commentId);
  }

  async recallCommentPrecisely(threadId: string, commentId: string): Promise<InlineComment> {
    const comment = await this.interactService.getInlineComment({ threadId, commentId });
    this.markKnownRevision(threadId, comment.revision);
    const cachedThread = this.threadsById.get(threadId);
    if (cachedThread) {
      const existingIndex = cachedThread.items.findIndex(
        (item) => item.commentId === comment.commentId
      );
      if (existingIndex >= 0 && comment.revision <= cachedThread.revision) {
        const items = [...cachedThread.items];
        items[existingIndex] = comment;
        this.upsertThread({ ...cachedThread, items });
      } else if (existingIndex < 0 && comment.revision === cachedThread.revision + 1) {
        this.upsertThread({
          ...cachedThread,
          items: [...cachedThread.items, comment],
          revision: comment.revision,
          updatedAt: Math.max(cachedThread.updatedAt, comment.createdAt),
        });
      } else {
        await this.recallThread(threadId);
      }
    }
    return comment;
  }

  refreshChanges(): Promise<void> {
    if (this.changesPromise) return this.changesPromise;
    this.changesPromise = this.pullChanges().finally(() => {
      this.changesPromise = undefined;
    });
    return this.changesPromise;
  }

  private async loadInitialThreads(): Promise<void> {
    this.updateSnapshot({ loading: true, error: undefined });
    try {
      const threadList = await this.interactService.listInlineCommentThreads({
        resourceId: this.resourceId,
      });
      if (this.destroyed) return;
      this.cursor = threadList.cursor;
      threadList.items.forEach((thread) => this.upsertThread(thread, false));
      this.publish({ loading: false, error: undefined });
      this.pollTimer = window.setInterval(() => {
        void this.refreshChanges().catch(() => undefined);
      }, CHANGE_POLL_INTERVAL);
    } catch (error) {
      if (!this.destroyed) this.publish({ loading: false, error });
      throw error;
    }
  }

  private async pullChanges(): Promise<void> {
    if (this.destroyed) return;
    const changes = await this.interactService.getInlineCommentChanges({
      resourceId: this.resourceId,
      cursor: this.cursor,
    });
    if (this.destroyed) return;

    const staleThreadIds = new Set<string>();
    changes.items.forEach((change) => {
      this.markKnownRevision(change.threadId, change.revision);
      const cachedRevision = this.threadsById.get(change.threadId)?.revision ?? 0;
      if (cachedRevision < change.revision) staleThreadIds.add(change.threadId);
    });
    await Promise.all([...staleThreadIds].map((threadId) => this.recallThread(threadId)));
    this.cursor = changes.cursor;
  }

  private markKnownRevision(threadId: string, revision: number): void {
    const currentKnownRevision = this.knownRevisions.get(threadId) ?? 0;
    this.knownRevisions.set(threadId, Math.max(currentKnownRevision, revision));
  }

  private upsertThread(thread: InlineCommentThread, publish = true): void {
    const cachedThread = this.threadsById.get(thread.threadId);
    if (cachedThread && cachedThread.revision > thread.revision) return;
    this.threadsById.set(thread.threadId, thread);
    this.markKnownRevision(thread.threadId, thread.revision);
    if (publish) this.publish({ error: undefined });
  }

  private updateSnapshot(patch: Partial<InlineCommentSessionSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...patch };
    this.subscribers.forEach((listener) => listener());
  }

  private publish(patch: Partial<InlineCommentSessionSnapshot> = {}): void {
    this.updateSnapshot({
      threads: [...this.threadsById.values()].sort(compareThreads),
      ...patch,
    });
  }
}
