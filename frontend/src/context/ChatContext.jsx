import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

const ChatContext = createContext(null);

const LS_KEY_MSGS = 'chat_msgs_v1';
const LS_KEY_PENDING = 'chat_pending_v1';
const LS_KEY_CONVERSATION_STATE = 'chat_conversation_state_v1';

export function ChatProvider({ children }) {
  const [msgs, setMsgs] = useState([]);
  const [pending, setPending] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [conversationState, setConversationState] = useState({
    mood: 'neutral',
    topic: '',
    lastInteraction: null,
    conversationFlow: [],
    userPreferences: {}
  });

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const m = localStorage.getItem(LS_KEY_MSGS);
      const p = localStorage.getItem(LS_KEY_PENDING);
      const c = localStorage.getItem(LS_KEY_CONVERSATION_STATE);
      if (m) setMsgs(JSON.parse(m));
      if (p) setPending(JSON.parse(p));
      if (c) setConversationState(JSON.parse(c));
    } catch (_) {}
  }, []);

  // Persist messages to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY_MSGS, JSON.stringify(msgs));
    } catch (_) {}
  }, [msgs]);

  // Persist pending state to localStorage
  useEffect(() => {
    try {
      if (pending) {
        localStorage.setItem(LS_KEY_PENDING, JSON.stringify(pending));
      } else {
        localStorage.removeItem(LS_KEY_PENDING);
      }
    } catch (_) {}
  }, [pending]);

  // Persist conversation state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY_CONVERSATION_STATE, JSON.stringify(conversationState));
    } catch (_) {}
  }, [conversationState]);

  // Calculate unread count when messages change
  useEffect(() => {
    const unread = msgs.filter(msg => msg.role === 'assistant' && !msg.read).length;
    setUnreadCount(unread);
  }, [msgs]);

  // Mark messages as read
  const markAsRead = useCallback(() => {
    setMsgs(prev => prev.map(msg => ({ ...msg, read: true })));
  }, []);

  // Update conversation state
  const updateConversationState = useCallback((updates) => {
    setConversationState(prev => ({
      ...prev,
      ...updates,
      lastInteraction: new Date().toISOString()
    }));
  }, []);

  // Add message with conversation tracking
  const addMessage = useCallback((message) => {
    setMsgs(prev => [...prev, message]);
    
    // Update conversation state based on message
    if (message.role === 'user') {
      const newFlow = [...conversationState.conversationFlow, {
        type: 'user_input',
        content: message.content,
        timestamp: message.timestamp
      }];
      updateConversationState({ conversationFlow: newFlow });
    }
  }, [conversationState.conversationFlow, updateConversationState]);

  // Reset chat function
  const resetChat = useCallback(() => {
    setMsgs([]);
    setPending(null);
    setError('');
    setUnreadCount(0);
    setConversationState({
      mood: 'neutral',
      topic: '',
      lastInteraction: null,
      conversationFlow: [],
      userPreferences: {}
    });
    try {
      localStorage.removeItem(LS_KEY_MSGS);
      localStorage.removeItem(LS_KEY_PENDING);
      localStorage.removeItem(LS_KEY_CONVERSATION_STATE);
    } catch (_) {}
  }, []);

  const value = {
    msgs,
    setMsgs,
    pending,
    setPending,
    loading,
    setLoading,
    error,
    setError,
    unreadCount,
    markAsRead,
    resetChat,
    conversationState,
    updateConversationState,
    addMessage
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within ChatProvider');
  return ctx;
}
