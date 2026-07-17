import { MessageSquare } from 'lucide-react';
import type { RefObject } from 'react';

import type { NoteInlineCommentAnchor } from '../../../content/types';
import { useNoteInlineCommentContext } from '../../../engines/inlineComment/integration/InlineCommentContext';
import { captureInlineMathAnchor } from './formulaInlineCommentAnchor';
import {
  formatFormulaInlineCommentReferenceText,
  type FormulaInlineCommentKind,
} from './formulaInlineCommentReference';
import {
  INLINE_MATH_INLINE_COMMENT_OWNER_ID,
  MATH_BLOCK_INLINE_COMMENT_OWNER_ID,
} from './inlineCommentAnchor';
import styles from './latexFormulaInlineCommentButton.module.less';

type LatexFormulaInlineCommentButtonProps = {
  expression: string;
  kind: FormulaInlineCommentKind;
  shellRef: RefObject<HTMLElement | null>;
  blockId?: string;
};

export function LatexFormulaInlineCommentButton({
  expression,
  kind,
  shellRef,
  blockId,
}: LatexFormulaInlineCommentButtonProps) {
  const inlineCommentContext = useNoteInlineCommentContext();

  if (!inlineCommentContext?.canInlineComment) {
    return null;
  }

  return (
    <button
      type="button"
      className={styles.formulaInlineCommentButton}
      title="添加批注"
      aria-label="添加批注"
      onMouseDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        const shellElement = shellRef.current;
        if (!shellElement) {
          return;
        }
        const anchor =
          kind === 'block' && blockId
            ? { kind: 'block' as const, blockId }
            : captureInlineMathAnchor(inlineCommentContext.editor, shellElement);
        const referenceText = formatFormulaInlineCommentReferenceText(expression, kind);
        if (!anchor || !referenceText) return;
        inlineCommentContext.startContentInlineComment({
          ownerId:
            kind === 'block'
              ? MATH_BLOCK_INLINE_COMMENT_OWNER_ID
              : INLINE_MATH_INLINE_COMMENT_OWNER_ID,
          anchor: anchor as unknown as NoteInlineCommentAnchor,
          referenceText,
        });
      }}
    >
      <MessageSquare size={14} />
    </button>
  );
}
