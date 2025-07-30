import React from 'react';
import Image from 'next/image';
import { XCircle, Video } from 'lucide-react';
import styles from './PortfolioEditableItem.module.css';

interface PortfolioMedia {
  id: string;
  type: 'image' | 'video';
  thumbnailUrl: string;
  fullUrl?: string;
  caption?: string;
}

interface PortfolioEditableItemProps {
  item: PortfolioMedia;
  onRemove: (itemId: string) => void;
  onEdit: (item: PortfolioMedia) => void; // Add edit functionality later
}

const PortfolioEditableItem: React.FC<PortfolioEditableItemProps> = ({
  item,
  onRemove,
  onEdit,
}) => {
  return (
    <div className={styles.itemContainer}>
      <div className={styles.thumbnailWrapper}>
        {item.type === 'image' ? (
          <Image
            src={item.thumbnailUrl}
            alt={item.caption || 'Portfolio item thumbnail'}
            width={60} // Adjust size as needed
            height={40} // Adjust size as needed
            className={styles.thumbnail}
          />
        ) : (
          <div className={styles.videoPlaceholder}> {/* Placeholder for video thumbnail */}
             <Video size={30} />
          </div>
        )}
        {/* TODO: Add play icon overlay for video */}
      </div>
      <span className={styles.caption}>{item.caption || `Untitled ${item.type}`}</span>
      {/* TODO: Add Edit button */}
      <button onClick={() => onEdit(item)} className={styles.editButton} aria-label="Edit item">
         Edit {/* Or an Edit icon */}
      </button>
      <button onClick={() => onRemove(item.id)} className={styles.removeButton} aria-label="Remove item">
        <XCircle size={20} />
      </button>
    </div>
  );
};

export default PortfolioEditableItem; 