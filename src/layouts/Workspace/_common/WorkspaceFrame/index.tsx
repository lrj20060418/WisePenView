import clsx from 'clsx';
import type { ReactNode } from 'react';
import styles from './style.module.less';

interface WorkspaceFrameProps {
  header?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  bodyClassName?: string;
}

function WorkspaceFrame({
  header,
  children,
  footer,
  className,
  bodyClassName,
}: WorkspaceFrameProps) {
  return (
    <div className={clsx(styles.root, className)}>
      {header}
      <div className={clsx(styles.body, bodyClassName)}>
        {children}
        {footer}
      </div>
    </div>
  );
}

export default WorkspaceFrame;
