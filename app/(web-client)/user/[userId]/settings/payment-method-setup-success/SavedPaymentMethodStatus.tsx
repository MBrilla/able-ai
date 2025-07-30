'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStripe } from '@stripe/react-stripe-js';
import { paymentMethodSaved } from '@/app/actions/stripe/payment-method-saved';
import styles from "../SettingsPage.module.css";

interface SavedPaymentMethodStatusProps {
  customerId: string;
  userId: string;
  setupIntentClientSecret: string;
}

const SavedPaymentMethodStatus = ({ customerId, setupIntentClientSecret, userId }: SavedPaymentMethodStatusProps) => {
  const stripe = useStripe();
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function checkSetupStatus() {
      if (!stripe || !setupIntentClientSecret || !customerId || !userId) {
        return;
      }

      const { setupIntent } = await stripe.retrieveSetupIntent(
        setupIntentClientSecret as string
      );

      if (!setupIntent) {
        setMessage('Error: Could not retrieve the SetupIntent.');
        return;
      }

      switch (setupIntent.status) {
        case 'succeeded':
          setMessage('¡Your primary payment method has been saved successfully.!');
          await paymentMethodSaved(userId as string, customerId, setupIntent.status, setupIntent.payment_method as string);

          break;
        case 'processing':
          setMessage('Your payment method is being processed...');
          break;
        case 'requires_payment_method':
          setMessage('Your payment method could not be saved. Please try again.');
          break;
        case 'canceled':
          setMessage('The payment method save operation was canceled.');
          break;
        default:
          setMessage(`Unknown state of the SetupIntent: ${setupIntent.status}`);
          break;
      }

      setTimeout(() => {
        router.push(`/user/${userId}/settings`);
      }, 3000);
    }

    if (setupIntentClientSecret) {
      checkSetupStatus();
    }

  }, [stripe, setupIntentClientSecret, router, userId]);

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <header className={styles.pageHeader}>
            <h1>Checking payment method status...</h1>
          </header>

          <p>{message || 'Please, do not close this window.'}</p>
        </div>
      </div>
    </div>
  );
};

export default SavedPaymentMethodStatus;
