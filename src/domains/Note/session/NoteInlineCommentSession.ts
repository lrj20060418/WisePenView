import type { IInlineCommentService } from '@/domains/InlineComment';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';

import type {
  NoteInlineComment,
  NoteInlineCommentDraft,
  NoteInlineCommentThread,
} from '../entity/inlineComment';
import { NoteInlineCommentServicesMap } from '../mapper/NoteInlineCommentServices.map';

export interface NoteInlineCommentSessionSnapshot {
  threads: readonly NoteInlineCommentThread[];
  loading: boolean;
  error?: unknown;
}

interface NoteInlineCommentSessionOptions {
  resourceId: string;
  inlineCommentService: IInlineCommentService;
}

function compareThreads(a: NoteInlineCommentThread, b: NoteInlineCommentThread): number {
  return b.updatedAt - a.updatedAt || b.createdAt - a.createdAt;
}

export class NoteInlineCommentSession {
  readonly resourceId: string;
  private readonly inlineCommentService: IInlineCommentService;
  private readonly threadsById = new Map<string, NoteInlineCommentThread>();
  private readonly addedItemIdsByRequestKey = new Map<string, string>();
  private readonly subscribers = new Set<() => void>();
  private snapshot: NoteInlineCommentSessionSnapshot = { threads: [], loading: false };
  private refreshPromise?: Promise<void>;
  private hasLoaded = false;
  private destroyed = false;

  constructor(options: NoteInlineCommentSessionOptions) {
    this.resourceId = options.resourceId;
    this.inlineCommentService = options.inlineCommentService;
  }

  getSnapshot = (): NoteInlineCommentSessionSnapshot => this.snapshot;

  subscribe = (listener: () => void): (() => void) => {
    this.subscribers.add(listener);
    return () => this.subscribers.delete(listener);
  };

  destroy(): void {
    this.destroyed = true;
    this.subscribers.clear();
  }

  async createThread(
    params: NoteInlineCommentDraft & { content: string; idempotencyKey: string }
  ): Promise<NoteInlineCommentThread> {
    await this.refresh();
    const existingThread = this.findThreadByRequestKey(params.idempotencyKey);
    if (existingThread) return existingThread;

    const threadId = await this.inlineCommentService.createInlineComment(
      NoteInlineCommentServicesMap.mapCreateRequest({
        resourceId: this.resourceId,
        requestKey: params.idempotencyKey,
        draft: params,
        content: params.content,
      })
    );
    return this.reloadCreatedThread(threadId);
  }

  async addComment(
    threadId: string,
    content: string,
    idempotencyKey: string
  ): Promise<NoteInlineComment> {
    const existingItemId = this.addedItemIdsByRequestKey.get(idempotencyKey);
    if (existingItemId) {
      await this.refresh();
      const existingItem = this.findItem(threadId, existingItemId);
      if (existingItem) return existingItem;
    }

    const itemId = await this.inlineCommentService.addInlineCommentItem(
      NoteInlineCommentServicesMap.mapAddItemRequest({
        resourceId: this.resourceId,
        threadId,
        content,
      })
    );
    this.addedItemIdsByRequestKey.set(idempotencyKey, itemId);
    return this.reloadCreatedItem(threadId, itemId);
  }

  refresh(): Promise<void> {
    if (this.destroyed) return Promise.resolve();
    if (this.refreshPromise) return this.refreshPromise;
    if (!this.hasLoaded) this.updateSnapshot({ loading: true, error: undefined });
    this.refreshPromise = this.loadThreads()
      .then(() => {
        if (this.destroyed) return;
        this.hasLoaded = true;
        this.publish({ loading: false, error: undefined });
      })
      .catch((error: unknown) => {
        if (!this.destroyed) this.updateSnapshot({ loading: false, error });
        throw error;
      })
      .finally(() => {
        this.refreshPromise = undefined;
      });
    return this.refreshPromise;
  }

  private async loadThreads(): Promise<void> {
    if (this.destroyed) return;
    const threads = NoteInlineCommentServicesMap.mapThreads(
      await this.inlineCommentService.listInlineComments({
        resourceId: this.resourceId,
      })
    );
    if (this.destroyed) return;
    this.threadsById.clear();
    threads.forEach((thread) => this.threadsById.set(thread.threadId, thread));
  }

  private async reloadCreatedThread(threadId: string): Promise<NoteInlineCommentThread> {
    await this.refresh();
    let thread = this.threadsById.get(threadId);
    if (!thread) {
      await this.refresh();
      thread = this.threadsById.get(threadId);
    }
    if (!thread) {
      throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
        reason: `新建批注 ${threadId} 未出现在资源批注列表中`,
      });
    }
    return thread;
  }

  private async reloadCreatedItem(threadId: string, itemId: string): Promise<NoteInlineComment> {
    await this.refresh();
    let item = this.findItem(threadId, itemId);
    if (!item) {
      await this.refresh();
      item = this.findItem(threadId, itemId);
    }
    if (!item) {
      throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
        reason: `新建批注消息 ${itemId} 未出现在资源批注列表中`,
      });
    }
    return item;
  }

  private findThreadByRequestKey(requestKey: string): NoteInlineCommentThread | undefined {
    return [...this.threadsById.values()].find((thread) => thread.externalAnchorId === requestKey);
  }

  private findItem(threadId: string, itemId: string): NoteInlineComment | undefined {
    return this.threadsById.get(threadId)?.items.find((comment) => comment.commentId === itemId);
  }

  private updateSnapshot(patch: Partial<NoteInlineCommentSessionSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...patch };
    this.subscribers.forEach((listener) => listener());
  }

  private publish(patch: Partial<NoteInlineCommentSessionSnapshot> = {}): void {
    this.updateSnapshot({
      threads: [...this.threadsById.values()].sort(compareThreads),
      ...patch,
    });
  }
}
