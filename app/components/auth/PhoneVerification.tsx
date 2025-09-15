"use client";

import React, { useState, useEffect } from 'react';
import { 
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  ConfirmationResult,
  PhoneAuthProvider,
  signInWithCredential
} from 'firebase/auth';
import { useFirebase } from '@/context/FirebaseContext';

interface PhoneVerificationProps {
  phoneNumber: string;
  onVerificationSuccess: (phoneNumber: string) => void;
  onError: (error: string) => void;
  onBack: () => void;
}

const PhoneVerification: React.FC<PhoneVerificationProps> = ({
  phoneNumber,
  onVerificationSuccess,
  onError,
  onBack
}) => {
  const { authClient } = useFirebase();
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [canResend, setCanResend] = useState(false);

  // Format phone number for display
  const formatPhoneNumber = (phone: string) => {
    // Remove any non-digits
    const digits = phone.replace(/\D/g, '');
    
    // Format as +44 7XXX XXX XXX for UK numbers
    if (digits.startsWith('44')) {
      return `+${digits.slice(0, 2)} ${digits.slice(2, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`;
    }
    
    // Format as +1 XXX XXX XXXX for US numbers
    if (digits.startsWith('1') && digits.length === 11) {
      return `+${digits.slice(0, 1)} ${digits.slice(1, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
    }
    
    // Default formatting
    return phone;
  };

  // Initialize reCAPTCHA
  useEffect(() => {
    if (!authClient || !window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(authClient, 'recaptcha-container', {
        size: 'invisible',
        callback: () => {
          console.log('reCAPTCHA solved');
        },
        'expired-callback': () => {
          console.log('reCAPTCHA expired');
          onError('reCAPTCHA expired. Please try again.');
        }
      });
    }
  }, [authClient, onError]);

  // Send verification code
  const sendVerificationCode = async () => {
    if (!authClient) {
      onError('Authentication not available');
      return;
    }

    try {
      setLoading(true);
      onError('');

      // Ensure phone number has country code
      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+44${phoneNumber.replace(/^0/, '')}`;
      
      const result = await signInWithPhoneNumber(authClient, formattedPhone, window.recaptchaVerifier);
      setConfirmationResult(result);
      setVerificationSent(true);
      setCountdown(60); // 60 second countdown
      setCanResend(false);
      
    } catch (error: any) {
      console.error('Error sending verification code:', error);
      
      let errorMessage = 'Failed to send verification code. Please try again.';
      
      if (error.code === 'auth/invalid-phone-number') {
        errorMessage = 'Invalid phone number. Please check and try again.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many attempts. Please try again later.';
      } else if (error.code === 'auth/quota-exceeded') {
        errorMessage = 'SMS quota exceeded. Please try again later.';
      }
      
      onError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Verify code
  const verifyCode = async () => {
    if (!confirmationResult || !verificationCode.trim()) {
      onError('Please enter the verification code');
      return;
    }

    try {
      setLoading(true);
      onError('');

      const result = await confirmationResult.confirm(verificationCode);
      
      if (result.user) {
        onVerificationSuccess(phoneNumber);
      }
      
    } catch (error: any) {
      console.error('Error verifying code:', error);
      
      let errorMessage = 'Invalid verification code. Please try again.';
      
      if (error.code === 'auth/invalid-verification-code') {
        errorMessage = 'Invalid verification code. Please check and try again.';
      } else if (error.code === 'auth/code-expired') {
        errorMessage = 'Verification code expired. Please request a new one.';
      }
      
      onError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Resend verification code
  const resendCode = async () => {
    if (!canResend) return;
    
    setVerificationCode('');
    await sendVerificationCode();
  };

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  // Auto-send verification on mount
  useEffect(() => {
    if (!verificationSent && phoneNumber) {
      sendVerificationCode();
    }
  }, [phoneNumber]);

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Verify Your Phone Number
        </h2>
        <p className="text-gray-600">
          We've sent a verification code to
        </p>
        <p className="font-semibold text-gray-900">
          {formatPhoneNumber(phoneNumber)}
        </p>
      </div>

      {/* reCAPTCHA container */}
      <div id="recaptcha-container"></div>

      {!verificationSent ? (
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Sending verification code...</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label htmlFor="verification-code" className="block text-sm font-medium text-gray-700 mb-2">
              Enter verification code
            </label>
            <input
              id="verification-code"
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-center text-lg tracking-widest"
              maxLength={6}
              disabled={loading}
            />
          </div>

          <button
            onClick={verifyCode}
            disabled={loading || verificationCode.length !== 6}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Verifying...' : 'Verify Code'}
          </button>

          <div className="text-center">
            {countdown > 0 ? (
              <p className="text-sm text-gray-500">
                Resend code in {countdown} seconds
              </p>
            ) : (
              <button
                onClick={resendCode}
                disabled={!canResend || loading}
                className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Resend verification code
              </button>
            )}
          </div>
        </div>
      )}

      <div className="mt-6 text-center">
        <button
          onClick={onBack}
          className="text-sm text-gray-600 hover:text-gray-800"
        >
          ← Back to sign up
        </button>
      </div>
    </div>
  );
};

export default PhoneVerification;
