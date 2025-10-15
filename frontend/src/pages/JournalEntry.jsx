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
  const [entryType, setEntryType] = useState('Regular');
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

  useEffect(() => {
    fetchAccounts();
    fetchUserRole();
    if (isEditMode) {
      fetchJournalEntry();
    }
  }, [id]);

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
      setEntryType(entry.description?.toLowerCase().includes('adjusting') ? 'Adjusting' : 'Regular');
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

  const getAvailableAccounts = (currentLineAccount) => {
    const selectedAccounts = getSelectedAccounts();
    return accounts.filter(acc => 
      !selectedAccounts.includes(acc.id.toString()) || acc.id.toString() === currentLineAccount
    );
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
    setError('');
  };

  const updateCreditLine = (index, field, value) => {
    const newLines = [...creditLines];
    newLines[index][field] = value;
    setCreditLines(newLines);
    setError('');
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
    if (!entryDate) {
      setError('Entry date is required');
      return false;
    }

    if (debitLines.length < 1 || creditLines.length < 1) {
      setError('A journal entry must have at least 1 debit line and 1 credit line');
      return false;
    }

    for (const line of debitLines) {
      if (!line.account) {
        setError('All debit lines must have an account selected');
        return false;
      }

      const debit = parseFloat(line.debit) || 0;

      if (debit <= 0) {
        setError('All debit lines must have a debit amount greater than 0');
        return false;
      }

      if (debit < 0) {
        setError('Debit amounts cannot be negative');
        return false;
      }
    }

    for (const line of creditLines) {
      if (!line.account) {
        setError('All credit lines must have an account selected');
        return false;
      }

      const credit = parseFloat(line.credit) || 0;

      if (credit <= 0) {
        setError('All credit lines must have a credit amount greater than 0');
        return false;
      }

      if (credit < 0) {
        setError('Credit amounts cannot be negative');
        return false;
      }
    }

    const selectedAccounts = getSelectedAccounts();
    const uniqueAccounts = new Set(selectedAccounts);
    if (selectedAccounts.length !== uniqueAccounts.size) {
      setError('Cannot use the same account twice in a journal entry');
      return false;
    }

    const { totalDebits, totalCredits } = calculateTotals();

    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      setError(`Total debits ($${totalDebits.toFixed(2)}) must equal total credits ($${totalCredits.toFixed(2)}). Difference: $${Math.abs(totalDebits - totalCredits).toFixed(2)}`);
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
        description: entryType === 'Adjusting' && !description.toLowerCase().includes('adjusting') 
          ? `${description ? description + ' - ' : ''}Adjusting Entry` 
          : description,
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
      setEntryType('Regular');
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
          padding: '12px',
          backgroundColor: '#fee',
          border: '1px solid #fcc',
          borderRadius: '6px',
          color: '#c00'
        }}>
          <strong>Error:</strong> {error}
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
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
                <option value="Regular">Regular</option>
                <option value="Adjusting">Adjusting</option>
              </select>
            </div>
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
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
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
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <select
                          value={line.account}
                          onChange={(e) => updateDebitLine(index, 'account', e.target.value)}
                          required
                          style={{
                            flex: 1,
                            padding: '8px',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            fontSize: '14px'
                          }}
                        >
                          <option value="">Select Account</option>
                          {getAvailableAccounts(line.account).map(acc => (
                            <option key={acc.id} value={acc.id}>
                              {acc.account_number} - {acc.account_name}
                            </option>
                          ))}
                        </select>
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
                    <td style={{ padding: '12px' }}>
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
                    <td style={{ padding: '12px' }}>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value=""
                        disabled
                        style={{
                          width: '100%',
                          padding: '8px',
                          border: '1px solid #eee',
                          borderRadius: '4px',
                          fontSize: '14px',
                          textAlign: 'right',
                          backgroundColor: '#f8f9fa',
                          color: '#999'
                        }}
                      />
                    </td>
                  </tr>
                ))}
                {creditLines.map((line, index) => (
                  <tr key={`credit-${index}`} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '40px' }}>
                        <select
                          value={line.account}
                          onChange={(e) => updateCreditLine(index, 'account', e.target.value)}
                          required
                          style={{
                            flex: 1,
                            padding: '8px',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            fontSize: '14px'
                          }}
                        >
                          <option value="">Select Account</option>
                          {getAvailableAccounts(line.account).map(acc => (
                            <option key={acc.id} value={acc.id}>
                              {acc.account_number} - {acc.account_name}
                            </option>
                          ))}
                        </select>
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
                    <td style={{ padding: '12px' }}>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value=""
                        disabled
                        style={{
                          width: '100%',
                          padding: '8px',
                          border: '1px solid #eee',
                          borderRadius: '4px',
                          fontSize: '14px',
                          textAlign: 'right',
                          backgroundColor: '#f8f9fa',
                          color: '#999'
                        }}
                      />
                    </td>
                    <td style={{ padding: '12px' }}>
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

        <div style={{ 
          backgroundColor: isBalanced ? '#d4edda' : '#f8d7da',
          border: isBalanced ? '1px solid #c3e6cb' : '1px solid #f5c6cb',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: 20,
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
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
              <div>
                {isBalanced ? (
                  <span style={{ color: '#28a745', fontSize: '16px', fontWeight: 'bold' }}>✓ Balanced</span>
                ) : (
                  <span style={{ color: '#dc3545', fontSize: '16px', fontWeight: 'bold' }}>✗ Not Balanced</span>
                )}
              </div>
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
