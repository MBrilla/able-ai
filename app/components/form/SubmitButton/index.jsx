import React from 'react';
import styles from './SubmitButton.module.css';
import { ArrowRight } from 'lucide-react';

const SubmitButton = ({ children, disabled = false, loading = false, ...props }) => {
  return (
    <button
      type="submit"
      className={styles.button}
      disabled={disabled || loading}
      aria-label={loading ? "Processing" : typeof children === 'string' ? children : "Submit"}
      {...props}
    >
      {loading ? (
        <>
          <span className={styles.loaderMobile}></span>
          <span className={styles.loaderDesktop}></span>
        </>
      ) : (
        <>
          {/* Desktop Text - hidden on mobile by default */}
          <span className={styles.buttonTextDesktop}>{children}</span>
          {/* Mobile Icon - visible on mobile by default */}
          <span className={styles.buttonIconMobile}>
            <ArrowRight size={18} strokeWidth={2.5} />
          </span>
        </>
      )}
    </button>
  );
};
export default SubmitButton;
