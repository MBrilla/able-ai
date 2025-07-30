import React from 'react';
import { Check } from 'lucide-react';
import styles from './CheckboxDisplayItem.module.css';

interface CheckboxDisplayItemProps {
  label: string;
}

const CheckboxDisplayItem: React.FC<CheckboxDisplayItemProps> = ({ label }) => {
  return (
    <div className={styles.item}>
      <div className={styles.checkboxDisplay}>
        <Check size={14} className={styles.checkIcon} />
      </div>
      <span className={styles.label}>{label}</span>
    </div>
  );
};

export default CheckboxDisplayItem; 