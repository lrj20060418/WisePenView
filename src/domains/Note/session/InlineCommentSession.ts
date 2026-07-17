import type {
  InlineComment,
  InlineCommentDraft,
  InlineCommentThread,
} from '../entity/inlineComment';
import type { INoteService } from '../service/index.type';

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
  private readonly noteService: INoteService;
  private readonly threadsById = new Map<string, InlineCommentThread>();
  private readonly knownRevisions = new Map<string, number>();
  private readonly subscribers = new Set<() => void>();
  private snapshot: InlineCommentSessionSnapshot = { threads: [], loading: false };
  private cursor?: string;
  private startPromise?: Promise<void>;
  private changesPromise?: Promise<void>;
  private pollTimer: number | null = null;
  private destroyed = false;

  constructor(resourceId: string, noteService: INoteService) {
    this.resourceId = resourceId;
    this.noteService = noteService;
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
    params: InlineCommentDraft & { content: string }
  ): Promise<InlineCommentThread> {
    const thread = await this.noteService.createInlineCommentThread({
      resourceId: this.resourceId,
      idempotencyKey: crypto.randomUUID(),
      anchor: params.anchor,
      quoteText: params.quoteText,
      content: params.content,
    });
    this.upsertThread(thread);
    return thread;
  }

  async addComment(threadId: string, content: string): Promise<InlineComment> {
    const comment = await this.noteService.addInlineComment({
      threadId,
      idempotencyKey: crypto.randomUUID(),
      content,
    });
    const cachedThread = this.threadsById.get(threadId);
    if (!cachedThread) {
      await this.recallThread(threadId);
      return comment;
    }

    const existingIndex = cachedThread.items.findIndex(
      (item) => item.commentId === comment.commentId
    );
    const items = [...cachedThread.items];
    if (existingIndex >= 0) items[existingIndex] = comment;
    else items.push(comment);
    this.upsertThread({
      ...cachedThread,
      items,
      revision: comment.revision,
      updatedAt: comment.createdAt,
    });
    return comment;
  }

  async recallThread(threadId: string): Promise<InlineCommentThread> {
    const thread = await this.noteService.getInlineCommentThread({ threadId });
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
    const comment = await this.noteService.getInlineComment({ threadId, commentId });
    const cachedThread = this.threadsById.get(threadId);
    if (cachedThread) {
      const items = cachedThread.items.some((item) => item.commentId === comment.commentId)
        ? cachedThread.items.map((item) => (item.commentId === comment.commentId ? comment : item))
        : [...cachedThread.items, comment];
      this.upsertThread({
        ...cachedThread,
        items,
        revision: Math.max(cachedThread.revision, comment.revision),
        updatedAt: Math.max(cachedThread.updatedAt, comment.createdAt),
      });
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
      const threadList = await this.noteService.listInlineCommentThreads({
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
    const changes = await this.noteService.getInlineCommentChanges({
      resourceId: this.resourceId,
      cursor: this.cursor,
    });
    if (this.destroyed) return;
    this.cursor = changes.cursor ?? this.cursor;

    const staleThreadIds = new Set<string>();
    changes.items.forEach((change) => {
      const currentKnownRevision = this.knownRevisions.get(change.threadId) ?? 0;
      this.knownRevisions.set(change.threadId, Math.max(currentKnownRevision, change.revision));
      const cachedRevision = this.threadsById.get(change.threadId)?.revision ?? 0;
      if (cachedRevision < change.revision) staleThreadIds.add(change.threadId);
    });
    await Promise.all([...staleThreadIds].map((threadId) => this.recallThread(threadId)));
  }

  private upsertThread(thread: InlineCommentThread, publish = true): void {
    const cachedThread = this.threadsById.get(thread.threadId);
    if (cachedThread && cachedThread.revision > thread.revision) return;
    this.threadsById.set(thread.threadId, thread);
    this.knownRevisions.set(
      thread.threadId,
      Math.max(this.knownRevisions.get(thread.threadId) ?? 0, thread.revision)
    );
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
