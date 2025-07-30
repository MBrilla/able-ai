"use server";

import { db } from "@/lib/drizzle/db";
import { and, eq } from "drizzle-orm";
import { GigsTable, UsersTable } from "@/lib/drizzle/schema";
import moment from "moment";
import GigDetails from "@/app/types/GigDetailsTypes";

function getMockedQAData(gigId: string) {
  // Example Data (should match the actual GigDetails interface)

  if (gigId === "gig123-accepted") {
    return {
      id: "gig123-accepted",
      role: "Lead Bartender",
      gigTitle: "Corporate Mixer Event",
      buyerName: "Innovate Solutions Ltd.", buyerAvatarUrl: "/images/logo-placeholder.svg",
      date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // In 2 days
      startTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).setHours(18, 0, 0, 0).toString(),
      endTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).setHours(23, 0, 0, 0).toString(),
      location: "123 Business Rd, Tech Park, London, EC1A 1BB",
      hourlyRate: 25,
      estimatedEarnings: 125,
      specialInstructions: "Focus on high-quality cocktails. Dress code: smart black. Setup starts 30 mins prior. Contact person on site: Jane (07xxxxxxxxx).",
      status: "IN_PROGRESS", // Initially pending
      statusInternal: "IN_PROGRESS",
      hiringManager: "Jane Smith",
      hiringManagerUsername: "@janesmith",
      isBuyerSubmittedFeedback: false,
      isWorkerSubmittedFeedback: true,
    };
  }
  if (gigId === "gig456-inprogress") {
    return {
      id: "gig456-inprogress",
      role: "Event Server",
      gigTitle: "Wedding Reception",
      buyerName: "Alice & Bob",
      date: new Date().toISOString(), // Today
      startTime: new Date(new Date().setHours(16, 0, 0, 0)).toISOString(),
      endTime: new Date(new Date().setHours(22, 0, 0, 0)).toISOString(),
      location: "The Manor House, Countryside Lane, GU21 5ZZ",
      hourlyRate: 18, estimatedEarnings: 108,
      specialInstructions: "Silver service required. Liaise with the event coordinator Sarah upon arrival.",
      status: "IN_PROGRESS", // Initially completed
      statusInternal: "IN_PROGRESS",
      hiringManager: "Sarah Johnson",
      hiringManagerUsername: "@sarahjohnson",
      isBuyerSubmittedFeedback: false,
      isWorkerSubmittedFeedback: true,
    };
  }

  return null; // Or throw an error
}

function getMappedStatus(internalStatus: string): GigDetails['status'] {

  switch (internalStatus) {
    case 'PENDING_WORKER_ACCEPTANCE':
      return 'PENDING';
    case 'ACCEPTED':
      return 'ACCEPTED';
    case 'COMPLETED':
      return 'COMPLETED';
    case 'CANCELLED_BY_BUYER':
    case 'CANCELLED_BY_WORKER':
    case 'CANCELLED_BY_ADMIN':
      return 'CANCELLED';
    default:
      console.warn(`Unhandled gig statusInternal: ${internalStatus}`);
      return 'PENDING';
  }

}

export async function getGigDetails({ gigId, userId, role, isViewQA }: { gigId: string; userId: string; role?: 'buyer' | 'worker'; isViewQA?: boolean; }) {

  if (isViewQA) return { gig: getMockedQAData(gigId) as GigDetails, status: 200 };

  if (!userId) {
    return { error: 'User id is required', gig: {} as GigDetails, status: 404 };
  }

  try {
    const user = await db.query.UsersTable.findFirst({
      where: eq(UsersTable.firebaseUid, userId),
      columns: {
        id: true,
      }
    });

    if (!user) {
      return { error: 'User is not found', gig: {} as GigDetails, status: 404 };
    }

    const columnConditionId = role === 'buyer' ? GigsTable.buyerUserId : GigsTable.workerUserId;
    const gig = await db.query.GigsTable.findFirst({
      where: and(eq(columnConditionId, user.id), eq(GigsTable.id, gigId)),
      with: {
        buyer: {
          columns: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        worker: {
          columns: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    if (isViewQA && !gig) return { gig: getMockedQAData(gigId) as GigDetails, status: 200 };

    if (!gig) {
      return { error: 'gig not found', gig: {} as GigDetails, status: 404 };
    }

    const startDate = moment(gig.startTime);
    const endDate = moment(gig.endTime);
    const durationInHours = endDate.diff(startDate, 'hours', true);
    const estimatedEarnings = gig.totalAgreedPrice ? parseFloat(gig.totalAgreedPrice) : 0;
    const hourlyRate = gig.agreedRate ? parseFloat(gig.agreedRate) : 0;
    const isWorkerSubmittedFeedback = false;
    const isBuyerSubmittedFeedback = false;

    const gigDetails: GigDetails = {
      id: gig.id,
      role: 'N/A',
      gigTitle: gig.titleInternal,
      buyerName: gig.buyer?.fullName || 'Unknown',
      date: startDate.format('YYYY-MM-DD'),
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
      duration: `${durationInHours} hours`,
      location: gig.exactLocation || 'location not specified',
      hourlyRate: hourlyRate,
      estimatedEarnings: estimatedEarnings,
      specialInstructions: gig.notesForWorker || undefined,
      status: getMappedStatus(gig.statusInternal),
      statusInternal: gig.statusInternal,
      hiringManager: gig.buyer.fullName || 'manager',
      hiringManagerUsername: gig.buyer.email,
      isWorkerSubmittedFeedback: isWorkerSubmittedFeedback,
      isBuyerSubmittedFeedback: isBuyerSubmittedFeedback,
    };

    return { gig: gigDetails, status: 200 };

  } catch (error: any) {
    console.error("Error fetching gig:", error);
    return { error: error.message, gig: {} as GigDetails, status: 500 };
  }
}
