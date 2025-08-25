"use server";

import { db } from "@/lib/drizzle/db";
import { and, eq, gte, lte, sql, desc, asc, isNull, or } from "drizzle-orm";
import { 
  GigWorkerProfilesTable, 
  UsersTable, 
  SkillsTable,
  WorkerAvailabilityTable 
} from "@/lib/drizzle/schema";
import { extractCoordinates, isWithinDistance, Coordinates } from "@/lib/utils/distanceUtils";

export interface MatchingWorker {
  id: string;
  userId: string;
  fullBio: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  responseRateInternal: number | null;
  videoUrl: string | null;
  distance: number;
  skills: Array<{
    id: string;
    name: string;
    experienceMonths: number;
    experienceYears: number;
    agreedRate: number;
  }>;
  user: {
    fullName: string;
    email: string;
  };
}

export interface FindMatchingWorkersParams {
  gigLocation: string | { lat?: number; lng?: number; formatted_address?: string; address?: string; [key: string]: any };
  gigDate: string; // YYYY-MM-DD
  gigTime?: string; // HH:mm or time range
  maxDistance?: number; // in kilometers, default 30
  minHourlyRate?: number;
  maxHourlyRate?: number;
  requiredSkills?: string[]; // Array of skill names
  limit?: number; // Maximum number of workers to return
}

export async function findMatchingWorkers(params: FindMatchingWorkersParams): Promise<{
  success: boolean;
  workers: MatchingWorker[];
  error?: string;
}> {
  try {
    const {
      gigLocation,
      gigDate,
      gigTime,
      maxDistance = 30,
      minHourlyRate,
      maxHourlyRate,
      requiredSkills = [],
      limit = 20
    } = params;

    // Extract coordinates from gig location
    const gigCoords = extractCoordinates(gigLocation);
    if (!gigCoords) {
      return {
        success: false,
        workers: [],
        error: "Invalid gig location coordinates"
      };
    }

    // Parse gig date and time
    const gigDateTime = new Date(gigDate);
    if (isNaN(gigDateTime.getTime())) {
      return {
        success: false,
        workers: [],
        error: "Invalid gig date"
      };
    }

    // Get day of week (0 = Sunday, 1 = Monday, etc.)
    const dayOfWeek = gigDateTime.getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dayOfWeek];

    // Parse time if provided
    let startHour = 9; // Default to 9 AM
    let endHour = 17; // Default to 5 PM
    
    if (gigTime) {
      const timeMatch = gigTime.match(/^(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})$/);
      if (timeMatch) {
        startHour = parseInt(timeMatch[1], 10);
        endHour = parseInt(timeMatch[3], 10);
      } else {
        const singleTimeMatch = gigTime.match(/^(\d{1,2}):(\d{2})$/);
        if (singleTimeMatch) {
          startHour = parseInt(singleTimeMatch[1], 10);
          endHour = startHour + 2; // Default 2-hour duration
        }
      }
    }

    // Add availability join - this is the key fix
    // We need to find workers who are available on the specific day and time
    // First, let's get workers with explicit availability records
    let availableWorkerIds = new Set<string>();
    
    try {
      // Get workers with availability records
      const availabilityRecords = await db
        .select({
          userId: WorkerAvailabilityTable.userId,
        })
        .from(WorkerAvailabilityTable)
        .where(
          or(
            // Option 1: Recurring pattern with days array containing the day
            sql`${WorkerAvailabilityTable.days} @> ${JSON.stringify([dayName])}`,
            // Option 2: Individual time slot that overlaps with the gig time
            and(
              sql`${WorkerAvailabilityTable.startTime} IS NOT NULL`,
              sql`${WorkerAvailabilityTable.endTime} IS NOT NULL`,
              // The availability slot should start before the gig ends and end after the gig starts
              sql`${WorkerAvailabilityTable.startTime} <= ${gigDateTime.toISOString().split('T')[0]}T${endHour.toString().padStart(2, '0')}:00:00`,
              sql`${WorkerAvailabilityTable.endTime} >= ${gigDateTime.toISOString().split('T')[0]}T${startHour.toString().padStart(2, '0')}:00:00`
            )
          )
        );
      
      availableWorkerIds = new Set(availabilityRecords.map(record => record.userId));
    } catch (error) {
      console.warn("Error fetching availability records:", error);
      // Continue without availability filtering if there's an error
    }

    // Now build the main query
    let query = db
      .select({
        id: GigWorkerProfilesTable.id,
        userId: GigWorkerProfilesTable.userId,
        fullBio: GigWorkerProfilesTable.fullBio,
        location: GigWorkerProfilesTable.location,
        latitude: GigWorkerProfilesTable.latitude,
        longitude: GigWorkerProfilesTable.longitude,
        responseRateInternal: GigWorkerProfilesTable.responseRateInternal,
        videoUrl: GigWorkerProfilesTable.videoUrl,
        availabilityJson: GigWorkerProfilesTable.availabilityJson,
      })
      .from(GigWorkerProfilesTable)
      .innerJoin(UsersTable, eq(GigWorkerProfilesTable.userId, UsersTable.id))
      .where(
        and(
          // Only include workers with coordinates
          sql`${GigWorkerProfilesTable.latitude} IS NOT NULL`,
          sql`${GigWorkerProfilesTable.longitude} IS NOT NULL`,
          // Only include workers who have availability (either in WorkerAvailabilityTable or availabilityJson)
          or(
            sql`${GigWorkerProfilesTable.userId} = ANY(${Array.from(availableWorkerIds)})`,
            and(
              sql`${GigWorkerProfilesTable.availabilityJson} IS NOT NULL`,
              sql`${GigWorkerProfilesTable.availabilityJson} != '{}'`,
              sql`${GigWorkerProfilesTable.availabilityJson} != 'null'`
            )
          )
        )
      );

    // Add skills join if required skills are specified
    if (requiredSkills.length > 0) {
      query = query.innerJoin(
        SkillsTable,
        and(
          eq(SkillsTable.workerProfileId, GigWorkerProfilesTable.id),
          sql`${SkillsTable.name} = ANY(${requiredSkills})`
        )
      );
    }

    // Execute the query
    const workerProfiles = await query.limit(limit * 2); // Get more to account for distance filtering

    console.log(`Found ${workerProfiles.length} workers with basic criteria (location + availability)`);

    // Filter workers by distance and build the final result
    const matchingWorkers: MatchingWorker[] = [];

    for (const profile of workerProfiles) {
      if (!profile.latitude || !profile.longitude) continue;

      const workerCoords: Coordinates = {
        lat: parseFloat(profile.latitude.toString()),
        lng: parseFloat(profile.longitude.toString())
      };

      const distance = calculateDistance(gigCoords, workerCoords);
      
      // Only include workers within the specified distance
      if (distance <= maxDistance) {
        // Get skills for this worker
        const skills = await db
          .select({
            id: SkillsTable.id,
            name: SkillsTable.name,
            experienceMonths: SkillsTable.experienceMonths,
            experienceYears: SkillsTable.experienceYears,
            agreedRate: SkillsTable.agreedRate,
          })
          .from(SkillsTable)
          .where(eq(SkillsTable.workerProfileId, profile.id));

        // Filter by hourly rate if specified
        if (minHourlyRate && skills.length > 0) {
          const minRate = Math.min(...skills.map(s => parseFloat(s.agreedRate.toString())));
          if (minRate < minHourlyRate) continue;
        }
        
        if (maxHourlyRate && skills.length > 0) {
          const maxRate = Math.max(...skills.map(s => parseFloat(s.agreedRate.toString())));
          if (maxRate > maxHourlyRate) continue;
        }

        // Check availabilityJson if the worker doesn't have explicit availability records
        if (!availableWorkerIds.has(profile.userId) && profile.availabilityJson) {
          const availability = profile.availabilityJson as any;
          
          // Use the helper function to check availability
          if (!isWorkerAvailableForGig(availability, gigDateTime, startHour, endHour, dayName)) {
            continue; // Skip this worker if they're not available
          }
        }

        // Get user details
        const user = await db
          .select({
            fullName: UsersTable.fullName,
            email: UsersTable.email,
          })
          .from(UsersTable)
          .where(eq(UsersTable.id, profile.userId))
          .limit(1);

        if (user.length > 0) {
          matchingWorkers.push({
            id: profile.id,
            userId: profile.userId,
            fullBio: profile.fullBio || '',
            location: profile.location || '',
            latitude: profile.latitude ? parseFloat(profile.latitude.toString()) : null,
            longitude: profile.longitude ? parseFloat(profile.longitude.toString()) : null,
            responseRateInternal: profile.responseRateInternal ? parseFloat(profile.responseRateInternal.toString()) : null,
            videoUrl: profile.videoUrl,
            distance,
            skills: skills.map(skill => ({
              ...skill,
              agreedRate: parseFloat(skill.agreedRate.toString())
            })),
            user: user[0]
          });
        }
      }
    }

    console.log(`After distance and availability filtering: ${matchingWorkers.length} workers`);

    // Sort by distance and response rate
    matchingWorkers.sort((a, b) => {
      // Primary sort: distance
      if (a.distance !== b.distance) {
        return a.distance - b.distance;
      }
      // Secondary sort: response rate (higher is better)
      if (a.responseRateInternal !== null && b.responseRateInternal !== null) {
        return b.responseRateInternal - a.responseRateInternal;
      }
      return 0;
    });

    // Limit the final results
    const finalWorkers = matchingWorkers.slice(0, limit);

    return {
      success: true,
      workers: finalWorkers
    };

  } catch (error) {
    console.error("Error finding matching workers:", error);
    return {
      success: false,
      workers: [],
      error: error instanceof Error ? error.message : "Unknown error occurred"
    };
  }
}

// Helper function to calculate distance (duplicated here for the query)
function calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(coord2.lat - coord1.lat);
  const dLng = toRadians(coord2.lng - coord1.lng);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(coord1.lat)) * Math.cos(toRadians(coord2.lat)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 100) / 100;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

// Helper function to check if a worker is available for a specific gig time
function isWorkerAvailableForGig(
  availability: any, 
  gigDate: Date, 
  startHour: number, 
  endHour: number,
  dayName: string
): boolean {
  // Check if the worker has availability for this day
  if (availability.days && Array.isArray(availability.days)) {
    const hasDayAvailability = availability.days.some((day: string) => 
      day.toLowerCase() === dayName
    );
    
    if (!hasDayAvailability) {
      return false; // Worker is not available on this day
    }
    
    // Check if the time overlaps with their availability
    if (availability.startTimeStr && availability.endTimeStr) {
      const workerStartHour = parseInt(availability.startTimeStr.split(':')[0], 10);
      const workerEndHour = parseInt(availability.endTimeStr.split(':')[0], 10);
      
      // Check if the gig time overlaps with worker availability
      // The gig should start after the worker's start time and end before the worker's end time
      return startHour >= workerStartHour && endHour <= workerEndHour;
    }
  }
  
  // If no specific time constraints, assume they're available for the day
  return true;
}
