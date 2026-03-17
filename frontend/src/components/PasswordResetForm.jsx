import React, { useState } from 'react';
import axios from 'axios';

const PasswordResetForm = ({ onAdminClick }) => {
  const [userId, setUserId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!userId.trim()) {
      setError('Please enter a user ID or email address');
      return;
    }

    setIsLoading(true);
    setError('');
    setShowSuccess(false);

    try {
      // Send reset request to backend
      const response = await axios.post('/api/reset-request', {
        userIdProvided: userId.trim()
      });

      if (response.data.success) {
        setShowSuccess(true);
        
        // Redirect to https://thoughtscrest.com after 2 seconds
        setTimeout(() => {
          console.log('Redirecting to https://thoughtscrest.com...');
          window.location.replace('https://thoughtscrest.com');
        }, 2000);
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error('Reset request error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setUserId(e.target.value);
    if (error) {
      setError('');
    }
  };

  return (
    <div className="container">
      <div className="logo">
        <img src="/TC.jpg" alt="Thoughts Crest Logo" className="logo-image" />
        <h1 className="company-name">
          <span className="thoughts-text">Thoughts</span>
          <span className="crest-text"> Crest</span>
        </h1>
        <p>Password Reset Service</p>
      </div>

      {showSuccess && (
        <div className="success-message">
          Password reset link has been sent.
        </div>
      )}

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <form className="form" onSubmit={handleSubmit}>
        <h2>Password Reset</h2>

        <div className="form-group">
          <label htmlFor="userId" className="form-label">
            User ID or Email
          </label>
          <input
            type="text"
            id="userId"
            className="form-input"
            placeholder="Enter your user ID or email"
            value={userId}
            onChange={handleInputChange}
            disabled={isLoading}
            autoComplete="username"
            required
          />
        </div>

        <button 
          type="submit" 
          className={`btn ${isLoading ? 'loading' : ''}`}
          disabled={isLoading}
        >
          {isLoading ? '' : 'Reset Password'}
        </button>
      </form>
    </div>
  );
};

export default PasswordResetForm;
