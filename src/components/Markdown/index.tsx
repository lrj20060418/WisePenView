import { useUpdateEffect } from 'ahooks';
import { useState } from 'react';
import MarkdownRenderer, { type MarkdownResourceResolver } from './Renderer';
import { createMarkdownRuntime, updateMarkdownRuntime } from './runtime';
import styles from './style.module.less';

export type { MarkdownResourceResolver } from './Renderer';

interface MarkdownContentProps {
  content: string;
  streaming?: boolean;
  linkMode?: 'external' | 'safe';
  resourceResolver?: MarkdownResourceResolver;
}

function Markdown({
  content,
  streaming = false,
  linkMode = 'safe',
  resourceResolver,
}: MarkdownContentProps) {
  const [runtime] = useState(() => createMarkdownRuntime(content, streaming));
  const [snapshot, setSnapshot] = useState(runtime.snapshot);

  useUpdateEffect(() => {
    const nextSnapshot = updateMarkdownRuntime(runtime, content, streaming);
    if (nextSnapshot) setSnapshot(nextSnapshot);
  }, [content, streaming]);

  return (
    <div className={styles.markdown}>
      <MarkdownRenderer
        blocks={snapshot.blocks}
        renderContext={snapshot.renderContext}
        showFootnotes={!streaming}
        streaming={streaming}
        linkMode={linkMode}
        resourceResolver={resourceResolver}
      />
    </div>
  );
}

export default Markdown;
