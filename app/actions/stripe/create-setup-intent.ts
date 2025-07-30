'use server';

import { eq } from 'drizzle-orm';
import { stripeApi } from '@/lib/stripe-server';
import { db } from "@/lib/drizzle/db";
import { UsersTable } from "@/lib/drizzle/schema";
import { createStripeCustomer } from '@/lib/create-stripe-customer';

export async function createSetupIntent(firebaseUid: string) {
  if (!firebaseUid) {
    return { error: 'User ID is required.', status: 400 }
  }

  try {
    const userRecord = await db.query.UsersTable.findFirst({
      where: eq(UsersTable.firebaseUid, firebaseUid),
      columns: {
        id: true,
      }
    });

    if (!userRecord) throw new Error('User not found');

    const stripeCustomer = await createStripeCustomer({ userId: userRecord.id });
    const stripeCustomerId = stripeCustomer.id;
    const setupIntent = await stripeApi.setupIntents.create({
      customer: stripeCustomerId,
      usage: 'off_session',
      metadata: {
        userId: userRecord.id,
        type: 'initial_payment_method_setup',
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return { clientSecret: setupIntent.client_secret, stripeCustomerId, status: 200 }

  } catch (error: any) {
    console.error('Error creating setup intent:', error);
    return { error: error.message, status: 500 }
  }
}
