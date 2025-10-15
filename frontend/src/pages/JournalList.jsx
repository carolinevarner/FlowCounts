import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api';
import HelpModal from '../components/HelpModal';
import '../styles/auth.css';

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
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [additionalFilter, setAdditionalFilter] = useState('all');

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

  const handleApproveClick = (entry) => {
    setSelectedEntry(entry);
    setShowApprovalModal(true);
  };

  const handleApproveSubmit = async () => {
    try {
      await api.post(`/journal-entries/${selectedEntry.id}/approve/`);
      alert('Journal entry approved successfully!');
      setShowApprovalModal(false);
      setSelectedEntry(null);
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

    if (additionalFilter === 'my_entries' && userRole === 'ACCOUNTANT') {
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      filtered = filtered.filter(entry => entry.created_by === currentUser.id);
    } else if (additionalFilter === 'adjusting') {
      filtered = filtered.filter(entry => 
        entry.description?.toLowerCase().includes('adjusting')
      );
    } else if (additionalFilter === 'regular') {
      filtered = filtered.filter(entry => 
        !entry.description?.toLowerCase().includes('adjusting')
      );
    } else if (additionalFilter === 'large') {
      filtered = filtered.filter(entry => entry.total_debits > 1000);
    } else if (additionalFilter === 'small') {
      filtered = filtered.filter(entry => entry.total_debits <= 1000);
    }

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
        let aVal, bVal;
        
        if (sortConfig.key === 'type') {
          aVal = a.description?.toLowerCase().includes('adjusting') ? 'adjusting' : 'regular';
          bVal = b.description?.toLowerCase().includes('adjusting') ? 'adjusting' : 'regular';
        } else if (sortConfig.key === 'created_by_username') {
          aVal = (a.created_by_username || '').toLowerCase();
          bVal = (b.created_by_username || '').toLowerCase();
        } else {
          aVal = a[sortConfig.key];
          bVal = b[sortConfig.key];
        }

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
  }, [entries, searchTerm, sortConfig, additionalFilter, userRole]);

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
        marginBottom: 20
      }}>
        <h2 style={{ margin: 0, fontFamily: "Playfair Display", fontSize: "1.5em", fontWeight: "600" }}>
          Journalize
        </h2>
        <button
          onClick={() => setShowHelpModal(true)}
          className="auth-linkbtn"
          style={{
            height: "30px",
            padding: "0 12px",
            fontSize: 14,
            width: "auto",
            minWidth: "80px"
          }}
          title="Get help with this page"
        >
          Help
        </button>
      </div>

      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        marginBottom: 20, 
        gap: 20,
        flexWrap: "wrap"
      }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {(userRole === 'MANAGER' || userRole === 'ACCOUNTANT') && (
            <button
              onClick={() => navigate(`/${rolePrefix}/journal/new`)}
              className="auth-button secondary"
              style={{
                fontSize: 12,
                padding: '6px 12px',
                borderRadius: "6px",
                backgroundColor: '#1C5C59',
                color: 'white',
                border: 'none',
                cursor: 'pointer'
              }}
              title="Create a new journal entry"
            >
              + Create Entry
            </button>
          )}

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

        <div style={{ display: "flex", gap: 10, alignItems: "center", flex: "0 0 auto" }}>
          <select
            value={additionalFilter}
            onChange={(e) => setAdditionalFilter(e.target.value)}
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
            title="Additional filters"
          >
            <option value="all">All Types</option>
            {userRole === 'ACCOUNTANT' && <option value="my_entries">My Entries</option>}
            <optgroup label="By Entry Type">
              <option value="regular">Regular</option>
              <option value="adjusting">Adjusting</option>
            </optgroup>
            <optgroup label="By Amount">
              <option value="large">Over $1,000</option>
              <option value="small">Under $1,000</option>
            </optgroup>
          </select>

          <input
            type="text"
            placeholder="Search entries..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ 
              padding: "6px 12px", 
              fontSize: 12,
              borderRadius: "6px",
              border: "1px solid #b8b6b6",
              outline: "none",
              fontFamily: "sans-serif",
              width: "18vw",
              minWidth: 160,
              maxWidth: 280,
              height: "30px",
              lineHeight: "1",
              boxSizing: "border-box"
            }}
            title="Search journal entries"
          />
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

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ 
          display: "flex", 
          borderBottom: "2px solid #e0e0e0",
          backgroundColor: "#f8f9fa"
        }}>
          {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map(tab => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              style={{
                flex: 1,
                padding: "10px 20px",
                border: "none",
                backgroundColor: activeTab === tab ? "#1C302F" : "transparent",
                color: activeTab === tab ? "white" : "#333",
                cursor: "pointer",
                fontWeight: activeTab === tab ? "600" : "500",
                fontSize: "14px",
                transition: "all 0.2s",
                borderBottom: activeTab === tab ? "3px solid #1C302F" : "3px solid transparent"
              }}
              onMouseOver={(e) => {
                if (activeTab !== tab) {
                  e.currentTarget.style.backgroundColor = "#e0e0e0";
                }
              }}
              onMouseOut={(e) => {
                if (activeTab !== tab) {
                  e.currentTarget.style.backgroundColor = "transparent";
                }
              }}
            >
              {tab === 'ALL' ? 'All Entries' : tab === 'PENDING' ? 'Pending' : tab === 'APPROVED' ? 'Approved' : 'Rejected'}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            Loading journal entries...
          </div>
        ) : filteredEntries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666', fontSize: '14px' }}>
            No journal entries found
          </div>
        ) : (
          <div style={{ overflowX: "auto", maxWidth: "100%", paddingTop: "16px" }}>
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
                      width: "120px"
                    }}
                  >
                    Date{getSortIndicator('entry_date')}
                  </th>
                  <th 
                    onClick={() => handleSort('type')}
                    style={{ 
                      padding: "10px 12px", 
                      textAlign: "left", 
                      fontWeight: "bold", 
                      fontSize: "0.8em",
                      background: "white",
                      color: "#000",
                      width: "80px",
                      cursor: "pointer",
                      userSelect: "none"
                    }}
                  >
                    Type{getSortIndicator('type')}
                  </th>
                  <th 
                    onClick={() => handleSort('created_by_username')}
                    style={{ 
                      padding: "10px 12px", 
                      textAlign: "left", 
                      fontWeight: "bold", 
                      fontSize: "0.8em",
                      background: "white",
                      color: "#000",
                      width: "100px",
                      cursor: "pointer",
                      userSelect: "none"
                    }}
                  >
                    Creator{getSortIndicator('created_by_username')}
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

                    const debitLines = entry.lines.filter(line => parseFloat(line.debit) > 0);
                    const creditLines = entry.lines.filter(line => parseFloat(line.credit) > 0);

                    return (
                      <div style={{ fontSize: '0.85em' }}>
                        {debitLines.map((line, index) => (
                          <div key={`debit-${index}`} style={{ marginBottom: '4px' }}>
                            <span style={{ fontWeight: 'bold', color: '#1C5C59' }}>
                              {line.account_number}
                            </span>
                            <span style={{ fontWeight: 'bold' }}>
                              {' '}- {line.account_name}
                            </span>
                          </div>
                        ))}
                        {creditLines.map((line, index) => (
                          <div key={`credit-${index}`} style={{ marginBottom: '4px', paddingLeft: '30px' }}>
                            <span style={{ fontWeight: 'bold', color: '#1C5C59' }}>
                              {line.account_number}
                            </span>
                            <span style={{ fontWeight: 'bold' }}>
                              {' '}- {line.account_name}
                            </span>
                          </div>
                        ))}
                        {entry.description && (
                          <div style={{ marginTop: '8px', fontStyle: 'italic', color: '#555' }}>
                            <span style={{ fontWeight: 'bold' }}>Description:</span> {entry.description}
                          </div>
                        )}
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

                    const debitLines = entry.lines.filter(line => parseFloat(line.debit) > 0);
                    const creditLines = entry.lines.filter(line => parseFloat(line.credit) > 0);

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
                          <div style={{ display: 'flex', flexDirection: 'column', minHeight: entry.status === 'PENDING' && (userRole === 'ADMIN' || userRole === 'MANAGER') ? '100px' : 'auto' }}>
                            <div>
                              {debitLines.map((line, index) => (
                                <div key={index} style={{ marginBottom: '4px' }}>
                                  {formatCurrency(line.debit)}
                                </div>
                              ))}
                            </div>
                            <div style={{ marginTop: 'auto', paddingTop: '8px' }}>
                              {entry.status === 'PENDING' && (userRole === 'ADMIN' || userRole === 'MANAGER') && (
                                <button
                                  onClick={() => handleApproveClick(entry)}
                                  style={{
                                    padding: '0px 12px',
                                    backgroundColor: '#1C5C59',
                                    color: 'white',
                                    border: '2px solid #1C5C59',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: 14,
                                    fontWeight: '500',
                                    width: '100%',
                                    height: '30px'
                                  }}
                                >
                                  Approve
                                </button>
                              )}
                            </div>
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
                          <div style={{ display: 'flex', flexDirection: 'column', minHeight: entry.status === 'PENDING' && (userRole === 'ADMIN' || userRole === 'MANAGER') ? '100px' : 'auto' }}>
                            <div>
                              {debitLines.map((_, index) => (
                                <div key={`spacer-${index}`} style={{ marginBottom: '4px', height: '1.2em' }}></div>
                              ))}
                              {creditLines.map((line, index) => (
                                <div key={index} style={{ marginBottom: '4px' }}>
                                  {formatCurrency(line.credit)}
                                </div>
                              ))}
                            </div>
                            <div style={{ marginTop: 'auto', paddingTop: '8px' }}>
                              {entry.status === 'PENDING' && (userRole === 'ADMIN' || userRole === 'MANAGER') && (
                                <button
                                  onClick={() => handleRejectClick(entry)}
                                  style={{
                                    padding: '0px 12px',
                                    backgroundColor: 'white',
                                    color: '#1C5C59',
                                    border: '2px solid #1C5C59',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: 14,
                                    fontWeight: '8000',
                                    width: '100%',
                                    height: '30px'
                                  }}
                                >
                                  <strong>Reject</strong>
                                </button>
                              )}
                            </div>
                          </div>
                        </td>
                      </>
                    );
                  };

                  const entryType = getEntryType();
                  const typeColor = getTypeColor(entryType);

                  const getStatusColor = (status) => {
                    if (status === 'APPROVED') return '#4f772d';
                    if (status === 'PENDING') return '#FF9800';
                    if (status === 'REJECTED') return '#c1121f';
                    return '#666';
                  };

                  const getStatusLabel = (status) => {
                    if (status === 'APPROVED') return 'Approved';
                    if (status === 'PENDING') return 'Pending';
                    if (status === 'REJECTED') return 'Rejected';
                    return status;
                  };

                  return (
                    <tr key={entry.id}>
                      <td style={{ 
                        padding: "10px 12px", 
                        borderBottom: "1px solid #ddd",
                        fontWeight: "normal",
                        fontSize: "0.85em",
                        verticalAlign: 'top'
                      }}>
                        <div>{formatDate(entry.entry_date)}</div>
                        <div style={{ marginTop: 4 }}>
                          <span style={{
                            display: "inline-block",
                            padding: "2px 8px",
                            borderRadius: "12px",
                            fontSize: "0.7em",
                            fontWeight: "500",
                            backgroundColor: getStatusColor(entry.status),
                            color: "white"
                          }}>
                            {getStatusLabel(entry.status)}
                          </span>
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
      </div>

      {showApprovalModal && (
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
              Approve Journal Entry
            </h3>
            <p style={{ marginBottom: '16px', color: '#666' }}>
              Are you sure you want to approve journal entry JE-{selectedEntry?.id}?
            </p>
            <p style={{ marginBottom: '20px', color: '#666', fontSize: '14px' }}>
              This action will update the account balances and cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowApprovalModal(false);
                  setSelectedEntry(null);
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#c00',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleApproveSubmit}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#4f772d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Confirm Approval
              </button>
            </div>
          </div>
        </div>
      )}

      {showRejectionModal && (
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
              Please provide a reason for rejecting journal entry JE-{selectedEntry?.id}:
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
                  setShowRejectionModal(false);
                  setSelectedEntry(null);
                  setRejectionReason('');
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#c00',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleRejectSubmit}
                disabled={!rejectionReason.trim()}
                style={{
                  padding: '10px 20px',
                  backgroundColor: (!rejectionReason.trim()) ? '#ccc' : '#c00',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: (!rejectionReason.trim()) ? 'not-allowed' : 'pointer',
                  fontSize: '14px'
                }}
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {showHelpModal && (
        <HelpModal onClose={() => setShowHelpModal(false)} page="journalList" userRole={userRole} />
      )}
    </div>
  );
}

