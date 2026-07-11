import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaSun, FaMoon } from 'react-icons/fa';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { useTheme } from '../ThemeContext';
import { applyTheme } from '../themes';
import './AdminDashboard.css';

const COLORS = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#43e97b'];

function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [userActivity, setUserActivity] = useState([]);
  const [topUsers, setTopUsers] = useState([]);
  const [users, setUsers] = useState([]);
  const [ipStats, setIpStats] = useState([]);
  const [activities, setActivities] = useState([]);
  const [decks, setDecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [editingDeck, setEditingDeck] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();

  // Apply ocean-black theme on mount
  useEffect(() => {
    applyTheme('ocean-black', isDark ? 'dark' : 'light');
  }, [isDark]);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      navigate('/admin/login');
      return;
    }

    fetchDashboardData();
  }, [navigate]);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Fetch all dashboard data
      const [statsRes, activityRes, topUsersRes, usersRes, ipRes, activitiesRes, decksRes] = await Promise.all([
        fetch('/api/admin/dashboard/stats', { headers }),
        fetch('/api/admin/dashboard/user-activity?days=30', { headers }),
        fetch('/api/admin/dashboard/top-users?limit=10', { headers }),
        fetch('/api/admin/users?limit=20', { headers }),
        fetch('/api/admin/dashboard/ip-stats?days=7', { headers }),
        fetch('/api/admin/activities?limit=20', { headers }),
        fetch('/api/admin/decks?limit=20', { headers })
      ]);

      const [statsData, activityData, topUsersData, usersData, ipData, activitiesData, decksData] = await Promise.all([
        statsRes.json(),
        activityRes.json(),
        topUsersRes.json(),
        usersRes.json(),
        ipRes.json(),
        activitiesRes.json(),
        decksRes.json()
      ]);

      setStats(statsData);
      setUserActivity(activityData);
      setTopUsers(topUsersData);
      setUsers(usersData.users || []);
      setIpStats(ipData);
      setActivities(activitiesData.activities || []);
      setDecks(decksData.decks || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      if (error.message.includes('401')) {
        navigate('/admin/login');
      }
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminData');
    navigate('/admin/login');
  };

  const handleEditDeck = (deck) => {
    setEditingDeck(deck._id);
    setEditTitle(deck.title);
  };

  const handleSaveEdit = async (deckId) => {
    try {
      const token = localStorage.getItem('adminToken');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const response = await fetch(`/api/admin/decks/${deckId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ title: editTitle.trim() })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update deck');
      }

      // Update the deck in the list
      setDecks(decks.map(deck => 
        deck._id === deckId ? { ...deck, title: editTitle.trim() } : deck
      ));

      setEditingDeck(null);
      setEditTitle('');
    } catch (error) {
      console.error('Error updating deck:', error);
      alert('Failed to update deck: ' + error.message);
    }
  };

  const handleCancelEdit = () => {
    setEditingDeck(null);
    setEditTitle('');
  };

  const handleDeleteDeck = async (deckId, deckTitle) => {
    if (!window.confirm(`Are you sure you want to delete the deck "${deckTitle}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const response = await fetch(`/api/admin/decks/${deckId}`, {
        method: 'DELETE',
        headers
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete deck');
      }

      // Remove the deck from the list
      setDecks(decks.filter(deck => deck._id !== deckId));
    } catch (error) {
      console.error('Error deleting deck:', error);
      alert('Failed to delete deck: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="admin-dashboard-loading">
        <div className="book-loader"></div>
        <p>Loading Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      {/* Header */}
      <header className="admin-header">
        <div className="admin-header-left">
          <h1>🎛️ Admin Dashboard</h1>
          <p>Flashcard Management System</p>
        </div>
        <div className="admin-header-right">
          <button className="theme-toggle-btn" onClick={toggleTheme} title={isDark ? 'Light mode' : 'Dark mode'}>
            {isDark ? <FaSun /> : <FaMoon />}
          </button>
          <button onClick={() => navigate('/')} className="btn-back-to-app">
            🏠 Back to App
          </button>
          <button onClick={handleLogout} className="btn-logout">
            🚪 Logout
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="admin-tabs">
        <button
          className={`admin-tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📊 Overview
        </button>
        <button
          className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          👥 Users
        </button>
        <button
          className={`admin-tab ${activeTab === 'activities' ? 'active' : ''}`}
          onClick={() => setActiveTab('activities')}
        >
          📝 Activities
        </button>
        <button
          className={`admin-tab ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          📈 Analytics
        </button>
        <button
          className={`admin-tab ${activeTab === 'decks' ? 'active' : ''}`}
          onClick={() => setActiveTab('decks')}
        >
          📚 Decks
        </button>
      </div>

      {/* Content */}
      <div className="admin-content">
        {activeTab === 'overview' && (
          <div className="overview-tab">
            {/* Stats Cards */}
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">👥</div>
                <div className="stat-info">
                  <h3>Total Users</h3>
                  <p className="stat-number">{stats?.overview.totalUsers || 0}</p>
                  <span className="stat-subtext">
                    +{stats?.overview.newUsersThisMonth || 0} this month
                  </span>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">📚</div>
                <div className="stat-info">
                  <h3>Total Decks</h3>
                  <p className="stat-number">{stats?.overview.totalDecks || 0}</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">🎴</div>
                <div className="stat-info">
                  <h3>Total Cards</h3>
                  <p className="stat-number">{stats?.overview.totalCards || 0}</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">⚡</div>
                <div className="stat-info">
                  <h3>Active Users (7d)</h3>
                  <p className="stat-number">{stats?.overview.activeUsersCount || 0}</p>
                  <span className="stat-subtext">
                    {stats?.overview.dailyActiveUsersCount || 0} today
                  </span>
                </div>
              </div>
            </div>

            {/* Charts Row */}
            <div className="charts-row">
              {/* User Activity Chart */}
              <div className="chart-card">
                <h3>User Activity (Last 30 Days)</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={userActivity}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="_id" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="logins" stroke="#667eea" strokeWidth={2} />
                    <Line type="monotone" dataKey="decksCreated" stroke="#764ba2" strokeWidth={2} />
                    <Line type="monotone" dataKey="cardsAdded" stroke="#f093fb" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Activity Types Chart */}
              <div className="chart-card">
                <h3>Activity Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={Object.entries(stats?.activityStats || {}).map(([key, value]) => ({
                        name: key,
                        value
                      }))}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${entry.value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {Object.entries(stats?.activityStats || {}).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top Users */}
            <div className="chart-card">
              <h3>Top Active Users</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topUsers}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="email" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="activityCount" fill="#667eea" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="users-tab">
            <div className="users-header">
              <h2>User Management</h2>
              <p>{users.length} users</p>
            </div>
            <div className="users-table">
              <table>
                <thead>
                  <tr>
                    <th>User ID</th>
                    <th>Email</th>
                    <th>Username</th>
                    <th>Decks</th>
                    <th>Cards</th>
                    <th>Last Activity</th>
                    <th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user._id}>
                      <td className="user-id-cell">{user._id}</td>
                      <td>{user.email}</td>
                      <td>{user.username || '—'}</td>
                      <td>{user.stats?.deckCount || 0}</td>
                      <td>{user.stats?.cardCount || 0}</td>
                      <td>
                        {user.stats?.lastActivity
                          ? new Date(user.stats.lastActivity.timestamp).toLocaleDateString()
                          : 'Never'}
                      </td>
                      <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'activities' && (
          <div className="activities-tab">
            <div className="activities-header">
              <h2>Recent Activities</h2>
              <p>{activities.length} activities</p>
            </div>
            <div className="activities-list">
              {activities.map((activity) => (
                <div key={activity._id} className="activity-item">
                  <div className="activity-icon">
                    {activity.action === 'login' && '🔑'}
                    {activity.action === 'create_deck' && '📚'}
                    {activity.action === 'add_card' && '➕'}
                    {activity.action === 'delete_card' && '🗑️'}
                    {activity.action === 'upload_file' && '📤'}
                  </div>
                  <div className="activity-details">
                    <div className="activity-user">
                      {activity.user?.email || 'Unknown User'}
                    </div>
                    <div className="activity-action">{activity.action.replace('_', ' ')}</div>
                    <div className="activity-time">
                      {new Date(activity.timestamp).toLocaleString()}
                    </div>
                  </div>
                  {activity.ipAddress && (
                    <div className="activity-ip">
                      IP: {activity.ipAddress}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="analytics-tab">
            <div className="chart-card">
              <h3>IP Address Statistics (Last 7 Days)</h3>
              <div className="ip-stats-table">
                <table>
                  <thead>
                    <tr>
                      <th>IP Address</th>
                      <th>Activity Count</th>
                      <th>Unique Users</th>
                      <th>Last Activity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ipStats.map((stat, index) => (
                      <tr key={index}>
                        <td className="ip-address">{stat.ipAddress}</td>
                        <td>{stat.activityCount}</td>
                        <td>{stat.uniqueUserCount}</td>
                        <td>{new Date(stat.lastActivity).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'decks' && (
          <div className="decks-tab">
            <div className="decks-header">
              <h2>Deck Management</h2>
              <p>{decks.length} decks</p>
            </div>
            <div className="decks-table">
              <table>
                <thead>
                  <tr>
                    <th>Deck Title</th>
                    <th>Created By</th>
                    <th>Cards</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {decks.map((deck) => (
                    <tr key={deck._id}>
                      <td>
                        {editingDeck === deck._id ? (
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleSaveEdit(deck._id);
                              } else if (e.key === 'Escape') {
                                handleCancelEdit();
                              }
                            }}
                            autoFocus
                            className="deck-edit-input"
                          />
                        ) : (
                          <span>{deck.title}</span>
                        )}
                      </td>
                      <td>
                        {deck.user ? (
                          <div className="deck-user-info">
                            <div className="deck-user-email">{deck.user.email}</div>
                            {deck.user.name && (
                              <div className="deck-user-name">{deck.user.name}</div>
                            )}
                          </div>
                        ) : (
                          <span className="deck-no-user">—</span>
                        )}
                      </td>
                      <td>{deck.cardCount}</td>
                      <td>{new Date(deck.createdAt).toLocaleDateString()}</td>
                      <td>
                        <div className="deck-actions">
                          {editingDeck === deck._id ? (
                            <>
                              <button
                                className="deck-action-btn save-btn"
                                onClick={() => handleSaveEdit(deck._id)}
                                title="Save"
                              >
                                ✓
                              </button>
                              <button
                                className="deck-action-btn cancel-btn"
                                onClick={handleCancelEdit}
                                title="Cancel"
                              >
                                ✕
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                className="deck-action-btn edit-btn"
                                onClick={() => handleEditDeck(deck)}
                                title="Edit"
                              >
                                ✏️
                              </button>
                              <button
                                className="deck-action-btn delete-btn"
                                onClick={() => handleDeleteDeck(deck._id, deck.title)}
                                title="Delete"
                              >
                                🗑️
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminDashboard;

