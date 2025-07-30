import React from 'react';
import Image from 'next/image';
import styles from './WorkerCardBubble.module.css';
import { Star, Briefcase, MapPin as LocationPin, ExternalLink } from 'lucide-react';

interface WorkerData {
  name?: string;
  avatarSrc?: string;
  rating?: number;
  primarySkill?: string;
  location?: string;
  profileLink?: string;
  hourlyRate?: number;
}

interface WorkerCardBubbleProps {
  workerData?: WorkerData;
  senderType?: 'bot' | 'user' | 'system';
}

const WorkerCardBubble: React.FC<WorkerCardBubbleProps> = ({
  workerData,
  senderType = 'bot'
}) => {
  if (!workerData) {
    // Optionally return a placeholder or null if no data
    return (
      <div className={`${styles.workerCardBubbleWrapper} ${senderType === 'user' ? styles.alignUser : styles.alignBot}`}>
        <div className={styles.workerCardBubbleContent}>
          <p>Loading worker information...</p>
        </div>
      </div>
    );
  }

  const {
    name = "Worker Name",
    avatarSrc = "/images/default-avatar.png", // Ensure this default image exists or handle missing image
    rating,
    primarySkill = "Skill not specified",
    location = "Location not specified",
    profileLink,
    hourlyRate
  } = workerData;

  const alignmentClass = senderType === 'user' ? styles.alignUser : styles.alignBot;

  return (
    <div className={`${styles.workerCardBubbleWrapper} ${alignmentClass}`}>
      <div className={styles.workerCardBubbleContent}>
        <div className={styles.cardHeader}>
          <Image
            src={avatarSrc}
            alt={`${name}'s avatar`}
            width={60}
            height={60}
            className={styles.avatar}
            onError={(e) => { (e.target as HTMLImageElement).src = "/images/default-avatar.png"; }} // Fallback for broken image links
          />
          <div className={styles.headerText}>
            <h3 className={styles.workerName}>{name}</h3>
            {primarySkill && (
              <p className={styles.workerSkill}>
                <Briefcase size={14} /> {primarySkill}
              </p>
            )}
          </div>
        </div>

        <div className={styles.cardDetails}>
          {typeof rating === 'number' && rating > 0 && (
            <div className={styles.detailItem}>
              <Star size={15} className={styles.starIcon} />
              <span>{rating.toFixed(1)} Rating</span>
            </div>
          )}
          {location && (
            <div className={styles.detailItem}>
              <LocationPin size={15} />
              <span>{location}</span>
            </div>
          )}
           {typeof hourlyRate === 'number' && hourlyRate > 0 && (
            <div className={styles.detailItem}>
              <span className={styles.ratePrefix}>£</span>
              <span className={styles.rateAmount}>{hourlyRate.toFixed(2)}</span>
              <span className={styles.rateSuffix}>/hr</span>
            </div>
          )}
        </div>

        {profileLink && (
          <a
            href={profileLink}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.profileLinkButton}
          >
            View Profile <ExternalLink size={14} />
          </a>
        )}
      </div>
    </div>
  );
};

export default WorkerCardBubble;