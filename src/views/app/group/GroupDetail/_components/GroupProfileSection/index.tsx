import { Input, TextArea } from '@/components/Input';
import AppModal from '@/components/Overlay/AppModal';
import UploadZone from '@/components/UploadZone';
import { useGroupService, useImageService } from '@/domains';
import type { EditGroupRequest, Group } from '@/domains/Group';
import { parseErrorMessage } from '@/utils/error';
import { PLACEHOLDER_IMAGE } from '@/utils/image/placeholder';
import { assertImageProxyUploadLimit } from '@/utils/image/uploadLimit';
import { Button, Label, TextField, toast, Tooltip } from '@heroui/react';
import { useRequest } from 'ahooks';
import { Pencil } from 'lucide-react';
import { useRef, useState, type SyntheticEvent } from 'react';
import GroupSettingsSection from '../GroupSettingsSection';
import styles from './style.module.less';

interface GroupProfileSectionProps {
  group: Group;
  groupId: string;
  canEdit: boolean;
  onSuccess: () => void;
}

interface GroupProfileDraft {
  groupName: string;
  groupDesc: string;
  coverFile: File | null;
  coverPreview: string | null;
}

const buildProfileDraft = (group: Group): GroupProfileDraft => ({
  groupName: group.groupName,
  groupDesc: group.groupDesc,
  coverFile: null,
  coverPreview: null,
});

function GroupProfileSection({ group, groupId, canEdit, onSuccess }: GroupProfileSectionProps) {
  const groupService = useGroupService();
  const imageService = useImageService();
  const [draft, setDraft] = useState<GroupProfileDraft>(() => buildProfileDraft(group));
  const [savedDraft, setSavedDraft] = useState<GroupProfileDraft>(() => buildProfileDraft(group));
  const [coverModalOpen, setCoverModalOpen] = useState(false);
  const [modalCoverFile, setModalCoverFile] = useState<File | null>(null);
  const coverPreviewRequestRef = useRef(0);

  const { loading: saving, run: runSave } = useRequest(
    async (nextDraft: GroupProfileDraft): Promise<GroupProfileDraft> => {
      let groupCoverUrl = group.groupCoverUrl;
      if (nextDraft.coverFile) {
        const { publicUrl } = await imageService.uploadImage({
          file: nextDraft.coverFile,
          scene: 'PUBLIC_IMAGE_FOR_GROUP',
          bizTag: `groups/${groupId}`,
        });
        groupCoverUrl = publicUrl;
      }

      const params: EditGroupRequest = {
        groupId,
        groupName: nextDraft.groupName,
        groupDesc: nextDraft.groupDesc,
        groupCoverUrl,
        groupType: group.groupType,
      };
      await groupService.editGroup(params);
      return {
        groupName: params.groupName,
        groupDesc: params.groupDesc,
        coverFile: null,
        coverPreview: groupCoverUrl || null,
      };
    },
    {
      manual: true,
      onSuccess: (nextSavedDraft) => {
        coverPreviewRequestRef.current += 1;
        setSavedDraft(nextSavedDraft);
        setDraft(nextSavedDraft);
        toast.success('小组资料已保存');
        onSuccess();
      },
      onError: (error: unknown) => {
        toast.danger(parseErrorMessage(error));
      },
    }
  );

  const updateDraft = <K extends keyof GroupProfileDraft>(key: K, value: GroupProfileDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const handleRestore = () => {
    coverPreviewRequestRef.current += 1;
    setDraft(savedDraft);
  };

  const handleCoverModalOpen = () => {
    setModalCoverFile(null);
    setCoverModalOpen(true);
  };

  const handleCoverModalOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setModalCoverFile(null);
      setCoverModalOpen(false);
      return;
    }
    setCoverModalOpen(true);
  };

  const handleModalCoverFileChange = (file: File | null) => {
    if (!file) {
      setModalCoverFile(null);
      return;
    }

    try {
      assertImageProxyUploadLimit(file);
      setModalCoverFile(file);
    } catch (error) {
      toast.danger(parseErrorMessage(error));
      setModalCoverFile(null);
    }
  };

  const handleConfirmCover = () => {
    if (!modalCoverFile) {
      toast.warning('请选择封面图片');
      return;
    }

    const requestId = coverPreviewRequestRef.current + 1;
    coverPreviewRequestRef.current = requestId;
    const reader = new FileReader();
    reader.onload = () => {
      if (requestId !== coverPreviewRequestRef.current || typeof reader.result !== 'string') return;
      updateDraft('coverPreview', reader.result);
    };
    reader.readAsDataURL(modalCoverFile);
    updateDraft('coverFile', modalCoverFile);
    setModalCoverFile(null);
    setCoverModalOpen(false);
  };

  const handleSave = () => {
    const groupName = draft.groupName.trim();
    if (!groupName) {
      toast.warning('请输入小组名称');
      return;
    }
    runSave({ ...draft, groupName, groupDesc: draft.groupDesc.trim() });
  };

  const handleCoverImageError = (event: SyntheticEvent<HTMLImageElement>) => {
    if (event.currentTarget.src !== PLACEHOLDER_IMAGE) {
      event.currentTarget.src = PLACEHOLDER_IMAGE;
    }
  };

  const coverUrl = draft.coverPreview ?? group.groupCoverUrl ?? PLACEHOLDER_IMAGE;

  return (
    <>
      <GroupSettingsSection
        title="小组资料"
        actions={
          canEdit ? (
            <>
              <Button variant="secondary" isDisabled={saving} onPress={handleRestore}>
                还原
              </Button>
              <Button
                variant="primary"
                isDisabled={saving}
                aria-busy={saving || undefined}
                onPress={handleSave}
              >
                保存
              </Button>
            </>
          ) : undefined
        }
      >
        <div className={styles.profileLayout}>
          <div className={styles.fields}>
            {canEdit ? (
              <>
                <TextField
                  aria-label="小组名称"
                  value={draft.groupName}
                  onChange={(value) => updateDraft('groupName', value)}
                  isRequired
                >
                  <Label>小组名称</Label>
                  <Input placeholder="请输入小组名称" />
                </TextField>
                <TextField
                  aria-label="小组描述"
                  value={draft.groupDesc}
                  onChange={(value) => updateDraft('groupDesc', value)}
                >
                  <Label>小组描述</Label>
                  <TextArea rows={5} placeholder="请输入小组描述" />
                </TextField>
              </>
            ) : (
              <dl className={styles.readonlyFields}>
                <div>
                  <dt>小组名称</dt>
                  <dd>{group.groupName || '-'}</dd>
                </div>
                <div>
                  <dt>小组描述</dt>
                  <dd>{group.groupDesc || '暂无描述'}</dd>
                </div>
              </dl>
            )}
          </div>

          <div className={styles.coverField}>
            <span className={styles.coverLabel}>小组封面</span>
            {canEdit ? (
              <Tooltip>
                <Tooltip.Trigger>
                  <button
                    className={styles.coverButton}
                    type="button"
                    aria-label="更换小组封面"
                    disabled={saving}
                    onClick={handleCoverModalOpen}
                  >
                    <img
                      className={styles.coverImage}
                      src={coverUrl}
                      alt={`${draft.groupName || group.groupName} 小组封面`}
                      onError={handleCoverImageError}
                    />
                    <span className={styles.coverEditAffordance}>
                      <Pencil size={16} aria-hidden="true" />
                    </span>
                  </button>
                </Tooltip.Trigger>
                <Tooltip.Content>更换封面</Tooltip.Content>
              </Tooltip>
            ) : (
              <div className={styles.coverReadonly}>
                <img
                  className={styles.coverImage}
                  src={coverUrl}
                  alt={`${group.groupName} 小组封面`}
                  onError={handleCoverImageError}
                />
              </div>
            )}
          </div>
        </div>
      </GroupSettingsSection>

      <AppModal
        isOpen={coverModalOpen}
        onOpenChange={handleCoverModalOpenChange}
        title="更换小组封面"
        isDismissable={!saving}
        actions={
          <>
            <Button
              variant="secondary"
              isDisabled={saving}
              onPress={() => handleCoverModalOpenChange(false)}
            >
              取消
            </Button>
            <Button
              variant="primary"
              isDisabled={!modalCoverFile || saving}
              onPress={handleConfirmCover}
            >
              确定
            </Button>
          </>
        }
      >
        <UploadZone
          file={modalCoverFile}
          disabled={saving}
          accept="image/*"
          label="点击或拖拽封面图片到此区域"
          onFileChange={handleModalCoverFileChange}
        />
      </AppModal>
    </>
  );
}

export default GroupProfileSection;
