"use client";

import { useState } from "react";
import InputField from "@/app/components/form/InputField";
import SubmitButton from "@/app/components/form/SubmitButton";
import styles from "@/app/signin/SignInPage.module.css";
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from "firebase/auth";
import { signInWithFirebaseAction } from "@/actions/auth/singin";
import { useFirebase } from "@/context/FirebaseContext";
import { Eye, EyeOff } from "lucide-react";

interface SignInViewProps {
  onToggleRegister: () => void;
  onError: (error: React.ReactNode | null) => void;
}

const SignInView: React.FC<SignInViewProps> = ({ onToggleRegister, onError }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { authClient, loading: firebaseLoading } = useFirebase();
  const [show, setShow] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    onError(null);

    try {
      let userCredential
      if (authClient) {
        userCredential = await signInWithEmailAndPassword(authClient, email, password);
      }
      const user = userCredential?.user;

      if (!user?.uid) throw new Error("User UID not found");

      const response = await signInWithFirebaseAction(user.uid);

      if (response?.error) {
        onError(
          <>
            {response.error || "Email or password is incorrect."}
            <a href="/reset-password" className={styles.errorLink}>
              Reset password?
            </a>
          </>
        );
      } else {
        await user.getIdToken(true);
        await user.getIdTokenResult();

        router.push("/select-role");
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error("Login error:", err);
      } else {
        console.error("Unexpected error during login:", err);
      }
      onError(
        <>
          {err instanceof Error ? err.message : "An unexpected error occurred."}
          <a href="/reset-password" className={styles.errorLink}>
            Reset password?
          </a>
        </>
      );
    } finally {
      setLoading(false);
    }
  };

  if (firebaseLoading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.inputGroup}>
        <label htmlFor="email" className={styles.label}>
          Email Address
        </label>
        <InputField
          type="email"
          id="email-signin"
          name="email-signin"
          placeholder="Enter your email"
          value={email}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setEmail(e.target.value)
          }
          required
        />
      </div>
      <div className={styles.inputGroup}>
        <label htmlFor="password" className={styles.label}>
          Password
        </label>
        <div className={styles.passwordContainer}>
          <InputField
            type={show ? "text" : "password"}
            id="password-signin"
            name="password-signin"
            placeholder="Enter your password"
            value={password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setPassword(e.target.value)
            }
            required
          />
          <button
            type="button"
            className={styles.togglePasswordVisibility}
            onClick={() => setShow(!show)}
            aria-label={show ? "Hide password" : "Show password"}
          >
            {show ? <Eye className={styles.eyeIcon} /> : <EyeOff className={styles.eyeIcon} />}
          </button>
        </div>
        <a href="/reset-password" className={styles.forgotPassword}>
          Forgot Password?
        </a>
      </div>

      <div className={styles.submitWrapper}>
        <SubmitButton loading={loading} disabled={loading}>
          Sign In
        </SubmitButton>
      </div>

      <button
        type="button"
        className={styles.toggleButton}
        onClick={onToggleRegister}
      >
        Need an account? <span className={styles.linkText}>Create one</span>
      </button>
    </form>
  );
};

export default SignInView; 