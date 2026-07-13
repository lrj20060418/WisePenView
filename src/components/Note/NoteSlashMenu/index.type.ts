import type { CustomBlockNoteEditor } from '../CustomBlockNote/blockNoteSchema';
import type { NoteContentPlugin } from '../CustomBlockNote/plugins/types';

export interface NoteSlashMenuProps {
  editor: CustomBlockNoteEditor;
  plugins: readonly NoteContentPlugin[];
}
