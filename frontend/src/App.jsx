import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { ChatProvider, useChat } from './context/ChatContext';
import Chat from './pages/Chat';
import Todos from './pages/Todos';
import Accounts from './pages/Accounts';

// Navigation Component
const Navigation = () => {
  const { unreadCount } = useChat();
  
  const styles = {
    nav: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '16px 24px',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
      position: 'sticky',
      top: 0,
      zIndex: 1000
    },
    navContent: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      maxWidth: '1200px',
      margin: '0 auto'
    },
    logo: {
      color: 'white',
      fontSize: '24px',
      fontWeight: '700',
      textDecoration: 'none',
      minWidth: 'fit-content',
      flexShrink: 0
    },
    navLinks: {
      display: 'flex',
      alignItems: 'center',
      gap: '32px',
      marginLeft: 'auto'
    },
    navLink: {
      color: 'white',
      textDecoration: 'none',
      fontSize: '16px',
      fontWeight: '500',
      padding: '8px 16px',
      borderRadius: '8px',
      transition: 'all 0.3s ease',
      position: 'relative',
      '&:hover': {
        background: 'rgba(255, 255, 255, 0.1)',
        transform: 'translateY(-2px)'
      }
    },
    unreadBadge: {
      position: 'absolute',
      top: '-8px',
      right: '-8px',
      background: '#ef4444',
      color: 'white',
      borderRadius: '50%',
      width: '20px',
      height: '20px',
      fontSize: '12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 'bold'
    }
  };

  return (
    <nav style={styles.nav}>
      <div style={styles.navContent}>
        <Link to="/" style={styles.logo}>
          <span style={{ marginRight: '10px', fontSize: '28px' }}>🤖</span>
          Chat Bot
        </Link>
        
        <div style={styles.navLinks}>
          <Link to="/chat" style={styles.navLink}>
            Chat
            {unreadCount > 0 && (
              <span style={styles.unreadBadge}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
          <Link to="/todos" style={styles.navLink}>
            Todo List
          </Link>
          <Link to="/accounts" style={styles.navLink}>
            Account
          </Link>
        </div>
      </div>
    </nav>
  );
};

// Main App Component
const App = () => {
  return (
    <ChatProvider>
      <Router>
        <Navigation />
        <Routes>
          <Route 
            path="/chat" 
            element={<Chat />}
          />
          <Route 
            path="/todos" 
            element={<Todos />}
          />
          <Route 
            path="/accounts" 
            element={<Accounts />}
          />
          <Route path="/" element={<Navigate to="/chat" />} />
        </Routes>
      </Router>
    </ChatProvider>
  );
};

export default App;
