import React, { ReactNode } from 'react';
import styles from './FormCard.module.css';

interface FormCardProps {
  children: ReactNode;
  className?: string;
}

const FormCard: React.FC<FormCardProps> = ({ children, className }) => {
  return (
    <div className={`${styles.formCard} ${className || ''}`}>
      {children}
    </div>
  );
};
export default FormCard; 