import React from 'react';
import styles from './StatisticItemDisplay.module.css';

interface StatisticItemDisplayProps {
  icon: React.ElementType;
  value: string;
  label: string;
  iconColor?: string;
}

const StatisticItemDisplay: React.FC<StatisticItemDisplayProps> = ({
  icon: Icon,
  value,
  label,
  iconColor= '#7eeef9'
}) => {
  return (
    <div className={styles.statItem}>
      <Icon size={39} className={styles.statIcon} style={{ color: iconColor }} />
      <div className={styles.statText}>
        <span className={styles.statValue}>{value}</span>
        <span className={styles.statLabel}>{label}</span>
      </div>
    </div>
  );
};

export default StatisticItemDisplay; 