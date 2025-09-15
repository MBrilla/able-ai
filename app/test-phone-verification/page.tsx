"use client";

import { useState } from 'react';
import PhoneNumberInput from '@/app/components/auth/PhoneNumberInput';
import PhoneVerification from '@/app/components/auth/PhoneVerification';

export default function TestPhoneVerificationPage() {
  const [step, setStep] = useState<'input' | 'verification'>('input');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handlePhoneSubmit = () => {
    if (phoneNumber && !error) {
      setStep('verification');
    }
  };

  const handleVerificationSuccess = (verifiedPhone: string) => {
    alert(`Phone verification successful! Verified number: ${verifiedPhone}`);
    setStep('input');
    setPhoneNumber('');
  };

  const handleBack = () => {
    setStep('input');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold text-center mb-6">
            Phone Verification Test
          </h1>
          
          {step === 'input' ? (
            <div className="space-y-4">
              <PhoneNumberInput
                value={phoneNumber}
                onChange={setPhoneNumber}
                onError={setError}
              />
              
              {error && (
                <p className="text-red-500 text-sm">{error}</p>
              )}
              
              <button
                onClick={handlePhoneSubmit}
                disabled={!phoneNumber || !!error}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Send Verification Code
              </button>
            </div>
          ) : (
            <PhoneVerification
              phoneNumber={phoneNumber}
              onVerificationSuccess={handleVerificationSuccess}
              onError={setError}
              onBack={handleBack}
            />
          )}
        </div>
      </div>
    </div>
  );
}
