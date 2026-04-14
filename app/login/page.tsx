'use client';

import { Suspense } from 'react';
import LoginExperience from '@/components/auth/LoginExperience';

export default function LoginPage() {
  return (
    <Suspense>
      <LoginExperience />
    </Suspense>
  );
}
