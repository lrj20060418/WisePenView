import { FormField, InputGroup, Select } from '@/components/Input';
import { Button, Label, ListBox } from '@heroui/react';
import { ArrowLeft, ArrowUpFromLine, Building2, Save, User } from 'lucide-react';
import { useMarketPriceLabel } from '../../_hooks/useMarketPriceLabel';
import MarketResourceUploadZone from '../MarketResourceUploadZone';
import type { MarketPublishPanelProps } from './index.type';
import styles from './style.module.less';

const DEFAULT_COVER = '/market-covers/doc-blue.svg';

function MarketPublishPanel({
  mode = 'create',
  draft,
  previewOwnerName,
  previewCollege,
  marketGroups,
  folderOptions,
  groupsLoading = false,
  foldersLoading = false,
  labels,
  submitting = false,
  onBack,
  onChange,
  onSaveDraft,
  onSubmit,
}: MarketPublishPanelProps) {
  const priceLabel = useMarketPriceLabel();
  const priceNumber = Number(draft.price) || 0;
  const previewTitle =
    draft.resourceDriveRef?.resourceName?.trim() || draft.title.trim() || labels.previewEmptyTitle;

  const selectedGroupName = marketGroups.find((g) => g.groupId === draft.marketGroupId)?.groupName;

  const groupSelectDisabled = groupsLoading || marketGroups.length === 0 || submitting;
  const folderSelectDisabled =
    submitting || !draft.marketGroupId || foldersLoading || folderOptions.length === 0;

  const groupHint = groupsLoading
    ? labels.loadingGroups
    : marketGroups.length === 0
      ? labels.noGroups
      : null;

  const folderHint = !draft.marketGroupId
    ? labels.pickGroupFirst
    : foldersLoading
      ? labels.loadingFolders
      : folderOptions.length === 0
        ? labels.noFolders
        : null;

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <button type="button" className={styles.backButton} onClick={onBack}>
          <ArrowLeft size={14} aria-hidden="true" />
          {labels.back}
        </button>
        <h1 className={styles.pageTitle}>{labels.pageTitle}</h1>
        <p className={styles.pageSubtitle}>{labels.pageSubtitle}</p>
      </header>

      <div className={styles.layout}>
        <section className={styles.formCard}>
          <div className={styles.formHead}>
            <h2 className={styles.formTitle}>{labels.formTitle}</h2>
          </div>

          <MarketResourceUploadZone
            file={null}
            driveRef={draft.resourceDriveRef}
            accept=".pdf,.doc,.docx,.ppt,.pptx,.zip,.rar"
            label={labels.uploadFile}
            description={labels.uploadFileHint}
            cloudOnly
            disabled={submitting}
            onFileChange={() => undefined}
            onDriveRefChange={(resourceDriveRef) =>
              onChange({
                ...draft,
                resourceDriveRef,
                resourceFile: null,
                title: resourceDriveRef?.resourceName ?? draft.title,
              })
            }
          />

          <div className={styles.selectField}>
            <span className={styles.selectLabel}>{labels.marketGroupId}</span>
            <Select
              aria-label={labels.marketGroupId}
              value={draft.marketGroupId || undefined}
              isDisabled={groupSelectDisabled}
              onChange={(value) => {
                const next = typeof value === 'string' ? value : '';
                onChange({
                  ...draft,
                  marketGroupId: next,
                  folderTagId: next === draft.marketGroupId ? draft.folderTagId : '',
                });
              }}
            >
              <Select.Trigger />
              <Select.Popover>
                <ListBox>
                  {marketGroups.map((group) => (
                    <ListBox.Item
                      key={group.groupId}
                      id={group.groupId}
                      textValue={group.groupName}
                    >
                      <Label>{group.groupName}</Label>
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
            {groupHint ? <p className={styles.fieldHint}>{groupHint}</p> : null}
          </div>

          <div className={styles.selectField}>
            <span className={styles.selectLabel}>{labels.folderTagId}</span>
            <Select
              aria-label={labels.folderTagId}
              value={draft.folderTagId || undefined}
              isDisabled={folderSelectDisabled}
              onChange={(value) => {
                onChange({
                  ...draft,
                  folderTagId: typeof value === 'string' ? value : '',
                });
              }}
            >
              <Select.Trigger />
              <Select.Popover>
                <ListBox>
                  {folderOptions.map((folder) => (
                    <ListBox.Item key={folder.tagId} id={folder.tagId} textValue={folder.label}>
                      <Label>{folder.label}</Label>
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
            {folderHint ? <p className={styles.fieldHint}>{folderHint}</p> : null}
          </div>

          <FormField
            label={labels.price}
            value={draft.price}
            onChange={(value) => onChange({ ...draft, price: value })}
          >
            <InputGroup>
              <InputGroup.Input type="number" min={0} disabled={submitting} />
              <InputGroup.Suffix>{labels.coinSuffix}</InputGroup.Suffix>
            </InputGroup>
          </FormField>

          <footer className={styles.formFooter}>
            <Button variant="secondary" onPress={onSaveDraft} isDisabled={submitting}>
              <Save size={16} aria-hidden="true" />
              {labels.saveDraft}
            </Button>
            <Button variant="primary" onPress={onSubmit} isDisabled={submitting}>
              <ArrowUpFromLine size={16} aria-hidden="true" />
              {labels.submit}
            </Button>
          </footer>
        </section>

        <aside className={styles.previewPane}>
          <h2 className={styles.previewHeading}>{labels.previewTitle}</h2>
          <div className={styles.previewCard} data-mode={mode}>
            <div className={styles.previewCover}>
              <img
                className={styles.previewCoverImage}
                src={draft.coverImageUrl ?? DEFAULT_COVER}
                alt=""
              />
            </div>
            <div className={styles.previewBody}>
              <h3 className={styles.previewName}>{previewTitle}</h3>
              <div className={styles.previewMeta}>
                <span>
                  <User size={12} aria-hidden="true" />
                  {previewOwnerName}
                </span>
                <span>
                  <Building2 size={12} aria-hidden="true" />
                  {previewCollege}
                </span>
              </div>
              {selectedGroupName ? <p className={styles.previewDesc}>{selectedGroupName}</p> : null}
              <div className={styles.previewFooter}>
                <span className={styles.previewPrice}>{priceLabel(priceNumber)}</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default MarketPublishPanel;
