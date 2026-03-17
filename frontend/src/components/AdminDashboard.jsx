import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AdminDashboard = ({ onBack }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState('all');
  const [loginLoading, setLoginLoading] = useState(false);

  const logsPerPage = 20;

  useEffect(() => {
    if (isLoggedIn) {
      fetchStats();
      fetchLogs();
    }
  }, [isLoggedIn, currentPage, filter]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');

    try {
      const response = await axios.post('/api/admin/login', {
        username,
        password
      });

      if (response.data.success) {
        setIsLoggedIn(true);
        setUsername('');
        setPassword('');
      }
    } catch (error) {
      setLoginError('Invalid credentials');
    } finally {
      setLoginLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get('/api/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/logs', {
        params: {
          page: currentPage,
          limit: logsPerPage,
          type: filter === 'all' ? undefined : filter
        }
      });
      
      setLogs(response.data.logs);
      setTotalPages(Math.ceil(response.data.total / logsPerPage));
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setLogs([]);
    setStats({});
    setCurrentPage(1);
  };

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setCurrentPage(1);
  };

  const exportLogs = async () => {
    try {
      const response = await axios.get('/api/logs/export', {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `reset-logs-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Failed to export logs:', error);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getFilterLabel = (type) => {
    switch (type) {
      case 'page_load': return 'Page Loads';
      case 'reset_request': return 'Reset Requests';
      default: return 'All Logs';
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="container">
        <div className="logo">
          <h1>Admin Login</h1>
          <p>System Administration</p>
        </div>

        {loginError && (
          <div className="error-message">
            {loginError}
          </div>
        )}

        <form className="form" onSubmit={handleLogin}>
          <h2>Administrator Access</h2>
          <p className="form-description">
            Enter your administrator credentials to access the dashboard.
          </p>

          <div className="form-group">
            <label htmlFor="username" className="form-label">
              Username
            </label>
            <input
              type="text"
              id="username"
              className="form-input"
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loginLoading}
              autoComplete="username"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <input
              type="password"
              id="password"
              className="form-input"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loginLoading}
              autoComplete="current-password"
              required
            />
          </div>

          <button 
            type="submit" 
            className={`btn ${loginLoading ? 'loading' : ''}`}
            disabled={loginLoading}
          >
            {loginLoading ? '' : 'Login'}
          </button>
        </form>

        <div className="admin-link">
          <a href="#" onClick={(e) => { e.preventDefault(); onBack(); }}>
            ← Back to Password Reset
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Admin Dashboard</h1>
        <div>
          <button className="export-btn" onClick={exportLogs}>
            📊 Export Logs
          </button>
          <button className="back-btn" onClick={handleLogout} style={{ marginLeft: '0.5rem' }}>
            Logout
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-number">{stats.totalRequests || 0}</div>
          <div className="stat-label">Total Requests</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.resetRequests || 0}</div>
          <div className="stat-label">Reset Requests</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.pageLoads || 0}</div>
          <div className="stat-label">Page Loads</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.uniqueIPs || 0}</div>
          <div className="stat-label">Unique IPs</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.uniqueUsers || 0}</div>
          <div className="stat-label">Unique Users</div>
        </div>
      </div>

      <div className="logs-section">
        <div className="logs-header">
          <h2 className="logs-title">Activity Logs</h2>
        </div>

        <div className="log-filters">
          {['all', 'page_load', 'reset_request'].map(type => (
            <button
              key={type}
              className={`filter-btn ${filter === type ? 'active' : ''}`}
              onClick={() => handleFilterChange(type)}
            >
              {getFilterLabel(type)}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <div className="btn loading" style={{ margin: '0 auto', width: '40px' }}></div>
          </div>
        ) : (
          <>
            <div className="logs-table">
              <table>
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Type</th>
                    <th>User ID/Email</th>
                    <th>IP Address</th>
                    <th>Hostname</th>
                    <th>User Agent</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, index) => (
                    <tr key={index}>
                      <td className="log-time">{formatDate(log.createdAt)}</td>
                      <td>
                        <span className={`filter-btn ${filter === log.requestType ? 'active' : ''}`} style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}>
                          {log.requestType === 'page_load' ? 'Page Load' : 'Reset Request'}
                        </span>
                      </td>
                      <td>
                        {log.userIdProvided ? (
                          <span className="log-user-id">{log.userIdProvided}</span>
                        ) : (
                          <span style={{ color: 'var(--text-secondary)' }}>—</span>
                        )}
                      </td>
                      <td className="log-ip">{log.clientIpAddress}</td>
                      <td>{log.clientHostname || 'Unknown'}</td>
                      <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {log.userAgent}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="pagination">
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </button>
                <span className="pagination-info">
                  Page {currentPage} of {totalPages}
                </span>
                <button 
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
