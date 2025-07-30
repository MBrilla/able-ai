import React from 'react';
import { WorkerData } from '@/app/components/onboarding/WorkerCard';
import { StepInputConfig } from '@/app/types/form';

export interface OnboardingStep {
  id: number;
  type: 'botMessage' | 'userInput' | 'userResponseDisplay' | 'workerCard' | 'terms' | 'fileUpload' | 'datePicker' | 'discountCode' | 'recordVideo' | 'shareLink' | 'locationMapLink';
  senderType?: 'bot' | 'user';
  content?: string | React.ReactNode;
  inputConfig?: StepInputConfig;
  isComplete?: boolean;
  dependsOn?: number;
  value?: string | number | Date | File | null | { lat: number; lon: number };
  workerData?: WorkerData;
  name?: string;
}