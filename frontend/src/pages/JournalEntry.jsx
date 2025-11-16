import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import HelpModal from '../components/HelpModal';
import '../styles/auth.css';

export default function JournalEntry() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [accounts, setAccounts] = useState([]);
  
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [entryType, setEntryType] = useState('REGULAR');
  const [description, setDescription] = useState('');
  const [debitLines, setDebitLines] = useState([
    { account: '', description: '', debit: '', order: 0 }
  ]);
  const [creditLines, setCreditLines] = useState([
    { account: '', description: '', credit: '', order: 1 }
  ]);
  const [attachments, setAttachments] = useState([]);
  const [existingAttachments, setExistingAttachments] = useState([]);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [accountFilter, setAccountFilter] = useState('all');
  const [accountSearchTerm, setAccountSearchTerm] = useState('');
  const [showAccountDropdown, setShowAccountDropdown] = useState({});

  useEffect(() => {
    fetchAccounts();
    fetchUserRole();
    if (isEditMode) {
      fetchJournalEntry();
    }
  }, [id]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('[data-dropdown]')) {
        setShowAccountDropdown({});
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchUserRole = async () => {
    try {
      const res = await api.get('/auth/me/');
      setUserRole(res.data.role);
    } catch (err) {
      console.error('Failed to fetch user role:', err);
    }
  };

  const fetchAccounts = async () => {
    try {
      const res = await api.get('/chart-of-accounts/');
      setAccounts(res.data.filter(acc => acc.is_active));
    } catch (err) {
      console.error('Failed to fetch accounts:', err);
      setError('Failed to load accounts');
    }
  };

  const fetchJournalEntry = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/journal-entries/${id}/`);
      const entry = res.data;
      
      if (entry.status !== 'PENDING') {
        setError('Cannot edit an approved or rejected journal entry');
        return;
      }

      setEntryDate(entry.entry_date);
      setEntryType(entry.entry_type || 'REGULAR');
      setDescription(entry.description);
      
      const debits = entry.lines.filter(line => parseFloat(line.debit) > 0).map((line, idx) => ({
        account: line.account,
        description: line.description,
        debit: line.debit || '',
        order: idx
      }));
      
      const credits = entry.lines.filter(line => parseFloat(line.credit) > 0).map((line, idx) => ({
        account: line.account,
        description: line.description,
        credit: line.credit || '',
        order: debits.length + idx
      }));
      
      setDebitLines(debits.length > 0 ? debits : [{ account: '', description: '', debit: '', order: 0 }]);
      setCreditLines(credits.length > 0 ? credits : [{ account: '', description: '', credit: '', order: 1 }]);
      setExistingAttachments(entry.attachments || []);
    } catch (err) {
      console.error('Failed to fetch journal entry:', err);
      setError('Failed to load journal entry');
    } finally {
      setLoading(false);
    }
  };

  const getSelectedAccounts = () => {
    const debitAccounts = debitLines.filter(line => line.account).map(line => line.account);
    const creditAccounts = creditLines.filter(line => line.account).map(line => line.account);
    return [...debitAccounts, ...creditAccounts];
  };

  const getAvailableAccounts = (currentLineAccount, lineType) => {
    const selectedAccounts = getSelectedAccounts();
    // Allow any account to be selected for debit or credit lines
    // The same account can be selected multiple times if adding more debit/credit lines
    // But exclude accounts already selected in other lines (unless it's the current line's account)
    let filtered = accounts.filter(acc => 
      !selectedAccounts.includes(acc.id.toString()) || acc.id.toString() === currentLineAccount
    );
    
    return filtered;
  };

  const getFilteredAccounts = (currentLineAccount, lineType) => {
    let filtered = getAvailableAccounts(currentLineAccount, lineType);
    
    // Apply category filter
    if (accountFilter !== 'all') {
      filtered = filtered.filter(acc => acc.account_category === accountFilter);
    }
    
    // Apply search filter
    if (accountSearchTerm) {
      const search = accountSearchTerm.toLowerCase();
      filtered = filtered.filter(acc => 
        acc.account_name?.toLowerCase().includes(search) ||
        acc.account_number?.toString().includes(search) ||
        acc.account_subcategory?.toLowerCase().includes(search)
      );
    }
    
    // Sort by category, then subcategory, then account number
    return filtered.sort((a, b) => {
      if (a.account_category !== b.account_category) {
        const categoryOrder = { 'ASSET': 1, 'LIABILITY': 2, 'EQUITY': 3, 'REVENUE': 4, 'EXPENSE': 5 };
        return (categoryOrder[a.account_category] || 6) - (categoryOrder[b.account_category] || 6);
      }
      if (a.account_subcategory !== b.account_subcategory) {
        return (a.account_subcategory || '').localeCompare(b.account_subcategory || '');
      }
      return a.account_number - b.account_number;
    });
  };

  const getAccountCategoryGroups = (currentLineAccount, lineType) => {
    const filteredAccounts = getFilteredAccounts(currentLineAccount, lineType);
    const groups = {};
    
    filteredAccounts.forEach(acc => {
      const category = acc.account_category || 'Other';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(acc);
    });
    
    return groups;
  };

  const toggleAccountDropdown = (lineId) => {
    setShowAccountDropdown(prev => ({
      ...prev,
      [lineId]: !prev[lineId]
    }));
  };

  const addDebitLine = () => {
    setDebitLines([...debitLines, { account: '', description: '', debit: '', order: debitLines.length }]);
  };

  const addCreditLine = () => {
    setCreditLines([...creditLines, { account: '', description: '', credit: '', order: creditLines.length }]);
  };

  const removeDebitLine = (index) => {
    if (debitLines.length <= 1) {
      setError('A journal entry must have at least 1 debit line');
      return;
    }
    const newLines = debitLines.filter((_, i) => i !== index);
    setDebitLines(newLines.map((line, i) => ({ ...line, order: i })));
  };

  const removeCreditLine = (index) => {
    if (creditLines.length <= 1) {
      setError('A journal entry must have at least 1 credit line');
      return;
    }
    const newLines = creditLines.filter((_, i) => i !== index);
    setCreditLines(newLines.map((line, i) => ({ ...line, order: i })));
  };

  const updateDebitLine = (index, field, value) => {
    const newLines = [...debitLines];
    newLines[index][field] = value;
    setDebitLines(newLines);
    
    // Clear error when user starts typing
    if (error) {
    setError('');
    }
    
    // Real-time validation for amounts
    if (field === 'debit' && value) {
      const amount = parseFloat(value);
      if (amount < 0) {
        setError(`❌ Debit line ${index + 1}: Amount cannot be negative`);
      } else if (amount > 999999999) {
        setError(`❌ Debit line ${index + 1}: Amount too large (maximum: $999,999,999)`);
      } else if (amount === 0) {
        setError(`❌ Debit line ${index + 1}: Amount must be greater than 0`);
      }
    }
  };

  const updateCreditLine = (index, field, value) => {
    const newLines = [...creditLines];
    newLines[index][field] = value;
    setCreditLines(newLines);
    
    // Clear error when user starts typing
    if (error) {
    setError('');
    }
    
    // Real-time validation for amounts
    if (field === 'credit' && value) {
      const amount = parseFloat(value);
      if (amount < 0) {
        setError(`❌ Credit line ${index + 1}: Amount cannot be negative`);
      } else if (amount > 999999999) {
        setError(`❌ Credit line ${index + 1}: Amount too large (maximum: $999,999,999)`);
      } else if (amount === 0) {
        setError(`❌ Credit line ${index + 1}: Amount must be greater than 0`);
      }
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const validExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.jpg', '.jpeg', '.png'];
    
    const validFiles = files.filter(file => {
      const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      return validExtensions.includes(ext);
    });

    if (validFiles.length !== files.length) {
      setError('Some files were rejected. Allowed types: PDF, Word, Excel, CSV, JPG, PNG');
    }

    setAttachments([...attachments, ...validFiles]);
  };

  const removeAttachment = (index) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const calculateTotals = () => {
    const totalDebits = debitLines.reduce((sum, line) => sum + (parseFloat(line.debit) || 0), 0);
    const totalCredits = creditLines.reduce((sum, line) => sum + (parseFloat(line.credit) || 0), 0);
    return { totalDebits, totalCredits };
  };

  const validate = () => {
    // Clear previous errors
    setError('');

    if (!entryDate) {
      setError('❌ Entry date is required');
      return false;
    }

    // Check if entry date is in the future
    const today = new Date();
    const entryDateObj = new Date(entryDate);
    if (entryDateObj > today) {
      setError('❌ Entry date cannot be in the future');
      return false;
    }

    if (debitLines.length < 1 || creditLines.length < 1) {
      setError('❌ A journal entry must have at least 1 debit line and 1 credit line');
      return false;
    }

    // Validate debit lines
    for (let i = 0; i < debitLines.length; i++) {
      const line = debitLines[i];
      if (!line.account) {
        setError(`❌ Debit line ${i + 1}: Account must be selected`);
        return false;
      }

      const debit = parseFloat(line.debit) || 0;

      if (debit <= 0) {
        setError(`❌ Debit line ${i + 1}: Amount must be greater than 0`);
        return false;
      }

      if (debit < 0) {
        setError(`❌ Debit line ${i + 1}: Amount cannot be negative`);
        return false;
      }

      // Check for reasonable amount limits
      if (debit > 999999999) {
        setError(`❌ Debit line ${i + 1}: Amount too large (maximum: $999,999,999)`);
        return false;
      }
    }

    // Validate credit lines
    for (let i = 0; i < creditLines.length; i++) {
      const line = creditLines[i];
      if (!line.account) {
        setError(`❌ Credit line ${i + 1}: Account must be selected`);
        return false;
      }

      const credit = parseFloat(line.credit) || 0;

      if (credit <= 0) {
        setError(`❌ Credit line ${i + 1}: Amount must be greater than 0`);
        return false;
      }

      if (credit < 0) {
        setError(`❌ Credit line ${i + 1}: Amount cannot be negative`);
        return false;
      }

      // Check for reasonable amount limits
      if (credit > 999999999) {
        setError(`❌ Credit line ${i + 1}: Amount too large (maximum: $999,999,999)`);
        return false;
      }
    }

    // Check for duplicate accounts
    const selectedAccounts = getSelectedAccounts();
    const uniqueAccounts = new Set(selectedAccounts);
    if (selectedAccounts.length !== uniqueAccounts.size) {
      setError('❌ Cannot use the same account twice in a journal entry');
      return false;
    }

    // Check for at least one debit and one credit
    const hasDebit = debitLines.some(line => parseFloat(line.debit) > 0);
    const hasCredit = creditLines.some(line => parseFloat(line.credit) > 0);
    
    if (!hasDebit) {
      setError('❌ Journal entry must have at least one debit amount');
      return false;
    }
    
    if (!hasCredit) {
      setError('❌ Journal entry must have at least one credit amount');
      return false;
    }

    // Check balance
    const { totalDebits, totalCredits } = calculateTotals();

    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      setError(`❌ Total debits ($${totalDebits.toFixed(2)}) must equal total credits ($${totalCredits.toFixed(2)}). Difference: $${Math.abs(totalDebits - totalCredits).toFixed(2)}`);
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const allLines = [
        ...debitLines.map((line, idx) => ({
          account: parseInt(line.account),
          description: line.description,
          debit: parseFloat(line.debit) || 0,
          credit: 0,
          order: idx
        })),
        ...creditLines.map((line, idx) => ({
          account: parseInt(line.account),
          description: line.description,
          debit: 0,
          credit: parseFloat(line.credit) || 0,
          order: debitLines.length + idx
        }))
      ];

      const payload = {
        entry_date: entryDate,
        entry_type: entryType,
        description: description,
        lines: allLines
      };

      let entryId;
      if (isEditMode) {
        const res = await api.put(`/journal-entries/${id}/`, payload);
        entryId = res.data.id;
      } else {
        const res = await api.post('/journal-entries/', payload);
        entryId = res.data.id;
      }

      if (attachments.length > 0) {
        for (const file of attachments) {
          const formData = new FormData();
          formData.append('file', file);
          await api.post(`/journal-entries/${entryId}/upload_attachment/`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        }
      }

      alert(isEditMode ? 'Journal entry updated successfully!' : 'Journal entry created and submitted for approval!');
      navigate(-1);
    } catch (err) {
      console.error('Failed to save journal entry:', err);
      if (err.response?.data) {
        const errorData = err.response.data;
        if (typeof errorData === 'object') {
          let errorMessages = [];
          
          for (const [key, value] of Object.entries(errorData)) {
            if (key === 'lines' && typeof value === 'object' && !Array.isArray(value)) {
              for (const [lineKey, lineValue] of Object.entries(value)) {
                const message = Array.isArray(lineValue) ? lineValue.join(', ') : lineValue;
                errorMessages.push(message);
              }
            } else {
              const message = Array.isArray(value) ? value.join(', ') : value;
              errorMessages.push(key === 'non_field_errors' || key === 'detail' ? message : `${key}: ${message}`);
            }
          }
          
          setError(errorMessages.join('\n'));
        } else {
          setError(errorData.detail || 'Failed to save journal entry');
        }
      } else {
        setError('Failed to save journal entry. Please check your internet connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset this form? All unsaved changes will be lost.')) {
      setEntryDate(new Date().toISOString().split('T')[0]);
      setEntryType('REGULAR');
      setDescription('');
      setDebitLines([{ account: '', description: '', debit: '', order: 0 }]);
      setCreditLines([{ account: '', description: '', credit: '', order: 1 }]);
      setAttachments([]);
      setError('');
    }
  };

  const { totalDebits, totalCredits } = calculateTotals();
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

  return (
    <div style={{ padding: "12px 16px", maxWidth: "100%", boxSizing: "border-box" }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontFamily: "Playfair Display", fontSize: "1.5em", fontWeight: "600" }}>
          {isEditMode ? 'Edit Journal Entry' : 'Create Journal Entry'}
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

      {error && (
        <div style={{ 
          whiteSpace: 'pre-line', 
          marginBottom: 16,
          padding: '16px',
          backgroundColor: '#f8d7da',
          border: '2px solid #c1121f',
          borderRadius: '8px',
          color: '#c1121f',
          fontSize: '14px',
          fontWeight: '500',
          boxShadow: '0 2px 4px rgba(244, 67, 54, 0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '18px', marginRight: '8px' }}>⚠️</span>
            <strong style={{ fontSize: '16px' }}>Validation Error</strong>
          </div>
          <div style={{ marginLeft: '26px' }}>{error}</div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ 
          backgroundColor: 'white',
          border: '1px solid #ddd',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: 20,
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Entry Date <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Entry Type <span style={{ color: 'red' }}>*</span>
              </label>
              <select
                value={entryType}
                onChange={(e) => setEntryType(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  backgroundColor: '#fff'
                }}
              >
                <option value="REGULAR">Regular</option>
                <option value="ADJUSTED">Adjusted</option>
                <option value="CLOSING">Closing</option>
              </select>
            </div>
          </div>
        </div>

        <div style={{ 
          backgroundColor: 'white',
          border: '1px solid #ddd',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: 20,
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '1.1em', fontFamily: 'Playfair Display', fontWeight: '600' }}>Journal Entry Lines</h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={addDebitLine}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#1C5C59',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                + Add Debit
              </button>
              <button
                type="button"
                onClick={addCreditLine}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#1C5C59',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                + Add Credit
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px', tableLayout: 'fixed' }}>
              <thead>
                <tr style={{ backgroundColor: '#1C302F', color: 'white' }}>
                  <th style={{ padding: '12px', textAlign: 'left', width: '50%' }}>Accounts</th>
                  <th style={{ padding: '12px', textAlign: 'right', width: '25%' }}>Debit</th>
                  <th style={{ padding: '12px', textAlign: 'right', width: '25%' }}>Credit</th>
                </tr>
              </thead>
              <tbody>
                {debitLines.map((line, index) => (
                  <tr key={`debit-${index}`} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px', width: '50%' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ flex: 1, position: 'relative' }} data-dropdown>
                          <div
                            onClick={() => toggleAccountDropdown(`debit-${index}`)}
                          style={{
                            padding: '8px',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                              fontSize: '14px',
                              cursor: 'pointer',
                              backgroundColor: 'white',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              minHeight: '36px'
                            }}
                          >
                            <span>
                              {line.account ? 
                                accounts.find(acc => acc.id.toString() === line.account)?.account_number + ' - ' + 
                                accounts.find(acc => acc.id.toString() === line.account)?.account_name :
                                'Select Account'
                              }
                            </span>
                            <span>{showAccountDropdown[`debit-${index}`] ? '⌃' : '⌄'}</span>
                          </div>
                          
                          {showAccountDropdown[`debit-${index}`] && (
                            <div style={{
                              position: 'absolute',
                              top: '100%',
                              left: 0,
                              right: 0,
                              backgroundColor: 'white',
                              border: '1px solid #ddd',
                              borderRadius: '4px',
                              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                              zIndex: 1000,
                              maxHeight: '300px',
                              overflow: 'hidden'
                            }}>
                              {/* Filter Controls */}
                              <div style={{ padding: '8px', borderBottom: '1px solid #eee', backgroundColor: '#f8f9fa' }}>
                                <select
                                  value={accountFilter}
                                  onChange={(e) => setAccountFilter(e.target.value)}
                                  style={{
                                    width: '100%',
                                    padding: '4px',
                                    marginBottom: '4px',
                                    fontSize: '12px',
                                    border: '1px solid #ccc',
                                    borderRadius: '3px'
                                  }}
                                >
                                  <option value="all">All Categories</option>
                                  <option value="ASSET">Assets</option>
                                  <option value="LIABILITY">Liabilities</option>
                                  <option value="EQUITY">Equity</option>
                                  <option value="REVENUE">Revenue</option>
                                  <option value="EXPENSE">Expenses</option>
                                </select>
                                <input
                                  type="text"
                                  placeholder="Search accounts..."
                                  value={accountSearchTerm}
                                  onChange={(e) => setAccountSearchTerm(e.target.value)}
                                  style={{
                                    width: '100%',
                                    padding: '4px',
                                    fontSize: '12px',
                                    border: '1px solid #ccc',
                                    borderRadius: '3px'
                                  }}
                                />
                              </div>
                              
                              {/* Account List */}
                              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                {Object.entries(getAccountCategoryGroups(line.account, 'debit')).map(([category, categoryAccounts]) => (
                                  <div key={category}>
                                    <div style={{
                                      padding: '6px 12px',
                                      backgroundColor: '#e9ecef',
                                      fontSize: '12px',
                                      fontWeight: 'bold',
                                      color: '#495057',
                                      borderBottom: '1px solid #dee2e6'
                                    }}>
                                      {category}
                                    </div>
                                    {categoryAccounts.map(acc => (
                                      <div
                                        key={acc.id}
                                        onClick={() => {
                                          updateDebitLine(index, 'account', acc.id.toString());
                                          setShowAccountDropdown(prev => ({ ...prev, [`debit-${index}`]: false }));
                                        }}
                                        style={{
                                          padding: '8px 12px',
                                          cursor: 'pointer',
                                          fontSize: '13px',
                                          borderBottom: '1px solid #f1f3f4',
                                          display: 'flex',
                                          justifyContent: 'space-between',
                                          alignItems: 'center'
                                        }}
                                        onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                                        onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                                      >
                                        <div>
                                          <div style={{ fontWeight: '500' }}>
                              {acc.account_number} - {acc.account_name}
                                          </div>
                                          {acc.account_subcategory && (
                                            <div style={{ fontSize: '11px', color: '#6c757d' }}>
                                              {acc.account_subcategory}
                                            </div>
                                          )}
                                        </div>
                                        <div style={{ fontSize: '11px', color: '#6c757d' }}>
                                          {acc.normal_side}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ))}
                                {Object.keys(getAccountCategoryGroups(line.account, 'debit')).length === 0 && (
                                  <div style={{ padding: '12px', textAlign: 'center', color: '#6c757d', fontSize: '13px' }}>
                                    No accounts found
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeDebitLine(index)}
                          disabled={debitLines.length <= 1}
                          style={{
                            padding: '4px 8px',
                            backgroundColor: debitLines.length <= 1 ? '#ccc' : '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: debitLines.length <= 1 ? 'not-allowed' : 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          −
                        </button>
                      </div>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      {line.account ? (
                        (() => {
                          const acc = accounts.find(acc => acc.id.toString() === line.account);
                          if (!acc) return null;
                          return (
                            <button
                              type="button"
                              onClick={() => navigate(`/${(userRole || 'manager').toLowerCase()}/ledger/${acc.account_number}`)}
                              style={{
                                background: 'none',
                                border: '1px solid #1C5C59',
                                color: '#1C5C59',
                                cursor: 'pointer',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontSize: '12px'
                              }}
                              title="Post to ledger"
                            >
                              {acc.account_number}
                            </button>
                          );
                        })()
                      ) : (
                        <span style={{ color: '#999', fontSize: '12px' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '12px', width: '25%' }}>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={line.debit}
                        onChange={(e) => updateDebitLine(index, 'debit', e.target.value)}
                        placeholder="0.00"
                        required
                        style={{
                          width: '100%',
                          padding: '8px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          fontSize: '14px',
                          textAlign: 'right'
                        }}
                      />
                    </td>
                    <td style={{ padding: '12px', width: '25%', textAlign: 'right', color: '#999' }}>
                      {/* empty credit cell for debit line */}
                    </td>
                  </tr>
                ))}
                {creditLines.map((line, index) => (
                  <tr key={`credit-${index}`} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px', width: '50%' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '40px' }}>
                        <div style={{ flex: 1, position: 'relative' }} data-dropdown>
                          <div
                            onClick={() => toggleAccountDropdown(`credit-${index}`)}
                          style={{
                            padding: '8px',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                              fontSize: '14px',
                              cursor: 'pointer',
                              backgroundColor: 'white',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              minHeight: '36px'
                            }}
                          >
                            <span>
                              {line.account ? 
                                accounts.find(acc => acc.id.toString() === line.account)?.account_number + ' - ' + 
                                accounts.find(acc => acc.id.toString() === line.account)?.account_name :
                                'Select Account'
                              }
                            </span>
                            <span>{showAccountDropdown[`credit-${index}`] ? '⌃' : '⌄'}</span>
                          </div>
                          
                          {showAccountDropdown[`credit-${index}`] && (
                            <div style={{
                              position: 'absolute',
                              top: '100%',
                              left: 0,
                              right: 0,
                              backgroundColor: 'white',
                              border: '1px solid #ddd',
                              borderRadius: '4px',
                              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                              zIndex: 1000,
                              maxHeight: '300px',
                              overflow: 'hidden'
                            }}>
                              {/* Filter Controls */}
                              <div style={{ padding: '8px', borderBottom: '1px solid #eee', backgroundColor: '#f8f9fa' }}>
                                <select
                                  value={accountFilter}
                                  onChange={(e) => setAccountFilter(e.target.value)}
                                  style={{
                                    width: '100%',
                                    padding: '4px',
                                    marginBottom: '4px',
                                    fontSize: '12px',
                                    border: '1px solid #ccc',
                                    borderRadius: '3px'
                                  }}
                                >
                                  <option value="all">All Categories</option>
                                  <option value="ASSET">Assets</option>
                                  <option value="LIABILITY">Liabilities</option>
                                  <option value="EQUITY">Equity</option>
                                  <option value="REVENUE">Revenue</option>
                                  <option value="EXPENSE">Expenses</option>
                                </select>
                                <input
                                  type="text"
                                  placeholder="Search accounts..."
                                  value={accountSearchTerm}
                                  onChange={(e) => setAccountSearchTerm(e.target.value)}
                                  style={{
                                    width: '100%',
                                    padding: '4px',
                                    fontSize: '12px',
                                    border: '1px solid #ccc',
                                    borderRadius: '3px'
                                  }}
                                />
                              </div>
                              
                              {/* Account List */}
                              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                {Object.entries(getAccountCategoryGroups(line.account, 'credit')).map(([category, categoryAccounts]) => (
                                  <div key={category}>
                                    <div style={{
                                      padding: '6px 12px',
                                      backgroundColor: '#e9ecef',
                                      fontSize: '12px',
                                      fontWeight: 'bold',
                                      color: '#495057',
                                      borderBottom: '1px solid #dee2e6'
                                    }}>
                                      {category}
                                    </div>
                                    {categoryAccounts.map(acc => (
                                      <div
                                        key={acc.id}
                                        onClick={() => {
                                          updateCreditLine(index, 'account', acc.id.toString());
                                          setShowAccountDropdown(prev => ({ ...prev, [`credit-${index}`]: false }));
                                        }}
                                        style={{
                                          padding: '8px 12px',
                                          cursor: 'pointer',
                                          fontSize: '13px',
                                          borderBottom: '1px solid #f1f3f4',
                                          display: 'flex',
                                          justifyContent: 'space-between',
                                          alignItems: 'center'
                                        }}
                                        onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                                        onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                                      >
                                        <div>
                                          <div style={{ fontWeight: '500' }}>
                              {acc.account_number} - {acc.account_name}
                                          </div>
                                          {acc.account_subcategory && (
                                            <div style={{ fontSize: '11px', color: '#6c757d' }}>
                                              {acc.account_subcategory}
                                            </div>
                                          )}
                                        </div>
                                        <div style={{ fontSize: '11px', color: '#6c757d' }}>
                                          {acc.normal_side}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ))}
                                {Object.keys(getAccountCategoryGroups(line.account, 'credit')).length === 0 && (
                                  <div style={{ padding: '12px', textAlign: 'center', color: '#6c757d', fontSize: '13px' }}>
                                    No accounts found
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeCreditLine(index)}
                          disabled={creditLines.length <= 1}
                          style={{
                            padding: '4px 8px',
                            backgroundColor: creditLines.length <= 1 ? '#ccc' : '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: creditLines.length <= 1 ? 'not-allowed' : 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          −
                        </button>
                      </div>
                    </td>
                    <td style={{ padding: '12px', width: '25%', textAlign: 'right', color: '#999' }}>
                      {/* empty debit cell for credit line */}
                    </td>
                    <td style={{ padding: '12px', width: '25%' }}>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={line.credit}
                        onChange={(e) => updateCreditLine(index, 'credit', e.target.value)}
                        placeholder="0.00"
                        required
                        style={{
                          width: '100%',
                          padding: '8px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          fontSize: '14px',
                          textAlign: 'right'
                        }}
                      />
                    </td>
                  </tr>
                ))}
                <tr style={{ backgroundColor: '#f8f9fa', fontWeight: 'bold' }}>
                  <td style={{ padding: '12px', textAlign: 'right' }}>Totals:</td>
                  <td style={{ padding: '12px', textAlign: 'right', color: totalDebits > 0 ? '#1C5C59' : '#666' }}>
                    ${totalDebits.toFixed(2)}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', color: totalCredits > 0 ? '#1C5C59' : '#666' }}>
                    ${totalCredits.toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        {/* Description moved below lines, before entry balance */}
        <div style={{ 
          backgroundColor: 'white',
          border: '1px solid #ddd',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: 20,
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              Description (Optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter journal entry description"
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
          </div>
        </div>

        <div style={{ 
          backgroundColor: isBalanced ? '#d4edda' : '#f8d7da',
          border: isBalanced ? '2px solid #4f772d' : '2px solid #c1121f',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: 20,
          boxShadow: isBalanced ? '0 2px 4px rgba(76, 175, 80, 0.2)' : '0 2px 4px rgba(244, 67, 54, 0.2)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '1.1em', fontFamily: 'Playfair Display', fontWeight: '600' }}>Entry Balance</h3>
            <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
              <div>
                <span style={{ fontWeight: '500', marginRight: '8px' }}>Total Debits:</span>
                <span style={{ fontSize: '1.1em', fontWeight: 'bold', color: '#1C5C59' }}>${totalDebits.toFixed(2)}</span>
              </div>
              <div>
                <span style={{ fontWeight: '500', marginRight: '8px' }}>Total Credits:</span>
                <span style={{ fontSize: '1.1em', fontWeight: 'bold', color: '#1C5C59' }}>${totalCredits.toFixed(2)}</span>
              </div>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '20px',
                backgroundColor: isBalanced ? '#4f772d' : '#c1121f',
                color: 'white',
                fontWeight: 'bold',
                fontSize: '14px'
              }}>
                {isBalanced ? (
                  <>
                    <span style={{ fontSize: '18px' }}>✓</span>
                    <span>Balanced</span>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: '18px' }}>✗</span>
                    <span>Not Balanced</span>
                  </>
                )}
              </div>
            </div>
          </div>
          {!isBalanced && (
            <div style={{ 
              marginTop: '12px', 
              padding: '8px 12px', 
              backgroundColor: '#f8d7da', 
              borderRadius: '4px',
              fontSize: '14px',
              color: '#c1121f'
            }}>
              <strong>Difference:</strong> ${Math.abs(totalDebits - totalCredits).toFixed(2)}
            </div>
          )}
        </div>

        <div style={{ 
          backgroundColor: 'white',
          border: '1px solid #ddd',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: 20,
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1em', fontFamily: 'Playfair Display', fontWeight: '600' }}>Attachments</h3>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '12px' }}>
            Allowed file types: PDF, Word, Excel, CSV, JPG, PNG
          </p>
          
          <input
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.jpg,.jpeg,.png"
            onChange={handleFileChange}
            style={{ marginBottom: '16px' }}
          />

          {existingAttachments.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ fontSize: '0.95em', marginBottom: '8px' }}>Existing Attachments:</h4>
              {existingAttachments.map((att, idx) => (
                <div key={idx} style={{ padding: '8px', backgroundColor: '#f8f9fa', borderRadius: '4px', marginBottom: '8px' }}>
                  📎 {att.file_name} ({(att.file_size / 1024).toFixed(2)} KB)
                </div>
              ))}
            </div>
          )}

          {attachments.length > 0 && (
            <div>
              <h4 style={{ fontSize: '0.95em', marginBottom: '8px' }}>New Attachments:</h4>
              {attachments.map((file, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', backgroundColor: '#f8f9fa', borderRadius: '4px', marginBottom: '8px' }}>
                  <span>📎 {file.name} ({(file.size / 1024).toFixed(2)} KB)</span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(idx)}
                    style={{
                      padding: '4px 8px',
                      backgroundColor: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={handleReset}
            disabled={loading}
            style={{
              padding: '12px 24px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Reset
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            disabled={loading}
            style={{
              padding: '12px 24px',
              backgroundColor: 'white',
              color: '#333',
              border: '1px solid #ddd',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !isBalanced}
            style={{
              padding: '12px 24px',
              backgroundColor: (!isBalanced || loading) ? '#ccc' : '#1C5C59',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: (!isBalanced || loading) ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            {loading ? 'Saving...' : (isEditMode ? 'Update Entry' : 'Submit for Approval')}
          </button>
        </div>
      </form>

      {showHelpModal && (
        <HelpModal onClose={() => setShowHelpModal(false)} page="journalEntry" userRole={userRole} />
      )}
    </div>
  );
}
