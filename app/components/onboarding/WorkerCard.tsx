import React from 'react';
import Image from 'next/image'; // Import NextImage
import pageStyles from './WorkerCard.module.css'; // Will create this CSS module
import chatStyles from '../../styles/chat.module.css'; // Import global styles

// Define WorkerData interface (can be shared or moved to a types file)
export interface WorkerData {
    name: string;
    title: string;
    gigs: number;
    experience: string;
    keywords: string;
    hourlyRate: number;
    totalHours: number;
    totalPrice: number;
    ableFees: string;
    stripeFees: string;
    imageSrc: string;
}

interface WorkerCardProps {
    worker: WorkerData;
    onBook: (name: string, price: number) => void;
}

const WorkerCard: React.FC<WorkerCardProps> = ({ worker, onBook }) => {
    return (
        <div className={pageStyles.workerCard}>
            {/* Use Next/Image for optimized images */}
            <div className={pageStyles.workerInfo}>
                <Image 
                    src={worker.imageSrc} 
                    alt={worker.name} 
                    width={70} // Provide appropriate width
                    height={70} // Provide appropriate height
                    className={`${pageStyles.workerImage} ${chatStyles.avatarWithBorder}`} // Apply global style
                    onError={(e) => { (e.target as HTMLImageElement).src = "/images/default-avatar.png"; }} // Fallback
                />
                <div className={pageStyles.workerDetails}>
                    <h3>{worker.name}</h3>
                    <p>{worker.title}, {worker.gigs} Able gigs, <span className={pageStyles.workerExp}>{worker.experience}</span></p>    
                </div>
            </div>
            <p className={pageStyles.workerKeyword}>Client review keywords: {worker.keywords}</p>
              
            <div className={pageStyles.workerSummarySection}>
                <div className={pageStyles.workerHistory}>   
                    <p>{worker.totalHours} hours @£{worker.hourlyRate.toFixed(2)}/hr, total £{worker.totalPrice.toFixed(2)}</p>
                    <p>fees: Able {worker.ableFees}</p>
                    <p>Stripe {worker.stripeFees}</p>
                </div>
                <button
                    onClick={() => onBook(worker.name, worker.totalPrice)}
                    className={`${pageStyles.bookButton} ${chatStyles.tealButton}`}
                >
                    Yes! Book £{worker.totalPrice.toFixed(2)}
                </button>
            </div>

        </div>
    );
};

export default WorkerCard;