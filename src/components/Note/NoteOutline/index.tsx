import clsx from 'clsx';
import { useMemo } from 'react';

import { useResourceDisplayName } from '@/hooks/useResourceDisplayName';
import { NOTE_OUTLINE_TITLE_ID, type NoteOutlineItem, type NoteOutlineProps } from './index.type';
import styles from './style.module.less';

function resolveLevelClass(level: number): string {
  const l = Math.min(6, Math.max(0, Math.floor(level)));
  return styles[`level${l}`];
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function filterItems(items: NoteOutlineItem[], maxLevel?: number): NoteOutlineItem[] {
  if (!maxLevel || maxLevel < 1) return items;
  return items.filter((it) => it.level <= maxLevel);
}

function NoteOutline({
  items,
  activeId,
  onNavigate,
  titleResourceId,
  titleFallback,
  maxLevel,
}: NoteOutlineProps) {
  const titleText = useResourceDisplayName(titleResourceId, titleFallback, '未命名笔记');
  const displayItems = useMemo(() => {
    const itemsWithTitle =
      titleResourceId != null && titleResourceId !== ''
        ? [{ id: NOTE_OUTLINE_TITLE_ID, level: 0, text: titleText }, ...items]
        : items;
    return filterItems(itemsWithTitle, maxLevel);
  }, [items, maxLevel, titleResourceId, titleText]);

  return (
    <div className={styles.root} aria-label="文档目录">
      <div className={styles.list} role="list">
        {displayItems.length === 0 ? (
          <div className={styles.empty}>暂无标题</div>
        ) : (
          displayItems.map((it) => {
            const text = normalizeText(it.text) || '（无标题）';
            const isActive = activeId === it.id;
            return (
              <button
                key={it.id}
                type="button"
                role="listitem"
                className={clsx(
                  styles.item,
                  resolveLevelClass(it.level),
                  it.level === 0 && styles.titleItem,
                  isActive && styles.active
                )}
                aria-current={isActive ? 'true' : undefined}
                title={text}
                onClick={() => onNavigate(it.id)}
              >
                {text}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

export default NoteOutline;
