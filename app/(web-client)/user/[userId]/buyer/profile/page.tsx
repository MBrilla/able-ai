"use client";

import React, { useState } from "react";
import { Loader2 } from "lucide-react";
import styles from "./BuyerProfilePage.module.css";
import { useBuyerProfileData } from "./hooks/useBuyerProfileData";
import Header from "./sections/Header";
import IntroSection from "./sections/IntroSection";
import StatisticsSection from "./sections/StatisticsSection";
import CompletedHires from "./sections/CompletedHires";
import WorkforceAnalytics from "./sections/WorkforceAnalytics";
import BadgesSection from "./sections/BadgesSection";
import ReviewsSection from "./sections/ReviewsSection";
import ScreenHeaderWithBack from "@/app/components/layout/ScreenHeaderWithBack";
import UserNameModal from "@/app/components/profile/UserNameModal";
import EditBusinessModal from "@/app/components/profile/EditBusinessModal";
import SocialLinkModal from "./SocialLinkModal";
import StripeConnectionGuard from "@/app/components/shared/StripeConnectionGuard";
import { updateSocialLinkBuyerProfileAction } from "@/actions/user/buyer-profile-updates";

// Empty dashboard data for loading states
const emptyDashboardData = {
  fullName: "",
  username: "",
  fullCompanyName: "",
  companyRole: "",
  socialLink: "",
  responseRateInternal: 0,
  averageRating: 0,
  completedHires: 0,
  topSkills: [],
  badges: [],
  reviews: [],
  statistics: [],
  badgesEarnedByTheirWorkers: [],
};

export default function BuyerProfilePage() {
  const {
    dashboardData,
    isLoadingData,
    businessInfo,
    handleVideoUpload,
    handleSave,
    isSelfView,
    isEditingVideo,
    setIsEditingVideo,
    user,
    authUserId,
    fetchUserProfile,
  } = useBuyerProfileData();

  const [isOpen, setIsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSocialModalOpen, setIsSocialModalOpen] = useState(false);

  return (
    <div className={styles.container}>
      <div className={styles.pageWrapper}>
        {/* Profile Header */}
        <header className={styles.profileHeader}>
          <h3 className={styles.profileHeaderName}>{dashboardData.fullName}</h3>
          <p className={styles.profileHeaderUsername}>
            {dashboardData.username}
          </p>
        </header>

        {/* Intro & Business Card Section */}
        <section className={`${styles.section} ${styles.introBusinessCard}`}>
          <div className={styles.videoThumbnailContainer}>
            <span className={styles.videoThumbnailTitle}>Intro Video</span>
            <div className={styles.videoPlaceholderImage}>
              {!dashboardData?.videoUrl ? (
                isSelfView ? (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <h3>Please, introduce yourself</h3>
                    <VideoRecorderBubble
                      key={1}
                      onVideoRecorded={handleVideoUpload}
                    />
                  </div>
                ) : (
                  <p
                    style={{
                      textAlign: "center",
                      fontStyle: "italic",
                      color: "#888",
                    }}
                  >
                    User presentation not exist
                  </p>
                )
              ) : (
                <div style={{ textAlign: "center" }}>
                  <Link
                    href={dashboardData.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: "inline-block", textDecoration: "none" }}
                  >
                    <video
                      width="180"
                      height="180"
                      style={{ borderRadius: "8px", objectFit: "cover" }}
                      preload="metadata"
                      muted
                      poster="/video-placeholder.jpg"
                    >
                      <source
                        src={dashboardData.videoUrl + "#t=0.1"}
                        type="video/webm"
                      />
                    </video>
                  </Link>

                  {isSelfView && (
                    <div style={{ marginTop: "8px" }}>
                      <button
                        onClick={() => setIsEditingVideo(true)}
                        style={{
                          padding: "6px 12px",
                          backgroundColor: "#0070f3",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                        }}
                      >
                        Re-SHOOT
                      </button>
                    </div>
                  )}

                  {isEditingVideo && (
                    <div style={{ marginTop: "12px" }}>
                      <VideoRecorderBubble
                        key={2}
                        onVideoRecorded={(video) => {
                          handleVideoUpload(video);
                          setIsEditingVideo(false);
                        }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className={styles.businessInfoCard}>
            <h4>Business:</h4>
            <p>
              {dashboardData.fullCompanyName}
              <br />
              {dashboardData?.billingAddressJson?.city},{" "}
              {dashboardData?.billingAddressJson?.country}
              <br />
              {dashboardData?.billingAddressJson?.addressLine1 ||
                dashboardData?.billingAddressJson?.addressLine2}
            </p>
            <h4>Role:</h4>
            <p>{dashboardData?.companyRole}</p>
          </div>
        </section>

        {/* Statistics Section */}
        <section className={styles.section}>
          <ContentCard title="Statistics" className={styles.statisticsCard}>
            <div className={styles.statisticsItemsContainer}>
              {dashboardData?.responseRateInternal && (
                <StatisticItemDisplay
                  stat={{
                    id: 1,
                    icon: ThumbsUp,
                    value: dashboardData.responseRateInternal,
                    label: "Would work with Benji again",
                    iconColor: "#0070f3",
                  }}
                />
              )}
              {dashboardData?.averageRating && (
                <StatisticItemDisplay
                  stat={{
                    id: 2,
                    icon: MessageSquare,
                    value: dashboardData.averageRating,
                    label: "Response rate",
                    iconColor: "#0070f3",
                  }}
                />
              )}
            </div>
          </ContentCard>
        </section>

        {/* Completed Hires Card */}
        <div className={styles.completedHiresCard}>
          <div className={styles.completedHiresCount}>
            <span className={styles.completedHiresLabel}>Completed Hires</span>
            <span className={styles.completedHiresNumber}>
              {dashboardData.completedHires}
            </span>
          </div>
          <div className={styles.staffTypesList}>
            <span className={styles.staffTypesTitle}>
              Types of Staff Hired:
            </span>
            <ul>
              {dashboardData?.typesOfStaffHired?.map((type) => (
                <li key={type}>{type}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Workforce Analytics Section */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Workforce Analytics</h2>
          <div className={styles.analyticsChartsContainer}>
            <PieChartComponent />
            <BarChartComponent />
          </div>
        </section>

        {/* Badges Awarded Section */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Badges Awarded</h2>
          <div className={styles.badges}>
            {dashboardData?.badges?.map((badge) => (
              <div className={styles.badge} key={badge.id}>
                <AwardDisplayBadge
                  {...(badge?.badge?.icon ? { icon: badge.badge?.icon } : {})}
                  textLines={badge?.badge?.description ?? ""}
                />
              </div>
            ))}
          </div>
        </section>

        {/* Worker Reviews Section */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Worker Reviews</h2>
          {dashboardData?.reviews?.length > 0 ? (
            <div className={styles.reviewsListContainer}>
              {dashboardData?.reviews.map((review, index) => (
                <ReviewCardItem
                  key={index}
                  reviewerName={review.name}
                  date={review.date.toString()}
                  comment={review.text}
                />
              ))}
            </div>
          ) : (
            <>
              <Header
                dashboardData={dashboardData || emptyDashboardData}
                onEditName={() => setIsOpen(true)}
                onEditSocialLink={() => setIsSocialModalOpen(true)}
              />

              <IntroSection
                dashboardData={dashboardData || emptyDashboardData}
                businessInfo={businessInfo}
                isSelfView={isSelfView}
                isEditingVideo={isEditingVideo}
                setIsEditingVideo={setIsEditingVideo}
                handleVideoUpload={handleVideoUpload}
                onEditBusiness={() => setIsModalOpen(true)}
              />

              {user && (
                <StatisticsSection
                  dashboardData={dashboardData || emptyDashboardData}
                  user={user}
                />
              )}

              <CompletedHires
                dashboardData={dashboardData || emptyDashboardData}
              />

              <WorkforceAnalytics
                dashboardData={dashboardData || emptyDashboardData}
              />

              <BadgesSection
                dashboardData={dashboardData || emptyDashboardData}
              />

              <ReviewsSection
                dashboardData={dashboardData || emptyDashboardData}
              />
            </>
          )}
        </div>
        {/* Edit Name Modal */}
        {isOpen && dashboardData && (
          <UserNameModal
            userId={user?.uid || ""}
            initialValue={dashboardData.fullName}
            fetchUserProfile={fetchUserProfile}
            onClose={() => setIsOpen(false)}
          />
        )}
        {isModalOpen && (
          <EditBusinessModal
            initialData={businessInfo}
            onSave={handleSave}
            onClose={() => setIsModalOpen(false)}
          />
        )}
        {isSocialModalOpen && dashboardData && (
          <SocialLinkModal
            initialValue={dashboardData.socialLink}
            onClose={() => setIsSocialModalOpen(false)}
            fetchUserProfile={fetchUserProfile}
            updateAction={updateSocialLinkBuyerProfileAction}
          />
        )}
      </div>
    </StripeConnectionGuard>
  );
}
