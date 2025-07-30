// app/components/shared/SettingsButton.tsx
"use client";
import React from 'react';
import { useRouter } from 'next/navigation';
import styles from './SettingsButton.module.css';
import Image from 'next/image';
// import { Settings } from 'lucide-react';
// import Settings from '@mui/icons-material/Settings';

const SettingsButton: React.FC = () => {
  const router = useRouter();
  const handleClick = () => {
    router.push('settings'); // Navigate to a general settings page
  };

  return (
    <button
      onClick={handleClick}
      className={styles.settingsButton}
      aria-label="Settings"
    >
      {/* <Settings style={{color: "#fff"}} fontSize='large'/> */}
      <Image
        src="/images/settings.svg"
        alt="Settings"
        width={35}
        height={35}
      />
    </button>
  );
};
export default SettingsButton;