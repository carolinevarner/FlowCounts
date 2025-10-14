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
  const [description, setDescription] = useState('');
  const [lines, setLines] = useState([
    { account: '', description: '', debit: '', credit: '', order: 0 },
    { account: '', description: '', debit: '', credit: '', order: 1 }
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
      setDescription(entry.description);
      setLines(entry.lines.map(line => ({
        account: line.account,
        description: line.description,
        debit: line.debit || '',
        credit: line.credit || '',
        order: line.order
      })));
      setExistingAttachments(entry.attachments || []);
    } catch (err) {
      console.error('Failed to fetch journal entry:', err);
      setError('Failed to load journal entry');
    } finally {
      setLoading(false);
    }
  };

  const addLine = () => {
    setLines([...lines, { account: '', description: '', debit: '', credit: '', order: lines.length }]);
  };

  const removeLine = (index) => {
    if (lines.length <= 2) {
      setError('A journal entry must have at least 2 lines');
      return;
    }
    const newLines = lines.filter((_, i) => i !== index);
    setLines(newLines.map((line, i) => ({ ...line, order: i })));
  };

  const updateLine = (index, field, value) => {
    const newLines = [...lines];
    newLines[index][field] = value;
    setLines(newLines);
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
    const totalDebits = lines.reduce((sum, line) => sum + (parseFloat(line.debit) || 0), 0);
    const totalCredits = lines.reduce((sum, line) => sum + (parseFloat(line.credit) || 0), 0);
    return { totalDebits, totalCredits };
  };

  const validate = () => {
    if (!entryDate) {
      setError('Entry date is required');
      return false;
    }

    if (lines.length < 2) {
      setError('A journal entry must have at least 2 lines');
      return false;
    }

    for (const line of lines) {
      if (!line.account) {
        setError('All lines must have an account selected');
        return false;
      }

      const debit = parseFloat(line.debit) || 0;
      const credit = parseFloat(line.credit) || 0;

      if (debit < 0 || credit < 0) {
        setError('Debit and credit amounts cannot be negative');
        return false;
      }

      if (debit > 0 && credit > 0) {
        setError('A line cannot have both debit and credit amounts');
        return false;
      }

      if (debit === 0 && credit === 0) {
        setError('Each line must have either a debit or credit amount');
        return false;
      }
    }

    const { totalDebits, totalCredits } = calculateTotals();
    const hasDebit = lines.some(line => parseFloat(line.debit) > 0);
    const hasCredit = lines.some(line => parseFloat(line.credit) > 0);

    if (!hasDebit) {
      setError('Journal entry must have at least one debit entry');
      return false;
    }

    if (!hasCredit) {
      setError('Journal entry must have at least one credit entry');
      return false;
    }

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
      const sortedLines = [...lines].sort((a, b) => {
        const aDebit = parseFloat(a.debit) || 0;
        const bDebit = parseFloat(b.debit) || 0;
        return (bDebit > 0 ? 1 : 0) - (aDebit > 0 ? 1 : 0);
      });

      const payload = {
        entry_date: entryDate,
        description,
        lines: sortedLines.map((line, idx) => ({
          account: parseInt(line.account),
          description: line.description,
          debit: parseFloat(line.debit) || 0,
          credit: parseFloat(line.credit) || 0,
          order: idx
        }))
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
      setDescription('');
      setLines([
        { account: '', description: '', debit: '', credit: '', order: 0 },
        { account: '', description: '', debit: '', credit: '', order: 1 }
      ]);
      setAttachments([]);
      setError('');
    }
  };

  const { totalDebits, totalCredits } = calculateTotals();
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

  return (
    <div className="main-body">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ margin: 0, fontFamily: "Playfair Display", fontSize: "1.5em", fontWeight: "600", color: "#000" }}>
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
        <div className="error" style={{ whiteSpace: 'pre-line', marginBottom: '16px' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="card" style={{ marginBottom: '24px' }}>
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
                  fontSize: '14px'
                }}
              />
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

        <div className="card" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '1.1em', color: '#000', fontFamily: 'Playfair Display', fontWeight: '600' }}>Journal Entry Lines</h3>
            <button
              type="button"
              onClick={addLine}
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
              + Add Line
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
              <thead>
                <tr style={{ backgroundColor: '#1C302F', color: 'white' }}>
                  <th style={{ padding: '12px', textAlign: 'left', width: '5%' }}>#</th>
                  <th style={{ padding: '12px', textAlign: 'left', width: '30%' }}>Account <span style={{ color: '#ffcccb' }}>*</span></th>
                  <th style={{ padding: '12px', textAlign: 'left', width: '25%' }}>Description</th>
                  <th style={{ padding: '12px', textAlign: 'right', width: '15%' }}>Debit</th>
                  <th style={{ padding: '12px', textAlign: 'right', width: '15%' }}>Credit</th>
                  <th style={{ padding: '12px', textAlign: 'center', width: '10%' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px' }}>{index + 1}</td>
                    <td style={{ padding: '12px' }}>
                      <select
                        value={line.account}
                        onChange={(e) => updateLine(index, 'account', e.target.value)}
                        required
                        style={{
                          width: '100%',
                          padding: '8px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          fontSize: '14px'
                        }}
                      >
                        <option value="">Select Account</option>
                        {accounts.map(acc => (
                          <option key={acc.id} value={acc.id}>
                            {acc.account_number} - {acc.account_name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <input
                        type="text"
                        value={line.description}
                        onChange={(e) => updateLine(index, 'description', e.target.value)}
                        placeholder="Optional"
                        style={{
                          width: '100%',
                          padding: '8px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          fontSize: '14px'
                        }}
                      />
                    </td>
                    <td style={{ padding: '12px' }}>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={line.debit}
                        onChange={(e) => updateLine(index, 'debit', e.target.value)}
                        disabled={line.credit > 0}
                        placeholder="0.00"
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
                        value={line.credit}
                        onChange={(e) => updateLine(index, 'credit', e.target.value)}
                        disabled={line.debit > 0}
                        placeholder="0.00"
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
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => removeLine(index)}
                        disabled={lines.length <= 2}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: lines.length <= 2 ? '#ccc' : '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: lines.length <= 2 ? 'not-allowed' : 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
                <tr style={{ backgroundColor: '#f8f9fa', fontWeight: 'bold', fontSize: '1.1em' }}>
                  <td colSpan="3" style={{ padding: '12px', textAlign: 'right' }}>Totals:</td>
                  <td style={{ padding: '12px', textAlign: 'right', color: totalDebits > 0 ? '#1C5C59' : '#666' }}>
                    ${totalDebits.toFixed(2)}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', color: totalCredits > 0 ? '#1C5C59' : '#666' }}>
                    ${totalCredits.toFixed(2)}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    {isBalanced ? (
                      <span style={{ color: '#28a745', fontSize: '18px' }}>✓</span>
                    ) : (
                      <span style={{ color: '#dc3545', fontSize: '18px' }}>✗</span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="card" style={{ marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1em', color: '#000', fontFamily: 'Playfair Display', fontWeight: '600' }}>Attachments</h3>
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

