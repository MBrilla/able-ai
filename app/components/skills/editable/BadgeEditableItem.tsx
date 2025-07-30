import React from 'react';
import { XCircle } from 'lucide-react';
import styles from './BadgeEditableItem.module.css';

interface SkillSpecificBadge {
  id: string;
  name: string;
  icon: React.ElementType; // Lucide icon or custom SVG
}

interface BadgeEditableItemProps {
  badge: SkillSpecificBadge;
  onUnlink: (badgeId: string) => void;
}

const BadgeEditableItem: React.FC<BadgeEditableItemProps> = ({
  badge,
  onUnlink,
}) => {
  const Icon = badge.icon;
  return (
    <div className={styles.itemContainer}>
      {Icon && <Icon size={20} className={styles.icon} />}
      <span className={styles.badgeName}>{badge.name}</span>
      <button onClick={() => onUnlink(badge.id)} className={styles.removeButton} aria-label="Unlink badge">
        <XCircle size={20} />
      </button>
    </div>
  );
};

export default BadgeEditableItem; 