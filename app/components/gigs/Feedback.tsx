"use client";

import React from "react";
import GigSummary from "./GigSummary";
import WorkerFeedbackFields from "./WorkerFeedbackFields";
import BuyerFeedbackFields from "./BuyerFeedbackFields";
import styles from "@/app/(web-client)/user/[userId]/buyer/gigs/[gigId]/feedback/FeedbackPage.module.css";
import stylesFeed from "@/app/components/gigs/Feedback.module.css";
import { BuyerFeedbackFormData, FeedbackProps, WorkerFeedbackFormData } from "@/app/types/GigFeedbackTypes";

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
    <div className={`${stylesFeed.container} ${stylesFeed.pageWrapper}`}>
      <GigSummary gigDetails={gigDetails} />
      <form onSubmit={onSubmit} className={styles.stepperContainer}>
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
