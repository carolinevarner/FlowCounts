import { useState } from 'react';
import api from '../api';
import '../styles/auth.css';

export default function CloseAccountModal({ 
  isOpen, 
  onClose, 
  account, 
  onAccountClosed 
}) {
  const [closureReason, setClosureReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleClose = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!closureReason.trim()) {
      setError('Closure reason is required');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/accounts/close/', {
        account_id: account.id,
        closure_reason: closureReason.trim()
      });
      
      setSuccess(true);
      setTimeout(() => {
        onAccountClosed(response.data.account);
        onClose();
        setClosureReason('');
        setSuccess(false);
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to close account');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setClosureReason('');
    setError('');
    setSuccess(false);
    onClose();
  };

  if (!isOpen || !account) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, color: '#000000' }}>
            Close Account
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
            ✓ Account closed successfully!
          </div>
        ) : (
          <form onSubmit={handleClose}>
            <div style={{ marginBottom: '20px', padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
              <h4 style={{ margin: '0 0 8px 0', color: '#495057' }}>Account Details</h4>
              <p style={{ margin: '4px 0', fontSize: '14px' }}>
                <strong>Account Number:</strong> {account.account_number}
              </p>
              <p style={{ margin: '4px 0', fontSize: '14px' }}>
                <strong>Account Name:</strong> {account.account_name}
              </p>
              <p style={{ margin: '4px 0', fontSize: '14px' }}>
                <strong>Category:</strong> {account.account_category}
              </p>
              <p style={{ margin: '4px 0', fontSize: '14px' }}>
                <strong>Current Balance:</strong> ${parseFloat(account.balance).toFixed(2)}
              </p>
            </div>

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
                Closure Reason <span style={{ color: 'red' }}>*</span>
              </label>
              <textarea
                value={closureReason}
                onChange={(e) => setClosureReason(e.target.value)}
                placeholder="Please provide a reason for closing this account..."
                rows="4"
                required
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{
              padding: '12px',
              backgroundColor: '#fff3cd',
              border: '1px solid #ffeaa7',
              borderRadius: '6px',
              marginBottom: '16px',
              fontSize: '13px',
              color: '#856404'
            }}>
              <strong>⚠️ Important:</strong> Closing an account will make it inactive and prevent it from being used in new journal entries. This action cannot be undone.
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={handleCancel}
                className="auth-button secondary"
                style={{ padding: '8px 16px' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="auth-button"
                style={{ 
                  padding: '8px 16px',
                  backgroundColor: loading ? '#6c757d' : '#dc3545',
                  border: 'none'
                }}
              >
                {loading ? 'Closing...' : 'Close Account'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

