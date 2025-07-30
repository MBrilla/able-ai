'use client'
import { useRouter } from 'next/navigation'; // ✅ App Router
import { X } from "lucide-react";
import styles from './CloseButton.module.css'; // Adjust the path as necessary

const CloseButton = () => {
    const router = useRouter();
    return (
        <div>
            <button onClick={() => router.back()} className={styles.pageCloseButton} aria-label="Close profile">
                <X size={24} />
            </button>
        </div>
    )
}

export default CloseButton
