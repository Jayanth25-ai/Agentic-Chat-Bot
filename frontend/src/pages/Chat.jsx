import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '../context/ChatContext';
import api from '../lib/auth';

const Chat = () => {
  const { msgs, setMsgs, pending, setPending, loading, setLoading, error, setError, markAsRead, unreadCount } = useChat();
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showNewMessagesIndicator, setShowNewMessagesIndicator] = useState(false);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const chatAreaRef = useRef(null);

  const scrollToBottom = () => {
    if (messagesEndRef.current && chatAreaRef.current) {
      const chatArea = chatAreaRef.current;
      const targetElement = messagesEndRef.current;
      
      // Calculate the scroll position
      const targetPosition = targetElement.offsetTop - chatArea.offsetTop;
      
      // Smooth scroll to the target position
      chatArea.scrollTo({
        top: targetPosition,
        behavior: 'smooth'
      });
    }
  };

  const scrollToBottomInstant = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: 'auto', 
        block: 'end',
        inline: 'nearest'
      });
    }
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    if (msgs.length > 0 && !isUserScrolling) {
      // Use instant scroll for better performance
      scrollToBottomInstant();
    }
  }, [msgs, isUserScrolling]);

  // Restore scroll position when user stops scrolling
  useEffect(() => {
    if (!isUserScrolling && chatAreaRef.current) {
      const chatArea = chatAreaRef.current;
      const isAtBottom = chatArea.scrollTop + chatArea.clientHeight >= chatArea.scrollHeight - 10;
      
      if (isAtBottom) {
        // User is at bottom, scroll to latest message
        setTimeout(() => scrollToBottomInstant(), 100);
      }
    }
  }, [isUserScrolling]);

  // Handle scroll events to detect user scrolling
  useEffect(() => {
    const chatArea = chatAreaRef.current;
    if (!chatArea) return;

    let scrollTimeout;
    
    const handleScroll = () => {
      setIsUserScrolling(true);
      
      // Clear previous timeout
      clearTimeout(scrollTimeout);
      
      // Set user scrolling to false after 2 seconds of no scrolling
      scrollTimeout = setTimeout(() => {
        setIsUserScrolling(false);
      }, 2000);
    };

    chatArea.addEventListener('scroll', handleScroll);
    
    return () => {
      chatArea.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, []);

  // Scroll to bottom and mark messages as read when user views the chat
  useEffect(() => {
    if (unreadCount > 0) {
      setShowNewMessagesIndicator(true);
      setTimeout(() => setShowNewMessagesIndicator(false), 3000);
    }
    markAsRead();
  }, [unreadCount, markAsRead]);

  useEffect(() => {
    // Show typing only while awaiting server response
    setIsTyping(loading);
  }, [loading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || loading) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setError('');

    const newUserMsg = { role: 'user', content: userMessage, timestamp: new Date() };
    setMsgs(prev => [...prev, newUserMsg]);
    
    // Scroll to bottom after adding user message
    setTimeout(() => scrollToBottomInstant(), 100);

    try {
      setLoading(true);
      const response = await api.post('/chat', {
        message: userMessage,
        history: msgs.slice(-10),
        pending
      });

      if (response.data.success) {
        const { aiResponse, result, replyText } = response.data.data;
        console.log('AI Response:', aiResponse);
        console.log('Result:', result);
        console.log('Reply Text:', replyText);
        
        if (result?.needMoreInfo) {
          setPending({ action: aiResponse.action, partialData: result.needMoreInfo.partialData, missing: result.needMoreInfo.missing });
          setMsgs(prev => [...prev, { role: 'assistant', content: result.needMoreInfo.prompt, timestamp: new Date(), read: false }]);
        } else {
          setPending(null);
          // Use replyText if available, otherwise fallback to a default message
          const assistantMessage = replyText || 'I\'ve processed your request. What else can I help you with?';
          setMsgs(prev => [...prev, { role: 'assistant', content: assistantMessage, timestamp: new Date(), read: false }]);
          // Notify other parts of the app (e.g., Todos page) to refresh when todos change via chat
          try {
            const todoAffectingActions = new Set(['create_todo','mark_completed','update_todo','delete_todo','delete_all','complete_all']);
            if (aiResponse?.action && todoAffectingActions.has(aiResponse.action)) {
              window.dispatchEvent(new CustomEvent('todos:changed', { detail: { action: aiResponse.action, at: Date.now() } }));
            }
          } catch (_) {}
        }
        
        // Scroll to bottom after AI response
        setTimeout(() => scrollToBottomInstant(), 100);
      } else {
        console.error('Response not successful:', response.data);
        setMsgs(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.', timestamp: new Date(), read: false }]);
        setTimeout(() => scrollToBottomInstant(), 100);
      }
    } catch (err) {
      console.error('Chat error:', err);
      setError(err.response?.data?.message || 'Failed to send message');
      setMsgs(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.', timestamp: new Date(), read: false }]);
      setTimeout(() => scrollToBottomInstant(), 100);
      setLoading(false);
    } finally {
      setLoading(false);
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const styles = {
    container: {
      minHeight: 'calc(100vh - 80px)',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    },
    wrapper: {
      maxWidth: '1000px',
      margin: '0 auto',
      background: 'rgba(255, 255, 255, 0.95)',
      borderRadius: '20px',
      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
      overflow: 'hidden',
      backdropFilter: 'blur(10px)',
      height: 'calc(100vh - 120px)',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative'
    },
    header: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '30px 20px',
      textAlign: 'center',
      color: 'white',
      flexShrink: 0
    },
    title: {
      fontSize: 'clamp(1.8rem, 4vw, 2.5rem)',
      fontWeight: 'bold',
      margin: '0 0 10px 0',
      textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
      lineHeight: '1.2'
    },
    subtitle: {
      fontSize: 'clamp(0.9rem, 2.5vw, 1.1rem)',
      opacity: 0.9,
      margin: 0,
      lineHeight: '1.4'
    },
    chatArea: {
      flex: '1',
      overflowY: 'auto',
      overflowX: 'hidden',
      padding: '20px',
      background: '#f8fafc',
      scrollBehavior: 'smooth',
      WebkitOverflowScrolling: 'touch',
      position: 'relative'
    },
    messageContainer: {
      display: 'flex',
      marginBottom: '20px',
      animation: 'fadeIn 0.3s ease-in'
    },
    userMessage: {
      marginLeft: 'auto',
      maxWidth: '85%'
    },
    aiMessage: {
      marginRight: 'auto',
      maxWidth: '85%'
    },
    messageBubble: {
      padding: '15px 20px',
      borderRadius: '20px',
      position: 'relative',
      boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
      wordWrap: 'break-word',
      maxWidth: '100%'
    },
    userBubble: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      borderBottomRightRadius: '5px'
    },
    aiBubble: {
      background: 'white',
      color: '#333',
      borderBottomLeftRadius: '5px',
      border: '1px solid #e2e8f0'
    },
    messageContent: {
      fontSize: 'clamp(13px, 3vw, 14px)',
      lineHeight: '1.5',
      margin: '0 0 8px 0',
      wordBreak: 'break-word'
    },
    timestamp: {
      fontSize: '11px',
      opacity: 0.7,
      textAlign: 'right'
    },
    inputArea: {
      padding: '20px',
      background: 'white',
      borderTop: '1px solid #e2e8f0',
      flexShrink: 0
    },
    inputForm: {
      display: 'flex',
      gap: '15px',
      alignItems: 'flex-end',
      flexWrap: 'wrap'
    },
    inputWrapper: {
      flex: '1 1 300px',
      position: 'relative',
      minWidth: '250px'
    },
    textarea: {
      width: '100%',
      padding: '15px 20px',
      border: '2px solid #e2e8f0',
      borderRadius: '25px',
      fontSize: 'clamp(13px, 3vw, 14px)',
      resize: 'none',
      outline: 'none',
      transition: 'all 0.3s ease',
      minHeight: '50px',
      maxHeight: '120px',
      fontFamily: 'inherit',
      boxSizing: 'border-box'
    },
    textareaFocus: {
      border: '2px solid #667eea',
      boxShadow: '0 0 0 3px rgba(102, 126, 234, 0.1)'
    },
    sendButton: {
      padding: '15px 25px',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      border: 'none',
      borderRadius: '25px',
      fontSize: 'clamp(13px, 3vw, 14px)',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
      flexShrink: 0,
      minWidth: '120px',
      justifyContent: 'center'
    },
    sendButtonHover: {
      transform: 'translateY(-2px)',
      boxShadow: '0 6px 20px rgba(102, 126, 234, 0.4)'
    },
    sendButtonDisabled: {
      opacity: 0.6,
      cursor: 'not-allowed',
      transform: 'none'
    },
    typingIndicator: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '15px 20px',
      background: 'white',
      borderRadius: '20px',
      borderBottomLeftRadius: '5px',
      border: '1px solid #e2e8f0',
      maxWidth: '85%',
      marginRight: 'auto',
      marginBottom: '20px'
    },
    typingDots: {
      display: 'flex',
      gap: '4px'
    },
    dot: {
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      background: '#667eea',
      animation: 'typing 1.4s infinite ease-in-out'
    },
    dot2: { animationDelay: '0.2s' },
    dot3: { animationDelay: '0.4s' },
    welcomeContainer: {
      textAlign: 'center',
      padding: 'clamp(20px, 5vw, 40px) 20px'
    },
    welcomeIcon: {
      width: 'clamp(60px, 15vw, 80px)',
      height: 'clamp(60px, 15vw, 80px)',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      borderRadius: '50%',
      margin: '0 auto 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 10px 30px rgba(102, 126, 234, 0.3)'
    },
    welcomeTitle: {
      fontSize: 'clamp(18px, 4vw, 24px)',
      fontWeight: 'bold',
      color: '#333',
      margin: '0 0 15px 0',
      lineHeight: '1.3'
    },
    welcomeText: {
      color: '#666',
      margin: '0 0 25px 0',
      fontSize: 'clamp(14px, 3vw, 16px)',
      lineHeight: '1.4'
    },
    exampleContainer: {
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      alignItems: 'center',
      maxWidth: '100%'
    },
    example: {
      padding: '8px 16px',
      background: 'rgba(102, 126, 234, 0.1)',
      color: '#667eea',
      borderRadius: '20px',
      fontSize: 'clamp(12px, 2.5vw, 14px)',
      border: '1px solid rgba(102, 126, 234, 0.2)',
      textAlign: 'center',
      maxWidth: '90%',
      wordBreak: 'break-word'
    },
    errorContainer: {
      background: '#fef2f2',
      border: '1px solid #fecaca',
      borderRadius: '10px',
      padding: '15px',
      margin: '20px',
      color: '#dc2626',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      fontSize: 'clamp(13px, 3vw, 14px)'
    },
    // Mobile-specific styles
    mobileContainer: {
      padding: '10px'
    },
    mobileWrapper: {
      borderRadius: '15px',
      height: 'calc(100vh - 100px)'
    },
    mobileHeader: {
      padding: '20px 15px'
    },
    mobileChatArea: {
      padding: '15px'
    },
    mobileInputArea: {
      padding: '15px'
    },
    mobileInputForm: {
      flexDirection: 'column',
      gap: '10px'
    },
    mobileInputWrapper: {
      flex: '1 1 auto',
      minWidth: 'auto'
    },
    mobileSendButton: {
      width: '100%',
      justifyContent: 'center'
    },
    capabilitiesGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '20px',
      marginTop: '30px',
      marginBottom: '30px',
      width: '100%',
      maxWidth: '800px'
    },
    capabilityCard: {
      background: 'rgba(255, 255, 255, 0.1)',
      backdropFilter: 'blur(10px)',
      borderRadius: '16px',
      padding: '24px',
      textAlign: 'center',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      transition: 'all 0.3s ease',
      cursor: 'pointer'
    },
    capabilityIcon: {
      fontSize: '32px',
      marginBottom: '16px',
      display: 'block'
    },
    examplePrompts: {
      marginTop: '30px',
      textAlign: 'center'
    },
    exampleTitle: {
      fontSize: '18px',
      fontWeight: '600',
      marginBottom: '16px',
      color: 'rgba(255, 255, 255, 0.9)'
    },
    promptExamples: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '12px',
      justifyContent: 'center',
      maxWidth: '600px',
      margin: '0 auto'
    },
    promptExample: {
      background: 'rgba(255, 255, 255, 0.15)',
      padding: '8px 16px',
      borderRadius: '20px',
      fontSize: '14px',
      color: 'rgba(255, 255, 255, 0.9)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      cursor: 'pointer',
      transition: 'all 0.2s ease'
    }
  };

  // Responsive breakpoints
  const isMobile = window.innerWidth <= 768;
  const responsiveStyles = isMobile ? {
    container: { ...styles.container, ...styles.mobileContainer },
    wrapper: { ...styles.wrapper, ...styles.mobileWrapper },
    header: { ...styles.header, ...styles.mobileHeader },
    chatArea: { ...styles.chatArea, ...styles.mobileChatArea },
    inputArea: { ...styles.inputArea, ...styles.mobileInputArea },
    inputForm: { ...styles.inputForm, ...styles.mobileInputForm },
    inputWrapper: { ...styles.inputWrapper, ...styles.mobileInputWrapper },
    sendButton: { ...styles.sendButton, ...styles.mobileSendButton }
  } : styles;

  return (
    <div style={responsiveStyles.container}>
      <div style={responsiveStyles.wrapper}>
        {/* Header */}
        <div style={responsiveStyles.header}>
          <div style={{ marginBottom: '20px' }}>
            <svg width="60" height="60" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="headerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{stopColor: '#ffffff', stopOpacity: 0.9}} />
                  <stop offset="100%" style={{stopColor: '#ffffff', stopOpacity: 0.7}} />
                </linearGradient>
              </defs>
              <rect width="100" height="100" rx="20" fill="url(#headerGrad)" stroke="rgba(255,255,255,0.3)" strokeWidth="2"/>
              <circle cx="35" cy="35" r="8" fill="#667eea"/>
              <circle cx="65" cy="35" r="8" fill="#667eea"/>
              <circle cx="35" cy="35" r="3" fill="white"/>
              <circle cx="65" cy="35" r="3" fill="white"/>
              <path d="M 30 60 Q 50 75 70 60" stroke="#667eea" strokeWidth="3" fill="none" strokeLinecap="round"/>
              <rect x="25" y="45" width="50" height="8" rx="4" fill="#667eea" opacity="0.8"/>
            </svg>
          </div>
          <h1 style={responsiveStyles.title}>Chat Bot</h1>
          <p style={responsiveStyles.subtitle}>Your friendly AI companion for tasks, accounts, and natural conversations</p>
        </div>

        {/* Chat Area */}
        <div ref={chatAreaRef} style={responsiveStyles.chatArea}>
          {msgs.length === 0 ? (
            <div style={responsiveStyles.welcomeContainer}>
              <div style={responsiveStyles.welcomeIcon}>
                <svg width="80" height="80" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="welcomeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" style={{stopColor: '#667eea', stopOpacity: 1}} />
                      <stop offset="100%" style={{stopColor: '#764ba2', stopOpacity: 1}} />
                    </linearGradient>
                  </defs>
                  <rect width="100" height="100" rx="20" fill="url(#welcomeGrad)"/>
                  <circle cx="35" cy="35" r="8" fill="white"/>
                  <circle cx="65" cy="35" r="8" fill="white"/>
                  <circle cx="35" cy="35" r="3" fill="#667eea"/>
                  <circle cx="65" cy="35" r="3" fill="#667eea"/>
                  <path d="M 30 60 Q 50 75 70 60" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round"/>
                  <rect x="25" y="45" width="50" height="8" rx="4" fill="white" opacity="0.8"/>
                </svg>
              </div>
              <h1 style={responsiveStyles.welcomeTitle}>Chat Bot</h1>
              <p style={responsiveStyles.welcomeText}>Your friendly AI companion who loves to chat and help with tasks and accounts</p>
              
              <div style={responsiveStyles.capabilitiesGrid}>
                <div style={responsiveStyles.capabilityCard}>
                  <div style={responsiveStyles.capabilityIcon}>
                    <svg width="32" height="32" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="50" cy="50" r="45" fill="#667eea" opacity="0.1"/>
                      <circle cx="35" cy="40" r="8" fill="#667eea"/>
                      <circle cx="65" cy="40" r="8" fill="#667eea"/>
                      <path d="M 30 65 Q 50 80 70 65" stroke="#667eea" strokeWidth="3" fill="none" strokeLinecap="round"/>
                      <path d="M 25 55 Q 50 70 75 55" stroke="#667eea" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.7"/>
                    </svg>
                  </div>
                  <h3>Natural Conversations</h3>
                  <p>Chat naturally about anything with a friendly AI</p>
                </div>
                <div style={responsiveStyles.capabilityCard}>
                  <div style={responsiveStyles.capabilityIcon}>
                    <svg width="32" height="32" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                      <rect x="20" y="15" width="60" height="70" rx="8" fill="#667eea" opacity="0.1" stroke="#667eea" strokeWidth="2"/>
                      <line x1="30" y1="35" x2="70" y2="35" stroke="#667eea" strokeWidth="3" strokeLinecap="round"/>
                      <line x1="30" y1="50" x2="70" y2="50" stroke="#667eea" strokeWidth="3" strokeLinecap="round"/>
                      <line x1="30" y1="65" x2="60" y2="65" stroke="#667eea" strokeWidth="3" strokeLinecap="round"/>
                      <circle cx="75" cy="65" r="8" fill="#667eea"/>
                      <path d="M 72 65 L 78 65 M 75 62 L 75 68" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <h3>Task Management</h3>
                  <p>Add, complete, and organize your todos</p>
                </div>
                <div style={responsiveStyles.capabilityCard}>
                  <div style={responsiveStyles.capabilityIcon}>
                    <svg width="32" height="32" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="50" cy="35" r="15" fill="#667eea" opacity="0.1" stroke="#667eea" strokeWidth="2"/>
                      <circle cx="50" cy="35" r="12" fill="#667eea"/>
                      <path d="M 20 80 Q 50 60 80 80" fill="#667eea" opacity="0.1" stroke="#667eea" strokeWidth="2"/>
                      <path d="M 20 80 Q 50 60 80 80" fill="#667eea"/>
                      <circle cx="35" cy="65" r="8" fill="#667eea" opacity="0.8"/>
                      <circle cx="65" cy="65" r="8" fill="#667eea" opacity="0.8"/>
                    </svg>
                  </div>
                  <h3>Account Management</h3>
                  <p>Create, update, and manage user accounts</p>
                </div>
              </div>
              
              <div style={responsiveStyles.examplePrompts}>
                <p style={responsiveStyles.exampleTitle}>Try asking me:</p>
                <div style={responsiveStyles.promptExamples}>
                  <span style={responsiveStyles.promptExample}>"Hello! How are you today?"</span>
                  <span style={responsiveStyles.promptExample}>"Add buy groceries to my list"</span>
                  <span style={responsiveStyles.promptExample}>"I'm feeling overwhelmed with work"</span>
                  <span style={responsiveStyles.promptExample}>"Show me all my todos"</span>
                  <span style={responsiveStyles.promptExample}>"Tell me a joke to cheer me up"</span>
                  <span style={responsiveStyles.promptExample}>"Create account for John"</span>
                </div>
              </div>
            </div>
          ) : (
            msgs.map((msg, index) => (
              <div
                key={index}
                style={{
                  ...responsiveStyles.messageContainer,
                  ...(msg.role === 'user' ? responsiveStyles.userMessage : responsiveStyles.aiMessage)
                }}
              >
                <div
                  style={{
                    ...responsiveStyles.messageBubble,
                    ...(msg.role === 'user' ? responsiveStyles.userBubble : responsiveStyles.aiBubble)
                  }}
                >
                  <p style={responsiveStyles.messageContent}>{msg.content}</p>
                  <div style={responsiveStyles.timestamp}>{formatTime(msg.timestamp)}</div>
                </div>
              </div>
            ))
          )}

          {/* Typing Indicator */}
          {isTyping && (
            <div style={responsiveStyles.typingIndicator}>
              <div style={responsiveStyles.typingDots}>
                <div style={responsiveStyles.dot}></div>
                <div style={{...responsiveStyles.dot, ...responsiveStyles.dot2}}></div>
                <div style={{...responsiveStyles.dot, ...responsiveStyles.dot3}}></div>
              </div>
              <span style={{color: '#666', fontSize: '14px'}}>AI is thinking...</span>
            </div>
          )}

          {/* New Messages Indicator */}
          {showNewMessagesIndicator && (
            <div style={responsiveStyles.typingIndicator}>
              <div style={responsiveStyles.typingDots}>
                <div style={responsiveStyles.dot}></div>
                <div style={{...responsiveStyles.dot, ...responsiveStyles.dot2}}></div>
                <div style={{...responsiveStyles.dot, ...responsiveStyles.dot3}}></div>
              </div>
              <span style={{color: '#666', fontSize: '14px'}}>New messages!</span>
            </div>
          )}

          <div ref={messagesEndRef} />
          
          {/* Scroll to bottom button */}
          {isUserScrolling && (
            <button
              onClick={() => {
                scrollToBottom();
                setIsUserScrolling(false);
              }}
              style={{
                position: 'absolute',
                bottom: '100px',
                right: '30px',
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                color: 'white',
                fontSize: '20px',
                cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s ease',
                zIndex: 1000
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'scale(1.1)';
                e.target.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'scale(1)';
                e.target.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.2)';
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M7 13l5 5 5-5"/>
                <path d="M7 6l5 5 5-5"/>
              </svg>
            </button>
          )}
        </div>

        {/* Input Area */}
        <div style={responsiveStyles.inputArea}>
          <form onSubmit={handleSubmit} style={responsiveStyles.inputForm}>
            <div style={responsiveStyles.inputWrapper}>
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Chat with me about anything! Tasks, accounts, or just say hello! 👋"
                style={{
                  ...responsiveStyles.textarea,
                  ...(inputValue.trim() ? responsiveStyles.textareaFocus : {})
                }}
                rows="1"
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              disabled={!inputValue.trim() || loading}
              style={{
                ...responsiveStyles.sendButton,
                ...(inputValue.trim() && !loading ? {} : responsiveStyles.sendButtonDisabled)
              }}
              onMouseEnter={(e) => {
                if (inputValue.trim() && !loading) {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.4)';
                }
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'none';
                e.target.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.3)';
              }}
            >
              {loading ? (
                <>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid white',
                    borderTop: '2px solid transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  <span>Send</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div style={responsiveStyles.errorContainer}>
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export default Chat;
