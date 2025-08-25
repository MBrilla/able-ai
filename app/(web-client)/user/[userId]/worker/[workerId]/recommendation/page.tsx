"use client";

import React, { useState, ChangeEvent, FormEvent, useEffect } from 'react';
import Image from 'next/image';
import { useRouter, useParams, usePathname } from 'next/navigation';

import InputField from '@/app/components/form/InputField'; // Reusing shared InputField
import { Star, Send, Loader2 } from 'lucide-react'; // Lucide icons

import styles from './RecommendationPage.module.css';
import { useAuth } from '@/context/AuthContext';
import ScreenHeaderWithBack from '@/app/components/layout/ScreenHeaderWithBack';
import { createRecommendation } from '@/actions/user/recommendations';

interface RecommendationFormData {
  recommendationText: string;
  relationship: string;
  recommenderName: string;
  recommenderEmail: string;
}

// Mock function to get worker details - replace with actual API call
async function getWorkerDetails(workerId: string): Promise<{ name: string; primarySkill: string } | null> {
  // TODO: Replace with actual API call to get worker details
  // For now, return mock data
  return { name: "Selected Worker", primarySkill: "Talent" }; // Fallback
}

export default function RecommendationPage() {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname(); // Added pathname
  const recommenderUserId = params.userId as string; // Logged-in user providing recommendation
  const workerToRecommendId = params.workerId as string;

  const { user, loading: loadingAuth } = useAuth();
  const authUserId = user?.uid;

  const [workerDetails, setWorkerDetails] = useState<{ name: string; primarySkill: string } | null>(null);
  const [isLoadingWorker, setIsLoadingWorker] = useState(true);

  const [formData, setFormData] = useState<RecommendationFormData>({
    recommendationText: '',
    relationship: '',
    recommenderName: '',
    recommenderEmail: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Auth check and initial data load for the recommender
  useEffect(() => {
    if (loadingAuth) return;

    if (!user) {
      router.push(`/signin?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    if (!authUserId) {
      console.error("User is authenticated but UID is missing. Redirecting to signin.");
      router.push(`/signin?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    // Ensure the user from the URL (recommenderUserId) matches the authenticated user
    if (authUserId !== recommenderUserId) {
      router.push('/signin?error=unauthorized'); 
      return;
    }

    // If all checks pass, prefill recommender's name and email
    setFormData(prev => ({
      ...prev,
      recommenderName: user.displayName || '',
      recommenderEmail: user.email || ''
    }));

    // Load worker details
    getWorkerDetails(workerToRecommendId)
      .then(details => {
        if (details) {
          setWorkerDetails(details);
        }
      })
      .catch(() => setError("Error fetching worker details."))
      .finally(() => setIsLoadingWorker(false));

  }, [loadingAuth, user, authUserId, recommenderUserId, workerToRecommendId, pathname, router]);

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
    setSuccessMessage(null);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!formData.recommendationText || !formData.relationship || !formData.recommenderName || !formData.recommenderEmail) {
        setError("All fields are required.");
        return;
    }
    
    setIsSubmitting(true);

    try {
      // Submit recommendation to database
      const result = await createRecommendation({
        workerUserId: workerToRecommendId,
        recommendationText: formData.recommendationText,
        relationship: formData.relationship,
        recommenderName: formData.recommenderName,
        recommenderEmail: formData.recommenderEmail,
      });

      if (result.success) {
        setSuccessMessage("Recommendation submitted successfully! Thank you.");
        setFormData({
          recommendationText: '',
          relationship: '',
          recommenderName: user?.displayName || '', // Reset with prefill if available
          recommenderEmail: user?.email || ''
        });
        // Optionally redirect or clear form further
      } else {
        setError(result.error || "Failed to submit recommendation. Please try again.");
      }
    } catch (error) {
      console.error("Submission error:", error);
      if (error instanceof Error) {
        setError(`An unexpected error occurred: ${error.message}. Please try again.`);
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Show loading spinner while worker details are being fetched (after auth checks pass)
  if (isLoadingWorker) {
    return <div className={styles.loadingContainer}><Loader2 size={32} className="animate-spin" /> Loading Worker Details...</div>;
  }

  // If we reach here, auth checks have passed and worker details fetching is complete.
  const firstName = workerDetails?.name.split(' ')[0];

  return (
    <div className={styles.container}>
      <ScreenHeaderWithBack 
        title="Recommend Worker" 
        onBackClick={() => router.back()}
      />

      <div className={styles.content}>
        <div className={styles.workerInfo}>
          <div className={styles.workerAvatar}>
            <Image
              src="/images/default-avatar.png"
              alt={`${workerDetails?.name || 'Worker'} avatar`}
              width={80}
              height={80}
              className={styles.avatarImage}
            />
          </div>
          <div className={styles.workerDetails}>
            <h2 className={styles.workerName}>{workerDetails?.name || 'Worker Name'}</h2>
            <p className={styles.workerSkill}>{workerDetails?.primarySkill || 'Professional'}</p>
          </div>
        </div>

        <div className={styles.recommendationForm}>
          <h3 className={styles.formTitle}>
            Write a recommendation for {firstName || 'this worker'}
          </h3>
          
          {error && (
            <div className={styles.errorMessage}>
              {error}
            </div>
          )}
          
          {successMessage && (
            <div className={styles.successMessage}>
              {successMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label htmlFor="recommendationText" className={styles.label}>
                Your Recommendation *
              </label>
              <textarea
                id="recommendationText"
                name="recommendationText"
                value={formData.recommendationText}
                onChange={handleChange}
                placeholder="What makes this person great to work with? Share specific examples of their skills, reliability, and professionalism..."
                required
                className={styles.textarea}
                rows={4}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="relationship" className={styles.label}>
                How do you know them? *
              </label>
              <textarea
                id="relationship"
                name="relationship"
                value={formData.relationship}
                onChange={handleChange}
                placeholder="e.g., Worked together at [Company/Event], Supervised them, Hired them for a gig..."
                required
                className={styles.textarea}
                rows={3}
              />
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="recommenderName" className={styles.label}>
                  Your Name *
                </label>
                <InputField
                  id="recommenderName"
                  name="recommenderName"
                  type="text"
                  value={formData.recommenderName}
                  onChange={handleChange}
                  placeholder="Your Full Name"
                  required
                />
              </div>
              
              <div className={styles.formGroup}>
                <label htmlFor="recommenderEmail" className={styles.label}>
                  Your Email *
                </label>
                <InputField
                  id="recommenderEmail"
                  name="recommenderEmail"
                  type="email"
                  value={formData.recommenderEmail}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className={styles.submitButton}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send size={20} />
                  Submit Recommendation
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
} 