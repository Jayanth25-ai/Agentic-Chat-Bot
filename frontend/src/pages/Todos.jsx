import React, { useState, useEffect } from 'react';
import api from '../lib/auth';

export default function Todos() {
  const [todos, setTodos] = useState([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); // all, pending, completed

  async function fetchTodos() {
    try {
      const { data } = await api.get('/todos');
      console.log('Fetched todos:', data); // Debug log
      setTodos(data.data || []);
    } catch (err) {
      console.error('Error fetching todos:', err);
      setError('Failed to load todos');
    }
  }

  useEffect(() => {
    fetchTodos();
    // Listen for updates triggered from Chat page actions
    const onChanged = () => fetchTodos();
    window.addEventListener('todos:changed', onChanged);
    return () => window.removeEventListener('todos:changed', onChanged);
  }, []);

  async function addTodo(e) {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    try {
      const { data } = await api.post('/todos', { title: title.trim() });
      console.log('Added todo:', data); // Debug log
      setTodos([data.data, ...todos]);
      setTitle('');
    } catch (err) {
      console.error('Error adding todo:', err);
      setError('Failed to add todo');
    } finally {
      setLoading(false);
    }
  }

  async function toggle(todo) {
    try {
      const { data } = await api.patch(`/todos/${todo._id}/toggle`);
      setTodos(todos.map(t => t._id === todo._id ? data.data : t));
    } catch (err) {
      console.error('Error toggling todo:', err);
      setError('Failed to toggle todo');
    }
  }

  async function remove(todo) {
    try {
      await api.delete(`/todos/${todo._id}`);
      setTodos(todos.filter(t => t._id !== todo._id));
    } catch (err) {
      console.error('Error removing todo:', err);
      setError('Failed to delete todo');
    }
  }

  const filteredTodos = todos.filter(todo => {
    if (filter === 'pending') return !todo.isCompleted;
    if (filter === 'completed') return todo.isCompleted;
    return true;
  });

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
      fontSize: 'clamp(1.8rem, 4vw, 2.5rem)',
      fontWeight: 'bold',
      margin: '0 0 10px 0',
      textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
    },
    subtitle: {
      fontSize: 'clamp(0.9rem, 2.5vw, 1.1rem)',
      opacity: 0.9,
      margin: 0
    },
    content: {
      padding: '30px 20px'
    },
    addSection: {
      background: 'white',
      borderRadius: '15px',
      padding: '25px',
      marginBottom: '30px',
      boxShadow: '0 4px 15px rgba(0, 0, 0, 0.05)',
      border: '1px solid #e2e8f0'
    },
    addTitle: {
      fontSize: '1.5rem',
      fontWeight: 'bold',
      color: '#333',
      margin: '0 0 20px 0',
      textAlign: 'center'
    },
    addForm: {
      display: 'flex',
      gap: '15px',
      alignItems: 'flex-end',
      flexWrap: 'wrap'
    },
    inputWrapper: {
      flex: '1 1 300px',
      minWidth: '250px'
    },
    input: {
      width: '100%',
      padding: '15px 20px',
      border: '2px solid #e2e8f0',
      borderRadius: '25px',
      fontSize: '14px',
      outline: 'none',
      transition: 'all 0.3s ease',
      fontFamily: 'inherit',
      boxSizing: 'border-box'
    },
    inputFocus: {
      border: '2px solid #667eea',
      boxShadow: '0 0 0 3px rgba(102, 126, 234, 0.1)'
    },
    addButton: {
      padding: '15px 30px',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      border: 'none',
      borderRadius: '25px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
      flexShrink: 0
    },
    addButtonHover: {
      transform: 'translateY(-2px)',
      boxShadow: '0 6px 20px rgba(102, 126, 234, 0.4)'
    },
    addButtonDisabled: {
      opacity: 0.6,
      cursor: 'not-allowed',
      transform: 'none'
    },
    filterSection: {
      display: 'flex',
      gap: '10px',
      marginBottom: '25px',
      flexWrap: 'wrap',
      justifyContent: 'center'
    },
    filterButton: {
      padding: '8px 16px',
      border: '2px solid #e2e8f0',
      borderRadius: '20px',
      background: 'white',
      color: '#666',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      fontSize: '14px',
      fontWeight: '500'
    },
    filterButtonActive: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      border: '2px solid transparent',
      boxShadow: '0 2px 10px rgba(102, 126, 234, 0.3)'
    },
    todoList: {
      display: 'flex',
      flexDirection: 'column',
      gap: '15px'
    },
    todoItem: {
      background: 'white',
      borderRadius: '15px',
      padding: '20px',
      boxShadow: '0 4px 15px rgba(0, 0, 0, 0.05)',
      border: '1px solid #e2e8f0',
      transition: 'all 0.3s ease'
    },
    todoItemHover: {
      transform: 'translateY(-2px)',
      boxShadow: '0 6px 20px rgba(0, 0, 0, 0.1)'
    },
    todoHeader: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '15px',
      flexWrap: 'wrap',
      gap: '15px'
    },
    todoTitle: {
      fontSize: '16px',
      fontWeight: '600',
      color: '#333',
      flex: '1',
      wordBreak: 'break-word'
    },
    todoStatus: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '12px',
      padding: '4px 12px',
      borderRadius: '15px',
      fontWeight: '500'
    },
    statusPending: {
      background: '#fef3c7',
      color: '#d97706'
    },
    statusCompleted: {
      background: '#d1fae5',
      color: '#059669'
    },
    todoActions: {
      display: 'flex',
      gap: '10px',
      flexWrap: 'wrap'
    },
    actionButton: {
      padding: '8px 16px',
      border: 'none',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      display: 'flex',
      alignItems: 'center',
      gap: '6px'
    },
    completeButton: {
      background: '#10b981',
      color: 'white'
    },
    completeButtonHover: {
      background: '#059669',
      transform: 'translateY(-1px)'
    },
    undoButton: {
      background: '#6b7280',
      color: 'white'
    },
    undoButtonHover: {
      background: '#4b5563',
      transform: 'translateY(-1px)'
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
      padding: '60px 20px',
      color: '#666'
    },
    emptyIcon: {
      width: '80px',
      height: '80px',
      background: 'rgba(102, 126, 234, 0.1)',
      borderRadius: '50%',
      margin: '0 auto 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    emptyTitle: {
      fontSize: '20px',
      fontWeight: 'bold',
      color: '#333',
      margin: '0 0 10px 0'
    },
    emptyText: {
      fontSize: '16px',
      color: '#666'
    },
    errorContainer: {
      background: '#fef2f2',
      border: '1px solid #fecaca',
      borderRadius: '10px',
      padding: '15px',
      margin: '20px 0',
      color: '#dc2626',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      fontSize: '14px'
    },
    // Mobile styles
    mobileContainer: {
      padding: '10px'
    },
    mobileWrapper: {
      borderRadius: '15px'
    },
    mobileHeader: {
      padding: '20px 15px'
    },
    mobileContent: {
      padding: '20px 15px'
    },
    mobileAddForm: {
      flexDirection: 'column',
      gap: '10px'
    },
    mobileInputWrapper: {
      flex: '1 1 auto',
      minWidth: 'auto'
    },
    mobileAddButton: {
      width: '100%',
      justifyContent: 'center'
    }
  };

  // Responsive breakpoints
  const isMobile = window.innerWidth <= 768;
  const responsiveStyles = isMobile ? {
    container: { ...styles.container, ...styles.mobileContainer },
    wrapper: { ...styles.wrapper, ...styles.mobileWrapper },
    header: { ...styles.header, ...styles.mobileHeader },
    content: { ...styles.content, ...styles.mobileContent },
    addForm: { ...styles.addForm, ...styles.mobileAddForm },
    inputWrapper: { ...styles.inputWrapper, ...styles.mobileInputWrapper },
    addButton: { ...styles.addButton, ...styles.mobileAddButton }
  } : styles;

  return (
    <div style={responsiveStyles.container}>
      <div style={responsiveStyles.wrapper}>
        {/* Header */}
        <div style={responsiveStyles.header}>
          <h1 style={responsiveStyles.title}>Todo List</h1>
          <p style={responsiveStyles.subtitle}>Manage your tasks efficiently</p>
        </div>

        {/* Content */}
        <div style={responsiveStyles.content}>
          {/* Add Task Section */}
          <div style={styles.addSection}>
            <h2 style={styles.addTitle}>Add New Task</h2>
            <form onSubmit={addTodo} style={responsiveStyles.addForm}>
              <div style={responsiveStyles.inputWrapper}>
                <input
                  style={{
                    ...styles.input,
                    ...(title.trim() ? styles.inputFocus : {})
                  }}
                  placeholder="Enter task title..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={loading}
                />
              </div>
              <button
                type="submit"
                disabled={!title.trim() || loading}
                style={{
                  ...styles.addButton,
                  ...(title.trim() && !loading ? {} : styles.addButtonDisabled)
                }}
                onMouseEnter={(e) => {
                  if (title.trim() && !loading) {
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
                    <span>Adding...</span>
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Add Task</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Error Display */}
          {error && (
            <div style={styles.errorContainer}>
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Filter Section */}
          <div style={styles.filterSection}>
            <button
              style={{
                ...styles.filterButton,
                ...(filter === 'all' ? styles.filterButtonActive : {})
              }}
              onClick={() => setFilter('all')}
            >
              All ({todos.length})
            </button>
            <button
              style={{
                ...styles.filterButton,
                ...(filter === 'pending' ? styles.filterButtonActive : {})
              }}
              onClick={() => setFilter('pending')}
            >
              Pending ({todos.filter(t => !t.isCompleted).length})
            </button>
            <button
              style={{
                ...styles.filterButton,
                ...(filter === 'completed' ? styles.filterButtonActive : {})
              }}
              onClick={() => setFilter('completed')}
            >
              Completed ({todos.filter(t => t.isCompleted).length})
            </button>
          </div>

          {/* Todo List */}
          <div style={styles.todoList}>
            {filteredTodos.length === 0 ? (
              <div style={styles.emptyState}>
                <div style={styles.emptyIcon}>
                  <svg width="40" height="40" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{color: '#667eea'}}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h3 style={styles.emptyTitle}>
                  {filter === 'all' ? 'No tasks yet' : 
                   filter === 'pending' ? 'No pending tasks' : 'No completed tasks'}
                </h3>
                <p style={styles.emptyText}>
                  {filter === 'all' ? 'Create your first task to get started!' : 
                   filter === 'pending' ? 'All tasks are completed!' : 'Complete some tasks to see them here!'}
                </p>
              </div>
            ) : (
              filteredTodos.map(todo => (
                <div
                  key={todo._id}
                  style={styles.todoItem}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'none';
                    e.target.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.05)';
                  }}
                >
                  <div style={styles.todoHeader}>
                    <div style={styles.todoTitle}>{todo.title}</div>
                    <div style={{
                      ...styles.todoStatus,
                      ...(todo.isCompleted ? styles.statusCompleted : styles.statusPending)
                    }}>
                      {todo.isCompleted ? '✓ Completed' : '⏳ Pending'}
                    </div>
                  </div>
                  <div style={styles.todoActions}>
                    <button
                      style={{
                        ...styles.actionButton,
                        ...(todo.isCompleted ? styles.undoButton : styles.completeButton)
                      }}
                      onClick={() => toggle(todo)}
                      onMouseEnter={(e) => {
                        e.target.style.transform = 'translateY(-1px)';
                        if (todo.isCompleted) {
                          e.target.style.background = '#4b5563';
                        } else {
                          e.target.style.background = '#059669';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = 'none';
                        if (todo.isCompleted) {
                          e.target.style.background = '#6b7280';
                        } else {
                          e.target.style.background = '#10b981';
                        }
                      }}
                    >
                      {todo.isCompleted ? '↶ Undo' : '✓ Complete'}
                    </button>
                    <button
                      style={styles.actionButton}
                      onClick={() => remove(todo)}
                      onMouseEnter={(e) => {
                        e.target.style.background = '#dc2626';
                        e.target.style.transform = 'translateY(-1px)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = '#ef4444';
                        e.target.style.transform = 'none';
                      }}
                    >
                      🗑️ Delete
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
