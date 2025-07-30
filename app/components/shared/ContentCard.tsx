import React, { ReactNode } from 'react';
import styles from './ContentCard.module.css';

interface ContentCardProps {
  title?: string;
  icon?: React.ElementType;
  children: ReactNode;
  className?: string;
  titleClassName?: string;
  contentClassName?: string;
}

const ContentCard: React.FC<ContentCardProps> = ({
  title,
  icon: Icon,
  children,
  className = '',
  titleClassName = '',
  contentClassName = ''
}) => {
  return (
    <div className={`${styles.card} ${className}`}>
      {title && (
        <h2 className={`${styles.cardTitle} ${titleClassName}`}>
          {Icon && <Icon size={20} className={styles.titleIcon} />}
          {title}
        </h2>
      )}
      <div className={`${styles.cardContent} ${contentClassName}`}>
        {children}
      </div>
    </div>
  );
};

export default ContentCard; 