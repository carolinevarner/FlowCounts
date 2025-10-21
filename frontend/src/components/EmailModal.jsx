import { useState } from 'react';
import api from '../api';
import '../styles/auth.css';

export default function EmailModal({ onClose, recipientType = 'manager', managersAndAdmins = { managers: [], admin_emails: [] }, senderRole = 'ACCOUNTANT', isOpen = true }) {
  const [recipient, setRecipient] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSend = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!recipient || !subject || !message) {
      setError('All fields are required');
      return;
    }

    setSending(true);
    try {
      console.log('Sending email with data:', {
        recipient,
        subject,
        message,
        recipient_type: recipientType
      });
      
      const response = await api.post('/auth/send-email/', {
        recipient,
        subject,
        message,
        recipient_type: recipientType
      });
      
      console.log('Email sent successfully:', response.data);
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      console.error('Failed to send email:', err);
      console.error('Error response:', err.response?.data);
      setError(err.response?.data?.detail || 'Failed to send email');
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, color: '#000000' }}>
            Send Email to Team Member
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#666',
              padding: '0',
              width: '30px',
              height: '30px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            ×
          </button>
        </div>

        {success ? (
          <div style={{
            padding: '20px',
            backgroundColor: '#d4edda',
            border: '1px solid #c3e6cb',
            borderRadius: '6px',
            color: '#155724',
            textAlign: 'center'
          }}>
            ✓ Email sent successfully!
          </div>
        ) : (
          <form onSubmit={handleSend}>
            {error && (
              <div style={{
                padding: '12px',
                backgroundColor: '#fee',
                border: '1px solid #fcc',
                borderRadius: '6px',
                marginBottom: '16px',
                color: '#c00'
              }}>
                {error}
              </div>
            )}

            <div className="form-group">
              <label>
                Recipient <span style={{ color: 'red' }}>*</span>
              </label>
              <select
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                required
              >
                <option value="">Select a recipient...</option>
                {/* Managers - visible to both admins and accountants */}
                {managersAndAdmins.managers.filter(m => m.role === 'MANAGER').map((manager) => (
                  <option key={manager.id} value={manager.email}>
                    {manager.first_name} {manager.last_name} (Manager) - {manager.email}
                  </option>
                ))}
                {/* Accountants - only visible to admins */}
                {senderRole === 'ADMIN' && managersAndAdmins.managers.filter(m => m.role === 'ACCOUNTANT').map((accountant) => (
                  <option key={accountant.id} value={accountant.email}>
                    {accountant.first_name} {accountant.last_name} (Accountant) - {accountant.email}
                  </option>
                ))}
                {/* Administrators - only visible to accountants (not admins messaging themselves) */}
                {senderRole === 'ACCOUNTANT' && managersAndAdmins.managers.filter(m => m.role === 'ADMIN').map((admin) => (
                  <option key={admin.id} value={admin.email}>
                    {admin.first_name} {admin.last_name} (Administrator) - {admin.email}
                  </option>
                ))}
                {/* Additional admin emails from settings - only visible to accountants */}
                {senderRole === 'ACCOUNTANT' && managersAndAdmins.admin_emails.map((email, index) => (
                  <option key={`admin-email-${index}`} value={email}>
                    Administrator - {email}
                  </option>
                ))}
              </select>
              {((senderRole === 'ADMIN' && managersAndAdmins.managers.filter(m => m.role === 'MANAGER' || m.role === 'ACCOUNTANT').length === 0) ||
                (senderRole === 'ACCOUNTANT' && (managersAndAdmins.managers.filter(m => m.role === 'MANAGER' || m.role === 'ADMIN').length === 0 && managersAndAdmins.admin_emails.length === 0))) && (
                <div style={{ marginTop: '8px', fontSize: '12px', color: '#6c757d' }}>
                  {senderRole === 'ADMIN' 
                    ? 'No managers or accountants found. Please contact support.'
                    : 'No managers or administrators found. Please contact support.'
                  }
                </div>
              )}
            </div>

            <div className="form-group">
              <label>
                Subject <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject"
                required
              />
            </div>

            <div className="form-group">
              <label>
                Message <span style={{ color: 'red' }}>*</span>
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter your message here..."
                required
                rows="6"
              />
            </div>

            <div className="form-actions">
              <button
                type="button"
                onClick={onClose}
                disabled={sending}
                className="auth-button secondary"
                style={{
                  backgroundColor: '#c1121f',
                  color: 'white',
                  border: 'none',
                  fontSize: 13
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={sending}
                className="auth-button"
                style={{
                  backgroundColor: '#1C5C59',
                  color: 'white',
                  border: 'none',
                  fontSize: 13,
                  opacity: sending ? 0.5 : 1
                }}
              >
                {sending ? 'Sending...' : '↑ Send Email'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}




