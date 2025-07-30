import React from 'react';
import Image from 'next/image';
import { UserCircle } from 'lucide-react'; // Using UserCircle as a fallback icon
import styles from './Avatar.module.css';

interface AvatarProps {
  src?: string | null;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
}

const Avatar: React.FC<AvatarProps> = ({
  src,
  alt,
  width = 40, // Default size
  height = 40,
  className = '',
}) => {
  const avatarSize = `${width}px`;

  if (src) {
    return (
      <div
        className={`${styles.avatarContainer} ${className}`}
        style={{ width: width, height: height }}
      >
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          className={styles.avatarImage}
          objectFit="cover" // Ensure image covers the circular area
        />
      </div>
    );
  }

  // Fallback if no src is provided (e.g., initials or default icon)
  // For simplicity, using Lucide UserCircle icon as fallback
  return (
    <div
      className={`${styles.avatarContainer} ${styles.fallback} ${className}`}
      style={{ width: avatarSize, height: avatarSize }}
    >
       <UserCircle size={width * 0.8} color="currentColor" className={styles.fallbackIcon} />
       {/* Or render initials here */}
    </div>
  );
};

export default Avatar; 