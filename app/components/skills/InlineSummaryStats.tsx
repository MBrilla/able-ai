import React from 'react';
import styles from './InlineSummaryStats.module.css';

interface InlineSummaryStatsProps {
  ableGigs?: number | string;
  experience?: string;
  eph?: number | string;
}

const InlineSummaryStats: React.FC<InlineSummaryStatsProps> = ({
  ableGigs,
  experience,
  eph,
}) => {
  const stats = [
    ableGigs !== undefined ? `Able gigs: ${ableGigs}` : null,
    experience ? `Experience: ${experience}` : null,
    eph !== undefined ? `£ph: £${eph}ph` : null,
  ].filter(Boolean);

  if (stats.length === 0) {
    return null;
  }

  return (
    <div className={styles.statsContainer}>
      {stats.join(' • ')}
    </div>
  );
};

export default InlineSummaryStats; 