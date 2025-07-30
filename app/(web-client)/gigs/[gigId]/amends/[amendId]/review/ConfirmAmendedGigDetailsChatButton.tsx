import React from 'react';
import { MessageSquare } from 'lucide-react';
import styles from './ConfirmAmendedGigDetailsPage.module.css';

const ConfirmAmendedGigDetailsChatButton: React.FC = () => (
  <button className={styles.chatButton} onClick={() => console.log('Chat icon clicked')}>
    <MessageSquare fill="#ffffff" className={styles.chatIcon} strokeWidth={1.5} />
  </button>
);

export default ConfirmAmendedGigDetailsChatButton; 