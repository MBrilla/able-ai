"use client";
import Link from "next/link";

// --- SHARED & HELPER COMPONENTS ---
import ContentCard from "@/app/components/shared/ContentCard";
import SkillsDisplayTable from "@/app/components/profile/SkillsDisplayTable";
import StatisticItemDisplay from "@/app/components/profile/StatisticItemDisplay";
import AwardDisplayBadge from "@/app/components/profile/AwardDisplayBadge";
import CheckboxDisplayItem from "@/app/components/profile/CheckboxDisplayItem";
import styles from "./WorkerProfile.module.css";

import {
  CalendarDays,
  BadgeCheck,
  ThumbsUp,
  MessageSquare,
} from "lucide-react";
import {
  getPrivateWorkerProfileAction,
  updateVideoUrlProfileAction,
  updateAboutTextAction,
} from "@/actions/user/gig-worker-profile";
import { firebaseApp } from "@/lib/firebase/clientApp";
import {
  getStorage,
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";

import PublicWorkerProfile, { Review } from "@/app/types/workerProfileTypes";
import { useAuth } from "@/context/AuthContext";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import ProfileMedia from "./ProfileMedia";
import RecommendationLinkGenerator from "@/app/components/shared/RecommendationLinkGenerator";

const WorkerProfile = ({
  workerProfile,
  isSelfView = false,
  handleAddSkill,
  handleSkillDetails, // Optional handler for skill details
  fetchUserProfile,
}: {
  workerProfile: PublicWorkerProfile;
  handleAddSkill?: () => void;
  handleSkillDetails: (id: string) => void; // Now optional
  fetchUserProfile: (token: string) => void;
  userId?: string;
  isSelfView: boolean;
}) => {
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [workerLink, setWorkerLink] = useState<string | null>(null);
  const [showEditAboutModal, setShowEditAboutModal] = useState(false);
  const [editAboutText, setEditAboutText] = useState('');
  const [isEditingAbout, setIsEditingAbout] = useState(false);

  const handleVideoUpload = useCallback(
    async (file: Blob) => {
      if (!user) {
        console.error("Missing required parameters for video upload");
        setError("Failed to upload video. Please try again.");
        return;
      }

      if (!file || file.size === 0) {
        console.error("Invalid file for video upload");
        setError("Invalid video file. Please try again.");
        return;
      }

      // Check file size (limit to 50MB)
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (file.size > maxSize) {
        setError("Video file too large. Please use a file smaller than 50MB.");
        return;
      }

      try {
        const filePath = `workers/${
          user.uid
        }/introVideo/introduction-${encodeURI(user.email ?? user.uid)}.webm`;
        const fileStorageRef = storageRef(getStorage(firebaseApp), filePath);
        const uploadTask = uploadBytesResumable(fileStorageRef, file);

        uploadTask.on(
          "state_changed",
          (snapshot) => {
            const progress =
              (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            // Progress handling if needed
          },
          (error) => {
            console.error("Upload failed:", error);
            setError("Video upload failed. Please try again.");
          },
          () => {
            getDownloadURL(uploadTask.snapshot.ref)
              .then((downloadURL) => {
                updateVideoUrlProfileAction(downloadURL, user.token);
                toast.success("Video upload successfully");
                getPrivateWorkerProfileAction(user.token);
              })
              .catch((error) => {
                console.error("Failed to get download URL:", error);
                setError("Failed to get video URL. Please try again.");
              });
          }
        );
      } catch (error) {
        console.error("Video upload error:", error);
        setError("Failed to upload video. Please try again.");
      }
    },
    [user]
  );

  useEffect(() => {
    if (workerProfile && workerProfile.id) {
      setWorkerLink(
        `${window.location.origin}/worker/${workerProfile.id}/profile`
      );
    }
  }, [workerProfile]);

  return (
    <div className={styles.profilePageContainer}>
      {/* Top Section (Benji Image Style - Profile Image/Video, QR, Location) */}
      <ProfileMedia
        workerProfile={workerProfile}
        isSelfView={isSelfView}
        workerLink={workerLink}
        onVideoUpload={handleVideoUpload}
      />
      {/* User Info Bar (Benji Image Style - Name, Handle, Calendar) */}
      <div className={styles.userInfoBar}>
        <div className={styles.userInfoLeft}>
          <h1 className={styles.workerName}>
            {user?.displayName}
            {true && (
              <BadgeCheck size={22} className={styles.verifiedBadgeWorker} />
            )}
          </h1>
        </div>
        <div className={styles.workerInfo}>
          {true && (
            <Link
              href={workerProfile?.userId || ""}
              className={styles.viewCalendarLink}
              aria-label="View calendar"
            >
              <CalendarDays size={20} className={styles.calendarIcon} />
              <span>Availability calendar</span>
            </Link>
          )}
        </div>
      </div>
      {/* Main content wrapper */}
      <div className={styles.mainContentWrapper}>
        {/* Statistics Section (Benji Image Style) */}
        <ContentCard title="Statistics" className={styles.statisticsCard}>
          <div className={styles.statisticsItemsContainer}>
            {workerProfile?.responseRateInternal && (
              <StatisticItemDisplay
                stat={{
                  id: 1,
                  icon: ThumbsUp,
                  value: workerProfile.responseRateInternal,
                  label: "Would work with Benji again",
                  iconColor: "#0070f3",
                }}
              />
            )}
            {workerProfile?.averageRating && (
              <StatisticItemDisplay
                stat={{
                  id: 2,
                  icon: MessageSquare,
                  value: workerProfile.averageRating,
                  label: "Response rate",
                  iconColor: "#0070f3",
                }}
              />
            )}
          </div>
        </ContentCard>

        {/* Skills Section (Benji Image Style - Blue Card) */}
        {
          <SkillsDisplayTable
            skills={workerProfile?.skills}
            isSelfView={isSelfView}
            handleAddSkill={handleAddSkill}
            handleSkillDetails={handleSkillDetails}
            fetchUserProfile={fetchUserProfile}
            token={user?.token || ""}
          />
        }

        {/* Recommendations Section - Only show for self-view */}
        {isSelfView && user && (
          <ContentCard title="Get Recommendations">
            <RecommendationLinkGenerator 
              workerUserId={user.uid}
              workerName={user.displayName || "Worker"}
            />
          </ContentCard>
        )}

        {/* Awards & Feedback Section (Benji Image Style) */}
        {workerProfile.awards && ( // Only show section if there are awards or feedback
          <div className={styles.awardsFeedbackGrid}>
            {workerProfile.awards && workerProfile.awards.length > 0 && (
              // <ContentCard title="Awards:" className={styles.awardsCard}>
              <div>
                <h3 className={styles.contentTitle}>Awards:</h3>
                <div className={styles.awardsContainer}>
                  {workerProfile.awards.map((award) => (
                    <AwardDisplayBadge
                      key={award.id}
                      textLines={award.notes || ""}
                      color="#eab308"
                      border="3px solid #eab308"
                    />
                  ))}
                </div>
              </div>
            )}
            <div>
              <h3 className={styles.contentTitle}>Feedbacks:</h3>
              {workerProfile.reviews && workerProfile.reviews.length > 0 ? (
                workerProfile.reviews.map((review: Review) => (
                  <p key={review.id} className={styles.feedbackText}>
                    {review.comment}
                  </p>
                ))
              ) : (
                <p className={styles.feedbackText}>No feedback available.</p>
              )}
            </div>
          </div>
        )}

        {/* Qualifications Section (Benji Image Style) */}
        {workerProfile.qualifications &&
          workerProfile.qualifications.length > 0 && (
            // <ContentCard title="Qualifications:">
            <div>
              <h3 className={styles.contentTitle}>Qualifications:</h3>
              <ul className={styles.listSimple}>
                {workerProfile.qualifications.map((q, index) => (
                  <li key={index}>
                    {q.title}: {q.description}
                  </li>
                ))}
              </ul>
            </div>
            // </ContentCard>
          )}

        {/* Equipment Section (Benji Image Style) */}
        {workerProfile.equipment && workerProfile.equipment.length > 0 && (
          <div>
            <h3 className={styles.contentTitle}>Equipment:</h3>
            <div className={styles.equipmentListContainer}>
              {workerProfile.equipment.map((item, index) => (
                <CheckboxDisplayItem key={index} label={item.name} />
              ))}
            </div>
          </div>
        )}

        {/* Bio Text (if used) */}
        {workerProfile.fullBio && (
          <div className={styles.aboutSection}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 className={styles.contentTitle}>
                {`About ${user?.displayName?.split(" ")[0] || "this user"}`}
              </h3>
              {isSelfView && (
                <button
                  onClick={() => {
                    setEditAboutText(workerProfile.fullBio || '');
                    setShowEditAboutModal(true);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#0070f3',
                    cursor: 'pointer',
                    fontSize: '14px',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(0, 112, 243, 0.1)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  ✏️ Edit
                </button>
              )}
            </div>
            <p className={styles.bioText}>{workerProfile.fullBio}</p>
          </div>
        )}
      </div>{" "}
      {/* End Main Content Wrapper */}

      {/* Edit About Modal */}
      {showEditAboutModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: '24px',
            borderRadius: '12px',
            width: '90%',
            maxWidth: '500px',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <h3 style={{ marginBottom: '16px', color: '#333' }}>Edit About Section</h3>
            <textarea
              value={editAboutText}
              onChange={(e) => setEditAboutText(e.target.value)}
              placeholder="Tell us about yourself..."
              style={{
                width: '100%',
                minHeight: '120px',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '14px',
                fontFamily: 'inherit',
                resize: 'vertical'
              }}
            />
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end',
              marginTop: '20px'
            }}>
              <button
                onClick={() => {
                  setShowEditAboutModal(false);
                  setEditAboutText('');
                }}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  background: 'white',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!editAboutText.trim()) return;
                  
                  setIsEditingAbout(true);
                  try {
                    // Call API to update about text
                    const result = await updateAboutTextAction(user?.token || '', editAboutText);
                    
                    if (result.success) {
                      setShowEditAboutModal(false);
                      setEditAboutText('');
                      // Refresh the profile to show updated text
                      if (user?.token) {
                        fetchUserProfile(user.token);
                      }
                    } else {
                      console.error('Failed to update about text:', result.error);
                      // You could show an error toast here
                    }
                  } catch (error) {
                    console.error('Failed to update about text:', error);
                    // You could show an error toast here
                  } finally {
                    setIsEditingAbout(false);
                  }
                }}
                disabled={isEditingAbout || !editAboutText.trim()}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: '6px',
                  background: isEditingAbout || !editAboutText.trim() ? '#ccc' : '#0070f3',
                  color: 'white',
                  cursor: isEditingAbout || !editAboutText.trim() ? 'not-allowed' : 'pointer'
                }}
              >
                {isEditingAbout ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkerProfile;
