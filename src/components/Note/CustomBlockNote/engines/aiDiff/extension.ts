import { createExtension, nodeToBlock } from '@blocknote/core';
import type { Node as PMNode } from '@tiptap/pm/model';
import type { EditorState } from '@tiptap/pm/state';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

import { AI_DIFF_DISPLAY_MODE, type AiDiffDisplayMode } from '@/domains/Note';
import { noteConfig } from '../../noteConfig';
import { listRichTextChangeTargets } from '../../plugins/DefaultContentPlugin/aiDiff';
import type {
  NoteAiDiffAction,
  NoteAiDiffActionTarget,
  NoteAiDiffComparisonContext,
  NoteEditorExtension,
  NotePluginRegistry,
} from '../../registry/types';
import { resolveNoteAiDiffBlock } from './contentState';
import styles from './style.module.less';

export interface NoteAiDiffActionRequest {
  blockId: string;
  action: NoteAiDiffAction;
  target?: NoteAiDiffActionTarget;
}

interface AiDiffExtensionMeta {
  displayMode?: AiDiffDisplayMode;
  aiContentByBlockId?: ReadonlyMap<string, unknown>;
  actionsEnabled?: boolean;
  onAction?: (request: NoteAiDiffActionRequest) => void;
  onSelectChange?: (changeKey: string) => void;
  /** 传入显式值（含 null）以更新选中改动；省略则保持 */
  selectedChangeKey?: string | null;
  /**
   * 接受/拒绝后按「列表位置」恢复选中（hunk 下标会重排，不能只记旧 key）
   * 传入显式值（含 null）以更新；省略则保持
   */
  pendingSelectIndex?: number | null;
}

interface AiDiffExtensionState {
  displayMode: AiDiffDisplayMode;
  aiContentByBlockId: ReadonlyMap<string, unknown>;
  actionsEnabled: boolean;
  onAction?: (request: NoteAiDiffActionRequest) => void;
  onSelectChange?: (changeKey: string) => void;
  selectedChangeKey: string | null;
  /** 文档顺序的可导航改动 key，供键盘上下切换 */
  changeKeysOrdered: readonly string[];
  /** 待按位置恢复的选中下标；装饰重建后消费 */
  pendingSelectIndex: number | null;
  decorations: DecorationSet;
}

type AiDiffChangeUnit = {
  key: string;
  blockId: string;
  target?: NoteAiDiffActionTarget;
};

const aiDiffExtensionPluginKey = new PluginKey<AiDiffExtensionState>('noteAiDiffExtension');

function encodeChangeKey(blockId: string, target?: NoteAiDiffActionTarget): string {
  if (!target) return blockId;
  if (target.kind === 'content-hunk') return `${blockId}::content-hunk`;
  return `${blockId}::inline-hunk::${target.index}`;
}

function decodeChangeKey(changeKey: string): {
  blockId: string;
  target?: NoteAiDiffActionTarget;
} {
  const [blockId = '', kind, indexRaw] = changeKey.split('::');
  if (kind === 'content-hunk') return { blockId, target: { kind: 'content-hunk' } };
  if (kind === 'inline-hunk') {
    const index = Number(indexRaw);
    if (Number.isFinite(index)) return { blockId, target: { kind: 'inline-hunk', index } };
  }
  return { blockId };
}

function selectAiDiffChange(view: EditorView, changeKey: string | null): void {
  const previous = aiDiffExtensionPluginKey.getState(view.state);
  if (!previous || previous.selectedChangeKey === changeKey) return;
  view.dispatch(
    view.state.tr
      .setMeta(aiDiffExtensionPluginKey, { selectedChangeKey: changeKey })
      .setMeta('addToHistory', false)
  );
}

function scrollAiDiffChangeIntoView(changeKey: string): void {
  const byKey = document.querySelector<HTMLElement>(
    `[data-ai-diff-change-key="${CSS.escape(changeKey)}"]`
  );
  if (byKey) {
    byKey.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    return;
  }
  const blockId = changeKey.split('::')[0] ?? changeKey;
  const review = document.querySelector<HTMLElement>(
    `[data-ai-diff-review="${CSS.escape(blockId)}"]`
  );
  review?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

export function goToAiDiffChange(view: EditorView, changeKey: string): void {
  selectAiDiffChange(view, changeKey);
  view.focus();
  window.requestAnimationFrame(() => scrollAiDiffChangeIntoView(changeKey));
}

/** 方向键切换相邻改动；到边界时吞掉按键避免光标乱跑 */
function navigateAiDiffByArrow(view: EditorView, direction: 'up' | 'down'): boolean {
  const state = aiDiffExtensionPluginKey.getState(view.state);
  if (
    !state?.actionsEnabled ||
    state.displayMode !== AI_DIFF_DISPLAY_MODE.COMPARE ||
    state.changeKeysOrdered.length === 0
  ) {
    return false;
  }

  const keys = state.changeKeysOrdered;
  const currentIndex = state.selectedChangeKey ? keys.indexOf(state.selectedChangeKey) : -1;

  let nextKey: string | null = null;
  if (currentIndex < 0) {
    nextKey = direction === 'down' ? keys[0]! : keys[keys.length - 1]!;
  } else if (direction === 'up' && currentIndex > 0) {
    nextKey = keys[currentIndex - 1]!;
  } else if (direction === 'down' && currentIndex < keys.length - 1) {
    nextKey = keys[currentIndex + 1]!;
  }

  if (!nextKey) return true;
  goToAiDiffChange(view, nextKey);
  return true;
}

/** 对当前选中改动执行接受/拒绝，并跳到下一项（无下一项则上一项） */
function applySelectedAiDiffAction(view: EditorView, action: NoteAiDiffAction): boolean {
  const state = aiDiffExtensionPluginKey.getState(view.state);
  if (
    !state?.actionsEnabled ||
    !state.onAction ||
    !state.selectedChangeKey ||
    state.displayMode !== AI_DIFF_DISPLAY_MODE.COMPARE
  ) {
    return false;
  }

  const selectedKey = state.selectedChangeKey;
  const index = state.changeKeysOrdered.indexOf(selectedKey);
  // 当前项移除后：下一项落在同一 index；若已是最后一项则退到上一项
  const pendingSelectIndex =
    index < 0
      ? null
      : index < state.changeKeysOrdered.length - 1
        ? index
        : index > 0
          ? index - 1
          : null;

  const { blockId, target } = decodeChangeKey(selectedKey);
  state.onAction({ blockId, action, target });
  view.dispatch(
    view.state.tr
      .setMeta(aiDiffExtensionPluginKey, {
        selectedChangeKey: null,
        pendingSelectIndex,
      })
      .setMeta('addToHistory', false)
  );
  view.focus();
  return true;
}

function buildShortcutKbd(label: string): HTMLElement {
  const kbd = document.createElement('kbd');
  kbd.className = styles.shortcutKbd;
  kbd.textContent = label;
  return kbd;
}

/** 工具条挂在 review 内，左缘对齐灰块（bn-block）右缘，垂直对齐锚点 */
function pinToolbarToRowRight(toolbar: HTMLElement, host: HTMLElement, anchor: HTMLElement): void {
  host.appendChild(toolbar);
  const sync = () => {
    const hostRect = host.getBoundingClientRect();
    const gray = anchor.closest('.bn-block') as HTMLElement | null;
    const edgeRect = (gray ?? host).getBoundingClientRect();
    const anchorRect = anchor.getBoundingClientRect();
    toolbar.style.top = `${anchorRect.top - hostRect.top + anchorRect.height / 2}px`;
    // 灰块右侧 = 工具条左侧
    toolbar.style.left = `${edgeRect.right - hostRect.left}px`;
    toolbar.style.right = 'auto';
  };
  sync();
  window.requestAnimationFrame(sync);
}

function buildLucideIcon(kind: 'check' | 'x', className: string): SVGSVGElement {
  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  icon.setAttribute('viewBox', '0 0 24 24');
  icon.setAttribute('aria-hidden', 'true');
  icon.classList.add(className);
  const paths = kind === 'check' ? ['M20 6 9 17l-5-5'] : ['M18 6 6 18', 'm6 6 12 12'];
  paths.forEach((d) => {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', 'currentColor');
    path.setAttribute('stroke-width', '2.25');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    path.setAttribute('d', d);
    icon.appendChild(path);
  });
  return icon;
}

function buildActionButton(
  icon: 'check' | 'x',
  className: string,
  request: NoteAiDiffActionRequest,
  onAction: (request: NoteAiDiffActionRequest) => void,
  accessibleLabel: string,
  shortcutLabel: string,
  titleShortcutLabel = shortcutLabel
): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  const labeled = `${accessibleLabel}（${titleShortcutLabel}）`;
  button.title = labeled;
  button.setAttribute('aria-label', labeled);
  button.appendChild(buildLucideIcon(icon, styles.actionIcon));
  button.appendChild(buildShortcutKbd(shortcutLabel));
  button.addEventListener('mousedown', (event) => {
    event.preventDefault();
    event.stopPropagation();
  });
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    onAction(request);
  });
  return button;
}

function buildChromeButton(
  label: string,
  className: string,
  accessibleLabel: string,
  onClick: (() => void) | null,
  disabled = false
): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.textContent = label;
  button.title = accessibleLabel;
  button.setAttribute('aria-label', accessibleLabel);
  button.disabled = disabled;
  button.addEventListener('mousedown', (event) => {
    event.preventDefault();
    event.stopPropagation();
  });
  if (onClick) {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      onClick();
    });
  }
  return button;
}

function buildNavChevronButton(
  direction: 'up' | 'down',
  accessibleLabel: string,
  onClick: (() => void) | null,
  disabled = false
): HTMLButtonElement {
  const button = buildChromeButton('', styles.navButton, accessibleLabel, onClick, disabled);
  button.replaceChildren();
  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  icon.setAttribute('viewBox', '0 0 24 24');
  icon.setAttribute('aria-hidden', 'true');
  icon.classList.add(styles.navIcon);
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-width', '2.25');
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('stroke-linejoin', 'round');
  path.setAttribute('d', direction === 'up' ? 'M6 15l6-6 6 6' : 'M6 9l6 6 6-6');
  icon.appendChild(path);
  button.appendChild(icon);
  return button;
}

function buildSegmentToolbar(params: {
  changeKey: string;
  blockId: string;
  target?: NoteAiDiffActionTarget;
  reviewIndex: number;
  reviewTotal: number;
  prevKey: string | null;
  nextKey: string | null;
  onAction: (request: NoteAiDiffActionRequest) => void;
  onSelectChange?: (changeKey: string) => void;
}): HTMLElement {
  const {
    changeKey,
    blockId,
    target,
    reviewIndex,
    reviewTotal,
    prevKey,
    nextKey,
    onAction,
    onSelectChange,
  } = params;
  const actions = document.createElement('div');
  actions.className = styles.blockActions;
  actions.dataset.aiDiffChangeKey = changeKey;

  const navigator = document.createElement('div');
  navigator.className = styles.segmentNavigator;
  navigator.dataset.aiDiffNav = 'true';
  navigator.appendChild(
    buildNavChevronButton(
      'up',
      '上一个修改',
      prevKey ? () => onSelectChange?.(prevKey) : null,
      !prevKey
    )
  );
  const counter = document.createElement('span');
  counter.className = styles.navCounter;
  counter.textContent = `${reviewIndex} of ${reviewTotal}`;
  navigator.appendChild(counter);
  navigator.appendChild(
    buildNavChevronButton(
      'down',
      '下一个修改',
      nextKey ? () => onSelectChange?.(nextKey) : null,
      !nextKey
    )
  );
  actions.appendChild(navigator);

  const decision = document.createElement('div');
  decision.className = styles.segmentDecision;
  decision.appendChild(
    buildActionButton(
      'x',
      `${styles.blockAction} ${styles.blockDiscard}`,
      { blockId, action: 'discard', target },
      onAction,
      '拒绝此修改',
      'Esc',
      'Esc / Backspace'
    )
  );
  decision.appendChild(
    buildActionButton(
      'check',
      `${styles.blockAction} ${styles.blockAccept}`,
      { blockId, action: 'accept', target },
      onAction,
      '接受此修改',
      'Enter'
    )
  );
  actions.appendChild(decision);
  return actions;
}

function createReviewWidget(params: {
  blockId: string;
  contentType: string;
  changeKind: 'create' | 'update' | 'delete';
  current: Record<string, unknown>;
  aiBlock: Record<string, unknown>;
  aiContentEmpty: boolean;
  displayMode: AiDiffDisplayMode;
  actionsEnabled: boolean;
  blockSelected: boolean;
  showBlockToolbar: boolean;
  blockUnit?: AiDiffChangeUnit;
  reviewIndex: number;
  reviewTotal: number;
  prevKey: string | null;
  nextKey: string | null;
  selectedChangeKey: string | null;
  changeUnitsForBlock: AiDiffChangeUnit[];
  unitNav: ReadonlyMap<
    string,
    { index: number; total: number; prevKey: string | null; nextKey: string | null }
  >;
  onAction?: (request: NoteAiDiffActionRequest) => void;
  onSelectChange?: (changeKey: string) => void;
  renderAiContent: (aiBlock: Record<string, unknown>) => HTMLElement;
  renderComparison?: (
    current: Record<string, unknown>,
    aiBlock: Record<string, unknown>,
    context?: NoteAiDiffComparisonContext
  ) => HTMLElement;
}): HTMLElement {
  const {
    blockId,
    contentType,
    changeKind,
    current,
    aiBlock,
    aiContentEmpty,
    displayMode,
    actionsEnabled,
    blockSelected,
    showBlockToolbar,
    blockUnit,
    reviewIndex,
    reviewTotal,
    prevKey,
    nextKey,
    selectedChangeKey,
    changeUnitsForBlock,
    unitNav,
    onAction,
    onSelectChange,
    renderAiContent,
    renderComparison,
  } = params;
  const root = document.createElement('div');
  root.className = blockSelected ? `${styles.review} ${styles.reviewSelected}` : styles.review;
  root.contentEditable = 'false';
  root.dataset.aiDiffReview = blockId;
  root.dataset.aiDiffContentType = contentType;
  root.dataset.aiDiffChangeKind = changeKind;
  root.dataset.aiDiffDisplayMode = displayMode;
  if (blockUnit) root.dataset.aiDiffChangeKey = blockUnit.key;
  if (blockSelected) root.dataset.aiDiffSelected = 'true';
  const customComparison = Boolean(
    displayMode === AI_DIFF_DISPLAY_MODE.COMPARE && renderComparison
  );
  const useHunkUnits = changeUnitsForBlock.some((unit) => Boolean(unit.target));

  if (!useHunkUnits) {
    root.addEventListener(
      'mousedown',
      (event) => {
        const target = event.target as HTMLElement | null;
        if (target?.closest('button')) return;
        if (blockUnit) onSelectChange?.(blockUnit.key);
      },
      true
    );
  }

  if (!aiContentEmpty) {
    const aiContentRoot = document.createElement('div');
    aiContentRoot.className = customComparison
      ? styles.comparison
      : displayMode === AI_DIFF_DISPLAY_MODE.COMPARE
        ? styles.aiContent
        : styles.aiContentPlain;
    aiContentRoot.dataset.aiDiffText = 'true';

    const comparisonContext: NoteAiDiffComparisonContext | undefined =
      customComparison && actionsEnabled && onAction && useHunkUnits
        ? {
            decorateHunk: (element, target) => {
              const unit = changeUnitsForBlock.find(
                (item) =>
                  item.target?.kind === target.kind &&
                  (target.kind === 'content-hunk' ||
                    (item.target.kind === 'inline-hunk' &&
                      target.kind === 'inline-hunk' &&
                      item.target.index === target.index))
              );
              if (!unit) return;
              const nav = unitNav.get(unit.key);
              const selected = selectedChangeKey === unit.key;
              element.dataset.aiDiffChangeKey = unit.key;
              element.classList.add(styles.inlineHunkSelectable);
              if (selected) {
                element.dataset.aiDiffSelected = 'true';
                element.classList.add(styles.inlineHunkSelected);
              }
              element.addEventListener('mousedown', (event) => {
                event.stopPropagation();
                const eventTarget = event.target as HTMLElement | null;
                if (eventTarget?.closest('button')) return;
                onSelectChange?.(unit.key);
              });
              if (selected && nav) {
                pinToolbarToRowRight(
                  buildSegmentToolbar({
                    changeKey: unit.key,
                    blockId,
                    target: unit.target,
                    reviewIndex: nav.index,
                    reviewTotal: nav.total,
                    prevKey: nav.prevKey,
                    nextKey: nav.nextKey,
                    onAction,
                    onSelectChange,
                  }),
                  root,
                  element
                );
              }
            },
          }
        : undefined;

    aiContentRoot.appendChild(
      customComparison && renderComparison
        ? renderComparison(current, aiBlock, comparisonContext)
        : renderAiContent(aiBlock)
    );
    root.appendChild(aiContentRoot);
  }

  if (showBlockToolbar && !useHunkUnits && actionsEnabled && onAction && blockUnit) {
    root.appendChild(
      buildSegmentToolbar({
        changeKey: blockUnit.key,
        blockId,
        target: blockUnit.target,
        reviewIndex,
        reviewTotal,
        prevKey,
        nextKey,
        onAction,
        onSelectChange,
      })
    );
  }
  return root;
}

function buildDecorations(params: {
  doc: PMNode;
  editorSchema: {
    blockSchema: unknown;
    inlineContentSchema: unknown;
    styleSchema: unknown;
  };
  proseMirrorSchema: unknown;
  registry: NotePluginRegistry;
  runtime: Omit<AiDiffExtensionState, 'decorations' | 'changeKeysOrdered' | 'pendingSelectIndex'>;
}): {
  decorations: DecorationSet;
  changeKeysOrdered: readonly string[];
} {
  const { doc, editorSchema, proseMirrorSchema, registry, runtime } = params;
  const decorations: Decoration[] = [];

  type PendingReview = {
    blockId: string;
    block: Record<string, unknown> & { type: string };
    projection: NonNullable<ReturnType<typeof resolveNoteAiDiffBlock>>;
    contentFrom: number;
    contentTo: number;
    nodePos: number;
    nodeSize: number;
  };

  const pendingReviews: PendingReview[] = [];

  doc.descendants((node, pos) => {
    if (node.type.name !== 'blockContainer') return true;
    const blockId = typeof node.attrs.id === 'string' ? node.attrs.id : '';
    if (!runtime.aiContentByBlockId.has(blockId)) return true;
    const aiContent = runtime.aiContentByBlockId.get(blockId);

    let block: Record<string, unknown> & { type: string };
    try {
      block = nodeToBlock(
        node,
        proseMirrorSchema as never,
        editorSchema.blockSchema as never,
        editorSchema.inlineContentSchema as never,
        editorSchema.styleSchema as never
      ) as unknown as Record<string, unknown> & { type: string };
    } catch {
      return true;
    }

    const aiDiff = registry.blockPlugins.get(block.type)?.aiDiff;
    const projection = aiDiff ? resolveNoteAiDiffBlock(block, aiContent, aiDiff, registry) : null;
    if (!aiDiff || !projection) return true;

    let contentFrom = pos;
    let contentTo = pos + node.nodeSize;
    node.forEach((child, offset) => {
      if (child.type.spec.group !== 'blockContent') return;
      contentFrom = pos + 1 + offset;
      contentTo = contentFrom + child.nodeSize;
    });

    const hideWholeBlock =
      (runtime.displayMode === AI_DIFF_DISPLAY_MODE.OLD_ONLY && projection.currentEmpty) ||
      (runtime.displayMode === AI_DIFF_DISPLAY_MODE.NEW_ONLY && projection.aiContentEmpty);
    if (hideWholeBlock) {
      decorations.push(
        Decoration.node(pos, pos + node.nodeSize, {
          class: styles.hidden,
          'data-ai-diff-current-hidden': 'true',
        })
      );
      return false;
    }

    const hasCustomComparison = Boolean(
      runtime.displayMode === AI_DIFF_DISPLAY_MODE.COMPARE &&
      !projection.currentEmpty &&
      !projection.aiContentEmpty &&
      aiDiff.comparison
    );
    const hideCurrent =
      projection.currentEmpty ||
      runtime.displayMode === AI_DIFF_DISPLAY_MODE.NEW_ONLY ||
      hasCustomComparison;
    if (hideCurrent) {
      decorations.push(
        Decoration.node(contentFrom, contentTo, {
          class: styles.hidden,
          'data-ai-diff-current-hidden': 'true',
        })
      );
    } else if (runtime.displayMode === AI_DIFF_DISPLAY_MODE.COMPARE) {
      const selected = runtime.selectedChangeKey?.startsWith(`${blockId}`)
        ? runtime.selectedChangeKey === blockId ||
          runtime.selectedChangeKey.startsWith(`${blockId}::`)
        : false;
      decorations.push(
        Decoration.node(contentFrom, contentTo, {
          class: selected ? `${styles.current} ${styles.currentSelected}` : styles.current,
          'data-ai-diff-current': 'true',
          'data-ai-diff-block-id': blockId,
          ...(selected ? { 'data-ai-diff-selected': 'true' } : {}),
          contenteditable: 'false',
        })
      );
    }

    const shouldRenderWidget =
      runtime.displayMode !== AI_DIFF_DISPLAY_MODE.OLD_ONLY &&
      (!projection.aiContentEmpty || runtime.displayMode === AI_DIFF_DISPLAY_MODE.COMPARE);
    if (shouldRenderWidget) {
      pendingReviews.push({
        blockId,
        block,
        projection,
        contentFrom,
        contentTo,
        nodePos: pos,
        nodeSize: node.nodeSize,
      });
    }
    return true;
  });

  const actionableReviews =
    runtime.displayMode === AI_DIFF_DISPLAY_MODE.COMPARE && runtime.actionsEnabled
      ? pendingReviews
      : [];

  const changeUnits: AiDiffChangeUnit[] = [];
  for (const item of actionableReviews) {
    const aiDiff = registry.blockPlugins.get(item.block.type)?.aiDiff;
    if (!aiDiff) continue;
    const hasBothSides = !item.projection.currentEmpty && !item.projection.aiContentEmpty;
    const canGranular = Boolean(hasBothSides && aiDiff.comparison && aiDiff.applyGranular);
    if (canGranular) {
      const targets = listRichTextChangeTargets(
        item.projection.current,
        item.projection.aiBlock,
        noteConfig.aiDiff.richText
      );
      if (targets.length > 0) {
        for (const target of targets) {
          changeUnits.push({
            key: encodeChangeKey(item.blockId, target),
            blockId: item.blockId,
            target,
          });
        }
        continue;
      }
    }
    changeUnits.push({ key: item.blockId, blockId: item.blockId });
  }

  const unitNav = new Map<
    string,
    { index: number; total: number; prevKey: string | null; nextKey: string | null }
  >();
  const changeTotal = changeUnits.length;
  changeUnits.forEach((unit, index) => {
    unitNav.set(unit.key, {
      index: index + 1,
      total: changeTotal,
      prevKey: index > 0 ? changeUnits[index - 1]!.key : null,
      nextKey: index < changeTotal - 1 ? changeUnits[index + 1]!.key : null,
    });
  });

  pendingReviews.forEach((item) => {
    const aiDiff = registry.blockPlugins.get(item.block.type)?.aiDiff;
    if (!aiDiff) return;
    const hasBothSides = !item.projection.currentEmpty && !item.projection.aiContentEmpty;
    const hasCustomComparison = Boolean(
      runtime.displayMode === AI_DIFF_DISPLAY_MODE.COMPARE && hasBothSides && aiDiff.comparison
    );
    const changeUnitsForBlock = changeUnits.filter((unit) => unit.blockId === item.blockId);
    const blockUnit =
      changeUnitsForBlock.length === 1 && !changeUnitsForBlock[0]!.target
        ? changeUnitsForBlock[0]
        : changeUnitsForBlock.length === 0
          ? { key: item.blockId, blockId: item.blockId }
          : undefined;
    const primaryUnit = blockUnit ?? changeUnitsForBlock[0];
    const nav = primaryUnit ? unitNav.get(primaryUnit.key) : undefined;
    const showBlockToolbar = Boolean(
      blockUnit &&
      runtime.actionsEnabled &&
      actionableReviews.some((r) => r.blockId === item.blockId)
    );

    decorations.push(
      Decoration.widget(
        item.contentTo,
        () =>
          createReviewWidget({
            blockId: item.blockId,
            contentType: item.block.type,
            changeKind: item.projection.changeKind,
            current: item.projection.current,
            aiBlock: item.projection.aiBlock,
            aiContentEmpty: item.projection.aiContentEmpty,
            displayMode: runtime.displayMode,
            actionsEnabled: runtime.actionsEnabled,
            blockSelected: Boolean(
              blockUnit
                ? runtime.selectedChangeKey === blockUnit.key
                : changeUnitsForBlock.some((unit) => unit.key === runtime.selectedChangeKey)
            ),
            showBlockToolbar,
            blockUnit,
            reviewIndex: nav?.index ?? 0,
            reviewTotal: nav?.total ?? changeTotal,
            prevKey: nav?.prevKey ?? null,
            nextKey: nav?.nextKey ?? null,
            selectedChangeKey: runtime.selectedChangeKey,
            changeUnitsForBlock,
            unitNav,
            onAction: runtime.onAction,
            onSelectChange: runtime.onSelectChange,
            renderAiContent: (aiBlock) => aiDiff.renderAiContent(aiBlock, registry),
            renderComparison:
              hasCustomComparison && aiDiff.comparison
                ? (current, aiBlock, context) =>
                    aiDiff.comparison!.render(current, aiBlock, registry, context)
                : undefined,
          }),
        { side: 1, stopEvent: () => true }
      )
    );
  });

  return {
    decorations: DecorationSet.create(doc, decorations),
    changeKeysOrdered: changeUnits.map((unit) => unit.key),
  };
}

function createAiDiffExtension(registry: NotePluginRegistry) {
  return createExtension(({ editor }) => ({
    key: 'noteAiDiffExtension',
    prosemirrorPlugins: [
      new Plugin<AiDiffExtensionState>({
        key: aiDiffExtensionPluginKey,
        state: {
          init: () => ({
            displayMode: AI_DIFF_DISPLAY_MODE.COMPARE,
            aiContentByBlockId: new Map(),
            actionsEnabled: false,
            selectedChangeKey: null,
            changeKeysOrdered: [],
            pendingSelectIndex: null,
            decorations: DecorationSet.empty,
          }),
          apply: (tr, previous, _oldState, newState) => {
            const meta = tr.getMeta(aiDiffExtensionPluginKey) as AiDiffExtensionMeta | undefined;
            let selectedChangeKey =
              meta && 'selectedChangeKey' in meta
                ? (meta.selectedChangeKey ?? null)
                : previous.selectedChangeKey;
            let pendingSelectIndex =
              meta && 'pendingSelectIndex' in meta
                ? (meta.pendingSelectIndex ?? null)
                : previous.pendingSelectIndex;
            const runtime = {
              displayMode: meta?.displayMode ?? previous.displayMode,
              aiContentByBlockId: meta?.aiContentByBlockId ?? previous.aiContentByBlockId,
              actionsEnabled: meta?.actionsEnabled ?? previous.actionsEnabled,
              onAction: meta?.onAction ?? previous.onAction,
              onSelectChange: meta?.onSelectChange ?? previous.onSelectChange,
              selectedChangeKey,
            };
            if (!tr.docChanged && !meta) return previous;
            if (runtime.selectedChangeKey) {
              const selectedBlockId = runtime.selectedChangeKey.split('::')[0] ?? '';
              if (!runtime.aiContentByBlockId.has(selectedBlockId)) {
                selectedChangeKey = null;
                runtime.selectedChangeKey = null;
              }
            }
            const buildWithSelection = (key: string | null) =>
              buildDecorations({
                doc: newState.doc as unknown as PMNode,
                editorSchema: editor.schema as unknown as {
                  blockSchema: unknown;
                  inlineContentSchema: unknown;
                  styleSchema: unknown;
                },
                proseMirrorSchema: newState.schema,
                registry,
                runtime: { ...runtime, selectedChangeKey: key },
              });

            let built = buildWithSelection(selectedChangeKey);
            if (pendingSelectIndex != null) {
              // 等 sidecar 刷新 aiContent 后再按位置恢复，并重建装饰（否则工具条仍按未选中绘制）
              if (meta?.aiContentByBlockId !== undefined) {
                selectedChangeKey =
                  built.changeKeysOrdered[pendingSelectIndex] ??
                  built.changeKeysOrdered[
                    Math.min(pendingSelectIndex, Math.max(built.changeKeysOrdered.length - 1, 0))
                  ] ??
                  null;
                pendingSelectIndex = null;
                built = buildWithSelection(selectedChangeKey);
                if (selectedChangeKey) {
                  const key = selectedChangeKey;
                  window.requestAnimationFrame(() => scrollAiDiffChangeIntoView(key));
                }
              } else {
                selectedChangeKey = null;
              }
            } else if (selectedChangeKey && !built.changeKeysOrdered.includes(selectedChangeKey)) {
              selectedChangeKey = null;
              built = buildWithSelection(null);
            }
            return {
              ...runtime,
              selectedChangeKey,
              pendingSelectIndex,
              changeKeysOrdered: built.changeKeysOrdered,
              decorations: built.decorations,
            };
          },
        },
        props: {
          decorations: (state) => aiDiffExtensionPluginKey.getState(state)?.decorations ?? null,
          handleKeyDown(view, event) {
            if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return false;

            if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
              const handled = navigateAiDiffByArrow(view, event.key === 'ArrowUp' ? 'up' : 'down');
              if (handled) {
                event.preventDefault();
                return true;
              }
              return false;
            }

            if (event.key === 'Enter') {
              if (!applySelectedAiDiffAction(view, 'accept')) return false;
              event.preventDefault();
              return true;
            }

            if (event.key === 'Escape' || event.key === 'Backspace') {
              if (!applySelectedAiDiffAction(view, 'discard')) return false;
              event.preventDefault();
              return true;
            }

            return false;
          },
          handleDOMEvents: {
            mousedown(view, event) {
              const state = aiDiffExtensionPluginKey.getState(view.state);
              if (!state?.actionsEnabled) return false;
              const target = event.target as HTMLElement | null;
              if (!target || target.closest('button')) return false;

              const changeEl = target.closest<HTMLElement>('[data-ai-diff-change-key]');
              const blockEl = target.closest<HTMLElement>('[data-ai-diff-block-id]');
              const changeKey =
                changeEl?.dataset.aiDiffChangeKey ?? blockEl?.dataset.aiDiffBlockId ?? null;
              if (changeKey) {
                selectAiDiffChange(view, changeKey);
                view.focus();
                return false;
              }
              if (state.selectedChangeKey) {
                selectAiDiffChange(view, null);
              }
              return false;
            },
          },
        },
      }),
    ],
  }));
}

export function syncAiDiffExtensionState(view: EditorView, meta: AiDiffExtensionMeta): void {
  view.dispatch(
    view.state.tr.setMeta(aiDiffExtensionPluginKey, meta).setMeta('addToHistory', false)
  );
}

export function readAiContentFromEditorState(state: EditorState): ReadonlyMap<string, unknown> {
  return aiDiffExtensionPluginKey.getState(state)?.aiContentByBlockId ?? new Map();
}

export function hasAiDiffForBlockInEditorState(
  state: EditorState,
  block: Record<string, unknown>,
  registry: NotePluginRegistry
): boolean {
  const blockId = typeof block.id === 'string' ? block.id : '';
  const type = typeof block.type === 'string' ? block.type : '';
  const aiContentByBlockId = aiDiffExtensionPluginKey.getState(state)?.aiContentByBlockId;
  const aiDiff = registry.blockPlugins.get(type)?.aiDiff;
  if (!aiContentByBlockId?.has(blockId) || !aiDiff) return false;
  return Boolean(resolveNoteAiDiffBlock(block, aiContentByBlockId.get(blockId), aiDiff, registry));
}

export const aiDiffEditorExtension = {
  id: 'ai-diff.extension',
  print: {
    styles: [
      `.note-print-body [data-ai-diff-current-hidden='true'] {
  display: none !important;
}`,
    ],
  },
  extensions: ({ registry }) => [createAiDiffExtension(registry)()],
} satisfies NoteEditorExtension;
