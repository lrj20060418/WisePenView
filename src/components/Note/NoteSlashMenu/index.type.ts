import type { NoteContentPlugin } from '../CustomBlockNote/content/types';
import type { CustomBlockNoteEditor } from '../CustomBlockNote/noteEditor';

export interface NoteSlashMenuProps {
  editor: CustomBlockNoteEditor;
  plugins: readonly NoteContentPlugin[];
}
