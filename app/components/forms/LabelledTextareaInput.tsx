import React from 'react';
import styles from './LabelledTextareaInput.module.css';

interface LabelledTextareaInputProps {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}

const LabelledTextareaInput: React.FC<LabelledTextareaInputProps> = ({ label, placeholder, value, onChange, rows = 5 }) => (
  <div className={styles.formField}>
    <label className={styles.fieldLabel}>{label}</label>
    <textarea
      className={styles.textareaInput}
      placeholder={placeholder}
      value={value}
      onChange={e => onChange(e.target.value)}
      rows={rows}
    />
  </div>
);
export default LabelledTextareaInput; 