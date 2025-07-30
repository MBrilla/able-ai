import React from 'react';
import Logo from '@/app/components/brand/Logo';
import { MessageSquare } from 'lucide-react';
import styles from './ConfirmAmendedGigDetailsPage.module.css';
import GigDetails from '@/app/types/GigDetailsTypes';

type NotificationMessage = {
  user: string;
  change: string;
  prompt: string;
};

type Props = {
  gigDetails: GigDetails;
  isLoading: boolean;
  lastRoleUsed: string | null;
  notificationMessage: NotificationMessage;
};

const ConfirmAmendedGigDetailsNotification: React.FC<Props> = ({ gigDetails, isLoading, lastRoleUsed, notificationMessage }) => (
  <section className={`${styles.card} ${styles.notificationCard}`}>
    <div className={styles.notificationMain}>
      <Logo width={60} height={60} />
      {gigDetails?.status !== 'CANCELLED' && !isLoading && (
        <p className={styles.notificationText}>
          {notificationMessage.user} has {notificationMessage.change}, the update details are below. {notificationMessage.prompt}
        </p>
      )}
      {gigDetails?.statusInternal === 'CANCELLED_BY_WORKER' && lastRoleUsed === 'GIG_WORKER' && (
        <p className={styles.notificationText}>
          {gigDetails.buyerName} has cancelled the gig, but don&apos;t worry, there are more to come!
        </p>
      )}
    </div>
    {lastRoleUsed === 'BUYER' && (
      <MessageSquare className={styles.chatIcon} strokeWidth={1.5} onClick={() => console.log('Chat icon clicked')} />
    )}
  </section>
);

export default ConfirmAmendedGigDetailsNotification; 