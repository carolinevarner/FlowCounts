import { useState, useEffect } from 'react';
import api from '../api';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserData();
  }, []);

  async function fetchUserData() {
    try {
      const response = await api.get('/auth/me/');
      setUser(response.data);
    } catch (err) {
      console.error('Failed to fetch user data:', err);
    } finally {
      setLoading(false);
    }
  }


  if (loading) {
    return <div style={{ padding: 24 }}>Loading...</div>;
  }

  if (!user) {
    return <div style={{ padding: 24 }}>Error loading profile</div>;
  }


  return (
    <div style={{ padding: 24 }}>
      <h2>Profile</h2>
      
      {/* Debug info - remove this after testing */}
      <div style={{ 
        background: '#f0f0f0', 
        padding: 10, 
        borderRadius: 4, 
        marginBottom: 16,
        fontSize: 12,
        fontFamily: 'monospace'
      }}>
        <strong>Debug Info:</strong><br/>
        Role: {user.role}<br/>
        Is Accountant: {user.role === 'ACCOUNTANT' ? 'YES' : 'NO'}<br/>
        Managers Count: {managersAndAdmins.managers.length}<br/>
        Admin Emails Count: {managersAndAdmins.admin_emails.length}
      </div>
      
      <div style={{ 
        background: '#f8f9fa', 
        padding: 20, 
        borderRadius: 8, 
        marginBottom: 24,
        border: '1px solid #e9ecef'
      }}>
        <h3 style={{ marginTop: 0, color: '#495057' }}>Account Information</h3>
        <div style={{ display: 'grid', gap: 12 }}>
          <div>
            <strong>Name:</strong> {user.first_name} {user.last_name}
          </div>
          <div>
            <strong>Username:</strong> {user.username}
          </div>
          <div>
            <strong>Email:</strong> {user.email}
          </div>
          <div>
            <strong>Role:</strong> {user.role}
          </div>
          <div>
            <strong>Display Handle:</strong> {user.display_handle || 'Not set'}
          </div>
        </div>
      </div>

      {/* Temporary test button for all users - remove after testing */}
      <div style={{ 
        background: '#d1ecf1', 
        padding: 20, 
        borderRadius: 8, 
        marginBottom: 24,
        border: '1px solid #bee5eb'
      }}>
        <h3 style={{ marginTop: 0, color: '#0c5460' }}>TEST: Email Functionality</h3>
        <p style={{ color: '#0c5460', marginBottom: 16 }}>
          This is a test button to verify the email functionality works. (Visible for all users during testing)
        </p>
        
        <button 
          onClick={handleSendEmail}
          style={{
            background: '#17a2b8',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 500
          }}
          onMouseOver={(e) => e.target.style.background = '#138496'}
          onMouseOut={(e) => e.target.style.background = '#17a2b8'}
        >
          📧 TEST: Send Email to Manager/Administrator
        </button>

        <div style={{ marginTop: 16, fontSize: 14, color: '#6c757d' }}>
          <div style={{ marginBottom: 8 }}>
            <strong>Available Managers:</strong> {managersAndAdmins.managers.filter(m => m.role === 'MANAGER').length}
          </div>
          <div>
            <strong>Available Administrators:</strong> {managersAndAdmins.managers.filter(m => m.role === 'ADMIN').length}
          </div>
        </div>
      </div>


      {/* Other role users see basic profile info */}
      {user.role !== 'ACCOUNTANT' && (
        <div style={{ 
          background: '#e2e3e5', 
          padding: 20, 
          borderRadius: 8, 
          marginBottom: 24,
          border: '1px solid #d6d8db'
        }}>
          <h3 style={{ marginTop: 0, color: '#495057' }}>Additional Information</h3>
          <p style={{ color: '#6c757d', margin: 0 }}>
            Contact your administrator for account-related questions or support.
          </p>
        </div>
      )}

    </div>
  );
}
