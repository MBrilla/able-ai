import {
  doc,
  getDoc,
  Timestamp,
  Firestore,
} from "firebase/firestore";

// Types
export type FirestoreTimestamp = Timestamp;

// Unified Chat Message Interface
export interface ChatMessage {
  id?: string; // Firestore document ID
  senderId: string; // Firebase UID of sender or 'AI'
  role: 'user' | 'worker' | 'buyer' | 'admin' | 'ai';
  text: string;
  timestamp: FirestoreTimestamp;
  isReadByReceiver: boolean; // Status for the receiver of this specific message
  moderationStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'AUTO_FLAGGED' | 'ESCALATED' | 'RESOLVED';
  isStreaming?: boolean; // True if the message was streamed (relevant for AI)
  isChat: boolean; // True for conversational messages
  contextType: 'onboarding' | 'support' | 'expand_view' | 'edit' | 'gig' | 'admin_support';
  gigId?: string; // ID of the relevant gig (if contextType is 'gig')
  sessionId?: string; // Optional ID for grouping related non-gig chats
  metadata?: Record<string, unknown>; // Optional JSON object for additional context
  // Note: senderFirebaseUid from old GigMessage is now senderId
}

// Parent Chat Document Interfaces (if needed)
// These are less critical if using subcollections directly, but can store chat-level metadata
export interface UserAIChat {
  id?: string; // Firestore document ID (chatId)
  userId: string; // The owner of this AI chat session
  contextType: 'onboarding' | 'support' | 'expand_view' | 'edit';
  createdAt: FirestoreTimestamp;
  metadata?: Record<string, unknown>; // Optional JSON object for additional context
  status?: string; // e.g., 'OPEN', 'CLOSED'
}

export interface AdminChat {
  id?: string; // Firestore document ID (chatId)
  userId: string; // The user being supported in this chat
  createdAt: FirestoreTimestamp;
  status?: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'; // Status of the admin support case
  adminUserId?: string; // The admin currently assigned
  metadata?: Record<string, unknown>; // Optional JSON object for additional context
}

export interface UserProfile {
  firebaseUid: string;
  displayName: string;
  profileImageUrl: string;
  currentActiveRole: 'GIG_WORKER' | 'BUYER';
  canBeBuyer: boolean;
  canBeGigWorker: boolean;
  createdAt: FirestoreTimestamp;
  fcmToken?: string;
  workerAverageRating?: number;
  workerTotalGigsCompleted?: number;
  workerResponseRatePercent?: number;
  workerPublicBio?: string;
  workerAvailabilitySummary?: string;
  workerQrCodeUrl?: string;
  buyerPublicCompanyName?: string;
  isOnline?: boolean;
  lastSeen?: FirestoreTimestamp;
  workerPublicSkillsSummary?: string;
}

export interface Notification {
  isRead: boolean;
}

export type GigStatus = 
  | 'PENDING_WORKER_ACCEPTANCE'
  | 'ACCEPTED'
  | 'DECLINED_BY_WORKER'
  | 'IN_PROGRESS'
  | 'PENDING_COMPLETION'
  | 'CANCELLED_BY_BUYER'
  | 'COMPLETED';

export interface Gig {
  title: string;
  publicDescription: string;
  roleNeeded: string;
  status: GigStatus;
  publicLocation: string;
  startTime: FirestoreTimestamp;
  endTime: FirestoreTimestamp;
  publicRateDisplay: string;
  buyerFirebaseUid: string;
  buyerDisplayName: string;
  buyerProfileImageUrl: string;
  requiredSkillsKeywords: string[];
  createdAt: FirestoreTimestamp;
  workerFirebaseUid?: string;
  workerDisplayName?: string;
  workerProfileImageUrl?: string;
}

export type GigOfferStatus = 'SENT' | 'ACCEPTED' | 'DECLINED';

export interface GigOffer {
  gigTitleOrRef: string;
  buyerFirebaseUid: string;
  workerFirebaseUid: string;
  offeredRate: string;
  status: GigOfferStatus;
  createdAt: FirestoreTimestamp;
  expiresAt: FirestoreTimestamp;
}

export interface PublicReview {
  // Read-only collection
  id: string;
  // Add other fields as needed
}

export interface BadgeDefinition {
  // Read-only collection
  id: string;
  // Add other fields as needed
}

// User Functions
export async function getUserData(db: Firestore,userId: string): Promise<UserProfile> {
  const userDoc = doc(db, "users", userId);
  const userSnapshot = await getDoc(userDoc);
  if (userSnapshot.exists()) {
    const userData = userSnapshot.data() as UserProfile;
    return userData;
  } else {
    throw new Error("User not found");
  }
}