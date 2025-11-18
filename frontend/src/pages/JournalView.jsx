import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import '../styles/layout.css';

export default function JournalView() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [entry, setEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userRole, setUserRole] = useState('');
  const [rolePrefix, setRolePrefix] = useState('manager');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const role = user.role || '';
    setUserRole(role);
    setRolePrefix(role.toLowerCase() === 'admin' ? 'admin' : role.toLowerCase() === 'accountant' ? 'accountant' : 'manager');
    fetchJournalEntry();
  }, [id]);

  const fetchJournalEntry = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/journal-entries/${id}/`);
      setEntry(res.data);
    } catch (err) {
      console.error('Failed to fetch journal entry:', err);
      setError('Failed to load journal entry');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'APPROVED':
        return { bg: '#d4edda', color: '#155724' };
      case 'REJECTED':
        return { bg: '#fee', color: '#c00' };
      default:
        return { bg: '#fff3cd', color: '#856404' };
    }
  };

  const handleApprove = async () => {
    if (!window.confirm('Are you sure you want to approve this journal entry?')) {
      return;
    }

    try {
      setSubmitting(true);
      await api.post(`/journal-entries/${id}/approve/`);
      alert('Journal entry approved successfully');
      fetchJournalEntry();
    } catch (err) {
      console.error('Failed to approve journal entry:', err);
      alert(err?.response?.data?.detail || 'Failed to approve journal entry');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert('Please enter a rejection reason');
      return;
    }

    try {
      setSubmitting(true);
      await api.post(`/journal-entries/${id}/reject/`, {
        rejection_reason: rejectionReason
      });
      alert('Journal entry rejected');
      setShowRejectModal(false);
      setRejectionReason('');
      fetchJournalEntry();
    } catch (err) {
      console.error('Failed to reject journal entry:', err);
      alert(err?.response?.data?.detail || 'Failed to reject journal entry');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <p>Loading journal entry...</p>
      </div>
    );
  }

  if (error || !entry) {
    return (
      <div style={{ padding: '24px' }}>
        <div style={{
          padding: '12px',
          backgroundColor: '#fee',
          border: '1px solid #fcc',
          borderRadius: '6px',
          color: '#c00'
        }}>
          {error || 'Journal entry not found'}
        </div>
        <button
          onClick={() => navigate(-1)}
          style={{
            marginTop: '16px',
            padding: '10px 20px',
            backgroundColor: '#4f772d',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          ← Back
        </button>
      </div>
    );
  }

  const statusColors = getStatusColor(entry.status);

  return (
    <div className="main-body">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <h2 style={{ margin: 0, fontFamily: "Playfair Display", fontSize: "1.5em", fontWeight: "600", color: "#000" }}>
            Journal Entry {entry.id}
          </h2>
          <span style={{
            padding: '6px 12px',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '500',
            backgroundColor: statusColors.bg,
            color: statusColors.color
          }}>
            {entry.status}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          {entry.status === 'PENDING' && (userRole === 'ADMIN' || userRole === 'MANAGER') && (
            <>
              <button
                onClick={handleApprove}
                disabled={submitting}
                style={{
                  padding: '10px 20px',
                  backgroundColor: submitting ? '#ccc' : '#4f772d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                {submitting ? 'Processing...' : 'Approve'}
              </button>
              <button
                onClick={() => setShowRejectModal(true)}
                disabled={submitting}
                style={{
                  padding: '10px 20px',
                  backgroundColor: submitting ? '#ccc' : '#c1121f',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Reject
              </button>
            </>
          )}
          {entry.status === 'PENDING' && userRole !== 'ACCOUNTANT' && (
            <button
              onClick={() => navigate(`/${rolePrefix}/journal/edit/${entry.id}`)}
              style={{
                padding: '10px 20px',
                backgroundColor: '#ffc107',
                color: '#333',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              Edit Entry
            </button>
          )}
          <button
            onClick={() => navigate(-1)}
            style={{
              padding: '10px 20px',
              backgroundColor: '#1C5C59',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            ← Back
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
        <div className="card">
          <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1em', color: '#1C302F' }}>Entry Details</h3>
          <div style={{ display: 'grid', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Entry Date</label>
              <div style={{ fontSize: '14px', fontWeight: '500' }}>{formatDate(entry.entry_date)}</div>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Description</label>
              <div style={{ fontSize: '14px' }}>{entry.description || 'No description provided'}</div>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Created By</label>
              <div style={{ fontSize: '14px', fontWeight: '500' }}>{entry.created_by_username}</div>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Created At</label>
              <div style={{ fontSize: '14px' }}>{formatDateTime(entry.created_at)}</div>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1em', color: '#1C302F' }}>Review Information</h3>
          <div style={{ display: 'grid', gap: '12px' }}>
            {entry.reviewed_by_username && (
              <>
                <div>
                  <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Reviewed By</label>
                  <div style={{ fontSize: '14px', fontWeight: '500' }}>{entry.reviewed_by_username}</div>
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Reviewed At</label>
                  <div style={{ fontSize: '14px' }}>{formatDateTime(entry.reviewed_at)}</div>
                </div>
              </>
            )}
            {entry.status === 'REJECTED' && entry.rejection_reason && (
              <div>
                <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Rejection Reason</label>
                <div style={{ 
                  fontSize: '14px', 
                  padding: '12px', 
                  backgroundColor: '#fee', 
                  border: '1px solid #fcc',
                  borderRadius: '6px',
                  color: '#c00'
                }}>
                  {entry.rejection_reason}
                </div>
              </div>
            )}
            {entry.status === 'PENDING' && (
              <div style={{ fontSize: '14px', color: '#666', fontStyle: 'italic' }}>
                Awaiting manager review
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1em', color: '#1C302F' }}>Journal Entry Lines</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#1C302F', color: 'white' }}>
                <th style={{ padding: '12px', textAlign: 'left', width: '5%' }}>#</th>
                <th style={{ padding: '12px', textAlign: 'left', width: '15%' }}>Account Number</th>
                <th style={{ padding: '12px', textAlign: 'left', width: '30%' }}>Account Name</th>
                <th style={{ padding: '12px', textAlign: 'center', width: '12%' }}>Post Ref</th>
                <th style={{ padding: '12px', textAlign: 'left', width: '25%' }}>Description</th>
                <th style={{ padding: '12px', textAlign: 'right', width: '12.5%' }}>Debit</th>
                <th style={{ padding: '12px', textAlign: 'right', width: '12.5%' }}>Credit</th>
              </tr>
            </thead>
            <tbody>
              {entry.lines && entry.lines.map((line, index) => (
                <tr key={line.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '12px' }}>{index + 1}</td>
                  <td style={{ padding: '12px', fontWeight: '500' }}>
                    <button
                      onClick={() => navigate(`/${(userRole || 'manager').toLowerCase()}/ledger/${line.account_number}`)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'inherit',
                        cursor: 'pointer',
                        padding: 0,
                        fontWeight: 'inherit',
                        fontSize: 'inherit',
                        fontFamily: 'inherit'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.textDecoration = 'underline';
                        e.currentTarget.style.color = '#1C5C59';
                        e.currentTarget.style.fontWeight = 'bold';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.textDecoration = 'none';
                        e.currentTarget.style.color = 'inherit';
                        e.currentTarget.style.fontWeight = 'inherit';
                      }}
                      title="Open ledger for this account"
                    >
                      {line.account_number}
                    </button>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <button
                      onClick={() => navigate(`/${(userRole || 'manager').toLowerCase()}/ledger/${line.account_number}`)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'inherit',
                        cursor: 'pointer',
                        padding: 0,
                        fontSize: 'inherit',
                        fontFamily: 'inherit'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.textDecoration = 'underline';
                        e.currentTarget.style.color = '#1C5C59';
                        e.currentTarget.style.fontWeight = 'bold';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.textDecoration = 'none';
                        e.currentTarget.style.color = 'inherit';
                        e.currentTarget.style.fontWeight = 'inherit';
                      }}
                      title="Open ledger for this account"
                    >
                      {line.account_name}
                    </button>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <button
                      onClick={() => navigate(`/${(userRole || 'manager').toLowerCase()}/ledger/${line.account_number}`)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'inherit',
                        cursor: 'pointer',
                        padding: 0,
                        fontSize: 'inherit',
                        fontFamily: 'inherit'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.textDecoration = 'underline';
                        e.currentTarget.style.color = '#1C5C59';
                        e.currentTarget.style.fontWeight = 'bold';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.textDecoration = 'none';
                        e.currentTarget.style.color = 'inherit';
                        e.currentTarget.style.fontWeight = 'inherit';
                      }}
                      title="Post to ledger"
                    >
                      {line.account_number}
                    </button>
                  </td>
                  <td style={{ padding: '12px', color: '#666' }}>{line.description || '-'}</td>
                  <td style={{ 
                    padding: '12px', 
                    textAlign: 'right',
                    color: line.debit > 0 ? '#000' : '#999',
                    fontWeight: line.debit > 0 ? '500' : 'normal'
                  }}>
                    {line.debit > 0 ? formatCurrency(line.debit) : '-'}
                  </td>
                  <td style={{ 
                    padding: '12px', 
                    textAlign: 'right',
                    color: line.credit > 0 ? '#000' : '#999',
                    fontWeight: line.credit > 0 ? '500' : 'normal'
                  }}>
                    {line.credit > 0 ? formatCurrency(line.credit) : '-'}
                  </td>
                </tr>
              ))}
              <tr style={{ backgroundColor: '#f8f9fa', fontWeight: 'bold', fontSize: '1.1em' }}>
                <td colSpan="5" style={{ padding: '12px', textAlign: 'right' }}>Totals:</td>
                <td style={{ padding: '12px', textAlign: 'right', color: '#000' }}>
                  {formatCurrency(entry.total_debits)}
                </td>
                <td style={{ padding: '12px', textAlign: 'right', color: '#000' }}>
                  {formatCurrency(entry.total_credits)}
                </td>
              </tr>
              <tr style={{ backgroundColor: '#e9ecef' }}>
                <td colSpan="5" style={{ padding: '12px', textAlign: 'right', fontWeight: '500' }}>
                  Status:
                </td>
                <td colSpan="2" style={{ padding: '12px', textAlign: 'center' }}>
                  {entry.is_balanced ? (
                    <span style={{ color: '#4f772d', fontWeight: 'bold' }}>✓ Balanced</span>
                  ) : (
                    <span style={{ color: '#c1121f', fontWeight: 'bold' }}>✗ Not Balanced</span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {entry.attachments && entry.attachments.length > 0 && (
        <div className="card">
          <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1em', color: '#1C302F' }}>Attachments ({entry.attachments.length})</h3>
          <div style={{ display: 'grid', gap: '12px' }}>
            {entry.attachments.map((attachment, index) => (
              <div 
                key={attachment.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '6px',
                  border: '1px solid #dee2e6'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '24px' }}>📎</span>
                  <div>
                    <div style={{ fontWeight: '500', fontSize: '14px' }}>{attachment.file_name}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      {(attachment.file_size / 1024).toFixed(2)} KB • Uploaded by {attachment.uploaded_by_username} • {formatDateTime(attachment.uploaded_at)}
                    </div>
                  </div>
                </div>
                <a
                  href={attachment.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#1C5C59',
                    color: 'white',
                    textDecoration: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  Download
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {showRejectModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '8px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontFamily: 'Playfair Display', fontSize: '1.3em' }}>
              Reject Journal Entry
            </h3>
            <p style={{ marginBottom: '16px', color: '#666' }}>
              Please provide a reason for rejecting this journal entry:
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter rejection reason (required)..."
              rows="5"
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px',
                fontFamily: 'inherit',
                resize: 'vertical'
              }}
            />
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                }}
                disabled={submitting}
                style={{
                  padding: '10px 20px',
                  backgroundColor: 'white',
                  color: '#c1121f',
                  border: '2.8px solid #c1121f',
                  borderRadius: '6px',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={submitting || !rejectionReason.trim()}
                style={{
                  padding: '10px 20px',
                  backgroundColor: (submitting || !rejectionReason.trim()) ? '#ccc' : '#c1121f',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: (submitting || !rejectionReason.trim()) ? 'not-allowed' : 'pointer',
                  fontSize: '14px'
                }}
              >
                {submitting ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

