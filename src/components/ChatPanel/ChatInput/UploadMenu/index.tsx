import AppIconButton from '@/components/Button/AppIconButton';
import { AppPopover } from '@/components/Overlay';
import { ListBox, ListBoxItem } from '@heroui/react';
import { Cloud, Plus, Upload } from 'lucide-react';
import type { Key } from 'react';
import { useChatInputStore, useChatInputStoreApi } from '../_store/ChatInputStore';
import styles from '../style.module.less';
import { useChatInputFiles } from '../useChatInputFiles';

function UploadMenu() {
  const { openLocalFilePicker } = useChatInputFiles();
  const store = useChatInputStoreApi();
  const open = useChatInputStore((state) => state.attachmentOpen);
  const { setAttachmentOpen, setDocumentPickerOpen } = store.getState();

  const handleAction = (key: Key) => {
    if (key === 'local-file') {
      openLocalFilePicker();
      return;
    }
    if (key === 'cloud-file') {
      setAttachmentOpen(false);
      setDocumentPickerOpen(true);
    }
  };

  return (
    <AppPopover isOpen={open} onOpenChange={setAttachmentOpen}>
      <AppIconButton
        icon={<Plus size={18} aria-hidden="true" />}
        label="上传附件"
        overlayTrigger={<AppPopover.Trigger />}
      />
      <AppPopover.Content placement="top" title="附件">
        <div className={styles.popoverPanel}>
          <ListBox
            aria-label="附件操作"
            selectionMode="none"
            className={styles.listBox}
            onAction={handleAction}
          >
            <ListBoxItem id="local-file" textValue="从本地选取">
              <span className={styles.listItemContent}>
                <Upload size={16} />
                <span>从本地选取</span>
              </span>
            </ListBoxItem>
            <ListBoxItem id="cloud-file" textValue="从云盘选取">
              <span className={styles.listItemContent}>
                <Cloud size={16} />
                <span>从云盘选取</span>
              </span>
            </ListBoxItem>
          </ListBox>
        </div>
      </AppPopover.Content>
    </AppPopover>
  );
}

export default UploadMenu;
