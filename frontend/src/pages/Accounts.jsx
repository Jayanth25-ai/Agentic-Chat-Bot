import React, { useState, useEffect } from 'react';
import api from '../lib/auth';

export default function Accounts() {
  const [accounts, setAccounts] = useState([]);
  const [error, setError] = useState('');

  async function fetchAccounts() {
    try {
      const { data } = await api.get('/accounts');
      setAccounts(data.data || []);
    } catch (err) {
      console.error('Error fetching accounts:', err);
      setError('Failed to load accounts');
    }
  }

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleDelete = async (account) => {
    if (window.confirm(`Are you sure you want to delete the account for ${account.email}?`)) {
      try {
        await api.delete(`/accounts/${account._id}`);
        setAccounts(accounts.filter(a => a._id !== account._id));
      } catch (err) {
        console.error('Error deleting account:', err);
        setError('Failed to delete account');
      }
    }
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
      minHeight: 'calc(100vh - 120px)'
    },
    header: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '30px 20px',
      textAlign: 'center',
      color: 'white'
    },
    title: {
      fontSize: 'clamp(1.8rem, 5vw, 2.5rem)',
      fontWeight: 'bold',
      margin: '0 0 10px 0',
      textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
    },
    subtitle: {
      fontSize: 'clamp(0.9rem, 3vw, 1.1rem)',
      opacity: 0.9,
      margin: 0,
      lineHeight: '1.4'
    },
    content: {
      padding: '30px 20px'
    },
    infoBox: {
      background: 'rgba(102, 126, 234, 0.1)',
      border: '1px solid rgba(102, 126, 234, 0.2)',
      borderRadius: '12px',
      padding: '20px',
      marginBottom: '30px',
      textAlign: 'center'
    },
    infoTitle: {
      fontSize: '18px',
      fontWeight: '600',
      color: '#667eea',
      marginBottom: '10px'
    },
    infoText: {
      color: '#666',
      lineHeight: '1.6'
    },
    accountList: {
      display: 'flex',
      flexDirection: 'column',
      gap: '20px'
    },
    accountItem: {
      background: 'white',
      borderRadius: '16px',
      padding: '24px',
      boxShadow: '0 4px 15px rgba(0, 0, 0, 0.05)',
      border: '1px solid #e2e8f0',
      transition: 'all 0.3s ease'
    },
    accountHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '16px'
    },
    accountInfo: {
      flex: '1'
    },
    accountName: {
      fontSize: '20px',
      fontWeight: '600',
      color: '#333',
      marginBottom: '8px'
    },
    accountEmail: {
      fontSize: '16px',
      color: '#666',
      marginBottom: '8px'
    },
    accountRole: {
      display: 'inline-block',
      background: '#667eea',
      color: 'white',
      padding: '4px 12px',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: '500',
      textTransform: 'uppercase'
    },
    accountStatus: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      marginTop: '8px'
    },
    statusIndicator: {
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      background: '#10b981'
    },
    statusText: {
      fontSize: '14px',
      color: '#666'
    },
    accountActions: {
      display: 'flex',
      gap: '12px',
      marginTop: '16px'
    },
    actionButton: {
      padding: '8px 16px',
      borderRadius: '8px',
      border: 'none',
      fontSize: '14px',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'all 0.2s ease'
    },
    deleteButton: {
      background: '#ef4444',
      color: 'white'
    },
    deleteButtonHover: {
      background: '#dc2626',
      transform: 'translateY(-1px)'
    },
    emptyState: {
      textAlign: 'center',
      padding: '60px 20px'
    },
    emptyIcon: {
      fontSize: '64px',
      color: '#667eea',
      marginBottom: '20px'
    },
    emptyTitle: {
      fontSize: '24px',
      fontWeight: '600',
      color: '#333',
      marginBottom: '12px'
    },
    emptyText: {
      fontSize: '16px',
      color: '#666',
      lineHeight: '1.6'
    },
    error: {
      background: '#fee',
      color: '#c53030',
      padding: '12px 16px',
      borderRadius: '8px',
      marginBottom: '20px',
      border: '1px solid #fed7d7',
      textAlign: 'center'
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.wrapper}>
        <div style={styles.header}>
          <h1 style={styles.title}>Account Management</h1>
          <p style={styles.subtitle}>Manage your created accounts</p>
        </div>

        <div style={styles.content}>
          {error && (
            <div style={styles.error}>
              {error}
            </div>
          )}

          <div style={styles.infoBox}>
            <div style={styles.infoTitle}>💡 How to Create Accounts</div>
            <div style={styles.infoText}>
              Use the Chat feature to create accounts naturally! Try saying: "Create an account for John with email john@example.com" 
              and the AI will ask for the password. You can also update, delete accounts, and change passwords through chat.
            </div>
          </div>

          {/* Account List */}
          <div style={styles.accountList}>
            {accounts.length === 0 ? (
              <div style={styles.emptyState}>
                <div style={styles.emptyIcon}>
                  <svg width="64" height="64" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h3 style={styles.emptyTitle}>No accounts yet</h3>
                <p style={styles.emptyText}>
                  Create your first account using the Chat feature! The AI will guide you through the process.
                </p>
              </div>
            ) : (
              accounts.map(account => (
                <div
                  key={account._id}
                  style={styles.accountItem}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'none';
                    e.target.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.05)';
                  }}
                >
                  <div style={styles.accountHeader}>
                    <div style={styles.accountInfo}>
                      <div style={styles.accountName}>{account.name}</div>
                      <div style={styles.accountEmail}>{account.email}</div>
                      <div style={styles.accountRole}>{account.role}</div>
                      <div style={styles.accountStatus}>
                        <div style={{
                          ...styles.statusIndicator,
                          background: account.isActive ? '#10b981' : '#6b7280'
                        }}></div>
                        <span style={styles.statusText}>
                          {account.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div style={styles.accountActions}>
                    <button
                      style={styles.actionButton}
                      onClick={() => handleDelete(account)}
                      onMouseEnter={(e) => {
                        e.target.style.background = '#dc2626';
                        e.target.style.transform = 'translateY(-1px)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = '#ef4444';
                        e.target.style.transform = 'none';
                      }}
                    >
                      🗑️ Delete Account
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


