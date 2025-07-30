"use server";

import { db } from "@/lib/drizzle/db";
import { and, eq } from "drizzle-orm";
import { GigsTable, gigStatusEnum, UsersTable } from "@/lib/drizzle/schema";

const ACCEPTED = gigStatusEnum.enumValues[1];
const CANCELLED_BY_BUYER = gigStatusEnum.enumValues[9];
const CANCELLED_BY_WORKER = gigStatusEnum.enumValues[10];

const getNewStatus = (action: 'accept' | 'cancel', role: 'buyer' | 'worker') => {
  if (action === 'accept') return ACCEPTED;
  return role === 'buyer' ? CANCELLED_BY_BUYER : CANCELLED_BY_WORKER;
};

export async function updateGigOfferStatus({ gigId, userId, role, action }: { gigId: string; userId: string; role: 'buyer' | 'worker'; action: 'accept' | 'cancel'; isViewQA?: boolean; }) {

  try {
    const user = await db.query.UsersTable.findFirst({
      where: eq(UsersTable.firebaseUid, userId),
      columns: {
        id: true,
      }
    });

    if (!user) {
      return { error: 'User is not found', status: 404 };
    }

    const newStatus = getNewStatus(action, role);
    const gigUserIdCondition = role === 'buyer' ? GigsTable.buyerUserId : GigsTable.workerUserId;

    await db.update(GigsTable)
      .set({ statusInternal: newStatus })
      .where(and(eq(GigsTable.id, gigId), eq(gigUserIdCondition, user.id)));

    return { status: 200 };

  } catch (error: any) {
    console.error("Error updating gig:", error);
    return { error: error.message, status: 500 };
  }
}
