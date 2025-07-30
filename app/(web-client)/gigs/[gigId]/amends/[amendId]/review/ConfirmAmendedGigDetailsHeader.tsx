import React from 'react';
import { AlertCircle } from 'lucide-react';
import styles from './ConfirmAmendedGigDetailsPage.module.css';

const ConfirmAmendedGigDetailsHeader: React.FC = () => (
  <header className={styles.header}>
    <div className={styles.headerContent}>
      <AlertCircle className={styles.headerIcon} strokeWidth={2} color="#ffffff" />
      <h1 className={styles.headerTitle}>Confirm amended Gig Details</h1>
    </div>
  </header>
);

export default ConfirmAmendedGigDetailsHeader; 