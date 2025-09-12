"use client";

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth, User } from '@/context/AuthContext';
import { WorkerUser } from '@/actions/user/get-worker-user';
import { Loader2 } from 'lucide-react';
import styles from './GigDetailsPage.module.css';
import GigDetailsComponent from '@/app/components/gigs/GigDetails';
import type GigDetails from '@/app/types/GigDetailsTypes'; // Adjust import path as needed
import { getGigDetails } from '@/actions/gigs/get-gig-details';
import { getWorkerOffers } from '@/actions/gigs/get-worker-offers';

async function fetchWorkerGigDetails(user: User | WorkerUser, gigId: string): Promise<GigDetails | null> {
  console.log("Fetching gig details for worker:", user?.uid, "gig:", gigId);

  const isViewQA = false;
  
  // For WorkerUser, use the database user ID directly
  // For regular User, use the Firebase UID
  let userId: string;
  let isDatabaseUserId = false;
  
  if ('id' in user && 'uid' in user) {
    // This is a WorkerUser - use the database user ID
    userId = user.id;
    isDatabaseUserId = true;
    console.log('🔍 DEBUG: Using WorkerUser database ID:', userId);
  } else {
    // This is a regular User - use the Firebase UID
    userId = user?.uid || '';
    isDatabaseUserId = false;
    console.log('🔍 DEBUG: Using regular User Firebase UID:', userId);
  }
  
  console.log('🔍 DEBUG: fetchWorkerGigDetails called with:', { 
    userId, 
    gigId, 
    userType: user?.constructor?.name,
    isDatabaseUserId,
    userObject: user
  });
  
  const { gig, status } = await getGigDetails({ 
    gigId, 
    userId, 
    role: 'worker', 
    isViewQA, 
    isDatabaseUserId 
  });

  if (!data || status !== 200) return null;

  return data;
}

async function checkIfGigIsAvailableOffer(user: User | WorkerUser, gigId: string): Promise<boolean> {
  try {
    // Extract Firebase UID for getWorkerOffers (expects Firebase UID)
    let firebaseUid: string;
    if ('uid' in user && user.uid) {
      firebaseUid = user.uid;
    } else {
      console.error("Cannot determine Firebase UID for user:", user);
      return false;
    }

    const result = await getWorkerOffers(firebaseUid);
    if (result.success && result.data?.offers) {
      return result.data.offers.some(offer => offer.id === gigId);
    }
    return false;
  } catch (error) {
    console.error("Error checking if gig is available offer:", error);
    return false;
  }
}

export default function WorkerGigDetailsPage() {
  const params = useParams();
  const workerProfileId = params.userId as string; // This is the worker profile ID from the URL
  const gigId = params.gigId as string;

  const { user, loading: loadingAuth } = useAuth();
  const authUserId = user?.uid;

  const [gig, setGig] = useState<GigDetails | null>(null);
  const [isLoadingGig, setIsLoadingGig] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAvailableOffer, setIsAvailableOffer] = useState(false);
  const [isCheckingOffer, setIsCheckingOffer] = useState(false);
  const [workerUser, setWorkerUser] = useState<WorkerUser | null>(null);

  // Fetch worker user from worker profile ID
  useEffect(() => {
    const fetchWorkerUser = async () => {
      if (!workerProfileId) {
        console.log('🔍 DEBUG: No workerProfileId provided');
        return;
      }
      
      console.log('🔍 DEBUG: Fetching worker user for profile ID:', workerProfileId);
      
      try {
        // Import the function to get worker user from profile ID
        const { getWorkerUserFromProfileId } = await import('@/actions/user/get-worker-user');
        const result = await getWorkerUserFromProfileId(workerProfileId);
        
        console.log('🔍 DEBUG: Worker user fetch result:', {
          success: result.success,
          hasData: !!result.data,
          error: result.error
        });
        
        if (result.success && result.data) {
          console.log('🔍 DEBUG: Worker user data:', {
            id: result.data.id,
            displayName: result.data.displayName,
            uid: result.data.uid
          });
          setWorkerUser(result.data);
        } else {
          console.log('🔍 DEBUG: Worker not found - setting error');
          setError("Worker not found");
          setIsLoadingGig(false);
        }
      } catch (err) {
        console.error("🔍 DEBUG: Error fetching worker user:", err);
        setError("Could not load worker information");
        setIsLoadingGig(false);
      }
    };

    fetchWorkerUser();
  }, [workerProfileId]);

  // Fetch Gig Details
  useEffect(() => {
    console.log('🔍 DEBUG: Gig details useEffect triggered:', {
      loadingAuth,
      hasWorkerUser: !!workerUser,
      userRole: user?.claims.role,
      authUserId,
      workerUserUid: workerUser?.uid,
      gigId
    });

    if (loadingAuth || !workerUser) {
      console.log('🔍 DEBUG: Skipping gig fetch - loadingAuth:', loadingAuth, 'workerUser:', !!workerUser);
      return; // Wait for auth state and worker user to be clear
    }

    const shouldFetch = (user?.claims.role === "QA" && workerProfileId && gigId) ||
      (user && authUserId === workerUser.uid && gigId);

    console.log('🔍 DEBUG: Should fetch gig:', shouldFetch);

    if (shouldFetch) {
      console.log('🔍 DEBUG: Starting gig fetch...');
      setIsLoadingGig(true);
      
      // First fetch gig details using the worker user
      fetchWorkerGigDetails(workerUser, gigId)
        .then(data => {
          console.log('🔍 DEBUG: fetchWorkerGigDetails result:', { hasData: !!data, data });
          if (data) {
            setGig(data);
            
            // Then check if this is an available offer
            setIsCheckingOffer(true);
            return checkIfGigIsAvailableOffer(workerUser, gigId);
          } else {
            setError("Gig not found or access denied.");
            return false;
          }
        })
        .then(isOffer => {
          console.log('🔍 DEBUG: checkIfGigIsAvailableOffer result:', isOffer);
          setIsAvailableOffer(isOffer);
        })
        .catch(err => {
          console.error("🔍 DEBUG: Failed to fetch gig details:", err);
          setError("Could not load gig details.");
        })
        .finally(() => {
          console.log('🔍 DEBUG: Setting isLoadingGig to false');
          setIsLoadingGig(false);
          setIsCheckingOffer(false);
        });
    }
  }, [loadingAuth, user, authUserId, workerProfileId, gigId, workerUser]);


  /*
  const getStatusBadgeClass = (status: GigDetails['status']) => {
    switch (status) {
        case 'ACCEPTED': return styles.statusAccepted;
        case 'IN_PROGRESS': return styles.statusInProgress;
        case 'AWAITING_BUYER_CONFIRMATION': return styles.statusAwaitingConfirmation;
        case 'COMPLETED': return styles.statusCompleted;
        case 'CANCELLED': return styles.statusCancelled;
        default: return '';
    }
  }
  */

  if (isLoadingGig) {
    return (
      <div 
        className={styles.loadingContainer}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: '#1A1A1A',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999
        }}
      >
        <div className={styles.loadingContent}>
          <Loader2 
            className={styles.loadingSpinner} 
            size={48} 
            style={{ color: 'white', animation: 'spin 1s linear infinite' }}
          />
        </div>
      </div>
    );
  }

  if (error) {
    return <div className={styles.container}><div className={styles.pageWrapper}><p className={styles.errorMessage}>{error}</p></div></div>;
  }

  if (!gig) {
    return <div className={styles.container}><div className={styles.pageWrapper}><p className={styles.emptyState}>Gig details not found.</p></div></div>;
  }

  return (
    <GigDetailsComponent 
      userId={workerProfileId} 
      role="worker" 
      gig={gig} 
      setGig={setGig}
      isAvailableOffer={isAvailableOffer}
      isCheckingOffer={isCheckingOffer}
    />
  );
} 