"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Star, MapPin, Clock, Briefcase, UserCircle, ExternalLink } from 'lucide-react';
import { MatchingWorker } from '@/actions/gigs/find-matching-workers';
import styles from './MatchingWorkersDisplay.module.css';

interface MatchingWorkersDisplayProps {
  gigLocation: any;
  gigDate: string;
  gigTime?: string;
  onWorkerSelect?: (worker: MatchingWorker) => void;
  selectedWorkerId?: string;
}

export default function MatchingWorkersDisplay({
  gigLocation,
  gigDate,
  gigTime,
  onWorkerSelect,
  selectedWorkerId
}: MatchingWorkersDisplayProps) {
  const [workers, setWorkers] = useState<MatchingWorker[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (gigLocation && gigDate) {
      fetchMatchingWorkers();
    }
  }, [gigLocation, gigDate, gigTime]);

  const fetchMatchingWorkers = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/gigs/find-matching-workers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gigLocation,
          gigDate,
          gigTime,
          maxDistance: 30, // 30km radius
          limit: 50
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setWorkers(data.workers);
      } else {
        setError(data.error || 'Failed to find matching workers');
      }
    } catch (err) {
      setError('Failed to fetch matching workers');
      console.error('Error fetching matching workers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWorkerSelect = (worker: MatchingWorker) => {
    if (onWorkerSelect) {
      onWorkerSelect(worker);
    }
  };

  const displayedWorkers = showAll ? workers : workers.slice(0, 6);

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h3>Finding matching workers...</h3>
          <div className={styles.loadingSpinner}></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.errorContainer}>
          <p className={styles.errorText}>{error}</p>
          <button 
            onClick={fetchMatchingWorkers}
            className={styles.retryButton}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (workers.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.noWorkersContainer}>
          <h3>No matching workers found</h3>
          <p>We couldn't find any workers in your area that match your requirements.</p>
          <p>This could be because:</p>
          <ul className={styles.noWorkersReasons}>
            <li>No workers are available for {gigDate} {gigTime ? `at ${gigTime}` : ''}</li>
            <li>No workers have set their availability for this time</li>
            <li>All available workers are outside the 30km radius</li>
            <li>No workers have the required skills or rate range</li>
          </ul>
          <p>Try adjusting your date, time, or expanding your search area.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>Matching Workers ({workers.length})</h3>
        <p>Workers available within 30km of your gig location</p>
        <p className={styles.availabilityNote}>
          <strong>Note:</strong> Only workers with availability for {gigDate} {gigTime ? `at ${gigTime}` : ''} are shown
        </p>
        <p className={styles.distanceNote}>
          <strong>Note:</strong> Only workers within 30km will be able to see and apply for your gig
        </p>
      </div>

      <div className={styles.workersGrid}>
        {displayedWorkers.map((worker) => (
          <div
            key={worker.id}
            className={`${styles.workerCard} ${
              selectedWorkerId === worker.id ? styles.selected : ''
            }`}
            onClick={() => handleWorkerSelect(worker)}
          >
            <div className={styles.workerHeader}>
              <div className={styles.avatarContainer}>
                {worker.videoUrl ? (
                  <div className={styles.videoAvatar}>
                    <UserCircle size={40} />
                    <div className={styles.playIcon}>▶</div>
                  </div>
                ) : (
                  <UserCircle size={40} />
                )}
              </div>
              <div className={styles.workerInfo}>
                <h4 className={styles.workerName}>
                  {worker.user.fullName || 'Worker'}
                </h4>
                <div className={styles.workerStats}>
                  {worker.responseRateInternal && (
                    <span className={styles.responseRate}>
                      {Math.round(worker.responseRateInternal * 100)}% response rate
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className={styles.workerDetails}>
              {worker.fullBio && (
                <p className={styles.bio}>
                  {worker.fullBio.length > 100 
                    ? `${worker.fullBio.substring(0, 100)}...` 
                    : worker.fullBio
                  }
                </p>
              )}

              <div className={styles.locationInfo}>
                <MapPin size={16} />
                <span>{worker.location || 'Location not specified'}</span>
                <span className={styles.distance}>({worker.distance}km away)</span>
              </div>

              {worker.skills.length > 0 && (
                <div className={styles.skillsContainer}>
                  <Briefcase size={16} />
                  <div className={styles.skillsList}>
                    {worker.skills.slice(0, 3).map((skill, index) => (
                      <span key={skill.id} className={styles.skillTag}>
                        {skill.name}
                      </span>
                    ))}
                    {worker.skills.length > 3 && (
                      <span className={styles.moreSkills}>
                        +{worker.skills.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className={styles.rateInfo}>
                <span className={styles.rateLabel}>Starting from:</span>
                <span className={styles.rateAmount}>
                  £{Math.min(...worker.skills.map(s => s.agreedRate)).toFixed(2)}/hr
                </span>
              </div>
            </div>

            <div className={styles.workerActions}>
              <button
                className={`${styles.selectButton} ${
                  selectedWorkerId === worker.id ? styles.selectedButton : ''
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleWorkerSelect(worker);
                }}
              >
                {selectedWorkerId === worker.id ? 'Selected' : 'Select Worker'}
              </button>
              
              <a
                href={`/worker/${worker.id}/profile`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.viewProfileButton}
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink size={16} />
                View Profile
              </a>
            </div>
          </div>
        ))}
      </div>

      {workers.length > 6 && (
        <div className={styles.showMoreContainer}>
          <button
            onClick={() => setShowAll(!showAll)}
            className={styles.showMoreButton}
          >
            {showAll ? 'Show Less' : `Show All ${workers.length} Workers`}
          </button>
        </div>
      )}

      {selectedWorkerId && (
        <div className={styles.selectionInfo}>
          <p>
            <strong>Selected Worker:</strong> {
              workers.find(w => w.id === selectedWorkerId)?.user.fullName
            }
          </p>
          <p>You can proceed with gig creation or select a different worker.</p>
        </div>
      )}
    </div>
  );
}
