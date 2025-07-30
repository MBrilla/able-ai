import React from 'react';
import styles from './TitledItemListCard.module.css';

interface TitledItemListCardProps<T> {
  title: string;
  icon?: React.ElementType;
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
}

const TitledItemListCard = <T,>({
  title,
  icon: Icon,
  items,
  renderItem,
}: TitledItemListCardProps<T>) => {
  if (!items || items.length === 0) {
    return null; // Don't render if no items
  }

  return (
    <div className={styles.cardContainer}>
      <div className={styles.header}>
        <h2 className={styles.title}>{title}</h2>
        {Icon && <Icon size={20} className={styles.icon} />}
      </div>
      <div className={styles.itemList}>
        {items.map((item, index) => renderItem(item, index))}
      </div>
    </div>
  );
};

export default TitledItemListCard; 