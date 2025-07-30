// app/user/[userId]/able-ai/page.tsx
'use client';

import { useParams, useSearchParams } from 'next/navigation';
import Loader from '@/app/components/shared/Loader';
import AIChatContainer from './AIChatContainer';

export default function Page() {
  const params = useParams();
  const searchParams = useSearchParams();
  const userId = params.userId;

  // Validate userId
  if (!userId || typeof userId !== 'string') {
    return <Loader />;
  }

  return <AIChatContainer userId={userId} searchParams={searchParams} />;
}
