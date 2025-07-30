"use client";
import React from 'react';
import styles from './AcceptedGigCard.module.css';
import { MapPin, CalendarDays, Clock, DollarSign, Info } from 'lucide-react';

const AcceptedGigCard = ({
  gig,
  onViewDetails,
}) => {
  const totalPayDisplay = gig.totalPay
    ? `£${gig.totalPay.toFixed(2)} + tips`
    : gig.estimatedHours
      ? `Est. £${(gig.hourlyRate * gig.estimatedHours).toFixed(2)} + tips`
      : null;

  return (
    <div className={styles.card} onClick={() => onViewDetails(gig.id)}>
      <h3 className={styles.role}>{gig.role}</h3>
      <div className={styles.gigDetails}>
          {/* <p className={styles.gigLocation}>
            <span className={styles.detailIcon}><MapPin size={12} /></span>
            {gig.locationSnippet}
          </p> */}
          {/* <p className={styles.gigTime}>
            <span className={styles.detailIcon}><Clock size={12} /></span>
            {gig.timeString}
          </p> */}
          <p className={styles.gigDate}>
            {/* <span className={styles.detailIcon}><CalendarDays size={12} /></span> */}
            {gig.dateString}
          </p>
          {/* <p className={styles.gigPay}>
            <span className={styles.detailIcon}><DollarSign size={12} /></span>
            {totalPayDisplay ? totalPayDisplay : `£${gig.hourlyRate.toFixed(2)}/hr + tips`}
          </p> */}
      </div>
    </div>
  );
};

export default AcceptedGigCard; 