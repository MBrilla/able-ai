"use server";

import PublicWorkerProfile, {
  Availability,
  SemanticProfile,
} from "@/app/types/workerProfileTypes";
import { db } from "@/lib/drizzle/db";
import {
  BadgeDefinitionsTable,
  EquipmentTable,
  GigWorkerProfilesTable,
  QualificationsTable,
  ReviewsTable,
  SkillsTable,
  UserBadgesLinkTable,
  UsersTable,
  WorkerAvailabilityTable,
} from "@/lib/drizzle/schema";
import { ERROR_CODES } from "@/lib/responses/errors";
import { isUserAuthenticated } from "@/lib/user.server";
import { and, eq } from "drizzle-orm";

export const getPublicWorkerProfileAction = async (workerId: string) => {
  if (!workerId) throw "Worker ID is required";

  const workerProfile = await db.query.GigWorkerProfilesTable.findFirst({
    where: eq(GigWorkerProfilesTable.id, workerId),
  });

  const data = await getGigWorkerProfile(workerProfile);

  return data;
};

export const getPrivateWorkerProfileAction = async (token: string) => {
  if (!token) {
    throw new Error("User ID is required to fetch buyer profile");
  }

  const { uid } = await isUserAuthenticated(token);
  if (!uid) throw ERROR_CODES.UNAUTHORIZED;

  const user = await db.query.UsersTable.findFirst({
    where: eq(UsersTable.firebaseUid, uid),
  });

  if (!user) {
    throw new Error("User not found");
  }

  const workerProfile = await db.query.GigWorkerProfilesTable.findFirst({
    where: eq(GigWorkerProfilesTable.userId, user.id),
  });

  const data = await getGigWorkerProfile(workerProfile);

  return data;
};
export const getGigWorkerProfile = async (
  workerProfile: typeof GigWorkerProfilesTable.$inferSelect | undefined
): Promise<{ success: true; data: PublicWorkerProfile }> => {
  try {
    if (!workerProfile) throw "Getting worker profile error";

    const skills = await db.query.SkillsTable.findMany({
      where: eq(SkillsTable.workerProfileId, workerProfile.id),
    });

    const equipment = await db.query.EquipmentTable.findMany({
      where: eq(EquipmentTable.workerProfileId, workerProfile.id),
    });

    const qualifications = await db.query.QualificationsTable.findMany({
      where: eq(QualificationsTable.workerProfileId, workerProfile.id),
    });

    const awards = await db.query.UserBadgesLinkTable.findMany({
      where: eq(UserBadgesLinkTable.userId, workerProfile.userId),
    });

    const reviews = await db.query.ReviewsTable.findMany({
      where: and(
        eq(ReviewsTable.targetUserId, workerProfile.userId),
        eq(ReviewsTable.type, "INTERNAL_PLATFORM")
      ),
    });

    const recommendations = await db.query.ReviewsTable.findMany({
      where: and(
        eq(ReviewsTable.targetUserId, workerProfile.userId),
        eq(ReviewsTable.type, "EXTERNAL_REQUESTED")
      ),
    });

    const totalReviews = reviews?.length;

    const positiveReviews = reviews?.filter((item) => item.rating === 1).length;

    const averageRating =
      totalReviews > 0 ? (positiveReviews / totalReviews) * 100 : 0;

    const data = {
      ...workerProfile,
      fullBio: workerProfile?.fullBio ?? undefined,
      location: workerProfile?.location ?? undefined,
      privateNotes: workerProfile?.privateNotes ?? undefined,
      responseRateInternal: workerProfile?.responseRateInternal ?? undefined,
      videoUrl: workerProfile?.videoUrl ?? undefined,
      availabilityJson: undefined, // Set to undefined since we now use worker_availability table
      semanticProfileJson:
        workerProfile?.semanticProfileJson as SemanticProfile,
      averageRating,
      awards,
      equipment,
      skills,
      reviews,
      recommendations,
      qualifications,
    };

    return { success: true, data };
  } catch (error) {
    console.error("Error fetching buyer profile:", error);
    throw error;
  }
};

export const getSkillDetailsWorker = async (id: string) => {
  try {
    const skill = await db.query.SkillsTable.findFirst({
      where: eq(SkillsTable.id, id),
    });

    if (!skill) throw "Skill not found";

    const workerProfile = await db.query.GigWorkerProfilesTable.findFirst({
      where: eq(GigWorkerProfilesTable.id, skill?.workerProfileId),
    });

    const user = await db.query.UsersTable.findFirst({
      where: eq(UsersTable.id, workerProfile?.userId || ""),
    });

    const badges = await db
      .select({
        id: UserBadgesLinkTable.id,
        awardedAt: UserBadgesLinkTable.awardedAt,
        awardedBySystem: UserBadgesLinkTable.awardedBySystem,
        notes: UserBadgesLinkTable.notes,
        badge: {
          id: BadgeDefinitionsTable.id,
          name: BadgeDefinitionsTable.name,
          description: BadgeDefinitionsTable.description,
          icon: BadgeDefinitionsTable.iconUrlOrLucideName,
          type: BadgeDefinitionsTable.type,
        },
      })
      .from(UserBadgesLinkTable)
      .innerJoin(
        BadgeDefinitionsTable,
        eq(UserBadgesLinkTable.badgeId, BadgeDefinitionsTable.id)
      )
      .where(eq(UserBadgesLinkTable.userId, workerProfile?.userId || ""));

    const qualifications = await db.query.QualificationsTable.findMany({
      where: eq(QualificationsTable.workerProfileId, workerProfile?.id || ""),
    });

    const reviews = await db.query.ReviewsTable.findMany({
      where: and(
        eq(ReviewsTable.targetUserId, workerProfile?.userId || ""),
        eq(ReviewsTable.type, "INTERNAL_PLATFORM")
      ),
    });

    const recommendations = await db.query.ReviewsTable.findMany({
      where: and(
        eq(ReviewsTable.targetUserId, workerProfile?.userId || ""),
        eq(ReviewsTable.type, "EXTERNAL_REQUESTED")
      ),
    });

    const reviewsData = await Promise.all(
      reviews.map(async (review) => {
        const author = await db.query.UsersTable.findFirst({
          where: eq(UsersTable.id, review.authorUserId),
        });

        return {
          name: author?.fullName || "Unknown",
          date: review.createdAt,
          text: review.comment,
        };
      })
    );

    const recommendationsData = await Promise.all(
      recommendations.map(async (review) => {
        const author = await db.query.UsersTable.findFirst({
          where: eq(UsersTable.id, review.authorUserId),
        });

        return {
          name: author?.fullName || "Unknown",
          date: review.createdAt,
          text: review.comment,
        };
      })
    );

    const skillProfile = {
      profileId: workerProfile?.id,
      name: user?.fullName,
      title: skill?.name,
      hashtags: Array.isArray(workerProfile?.hashtags)
        ? workerProfile.hashtags.join(" ")
        : "",
      customerReviewsText: workerProfile?.fullBio,
      ableGigs: skill?.ableGigs,
      experienceYears: skill?.experienceYears,
      Eph: skill?.agreedRate,
      location: workerProfile?.location || "",
      address: workerProfile?.address || "",
      latitude: workerProfile?.latitude ?? 0,
      longitude: workerProfile?.longitude ?? 0,
      videoUrl: workerProfile?.videoUrl || "",
      statistics: {
        reviews: reviews?.length,
        paymentsCollected: "£4899",
        tipsReceived: "£767",
      },
      supportingImages: skill.images ?? [],
      badges,
      qualifications,
      buyerReviews: reviewsData,
      recommendations: recommendationsData,
    };

    return { success: true, data: skillProfile };
  } catch (error) {
    console.error(`Error fetching skill: ${error}`);
    return { success: false, data: null, error };
  }
};

export const createSkillWorker = async (
  token: string,
  {
    name,
    experienceYears,
    agreedRate,
    skillVideoUrl,
    adminTags = [],
    images = [],
  }: {
    name: string;
    experienceYears: number;
    agreedRate: number | string;
    skillVideoUrl?: string;
    adminTags?: string[];
    images?: string[];
  }
) => {
  try {
    if (!token) throw new Error("Token is required");
    const { uid } = await isUserAuthenticated(token);
    if (!uid) throw new Error("Unauthorized");

    const user = await db.query.UsersTable.findFirst({
      where: eq(UsersTable.firebaseUid, uid),
    });

    if (!user) {
      throw new Error("User not found");
    }

    const workerProfile = await db.query.GigWorkerProfilesTable.findFirst({
      where: eq(GigWorkerProfilesTable.userId, user.id),
    });

    if (!workerProfile) {
      throw new Error("Worker profile not found");
    }

    const [newSkill] = await db
      .insert(SkillsTable)
      .values({
        workerProfileId: workerProfile.id,
        name,
        experienceMonths: 0,
        experienceYears,
        agreedRate: String(agreedRate),
        skillVideoUrl: skillVideoUrl || null,
        adminTags: adminTags.length > 0 ? adminTags : null,
        ableGigs: null,
        images,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return { success: true, data: newSkill };
  } catch (error) {
    console.error("Error creating skill:", error);
    return { success: false, data: null, error };
  }
};

export const updateVideoUrlProfileAction = async (
  videoUrl: string,
  token?: string | undefined
) => {
  try {
    if (!token) {
      throw new Error("User ID is required to fetch buyer profile");
    }

    const { uid } = await isUserAuthenticated(token);
    if (!uid) throw ERROR_CODES.UNAUTHORIZED;

    const user = await db.query.UsersTable.findFirst({
      where: eq(UsersTable.firebaseUid, uid),
    });

    if (!user) throw "User not found";

    await db
      .update(GigWorkerProfilesTable)
      .set({
        videoUrl: videoUrl,
        updatedAt: new Date(),
      })
      .where(eq(GigWorkerProfilesTable.userId, user?.id));

    return { success: true, data: "Url video updated successfully" };
  } catch (error) {
    console.log("Error saving video url", error);
    return { success: false, data: "Url video updated successfully", error };
  }
};

export const updateProfileImageAction = async (
  token: string,
  id: string,
  newImage: string
) => {
  try {
    if (!token) throw new Error("User ID is required");

    const { uid } = await isUserAuthenticated(token);
    if (!uid) throw ERROR_CODES.UNAUTHORIZED;

    const skill = await db.query.SkillsTable.findFirst({
      where: eq(SkillsTable.id, id),
      columns: { images: true },
    });

    const updatedImages = [...(skill?.images ?? []), newImage];

    await db
      .update(SkillsTable)
      .set({
        images: updatedImages,
        updatedAt: new Date(),
      })
      .where(eq(SkillsTable.id, id));

    return { success: true, data: updatedImages };
  } catch (error) {
    console.error("Error adding profile image:", error);
    return { success: false, data: null, error };
  }
};

export const deleteImageAction = async (
  token: string,
  skillId: string,
  imageUrl: string
) => {
  try {
    if (!token) throw new Error("User ID is required");

    const { uid } = await isUserAuthenticated(token);
    if (!uid) throw ERROR_CODES.UNAUTHORIZED;

    const skill = await db.query.SkillsTable.findFirst({
      where: eq(SkillsTable.id, skillId),
      columns: { images: true },
    });

    if (!skill) throw "Skill not found";

    const updatedImages = skill?.images?.filter((img) => img !== imageUrl);

    await db
      .update(SkillsTable)
      .set({
        images: updatedImages,
        updatedAt: new Date(),
      })
      .where(eq(SkillsTable.id, skillId));

    return { success: true, data: updatedImages };
  } catch (error) {
    console.error("Error deleting image:", error);
    return { success: false, data: null, error };
  }
}

export const saveWorkerProfileFromOnboardingAction = async (
  profileData: {
    about: string;
    experience: string;
    skills: string;
    hourlyRate: string;
    location: any;
    availability: { 
      days: string[]; 
      startTime: string; 
      endTime: string; 
      frequency?: string;
      ends?: string;
      startDate?: string; // Add this field
      endDate?: string;
      occurrences?: number;
    } | string;
    videoIntro: File | string;
  },
  token: string
) => {
  try {
    if (!token) {
      throw new Error("Token is required");
    }

    const { uid } = await isUserAuthenticated(token);
    if (!uid) throw ERROR_CODES.UNAUTHORIZED;

    const user = await db.query.UsersTable.findFirst({
      where: eq(UsersTable.firebaseUid, uid),
    });

    if (!user) throw "User not found";

    // Check if worker profile already exists
    const workerProfile = await db.query.GigWorkerProfilesTable.findFirst({
      where: eq(GigWorkerProfilesTable.userId, user.id),
    });

    // Prepare profile data
    const profileUpdateData = {
      fullBio: `${profileData.about}\n\n${profileData.experience}`,
      location: typeof profileData.location === 'string' ? profileData.location : profileData.location?.formatted_address || profileData.location?.name || '',
      latitude: typeof profileData.location === 'object' && profileData.location?.lat ? profileData.location.lat : null,
      longitude: typeof profileData.location === 'object' && profileData.location?.lng ? profileData.location.lng : null,
      // Remove availabilityJson - we'll save to worker_availability table instead
      videoUrl: typeof profileData.videoIntro === 'string' ? profileData.videoIntro : profileData.videoIntro?.name || '',
      semanticProfileJson: {
        tags: profileData.skills.split(',').map(skill => skill.trim()).filter(Boolean)
      },
      privateNotes: `Hourly Rate: ${profileData.hourlyRate}\n`,
      updatedAt: new Date(),
    };

    if (workerProfile) {
      // Update existing profile
      await db
        .update(GigWorkerProfilesTable)
        .set(profileUpdateData)
        .where(eq(GigWorkerProfilesTable.userId, user.id));
    } else {
      // Create new profile
      await db.insert(GigWorkerProfilesTable).values({
        userId: user.id,
        ...profileUpdateData,
        createdAt: new Date(),
      });
    }

    // Save availability data to worker_availability table
    if (profileData.availability && typeof profileData.availability === 'object') {
      // Create proper timestamps for the required fields
      const createTimestamp = (timeStr: string) => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        const date = new Date();
        date.setHours(hours, minutes, 0, 0);
        return date;
      };

      await db.insert(WorkerAvailabilityTable).values({
        userId: user.id,
        days: profileData.availability.days || [],
        frequency: (profileData.availability.frequency || 'never') as "never" | "weekly" | "biweekly" | "monthly",
        startDate: profileData.availability.startDate,
        startTimeStr: profileData.availability.startTime,
        endTimeStr: profileData.availability.endTime,
        // Convert time strings to timestamp for the required fields
        startTime: createTimestamp(profileData.availability.startTime),
        endTime: createTimestamp(profileData.availability.endTime),
        ends: (profileData.availability.ends || 'never') as "never" | "on_date" | "after_occurrences",
        occurrences: profileData.availability.occurrences,
        endDate: profileData.availability.endDate || null,
        notes: `Onboarding availability - Hourly Rate: ${profileData.hourlyRate}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // Automatically add job title as a skill from the "about" field
    if (profileData.about && profileData.about.trim()) {
      // Extract the first line as the job title (e.g., "restauranteur")
      const jobTitle = profileData.about.split('\n')[0].trim();
      
      if (jobTitle && jobTitle.length > 0) {
        try {
          // Parse experience from profileData.experience
          let experienceMonths = 0;
          let experienceYears = 0;
          
          if (profileData.experience && profileData.experience.trim()) {
            const experienceText = profileData.experience.toLowerCase();
            
            // Extract years (e.g., "5 years", "2+ years", "10+ years experience", "5y", "5yr")
            const yearMatches = experienceText.match(/(\d+)(?:\+)?\s*(?:years?|y|yr)/);
            if (yearMatches) {
              experienceYears = parseInt(yearMatches[1]);
            }
            
            // Extract months (e.g., "6 months", "3 months experience", "6m", "6mo")
            const monthMatches = experienceText.match(/(\d+)\s*(?:months?|m|mo)/);
            if (monthMatches) {
              experienceMonths = parseInt(monthMatches[1]);
            }
            
            // Handle decimal years (e.g., "2.5 years", "1.5 years")
            const decimalYearMatches = experienceText.match(/(\d+\.\d+)\s*(?:years?|y|yr)/);
            if (decimalYearMatches) {
              experienceYears = parseFloat(decimalYearMatches[1]);
            }
            
            // If only months mentioned, convert to years (e.g., "18 months" = 1.5 years)
            if (experienceMonths > 0 && experienceYears === 0) {
              experienceYears = experienceMonths / 12;
            }
            
            // If only years mentioned, set months to 0
            if (experienceYears > 0 && experienceMonths === 0) {
              experienceMonths = 0;
            }
            
            // Handle "over X years" or "X+ years" - add 1 year for "+" or "over"
            if (experienceText.includes('+') || experienceText.includes('over')) {
              experienceYears += 1;
            }
          }
          
          // Get the worker profile ID for the skills table
          const currentWorkerProfile = await db.query.GigWorkerProfilesTable.findFirst({
            where: eq(GigWorkerProfilesTable.userId, user.id),
          });

          if (currentWorkerProfile) {
            // Add the job title as a skill
            const [newSkill] = await db
              .insert(SkillsTable)
              .values({
                workerProfileId: currentWorkerProfile.id,
                name: jobTitle,
                experienceMonths: experienceMonths,
                experienceYears: experienceYears,
                agreedRate: String(profileData.hourlyRate || "0"),
                skillVideoUrl: null,
                adminTags: null,
                ableGigs: null,
                images: [],
                createdAt: new Date(),
                updatedAt: new Date(),
              })
              .returning();
            
            console.log(`Automatically added job title "${jobTitle}" as a skill for user ${user.id} with ${experienceYears} years and ${experienceMonths} months experience`);
          }
        } catch (error) {
          console.warn(`Failed to automatically add job title as skill:`, error);
          // Don't fail the entire profile save if skill creation fails
        }
      }
    }

    // Update user table to mark as gig worker
    await db
      .update(UsersTable)
      .set({
        isGigWorker: true,
        lastRoleUsed: "GIG_WORKER",
        updatedAt: new Date(),
      })
      .where(eq(UsersTable.id, user.id));

    return { success: true, data: "Worker profile saved successfully" };
  } catch (error) {
    console.error("Error saving worker profile:", error);
    return { success: false, data: null, error: error instanceof Error ? error.message : "Unknown error" };
  }
};

export const addJobTitleAsSkillAction = async (
  token: string,
  jobTitle: string,
  hourlyRate?: string,
  experience?: string
) => {
  try {
    if (!token) {
      throw new Error("Token is required");
    }

    const { uid } = await isUserAuthenticated(token);
    if (!uid) throw ERROR_CODES.UNAUTHORIZED;

    const user = await db.query.UsersTable.findFirst({
      where: eq(UsersTable.firebaseUid, uid),
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Get the worker profile ID
    const currentWorkerProfile = await db.query.GigWorkerProfilesTable.findFirst({
      where: eq(GigWorkerProfilesTable.userId, user.id),
    });

    if (!currentWorkerProfile) {
      throw new Error("Worker profile not found. Please complete your profile first.");
    }

    // Check if skill already exists
    const existingSkill = await db.query.SkillsTable.findFirst({
      where: and(
        eq(SkillsTable.workerProfileId, currentWorkerProfile.id),
        eq(SkillsTable.name, jobTitle)
      ),
    });

    if (existingSkill) {
      return { success: true, data: "Skill already exists", skill: existingSkill };
    }

    // Parse experience if provided
    let experienceMonths = 0;
    let experienceYears = 0;
    
    if (experience && experience.trim()) {
      const experienceText = experience.toLowerCase();
      
      // Extract years (e.g., "5 years", "2+ years", "10+ years experience", "5y", "5yr")
      const yearMatches = experienceText.match(/(\d+)(?:\+)?\s*(?:years?|y|yr)/);
      if (yearMatches) {
        experienceYears = parseInt(yearMatches[1]);
      }
      
      // Extract months (e.g., "6 months", "3 months experience", "6m", "6mo")
      const monthMatches = experienceText.match(/(\d+)\s*(?:months?|m|mo)/);
      if (monthMatches) {
        experienceMonths = parseInt(monthMatches[1]);
      }
      
      // Handle decimal years (e.g., "2.5 years", "1.5 years")
      const decimalYearMatches = experienceText.match(/(\d+\.\d+)\s*(?:years?|y|yr)/);
      if (decimalYearMatches) {
        experienceYears = parseFloat(decimalYearMatches[1]);
      }
      
      // If only months mentioned, convert to years (e.g., "18 months" = 1.5 years)
      if (experienceMonths > 0 && experienceYears === 0) {
        experienceYears = experienceMonths / 12;
      }
      
      // If only years mentioned, set months to 0
      if (experienceYears > 0 && experienceMonths === 0) {
        experienceMonths = 0;
      }
      
      // Handle "over X years" or "X+ years" - add 1 year for "+" or "over"
      if (experienceText.includes('+') || experienceText.includes('over')) {
        experienceYears += 1;
      }
    }

    // Add the job title as a skill
    const [newSkill] = await db
      .insert(SkillsTable)
      .values({
        workerProfileId: currentWorkerProfile.id,
        name: jobTitle,
        experienceMonths: experienceMonths,
        experienceYears: experienceYears,
        agreedRate: String(hourlyRate || "0"),
        skillVideoUrl: null,
        adminTags: null,
        ableGigs: null,
        images: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    console.log(`Added job title "${jobTitle}" as a skill for user ${user.id} with ${experienceYears} years and ${experienceMonths} months experience`);
    return { success: true, data: "Skill added successfully", skill: newSkill };
  } catch (error) {
    console.error("Error adding job title as skill:", error);
    return { success: false, data: null, error: error instanceof Error ? error.message : "Unknown error" };
  }
};

export const updateAboutTextAction = async (
  token: string,
  aboutText: string
) => {
  try {
    if (!token) {
      throw new Error("Token is required");
    }

    const { uid } = await isUserAuthenticated(token);
    if (!uid) throw ERROR_CODES.UNAUTHORIZED;

    const user = await db.query.UsersTable.findFirst({
      where: eq(UsersTable.firebaseUid, uid),
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Get the worker profile
    const currentWorkerProfile = await db.query.GigWorkerProfilesTable.findFirst({
      where: eq(GigWorkerProfilesTable.userId, user.id),
    });

    if (!currentWorkerProfile) {
      throw new Error("Worker profile not found. Please complete your profile first.");
    }

    // Update the about text
    await db
      .update(GigWorkerProfilesTable)
      .set({
        fullBio: aboutText,
        updatedAt: new Date(),
      })
      .where(eq(GigWorkerProfilesTable.userId, user.id));

    // If the about text contains a job title, update the corresponding skill
    if (aboutText && aboutText.trim()) {
      const jobTitle = aboutText.split('\n')[0].trim();
      
      if (jobTitle && jobTitle.length > 0) {
        try {
          // Check if skill already exists
          const existingSkill = await db.query.SkillsTable.findFirst({
            where: and(
              eq(SkillsTable.workerProfileId, currentWorkerProfile.id),
              eq(SkillsTable.name, jobTitle)
            ),
          });

          if (existingSkill) {
            // Update existing skill with new about text
            await db
              .update(SkillsTable)
              .set({
                updatedAt: new Date(),
              })
              .where(eq(SkillsTable.id, existingSkill.id));
          } else {
            // Create new skill from the updated about text
            const [newSkill] = await db
              .insert(SkillsTable)
              .values({
                workerProfileId: currentWorkerProfile.id,
                name: jobTitle,
                experienceMonths: 0,
                experienceYears: 0,
                agreedRate: "0", // Default rate, can be updated later
                skillVideoUrl: null,
                adminTags: null,
                ableGigs: null,
                images: [],
                createdAt: new Date(),
                updatedAt: new Date(),
              })
              .returning();
            
            console.log(`Automatically added job title "${jobTitle}" as a skill after about text update for user ${user.id}`);
          }
        } catch (error) {
          console.warn(`Failed to update skill after about text change:`, error);
          // Don't fail the about text update if skill update fails
        }
      }
    }

    console.log(`Updated about text for user ${user.id}`);
    return { success: true, data: "About text updated successfully" };
  } catch (error) {
    console.error("Error updating about text:", error);
    return { success: false, data: null, error: error instanceof Error ? error.message : "Unknown error" };
  }
};
