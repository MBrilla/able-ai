"use client";

import React from "react";
import styles from "./CalendarHeader.module.css";
import { View } from 'react-big-calendar';

const VIEW_OPTIONS: { label: string; value: View }[] = [
  { label: "Day view", value: "day" },
  { label: "Week view", value: "week" },
  { label: "Month view", value: "month" },
];

interface CalendarHeaderProps {
  date: Date;
  view: View;
  role: string;
  onViewChange: (view: View) => void;
  onNavigate: (action: "TODAY" | "PREV" | "NEXT") => void;
  filters: string[];
  activeFilter: string;
  onFilterChange: (filter: string) => void;
}

const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  date,
  view,
  role,
  onViewChange,
  onNavigate,
  filters,
  activeFilter,
  onFilterChange,
}) => {
  // Format date as "18 Dec 2023"
  const formattedDate = date.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <div className={styles.headerContainer}>
      <div className={styles.viewSwitcher}>
        {VIEW_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            className={
              view === opt.value
                ? `${styles.viewButton} ${styles.activeView}`
                : styles.viewButton
            }
            onClick={() => onViewChange(opt.value)}
            type="button"
          >
            {opt.label}
          </button>
        ))}
      </div>
     
      <div className={styles.dateRow}>
        <button
          className={styles.navButton}
          aria-label="Previous"
          onClick={() => onNavigate("PREV")}
        >
          &#8592;
        </button>
        <span className={styles.dateDisplay}>{formattedDate}</span>
        <button
          className={styles.navButton}
          aria-label="Next"
          onClick={() => onNavigate("NEXT")}
        >
          &#8594;
        </button>
      </div>
      <div className={styles.filterRow}>
        {filters.map((filter) => (
          <button
            key={filter}
            className={
              filter === activeFilter
                ? `${styles.filterPill} ${role === "worker" ? styles.activePillWorker : styles.activePillBuyer}`
                : styles.filterPill
            }
            onClick={() => onFilterChange(filter)}
            type="button"
          >
            {filter}
          </button>
        ))}
      </div>
    </div>
  );
};

export default CalendarHeader; 