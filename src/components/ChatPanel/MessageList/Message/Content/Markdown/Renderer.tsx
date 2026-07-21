import type { ParsedBlock, RootContent } from '@incremark/core';
import { Fragment, memo, type ReactNode } from 'react';
import CodeBlock from './CodeBlock';
import type { MarkdownRenderContext } from './runtime';
import styles from './style.module.less';

const SAFE_PROTOCOL = /^(https?|ircs?|mailto|xmpp)$/i;

type MarkdownDefinitions = MarkdownRenderContext['definitions'];

interface MarkdownBlockProps {
  block: ParsedBlock;
  renderContext: MarkdownRenderContext;
}

interface MarkdownRendererProps {
  blocks: ParsedBlock[];
  renderContext: MarkdownRenderContext;
  showFootnotes: boolean;
}

/** 保持原有 URL 安全边界，拒绝脚本及 data 等可执行协议。 */
function transformUrl(value: string): string | null {
  const colon = value.indexOf(':');
  const questionMark = value.indexOf('?');
  const numberSign = value.indexOf('#');
  const slash = value.indexOf('/');
  const isRelative =
    colon === -1 ||
    (slash !== -1 && colon > slash) ||
    (questionMark !== -1 && colon > questionMark) ||
    (numberSign !== -1 && colon > numberSign);

  if (isRelative || SAFE_PROTOCOL.test(value.slice(0, colon))) return value;
  return null;
}

function resolveDefinition(
  identifier: string,
  definitions: MarkdownDefinitions
): MarkdownDefinitions[string] | undefined {
  return definitions[identifier] ?? definitions[identifier.toLowerCase()];
}

function renderInlineNodes(
  nodes: readonly RootContent[],
  renderContext: MarkdownRenderContext,
  keyPrefix: string
): ReactNode[] {
  return nodes.map((node, index) => renderInlineNode(node, renderContext, `${keyPrefix}-${index}`));
}

function renderInlineNode(
  node: RootContent,
  renderContext: MarkdownRenderContext,
  key: string
): ReactNode {
  switch (node.type) {
    case 'text':
      return <Fragment key={key}>{node.value}</Fragment>;
    case 'strong':
      return <strong key={key}>{renderInlineNodes(node.children, renderContext, key)}</strong>;
    case 'emphasis':
      return <em key={key}>{renderInlineNodes(node.children, renderContext, key)}</em>;
    case 'delete':
      return <del key={key}>{renderInlineNodes(node.children, renderContext, key)}</del>;
    case 'inlineCode':
      return <code key={key}>{node.value}</code>;
    case 'break':
      return <br key={key} />;
    case 'link': {
      const href = transformUrl(node.url);
      const children = renderInlineNodes(node.children, renderContext, key);
      if (!href) return <Fragment key={key}>{children}</Fragment>;
      return (
        <a key={key} href={href} title={node.title ?? undefined}>
          {children}
        </a>
      );
    }
    case 'linkReference': {
      const definition = resolveDefinition(node.identifier, renderContext.definitions);
      const href = definition ? transformUrl(definition.url) : null;
      const children = renderInlineNodes(node.children, renderContext, key);
      if (!href) return <Fragment key={key}>{children}</Fragment>;
      return (
        <a key={key} href={href} title={definition?.title ?? undefined}>
          {children}
        </a>
      );
    }
    case 'image': {
      const src = transformUrl(node.url);
      if (!src) return <Fragment key={key}>{node.alt ?? ''}</Fragment>;
      return (
        <img
          key={key}
          src={src}
          alt={node.alt ?? ''}
          title={node.title ?? undefined}
          loading="lazy"
        />
      );
    }
    case 'imageReference': {
      const definition = resolveDefinition(node.identifier, renderContext.definitions);
      const src = definition ? transformUrl(definition.url) : null;
      if (!src) return <Fragment key={key}>{node.alt ?? ''}</Fragment>;
      return (
        <img
          key={key}
          src={src}
          alt={node.alt ?? ''}
          title={definition?.title ?? undefined}
          loading="lazy"
        />
      );
    }
    case 'footnoteReference': {
      const fragmentId = encodeURIComponent(node.identifier);
      return (
        <sup key={key}>
          <a id={`fnref-${fragmentId}`} href={`#fn-${fragmentId}`}>
            [{node.identifier}]
          </a>
        </sup>
      );
    }
    case 'html':
      // 模型输出的原始 HTML 只作为文本展示，不交给浏览器执行。
      return <Fragment key={key}>{node.value}</Fragment>;
    default:
      if ('children' in node && Array.isArray(node.children)) {
        return (
          <Fragment key={key}>{renderInlineNodes(node.children, renderContext, key)}</Fragment>
        );
      }
      if ('value' in node && typeof node.value === 'string') {
        return <Fragment key={key}>{node.value}</Fragment>;
      }
      return null;
  }
}

function renderHeading(
  node: Extract<RootContent, { type: 'heading' }>,
  renderContext: MarkdownRenderContext,
  key: string
): ReactNode {
  const children = renderInlineNodes(node.children, renderContext, key);
  switch (node.depth) {
    case 1:
      return <h1>{children}</h1>;
    case 2:
      return <h2>{children}</h2>;
    case 3:
      return <h3>{children}</h3>;
    case 4:
      return <h4>{children}</h4>;
    case 5:
      return <h5>{children}</h5>;
    case 6:
      return <h6>{children}</h6>;
  }
}

function renderList(
  node: Extract<RootContent, { type: 'list' }>,
  renderContext: MarkdownRenderContext,
  keyPrefix: string
): ReactNode {
  const items = node.children.map((item, index) => {
    const isTaskItem = typeof item.checked === 'boolean';
    return (
      <li key={`${keyPrefix}-${index}`} className={isTaskItem ? styles.taskListItem : undefined}>
        {isTaskItem ? (
          <input
            type="checkbox"
            checked={item.checked ?? false}
            disabled
            className={styles.taskCheckbox}
          />
        ) : null}
        {item.children.map((child, childIndex) =>
          renderBlockNode(child, renderContext, `${keyPrefix}-${index}-${childIndex}`)
        )}
      </li>
    );
  });

  if (node.ordered) return <ol start={node.start ?? undefined}>{items}</ol>;
  return <ul>{items}</ul>;
}

function renderTable(
  node: Extract<RootContent, { type: 'table' }>,
  renderContext: MarkdownRenderContext,
  keyPrefix: string
): ReactNode {
  const [head, ...body] = node.children;
  const getAlignClass = (index: number): string | undefined => {
    const align = node.align?.[index];
    if (align === 'center') return styles.tableAlignCenter;
    if (align === 'right') return styles.tableAlignRight;
    if (align === 'left') return styles.tableAlignLeft;
    return undefined;
  };

  return (
    <div className={styles.tableWrapper}>
      <table>
        {head ? (
          <thead>
            <tr>
              {head.children.map((cell, index) => (
                <th key={`${keyPrefix}-head-${index}`} className={getAlignClass(index)}>
                  {renderInlineNodes(cell.children, renderContext, `${keyPrefix}-head-${index}`)}
                </th>
              ))}
            </tr>
          </thead>
        ) : null}
        <tbody>
          {body.map((row, rowIndex) => (
            <tr key={`${keyPrefix}-row-${rowIndex}`}>
              {row.children.map((cell, cellIndex) => (
                <td
                  key={`${keyPrefix}-row-${rowIndex}-${cellIndex}`}
                  className={getAlignClass(cellIndex)}
                >
                  {renderInlineNodes(
                    cell.children,
                    renderContext,
                    `${keyPrefix}-row-${rowIndex}-${cellIndex}`
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderBlockNode(
  node: RootContent,
  renderContext: MarkdownRenderContext,
  key: string
): ReactNode {
  switch (node.type) {
    case 'paragraph':
      return <p>{renderInlineNodes(node.children, renderContext, key)}</p>;
    case 'heading':
      return renderHeading(node, renderContext, key);
    case 'blockquote':
      return (
        <blockquote>
          {node.children.map((child, index) =>
            renderBlockNode(child, renderContext, `${key}-${index}`)
          )}
        </blockquote>
      );
    case 'list':
      return renderList(node, renderContext, key);
    case 'table':
      return renderTable(node, renderContext, key);
    case 'thematicBreak':
      return <hr />;
    case 'code':
      return <CodeBlock code={node.value} language={node.lang ?? undefined} />;
    case 'html':
      return <>{node.value}</>;
    case 'definition':
    case 'footnoteDefinition':
      return null;
    default:
      return renderInlineNode(node, renderContext, key);
  }
}

function MarkdownBlockView({ block, renderContext }: MarkdownBlockProps) {
  return renderBlockNode(block.node, renderContext, `block-${block.id}`);
}

const MarkdownBlock = memo(
  MarkdownBlockView,
  (previous, next) => previous.block === next.block && previous.renderContext === next.renderContext
);

function MarkdownFootnotes({ renderContext }: { renderContext: MarkdownRenderContext }) {
  if (renderContext.footnoteReferenceOrder.length === 0) return null;

  return (
    <section className={styles.footnotes}>
      <hr />
      <ol>
        {renderContext.footnoteReferenceOrder.map((identifier) => {
          const definition = renderContext.footnoteDefinitions[identifier];
          if (!definition) return null;
          const fragmentId = encodeURIComponent(identifier);
          return (
            <li key={identifier} id={`fn-${fragmentId}`}>
              {definition.children.map((child, index) =>
                renderBlockNode(child, renderContext, `footnote-${fragmentId}-${index}`)
              )}
              <a href={`#fnref-${fragmentId}`} aria-label="返回脚注引用">
                返回
              </a>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function MarkdownRenderer({ blocks, renderContext, showFootnotes }: MarkdownRendererProps) {
  return (
    <>
      {blocks.map((block) => (
        <MarkdownBlock key={block.id} block={block} renderContext={renderContext} />
      ))}
      {showFootnotes ? <MarkdownFootnotes renderContext={renderContext} /> : null}
    </>
  );
}

export default MarkdownRenderer;
