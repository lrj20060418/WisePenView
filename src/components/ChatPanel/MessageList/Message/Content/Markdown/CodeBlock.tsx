import CopyButton from '../../CopyButton';
import styles from './CodeBlock.module.less';

interface CodeBlockProps {
  code: string;
  language?: string;
}

function CodeBlock({ code, language }: CodeBlockProps) {
  return (
    <div className={styles.shell}>
      <CopyButton text={code} label="复制代码块" className={styles.copyButton} />
      <pre className={styles.pre}>
        <code className={language ? `language-${language}` : undefined}>{code}</code>
      </pre>
    </div>
  );
}

export default CodeBlock;
