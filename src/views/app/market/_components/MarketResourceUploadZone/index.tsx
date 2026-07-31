import DriveNavigator from '@/components/Drive/DriveNavigator';
import type { DriveSelectionItem } from '@/components/Drive/common/driveComponentModel';
import EntryIcon from '@/components/Icons/EntryIcon';
import { AppPopover } from '@/components/Overlay';
import AppModal from '@/components/Overlay/AppModal';
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from '@/components/_shadcn';
import { formatFileSize } from '@/utils/format/formatFileSize';
import { Button, ListBox, ListBoxItem } from '@heroui/react';
import { Cloud, Upload, UploadCloud, X } from 'lucide-react';
import {
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type Key,
  type KeyboardEvent,
} from 'react';
import { useTranslation } from 'react-i18next';
import type { MarketDriveResourceRef } from '../../mockData';
import type { MarketResourceUploadZoneProps } from './index.type';
import styles from './style.module.less';

function mapDriveSelection(item: DriveSelectionItem): MarketDriveResourceRef | null {
  if ((item.kind !== 'resource' && item.kind !== 'link') || !item.resourceId) return null;
  return {
    resourceId: item.resourceId,
    resourceName: item.label || item.resourceId,
    resourceType: item.resourceType ?? '',
  };
}

function MarketResourceUploadZone({
  file,
  driveRef,
  disabled = false,
  cloudOnly = false,
  accept,
  label,
  description,
  onFileChange,
  onDriveRefChange,
}: MarketResourceUploadZoneProps) {
  const { t } = useTranslation(['market', 'common']);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pendingDriveRef, setPendingDriveRef] = useState<MarketDriveResourceRef | null>(null);

  const hasSelection = Boolean(file || driveRef);

  const openCloudPicker = () => {
    if (disabled) return;
    setPendingDriveRef(driveRef);
    setPickerOpen(true);
  };

  const openLocalPicker = () => {
    if (disabled || cloudOnly) return;
    inputRef.current?.click();
  };

  const selectLocalFile = (files: FileList | null) => {
    if (disabled || cloudOnly) return;
    const next = files?.[0] ?? null;
    if (next) {
      onDriveRefChange(null);
      onFileChange(next);
    }
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleMenuAction = (key: Key) => {
    setMenuOpen(false);
    if (key === 'local-file') {
      openLocalPicker();
      return;
    }
    if (key === 'cloud-file') {
      openCloudPicker();
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    if (!cloudOnly) selectLocalFile(event.dataTransfer.files);
  };

  const handleActivate = () => {
    if (disabled) return;
    if (cloudOnly) {
      openCloudPicker();
      return;
    }
    setMenuOpen(true);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    handleActivate();
  };

  const clearSelection = () => {
    onFileChange(null);
    onDriveRefChange(null);
  };

  return (
    <div className={styles.dropZone}>
      {!cloudOnly ? (
        <input
          ref={inputRef}
          className={styles.nativeInput}
          type="file"
          accept={accept}
          onChange={(event: ChangeEvent<HTMLInputElement>) => selectLocalFile(event.target.files)}
        />
      ) : null}

      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        className={styles.dropArea}
        data-active={dragActive}
        data-disabled={disabled}
        onClick={handleActivate}
        onDrop={handleDrop}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled && !cloudOnly) setDragActive(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setDragActive(false);
        }}
        onKeyDown={handleKeyDown}
      >
        <span className={styles.uploadIcon} aria-hidden="true">
          <UploadCloud size={32} strokeWidth={1.8} />
        </span>
        <span className={styles.uploadText}>{label}</span>
        <span className={styles.uploadHint}>{description}</span>

        {cloudOnly ? (
          <Button
            variant="outline"
            size="sm"
            isDisabled={disabled}
            onClick={(event) => {
              event.stopPropagation();
              openCloudPicker();
            }}
          >
            {hasSelection ? t('page.publish.reselectSource') : t('page.publish.uploadCloud')}
          </Button>
        ) : (
          <AppPopover isOpen={menuOpen} onOpenChange={setMenuOpen}>
            <AppPopover.Trigger>
              <Button
                variant="outline"
                size="sm"
                isDisabled={disabled}
                onClick={(event) => event.stopPropagation()}
              >
                {hasSelection ? t('page.publish.reselectSource') : t('page.publish.selectSource')}
              </Button>
            </AppPopover.Trigger>
            <AppPopover.Content placement="bottom" title={t('page.publish.uploadMenuTitle')}>
              <div className={styles.popoverPanel}>
                <ListBox
                  aria-label={t('page.publish.uploadMenuAria')}
                  selectionMode="none"
                  className={styles.listBox}
                  onAction={handleMenuAction}
                >
                  <ListBoxItem id="local-file" textValue={t('page.publish.uploadLocal')}>
                    <span className={styles.listItemContent}>
                      <Upload size={16} aria-hidden="true" />
                      <span>{t('page.publish.uploadLocal')}</span>
                    </span>
                  </ListBoxItem>
                  <ListBoxItem id="cloud-file" textValue={t('page.publish.uploadCloud')}>
                    <span className={styles.listItemContent}>
                      <Cloud size={16} aria-hidden="true" />
                      <span>{t('page.publish.uploadCloud')}</span>
                    </span>
                  </ListBoxItem>
                </ListBox>
              </div>
            </AppPopover.Content>
          </AppPopover>
        )}
      </div>

      {file ? (
        <Attachment className={styles.fileAttachment} state="done" size="sm">
          <AttachmentMedia>
            <EntryIcon entryType="resource" size={18} />
          </AttachmentMedia>
          <AttachmentContent className={styles.fileInfo}>
            <AttachmentTitle className={styles.fileName} title={file.name}>
              {file.name}
            </AttachmentTitle>
            <AttachmentDescription className={styles.fileMeta}>
              {t('page.publish.sourceLocal')} · {formatFileSize(file.size)}
            </AttachmentDescription>
          </AttachmentContent>
          <AttachmentActions>
            <AttachmentAction
              isDisabled={disabled}
              label={t('uploadZone.remove', { ns: 'common' })}
              onPress={clearSelection}
            >
              <X size={16} strokeWidth={1.8} />
            </AttachmentAction>
          </AttachmentActions>
        </Attachment>
      ) : null}

      {driveRef ? (
        <Attachment className={styles.fileAttachment} state="done" size="sm">
          <AttachmentMedia>
            <EntryIcon entryType="resource" size={18} />
          </AttachmentMedia>
          <AttachmentContent className={styles.fileInfo}>
            <AttachmentTitle className={styles.fileName} title={driveRef.resourceName}>
              {driveRef.resourceName}
            </AttachmentTitle>
            <AttachmentDescription className={styles.fileMeta}>
              {t('page.publish.sourceCloud')}
              {driveRef.resourceType ? ` · ${driveRef.resourceType}` : ''}
            </AttachmentDescription>
          </AttachmentContent>
          <AttachmentActions>
            <AttachmentAction
              isDisabled={disabled}
              label={t('uploadZone.remove', { ns: 'common' })}
              onPress={clearSelection}
            >
              <X size={16} strokeWidth={1.8} />
            </AttachmentAction>
          </AttachmentActions>
        </Attachment>
      ) : null}

      <AppModal
        isOpen={pickerOpen}
        onOpenChange={(open) => {
          if (!open) {
            setPickerOpen(false);
            setPendingDriveRef(null);
          }
        }}
        title={t('page.publish.cloudPickerTitle')}
        size="md"
        contentMode="dialog"
      >
        <AppModal.Body>
          <div className={styles.pickerWrapper}>
            <p className={styles.pickerHint}>{t('page.publish.cloudPickerHint')}</p>
            <div className={styles.navTree}>
              <DriveNavigator
                scopeMode="all"
                selectableTypes={['resource', 'link']}
                multiple={false}
                onChange={(items) => {
                  const next = items[0] ? mapDriveSelection(items[0]) : null;
                  setPendingDriveRef(next);
                }}
              />
            </div>
          </div>
        </AppModal.Body>
        <AppModal.Footer>
          <Button
            variant="secondary"
            onPress={() => {
              setPickerOpen(false);
              setPendingDriveRef(null);
            }}
          >
            {t('actions.cancel', { ns: 'common' })}
          </Button>
          <Button
            variant="primary"
            isDisabled={!pendingDriveRef}
            onPress={() => {
              if (!pendingDriveRef) return;
              onFileChange(null);
              onDriveRefChange(pendingDriveRef);
              setPickerOpen(false);
              setPendingDriveRef(null);
            }}
          >
            {t('actions.confirm', { ns: 'common' })}
          </Button>
        </AppModal.Footer>
      </AppModal>
    </div>
  );
}

export default MarketResourceUploadZone;
