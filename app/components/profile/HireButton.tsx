import { useRouter } from 'next/navigation';
import styles from './HireButton.module.css';
import { useAuth } from '@/context/AuthContext';

const HireButton = ({workerName, workerId}: {workerName: string, workerId: string}) => {
    const router = useRouter();
    const { user: authUser } = useAuth();
    const handleHireWorker = () => {
    if (!workerName || !authUser?.uid) return; // Ensure authUser is available for booking
    router.push(`/user/${authUser.uid}/buyer/book-gig?workerId=${workerId}`);
  };

  return (
    <div className={styles.footerActionBar}>
        <button onClick={handleHireWorker} className={styles.primaryActionButton}>
            <span>£</span>Hire {workerName.split(' ')[0]}
        </button>
    </div>
  )
}

export default HireButton
