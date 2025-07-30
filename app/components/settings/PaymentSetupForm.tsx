'use client';

import React, { useState, useEffect } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { createSetupIntent } from '@/app/actions/stripe/create-setup-intent';
import styles from './PaymentSetupForm.module.css';

interface PaymentSetupFormProps {
  userId: string;
}

const PaymentSetupForm = ({ userId }: PaymentSetupFormProps) => {
  const stripe = useStripe();
  const elements = useElements();

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [stripeCustomerId, setStripeCustomerId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchSetupIntent = async () => {
      setIsLoading(true);
      setMessage(null);

      try {
        const response = await createSetupIntent(userId);
        const data = await response;

        if (data.clientSecret) {
          setClientSecret(data.clientSecret);
          setStripeCustomerId(data.stripeCustomerId);
        } else {
          setMessage(data?.error || 'Error obtaining the SetupIntent.');
        }
      } catch (error: any) {
        setMessage(`network error: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    if (userId && !clientSecret)
      fetchSetupIntent();

  }, [userId, clientSecret]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements || !clientSecret) {
      setMessage('Stripe has not loaded correctly or data is missing.');
      return;
    }

    setIsLoading(true);
    setMessage('Saving payment method...');

    const { error: submitError } = await elements.submit();

    if (submitError) {
      return;
    }

    const { error } = await stripe.confirmSetup({
      elements,
      clientSecret,
      confirmParams: {
        return_url: `${window.location.origin}/user/${userId}/settings/payment-method-setup-success?customer_id=${stripeCustomerId}`,
      },
    });

    if (error) {
      if (error.type === "card_error" || error.type === "validation_error") {
        setMessage(error.message || 'Error in the card or validation.');
      } else {
        setMessage('An unexpected error occurred while saving the payment method.');
      }
      setIsLoading(false);
    } else {
      setMessage('Saved payment method. Redirecting...');
    }
  };

  return (
    <form id="setup-form" onSubmit={handleSubmit} className={styles.setupForm} >
      <h2>Set up your Primary Payment Method</h2>
      <p>Save a card for quick payments and to be able to book Gigs.</p>

      {isLoading && !clientSecret && <p>Loading payment form...</p>}

      {clientSecret && (
        <div className={styles.paymentElementContainer}>
          <PaymentElement options={{ layout: 'tabs' }} />
        </div>
      )}

      <button
        disabled={!stripe || isLoading || !clientSecret}
        className={styles.savePaymentMethodBtn}
      >
        {isLoading ? 'Saving...' : 'Saved Payment method'}
      </button>

      {message && (
        <div
          className={`${styles.setupMessage} ${message.includes('Error') ? styles.setupMessageError : ''}`}
        >
          {message}
        </div>
      )}
    </form>
  );
};

export default PaymentSetupForm;