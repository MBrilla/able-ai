"use server";

import { db } from "@/lib/drizzle/db";
import { and, eq, isNull, or } from "drizzle-orm";
import { GigsTable, GigWorkerProfilesTable, UsersTable, gigStatusEnum } from "@/lib/drizzle/schema";
import moment from "moment";
import GigDetails from "@/app/types/GigDetailsTypes";

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
      return 'PENDING';
  }

}
// Helper function to extract location from an object
function extractLocationFromObject(obj: any): string | null {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null;
  
  console.log('Location debug - extracting from object:', obj);
  
  // Handle address objects - prioritize readable text over coordinates
  if (obj.formatted_address) {
    const result = obj.formatted_address;
    console.log('Location debug - extracted formatted_address:', result);
    return result;
  }
  
  // Handle other address fields
  if (obj.address) {
    const result = obj.address;
    console.log('Location debug - extracted address:', result);
    return result;
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
      const result = parts.join(', ');
      console.log('Location debug - extracted address components:', result);
      return result;
    }
  }
  
  // Only use coordinates as a last resort if no readable address is available
  if (obj.lat && obj.lng && typeof obj.lat === 'number' && typeof obj.lng === 'number') {
    const result = `Coordinates: ${obj.lat.toFixed(6)}, ${obj.lng.toFixed(6)}`;
    console.log('Location debug - extracted coordinates (fallback):', result);
    return result;
  }
  
  console.log('Location debug - no meaningful data found in object');
  return null;
}
// Helper function to extract location from a string
function extractLocationFromString(str: string): string | null {
  if (!str || typeof str !== 'string') return null;
  console.log('Location debug - processing string:', str);
  
  // Check if it's a URL first
  if (str.startsWith('http')) {
    const result = `Map Link: ${str}`;
    console.log('Location debug - formatted URL:', result);
    return result;
  }
  
  // Check if it's already a formatted location string (prioritize readable text)
  if (str.includes(',') && !str.includes('[object Object]') && !str.match(/^-?\d+\.\d+,\s*-?\d+\.\d+$/)) {
    console.log('Location debug - using string as-is (readable text):', str);
    return str;
  }
  
  // Only use coordinates as a last resort if no readable text is available
  if (str.match(/^-?\d+\.\d+,\s*-?\d+\.\d+$/)) {
    const result = `Coordinates: ${str}`;
    console.log('Location debug - formatted coordinates (fallback):', result);
    return result;
  }
  
  console.log('Location debug - string not recognized as location');
  return null;
}

// Helper function to parse location from gig data
function parseGigLocation(gig: any): string {
  let locationDisplay = 'Location not specified';
  
  console.log('Location debug - exactLocation:', gig.exactLocation);
  console.log('Location debug - addressJson:', gig.addressJson);
  console.log('Location debug - exactLocation type:', typeof gig.exactLocation);
  console.log('Location debug - addressJson type:', typeof gig.addressJson);
  
  // Try to extract location from addressJson first (prioritize formatted addresses)
  if (gig.addressJson) {
    console.log('Location debug - processing addressJson:', gig.addressJson);
    if (typeof gig.addressJson === 'string') {
      try {
        const parsed = JSON.parse(gig.addressJson);
        const extracted = extractLocationFromObject(parsed);
        if (extracted) {
          locationDisplay = extracted;
          console.log('Location debug - using parsed addressJson:', locationDisplay);
        }
      } catch (e) {
        console.log('Location debug - addressJson parsing failed, trying as string');
        const extracted = extractLocationFromString(gig.addressJson);
        if (extracted) {
          locationDisplay = extracted;
          console.log('Location debug - using addressJson as string:', locationDisplay);
        }
      }
    } else if (typeof gig.addressJson === 'object') {
      const extracted = extractLocationFromObject(gig.addressJson);
      if (extracted) {
        locationDisplay = extracted;
        console.log('Location debug - using addressJson object:', locationDisplay);
      }
    }
  }
  
  // If addressJson didn't work, try exactLocation
  if (locationDisplay === 'Location not specified' && gig.exactLocation) {
    console.log('Location debug - processing exactLocation:', gig.exactLocation);
    if (typeof gig.exactLocation === 'string') {
      const extracted = extractLocationFromString(gig.exactLocation);
      if (extracted) {
        locationDisplay = extracted;
        console.log('Location debug - using exactLocation string:', locationDisplay);
      }
    } else if (typeof gig.exactLocation === 'object') {
      const extracted = extractLocationFromObject(gig.exactLocation);
      if (extracted) {
        locationDisplay = extracted;
        console.log('Location debug - using exactLocation object:', locationDisplay);
      }
    }
  }

    // If still no location, try one more aggressive pass
    if (locationDisplay === 'Location not specified') {
      // Try addressJson again with more aggressive parsing
      if (gig.addressJson && typeof gig.addressJson === 'object') {
        const obj = gig.addressJson as any;
        
        // Prioritize readable address text over coordinates
        if (obj.formatted_address) {
          locationDisplay = obj.formatted_address;
        } else if (obj.address) {
          locationDisplay = obj.address;
        } else if (obj.street && obj.city) {
          locationDisplay = `${obj.street}, ${obj.city}`;
        } else {
          // Show any available string data (but not coordinates)
          for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'string' && value.trim() && 
                value !== 'null' && value !== 'undefined' && value !== '[object Object]' && 
                !value.includes('[object Object]') && !value.match(/^-?\d+\.\d+,\s*-?\d+\.\d+$/)) {
              locationDisplay = value.trim();
              break;
            }
          }
        }
        
        // Only use coordinates as absolute last resort
        if (locationDisplay === 'Location not specified' && obj.lat && obj.lng) {
          locationDisplay = `Coordinates: ${obj.lat.toFixed(6)}, ${obj.lng.toFixed(6)}`;
        }
      }
      
      // Try exactLocation one more time
      if (locationDisplay === 'Location not specified' && gig.exactLocation && typeof gig.exactLocation === 'object') {
        const obj = gig.exactLocation as any;
        
        // Prioritize readable address text over coordinates
        if (obj.formatted_address) {
          locationDisplay = obj.formatted_address;
        } else if (obj.address) {
          locationDisplay = obj.address;
        } else if (obj.street && obj.city) {
          locationDisplay = `${obj.street}, ${obj.city}`;
        }
        
        // Only use coordinates as absolute last resort
        if (locationDisplay === 'Location not specified' && obj.lat && obj.lng) {
          locationDisplay = `Coordinates: ${obj.lat.toFixed(6)}, ${obj.lng.toFixed(6)}`;
        }
      }
    }
  // Final aggressive extraction attempt
  if (locationDisplay === 'Location not specified') {
    console.log('Location debug - attempting final aggressive extraction');
    
    if (gig.addressJson && typeof gig.addressJson === 'object') {
      const obj = gig.addressJson as any;
      console.log('Location debug - final addressJson object:', obj);
      
      // Prioritize readable address text over coordinates
      if (obj.formatted_address) {
        locationDisplay = obj.formatted_address;
      } else if (obj.address) {
        locationDisplay = obj.address;
      } else if (obj.street && obj.city) {
        locationDisplay = `${obj.street}, ${obj.city}`;
      } else {
        // Show any available string data (but not coordinates)
        for (const [key, value] of Object.entries(obj)) {
          if (typeof value === 'string' && value.trim() && 
              value !== 'null' && value !== 'undefined' && value !== '[object Object]' && 
              !value.includes('[object Object]') && !value.match(/^-?\d+\.\d+,\s*-?\d+\.\d+$/)) {
            locationDisplay = value.trim();
            console.log('Location debug - final extraction from key:', key, 'value:', locationDisplay);
            break;
          }
        }
      }
      
      // Only use coordinates as absolute last resort
      if (locationDisplay === 'Location not specified' && obj.lat && obj.lng) {
        locationDisplay = `Coordinates: ${obj.lat.toFixed(6)}, ${obj.lng.toFixed(6)}`;
      }
    }
    
    if (locationDisplay === 'Location not specified' && gig.exactLocation && typeof gig.exactLocation === 'object') {
      const obj = gig.exactLocation as any;
      console.log('Location debug - final exactLocation object:', obj);
      
      // Prioritize readable address text over coordinates
      if (obj.formatted_address) {
        locationDisplay = obj.formatted_address;
      } else if (obj.address) {
        locationDisplay = obj.address;
      } else if (obj.street && obj.city) {
        locationDisplay = `${obj.street}, ${obj.city}`;
      }
      
      // Only use coordinates as absolute last resort
      if (locationDisplay === 'Location not specified' && obj.lat && obj.lng) {
        locationDisplay = `Coordinates: ${obj.lat.toFixed(6)}, ${obj.lng.toFixed(6)}`;
      }
    }
  }

    // Final validation: ensure we never return problematic values
    if (locationDisplay === '[object Object]' || locationDisplay.includes('[object Object]')) {
      locationDisplay = 'Location not specified';
    }
  // Final validation and fallback
  if (locationDisplay === '[object Object]' || locationDisplay.includes('[object Object]')) {
    console.warn('Location debug - caught problematic location value, clearing it');
    locationDisplay = 'Location not specified';
  }

    // Additional safety check - ensure we always have a meaningful location
    if (locationDisplay === 'Location not specified') {
      locationDisplay = 'Location details available';
    }

    // Use the full titleInternal as the role (no truncation)
  if (locationDisplay === 'Location not specified') {
    console.log('Location debug - no location found, using fallback');
    locationDisplay = 'Location details available';
  }

  console.log('Location debug - FINAL locationDisplay:', locationDisplay);
  return locationDisplay;
}

export async function getGigDetails({
  gigId,
  userId,
  role,
}: { 
  gigId: string; 
  userId: string; 
  role?: 'buyer' | 'worker'; 
  isViewQA?: boolean; 
}) {

  
  if (!userId) {
    console.log('🔍 DEBUG: No userId provided');
    return { error: 'User id is required', gig: {} as GigDetails, status: 404 };
  }

  try {
    console.log('🔍 DEBUG: Looking up user with Firebase UID:', userId);
    const user = await db.query.UsersTable.findFirst({
      where: eq(UsersTable.firebaseUid, userId),
      columns: {
        id: true,
      }
    });

    console.log('🔍 DEBUG: User lookup result:', { found: !!user, userId: user?.id });

    if (!user) {
      console.log('🔍 DEBUG: User not found in database');
      return { error: 'User is not found', gig: {} as GigDetails, status: 404 };
    }

    let gig;
    
    if (role === 'buyer') {
      // For buyers, only show gigs they created
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
      // For workers, show both assigned gigs and available offers
      console.log('🔍 DEBUG: Querying gig for worker with user ID:', user.id);
      gig = await db.query.GigsTable.findFirst({
        where: and(
          eq(GigsTable.id, gigId),
          or(
            // Assigned gigs
            eq(GigsTable.workerUserId, user.id),
            // Available offers (PENDING_WORKER_ACCEPTANCE status with no assigned worker)
            and(
              eq(GigsTable.statusInternal, gigStatusEnum.enumValues[0]), // PENDING_WORKER_ACCEPTANCE
              isNull(GigsTable.workerUserId)
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
      console.log('🔍 DEBUG: Gig query result for worker:', { found: !!gig, gigId: gig?.id });
    } else {
      // Fallback to original logic for other roles
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

    const worker = await db.query.GigWorkerProfilesTable.findFirst({
      where: eq(GigWorkerProfilesTable.userId, gig?.worker?.id || ""),
    })

    if (!gig) {
      console.log('🔍 DEBUG: Gig not found in database');
      return { error: 'gig not found', gig: {} as GigDetails, status: 404 };
    }

    const startDate = moment(gig.startTime);
    const endDate = moment(gig.endTime);
    const durationInHours = endDate.diff(startDate, 'hours', true);
    const estimatedEarnings = gig.totalAgreedPrice ? parseFloat(gig.totalAgreedPrice) : 0;
    const hourlyRate = gig.agreedRate ? parseFloat(gig.agreedRate) : 0;
    const isWorkerSubmittedFeedback = false;
    const isBuyerSubmittedFeedback = false;

    // Parse location using helper function
    const roleDisplay = gig.titleInternal || 'Gig Worker';

    // Calculate worker statistics if there's an assigned worker
    let workerGigs = 0;
    let workerExperience = 0;
    let isWorkerStar = false;

    if (gig.worker?.id) {
      // Get completed gigs count for the worker
      const completedGigs = await db.query.GigsTable.findMany({
        where: and(
          eq(GigsTable.workerUserId, gig.worker.id),
          eq(GigsTable.statusInternal, 'COMPLETED')
        ),
        columns: { id: true }
      });
      workerGigs = completedGigs.length;

      // Calculate experience based on completed gigs (rough estimate)
      // Assuming each gig represents some experience
      workerExperience = Math.min(workerGigs, 10); // Cap at 10 years for now

      // Determine if worker is a star (simplified logic)
      isWorkerStar = workerGigs >= 5; // Consider a worker a star if they have 5+ completed gigs
    }

    const gigDetails: GigDetails = {
      id: gig.id,
      role: roleDisplay,
      gigTitle: gig.titleInternal || 'Untitled Gig',
      buyerName: gig.buyer?.fullName || 'Unknown',
      date: startDate.format('YYYY-MM-DD'),
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
      duration: `${durationInHours} hours`,
      location: gig?.addressJson || undefined,
      workerViderUrl: worker?.videoUrl,
      workerFullBio: worker?.fullBio,
      hourlyRate: hourlyRate,
      worker: gig?.worker,
      estimatedEarnings: estimatedEarnings,
      specialInstructions: gig.notesForWorker || undefined,
      status: getMappedStatus(gig.statusInternal),
      statusInternal: gig.statusInternal,
      hiringManager: gig.buyer?.fullName || 'Manager',
      hiringManagerUsername: gig.buyer?.email || 'No email',
      isWorkerSubmittedFeedback: isWorkerSubmittedFeedback,
      isBuyerSubmittedFeedback: isBuyerSubmittedFeedback,
      // Worker-related properties
      workerName: gig.worker?.fullName || undefined,
      workerAvatarUrl: undefined, // TODO: Implement proper profile image URL retrieval from Firebase
      workerGigs: workerGigs,
      workerExperience: workerExperience,
      isWorkerStar: isWorkerStar,
    };

    return { success: true, gig: gigDetails, status: 200 };

  } catch (error: unknown) {
    console.error("Error fetching gig:", error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error fetching gig', gig: {} as GigDetails, status: 500 };
  }
}
