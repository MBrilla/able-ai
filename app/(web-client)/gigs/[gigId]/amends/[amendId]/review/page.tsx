"use client";

import React from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getLastRoleUsed } from '@/lib/last-role-used';
import ConfirmAmendedGigDetailsContainer from './ConfirmAmendedGigDetailsContainer';

export default function ConfirmAmendedGigDetailsPage() {
  const params = useParams();
  const gigId = params.gigId as string;
  const amendId = params.amendId as string;
  const lastRoleUsed = getLastRoleUsed();
  const { user } = useAuth();

  return (
    <ConfirmAmendedGigDetailsContainer
      gigId={gigId}
      amendId={amendId}
      user={user}
      lastRoleUsed={lastRoleUsed}
    />
  );
} 