"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import RehireView from "./RehireView";

export interface OriginalGigInfo {
  workerName: string;
  role: string;
  originalDate: string;
  originalLocation: string;
}
export interface RehireWorkerData {
  workerId: string;
  name: string;
  avatarUrl?: string;
  role: string;
  ableGigs: number;
  experienceYears: string | number;
  reviewKeywords: string[];
  proposedHourlyRate: number;
  proposedHours: number;
  platformFeePercent: number;
  paymentProviderFeeFixed: number;
  paymentProviderFeePercent: number;
}

interface RehireContainerProps {
  initialData: {
    originalGig: OriginalGigInfo;
    workerForRehire: RehireWorkerData;
  } | null;
  userId: string;
}

const RehireContainer: React.FC<RehireContainerProps> = ({ initialData, userId }) => {
  const { user, loading: loadingAuth } = useAuth();
  const chatContainerRef = useRef<HTMLDivElement>(null) as React.RefObject<HTMLDivElement>;

  const [isBooking, setIsBooking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<
    Array<{
      id: number;
      type: "bot" | "userAction";
      content: string | React.ReactNode;
    }>
  >(
    initialData
      ? [
          {
            id: 1,
            type: "bot",
            content: `Awesome, you want to rehire ${initialData.originalGig.workerName} for a ${initialData.originalGig.role} shift, similar to your gig on ${initialData.originalGig.originalDate} at ${initialData.originalGig.originalLocation}? (Proposing a 4 hour shift for next Friday at 6pm - you can edit this.)`,
          },
          {
            id: 2,
            type: "bot",
            content: `Perfect, ${initialData.originalGig.workerName} is generally available. Click the card to edit details or book them now!`,
          },
        ]
      : []
  );

  // Scroll to bottom for chat
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleEditDetails = () => {
    if (!initialData?.workerForRehire) return;
    alert("Gig detail editing form would open here. You'd adjust proposed date, time, hours.");
  };

  const handleBookWorker = async () => {
    if (!initialData?.workerForRehire || !initialData?.originalGig) return;
    setIsBooking(true);
    setError(null);
    const bookingPayload = {
      buyerUserId: user?.uid || userId,
      workerId: initialData.workerForRehire.workerId,
      role: initialData.workerForRehire.role,
      proposedDate: "Next Friday",
      proposedStartTime: "18:00",
      proposedHours: initialData.workerForRehire.proposedHours,
      proposedRate: initialData.workerForRehire.proposedHourlyRate,
      location: initialData?.originalGig.originalLocation,
    };
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      console.log('send data here: ', bookingPayload);
      setChatMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          type: "bot",
          content: `Great! ${initialData.workerForRehire.name} has been booked for the new gig. Details are in your calendar.`,
        },
      ]);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
        setChatMessages((prev) => [
          ...prev,
          { id: Date.now(), type: "bot", content: `Error: ${err.message}` },
        ]);
      } else {
        setError("An unknown error occurred while booking the worker.");
        setChatMessages((prev) => [
          ...prev,
          { id: Date.now(), type: "bot", content: "Error: An unknown error occurred." },
        ]);
      }
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <RehireView
      loadingAuth={loadingAuth}
      error={error}
      originalGigInfo={initialData?.originalGig}
      workerToRehire={initialData?.workerForRehire}
      chatMessages={chatMessages}
      chatContainerRef={chatContainerRef}
      handleEditDetails={handleEditDetails}
      handleBookWorker={handleBookWorker}
      isBooking={isBooking}
      userId={user?.uid || userId}
    />
  );
};

export default RehireContainer; 