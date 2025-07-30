import styles from "./GigActionButton.module.css";
import { getLastRoleUsed } from "@/lib/last-role-used";

interface ActionButtonProps {
  label: string;
  handleGigAction: () => void;
  isActive?: boolean;
  isDisabled?: boolean;
}

const GigActionButton = ({
  label,
  handleGigAction,
  isActive,
  isDisabled,
}: ActionButtonProps) => {
  const lastRoleUsed = getLastRoleUsed();
  return (
    <button
      type="button"
      className={`${styles.actionButton} ${
        isActive
          ? lastRoleUsed === "GIG_WORKER"
            ? styles.activeWorker
            : styles.activeBuyer
          : ""
      }`}
      onClick={handleGigAction}
      disabled={isDisabled}
    >
      {label}
    </button>
  );
};

export default GigActionButton;
