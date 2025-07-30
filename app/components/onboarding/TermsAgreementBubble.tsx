import React, { ReactNode, KeyboardEvent } from 'react';
import styles from './TermsAgreementBubble.module.css';
import { CheckSquare, Square } from 'lucide-react';

interface TermsAgreementBubbleProps {
  id?: string;
  name?: string;
  label?: string;
  termsContent?: ReactNode;
  isChecked?: boolean;
  onCheckedChange: (isChecked: boolean) => void;
  disabled?: boolean;
  required?: boolean;
  linkToTermsPage?: string;
}

const TermsAgreementBubble: React.FC<TermsAgreementBubbleProps> = ({
  id,
  name,
  label = "Terms and Conditions",
  termsContent,
  isChecked = false, // Default to false if not provided
  onCheckedChange,
  disabled,
  required = false,
  linkToTermsPage
}) => {
  const checkboxId = id || name || 'termsAgreementCheckbox';

  const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onCheckedChange(event.target.checked);
  };

  const handleIconClick = () => {
    if (!disabled) {
      onCheckedChange(!isChecked);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      handleIconClick();
    }
  };

  return (
    <div className={`${styles.termsBubbleWrapper} ${styles.alignUser}`}>
      <div className={styles.termsBubbleContent}>
        {label && <p className={styles.label}>{label}</p>}

        {termsContent && (
          <div className={styles.termsTextContainer}>
            {termsContent}
          </div>
        )}

        {linkToTermsPage && (
          <a href={linkToTermsPage} target="_blank" rel="noopener noreferrer" className={styles.fullTermsLink}>
            Read full terms here
          </a>
        )}

        <div
          className={styles.agreementControl}
          onClick={handleIconClick}
          role="checkbox"
          aria-checked={isChecked}
          tabIndex={disabled ? -1 : 0}
          onKeyDown={handleKeyDown}
        >
          {isChecked ?
            <CheckSquare size={20} className={`${styles.checkboxIcon} ${styles.checkedIcon}`} /> :
            <Square size={20} className={styles.checkboxIcon} />
          }
          <input
            type="checkbox"
            id={checkboxId}
            name={name}
            checked={isChecked}
            onChange={handleCheckboxChange}
            disabled={disabled}
            required={required}
            className={styles.hiddenCheckbox}
            aria-label={label || "Terms agreement"}
          />
          <label htmlFor={checkboxId} className={styles.checkboxLabel} onClick={(e) => e.preventDefault()} /* Prevent double toggle */ >
            I agree to the terms and conditions.
          </label>
        </div>
      </div>
    </div>
  );
};

export default TermsAgreementBubble;