'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import ScreenHeaderWithBack from '@/app/components/layout/ScreenHeaderWithBack';
import Image from 'next/image';
import styles from './AmendGigPage.module.css';

interface Gig {
  id: string;
  gigDescription: string;
  gigDate: string;
  gigTime: string;
  hourlyRate: number;
  location: string;
  statusInternal: string;
  buyerId: string;
  workerId: string;
}

export default function AmendGigPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [gig, setGig] = useState<Gig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [changes, setChanges] = useState('');
  const [updatedDetails, setUpdatedDetails] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [editedGigDetails, setEditedGigDetails] = useState<any>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const gigId = params.gigId as string;
  const userId = params.userId as string;

  useEffect(() => {
    const fetchGig = async () => {
      if (!user) return;
      
      try {
        const response = await fetch(`/api/gigs/${gigId}?userId=${user.uid}`);
        if (response.ok) {
          const gigData = await response.json();
          setGig(gigData);
          // Initialize edited gig details for editing
          setEditedGigDetails({
            location: gigData.location,
            date: gigData.gigDate,
            time: gigData.gigTime,
            payPerHour: gigData.hourlyRate,
            totalPay: calculateTotalPay(gigData.hourlyRate, calculateDuration(gigData.gigTime))
          });
        } else {
          console.error('Failed to fetch gig');
        }
      } catch (error) {
        console.error('Error fetching gig:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGig();
  }, [gigId, user]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatTime = (timeStr: string) => {
    // Check if it's an ISO datetime string with timezone (contains 'T' and 'Z' or timezone offset)
    if (timeStr.includes('T')) {
      try {
        // Split by ' - ' to get start and end times
        const [startTime, endTime] = timeStr.split(' - ');
        
        if (startTime && endTime) {
          const startDate = new Date(startTime);
          const endDate = new Date(endTime);
          
          // Format times in 12-hour format
          const startFormatted = startDate.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          });
          
          const endFormatted = endDate.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          });
          
          return `${startFormatted} - ${endFormatted}`;
        }
      } catch (error) {
        console.error('Error parsing datetime:', error);
      }
    }
    
    // Fallback to original parsing for simple time strings
    const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
    if (timeMatch) {
      const startHour = parseInt(timeMatch[1]);
      const startMin = timeMatch[2];
      const endHour = parseInt(timeMatch[3]);
      const endMin = timeMatch[4];
      
      const startPeriod = startHour >= 12 ? 'PM' : 'AM';
      const endPeriod = endHour >= 12 ? 'PM' : 'AM';
      
      const startDisplayHour = startHour > 12 ? startHour - 12 : startHour === 0 ? 12 : startHour;
      const endDisplayHour = endHour > 12 ? endHour - 12 : endHour === 0 ? 12 : endHour;
      
      return `${startDisplayHour}:${startMin} ${startPeriod} - ${endDisplayHour}:${endMin} ${endPeriod}`;
    }
    
    return timeStr;
  };

  const calculateDuration = (timeStr: string) => {
    // Check if it's an ISO datetime string
    if (timeStr.includes('T')) {
      try {
        const [startTime, endTime] = timeStr.split(' - ');
        if (startTime && endTime) {
          const startDate = new Date(startTime);
          const endDate = new Date(endTime);
          const durationMs = endDate.getTime() - startDate.getTime();
          const durationHours = durationMs / (1000 * 60 * 60);
          return Math.max(Math.round(durationHours), 1);
        }
      } catch (error) {
        console.error('Error calculating duration from datetime:', error);
      }
    }
    
    // Fallback to original parsing for simple time strings
    const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
    if (timeMatch) {
      const startHour = parseInt(timeMatch[1]);
      const endHour = parseInt(timeMatch[3]);
      const duration = endHour - startHour;
      return Math.max(duration, 1);
    }
    return 4;
  };

  const calculateTotalPay = (hourlyRate: number, duration: number) => {
    return (hourlyRate * duration).toFixed(2);
  };

  // Convert stored time format to user-friendly format for editing
  const timeToUserFriendly = (timeStr: string) => {
    const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
    if (timeMatch) {
      const startHour = parseInt(timeMatch[1]);
      const startMin = timeMatch[2];
      const endHour = parseInt(timeMatch[3]);
      const endMin = timeMatch[4];
      
      const startPeriod = startHour >= 12 ? 'PM' : 'AM';
      const endPeriod = endHour >= 12 ? 'PM' : 'AM';
      
      const startDisplayHour = startHour > 12 ? startHour - 12 : startHour === 0 ? 12 : startHour;
      const endDisplayHour = endHour > 12 ? endHour - 12 : endHour === 0 ? 12 : endHour;
      
      return `${startDisplayHour}:${startMin} ${startPeriod} - ${endDisplayHour}:${endMin} ${endPeriod}`;
    }
    return timeStr;
  };

  // Convert user-friendly time format back to stored format
  const timeToStoredFormat = (userTimeStr: string) => {
    // Handle formats like "9:00 AM - 5:00 PM"
    const timeMatch = userTimeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)\s*-\s*(\d{1,2}):(\d{2})\s*(AM|PM)/);
    if (timeMatch) {
      let startHour = parseInt(timeMatch[1]);
      const startMin = timeMatch[2];
      const startPeriod = timeMatch[3];
      let endHour = parseInt(timeMatch[4]);
      const endMin = timeMatch[5];
      const endPeriod = timeMatch[6];
      
      // Convert to 24-hour format
      if (startPeriod === 'PM' && startHour !== 12) startHour += 12;
      if (startPeriod === 'AM' && startHour === 12) startHour = 0;
      if (endPeriod === 'PM' && endHour !== 12) endHour += 12;
      if (endPeriod === 'AM' && endHour === 12) endHour = 0;
      
      return `${startHour.toString().padStart(2, '0')}:${startMin} - ${endHour.toString().padStart(2, '0')}:${endMin}`;
    }
    return userTimeStr;
  };

  const handleEditDetails = () => {
    if (isEditingDetails) {
      // If turning off edit mode, reset changes
      setHasChanges(false);
    }
    setIsEditingDetails(!isEditingDetails);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditedGigDetails((prevState: any) => ({
      ...prevState,
      [name]: value,
      ...(name === 'payPerHour' ? { totalPay: (calculateDuration(editedGigDetails?.time || '') * Number(value)).toFixed(2) } : {}),
      ...(name === 'time' ? { totalPay: (calculateDuration(value) * Number(editedGigDetails?.payPerHour || 0)).toFixed(2) } : {})
    }));
    
    // Check if there are changes from original values
    if (gig) {
      const hasLocationChange = name === 'location' && value !== gig.location;
      const hasDateChange = name === 'date' && value !== gig.gigDate;
      const hasTimeChange = name === 'time' && value !== formatTime(gig.gigTime);
      const hasPayChange = name === 'payPerHour' && Number(value) !== gig.hourlyRate;
      
      setHasChanges(hasLocationChange || hasDateChange || hasTimeChange || hasPayChange);
    }
  };

  const handleSubmitEditedDetails = async () => {
    if (!gig || !user || !hasChanges) return;
    
    setIsSubmitting(true);
    try {
      // Here you would typically call an API to update the gig details
      console.log('Submitting edited details:', editedGigDetails);
      
      // For now, just show a success message
      alert('Gig details updated successfully!');
      
      // Reset edit mode
      setIsEditingDetails(false);
      setHasChanges(false);
      
    } catch (error) {
      console.error('Error updating gig details:', error);
      alert('Failed to update gig details. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (!gig || !user || !changes.trim()) return;
    
    setIsSubmitting(true);
    try {
      const payload = {
        gigId: gig.id,
        changes: changes.trim(),
        requestedBy: 'worker',
        requestedAt: new Date().toISOString()
      };

      const response = await fetch('/api/gigs/amend-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        router.push(`/user/${userId}/worker/gigs/${gigId}/amend/confirmation`);
      } else {
        console.error('Failed to submit amendment request');
      }
    } catch (error) {
      console.error('Error submitting amendment request:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelGig = async () => {
    if (!gig || !user) return;
    
    if (window.confirm('Are you sure you want to cancel this gig? This might incur charges or penalties.')) {
      try {
        const response = await fetch(`/api/gigs/${gigId}/cancel`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            cancelledBy: 'worker',
            reason: 'Worker requested cancellation'
          }),
        });

        if (response.ok) {
          router.push(`/user/${userId}/worker/gigs`);
        } else {
          console.error('Failed to cancel gig');
        }
      } catch (error) {
        console.error('Error cancelling gig:', error);
      }
    }
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  if (!gig) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>Gig not found</div>
      </div>
    );
  }

  const duration = calculateDuration(gig.gigTime);
  const totalPay = calculateTotalPay(gig.hourlyRate, duration);

  return (
    <div className={styles.container}>
      <ScreenHeaderWithBack 
        title="Cancel or Amend Gig Details" 
        onBackClick={() => router.back()} 
      />

      <div className={styles.content}>
        <div className={styles.changesSection}>
        <div className={styles.aiIcon}>
          <Image 
            src="/images/ableai.png" 
            alt="Able AI" 
            width={24} 
            height={24} 
          />
        </div>
        <p>What changes would you like to make to the gig? Tell me or edit using the icon below</p>
        
        <textarea
          className={styles.changesInput}
          placeholder="e.g., Add one more hour to the gig or pay £22ph"
          value={changes}
          onChange={(e) => setChanges(e.target.value)}
          rows={4}
        />
      </div>

      <div className={styles.updatedDetailsSection}>
        <div className={styles.sectionHeader}>
          <h3>Updated gig details:</h3>
          <span 
            className={styles.editIcon} 
            onClick={handleEditDetails}
            style={{ cursor: 'pointer' }}
          >
            {isEditingDetails ? '✕' : '✏️'}
          </span>
        </div>
        
        {isEditingDetails ? (
          /* Editable View - with original values pre-filled */
          <div className={styles.detailsGrid}>
            <div className={styles.detailRow}>
              <span className={styles.label}>Location:</span>
              <input
                type="text"
                name="location"
                value={editedGigDetails?.location || gig.location}
                onChange={handleInputChange}
                className={styles.editInput}
              />
            </div>
            <div className={styles.detailRow}>
              <span className={styles.label}>Date:</span>
              <input
                type="date"
                name="date"
                value={editedGigDetails?.date || gig.gigDate}
                onChange={handleInputChange}
                className={styles.editInput}
              />
            </div>
            <div className={styles.detailRow}>
              <span className={styles.label}>Time:</span>
              <input
                type="text"
                name="time"
                value={editedGigDetails?.time || formatTime(gig.gigTime)}
                onChange={handleInputChange}
                className={styles.editInput}
              />
            </div>
            <div className={styles.detailRow}>
              <span className={styles.label}>Pay per hour:</span>
              <input
                type="number"
                name="payPerHour"
                value={editedGigDetails?.payPerHour || gig.hourlyRate}
                onChange={handleInputChange}
                className={styles.editInput}
              />
            </div>
            <div className={styles.detailRow}>
              <span className={styles.label}>Total Pay:</span>
              <span className={styles.value}>£{editedGigDetails?.totalPay || totalPay}</span>
            </div>
          </div>
        ) : (
          /* Read-only View */
          <div className={styles.detailsGrid}>
            <div className={styles.detailRow}>
              <span className={styles.label}>Location:</span>
              <span className={styles.value}>{gig.location}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.label}>Date:</span>
              <span className={styles.value}>{formatDate(gig.gigDate)}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.label}>Time:</span>
              <span className={styles.value}>{formatTime(gig.gigTime)}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.label}>Pay per hour:</span>
              <span className={styles.value}>£{gig.hourlyRate}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.label}>Total Pay:</span>
              <span className={styles.value}>£{totalPay}</span>
            </div>
          </div>
        )}

        {/* Submit button for edited details */}
        {isEditingDetails && hasChanges && (
          <div className={styles.submitSection}>
            <button
              className={styles.submitButton}
              onClick={handleSubmitEditedDetails}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Updating...' : 'Confirm Changes'}
            </button>
          </div>
        )}

        {changes.trim() && (
          <div className={styles.changesSummary}>
            <p>Add one more hour. Total gig value is now £{(gig.hourlyRate * (duration + 1)).toFixed(2)}, with Able and payment provider fees of £{((gig.hourlyRate * (duration + 1)) * 0.1).toFixed(2)}.</p>
          </div>
        )}
      </div>

      <div className={styles.actionButtons}>
        <button 
          className={styles.submitButton}
          onClick={handleSubmit}
          disabled={isSubmitting || !changes.trim()}
        >
          {isSubmitting ? 'Submitting...' : 'Submit for Confirmation'}
        </button>
        <button 
          className={styles.cancelButton}
          onClick={handleCancelGig}
        >
          Cancel gig
          <span className={styles.cancelWarning}>(this might incur charges or penalties)</span>
        </button>
      </div>
      </div>
    </div>
  );
}
