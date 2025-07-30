import React from 'react';
import styles from '../legal.module.css';
import Logo from '@/app/components/brand/Logo'; // Assuming you have a Logo component

export default function PrivacyPage() {
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <Logo width={60} height={60} />
          <h1 className={styles.title}>Privacy Policy</h1>
        </div>
        <div className={styles.content}>
          <p>Able AI is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and share your personal information.</p>
          <p>We collect information such as your name, email address, and payment information when you create an account and use our services.</p>
          <p>We use this information to provide you with our services, process payments, and communicate with you.</p>
          {/* Add more privacy policy content here */}
        </div>
      </div>
    </div>
  );
} 

