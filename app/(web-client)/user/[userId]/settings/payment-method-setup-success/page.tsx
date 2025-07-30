'use client';

import React from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import StripeElementsProvider from '@/lib/stripe/StripeElementsProvider';
import SavedPaymentMethodStatus from './SavedPaymentMethodStatus';

const PaymentMethodSetupSuccessPage: React.FC = () => {
  const { userId } = useParams();
  const searchParams = useSearchParams();
  const customerId = searchParams.get('customer_id') as string;
  const setupIntentClientSecret = searchParams.get('setup_intent_client_secret') as string;

  return (
    <StripeElementsProvider options={{}}>
      <SavedPaymentMethodStatus customerId={customerId} setupIntentClientSecret={setupIntentClientSecret} userId={userId as string} />
    </StripeElementsProvider>
  );
};

export default PaymentMethodSetupSuccessPage;
