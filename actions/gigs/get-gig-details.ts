"use server";
import { db } from "@/lib/drizzle/db";
import { and, eq, or, isNull } from "drizzle-orm";
import { GigsTable, UsersTable } from "@/lib/drizzle/schema";
import moment from "moment";
import GigDetails from "@/app/types/GigDetailsTypes";
import {
  getUserById,
  fetchGigForRole,
  calculateWorkerStats,
  buildGigDetails,
} from "../utils/gig-helpers";
import { handleError } from "@/utils/handle-errors";
import { ERROR_CODES } from "@/lib/responses/errors";
import { CODES_SUCCESS } from "@/lib/responses/success";
// Helper function to extract location from an object
function extractLocationFromObject(obj: any): string | null {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return null;

  // Handle address objects - prioritize readable text over coordinates
  if (obj.formatted_address) {
    return obj.formatted_address;
  }

  // Handle other address fields
  if (obj.address) {
    return obj.address;
  }

  // Handle street address components
  if (obj.street_address || obj.route) {
    const parts = [];
    if (obj.street_number) parts.push(obj.street_number);
    if (obj.route) parts.push(obj.route);
    if (obj.locality) parts.push(obj.locality);
    if (obj.administrative_area_level_1)
      parts.push(obj.administrative_area_level_1);
    if (obj.postal_code) parts.push(obj.postal_code);
    if (obj.country) parts.push(obj.country);

    if (parts.length > 0) {
      return parts.join(", ");
    }
  }

  // Only use coordinates as a last resort if no readable address is available
  if (
    obj.lat &&
    obj.lng &&
    typeof obj.lat === "number" &&
    typeof obj.lng === "number"
  ) {
    return `Coordinates: ${obj.lat.toFixed(6)}, ${obj.lng.toFixed(6)}`;
  }

  return null;
}

// Helper function to extract location from a string
function extractLocationFromString(str: string): string | null {
  if (!str || typeof str !== "string") return null;

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
      return 'PENDING';
  }

  // Check if it's already a formatted location string (prioritize readable text)
  if (
    str.includes(",") &&
    !str.includes("[object Object]") &&
    !str.match(/^-?\d+\.\d+,\s*-?\d+\.\d+$/)
  ) {
    return str;
  }

  // Only use coordinates as a last resort if no readable text is available
  if (str.match(/^-?\d+\.\d+,\s*-?\d+\.\d+$/)) {
    return `Coordinates: ${str}`;
  }

  return null;
}

// Helper function to extract location from any data type (object or string)
function extractLocationFromData(data: any): string | null {
  if (!data) return null;

  if (typeof data === "string") {
    return extractLocationFromString(data);
  }

  if (typeof data === "object") {
    return extractLocationFromObject(data);
  }

  return null;
}

export async function getGigDetails({
  gigId,
  userId,
  role,
  isDatabaseUserId = false,
}: {
  gigId: string;
  userId: string;
  role?: "buyer" | "worker";
  isViewQA?: boolean;
  isDatabaseUserId?: boolean;
}) {
  try {
    const user = await db.query.UsersTable.findFirst({
      where: eq(UsersTable.firebaseUid, userId),
      columns: {
        id: true,
        firebaseUid: true,
        fullName: true,
      }
    });

    if (!user) {
      return { error: 'User is not found', gig: {} as GigDetails, status: 404 };
    }

    let gig;
    
    if (role === 'buyer') {
      // For buyers, look for gigs they created
      gig = await db.query.GigsTable.findFirst({
        where: and(eq(GigsTable.buyerUserId, user.id), eq(GigsTable.id, gigId)),
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
    } else if (role === 'worker') {
      // For workers, look for gigs assigned to them OR offered to them
      gig = await db.query.GigsTable.findFirst({
        where: and(
          eq(GigsTable.id, gigId),
          or(
            eq(GigsTable.workerUserId, user.id), // Assigned to this worker
            and(
              eq(GigsTable.statusInternal, 'PENDING_WORKER_ACCEPTANCE'),
              isNull(GigsTable.workerUserId) // Offered to workers (no specific worker assigned)
            )
          )
        ),
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
    } else {
      // Fallback to original logic
      const columnConditionId = role === 'buyer' ? GigsTable.buyerUserId : GigsTable.workerUserId;
      gig = await db.query.GigsTable.findFirst({
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
    }

    if (!gig) {
      throw new Error("Gig not found");
    }

    const workerProfile = await db.query.GigWorkerProfilesTable.findFirst({
      where: eq(GigWorkerProfilesTable.userId, gig.worker?.id || ""),
    });

    if (!workerProfile) {
      throw new Error("Gig has no assigned worker");
    }

    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    };

    const data = {
      id: gigId,
      role: gig.skillsRequired[0]?.skillName || gig.worker?.fullName,
      workerName: gig.worker?.fullName,
      workerAvatarUrl: workerProfile.videoUrl,
      workerId: gig.worker?.id,
      date: gig.createdAt.toISOString(),
      hourlyRate: gig.agreedRate,
      hoursWorked: gig.finalHours,
      totalPayment: gig.finalAgreedPrice,
      duration: gig.estimatedHours,
      location:
        extractLocationFromData(gig?.addressJson) ||
        extractLocationFromData(gig?.exactLocation) ||
        "Location not provided",
      completedAt:
        gig.payments[0]?.paidAt?.toLocaleString("en-US", options) ||
        gig.updatedAt?.toLocaleString("en-US", options),
      details: gig.fullDescription,
      earnings: gig.totalAgreedPrice,
    };

    return { success: true, data, status: CODES_SUCCESS.QUERY_OK.code };
  } catch (error: unknown) {
    return handleError(error);
  }
};

export const getGigForWorkerFeedback = async (gigId: string) => {
  try {
    const gig = await db.query.GigsTable.findFirst({
      where: eq(GigsTable.id, gigId),
      with: {
        buyer: {
          columns: {
            id: true,
            fullName: true,
            email: true,
            appRole: true,
          },
        },
        worker: {
          columns: {
            id: true,
            fullName: true,
            appRole: true,
          },
        },
        skillsRequired: { columns: { skillName: true } },
        payments: { columns: { paidAt: true } },
      },
    });

    if (!gig) {
      throw new Error("Gig not found");
    }


    const startDate = moment(gig.startTime);
    const endDate = moment(gig.endTime);
    const durationInHours = endDate.diff(startDate, 'hours', true);
    const estimatedEarnings = gig.totalAgreedPrice ? parseFloat(gig.totalAgreedPrice) : 0;
    const hourlyRate = gig.agreedRate ? parseFloat(gig.agreedRate) : 0;
    const isWorkerSubmittedFeedback = false;
    const isBuyerSubmittedFeedback = false;

    // Parse location from exactLocation (primary) or addressJson (fallback)
    let locationDisplay = 'Location not specified';
    
    // Helper function to extract location from an object
    const extractLocationFromObject = (obj: any): string | null => {
      if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null;
      
      // Handle coordinate objects with lat/lng
      if (obj.lat && obj.lng && typeof obj.lat === 'number' && typeof obj.lng === 'number') {
        return `Coordinates: ${obj.lat.toFixed(6)}, ${obj.lng.toFixed(6)}`;
      }
      
      // Handle address objects
      if (obj.formatted_address) {
        return obj.formatted_address;
      }
      
      // Handle other address fields
      if (obj.address) {
        return obj.address;
      }
      
      // Handle street address components
      if (obj.street_address || obj.route) {
        const parts = [];
        if (obj.street_number) parts.push(obj.street_number);
        if (obj.route) parts.push(obj.route);
        if (obj.locality) parts.push(obj.locality);
        if (obj.administrative_area_level_1) parts.push(obj.administrative_area_level_1);
        if (obj.postal_code) parts.push(obj.postal_code);
        if (obj.country) parts.push(obj.country);
        
        if (parts.length > 0) {
          return parts.join(', ');
        }
      }
      
      return null;
    };
    
    // Helper function to extract location from a string
    const extractLocationFromString = (str: string): string | null => {
      if (!str || typeof str !== 'string') return null;
      
      // Check if it's already a formatted location string
      if (str.includes(',') && !str.includes('[object Object]')) {
        return str;
      }
      
      // Check if it's coordinates
      if (str.match(/^-?\d+\.\d+,\s*-?\d+\.\d+$/)) {
        return `Coordinates: ${str}`;
      }
      
      // Check if it's a URL
      if (str.startsWith('http')) {
        return `Map Link: ${str}`;
      }
      
      return null;
    };
    
    // Try to extract location from exactLocation first
    if (gig.exactLocation) {
      if (typeof gig.exactLocation === 'string') {
        const extracted = extractLocationFromString(gig.exactLocation);
        if (extracted) {
          locationDisplay = extracted;
        }
      } else if (typeof gig.exactLocation === 'object') {
        const extracted = extractLocationFromObject(gig.exactLocation);
        if (extracted) {
          locationDisplay = extracted;
        }
      }
    }
    
    // If exactLocation didn't work, try addressJson
    if (locationDisplay === 'Location not specified' && gig.addressJson) {
      if (typeof gig.addressJson === 'string') {
        try {
          const parsed = JSON.parse(gig.addressJson);
          const extracted = extractLocationFromObject(parsed);
          if (extracted) {
            locationDisplay = extracted;
          }
        } catch (e) {
          // If parsing fails, try as plain string
          const extracted = extractLocationFromString(gig.addressJson);
          if (extracted) {
            locationDisplay = extracted;
          }
        }
      } else if (typeof gig.addressJson === 'object') {
        const extracted = extractLocationFromObject(gig.addressJson);
        if (extracted) {
          locationDisplay = extracted;
        }
      }
    }

    // If still no location, try one more aggressive pass
    if (locationDisplay === 'Location not specified') {
      // Try addressJson again with more aggressive parsing
      if (gig.addressJson && typeof gig.addressJson === 'object') {
        const obj = gig.addressJson as any;
        
        if (obj.lat && obj.lng) {
          locationDisplay = `Coordinates: ${obj.lat.toFixed(6)}, ${obj.lng.toFixed(6)}`;
        } else if (obj.formatted_address) {
          locationDisplay = obj.formatted_address;
        } else if (obj.address) {
          locationDisplay = obj.address;
        } else if (obj.street && obj.city) {
          locationDisplay = `${obj.street}, ${obj.city}`;
        } else {
          // Show any available string data
          for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'string' && value.trim() && 
                value !== 'null' && value !== 'undefined' && value !== '[object Object]' && !value.includes('[object Object]')) {
              locationDisplay = value.trim();
              break;
            }
          }
        }
      }
      
      // Try exactLocation one more time
      if (locationDisplay === 'Location not specified' && gig.exactLocation && typeof gig.exactLocation === 'object') {
        const obj = gig.exactLocation as any;
        
        if (obj.lat && obj.lng) {
          locationDisplay = `Coordinates: ${obj.lat.toFixed(6)}, ${obj.lng.toFixed(6)}`;
        } else if (obj.formatted_address) {
          locationDisplay = obj.formatted_address;
        }
      }
    }

    // Final validation: ensure we never return problematic values
    if (locationDisplay === '[object Object]' || locationDisplay.includes('[object Object]')) {
      locationDisplay = 'Location not specified';
    }

    // Additional safety check - ensure we always have a meaningful location
    if (locationDisplay === 'Location not specified') {
      locationDisplay = 'Location details available';
    }

    // Use the full titleInternal as the role (no truncation)
    const roleDisplay = gig.titleInternal || 'Gig Worker';

    const gigDetails: GigDetails = {
      id: gig.id,
      role: roleDisplay,
      gigTitle: gig.titleInternal || 'Untitled Gig',
      buyerName: gig.buyer?.fullName || 'Unknown',
      date: startDate.format('YYYY-MM-DD'),
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
      duration: `${durationInHours} hours`,
      location: locationDisplay,
      hourlyRate: hourlyRate,
      estimatedEarnings: estimatedEarnings,
      specialInstructions: gig.notesForWorker || undefined,
      status: getMappedStatus(gig.statusInternal),
      statusInternal: gig.statusInternal,
      hiringManager: gig.buyer?.fullName || 'Manager',
      hiringManagerUsername: gig.buyer?.email || 'No email',
      isWorkerSubmittedFeedback: isWorkerSubmittedFeedback,
      isBuyerSubmittedFeedback: isBuyerSubmittedFeedback,
    };

    const data = {
      id: gigId,
      role: BuyerProfile?.companyRole,
      buyerName: gig.buyer?.fullName,
      buyerAvatarUrl: BuyerProfile?.videoUrl,
      buyerId: gig.buyer?.id,
      date: gig.createdAt.toISOString(),
      hourlyRate: gig.agreedRate,
      hoursWorked: gig.finalHours,
      totalPayment: gig.finalAgreedPrice,
      duration: gig.estimatedHours,
      location:
        extractLocationFromData(gig?.addressJson) ||
        extractLocationFromData(gig?.exactLocation) ||
        "Location not provided",
      completedAt:
        gig.payments[0]?.paidAt?.toLocaleString("en-US", options) ||
        gig.updatedAt?.toLocaleString("en-US", options),
      details: gig.fullDescription,
      earnings: gig.totalAgreedPrice,
    };

  } catch (error: any) {
    console.error("Error fetching gig details:", error.message);
    return { error: error.message, gig: {} as GigDetails, status: 500 };
  }
};
