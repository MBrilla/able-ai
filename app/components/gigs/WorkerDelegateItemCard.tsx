import React from 'react';
import Image from 'next/image'; // Or your Avatar component
import styles from './WorkerDelegateItemCard.module.css';
// import Avatar from '@/app/components/shared/Avatar';

interface WorkerDelegateItemProps {
  worker: {
    id: string;
    name: string;
    username: string;
    avatarUrl: string;
    primarySkill: string;
    experienceYears: number;
    hourlyRate: number;
    bio: string;
    location: string;
  };
  onDelegate: (workerId: string) => void;
  isDelegating?: boolean; // For loading state on button
}

const WorkerDelegateItemCard: React.FC<WorkerDelegateItemProps> = ({
  worker,
  onDelegate,
  isDelegating,
}) => {
  const getScoreColor = (score: number) => {
    if (score >= 0.8) return '#10b981'; // Green
    if (score >= 0.6) return '#f59e0b'; // Yellow
    return '#ef4444'; // Red
  };

  const getScoreLabel = (score: number) => {
    if (score >= 0.8) return 'Excellent';
    if (score >= 0.6) return 'Good';
    if (score >= 0.4) return 'Fair';
    return 'Poor';
  };

  return (
    <div className={styles.card}>
      <Image
        src={worker.avatarUrl}
        alt={worker.name}
        width={48}
        height={48}
        className={styles.avatar}
      />
      <div className={styles.userInfo}>
        <div className={styles.nameRow}>
          <span className={styles.name}>{worker.name}</span>
          <span className={styles.username}>@{worker.username}</span>
        </div>
        <div className={styles.skillRow}>
          <span className={styles.skill}>{worker.primarySkill}</span>
          <span className={styles.experience}>{worker.experienceYears} years exp</span>
        </div>
        <div className={styles.rateRow}>
          <span className={styles.rate}>£{worker.hourlyRate}/hour</span>
          <span className={styles.location}>{worker.location}</span>
        </div>
        {worker.bio && (
          <p className={styles.bio}>{worker.bio}</p>
        )}
      </div>
      <button
        onClick={() => onDelegate(worker.id)}
        className={styles.delegateButton}
        disabled={isDelegating}
      >
        {isDelegating ? 'Delegating...' : 'Delegate'}
      </button>
    </div>
  );
};
export default WorkerDelegateItemCard; 