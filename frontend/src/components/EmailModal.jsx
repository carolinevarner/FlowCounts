import { useState, useEffect, useCallback } from 'react';
import api from '../api';
import '../styles/auth.css';

export default function EmailModal({ onClose, recipientType = 'manager', managersAndAdmins = { managers: [], admin_emails: [] }, senderRole = 'ACCOUNTANT', isOpen = true, initialSubject = '', initialMessage = '' }) {
  const [recipient, setRecipient] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [currentManagersAndAdmins, setCurrentManagersAndAdmins] = useState({ managers: [], admin_emails: [] });
  const [loadingManagers, setLoadingManagers] = useState(false);

  // Initialize subject and message from props when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialSubject) setSubject(initialSubject);
      if (initialMessage) setMessage(initialMessage);
    } else {
      // Reset when modal closes
      setSubject('');
      setMessage('');
      setRecipient('');
      setError('');
      setSuccess(false);
    }
  }, [isOpen, initialSubject, initialMessage]);

  // Fetch fresh managers/admins list when modal opens
  const fetchManagersAndAdmins = useCallback(async () => {
    setLoadingManagers(true);
    try {
      const response = await api.get('/auth/managers-admins/');
      console.log('Fetched managers/admins/accountants:', response.data);
      console.log('Total users:', response.data.managers?.length || 0);
      console.log('Managers:', response.data.managers?.filter(m => m.role === 'MANAGER').length || 0);
      console.log('Admins:', response.data.managers?.filter(m => m.role === 'ADMIN').length || 0);
      console.log('Accountants:', response.data.managers?.filter(m => m.role === 'ACCOUNTANT').length || 0);
      setCurrentManagersAndAdmins(response.data);
    } catch (err) {
      console.error('Failed to fetch managers and admins:', err);
      // If fetch fails, use the prop value as fallback
      setCurrentManagersAndAdmins(managersAndAdmins);
    } finally {
      setLoadingManagers(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isOpen) {
      // Always fetch fresh data when modal opens (or when component mounts with isOpen=true)
      fetchManagersAndAdmins();
    }
  }, [isOpen, fetchManagersAndAdmins]);

  const handleSend = async (e) => {
    e.preventDefault();
    setError('');
    
    // Validate recipient email
    if (!recipient || !recipient.trim()) {
      setError('Please select a recipient');
      return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipient.trim())) {
      setError('Invalid email address. Please select a valid recipient.');
      return;
    }
    
    if (!subject || !subject.trim()) {
      setError('Subject is required');
      return;
    }
    
    if (!message || !message.trim()) {
      setError('Message is required');
      return;
    }

    setSending(true);
    try {
      console.log('Sending email with data:', {
        recipient: recipient.trim(),
        subject: subject.trim(),
        message: message.trim(),
        recipient_type: recipientType
      });
      
      const response = await api.post('/auth/send-email/', {
        recipient: recipient.trim(),
        subject: subject.trim(),
        message: message.trim(),
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
      const errorMessage = err.response?.data?.detail || err.response?.data?.error || 'Failed to send email';
      setError(errorMessage);
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
                onChange={(e) => {
                  const selectedValue = e.target.value;
                  console.log('Selected recipient:', selectedValue);
                  if (selectedValue && selectedValue.trim()) {
                    setRecipient(selectedValue.trim());
                  } else {
                    setRecipient('');
                  }
                }}
                required
              >
                <option value="">Select a recipient...</option>
                {loadingManagers ? (
                  <option value="" disabled>Loading recipients...</option>
                ) : (
                  <>
                    {/* Managers - visible to both admins and accountants */}
                    {currentManagersAndAdmins.managers.filter(m => m.role === 'MANAGER' && m.email && m.email.trim()).map((manager) => (
                      <option key={manager.id} value={manager.email}>
                        {manager.first_name} {manager.last_name} (Manager) - {manager.email}
                      </option>
                    ))}
                    {/* Accountants - only visible to admins */}
                    {senderRole === 'ADMIN' && currentManagersAndAdmins.managers.filter(m => m.role === 'ACCOUNTANT' && m.email && m.email.trim()).map((accountant) => (
                      <option key={accountant.id} value={accountant.email}>
                        {accountant.first_name} {accountant.last_name} (Accountant) - {accountant.email}
                      </option>
                    ))}
                    {/* Administrators - only visible to accountants (not admins messaging themselves) */}
                    {senderRole === 'ACCOUNTANT' && currentManagersAndAdmins.managers.filter(m => m.role === 'ADMIN' && m.email && m.email.trim()).map((admin) => (
                      <option key={admin.id} value={admin.email}>
                        {admin.first_name} {admin.last_name} (Administrator) - {admin.email}
                      </option>
                    ))}
                    {/* Additional admin emails from settings - only visible to accountants */}
                    {senderRole === 'ACCOUNTANT' && currentManagersAndAdmins.admin_emails.filter(email => email && email.trim()).map((email, index) => (
                      <option key={`admin-email-${index}`} value={email}>
                        Administrator - {email}
                      </option>
                    ))}
                  </>
                )}
              </select>
              {!loadingManagers && ((senderRole === 'ADMIN' && currentManagersAndAdmins.managers.filter(m => m.role === 'MANAGER' || m.role === 'ACCOUNTANT').length === 0) ||
                (senderRole === 'ACCOUNTANT' && (currentManagersAndAdmins.managers.filter(m => m.role === 'MANAGER' || m.role === 'ADMIN').length === 0 && currentManagersAndAdmins.admin_emails.length === 0))) && (
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




