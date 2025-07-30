"use client";

import React, { useState, useRef, useEffect } from "react";
import ChatBotLayout from "@/app/components/onboarding/ChatBotLayout";
import MessageBubble from "@/app/components/onboarding/MessageBubble";
import InputBubble from "@/app/components/onboarding/InputBubble";

const BOT_AVATAR_SRC = "/images/logo-placeholder.svg";

interface ChatMessage {
  id: string;
  senderId: string;
  senderRole: "BUYER" | "WORKER";
  message: string;
  timestamp: number;
}

export default function GigChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      senderId: "bot",
      senderRole: "BUYER",
      message: "Welcome to the gig chat!",
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState("");
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        senderId: "me",
        senderRole: "WORKER", // TODO: Replace with actual role
        message: input,
        timestamp: Date.now(),
      },
    ]);
    setInput("");
  };

  return (
    <ChatBotLayout ref={chatContainerRef}>
      {messages.map((msg) => (
        <MessageBubble
          key={msg.id}
          text={msg.message}
          senderType={msg.senderId === "me" ? "user" : "bot"}
          avatarSrc={msg.senderId === "me" ? undefined : BOT_AVATAR_SRC}
        />
      ))}
      <div style={{ marginTop: 16 }}>
        <InputBubble
          type="text"
          name="chat-input"
          value={input}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
          onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === "Enter") handleSend();
          }}
          placeholder="Type your message..."
        />
      </div>
    </ChatBotLayout>
  );
} 