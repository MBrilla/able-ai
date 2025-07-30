"use client";

import React from "react";
import GigSummary from "./GigSummary";
import WorkerFeedbackFields from "./WorkerFeedbackFields";
import BuyerFeedbackFields from "./BuyerFeedbackFields";

export interface GigDetails {
  id: string;
  role: string;
  workerName: string;
  workerAvatarUrl?: string;
  workerId: string;
  date: string;
  hourlyRate: number;
  hoursWorked: number;
  totalPayment: number;
  duration?: string;
  details?: string;
  earnings?: number;
}

export interface WorkerFeedbackFormData {
  feedbackText: string;
  wouldWorkAgain: boolean | null;
  topCommunicator?: boolean;
  teamBuilder: boolean;
  expensesText: string;
}

export interface BuyerFeedbackFormData {
  publicComment: string;
  privateNotes: string;
  wouldHireAgain: "yes" | "no" | "maybe" | "";
  teamBuilder: boolean;
  topCommunicator?: boolean;
}

type FeedbackProps = {
  gigDetails: GigDetails;
  role: "GIG_WORKER" | "BUYER";
  mode: "worker" | "buyer";
  formData: WorkerFeedbackFormData | BuyerFeedbackFormData;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onThumbsUp?: () => void;
  onThumbsDown?: () => void;
  onToggleTopCommunicator?: () => void;
  onToggleTeamBuilder?: () => void;
  onSubmit: (e: React.FormEvent) => void;
  loading?: boolean;
  submitting?: boolean;
};

const Feedback: React.FC<FeedbackProps> = ({
  gigDetails,
  mode,
  formData,
  onChange,
  onThumbsUp,
  onThumbsDown,
  onToggleTopCommunicator,
  onToggleTeamBuilder,
  onSubmit,
  loading,
  submitting,
}) => {
  if (loading) {
    return <div className="flex items-center justify-center h-40">Loading...</div>;
  }
  return (
    <div className="max-w-xl mx-auto p-4">
      <GigSummary gigDetails={gigDetails} />
      <form onSubmit={onSubmit}>
        {mode === "worker" ? (
          <WorkerFeedbackFields
            gigDetails={gigDetails}
            formData={formData as WorkerFeedbackFormData}
            onChange={onChange}
            onThumbsUp={onThumbsUp!}
            onThumbsDown={onThumbsDown!}
            onToggleTopCommunicator={onToggleTopCommunicator!}
            onToggleTeamBuilder={onToggleTeamBuilder!}
            submitting={submitting}
          />
        ) : (
          <BuyerFeedbackFields
            gigDetails={gigDetails}
            formData={formData as BuyerFeedbackFormData}
            onChange={onChange}
            submitting={submitting}
          />
        )}
      </form>
    </div>
  );
};

export default Feedback;
