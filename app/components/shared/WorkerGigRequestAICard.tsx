"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useFirebase } from '@/context/FirebaseContext';
import { Schema } from '@firebase/ai';
import { geminiAIAgent } from '@/lib/firebase/ai';
import { MessageCircle, Send, X, Loader2 } from 'lucide-react';
import { detectIncident } from '@/lib/incident-detection';
import IncidentReportingModal from '@/app/components/incidents/IncidentReportingModal';
import styles from './WorkerGigRequestAICard.module.css';

interface ChatMessage {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
}

interface WorkerGigRequestAICardProps {
  userId: string;
  onClose?: () => void;
}

export default function WorkerGigRequestAICard({ userId, onClose }: WorkerGigRequestAICardProps) {
  const { ai } = useFirebase();
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'bot',
      content: "Hi! I'm Able, your AI assistant. I can help you find gigs that match your skills and availability. What kind of work are you looking for?",
      timestamp: new Date(),
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Incident reporting state
  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);
  const [detectedIncidentType, setDetectedIncidentType] = useState<string | null>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when expanded
  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !ai) return;

    // Check for incident keywords before processing
    const incidentDetection = detectIncident(inputValue.trim());
    
    if (incidentDetection.isIncident) {
      console.log('🚨 Incident detected:', incidentDetection);
      setDetectedIncidentType(incidentDetection.incidentType || 'other');
      setIsIncidentModalOpen(true);
      return;
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setError(null);

    try {
      // Add typing indicator
      const typingMessage: ChatMessage = {
        id: 'typing',
        type: 'bot',
        content: '...',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, typingMessage]);

      const prompt = `You are Able, an AI assistant for gig workers on a platform. Help the worker find gigs by understanding their needs and providing relevant suggestions.

Worker's request: "${inputValue.trim()}"

Respond as a helpful assistant who:
1. Understands their request
2. Asks clarifying questions if needed
3. Suggests relevant gig types or skills to focus on
4. Provides actionable advice for finding gigs
5. Is encouraging and professional

Keep responses concise (2-3 sentences max) and focus on helping them find work opportunities.`;

      const responseSchema = Schema.object({
        properties: {
          response: Schema.string(),
          suggestions: Schema.array({ items: Schema.string() }),
          nextQuestion: Schema.string(),
        },
      });

      const result = await geminiAIAgent(
        "gemini-2.0-flash",
        { prompt, responseSchema },
        ai
      );

      if (result.ok && result.data) {
        const aiResponse = result.data as any;
        
        // Remove typing indicator and add AI response
        setMessages(prev => {
          const filtered = prev.filter(msg => msg.id !== 'typing');
          return [...filtered, {
            id: (Date.now() + 1).toString(),
            type: 'bot',
            content: aiResponse.response || "I understand you're looking for gigs. Let me help you find the right opportunities!",
            timestamp: new Date(),
          }];
        });
      } else {
        throw new Error('Failed to get AI response');
      }
    } catch (err) {
      console.error('Error getting AI response:', err);
      setError('Failed to get response. Please try again.');
      
      // Remove typing indicator and add error message
      setMessages(prev => {
        const filtered = prev.filter(msg => msg.id !== 'typing');
        return [...filtered, {
          id: (Date.now() + 1).toString(),
          type: 'bot',
          content: "Sorry, I'm having trouble responding right now. Please try again in a moment.",
          timestamp: new Date(),
        }];
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className={styles.container}>
      {/* Collapsed Card */}
      {!isExpanded && (
        <div className={styles.collapsedCard} onClick={toggleExpanded}>
          <div className={styles.cardHeader}>
            <MessageCircle size={20} className={styles.icon} />
            <span className={styles.title}>Ask AI for Gigs</span>
          </div>
          <p className={styles.subtitle}>Get personalized gig recommendations</p>
        </div>
      )}

      {/* Expanded Chat Interface */}
      {isExpanded && (
        <div className={styles.expandedCard}>
          <div className={styles.chatHeader}>
            <div className={styles.headerContent}>
              <MessageCircle size={20} className={styles.icon} />
              <span className={styles.title}>AI Gig Assistant</span>
            </div>
            <button 
              onClick={onClose || toggleExpanded} 
              className={styles.closeButton}
              aria-label="Close chat"
            >
              <X size={16} />
            </button>
          </div>

          <div className={styles.chatContainer} ref={chatContainerRef}>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`${styles.message} ${
                  message.type === 'user' ? styles.userMessage : styles.botMessage
                }`}
              >
                <div className={styles.messageContent}>
                  {message.content === '...' ? (
                    <div className={styles.typingIndicator}>
                      <Loader2 size={16} className={styles.spinner} />
                      <span>AI is typing...</span>
                    </div>
                  ) : (
                    message.content
                  )}
                </div>
                <div className={styles.messageTime}>
                  {message.timestamp.toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </div>
              </div>
            ))}
          </div>

          {error && (
            <div className={styles.errorMessage}>
              {error}
            </div>
          )}

          <div className={styles.inputContainer}>
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about available gigs..."
              className={styles.input}
              disabled={isLoading}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
              className={styles.sendButton}
              aria-label="Send message"
            >
              {isLoading ? (
                <Loader2 size={16} className={styles.spinner} />
              ) : (
                <Send size={16} />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Incident Reporting Modal */}
      {isIncidentModalOpen && detectedIncidentType && (
        <IncidentReportingModal
          isOpen={isIncidentModalOpen}
          onClose={() => {
            setIsIncidentModalOpen(false);
            setDetectedIncidentType(null);
          }}
          userId={userId}
          ai={ai}
          incidentType={detectedIncidentType as any}
          initialMessage={inputValue.trim()}
        />
      )}
    </div>
  );
}
