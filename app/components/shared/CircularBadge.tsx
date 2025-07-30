import React from 'react';
import styles from './CircularBadge.module.css';

interface CircularBadgeProps {
  icon: React.ElementType;
  textLines: string[];
}

const CircularBadge: React.FC<CircularBadgeProps> = ({
  icon: Icon,
  textLines,
}) => {
  return (
    <div className={styles.circularBadgeContainer}>
      <div className={styles.iconWrapper}>
        <Icon size={24} className={styles.icon} />
      </div>
      <div className={styles.textLines}>
        {textLines.map((line, index) => (
          <span key={index}>{line}</span>
        ))}
      </div>
    </div>
  );
};

export default CircularBadge; 