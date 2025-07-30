import React, { ReactNode } from 'react';
import styles from './ChatBotLayout.module.css';
import Logo from '../brand/Logo';
import TextAreaBubble from './TextAreaBubble';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

interface ChatBotLayoutProps {
  children: ReactNode;
  onScroll?: (event: React.UIEvent<HTMLDivElement>) => void;
  className?: string;
  onHomeClick?: () => void;
}

const ChatBotLayout = React.forwardRef<HTMLDivElement, ChatBotLayoutProps>(
  ({ children, onScroll, className, onHomeClick }, ref) => {

    const router = useRouter();
    const { user } = useAuth();
    const onHomeClickInternal = () => {
      router.push(`/user/${user?.uid}/worker`);
    }
    return (
      <div className={`${styles.chatContainerWrapper} ${className}`}>
        <div className={styles.chatContainer} onScroll={onScroll} ref={ref}>
          <div className={styles.header}>
            <span className={styles.headerText}>Chat with me, Able</span>
            <Logo width={65} height={65} />
          </div>
          <div className={styles.chatContent}>{children}</div>
          <div className={styles.footer}>
            <TextAreaBubble placeholder='Chat with Able here ...' onKeyPress={(e) => {
              if (e.key === 'Enter') {
                const target = e.target as HTMLInputElement;
                // TODO: Send message to backend
                console.log('Send message to backend:', target.value);
                target.value = '';
              }
            }} />
            <button 
              onClick={onHomeClick || onHomeClickInternal}
              style={{ 
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Image src='/images/home.svg' width={40} height={40} alt='home' style={{ margin: 'auto' }} />
            </button>
          </div>
        </div>
      </div>
    );
  }
);

ChatBotLayout.displayName = 'ChatBotLayout';
export default ChatBotLayout;