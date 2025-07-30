import Image from 'next/image';
import Link from 'next/link';

// --- SHARED & HELPER COMPONENTS ---
import Avatar from '@/app/components/shared/Avatar';
import PillBadge from '@/app/components/shared/PillBadge';
import ContentCard from '@/app/components/shared/ContentCard';
import SkillsDisplayTable from '@/app/components/profile/SkillsDisplayTable';
import StatisticItemDisplay from '@/app/components/profile/StatisticItemDisplay';
import AwardDisplayBadge from '@/app/components/profile/AwardDisplayBadge';
import CheckboxDisplayItem from '@/app/components/profile/CheckboxDisplayItem';
import styles from './WorkerProfile.module.css';

import {
CalendarDays, BadgeCheck, UserCircle, MapPin, Share2 } from 'lucide-react';

import PublicWorkerProfile from '@/app/types/workerProfileTypes';

const WorkerProfile = ({
  workerProfile,
  isSelfView = false,
  handleAddSkill,
  handleSkillDetails, // Optional handler for skill details
}: {
  workerProfile: PublicWorkerProfile;
  isSelfView?: boolean;
  handleAddSkill?: () => void;
  handleSkillDetails: (name: string) => void; // Now optional
}) => {
  return (
    <div>
      {/* Top Section (Benji Image Style - Profile Image/Video, QR, Location) */}
      <div className={styles.profileHeaderImageSection}>
        <div className={styles.profileImageVideo}>
          {workerProfile.profileImageUrl ? (
            <Avatar src={workerProfile.profileImageUrl} alt={`${workerProfile.displayName}'s profile`} width={180} height={169} />
          ) : (
            <div className={`${styles.mainProfileVisual} ${styles.mainProfileVisualPlaceholder}`}><UserCircle size={80} /></div>
          )}
          {/* Add play icon if it's a video */}
        </div>
        <div className={styles.profileHeaderRightCol}>
          {workerProfile.qrCodeUrl && (
            <Image src={workerProfile.qrCodeUrl} alt="QR Code" width={90} height={90} className={styles.qrCode} />
          )}
          <div className={styles.locationShareContainer}>
            {workerProfile.location && (
              <div className={styles.locationInfo}>
                <MapPin size={16} color='#ffffff' className={styles.mapPin} />
                <span>{workerProfile.location}</span>
              </div>
            )}
            <button className={styles.shareProfileButton} aria-label="Share profile" onClick={() => alert('Share functionality coming soon!')}>
              <Share2 size={33} color='#ffffff'/>
            </button>
          </div>
        </div>
      </div>

      {/* User Info Bar (Benji Image Style - Name, Handle, Calendar) */}
      <div className={styles.userInfoBar}>
        <div className={styles.userInfoLeft}>
          <h1 className={styles.workerName}>
            {workerProfile.displayName}
            {workerProfile.isVerified && <BadgeCheck size={22} className={styles.verifiedBadgeWorker} />}
          </h1>
        </div>
        <div className={styles.workerInfo}>
          {workerProfile.userHandle && (
            <PillBadge text={workerProfile.userHandle} variant="neutral" className={styles.userHandleBadge} handleSkillDetails={handleSkillDetails} />
          )}
          {workerProfile.viewCalendarLink && (
          <Link href={workerProfile.viewCalendarLink} className={styles.viewCalendarLink} aria-label="View calendar">
            <CalendarDays size={20} className={styles.calendarIcon} />
            <span>Availability calendar</span>
          </Link>
        )}
        </div>
      </div>

      {/* Main content wrapper */}
      <div className={styles.mainContentWrapper}>

        {/* Statistics Section (Benji Image Style) */}
        {workerProfile.statistics && workerProfile.statistics.length > 0 && (
          // <ContentCard title="Statistics" className={styles.statisticsCard}>
            <div className={styles.statisticsItemsContainer}>
              {workerProfile.statistics.map(stat => (
                <StatisticItemDisplay
                  key={stat.id}
                  icon={stat.icon}
                  value={stat.value}
                  label={stat.label}
                  iconColor={stat.iconColor}
                />
              ))}
            </div>
          // </ContentCard>
        )}

        {/* Skills Section (Benji Image Style - Blue Card) */}
        {workerProfile.skills && workerProfile.skills.length > 0 && (
          <SkillsDisplayTable
            skills={workerProfile.skills}
            isSelfView={isSelfView}
            handleAddSkill={handleAddSkill}
            handleSkillDetails={handleSkillDetails}
          />
        )}

        {/* Awards & Feedback Section (Benji Image Style) */}
        {(workerProfile.awards || workerProfile.feedbackSummary) && ( // Only show section if there are awards or feedback
          <div className={styles.awardsFeedbackGrid}>
            {workerProfile.awards && workerProfile.awards.length > 0 && (
              // <ContentCard title="Awards:" className={styles.awardsCard}>
              <div>
                <h3 className={styles.contentTitle}>Awards:</h3>
                <div className={styles.awardsContainer}>
                  {workerProfile.awards.map(award => (
                    <AwardDisplayBadge
                      key={award.id}
                      icon={award.icon}
                      textLines={award.textLines}
                      color="#eab308"
                      border="3px solid #eab308"
                    />
                  ))}
                </div>
              </div>
              // </ContentCard>
            )}
            <div>
              <h3 className={styles.contentTitle}>Feedbacks:</h3>
              {workerProfile.feedbackSummary && (
                // <ContentCard title="Feedback:" className={styles.feedbackCard}>
                  <p className={styles.feedbackText}>{workerProfile.feedbackSummary}</p>
                // </ContentCard>
              )}
            </div>
          </div>
        )}

        {/* Qualifications Section (Benji Image Style) */}
        {workerProfile.qualifications && workerProfile.qualifications.length > 0 && (
          // <ContentCard title="Qualifications:">
          <div>
            <h3 className={styles.contentTitle}>Qualifications:</h3>
            <ul className={styles.listSimple}>
              {workerProfile.qualifications.map((q, index) => (
                <li key={index}>{q}</li>
              ))}
            </ul>
          </div>
          // </ContentCard>
        )}

        {/* Equipment Section (Benji Image Style) */}
        {workerProfile.equipment && workerProfile.equipment.length > 0 && (
          <div>
            <h3 className={styles.contentTitle}>Equipment:</h3>
            <div className={styles.equipmentListContainer}>
              {workerProfile.equipment.map((item, index) => (
                <CheckboxDisplayItem key={index} label={item} />
              ))}
            </div>
          </div>
        )}

        {/* Bio Text (if used) */}
        {workerProfile.bio && (
            <ContentCard title={`About ${workerProfile.displayName.split(' ')[0]}`}>
                <p className={styles.bioText}>{workerProfile.bio}</p>
            </ContentCard>
        )}

      </div> {/* End Main Content Wrapper */}

    </div>
  )
}

export default WorkerProfile
