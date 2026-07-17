import { BlockNoteView } from '@blocknote/mantine';

import { AiDiffBulkActions } from '../engines/aiDiff/BulkActions';
import { NoteEditorReadOnlyProvider } from '../engines/editor/readOnly';
import { NoteInlineCommentProvider, NoteInlineCommentUi } from '../engines/inlineComment';
import type { CustomBlockNoteProps } from '../index.type';
import { notePluginRegistry, type CustomBlockNoteEditor } from '../noteEditorComposition';
import styles from '../style.module.less';
import type { NoteEditorRuntimeCoordinator } from '../useNoteEditorRuntimeCoordinator';
import NoteSideMenu from './sideMenu';
import NoteSlashMenu from './slashMenu';
import NoteTableHandles from './tableHandles';
import NoteToolbar from './toolbar';

export function NoteEditorSurface({
  editor,
  runtimeCoordinator,
  props,
}: {
  editor: CustomBlockNoteEditor;
  runtimeCoordinator: NoteEditorRuntimeCoordinator;
  props: CustomBlockNoteProps;
}) {
  const {
    collaboration: { doc },
    state: { readOnly },
    portalContainers: {
      inlineCommentSidebar: inlineCommentSidebarPortalContainer,
      aiBulkActions: aiBulkActionsPortalContainer,
    },
  } = props;

  return (
    <div
      className={styles.editorShell}
      onKeyDownCapture={runtimeCoordinator.collaboration.onKeyDownCapture}
    >
      <AiDiffBulkActions
        doc={doc}
        editor={editor}
        registry={notePluginRegistry}
        undoManager={runtimeCoordinator.collaboration.undoManager}
        visible={runtimeCoordinator.aiDiff.showBulkActions}
        portalContainer={aiBulkActionsPortalContainer}
      />
      <NoteEditorReadOnlyProvider value={readOnly}>
        <NoteInlineCommentProvider {...runtimeCoordinator.inlineComment.contextValue}>
          <BlockNoteView
            className="bodyBlockNoteView"
            editor={editor}
            theme="light"
            formattingToolbar={false}
            slashMenu={false}
            sideMenu={false}
            tableHandles={false}
            comments={false}
            editable={!readOnly}
            onSelectionChange={runtimeCoordinator.document.handleSelectionChange}
          >
            <NoteToolbar
              onAskAi={runtimeCoordinator.document.handleAskAi}
              showAddInlineComment={runtimeCoordinator.inlineComment.writable}
              onRememberPendingInlineCommentReference={
                runtimeCoordinator.inlineComment.rememberPendingReference
              }
            />
            <NoteSlashMenu editor={editor} plugins={notePluginRegistry.contentPlugins} />
            <NoteSideMenu plugins={notePluginRegistry.contentPlugins} />
            <NoteTableHandles />
            {runtimeCoordinator.inlineComment.uiEnabled ? (
              <NoteInlineCommentUi
                editor={editor}
                doc={doc}
                registry={notePluginRegistry}
                inlineCommentWritable={runtimeCoordinator.inlineComment.writable}
                inlineCommentSidebarPortalContainer={inlineCommentSidebarPortalContainer}
                {...runtimeCoordinator.inlineComment.ui}
              />
            ) : null}
          </BlockNoteView>
        </NoteInlineCommentProvider>
      </NoteEditorReadOnlyProvider>
    </div>
  );
}
