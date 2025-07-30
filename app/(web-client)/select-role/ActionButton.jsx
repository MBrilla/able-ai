"use client";

import React from 'react';
import styles from './ActionButton.module.css';

const ActionButton = ({ bgColor, onClick, disabled = false, children }) => {
  return (
    <button
      className={styles.button}
      style={{ backgroundColor: bgColor }} // Dynamic background color
      onClick={onClick}
      disabled={disabled}
      type="button" // Explicitly type as button if not submitting a form
    >
      {children || label}
    </button>
  );
};

export default ActionButton;