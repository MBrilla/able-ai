"use client";

import React, { useState, ChangeEvent, FormEvent, useEffect } from "react";
import { useParams } from "next/navigation";
import { createRecommendation, getRecommendationByCode } from "@/actions/user/recommendations";

type RecommendationFormData = {
  recommendationText: string;
  relationship: string;
  recommenderName: string;
  recommenderEmail: string;
};

export default function PublicRecommendationPage() {
  const params = useParams();
  const code = params.code as string;

  const [formData, setFormData] = useState<RecommendationFormData>({
    recommendationText: "",
    relationship: "",
    recommenderName: "",
    recommenderEmail: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [workerDetails, setWorkerDetails] = useState<{ name: string; primarySkill: string } | null>(null);
  const [isLoadingWorker, setIsLoadingWorker] = useState(true);

  // Fetch worker details when the page loads
  useEffect(() => {
    const fetchWorkerDetails = async () => {
      if (!code) return;
      
      try {
        setIsLoadingWorker(true);
        const result = await getRecommendationByCode(code);
        
        if (result.success && result.data) {
          // Set worker details for display
          setWorkerDetails({
            name: result.data.worker?.fullName || "Worker",
            primarySkill: "Professional" // You can enhance this later
          });
        } else {
          setError("Invalid recommendation link or worker not found.");
        }
      } catch (err) {
        setError("Error loading worker details.");
      } finally {
        setIsLoadingWorker(false);
      }
    };

    fetchWorkerDetails();
  }, [code]);

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null);
    setSuccessMessage(null);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (
      !formData.recommendationText ||
      !formData.relationship ||
      !formData.recommenderName ||
      !formData.recommenderEmail
    ) {
      setError("All fields are required.");
      return;
    }

    setIsSubmitting(true);
    try {
      // Get worker details to get the workerUserId
      const workerResult = await getRecommendationByCode(code);
      
      if (!workerResult.success || !workerResult.data) {
        throw new Error("Worker not found");
      }

      // Submit the recommendation to the database
      const result = await createRecommendation({
        workerUserId: workerResult.data.workerUserId,
        recommendationText: formData.recommendationText,
        relationship: formData.relationship,
        recommenderName: formData.recommenderName,
        recommenderEmail: formData.recommenderEmail,
        recommendationCode: code, // Use the existing code
      });

      if (result.success) {
        setSuccessMessage("Thanks! Your recommendation has been recorded successfully.");
        setFormData({
          recommendationText: "",
          relationship: "",
          recommenderName: "",
          recommenderEmail: "",
        });
      } else {
        setError(result.error || "Failed to submit recommendation. Please try again.");
      }
    } catch (e) {
      console.error("Submission error:", e);
      setError("Unexpected error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingWorker) {
    return (
      <div style={{ 
        maxWidth: 720, 
        margin: "24px auto", 
        padding: "0 16px", 
        textAlign: "center",
        color: "#e5e5e5" 
      }}>
        <div>Loading worker details...</div>
      </div>
    );
  }

  if (error && !workerDetails) {
    return (
      <div style={{ 
        maxWidth: 720, 
        margin: "24px auto", 
        padding: "0 16px", 
        color: "#e5e5e5" 
      }}>
        <div style={{
          background: "#b91c1c",
          color: "#fff",
          padding: "16px",
          borderRadius: 8,
          margin: "24px 0"
        }}>
          {error}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: 720,
        margin: "24px auto",
        padding: "0 16px",
        color: "#e5e5e5",
      }}
    >
      <h1 style={{ marginBottom: 8 }}>Provide a Recommendation</h1>
      <p style={{ marginTop: 0, opacity: 0.8 }}>
        This is a public reference link for <strong>{workerDetails?.name}</strong>. 
        Code: <strong>{code}</strong>
      </p>

      {error && (
        <div
          style={{
            background: "#b91c1c",
            color: "#fff",
            padding: "8px 12px",
            borderRadius: 8,
            margin: "12px 0",
          }}
        >
          {error}
        </div>
      )}
      {successMessage && (
        <div
          style={{
            background: "#166534",
            color: "#fff",
            padding: "8px 12px",
            borderRadius: 8,
            margin: "12px 0",
          }}
        >
          {successMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
        <div>
          <label htmlFor="recommendationText" style={{ display: "block", marginBottom: 6 }}>
            Your Recommendation
          </label>
          <textarea
            id="recommendationText"
            name="recommendationText"
            value={formData.recommendationText}
            onChange={handleChange}
            placeholder="What makes this person great to work with?"
            required
            style={{ width: "100%", minHeight: 120, borderRadius: 8, padding: 10 }}
          />
        </div>

        <div>
          <label htmlFor="relationship" style={{ display: "block", marginBottom: 6 }}>
            How do you know them?
          </label>
          <textarea
            id="relationship"
            name="relationship"
            value={formData.relationship}
            onChange={handleChange}
            placeholder="e.g., Worked together at [Company/Event], Supervised them, Hired them for a gig..."
            required
            style={{ width: "100%", minHeight: 80, borderRadius: 8, padding: 10 }}
          />
        </div>

        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
          <div>
            <label htmlFor="recommenderName" style={{ display: "block", marginBottom: 6 }}>
              Your Name
            </label>
            <input
              id="recommenderName"
              name="recommenderName"
              type="text"
              value={formData.recommenderName}
              onChange={handleChange}
              placeholder="Your Full Name"
              required
              style={{ width: "100%", height: 40, borderRadius: 8, padding: "0 10px" }}
            />
          </div>
          <div>
            <label htmlFor="recommenderEmail" style={{ display: "block", marginBottom: 6 }}>
              Your Email
            </label>
            <input
              id="recommenderEmail"
              name="recommenderEmail"
              type="email"
              value={formData.recommenderEmail}
              onChange={handleChange}
              placeholder="you@example.com"
              required
              style={{ width: "100%", height: 40, borderRadius: 8, padding: "0 10px" }}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            height: 44,
            borderRadius: 8,
            background: isSubmitting ? "#555" : "var(--primary-color, #2563eb)",
            color: "#fff",
            border: 0,
            fontWeight: 600,
            cursor: isSubmitting ? "not-allowed" : "pointer",
          }}
        >
          {isSubmitting ? "Submitting..." : "Submit Recommendation"}
        </button>
      </form>
    </div>
  );
}


