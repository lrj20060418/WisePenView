import { Input, TextArea } from '@/components/Input';
import { AppPopover } from '@/components/Overlay';
import AppModal from '@/components/Overlay/AppModal';
import UploadZone from '@/components/UploadZone';
import { FEEDBACK_TYPE, useImageService, useUserService, type FeedbackType } from '@/domains';
import { parseErrorMessage } from '@/utils/error';
import {
  assertImageProxyUploadLimit,
  IMAGE_UPLOAD_MAX_SIZE_LABEL,
} from '@/utils/image/uploadLimit';
import { Button, Label, ListBox, TextField, toast, type Selection } from '@heroui/react';
import { useRequest } from 'ahooks';
import { ChevronDown } from 'lucide-react';
import { useState, type Key } from 'react';
import type { UserFeedbackModalProps } from './index.type';
import styles from './style.module.less';

interface FeedbackFormValues {
  types: FeedbackType[];
  content: string;
  contact: string;
  image: File | null;
}

const DEFAULT_FORM_VALUES: FeedbackFormValues = {
  types: [],
  content: '',
  contact: '',
  image: null,
};

const FEEDBACK_TYPE_VALUES = new Set<string>(FEEDBACK_TYPE.options.map((option) => option.value));

function isFeedbackType(value: string): value is FeedbackType {
  return FEEDBACK_TYPE_VALUES.has(value);
}

function UserFeedbackModal({ isOpen, onOpenChange }: UserFeedbackModalProps) {
  const userService = useUserService();
  const imageService = useImageService();
  const [formValues, setFormValues] = useState<FeedbackFormValues>(DEFAULT_FORM_VALUES);

  const resetForm = () => {
    setFormValues(DEFAULT_FORM_VALUES);
  };

  const updateFormValue = <K extends keyof FeedbackFormValues>(
    key: K,
    value: FeedbackFormValues[K]
  ) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    onOpenChange(open);
  };

  const handleCancel = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleTypeSelectionChange = (keys: Selection) => {
    if (keys === 'all') {
      updateFormValue(
        'types',
        FEEDBACK_TYPE.options.map((option) => option.value)
      );
      return;
    }

    const nextTypes = Array.from(keys)
      .map((key: Key) => String(key))
      .filter(isFeedbackType);
    updateFormValue('types', nextTypes);
  };

  const handleImageChange = (file: File | null) => {
    if (!file) {
      updateFormValue('image', null);
      return;
    }

    try {
      assertImageProxyUploadLimit(file);
      updateFormValue('image', file);
    } catch (err) {
      toast.danger(parseErrorMessage(err));
    }
  };

  const { loading: submitting, run: runSubmitFeedback } = useRequest(
    async (values: FeedbackFormValues) => {
      let imageUrl: string | undefined;
      if (values.image) {
        const uploadResult = await imageService.uploadImage({
          file: values.image,
          scene: 'PUBLIC_IMAGE_FOR_USER',
          bizTag: 'feedback',
        });
        imageUrl = uploadResult.publicUrl;
      }

      await userService.submitFeedback({
        types: values.types,
        content: values.content,
        contact: values.contact,
        imageUrl,
      });
    },
    {
      manual: true,
      onSuccess: () => {
        toast.success('反馈提交成功');
        resetForm();
        onOpenChange(false);
      },
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const validateForm = (): boolean => {
    if (formValues.types.length === 0) {
      toast.warning('请选择问题类型');
      return false;
    }
    if (!formValues.content.trim()) {
      toast.warning('请输入问题描述');
      return false;
    }
    if (!formValues.contact.trim()) {
      toast.warning('请输入您的联系方式');
      return false;
    }
    return true;
  };

  const handleConfirm = () => {
    if (!validateForm()) return;
    runSubmitFeedback({
      ...formValues,
      content: formValues.content.trim(),
      contact: formValues.contact.trim(),
    });
  };

  const selectedTypeLabel =
    formValues.types.length > 0
      ? formValues.types.map((type) => FEEDBACK_TYPE.getLabel(type)).join('、')
      : '请选择问题类型';

  return (
    <AppModal
      isOpen={isOpen}
      onOpenChange={handleOpenChange}
      title="用户反馈"
      size="md"
      bodyClassName={styles.modalBody}
      isDismissable={!submitting}
      actions={
        <>
          <Button variant="secondary" isDisabled={submitting} onPress={handleCancel}>
            取消
          </Button>
          <Button
            variant="primary"
            isDisabled={submitting}
            aria-busy={submitting || undefined}
            onPress={handleConfirm}
          >
            提交
          </Button>
        </>
      }
    >
      <div className={styles.typeField}>
        <span className={styles.fieldLabel}>
          问题类型
          <span className={styles.requiredMark} aria-hidden="true">
            *
          </span>
        </span>
        <AppPopover>
          <AppPopover.Trigger>
            <Button
              variant="outline"
              className={styles.typeTrigger}
              isDisabled={submitting}
              aria-label="问题类型"
            >
              <span
                className={formValues.types.length > 0 ? styles.typeText : styles.typePlaceholder}
              >
                {selectedTypeLabel}
              </span>
              <ChevronDown size={16} aria-hidden className={styles.typeChevron} />
            </Button>
          </AppPopover.Trigger>
          <AppPopover.Content className={styles.typePopover} placement="bottom start">
            <ListBox
              aria-label="问题类型选项"
              selectionMode="multiple"
              selectedKeys={new Set(formValues.types)}
              onSelectionChange={handleTypeSelectionChange}
              className={styles.typeList}
            >
              {FEEDBACK_TYPE.options.map((option) => (
                <ListBox.Item key={option.value} id={option.value} textValue={option.label}>
                  {option.label}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </AppPopover.Content>
        </AppPopover>
      </div>

      <TextField
        aria-label="问题描述"
        value={formValues.content}
        onChange={(value) => updateFormValue('content', value)}
        isDisabled={submitting}
        isRequired
      >
        <Label>问题描述</Label>
        <TextArea rows={5} placeholder="请输入问题描述..." />
      </TextField>

      <div className={styles.imageField}>
        <span className={styles.fieldLabel}>图片上传</span>
        <UploadZone
          file={formValues.image}
          disabled={submitting}
          accept="image/*"
          label="点击或拖拽图片到此区域"
          description={`选填，仅可上传一张图片，大小不超过 ${IMAGE_UPLOAD_MAX_SIZE_LABEL}`}
          onFileChange={handleImageChange}
        />
      </div>

      <TextField
        aria-label="您的联系方式"
        value={formValues.contact}
        onChange={(value) => updateFormValue('contact', value)}
        isDisabled={submitting}
        isRequired
      >
        <Label>您的联系方式</Label>
        <Input placeholder="请输入您的联系方式" />
      </TextField>
    </AppModal>
  );
}

export default UserFeedbackModal;
