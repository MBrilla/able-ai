import React from 'react';
import styles from './LabelledSelectInput.module.css';

interface Option {
  value: string;
  label: string;
}

interface LabelledSelectInputProps {
  label: string;
  options: Option[];
  value: string;
  onChange: (value: string) => void;
}

const LabelledSelectInput: React.FC<LabelledSelectInputProps> = ({ label, options, value, onChange }) => (
  <div className={styles.formField}>
    <label className={styles.fieldLabel}>{label}</label>
    <div className={styles.selectContainer}>
      <select
        className={styles.selectInput}
        value={value}
        onChange={e => onChange(e.target.value)}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  </div>
);
export default LabelledSelectInput; 