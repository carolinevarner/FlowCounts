import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api';

export default function JournalList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('status') || 'all';

  const [activeTab, setActiveTab] = useState(initialTab.toUpperCase());
  const [entries, setEntries] = useState([]);
  const [allEntries, setAllEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userRole, setUserRole] = useState('');
  const [rolePrefix, setRolePrefix] = useState('manager');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'entry_date', direction: 'desc' });
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const role = user.role || '';
    setUserRole(role);
    setRolePrefix(role.toLowerCase() === 'admin' ? 'admin' : role.toLowerCase() === 'accountant' ? 'accountant' : 'manager');
    fetchEntries();
  }, [activeTab, startDate, endDate]);

  const fetchEntries = async () => {
    try {
      setLoading(true);
      setError('');
      
      const params = {
        ...(startDate && { start_date: startDate }),
        ...(endDate && { end_date: endDate }),
      };

      const res = await api.get('/journal-entries/', { params });
      setAllEntries(res.data);
      
      if (activeTab === 'ALL') {
        setEntries(res.data);
      } else {
        setEntries(res.data.filter(e => e.status === activeTab));
      }
    } catch (err) {
      console.error('Failed to fetch journal entries:', err);
      setError('Failed to load journal entries');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams({ status: tab.toLowerCase() });
    
    if (tab === 'ALL') {
      setEntries(allEntries);
    } else {
      setEntries(allEntries.filter(e => e.status === tab));
    }
  };

  const handleSort = (key) => {
    setSortConfig({
      key,
      direction: sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc',
    });
  };

  const getSortIndicator = (key) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === 'asc' ? ' ⌃' : ' ⌄';
    }
    return ' ⌄';
  };

  const handleApprove = async (entry) => {
    if (!confirm(`Are you sure you want to approve journal entry JE-${entry.id}?`)) {
      return;
    }

    try {
      await api.post(`/journal-entries/${entry.id}/approve/`);
      alert('Journal entry approved successfully!');
      fetchEntries();
    } catch (err) {
      console.error('Failed to approve entry:', err);
      alert(err.response?.data?.detail || 'Failed to approve journal entry');
    }
  };

  const handleRejectClick = (entry) => {
    setSelectedEntry(entry);
    setRejectionReason('');
    setShowRejectionModal(true);
  };

  const handleRejectSubmit = async () => {
    if (!rejectionReason.trim()) {
      alert('Rejection reason is required');
      return;
    }

    try {
      await api.post(`/journal-entries/${selectedEntry.id}/reject/`, {
        rejection_reason: rejectionReason
      });
      alert('Journal entry rejected successfully!');
      setShowRejectionModal(false);
      setSelectedEntry(null);
      setRejectionReason('');
      fetchEntries();
    } catch (err) {
      console.error('Failed to reject entry:', err);
      alert(err.response?.data?.detail || 'Failed to reject journal entry');
    }
  };

  const handleDelete = async (entry) => {
    if (!confirm(`Are you sure you want to delete journal entry JE-${entry.id}? This action cannot be undone.`)) {
      return;
    }

    try {
      await api.delete(`/journal-entries/${entry.id}/`);
      alert('Journal entry deleted successfully!');
      fetchEntries();
    } catch (err) {
      console.error('Failed to delete entry:', err);
      alert(err.response?.data?.detail || 'Failed to delete journal entry');
    }
  };

  const filteredEntries = useMemo(() => {
    let filtered = [...entries];

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(entry => {
        const matchesId = `je-${entry.id}`.includes(search);
        const matchesDate = entry.entry_date.includes(search);
        const matchesAmount = entry.total_debits.toString().includes(search) || entry.total_credits.toString().includes(search);
        const matchesAccount = entry.lines?.some(line => 
          line.account_name?.toLowerCase().includes(search)
        );
        const matchesDescription = entry.description?.toLowerCase().includes(search);
        
        return matchesId || matchesDate || matchesAmount || matchesAccount || matchesDescription;
      });
    }

    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];

        if (sortConfig.key === 'entry_date' || sortConfig.key === 'created_at') {
          aVal = new Date(aVal);
          bVal = new Date(bVal);
        }

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [entries, searchTerm, sortConfig]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US');
  };

  return (
    <div style={{ padding: "12px 16px", maxWidth: "100%", boxSizing: "border-box" }}>
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        marginBottom: 20,
        flexWrap: "wrap",
        gap: 20
      }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flex: "1 1 auto" }}>
          <h2 style={{ margin: 0, fontFamily: "Playfair Display", fontSize: "1.5em", fontWeight: "600" }}>
            Journal Entries
          </h2>
          {(userRole === 'MANAGER' || userRole === 'ACCOUNTANT') && (
            <button
              onClick={() => navigate(`/${rolePrefix}/journal/new`)}
              className="auth-button primary"
              style={{
                fontSize: 12,
                padding: '6px 8px',
                borderRadius: "6px",
                backgroundColor: '#1C5C59',
                color: 'white',
                border: 'none',
                cursor: 'pointer',
                height: "30px",
                lineHeight: "1",
                fontWeight: "500",
                width: "auto",
                minWidth: "150px"
              }}
              title="Create a new journal entry"
            >
              + Create Journal Entry
            </button>
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 20 }}>
        <select
          value={activeTab}
          onChange={(e) => handleTabChange(e.target.value)}
          style={{ 
            padding: "6px 12px", 
            fontSize: 12,
            borderRadius: "6px",
            border: "1px solid #b8b6b6",
            backgroundColor: "#fff",
            cursor: "pointer",
            outline: "none",
            fontFamily: "sans-serif",
            minWidth: 150,
            height: "30px",
            lineHeight: "1"
          }}
          title="Filter journal entries by status"
        >
          <option value="ALL">All Entries</option>
          <option value="APPROVED">Approved</option>
          <option value="PENDING">Needs Approval</option>
          <option value="REJECTED">Rejected</option>
        </select>

        <input
          type="text"
          placeholder="Search by ID, date, amount, account, or description..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ 
            padding: "6px 12px", 
            fontSize: 12,
            borderRadius: "6px",
            border: "1px solid #b8b6b6",
            outline: "none",
            fontFamily: "sans-serif",
            width: "25vw",
            minWidth: 200,
            maxWidth: 400,
            height: "30px",
            lineHeight: "1",
            boxSizing: "border-box"
          }}
          title="Search journal entries"
        />

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            placeholder="Start Date"
            style={{
              padding: "6px 12px",
              fontSize: 12,
              borderRadius: "6px",
              border: "1px solid #b8b6b6",
              outline: "none",
              height: "30px",
              lineHeight: "1"
            }}
            title="Filter by start date"
          />
          <span style={{ color: '#666', fontSize: 12 }}>to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            placeholder="End Date"
            style={{
              padding: "6px 12px",
              fontSize: 12,
              borderRadius: "6px",
              border: "1px solid #b8b6b6",
              outline: "none",
              height: "30px",
              lineHeight: "1"
            }}
            title="Filter by end date"
          />
          {(startDate || endDate) && (
            <button
              onClick={() => { setStartDate(''); setEndDate(''); }}
              style={{
                padding: '6px 12px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: 12,
                height: "30px",
                lineHeight: "1"
              }}
              title="Clear date filters"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {error && (
        <div style={{
          padding: '12px',
          backgroundColor: '#fee',
          border: '1px solid #fcc',
          borderRadius: '6px',
          marginBottom: '16px',
          color: '#c00',
          fontSize: '14px'
        }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          Loading journal entries...
        </div>
      ) : filteredEntries.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666', fontSize: '14px' }}>
          No journal entries found
        </div>
      ) : (
          <div style={{ overflowX: "auto", maxWidth: "100%" }}>
            <table style={{ width: "100%", tableLayout: "auto", borderCollapse: "collapse", background: "white" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #000" }}>
                  <th 
                    onClick={() => handleSort('entry_date')}
                    style={{ 
                      padding: "10px 12px", 
                      textAlign: "left", 
                      fontWeight: "bold", 
                      fontSize: "0.8em",
                      background: "white",
                      color: "#000",
                      cursor: "pointer",
                      userSelect: "none",
                      width: "100px"
                    }}
                  >
                    Date{getSortIndicator('entry_date')}
                  </th>
                  <th style={{ 
                    padding: "10px 12px", 
                    textAlign: "left", 
                    fontWeight: "bold", 
                    fontSize: "0.8em",
                    background: "white",
                    color: "#000",
                    width: "80px"
                  }}>
                    Type
                  </th>
                  <th style={{ 
                    padding: "10px 12px", 
                    textAlign: "left", 
                    fontWeight: "bold", 
                    fontSize: "0.8em",
                    background: "white",
                    color: "#000",
                    width: "100px"
                  }}>
                    Creator
                  </th>
                  <th style={{ 
                    padding: "10px 12px", 
                    textAlign: "left", 
                    fontWeight: "bold", 
                    fontSize: "0.8em",
                    background: "white",
                    color: "#000",
                    minWidth: "300px"
                  }}>
                    Accounts
                  </th>
                  <th style={{ 
                    padding: "10px 12px", 
                    textAlign: "right", 
                    fontWeight: "bold", 
                    fontSize: "0.8em",
                    background: "white",
                    color: "#000",
                    width: "100px"
                  }}>
                    Debit
                  </th>
                  <th style={{ 
                    padding: "10px 12px", 
                    textAlign: "right", 
                    fontWeight: "bold", 
                    fontSize: "0.8em",
                    background: "white",
                    color: "#000",
                    width: "100px"
                  }}>
                    Credit
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map(entry => {
                  const getEntryType = () => {
                    if (entry.description && entry.description.toLowerCase().includes('adjusting')) {
                      return 'Adjusting';
                    }
                    return 'Regular';
                  };

                  const getTypeColor = (type) => {
                    return type === 'Adjusting' ? '#ff8c00' : '#28a745';
                  };

                  const renderAccountsColumn = () => {
                    if (!entry.lines || entry.lines.length === 0) {
                      return <div style={{ fontSize: '0.85em', color: '#666' }}>No account lines</div>;
                    }

                    return (
                      <div style={{ fontSize: '0.85em' }}>
                        {entry.lines.map((line, index) => (
                          <div key={index} style={{ marginBottom: index < entry.lines.length - 1 ? '4px' : '0' }}>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              <span style={{ fontWeight: '500' }}>
                                {line.account?.account_number} - {line.account?.account_name}
                              </span>
                            </div>
                            {index === entry.lines.length - 1 && entry.description && (
                              <div style={{ marginTop: '4px', fontStyle: 'italic', color: '#555' }}>
                                Description: {entry.description}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  };

                  const renderDebitCreditColumns = () => {
                    if (!entry.lines || entry.lines.length === 0) {
                      return (
                        <>
                          <td style={{ 
                            padding: "10px 12px", 
                            borderBottom: "1px solid #ddd",
                            textAlign: 'right',
                            fontWeight: "normal",
                            fontSize: "0.85em"
                          }}>
                            -
                          </td>
                          <td style={{ 
                            padding: "10px 12px", 
                            borderBottom: "1px solid #ddd",
                            textAlign: 'right',
                            fontWeight: "normal",
                            fontSize: "0.85em"
                          }}>
                            -
                          </td>
                        </>
                      );
                    }

                    return (
                      <>
                        <td style={{ 
                          padding: "10px 12px", 
                          borderBottom: "1px solid #ddd",
                          textAlign: 'right',
                          fontWeight: "normal",
                          fontSize: "0.85em",
                          verticalAlign: 'top'
                        }}>
                          <div style={{ fontSize: '0.85em' }}>
                            {entry.lines.map((line, index) => (
                              <div key={index} style={{ 
                                marginBottom: index < entry.lines.length - 1 ? '4px' : '0',
                                color: line.debit > 0 ? '#000' : 'transparent'
                              }}>
                                {line.debit > 0 ? formatCurrency(line.debit) : ''}
                              </div>
                            ))}
                          </div>
                        </td>
                        <td style={{ 
                          padding: "10px 12px", 
                          borderBottom: "1px solid #ddd",
                          textAlign: 'right',
                          fontWeight: "normal",
                          fontSize: "0.85em",
                          verticalAlign: 'top'
                        }}>
                          <div style={{ fontSize: '0.85em' }}>
                            {entry.lines.map((line, index) => (
                              <div key={index} style={{ 
                                marginBottom: index < entry.lines.length - 1 ? '4px' : '0',
                                color: line.credit > 0 ? '#000' : 'transparent'
                              }}>
                                {line.credit > 0 ? formatCurrency(line.credit) : ''}
                              </div>
                            ))}
                          </div>
                        </td>
                      </>
                    );
                  };

                  const entryType = getEntryType();
                  const typeColor = getTypeColor(entryType);

                  return (
                    <tr key={entry.id}>
                      <td style={{ 
                        padding: "10px 12px", 
                        borderBottom: "1px solid #ddd",
                        fontWeight: "normal",
                        fontSize: "0.85em",
                        verticalAlign: 'top'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <div style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: typeColor,
                            marginRight: '8px',
                            flexShrink: 0
                          }} />
                          {formatDate(entry.entry_date)}
                        </div>
                      </td>
                      <td style={{ 
                        padding: "10px 12px", 
                        borderBottom: "1px solid #ddd",
                        fontWeight: "normal",
                        fontSize: "0.85em",
                        verticalAlign: 'top'
                      }}>
                        {entryType}
                      </td>
                      <td style={{ 
                        padding: "10px 12px", 
                        borderBottom: "1px solid #ddd",
                        fontWeight: "normal",
                        fontSize: "0.85em",
                        verticalAlign: 'top'
                      }}>
                        {entry.created_by_username}
                      </td>
                      <td style={{ 
                        padding: "10px 12px", 
                        borderBottom: "1px solid #ddd",
                        fontWeight: "normal",
                        fontSize: "0.85em",
                        verticalAlign: 'top'
                      }}>
                        {renderAccountsColumn()}
                      </td>
                      {renderDebitCreditColumns()}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      {showRejectionModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setShowRejectionModal(false)}
        >
          <div 
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '24px',
              maxWidth: '500px',
              width: '90%'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0, color: '#1C302F' }}>Reject Journal Entry</h3>
            <p>Please provide a reason for rejecting JE-{selectedEntry?.id}:</p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter rejection reason..."
              rows="4"
              required
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px',
                marginBottom: '16px',
                resize: 'vertical'
              }}
            />
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowRejectionModal(false)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleRejectSubmit}
                disabled={!rejectionReason.trim()}
                style={{
                  padding: '10px 20px',
                  backgroundColor: !rejectionReason.trim() ? '#ccc' : '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: !rejectionReason.trim() ? 'not-allowed' : 'pointer'
                }}
              >
                Reject Entry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

