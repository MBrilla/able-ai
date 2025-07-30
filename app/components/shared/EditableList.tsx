import React from 'react';
import styles from './EditableList.module.css';
import { PlusCircle } from 'lucide-react';

interface EditableListProps<T> {
  title: string;
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  onAddItem?: () => void;
  addLabel?: string;
}

const EditableList = <T,>({
  title,
  items,
  renderItem,
  onAddItem,
  addLabel = "Add Item",
}: EditableListProps<T>) => {
  return (
    <div className={styles.editableListContainer}>
      <div className={styles.header}>
        <h2 className={styles.title}>{title}</h2>
        {onAddItem && (
          <button onClick={onAddItem} className={styles.addButton}>
            <PlusCircle size={20} />
            {addLabel}
          </button>
        )}
      </div>
      <div className={styles.itemList}>
        {items.map((item, index) => renderItem(item, index))}
        {items.length === 0 && <p className={styles.emptyMessage}>No items added yet.</p>}
      </div>
    </div>
  );
};

export default EditableList; 