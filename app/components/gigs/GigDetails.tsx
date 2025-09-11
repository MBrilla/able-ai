/* eslint-disable max-lines-per-function */
import { Calendar, Check, Info, MessageSquare, Clock, XCircle, ChevronLeft } from 'lucide-react';
import Logo from '../brand/Logo';
import styles from './GigDetails.module.css';
import { useRouter } from 'next/navigation';
import GigActionButton from '../shared/GigActionButton';
import Link from 'next/link';
import { useState } from 'react';
import type GigDetails from '@/app/types/GigDetailsTypes';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { getLastRoleUsed } from '@/lib/last-role-used';
import { updateGigOfferStatus } from '@/actions/gigs/update-gig-offer-status';
import { holdGigFunds } from '@/app/actions/stripe/create-hold-gig-Funds';
import { deleteGig } from '@/actions/gigs/delete-gig';
import { toast } from 'sonner';
import ScreenHeaderWithBack from '../layout/ScreenHeaderWithBack';
import GigStatusIndicator from '../shared/GigStatusIndicator';
import { acceptGigOffer } from '@/actions/gigs/accept-gig-offer';
import { declineGigOffer } from '@/actions/gigs/decline-gig-offer';

const formatGigDate = (isoDate: string) =>
  new Date(isoDate).toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
const formatGigTime = (isoTime: string) =>
  new Date(isoTime).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
const calculateDuration = (startIso: string, endIso: string): string => {
  const startDate = new Date(startIso);
  const endDate = new Date(endIso);
  const diffMs = endDate.getTime() - startDate.getTime();
  if (diffMs <= 0) return "N/A";
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  let durationStr = "";
  if (hours > 0) durationStr += `${hours} hour${hours > 1 ? "s" : ""}`;
  if (minutes > 0) durationStr += ` ${minutes} minute${minutes > 1 ? "s" : ""}`;
  return durationStr.trim() || "N/A";
};

interface GigDetailsProps {
  userId: string;
  role: "buyer" | "worker";
  gig: GigDetails;
  setGig: (gig: GigDetails) => void; // Function to update gig state
  isAvailableOffer?: boolean; // Whether this gig is an available offer for workers
  isCheckingOffer?: boolean; // Whether we're checking if this is an offer
}


function getGigAcceptActionText(gig: GigDetails, role: string): string {
	const status = gig.status;
	const internalStatus = gig.statusInternal;

	if (internalStatus === 'PENDING_WORKER_ACCEPTANCE') {
		if (role === "worker") {
			return 'Waiting for rate acceptance';
		} else {
			return 'Agree to Rate - Accept and Hold Payment';
		}
	}
	if (status === 'PENDING') {
		if (role === "worker") {
			return 'Accept Gig';
		} else {
			return 'Offer Sent-awaiting acceptance';
		}
	}
	else return 'Gig Accepted';
}

const GigDetailsComponent = ({ userId, role, gig, setGig, isAvailableOffer = false, isCheckingOffer = false }: GigDetailsProps) => {
	const router = useRouter();
	const [isActionLoading, setIsActionLoading] = useState(false);
	const { user } = useAuth();

	// Helper function to determine if user can delegate this gig
	const canDelegateGig = () => {
		if (role === 'buyer') {
			// Buyers can always delegate their gigs
			return true;
		} else if (role === 'worker') {
			// Workers can only delegate gigs they have already accepted
			// They cannot delegate available offers (PENDING_WORKER_ACCEPTANCE)
			// They must first accept the gig, then they can delegate it
			return gig.statusInternal !== 'PENDING_WORKER_ACCEPTANCE' && gig.workerName;
		}
		
		return false;
	};
	const [isNegotiating, setIsNegotiating] = useState(false);
	const [isReportingIssue, setIsReportingIssue] = useState(false);
	const [isDelegating, setIsDelegating] = useState(false);
	const [isLoadingTerms, setIsLoadingTerms] = useState(false);

      if (difference <= 0) {
        setTimeLeft("Expired");
        return;
      }

	// Get worker name from gig data if available, otherwise use a placeholder
	const getWorkerName = () => {
		// If there's a worker assigned to the gig, use their name
		if (gig.workerName) {
			return gig.workerName.split(" ")[0];
		}
		// If this is a worker viewing their own gig, use their name
		if (role === 'worker') {
			return user?.displayName?.split(" ")[0] || "Worker";
		}
		// Fallback for when no worker is assigned yet
		return "Worker";
	};

	const workerName = getWorkerName();

	// Get worker stats with fallbacks
	const getWorkerStats = () => {
		return {
			gigs: gig.workerGigs || 0,
			experience: gig.workerExperience || 0,
			isStar: gig.isWorkerStar || false
		};
	};

	const workerStats = getWorkerStats();

	const getButtonLabel = (action: string) => {
		const status = gig.status;

		switch (action) {
			case 'accept':
				if (status === 'PENDING') {
					return role === "worker"
					? 'Accept Gig'
					: 'Offer Sent - awaiting acceptance';
				}
				return 'Gig Accepted';

			case 'start':
				if (status === 'PENDING' || status === 'ACCEPTED') {
					return role === "worker"
						? 'Mark as you started the gig'
						: 'Mark as started';
				} 
				return role === "worker"
					? 'Gig Started'
					: `${workerName} has started the gig`;
			case 'complete':
				if (status === 'PENDING' || status === 'ACCEPTED' || status === 'IN_PROGRESS') {
					return role === "worker" ? 'Mark as complete' : `Mark as complete, pay ${workerName}`;
				} else {
					// If the gig is completed, show the appropriate message
					if (gig.isWorkerSubmittedFeedback && !gig.isBuyerSubmittedFeedback) {
						return role === "worker" ? 'Gig Completed' : `🕒Confirm, pay and review ${workerName}`;
					} else if (gig.isBuyerSubmittedFeedback && !gig.isWorkerSubmittedFeedback) {
						return role === "worker" ? 'Buyer confirmed & paid: leave feedback' : `${workerName} has completed the gig`;
					} else {
						return role === "worker" ? 'Gig Completed' : `${workerName} has completed the gig`;
					}
				}
			case 'awaiting':
				if (role === "worker") {
					return !gig.isBuyerSubmittedFeedback 
					? `Waiting for ${buyer} to confirm and pay` 
					: (
						<span className={styles.awaitingText}>
							<Check color="#000000" /> {buyer} Paid £{gig.estimatedEarnings}
						</span>
					);
				}
				return gig.isBuyerSubmittedFeedback 
					? (
						<span className={styles.awaitingText}>
							<Check color="#000000" /> Paid £{gig.estimatedEarnings}
						</span>
					)
					: 'Pay';
			default:
				return '';
		}
	};

	const handleGigAction = async (action: 
		'accept' | 
		'start' | 
		'complete' | 
		'requestAmendment' | 
		'reportIssue' | 
		'delegate' |
		'awaiting' | 
		'confirmed' | 
		'requested' | 
		'delete' | 
		'decline' | 
		'paid'
	) => {
        if (!gig) return;
        setIsActionLoading(true);
        console.log(`Performing action: ${action} for gig: ${gig.id}`);
        
        try {
			await new Promise(resolve => setTimeout(resolve, 1000));

			{/* MBrilla change
			if (action === 'accept' && role === 'worker' && gig.statusInternal === 'PENDING_WORKER_ACCEPTANCE') {
				const result = await acceptGigOffer({ gigId: gig.id, userId: userId });
				if (result.error) {
					toast.error(result.error);
					return;
				}
				setGig({ ...gig, status: 'ACCEPTED', statusInternal: 'ACCEPTED' });
				toast.success('Gig offer accepted successfully! You can now start the gig when ready.');
				
				// Optionally redirect to worker home or refresh the page after a short delay
				setTimeout(() => {
					router.push(`/user/${user?.uid}/worker`);
				}, 2000);
				return;
			}
			if (action === 'decline' && role === 'worker' && gig.statusInternal === 'PENDING_WORKER_ACCEPTANCE') {
				const result = await declineGigOffer({ gigId: gig.id, userId: userId });
				if (result.error) {
					toast.error(result.error);
					return;
				}
				setGig({ ...gig, status: 'CANCELLED', statusInternal: 'DECLINED_BY_WORKER' });
				toast.success('Gig offer declined successfully!');
				
				// Redirect back to offers page after declining
				setTimeout(() => {
					router.push(`/user/${user?.uid}/worker/offers`);
				}, 1500);
				return;
			}*/}
			if (action === 'accept' && gig && role === 'worker') {
				const result = await acceptGigOffer({ gigId: gig.id, userId: user?.uid || '' });
				if (result.error) {
					toast.error(result.error);
					return;
				}
				setGig({ 
					...gig, 
					status: 'ACCEPTED', 
					statusInternal: 'ACCEPTED',
					workerName: user?.displayName || 'Worker'
				});
				toast.success('Gig offer accepted successfully! You can now start the gig when ready.');
			}
			else if (action === 'start' && gig) {
				setGig({ ...gig, status: 'IN_PROGRESS' });
				await updateGigOfferStatus({ gigId: gig.id, userId: userId, role: role, action: 'start' });
				toast.success('Gig started successfully!');
			} else if (action === 'complete' && gig) {
				setGig({ ...gig, status: 'COMPLETED'});
				await updateGigOfferStatus({ gigId: gig.id, userId: userId, role: role, action: 'complete' });
				toast.success('Gig completed successfully!');
				// redirect to feedback page 
				if (role === "worker") {
					router.push(`/user/${user?.uid}/worker/gigs/${gig.id}/feedback`);
				} else {
					router.push(`/user/${user?.uid}/buyer/gigs/${gig.id}/feedback`);
				}
			} else if (action === 'confirmed') {
				setGig({ ...gig, status: 'CONFIRMED' });
				toast.success('Gig confirmed successfully!');
			} else if (action === 'requestAmendment') {
				// Navigate to the amend page using the correct user profile structure
				router.push(`/user/${userId}/worker/gigs/${gig.id}/amend`);
			} else if (action === 'reportIssue') {
				// Navigate to the report issue page using the correct path structure
				router.push(`/gigs/${gig.id}/report-issue`);
			} else if (action === 'delegate') {
				// Navigate to the delegate gig page using the correct path structure
				router.push(`/gigs/${gig.id}/delegate`);
			} else if (action === 'delete') {
				await deleteGig({ gigId: gig.id, userId: userId });
				toast.success('Gig deleted successfully!');
				router.push(`/user/${user?.uid}/buyer`);
			} else if (action === 'paid') {
				// Handle payment confirmation
				toast.success('Payment confirmed!');
				// You can add payment confirmation logic here
			}
        } catch (error) {
            console.error('Error performing gig action:', error);
            toast.error('Failed to perform action. Please try again.');
        } finally {
            setIsActionLoading(false);
        }
    };

	// Handler for negotiating gig details
	const handleNegotiateGig = () => {
		if (!user?.uid || !gig.id) return;

		// Navigate to the amend page - need to get the current user's profile ID
		const currentUserId = userId; // This should be the worker's profile ID from props
		router.push(`/user/${currentUserId}/worker/gigs/${gig.id}/amend`);
	};

	// Handler for reporting an issue
	const handleReportIssue = () => {
		if (!user?.uid || !gig.id) return;

		// Navigate to the report issue page
		const currentUserId = userId; // This should be the worker's profile ID from props
		router.push(`/user/${currentUserId}/worker/gigs/${gig.id}/report-issue`);
	};

	// Handler for delegating gig
	const handleDelegateGig = () => {
		if (!user?.uid || !gig.id) return;

		// Navigate to the delegate gig page
		router.push(`/gigs/${gig.id}/delegate`);
	};

	// Handler for viewing terms of agreement
	const handleViewTerms = () => {
		// Navigate to the existing terms page
		router.push('/legal/terms');
	};

	// New UI design for workers based on the image
	if (lastRoleUsed === "GIG_WORKER" && role === 'worker') {
		return (
			<div className={styles.workerContainer}>
				{/* Header */}
				<header className={styles.workerHeader}>
					<div className={styles.headerLeft}>
						<button className={styles.backButton} onClick={() => router.back()}>
							<ChevronLeft size={20} color="#ffffff" />
						</button>
						<div className={styles.logoContainer}>
							<Logo width={50} height={50} />
						</div>
						<h1 className={styles.workerPageTitle}>{gig.role} Gig</h1>
					</div>
					<button className={styles.workerChatButton}>
						<MessageSquare size={30} color="#ffffff" />
					</button>
				</header>

				<main className={styles.workerMain}>
					{/* Gig Details Section */}
					<section className={styles.workerGigDetailsSection}>
						<div className={styles.workerGigDetailsHeader}>
							<h2 className={styles.workerSectionTitle}>Gig Details</h2>
							<Calendar size={20} color="#ffffff" />
						</div>

						<div className={styles.workerGigDetailsRow}>
							<span className={styles.workerLabel}>Location:</span>
							<span className={styles.workerDetailValue}>{gig.location}</span>
						</div>
						<div className={styles.workerGigDetailsRow}>
							<span className={styles.workerLabel}>Date:</span>
							<span className={styles.workerDetailValue}>{formatGigDate(gig.date)}</span>
						</div>
						<div className={styles.workerGigDetailsRow}>
							<span className={styles.workerLabel}>Time:</span>
							<span className={styles.workerDetailValue}>{formatGigTime(gig.startTime)} - {formatGigTime(gig.endTime)}</span>
						</div>
						<div className={styles.workerGigDetailsRow}>
							<span className={styles.workerLabel}>Pay per hour:</span>
							<span className={styles.workerDetailValue}>£{gig.hourlyRate.toFixed(2)}</span>
						</div>
						<div className={styles.workerGigDetailsRow}>
							<span className={styles.workerLabel}>Total Pay:</span>
							<span className={styles.workerDetailValue}>£{gig.estimatedEarnings.toFixed(2)}</span>
						</div>
						<div className={styles.workerGigDetailsRow}>
							<span className={styles.workerLabel}>Hiring manager:</span>
							<span className={styles.workerDetailValue}>{gig.buyerName} @{gig.buyerName.toLowerCase().replace(/\s+/g, '')}</span>
						</div>
					</section>

					{/* Negotiation Button */}
					<button 
						className={styles.workerNegotiationButton} 
						onClick={handleNegotiateGig}
						disabled={isNegotiating}
					>
						{isNegotiating ? 'Opening...' : 'Negotiate, cancel or change gig details'}
					</button>

					{/* Special Instructions Section */}
					{gig.specialInstructions && (
						<section className={styles.workerInstructionsSection}>
							<h2 className={styles.workerSpecialInstTitle}>Special Instructions</h2>
							<p className={styles.workerSpecialInstructions}>{gig.specialInstructions}</p>
						</section>
					)}

					{/* Workflow Buttons */}
					<section className={styles.workerWorkflowSection}>
						{/* Step 1: Accept Gig */}
						<button 
							className={`${styles.workerWorkflowButton} ${gig.status === 'PENDING' ? styles.workerWorkflowButtonActive : styles.workerWorkflowButtonInactive}`}
							onClick={() => gig.status === 'PENDING' && handleGigAction('accept')}
							disabled={gig.status !== 'PENDING' || isActionLoading}
						>
							<div className={styles.workerWorkflowStep}>1</div>
							<span>Accept gig</span>
						</button>

						{/* Step 2: Mark Started */}
						<button 
							className={`${styles.workerWorkflowButton} ${gig.status === 'ACCEPTED' ? styles.workerWorkflowButtonActive : styles.workerWorkflowButtonInactive}`}
							onClick={() => gig.status === 'ACCEPTED' && handleGigAction('start')}
							disabled={gig.status !== 'ACCEPTED' || isActionLoading}
						>
							<div className={styles.workerWorkflowStep}>2</div>
							<span>Mark you have started your shift</span>
						</button>

						{/* Step 3: Mark Complete */}
						<button 
							className={`${styles.workerWorkflowButton} ${gig.status === 'IN_PROGRESS' ? styles.workerWorkflowButtonActive : styles.workerWorkflowButtonInactive}`}
							onClick={() => gig.status === 'IN_PROGRESS' && handleGigAction('complete')}
							disabled={gig.status !== 'IN_PROGRESS' || isActionLoading}
						>
							<div className={styles.workerWorkflowStep}>3</div>
							<span>Mark as complete</span>
						</button>

						{/* Step 4: Paid */}
						<button 
							className={`${styles.workerWorkflowButton} ${gig.status === 'COMPLETED' ? styles.workerWorkflowButtonActive : styles.workerWorkflowButtonInactive}`}
							onClick={() => gig.status === 'COMPLETED' && handleGigAction('paid')}
							disabled={gig.status !== 'COMPLETED' || isActionLoading}
						>
							<div className={styles.workerWorkflowStep}>4</div>
							<span>Paid</span>
						</button>
					</section>

					{/* Additional Action Buttons */}
					<section className={styles.workerAdditionalActions}>
						<button 
							className={styles.workerAdditionalButton} 
							onClick={handleReportIssue}
							disabled={isReportingIssue}
						>
							{isReportingIssue ? 'Opening...' : 'Report an issue'}
						</button>
						<button 
							className={styles.workerAdditionalButton} 
							onClick={handleDelegateGig}
							disabled={isDelegating}
						>
							{isDelegating ? 'Opening...' : 'Delegate gig'}
						</button>
					</section>

					{/* Terms of Agreement Button */}
					<button 
						className={styles.workerTermsButton} 
						onClick={handleViewTerms}
						disabled={isLoadingTerms}
					>
						{isLoadingTerms ? 'Opening...' : 'Terms of Agreement'}
					</button>
				</main>
			</div>
		);
	}

	// Original UI for buyers
	return (
		<div className={styles.container}>
			<ScreenHeaderWithBack title={`${gig.role} Gig`} onBackClick={() => router.back()} />

    return () => clearInterval(intervalId);
  }, [gig.expiresAt]);

					{role === "worker" && (
						<div className={styles.gigDetailsRow}>
							<span className={styles.label}>Hiring manager:</span>
							<span className={styles.detailValue}>{gig.hiringManager} <br /> {gig.hiringManagerUsername}</span>
						</div>
					)}

  const workerName = getWorkerName();

  // Get worker stats with fallbacks
  const getWorkerStats = () => {
    return {
      gigs: gig.workerGigs || 0,
      experience: gig.workerExperience || 0,
      isStar: gig.isWorkerStar || false,
    };
  };

				{role === "worker" && (
					<section
						className={`${styles.gigDetailsSection} ${styles.workerSection}`}
					>
						{gig.workerAvatarUrl ? (
							<Image
								src={gig.workerAvatarUrl}
								className={styles.workerAvatar}
								alt={gig.workerName || "Worker"}
								width={56}
								height={56}
								onError={(e) => {
									// Fallback to placeholder if image fails to load
									const target = e.target as HTMLImageElement;
									target.src = "/images/default-avatar.svg";
								}}
							/>
						) : (
							<div className={styles.workerAvatar}>
								<Image
									src="/images/default-avatar.svg"
									alt={gig.workerName || "Worker"}
									width={56}
									height={56}
								/>
							</div>
						)}
						<div className={styles.workerDetailsContainer}>
							<div className={styles.workerDetails}>
								<span className={styles.workerName}>
									{gig.workerName || "Worker"}
								</span>
								{workerStats.gigs} Able gigs, {workerStats.experience} years experience
							</div>
							{workerStats.isStar && <Image src="/images/star.svg" alt="Star" width={56} height={50} />}
						</div>
					</section>
				)}

				{/* Worker Information Section - Show when gig is accepted and worker is assigned */}
				{gig.status === 'ACCEPTED' && gig.workerName && (
					<section className={`${styles.gigDetailsSection} ${styles.workerInfoSection}`}>
						<div className={styles.sectionHeader}>
							<h3 className={styles.sectionTitle}>Assigned Worker</h3>
						</div>
						<div className={styles.workerInfoContainer}>
							<Image
								src={gig.workerAvatarUrl || "/images/worker-placeholder.png"}
								className={styles.workerAvatar}
								alt={gig.workerName}
								width={48}
								height={48}
							/>
							<div className={styles.workerInfoDetails}>
								<span className={styles.workerName}>{gig.workerName}</span>
								<span className={styles.workerStats}>
									{workerStats.gigs} Able gigs • {workerStats.experience} years experience
								</span>
								{workerStats.isStar && (
									<div className={styles.starBadge}>
										<Image src="/images/star.svg" alt="Star Worker" width={16} height={16} />
										<span>Star Worker</span>
									</div>
								)}
							</div>
						</div>
					</section>
				)}

  const gigDuration = calculateDuration(gig.startTime, gig.endTime);
  const buyer = gig.buyerName.split(" ")[0];

  const getButtonLabel = (action: string) => {
    const status = gig.status;

				{/* Primary Actions Section - Adapted to new structure */}
				<section className={styles.actionSection}>
					<GigActionButton
						label={getButtonLabel('accept')}
						handleGigAction={() => handleGigAction('accept')}
						isActive={gig.status === 'PENDING'}
						isDisabled={role === "buyer" || gig.status !== 'PENDING'}
					/>

					{gig.status === 'IN_PROGRESS' && (
						<div className={styles.statusMessage}>
							<div className={styles.statusInProgress}>
								<Clock size={20} color="#f59e0b" />
								<span>Gig In Progress</span>
							</div>
							<p className={styles.statusDescription}>
								{lastRoleUsed === "GIG_WORKER" 
									? "You've started the gig. Complete it when finished."
									: "The worker has started the gig. They will mark it complete when finished."
								}
							</p>
						</div>
					)}

					{/* 3. Complete Gig */}
					<GigActionButton
						label={getButtonLabel('complete')}
						handleGigAction={() => handleGigAction('complete')}
						isActive={
							(
								gig.status === 'IN_PROGRESS' || 
								gig.status === 'COMPLETED' || 
								gig.status === 'CONFIRMED' || 
								gig.status === 'AWAITING_BUYER_CONFIRMATION'
							) && (
								(role === "worker" && !gig.isWorkerSubmittedFeedback) ||
								(role === "buyer" && !gig.isBuyerSubmittedFeedback)
							)
						}
						isDisabled={
							(role === "worker" && gig.isWorkerSubmittedFeedback) ||
							(role === "buyer" && gig.isBuyerSubmittedFeedback)
						}
					/>

					{gig.status === 'CANCELLED' && (
						<div className={styles.statusMessage}>
							<div className={styles.statusCancelled}>
								<XCircle size={20} color="#ef4444" />
								<span>Gig Cancelled</span>
							</div>
							<p className={styles.statusDescription}>
								This gig has been cancelled and is no longer active.
							</p>
						</div>
					)}

					{/* Accept Button - Only show for pending gigs */}
					{gig.status === 'PENDING' && (
						<GigActionButton
							label={getButtonLabel('accept')}
							handleGigAction={() => handleGigAction('accept')}
							isActive={gig.status === 'PENDING'}
							isDisabled={lastRoleUsed !== "GIG_WORKER" || gig.status !== 'PENDING'}
						/>
					)}

					{/* Decline button for gig offers */}
					{lastRoleUsed === "GIG_WORKER" && gig.statusInternal === 'PENDING_WORKER_ACCEPTANCE' && (
						<GigActionButton
							label="Decline Offer"
							handleGigAction={() => handleGigAction('decline')}
							isActive={true}
							isDisabled={false}
						/>
					)}

					{/* Start Gig Button - Only show for accepted gigs */}
					{gig.status === 'ACCEPTED' && (
						<GigActionButton
							label={getButtonLabel('start')}
							handleGigAction={() => handleGigAction('start')}
							isActive={gig.status === 'ACCEPTED'}
							isDisabled={gig.status !== 'ACCEPTED'}
						/>
					)}

					{/* Complete Gig Button - Show for in-progress or completed gigs */}
					{(gig.status === 'IN_PROGRESS' || gig.status === 'COMPLETED') && (
						<GigActionButton
							label={getButtonLabel('complete')}
							handleGigAction={() => handleGigAction('complete')}
							isActive={
								(
									gig.status === 'IN_PROGRESS' || 
									gig.status === 'COMPLETED' || 
									gig.status === 'CONFIRMED' || 
									gig.status === 'AWAITING_BUYER_CONFIRMATION'
								) && (
									(lastRoleUsed === "GIG_WORKER" && !gig.isWorkerSubmittedFeedback) ||
									(lastRoleUsed === "BUYER" && !gig.isBuyerSubmittedFeedback)
								)
							}
							isDisabled={
								(lastRoleUsed === "GIG_WORKER" && gig.isWorkerSubmittedFeedback) ||
								(lastRoleUsed === "BUYER" && gig.isBuyerSubmittedFeedback)
							}
						/>
					)}

					{/* Awaiting Buyer Confirmation Status */}
					<GigStatusIndicator
						label={getButtonLabel('awaiting')}
						isActive={
							(role === "worker" && gig.isWorkerSubmittedFeedback) ||
							(role === "buyer" && gig.isBuyerSubmittedFeedback)
						}
						isDisabled={true}
					/>
				</section>

				{/* Secondary Actions Section - Adapted to new structure */}
				<section className={`${styles.secondaryActionsSection}`}> {/* Using secondaryActionsSection class */}
					<Link href="/terms-of-service" target="_blank" rel="noopener noreferrer" className={styles.secondaryActionButton}>
						Terms of agreement
					</Link>
					<button onClick={() => handleGigAction('reportIssue')} className={styles.secondaryActionButton} disabled={isActionLoading}>
						Report an Issue
					</button>
					{canDelegateGig() && (
						<button onClick={handleDelegateGig} className={styles.secondaryActionButton} disabled={isActionLoading}>
							Delegate gig
						</button>
					)}
				</section>

          if (!result.success) {
            toast.error(result.error || "Failed to start gig");
            return;
          }

          setGig({ ...gig, status: "IN_PROGRESS" });
          toast.success("Gig started successfully!");
        }

        case "complete":
          {
            const result = await updateGigOfferStatus({
              gigId: gig.id,
              userUid: user?.uid || "",
              role,
              action: "complete",
            });

            if (!result.success) {
              toast.error(result.error || "Failed to complete gig");
              return;
            }

            setGig({ ...gig, status: "COMPLETED" });
            toast.success("Gig completed successfully!");
            router.push(
              role === "worker"
                ? `/user/${user?.uid}/worker/gigs/${gig.id}/feedback`
                : `/user/${user?.uid}/buyer/gigs/${gig.id}/feedback`
            );
          }
          break;

        case "confirmed":
          setGig({ ...gig, status: "CONFIRMED" });
          toast.success("Gig confirmed successfully!");
          break;

        case "requestAmendment":
          if (!user?.uid || !gig.id) return;

          const userRole = pathname.includes("/worker/") ? "worker" : "buyer";
          const path = `/user/${user?.uid}/${userRole}/gigs/${gig.id}/amend`;

          try {
            const result = await findExistingGigAmendment({
              gigId: gig.id,
              userId: user.uid,
            });

            if (result.error) {
              toast.error(result.error);
              return;
            }

            if (result.amendId) {
              router.push(`${path}/${result.amendId}`);
            } else {
              router.push(`${path}/new`);
            }
          } catch (error) {
            console.error("Failed to handle negotiation:", error);
            toast.error("Could not start negotiation. Please try again.");
          }
          break;

        case "reportIssue":
          router.push(`/gigs/${gig.id}/report-issue`);
          break;

        case "delegate":
          router.push(`/gigs/${gig.id}/delegate`);
          break;

        case "delete":
          await deleteGig({ gigId: gig.id, userId });
          toast.success("Gig deleted successfully!");
          router.push(`/user/${user?.uid}/buyer`);
          break;

        case "paid":
          toast.success("Payment confirmed!");
          // extra logic goes here
          break;

        default:
          console.warn(`Unknown action: ${action}`);
      }
    } catch (error) {
      console.error("Error performing gig action:", error);
      toast.error("Failed to perform action. Please try again.");
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <ScreenHeaderWithBack title={`${gig.role} Gig`} />

      {/* Core Gig Info Section - Adapted to new structure */}
      <main className={styles.gigDetailsMain}>
        <section className={styles.gigDetailsSection}>
          <div className={styles.gigDetailsHeader}>
            <h2 className={styles.sectionTitle}>Gig Details</h2>
            <Calendar size={26} color="#ffffff" />
          </div>
          <div className={styles.gigDetailsRow}>
            <span className={styles.label}>Location:</span>
            <span className={styles.detailValue}>
              {gig?.location?.formatted_address
                ? gig.location.formatted_address
                : "Location not provided"}
              {gig?.location?.lat && gig?.location?.lng && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${gig.location.lat},${gig.location.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ marginLeft: "0.5rem" }}
                >
                  (View Map)
                </a>
              )}
            </span>
          </div>
          <div className={styles.gigDetailsRow}>
            <span className={styles.label}>Date:</span>
            <span className={styles.detailValue}>
              {formatGigDate(gig.date)}
            </span>
          </div>
          <div className={styles.gigDetailsRow}>
            <span className={styles.label}>Time:</span>
            <span className={styles.detailValue}>
              {formatGigTime(gig.startTime)} - {formatGigTime(gig.endTime)} (
              {gigDuration})
            </span>
          </div>
          <div className={styles.gigDetailsRow}>
            <span className={styles.label}>Pay per hour:</span>
            <span className={styles.detailValue}>
              £{gig.hourlyRate.toFixed(2)}/hr
            </span>
          </div>
          <div className={styles.gigDetailsRow}>
            <span className={styles.label}>Total pay:</span>
            <span className={styles.detailValue}>
              £{gig.estimatedEarnings.toFixed(2)} + tips
            </span>
          </div>
          {/* Hiring Manager Info - Placeholder as it's not in current GigDetails interface */}

          {role === "worker" && (
            <div className={styles.gigDetailsRow}>
              <span className={styles.label}>Hiring manager:</span>
              <span className={styles.detailValue}>
                {gig.hiringManager} <br /> {gig.hiringManagerUsername}
              </span>
            </div>
          )}

          {timeLeft && (
            <div className={styles.timerContainer}>
              <Clock size={30} color="#fff" className={styles.timerIcon} />
              <span className={styles.timerText}>
                {timeLeft} <br /> to accept
              </span>
            </div>
          )}
        </section>

        {gig?.worker ? (
          <section
            className={`${styles.gigDetailsSection} ${styles.workerSection}`}
          >
            <ProfileVideo
              isSelfView={false}
              onVideoUpload={() => {}}
              videoUrl={gig.workerViderUrl}
            />
            <div className={styles.workerDetailsContainer}>
              <div className={styles.workerDetails}>
                <span className={styles.workerName}>
                  {gig.worker?.fullName || "Worker"}
                </span>
                {workerStats?.gigs && workerStats?.experience
                  ? `${workerStats.gigs} Able gigs, ${workerStats.experience} years experience`
                  : gig?.workerFullBio}
              </div>
              {workerStats.isStar && (
                <Image
                  src="/images/star.svg"
                  alt="Star"
                  width={56}
                  height={50}
                />
              )}
            </div>
          </section>
        ) : (
          <section
            className={`${styles.gigDetailsSection} ${styles.noWorkerSection}`}
          >
            <p>
              <VideoOff />
            </p>
            <div className={styles.noWorkerAssigned}>
              <p>No worker assigned yet</p>
            </div>
          </section>
        )}

        {/* Negotiation Button - Kept from new structure */}
        {/* Added a check to only show if gig is accepted */}
        {(gig.status === "PENDING" ||
          gig.status === "IN_PROGRESS" ||
          gig.status === "ACCEPTED") && (
          <button
            className={styles.negotiationButton}
            onClick={() => handleGigAction("requestAmendment")}
          >
            Negotiate, cancel or change gig details
          </button>
        )}

        {/* Special Instructions Section */}
        {gig.specialInstructions && (
          <section className={styles.instructionsSection}>
            <h2 className={styles.specialInstTitle}>
              <Info size={18} />
              Special Instructions
            </h2>
            <p className={styles.specialInstructions}>
              {gig.specialInstructions}
            </p>
          </section>
        )}

        {/* Primary Actions Section - Adapted to new structure */}
        <section className={styles.actionSection}>
          <GigActionButton
            label={getButtonLabel("accept")}
            handleGigAction={() => handleGigAction("accept")}
            isActive={gig.status === "PENDING" || gig.status === "CANCELLED"}
            isDisabled={
              (role === "worker" && gig.status !== "PENDING") ||
              (role === "buyer" && gig.status !== "CANCELLED")
            }
          />

          {/* 2. Start Gig */}
          <GigActionButton
            label={getButtonLabel("start")}
            handleGigAction={() => handleGigAction("start")}
            isActive={gig.status === "ACCEPTED"}
            isDisabled={gig.status !== "ACCEPTED"}
          />

          {/* 3. Complete Gig */}
          <GigActionButton
            label={getButtonLabel("complete")}
            handleGigAction={() => handleGigAction("complete")}
            isActive={
              (gig.status === "IN_PROGRESS" ||
                gig.status === "COMPLETED" ||
                gig.status === "CONFIRMED" ||
                gig.status === "AWAITING_BUYER_CONFIRMATION") &&
              ((role === "worker" && !gig.isWorkerSubmittedFeedback) ||
                (role === "buyer" && !gig.isBuyerSubmittedFeedback))
            }
            isDisabled={
              (role === "worker" && gig.isWorkerSubmittedFeedback) ||
              (role === "buyer" && gig.isBuyerSubmittedFeedback)
            }
          />

          {/* 4. Awaiting Buyer Confirmation */}

          <GigStatusIndicator
            label={getButtonLabel("awaiting")}
            isActive={
              (role === "worker" && gig.isWorkerSubmittedFeedback) ||
              (role === "buyer" && gig.isBuyerSubmittedFeedback)
            }
            isDisabled={true}
          />
        </section>

        {/* Secondary Actions Section - Adapted to new structure */}
        <section className={`${styles.secondaryActionsSection}`}>
          {" "}
          {/* Using secondaryActionsSection class */}
          <div className={styles.secondaryButtonsContainer}>
            <button
              onClick={() => handleGigAction("reportIssue")}
              className={styles.secondaryActionButton}
              disabled={isActionLoading}
            >
              Report an Issue
            </button>
            <button
              onClick={() => handleGigAction("delegate")}
              className={styles.secondaryActionButton}
              disabled={isActionLoading}
            >
              Delegate gig
            </button>
          </div>
          <Link
            href="/terms-of-service"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.termsLink}
          >
            Terms of agreement
          </Link>
        </section>
      </main>
    </div>
  );
};

export default GigDetailsComponent;
