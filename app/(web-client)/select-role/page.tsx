"use client";

import { useEffect, useState } from "react";
import Logo from "@/app/components/brand/Logo";
import ActionButton from "./ActionButton";
import styles from "./SelectRolePage.module.css";
import Loader from "@/app/components/shared/Loader";
import { useAuth } from "@/context/AuthContext";
import { getLastRoleUsed, setLastRoleUsed } from "@/lib/last-role-used";

export default function SelectRolePage() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastRoleUsed = getLastRoleUsed();
  const [isChangingRole, setIsChangingRole] = useState(false);

  useEffect(() => {
    if (!lastRoleUsed) {
      setIsChangingRole(true);
    }

    if (isChangingRole) {
      return;
    }
  
    setIsLoading(true);
    setError(null);
  
    try {
      
      await setLastRoleUsed(role);
      
      // Save rute initial in the localstorage
      if (role === "BUYER") {
          const path = `user/${user.uid || "this_user"}/buyer/gigs/new`;
          localStorage.setItem("lastPathBuyer", path);
          
          router.push(path);
      } else if (role === "GIG_WORKER") {
        const isWorker = ["GIG_WORKER", "QA"].includes(user.claims.role);
        
        const path = isWorker
          ? `user/${user.uid || "this_user"}/worker`
          : `user/${user.uid || "this_user"}/worker/onboarding-ai`;
 
          localStorage.setItem("lastPathGigWorker", path);
          router.push(path);
      }
      window.location.replace(`/user/${user?.uid}/buyer`);
      return;
    } else if (lastRoleUsed === "GIG_WORKER") {
      if (!user?.claims.haveWorkerProfile) {
        window.location.replace(`/user/${user?.uid}/worker/onboarding-ai`);
        return;
      }
      const lastPathGigWorker = localStorage.getItem("lastPathGigWorker");
      if (lastPathGigWorker) {
        window.location.replace(lastPathGigWorker);
        return;
      }
      window.location.replace(`/user/${user?.uid}/worker`);
      return;
    }
  }, [isChangingRole]);

  const handleRoleSelection = async (role: "BUYER" | "GIG_WORKER") => {
    try {
      if (!user) {
        setError("User context is not available. Please try again.");
        return;
      }

      setIsLoading(true);
      setError(null);

      sessionStorage.setItem("roleSwitchInProgress", "1");
      await setLastRoleUsed(role);
      setIsChangingRole(false);
    } catch (err) {
      console.error("Error setting role:", err);
      setError("Failed to set your role. Please try again.");
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <Loader />;
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.logoWrapper}>
          <Logo />
        </div>

        <div className={styles.greeting}>
          <p className={styles.intro}>
            Hello, I&apos;m Able, it&apos;s lovely to meet you.
          </p>
          <p className={styles.question}>What do you want to do today?</p>
        </div>

        {error && <p className={styles.errorMessage}>{error}</p>}

        <div className={styles.actions}>
          <ActionButton
            bgColor="#7eeef9"
            onClick={() => handleRoleSelection("BUYER")}
            disabled={isLoading}
          >
            Hire a Gig Worker
          </ActionButton>
          <ActionButton
            bgColor="#41a1e8"
            onClick={() => handleRoleSelection("GIG_WORKER")}
            disabled={isLoading}
          >
            Find Gig Work
          </ActionButton>
        </div>

        <p className={styles.note}>
          We are focusing on hospitality and events gigs right now... but add
          all your skills and watch this space as we enable gig work across
          industries.
        </p>
      </div>
    </div>
  );
}
