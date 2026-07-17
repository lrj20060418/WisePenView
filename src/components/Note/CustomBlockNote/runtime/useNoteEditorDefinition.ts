import { useImageService, useResourceService } from '@/domains';
import { assertImageProxyUploadLimit } from '@/domains/Image';
import { createClientError, FRONTEND_CLIENT_ERROR, parseErrorMessage } from '@/utils/error';
import { zh } from '@blocknote/core/locales';
import type { useCreateBlockNote } from '@blocknote/react';
import { toast } from '@heroui/react';
import { useLatest, useMemoizedFn, useUpdateEffect } from 'ahooks';
import { useMemo, useRef, useState } from 'react';

import { getAiContentStore } from '../engines/aiDiff/store';
import { useNoteYjsFragment } from '../engines/collaboration/useNoteYjsUndoStack';
import { createNoteReadOnlyFilterExtension } from '../engines/editor/readOnly';
import {
  buildInlineCommentExtension,
  getBlockNoteCommentUsersYMap,
  getBlockNoteThreadsYMap,
  isInlineCommentableSelection,
  resolveActiveInlineCommentUserProfile,
  resolveBlockNoteInlineCommentUsers,
  resolveNoteInlineCommentAvailability,
  useRemoteInlineCommentSync,
  type PendingInlineCommentReference,
  type PendingInlineCommentSelection,
} from '../engines/inlineComment';
import { syncInlineCommentUserProfileToYMap } from '../engines/inlineComment/threads/users';
import type { CustomBlockNoteProps } from '../index.type';
import {
  blockNoteSchema,
  collectNoteEditorExtensions,
  collectNoteEditorProps,
  notePluginRegistry,
  type CustomBlockNoteEditor,
} from '../noteEditorComposition';

type CreateBlockNoteOptions = NonNullable<Parameters<typeof useCreateBlockNote>[0]>;
type BlockNoteCollaborationConfig = NonNullable<CreateBlockNoteOptions['collaboration']>;

const NOTE_EDITOR_PROPS = collectNoteEditorProps(notePluginRegistry);

export function useNoteEditorDefinition({
  resourceId,
  collaboration: { doc, provider, user: collaborationUser },
  state: { readOnly, blockLocalDocWrites },
  inlineComment: {
    status: inlineCommentStatus,
    actor: inlineCommentActor,
    usersById: inlineCommentUsersById,
    documentRole: inlineCommentDocumentRole,
    visibilityPrivileged: isInlineCommentVisibilityPrivileged,
  },
}: CustomBlockNoteProps) {
  const {
    enabled: inlineCommentEnabled,
    uiEnabled: inlineCommentUiEnabled,
    hasWritePermission: hasInlineCommentWritePermission,
    canWrite: inlineCommentWritable,
  } = resolveNoteInlineCommentAvailability(inlineCommentStatus);
  const imageService = useImageService();
  const resourceService = useResourceService();
  const [pmWriteGuardReady, setPmWriteGuardReady] = useState(false);
  const shouldBlockLocalDocWrites = useMemoizedFn(() => blockLocalDocWrites && pmWriteGuardReady);
  const hasBlockLocalDocWritesProp = useMemoizedFn(() => blockLocalDocWrites);
  const editorRef = useRef<CustomBlockNoteEditor | null>(null);
  const setEditor = useMemoizedFn((editor: CustomBlockNoteEditor) => {
    editorRef.current = editor;
  });
  const pendingInlineCommentReferenceRef = useRef<PendingInlineCommentReference | null>(null);
  /** 与 reference 分离：创建 thread 时会清空 reference，但写入 mark 仍需保留选区。 */
  const pendingInlineCommentSelectionRef = useRef<PendingInlineCommentSelection | null>(null);
  const commitPendingInlineCommentReferenceForThreadRef = useRef<(threadId: string) => void>(
    () => undefined
  );
  const noteFragment = useNoteYjsFragment(doc);
  const aiContentStore = getAiContentStore(doc);
  const threadsYMap = getBlockNoteThreadsYMap(doc);
  const inlineCommentUsersYMap = getBlockNoteCommentUsersYMap(doc);
  const { activeInlineCommentUserId, activeInlineCommentUsername, activeInlineCommentAvatarUrl } =
    resolveActiveInlineCommentUserProfile(inlineCommentActor ?? null);
  const activeInlineCommentUserIdLatest = useLatest(activeInlineCommentUserId);
  const inlineCommentResolverContextLatest = useLatest({
    activeInlineCommentUserId,
    activeInlineCommentUsername,
    activeInlineCommentAvatarUrl,
    inlineCommentUsersById,
    inlineCommentUsersYMap,
  });

  useUpdateEffect(() => {
    if (inlineCommentEnabled) {
      syncInlineCommentUserProfileToYMap(inlineCommentUsersYMap, activeInlineCommentUserId, {
        username: activeInlineCommentUsername,
        avatarUrl: activeInlineCommentAvatarUrl,
      });
    }
  }, [
    activeInlineCommentAvatarUrl,
    activeInlineCommentUserId,
    activeInlineCommentUsername,
    inlineCommentUsersYMap,
    inlineCommentEnabled,
  ]);

  useRemoteInlineCommentSync({
    enabled: inlineCommentEnabled,
    resourceId,
    threadsYMap,
    listInlineComments: resourceService.listInlineComments,
  });

  const uploadFile = useMemoizedFn(async (file: File) => {
    if (readOnly) {
      const err = createClientError(FRONTEND_CLIENT_ERROR.NOTE_READ_ONLY_IMAGE_UPLOAD);
      toast.danger(parseErrorMessage(err));
      throw err;
    }
    if (!file.type.startsWith('image/')) {
      throw createClientError(FRONTEND_CLIENT_ERROR.IMAGE_ONLY);
    }
    try {
      assertImageProxyUploadLimit(file);
    } catch (error) {
      toast.danger(parseErrorMessage(error));
      throw error;
    }
    const { publicUrl } = await imageService.uploadImage({
      file,
      scene: 'PRIVATE_IMAGE_FOR_NOTE',
      bizTag: `notes/${resourceId}`,
    });
    return publicUrl;
  });

  const editorExtensions = useMemo(() => {
    const extensions = [
      ...collectNoteEditorExtensions(notePluginRegistry),
      createNoteReadOnlyFilterExtension(shouldBlockLocalDocWrites),
    ];
    if (inlineCommentEnabled) {
      extensions.push(
        // eslint-disable-next-line react-hooks/refs -- 扩展初始化早于 editor 创建，以下 ref 只在扩展运行期回调读取。
        buildInlineCommentExtension({
          registry: notePluginRegistry,
          resourceId,
          getActiveCommentUserId: () => activeInlineCommentUserIdLatest.current,
          hasWritePermission: hasInlineCommentWritePermission,
          isInlineCommentVisibilityPrivileged,
          inlineCommentDocumentRole,
          threadsYMap,
          doc,
          resolveUsers: (userIds) =>
            Promise.resolve(
              resolveBlockNoteInlineCommentUsers(
                userIds,
                inlineCommentResolverContextLatest.current
              )
            ),
          getEditor: () => editorRef.current,
          getPendingInlineCommentSelection: () => pendingInlineCommentSelectionRef.current,
          getPendingInlineCommentReferenceText: () =>
            pendingInlineCommentReferenceRef.current?.referenceText,
          clearPendingInlineCommentSelection: () => {
            pendingInlineCommentSelectionRef.current = null;
          },
          onThreadDocumentMarked: (threadId) => {
            commitPendingInlineCommentReferenceForThreadRef.current(threadId);
          },
          canAddThreadToDocument: (editor) =>
            isInlineCommentableSelection(editor, notePluginRegistry),
          inlineCommentDataSource: {
            listInlineComments: resourceService.listInlineComments,
            createInlineComment: resourceService.createInlineComment,
            addInlineCommentItem: resourceService.addInlineCommentItem,
            updateInlineCommentItem: resourceService.updateInlineCommentItem,
            setInlineCommentItemReaction: resourceService.setInlineCommentItemReaction,
            deleteInlineCommentItemReaction: resourceService.deleteInlineCommentItemReaction,
            deleteInlineCommentItem: resourceService.deleteInlineCommentItem,
            changeInlineCommentResolveStatus: resourceService.changeInlineCommentResolveStatus,
          },
        })
      );
    }
    return extensions;
  }, [
    inlineCommentDocumentRole,
    inlineCommentEnabled,
    hasInlineCommentWritePermission,
    isInlineCommentVisibilityPrivileged,
    resourceId,
    resourceService,
    threadsYMap,
    doc,
    shouldBlockLocalDocWrites,
    activeInlineCommentUserIdLatest,
    inlineCommentResolverContextLatest,
  ]);

  return {
    editorOptions: {
      schema: blockNoteSchema,
      dictionary: zh,
      trailingBlock: true,
      disableExtensions: ['history', 'yUndo'],
      uploadFile,
      extensions: editorExtensions,
      _tiptapOptions: {
        editorProps: NOTE_EDITOR_PROPS,
      },
      collaboration: {
        provider: provider as BlockNoteCollaborationConfig['provider'],
        fragment: noteFragment,
        user: collaborationUser,
      },
    } satisfies CreateBlockNoteOptions,
    noteFragment,
    aiContentStore,
    setEditor,
    hasBlockLocalDocWritesProp,
    setPmWriteGuardReady,
    inlineComment: {
      enabled: inlineCommentEnabled,
      uiEnabled: inlineCommentUiEnabled,
      writable: inlineCommentWritable,
      activeUserId: activeInlineCommentUserId,
      activeUsername: activeInlineCommentUsername,
      activeAvatarUrl: activeInlineCommentAvatarUrl,
      pendingReferenceRef: pendingInlineCommentReferenceRef,
      pendingSelectionRef: pendingInlineCommentSelectionRef,
      commitPendingReferenceForThreadRef: commitPendingInlineCommentReferenceForThreadRef,
    },
  };
}

export type NoteEditorDefinition = ReturnType<typeof useNoteEditorDefinition>;
