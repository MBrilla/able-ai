"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import FeedbackContainer from "@/app/components/gigs/FeedbackContainer";
import { GigDetails, BuyerFeedbackFormData, WorkerFeedbackFormData } from "@/app/components/gigs/Feedback";

async function fetchGigForBuyerFeedback(
  gigId: string
): Promise<GigDetails | null> {
  await new Promise((resolve) => setTimeout(resolve, 500));
  if (gigId === "gig123-accepted") {
    return {
      id: gigId,
      role: "Bartender",
      workerName: "Benji Asamoah",
      workerAvatarUrl: "/images/benji.jpeg",
      workerId: "benji-asamoah-id",
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      hourlyRate: 25,
      hoursWorked: 8,
      totalPayment: 200,
      duration: "4 hours",
      details: "Completed gig on Monday, 9:00 am. Location: Central Train station",
      earnings: 80.0,
    };
  }
  return null;
}

export default function BuyerFeedbackPage() {
  const router = useRouter();
  const params = useParams();
  const pageUserId = params.userId as string;
  const gigId = params.gigId as string;

  const { user, loading: loadingAuth } = useAuth();
  const authUserId = user?.uid;
  const [gigData, setGigData] = useState<GigDetails | null>(null);
  const [isLoadingGig, setIsLoadingGig] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (loadingAuth) return;
    const shouldFetch = (user?.claims.role === "QA" && gigId) || 
                        (user && authUserId === pageUserId && gigId);
    if (shouldFetch) {
      setIsLoadingGig(true);
      fetchGigForBuyerFeedback(authUserId!)
        .then((data) => {
          if (data) {
            setGigData(data);
          } else {
            setError(
              "Gig not found, not ready for feedback, or feedback already submitted."
            );
          }
        })
        .catch((err) => {
          setError("Could not load gig information for feedback." + JSON.stringify(err));
        })
        .finally(() => setIsLoadingGig(false));
    }
  }, [user, loadingAuth, authUserId, pageUserId, gigId]);

  const handleSubmit = (data: WorkerFeedbackFormData | BuyerFeedbackFormData) => {
    const buyerData = data as BuyerFeedbackFormData;
    setError(null);
    setSuccessMessage(null);
    if (!buyerData.wouldHireAgain) {
      setError("Please select if you would hire this worker again.");
      return;
    }
    if (!gigData || !user?.uid) {
      setError("Gig information or user ID is missing.");
      return;
    }
    setIsSubmitting(true);
    // Simulate API call
    setTimeout(() => {
      setSuccessMessage(`Feedback for ${gigData.workerName} submitted successfully!`);
      setIsSubmitting(false);
    }, 1200);
    router.push(`/user/${user?.uid || "this_user"}/buyer`); // Redirect to buyer home
  };

  if (loadingAuth || isLoadingGig) {
    return <div className="flex items-center justify-center h-40"><Loader2 className="animate-spin" size={32} /> Loading...</div>;
  }
  return (
    <FeedbackContainer
      gigData={gigData}
      user={user}
      role="BUYER"
      mode="buyer"
      onSubmit={handleSubmit}
      loading={isSubmitting}
      error={error}
      successMessage={successMessage}
    />
  );
}
