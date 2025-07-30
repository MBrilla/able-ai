"use client";
import React from 'react';
import Image from 'next/image'; // Or your Avatar component
import styles from './RehireWorkerCard.module.css'; // Create this CSS module
import { Edit, UserCircle, Loader2 } from 'lucide-react'; // Added UserCircle and Loader2

// Interface for the data needed for this card
// interface RehireWorkerData {
//   workerId: string;
//   name: string;
//   avatarUrl?: string;
//   role: string;
//   ableGigs: number;
//   experienceYears: string | number;
//   reviewKeywords: string[];
//   proposedHourlyRate: number;
//   proposedHours: number; // For calculating total
//   platformFeePercent: number;
//   paymentProviderFeeFixed: number; // e.g., 0.20 for Stripe's 20p
//   paymentProviderFeePercent: number; // e.g., 0.015 for Stripe's 1.5%
// }

const RehireWorkerCard = ({
  workerData, // : RehireWorkerData
  onEdit,
  onBook,
  isBooking = false,
}) => {
  const calculateTotalCost = () => {
    const subtotal = workerData.proposedHourlyRate * workerData.proposedHours;
    const ableFee = subtotal * (workerData.platformFeePercent / 100);
    const stripeFee = (subtotal + ableFee) * (workerData.paymentProviderFeePercent / 100) + workerData.paymentProviderFeeFixed;
    return subtotal + ableFee + stripeFee;
  };

  const totalCost = calculateTotalCost();

  return (
    <div className={styles.card}>
      <button onClick={onEdit} className={styles.editButton} aria-label="Edit rehire details">
        <Edit size={18} />
      </button>
      <div className={styles.profileHeader}>
        {workerData.avatarUrl ? (
          <Image src={workerData.avatarUrl} alt={workerData.name} width={70} height={70} className={styles.avatar} />
        ) : (
          <div className={styles.avatarPlaceholder}><UserCircle size={40}/></div> // Assuming UserCircle exists
        )}
        <div className={styles.nameRole}>
          <h3 className={styles.name}>{workerData.name}</h3>
          <p className={styles.role}>
            {workerData.role}, {workerData.ableGigs} Able gigs, {workerData.experienceYears} experience
          </p>
        </div>
      </div>

      <p className={styles.keywords}>
        Keywords from client reviews include: {workerData.reviewKeywords.join(', ')}.
      </p>

      <div className={styles.pricingAndAction}>
        <div className={styles.pricingDetails}>
          <p className={styles.rate}>£{workerData.proposedHourlyRate.toFixed(2)}/hr</p>
          <p className={styles.totalCost}>
            Total incl. Able & payment provider fees: <br/>
            <span className={styles.totalAmount}>£{totalCost.toFixed(2)}</span>
            {/* Tooltip/Info icon could show fee breakdown on hover */}
          </p>
        </div>
        <button onClick={onBook} className={styles.bookButton} disabled={isBooking}>
          {isBooking ? <Loader2 size={20} className="animate-spin"/> : `Yes! Book £${totalCost.toFixed(2)}`}
        </button>
      </div>
    </div>
  );
};
export default RehireWorkerCard; 