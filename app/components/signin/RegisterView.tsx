"use client";

import { useState, FormEvent } from "react";
import {
  sendEmailVerification,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import InputField from "@/app/components/form/InputField";
import SubmitButton from "@/app/components/form/SubmitButton";
import PasswordInputField from "@/app/components/form/PasswodInputField";
import styles from "@/app/SignInPage.module.css";
import { registerUserAction } from "@/actions/auth/signup";
import { isPasswordCommon } from "@/app/actions/password-check";
import { authClient } from "@/lib/firebase/clientApp";
import { toast } from "sonner";
import PasswordInputField from "@/app/components/form/PasswodInputField";
import PhoneNumberInput from "@/app/components/auth/PhoneNumberInput";
import PhoneVerification from "@/app/components/auth/PhoneVerification";

interface RegisterViewProps {
  onToggleRegister: () => void;
  onError: (error: React.ReactNode | null) => void;
}

const defaultFormData = {
  name: "",
  phone: "",
  email: "",
  password: "",
};

type RegistrationStep = 'form' | 'phone-verification' | 'email-verification';

const RegisterView: React.FC<RegisterViewProps> = ({
  onToggleRegister,
  onError,
}) => {
  const [currentStep, setCurrentStep] = useState<RegistrationStep>('form');
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const router = useRouter();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhoneChange = (phoneNumber: string) => {
    setFormData((prev) => ({ ...prev, phone: phoneNumber }));
  };

  const validatePassword = async (password: string) => {
    if (password.trim().length < 10)
      return {
        isValid: false,
        error: "Password must be at least 10 characters long.",
      };

    const isCommonPass = await isPasswordCommon(password.trim());
    if (isCommonPass)
      return {
        isValid: false,
        error: "Password is too common. Please choose a more secure password.",
      };

    return { isValid: true, error: null };
  };

  const validateForm = async () => {
    const { name, phone, email, password } = formData;

    // Validate name
    if (!name.trim()) {
      onError("Name is required");
      return false;
    }

    // Validate phone
    if (!phone.trim()) {
      onError("Phone number is required");
      return false;
    }

    if (phoneError) {
      onError(phoneError);
      return false;
    }

    // Validate email
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailPattern.test(email.trim())) {
      onError("Invalid email address");
      return false;
    }

    // Validate password
    const { isValid, error } = await validatePassword(password);
    if (!isValid) {
      onError(error);
      return false;
    }

    return true;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    onError(null);
    setLoading(true);

    const isValid = await validateForm();
    if (!isValid) {
      setLoading(false);
      return;
    }

    // Move to phone verification step
    setCurrentStep('phone-verification');
    setLoading(false);
  };

  const handlePhoneVerificationSuccess = async (verifiedPhone: string) => {
    try {
      setLoading(true);
      onError(null);

      // Update form data with verified phone
      setFormData(prev => ({ ...prev, phone: verifiedPhone }));

      // Register user with verified phone
      const result = await registerUserAction({
        email: formData.email.trim(),
        password: formData.password.trim(),
        name: formData.name.trim(),
        phone: verifiedPhone,
      });

      if (!result.ok) {
        onError(result.error);
        setLoading(false);
        return;
      }

      // Move to email verification step
      setCurrentStep('email-verification');
      setLoading(false);

    } catch (error: any) {
      console.error('Registration error:', error);
      onError(error.message || 'Registration failed');
      setLoading(false);
    }
  };

  const handleEmailVerification = async () => {
    try {
      setLoading(true);
      onError(null);

      const host = window?.location.origin || "https://able-ai-mvp-able-ai-team.vercel.app";
      const actionCodeSettings = {
        url: host + "/usermgmt",
        handleCodeInApp: true,
      };

      await sendSignInLinkToEmail(authClient, formData.email, actionCodeSettings);
      
      window.localStorage.setItem("emailForSignIn", formData.email);
      toast.success("Registration successful! Please check your email to sign in.");
      
      router.push("/select-role");

    } catch (error: any) {
      console.error("Error sending email:", error);
      onError(`Error sending email: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToForm = () => {
    setCurrentStep('form');
    onError(null);
  };

  const handleBackToPhoneVerification = () => {
    setCurrentStep('phone-verification');
    onError(null);
  };

  // Render different steps
  if (currentStep === 'phone-verification') {
    return (
      <PhoneVerification
        phoneNumber={formData.phone}
        onVerificationSuccess={handlePhoneVerificationSuccess}
        onError={onError}
        onBack={handleBackToForm}
      />
    );
  }

  if (currentStep === 'email-verification') {
    return (
      <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Verify Your Email
          </h2>
          <p className="text-gray-600">
            We've sent a verification link to
          </p>
          <p className="font-semibold text-gray-900">
            {formData.email}
          </p>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-gray-600 text-center">
            Please check your email and click the verification link to complete your registration.
          </p>

          <button
            onClick={handleEmailVerification}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Sending...' : 'Resend Verification Email'}
          </button>

          <div className="text-center">
            <button
              onClick={handleBackToPhoneVerification}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              ← Back to phone verification
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.inputGroup}>
        <label htmlFor="name-register" className={styles.label}>
          Name
        </label>
        <InputField
          type="text"
          id="name-register"
          name="name"
          placeholder="Enter your name"
          value={formData.name}
          onChange={handleInputChange}
          required
        />
      </div>

      <div className={styles.inputGroup}>
        <PhoneNumberInput
          value={formData.phone}
          onChange={handlePhoneChange}
          onError={setPhoneError}
          disabled={loading}
        />
        {phoneError && (
          <p className="text-red-500 text-sm mt-1">{phoneError}</p>
        )}
      </div>

      <div className={styles.inputGroup}>
        <label htmlFor="email-register" className={styles.label}>
          Email Address
        </label>
        <InputField
          type="email"
          id="email-register"
          name="email"
          placeholder="Enter your email"
          value={formData.email}
          onChange={handleInputChange}
          required
        />
      </div>

      <div className={styles.inputGroup}>
        <label htmlFor="password-register" className={styles.label}>
          Password
        </label>
        <PasswordInputField
          password={formData.password}
          setPassword={(value: string) =>
            setFormData((prev) => ({ ...prev, password: value }))
          }
          id="password-register"
          name="password-register"
          placeholder="Make it secure..."
          required
        />
      </div>

      <div className={styles.submitWrapper}>
        <SubmitButton loading={loading} disabled={loading}>
          Continue to Phone Verification
        </SubmitButton>
      </div>

        <div className={styles.inputGroup}>
          <label htmlFor="phone-register" className={styles.label}>
            Phone Number
          </label>
          <InputField
            type="tel"
            id="phone-register"
            name="phone"
            placeholder="Enter your phone number"
            value={formData.phone}
            onChange={handleInputChange}
            required
          />
        </div>

        <div className={styles.inputGroup}>
          <label htmlFor="password-register" className={styles.label}>
            Password
          </label>
          <PasswordInputField
            password={formData.password}
            setPassword={(value: string) =>
              setFormData((prev) => ({ ...prev, password: value }))
            }
            id="password-register"
            name="password-register"
            placeholder="Make it secure..."
            required
          />
        </div>

        <div className={styles.submitWrapper}>
          <SubmitButton loading={loading} disabled={loading}>
            Register Account
          </SubmitButton>
        </div>

        <button
          type="button"
          className={styles.toggleButton}
          onClick={onToggleRegister}
        >
          Already have an account?{" "}
          <span className={styles.linkText}>Sign In</span>
        </button>
      </form>

      <EmailVerificationModal
        isOpen={showVerificationModal}
        onClose={handleCloseVerificationModal}
        userEmail={unverifiedUserEmail}
      />
    </>
  );
};

export default RegisterView;
