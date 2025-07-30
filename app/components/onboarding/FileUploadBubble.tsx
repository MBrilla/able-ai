import React, { ChangeEvent, Ref } from 'react';
import styles from './FileUploadBubble.module.css';
import { Paperclip } from 'lucide-react';

interface FileUploadBubbleProps {
  id?: string;
  name?: string;
  label?: string;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  multiple?: boolean;
  inputRef?: Ref<HTMLInputElement> | null; // Made optional
}

const FileUploadBubble: React.FC<FileUploadBubbleProps> = ({
  id,
  name,
  label,
  onChange,
  disabled,
  multiple = false,
  inputRef,
}) => {
  const inputId = id || name;
  return (
    <div className={`${styles.fileBubbleWrapper} ${styles.alignUser}`}>
      <div className={styles.fileBubbleContent}>
        {label && <p className={styles.label}>{label}</p>}
        <label htmlFor={inputId} className={styles.fileInputLabel}>
          <Paperclip size={16} />
          <span>{multiple ? "Attach files" : "Attach a file"}</span>
        </label>
        <input
          type="file"
          id={inputId}
          name={name}
          multiple={multiple}
          onChange={onChange}
          disabled={disabled}
          className={styles.fileInput}
          ref={inputRef}
        />
        {/* You might add a list of selected files here */}
      </div>
    </div>
  );
};
export default FileUploadBubble;