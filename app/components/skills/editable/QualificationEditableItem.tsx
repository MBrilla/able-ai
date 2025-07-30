import React from 'react';
import { XCircle } from 'lucide-react';
import styles from './QualificationEditableItem.module.css';

interface QualificationEditableItemProps {
  qualification: string;
  index: number; // Use index as key and for remove callback
  onRemove: (index: number) => void;
}

const QualificationEditableItem: React.FC<QualificationEditableItemProps> = ({
  qualification,
  index,
  onRemove,
}) => {
  return (
    <div className={styles.itemContainer}>
      <span className={styles.qualificationText}>{qualification}</span>
      <button onClick={() => onRemove(index)} className={styles.removeButton} aria-label="Remove qualification">
        <XCircle size={20} />
      </button>
    </div>
  );
};

export default QualificationEditableItem; 