"use client";

import React, { useEffect, useState } from "react";
import { useAuth, User } from "@/context/AuthContext";
import { useParams } from "next/navigation"; // Added useParams
import GigDetailsComponent from "@/app/components/gigs/GigDetails";
import type GigDetails from "@/app/types/GigDetailsTypes"; // Assuming you have this type defined
import { getGigDetails } from "@/actions/gigs/get-gig-details";

async function fetchBuyerGigDetails(user: User, gigId: string): Promise<GigDetails | null> {
  console.log("Fetching gig details for buyer:", user?.uid, "gig:", gigId);

  const isViewQA = user?.claims.role === "QA";
  const { gig, status } = await getGigDetails({ gigId, userId: user?.uid, role: 'buyer', isViewQA });

  if (!gig || status !== 200) return null;

  return gig;
}

export default function BuyerGigDetailsPage() {
  const params = useParams();
  const pageUserId = params.userId as string;
  const { user, loading: loadingAuth } = useAuth();
  const authUserId = user?.uid;

  const gigId = params.gigId as string;
  const [isLoadingGig, setIsLoadingGig] = useState(false);
  const [gig, setGig] = useState<GigDetails | null>(null);

  useEffect(() => {
    if (loadingAuth || !authUserId) return; // Wait for auth state to be clear

    const shouldFetch = (user?.claims.role === "QA" && pageUserId && gigId) ||
      (user && authUserId === pageUserId && gigId);

    if (shouldFetch) {
      setIsLoadingGig(true);
      fetchBuyerGigDetails(user, gigId) // pageUserId is correct here (worker's ID from URL)
        .then(data => {
          if (data) {
            setGig(data);
            setIsLoadingGig(false);
            console.log("Gig details fetched successfully:", data);
          }
        })

    }
  }, [loadingAuth, user, authUserId, pageUserId, gigId, setIsLoadingGig]);

  if (isLoadingGig || !gig) {
    return <div>Loading gig details...</div>;
  }

  return (
    // <div className={styles.container}>
    //   {/* Header */}
    //   <header className={styles.header}>
    //     <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
    //       <Logo width={50} height={50} />
    //       <h1 className={styles.pageTitle}>{gig.title}</h1>
    //     </div>
    //     <button className={styles.chatButton} aria-label="Chat">
    //       <MessageSquare size={40} className={styles.icon} fill="#ffffff"/>
    //     </button>
    //   </header>

    //   {/* Gig Details Card */}
    //   <section className={styles.gigDetailsSection}>
    //     <div className={styles.gigDetailsHeader}>
    //        <h2 className={styles.sectionTitle}>Gig Details</h2>
    //        <Calendar size={26} color='#ffffff'/>
    //     </div>
    //     <div className={styles.gigDetailsRow}>
    //       <span className={styles.label}>Location:</span>
    //       <span className={styles.detailValue}>{gig.location}</span>
    //     </div>
    //     <div className={styles.gigDetailsRow}>
    //       <span className={styles.label}>Date:</span>
    //       <span className={styles.detailValue}>
    //         {new Date(gig.date).toLocaleDateString(undefined, {
    //           weekday: "long",
    //           year: "numeric",
    //           month: "long",
    //           day: "numeric",
    //         })}
    //       </span>
    //     </div>
    //     <div className={styles.gigDetailsRow}>
    //       <span className={styles.label}>Time:</span>
    //       <span className={styles.detailValue}>
    //         {gig.startTime} PM - {gig.endTime} AM
    //       </span>
    //     </div>
    //     <div className={styles.gigDetailsRow}>
    //       <span className={styles.label}>Pay per hour:</span>
    //       <span className={styles.detailValue}>£{gig.hourlyRate}</span>
    //     </div>
    //     <div className={styles.gigDetailsRow}>
    //       <span className={styles.label}>Total cost:</span>
    //       <span className={styles.detailValue}>
    //         incl Able fees +VAT and Stripe fees:{" "}
    //         <b>£{gig.totalCost.toFixed(2)}</b>
    //       </span>
    //     </div>
    //   </section>

    //   {/* Worker Card */}
    //   <section
    //     className={`${styles.gigDetailsSection} ${pageStyles.workerSection}`}
    //   >
    //     <Image
    //       src={worker.avatarUrl}
    //       className={pageStyles.workerAvatar}
    //       alt={worker.name}
    //       width={56}
    //       height={56}
    //     />
    //     <div className={pageStyles.workerDetailsContainer}>
    //       <div className={pageStyles.workerDetails}>
    //         <span className={pageStyles.workerName}>
    //           {worker.name}
    //         </span>
    //          {worker.gigs} Able gigs, {worker.experience} years experience
    //       </div>
    //       {worker.isStar && <Image src="/images/star.svg" alt="Star" width={56} height={50} />}
    //     </div>
    //   </section>

    //   {/* Special Instructions */}
    //   <section className={styles.instructionsSection}>
    //     <h2 className={styles.sectionTitle}>
    //       <Info size={18} />
    //       Special Instructions
    //     </h2>
    //     <p className={styles.specialInstructions}>{gig.specialInstructions}</p>
    //   </section>

    //   {/* Stepper/Status */}
    //   <section style={{ margin: "24px 0" }}>
    //     <ol style={{ listStyle: "none", padding: 0, margin: 0 }}>
    //       {stepLabels.map((label, idx) => (
    //         <li
    //           key={label}
    //           style={{
    //             background: gig.status === idx + 1 ? "#5dade2" : "#23272b",
    //             color: gig.status === idx + 1 ? "#fff" : "#c2c2c2",
    //             borderRadius: 24,
    //             padding: "12px 0",
    //             marginBottom: 8,
    //             textAlign: "center",
    //             fontWeight: 600,
    //             fontSize: 16,
    //             border:
    //               gig.status === idx + 1
    //                 ? "2px solid #5dade2"
    //                 : "1px solid #23272b",
    //             transition: "all 0.2s",
    //           }}
    //         >
    //           <span style={{ marginRight: 8, fontWeight: 700 }}>{idx + 1}</span>{" "}
    //           {label}
    //         </li>
    //       ))}
    //     </ol>
    //   </section>

    //   {/* Action Buttons */}
    //   <section className={styles.actionSection}>
    //     <button className={styles.negotiationButton} disabled>
    //       Cancel, amend gig timing or add tips
    //     </button>
    //     <div className={styles.secondaryActionsSection}>
    //       <Link
    //         href="/terms-of-service"
    //         target="_blank"
    //         rel="noopener noreferrer"
    //         className={styles.secondaryActionButton}
    //       >
    //         <FileText size={16} style={{ marginRight: "8px" }} />
    //         Terms of Agreement
    //       </Link>
    //       <button className={styles.secondaryActionButton}>
    //         <AlertCircle size={16} style={{ marginRight: "8px" }} />
    //         Report an issue
    //       </button>
    //     </div>
    //   </section>
    // </div>
    <GigDetailsComponent userId={pageUserId} role="buyer" gig={gig} setGig={setGig} />
  );
}
