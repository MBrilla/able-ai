'use server';

import { eq } from 'drizzle-orm';
import { db } from "@/lib/drizzle/db";
import { UsersTable } from "@/lib/drizzle/schema";

export async function paymentMethodSaved(userId: string, customerId: string, status: string, paymentMethodId?: string) {

  if (!userId || !paymentMethodId || !customerId || !status) {
    return { error: 'Missing required fields.', status: 400 }
  }

  if (status !== 'succeeded') {
    console.warn(`Payment method not saved successfully for user ${userId}. Status: ${status}`);
    return { error: `SetupIntent did not succeed. Status: ${status}`, status: 400 }
  }

  try {
    await db.update(UsersTable)
      .set({
        stripeCustomerId: customerId,
        // defaultPaymentMethodId: paymentMethodId,
        // hasSavedPaymentMethod: true,
        updatedAt: new Date(),
      })
      .where(eq(UsersTable.firebaseUid, userId));

    console.log(`Payment method ${paymentMethodId} saved and confirmed for User ID: ${userId}`);
    return { message: 'Payment method saved and confirmed in DB.', status: 200 }

  } catch (error: any) {
    console.error('Error confirming payment method saved:', error);
    return { error: error.message || 'internal server error', status: 500 }

  }
}
