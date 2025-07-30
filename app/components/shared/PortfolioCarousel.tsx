import React from 'react';
import Image from 'next/image';
import { Paperclip } from 'lucide-react';
import styles from './PortfolioCarousel.module.css';

interface PortfolioMedia {
  id: string;
  type: 'image' | 'video';
  thumbnailUrl: string;
  fullUrl?: string; // For lightbox or separate page
  caption?: string;
}

interface PortfolioCarouselProps {
  items: PortfolioMedia[];
  showPaperclipIcon?: boolean;
}

const PortfolioCarousel: React.FC<PortfolioCarouselProps> = ({
  items,
  showPaperclipIcon = false,
}) => {
  if (!items || items.length === 0) {
    return null; // Don't render if no items
  }

  return (
    <div className={styles.carouselContainer}>
      <div className={styles.header}>
        <h2 className={styles.title}>Portfolio</h2>
        {showPaperclipIcon && <Paperclip size={20} className={styles.paperclipIcon} />}
      </div>
      <div className={styles.carouselItems}>
        {items.map((item) => (
          <div key={item.id} className={styles.carouselItem}>
            {/* Basic image display - can be enhanced with video thumbnails, lightboxes later */}
            <Image
              src={item.thumbnailUrl}
              alt={item.caption || 'Portfolio item'}
              width={150} // Example size, adjust as needed
              height={100} // Example size, adjust as needed
              className={styles.thumbnail}
            />
            {/* TODO: Add video play icon overlay */}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PortfolioCarousel; 