import React from 'react';
import { X } from 'lucide-react';
import styles from './PageCloseButton.module.css';

interface PageCloseButtonProps {
  onClick: () => void;
  ariaLabel?: string;
}

const PageCloseButton: React.FC<PageCloseButtonProps> = ({ onClick, ariaLabel = "Close" }) => {
  return (
    <button onClick={onClick} className={styles.closeButton} aria-label={ariaLabel}>
      <X size={24} />
    </button>
  );
};

export default PageCloseButton; 