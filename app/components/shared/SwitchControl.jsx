"use client";
import React from 'react';
import * as SwitchPrimitives from '@radix-ui/react-switch';
import styles from './SwitchControl.module.css';

const SwitchControl = ({ id, label, checked, onCheckedChange, disabled = false }) => {
  return (
    <div className={styles.switchGroup}>
      {label && <label htmlFor={id} className={styles.label}>{label}</label>}
      <SwitchPrimitives.Root
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className={styles.switchRoot}
      >
        <SwitchPrimitives.Thumb className={styles.switchThumb} />
      </SwitchPrimitives.Root>
    </div>
  );
};
export default SwitchControl;