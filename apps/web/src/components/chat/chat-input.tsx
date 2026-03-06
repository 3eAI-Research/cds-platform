import { useState, useRef } from "react";
import { Input, Button, Upload, message } from "antd";
import { SendOutlined, PaperClipOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import type { UploadFile } from "antd/es/upload/interface";

interface ChatInputProps {
  onSend: (message: string) => void;
  onPhotoUpload: (files: File[]) => void;
  disabled?: boolean;
  loading?: boolean;
}

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILES = 10;

export const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  onPhotoUpload,
  disabled = false,
  loading = false,
}) => {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleBeforeUpload = (file: File, fileList: File[]) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      message.error(`${file.name}: ${t("provider.documents.invalidType")}`);
      return Upload.LIST_IGNORE;
    }
    if (fileList.length > MAX_FILES) {
      message.error(`Max ${MAX_FILES} files`);
      return Upload.LIST_IGNORE;
    }
    // We handle all files at once after selection
    return false;
  };

  const handleUploadChange = (info: { fileList: UploadFile[] }) => {
    const files: File[] = [];
    for (const f of info.fileList) {
      if (f.originFileObj) {
        files.push(f.originFileObj as unknown as File);
      }
    }
    if (files.length > 0) {
      onPhotoUpload(files);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        padding: "12px 16px",
        borderTop: "1px solid #f0f0f0",
        background: "#ffffff",
      }}
    >
      <Upload
        accept={ACCEPTED_TYPES.join(",")}
        multiple
        maxCount={MAX_FILES}
        showUploadList={false}
        beforeUpload={handleBeforeUpload as never}
        onChange={handleUploadChange}
        disabled={disabled || loading}
      >
        <Button
          icon={<PaperClipOutlined />}
          disabled={disabled || loading}
          title={t("agent.uploadPhotos")}
        />
      </Upload>
      <Input
        ref={inputRef as never}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={t("agent.send") + "..."}
        disabled={disabled || loading}
        style={{ flex: 1 }}
      />
      <Button
        type="primary"
        icon={<SendOutlined />}
        onClick={handleSend}
        disabled={disabled || loading || !text.trim()}
        loading={loading}
      >
        {t("agent.send")}
      </Button>
    </div>
  );
};
