import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import HelpModal from "../components/HelpModal";
import EmailModal from "../components/EmailModal";
import "../styles/auth.css";
import "../styles/layout.css";

function formatCurrency(value) {
  if (value === null || value === undefined) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function DeactivateAccountModal({ account, onClose, onDeactivated }) {
  const isActive = account.is_active;
  
  const [form, setForm] = useState({
    deactivate_from: "",
    deactivate_to: "",
    indefinite: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function setField(key, val) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function validate() {
    if (isActive) {
      if (parseFloat(account.balance) !== 0) {
        return "Cannot deactivate an account with a non-zero balance.";
      }
      if (!form.indefinite && (!form.deactivate_from || !form.deactivate_to)) {
        return "Please select both dates or choose 'Deactivate Until Further Notice'.";
      }
      if (!form.indefinite && form.deactivate_from && form.deactivate_to) {
        const startDate = new Date(form.deactivate_from);
        const endDate = new Date(form.deactivate_to);
        if (startDate > endDate) {
          return "End date must be after start date.";
        }
      }
    }
    return "";
  }

  async function onSubmit() {
    setError("");
    const msg = validate();
    if (msg) {
      setError(msg);
      return;
    }
    
    try {
      setSaving(true);
      if (isActive) {
        await api.post(`/chart-of-accounts/${account.id}/deactivate/`);
      } else {
        await api.post(`/chart-of-accounts/${account.id}/activate/`);
      }
      onDeactivated();
      onClose();
    } catch (e) {
      const apiMsg = e?.response?.data?.error || e?.response?.data?.detail || 
        `${isActive ? "Deactivate" : "Activate"} failed. Check server.`;
      setError(apiMsg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="modal-panel" onMouseDown={(e) => e.stopPropagation()}>
        <button 
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '15px',
            right: '15px',
            background: 'none',
            border: 'none',
            fontSize: '35px',
            cursor: 'pointer',
            color: '#666',
            lineHeight: '1',
            padding: '0',
            width: '60px',
            height: '60px'
          }}
          aria-label="Close"
        >
          ×
        </button>
        <h3 style={{ marginTop: 0 }}>
          {isActive ? "Deactivate Account" : "Activate Account"}
        </h3>

        <div className="field">
          <label>Account</label>
          <input value={`${account.account_number} - ${account.account_name}`} disabled />
        </div>

        {!isActive ? (
          <div style={{ padding: '12px', backgroundColor: '#fff3cd', borderRadius: '6px', marginBottom: '12px' }}>
            <p style={{ margin: 0, fontSize: '14px' }}>
              This account is currently inactive. Click "Activate" to restore it.
            </p>
          </div>
        ) : (
          <>
            <div style={{ padding: '12px', backgroundColor: '#d4edda', borderRadius: '6px', marginBottom: '12px' }}>
              <p style={{ margin: 0, fontSize: '14px' }}>
                <strong>Balance:</strong> {formatCurrency(account.balance)}
              </p>
              {parseFloat(account.balance) !== 0 && (
                <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#c1121f' }}>
                  ⚠ Cannot deactivate account with non-zero balance
                </p>
              )}
            </div>

            <div className="field">
              <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  checked={form.indefinite}
                  onChange={(e) => setField("indefinite", e.target.checked)}
                  style={{ cursor: "pointer", width: "18px", height: "18px" }}
                />
                <span>Deactivate Until Further Notice</span>
              </label>
            </div>

            {!form.indefinite && (
              <>
                <div className="field">
                  <label>Deactivate From</label>
                  <input
                    type="date"
                    value={form.deactivate_from}
                    onChange={(e) => setField("deactivate_from", e.target.value)}
                  />
                </div>

                <div className="field">
                  <label>Deactivate To</label>
                  <input
                    type="date"
                    value={form.deactivate_to}
                    onChange={(e) => setField("deactivate_to", e.target.value)}
                  />
                </div>
              </>
            )}
          </>
        )}

        {error && <div className="error">{error}</div>}

        <button 
          className="auth-button" 
          disabled={saving || (isActive && parseFloat(account.balance) !== 0)} 
          onClick={onSubmit} 
          style={{ marginTop: 6, backgroundColor: isActive ? '#c1121f' : '#4f772d' }}
        >
          {saving ? "Processing…" : isActive ? "Deactivate" : "Activate"}
        </button>
        <button 
          className="auth-button secondary" 
          disabled={saving} 
          onClick={onClose} 
          style={{ marginTop: 10 }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function AccountFormModal({ account, onClose, onSaved, onOpenDeactivate }) {
  const isEdit = !!account;
  const [form, setForm] = useState({
    account_name: "",
    account_number: "",
    account_description: "",
    normal_side: "DEBIT",
    account_category: "ASSET",
    account_subcategory: "",
    initial_balance: "0.00",
    debit: "0.00",
    credit: "0.00",
    balance: "0.00",
    order: "",
    statement: "BS",
    comment: "",
    is_active: true,
    ...account,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function setField(key, val) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function validate() {
    if (!form.account_name.trim()) return "Account name is required.";
    if (!form.account_number.trim()) return "Account number is required.";
    if (!form.account_description.trim()) return "Account description is required.";
    if (!form.account_subcategory.trim()) return "Account subcategory is required.";
    if (!form.order) return "Order is required.";
    
    if (!/^\d+$/.test(form.account_number)) {
      return "Account number must be numeric only (no decimals or alphanumeric).";
    }
    
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        initial_balance: parseFloat(form.initial_balance) || 0,
        debit: parseFloat(form.debit) || 0,
        credit: parseFloat(form.credit) || 0,
        balance: parseFloat(form.balance) || 0,
        order: parseInt(form.order) || 0,
        is_active: form.is_active,
      };

      if (isEdit) {
        await api.put(`/chart-of-accounts/${account.id}/`, payload);
      } else {
        await api.post("/chart-of-accounts/", payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      const msg = err.response?.data?.is_active?.[0]
        || err.response?.data?.account_number?.[0] 
        || err.response?.data?.account_name?.[0] 
        || err.response?.data?.detail 
        || "Failed to save account.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>{isEdit ? "Edit Account" : "Add New Account"}</h2>
        <form onSubmit={handleSubmit}>
          {error && <div className="error-box">{error}</div>}

          <div className="form-row">
            <div className="form-group">
              <label>Account Name *</label>
              <input
                type="text"
                value={form.account_name}
                onChange={(e) => setField("account_name", e.target.value)}
                disabled={saving}
                style={{
                  padding: "8px 12px",
                  fontSize: 13,
                  borderRadius: "6px",
                  border: "1px solid #b8b6b6",
                  outline: "none",
                  fontFamily: "sans-serif",
                  width: "100%"
                }}
              />
            </div>

            <div className="form-group">
              <label>Account Number *</label>
              <input
                type="text"
                value={form.account_number}
                onChange={(e) => setField("account_number", e.target.value)}
                disabled={saving}
                placeholder="e.g. 1000"
                style={{
                  padding: "8px 12px",
                  fontSize: 13,
                  borderRadius: "6px",
                  border: "1px solid #b8b6b6",
                  outline: "none",
                  fontFamily: "sans-serif",
                  width: "100%"
                }}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Account Description *</label>
            <textarea
              value={form.account_description}
              onChange={(e) => setField("account_description", e.target.value)}
              disabled={saving}
              rows="3"
              style={{
                padding: "8px 12px",
                fontSize: 13,
                borderRadius: "6px",
                border: "1px solid #b8b6b6",
                outline: "none",
                fontFamily: "sans-serif",
                width: "100%"
              }}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Normal Side *</label>
              <select
                value={form.normal_side}
                onChange={(e) => setField("normal_side", e.target.value)}
                disabled={saving}
                style={{
                  padding: "8px 12px",
                  fontSize: 13,
                  borderRadius: "6px",
                  border: "1px solid #b8b6b6",
                  backgroundColor: "#fff",
                  cursor: "pointer",
                  outline: "none",
                  fontFamily: "sans-serif",
                  width: "100%"
                }}
              >
                <option value="DEBIT">Debit</option>
                <option value="CREDIT">Credit</option>
              </select>
            </div>

            <div className="form-group">
              <label>Account Category *</label>
              <select
                value={form.account_category}
                onChange={(e) => setField("account_category", e.target.value)}
                disabled={saving}
                style={{
                  padding: "8px 12px",
                  fontSize: 13,
                  borderRadius: "6px",
                  border: "1px solid #b8b6b6",
                  backgroundColor: "#fff",
                  cursor: "pointer",
                  outline: "none",
                  fontFamily: "sans-serif",
                  width: "100%"
                }}
              >
                <option value="ASSET">Asset</option>
                <option value="LIABILITY">Liability</option>
                <option value="EQUITY">Equity</option>
                <option value="REVENUE">Revenue</option>
                <option value="EXPENSE">Expense</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Account Subcategory *</label>
            <select
              value={form.account_subcategory}
              onChange={(e) => setField("account_subcategory", e.target.value)}
              disabled={saving}
              style={{
                padding: "8px 12px",
                fontSize: 13,
                borderRadius: "6px",
                border: "1px solid #b8b6b6",
                backgroundColor: "#fff",
                cursor: "pointer",
                outline: "none",
                fontFamily: "sans-serif",
                width: "100%"
              }}
            >
              <option value="">Select Subcategory</option>
              {form.account_category === 'ASSET' && (
                <>
                  <option value="Current Assets">Current Assets</option>
                  <option value="Fixed Assets">Fixed Assets</option>
                  <option value="Intangible Assets">Intangible Assets</option>
                  <option value="Other Assets">Other Assets</option>
                </>
              )}
              {form.account_category === 'LIABILITY' && (
                <>
                  <option value="Current Liabilities">Current Liabilities</option>
                  <option value="Long-term Liabilities">Long-term Liabilities</option>
                  <option value="Other Liabilities">Other Liabilities</option>
                </>
              )}
              {form.account_category === 'EQUITY' && (
                <>
                  <option value="Owner's Equity">Owner's Equity</option>
                  <option value="Retained Earnings">Retained Earnings</option>
                  <option value="Other Equity">Other Equity</option>
                </>
              )}
              {form.account_category === 'REVENUE' && (
                <>
                  <option value="Operating Revenue">Operating Revenue</option>
                  <option value="Non-operating Revenue">Non-operating Revenue</option>
                  <option value="Other Revenue">Other Revenue</option>
                </>
              )}
              {form.account_category === 'EXPENSE' && (
                <>
                  <option value="Operating Expenses">Operating Expenses</option>
                  <option value="Cost of Goods Sold">Cost of Goods Sold</option>
                  <option value="Other Expenses">Other Expenses</option>
                </>
              )}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Initial Balance</label>
              <input
                type="number"
                step="0.01"
                value={form.initial_balance}
                onChange={(e) => setField("initial_balance", e.target.value)}
                disabled={saving}
                style={{
                  padding: "8px 12px",
                  fontSize: 13,
                  borderRadius: "6px",
                  border: "1px solid #b8b6b6",
                  outline: "none",
                  fontFamily: "sans-serif",
                  width: "100%"
                }}
              />
            </div>

            <div className="form-group">
              <label>Debit</label>
              <input
                type="number"
                step="0.01"
                value={form.debit}
                onChange={(e) => setField("debit", e.target.value)}
                disabled={saving}
                style={{
                  padding: "8px 12px",
                  fontSize: 13,
                  borderRadius: "6px",
                  border: "1px solid #b8b6b6",
                  outline: "none",
                  fontFamily: "sans-serif",
                  width: "100%"
                }}
              />
            </div>

            <div className="form-group">
              <label>Credit</label>
              <input
                type="number"
                step="0.01"
                value={form.credit}
                onChange={(e) => setField("credit", e.target.value)}
                disabled={saving}
                style={{
                  padding: "8px 12px",
                  fontSize: 13,
                  borderRadius: "6px",
                  border: "1px solid #b8b6b6",
                  outline: "none",
                  fontFamily: "sans-serif",
                  width: "100%"
                }}
              />
            </div>

            <div className="form-group">
              <label>Balance</label>
              <input
                type="number"
                step="0.01"
                value={form.balance}
                onChange={(e) => setField("balance", e.target.value)}
                disabled={saving}
                style={{
                  padding: "8px 12px",
                  fontSize: 13,
                  borderRadius: "6px",
                  border: "1px solid #b8b6b6",
                  outline: "none",
                  fontFamily: "sans-serif",
                  width: "100%"
                }}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Order *</label>
              <input
                type="number"
                value={form.order}
                onChange={(e) => setField("order", e.target.value)}
                disabled={saving}
                placeholder="e.g. 1"
                style={{
                  padding: "8px 12px",
                  fontSize: 13,
                  borderRadius: "6px",
                  border: "1px solid #b8b6b6",
                  outline: "none",
                  fontFamily: "sans-serif",
                  width: "100%"
                }}
              />
            </div>

            <div className="form-group">
              <label>Statement *</label>
              <select
                value={form.statement}
                onChange={(e) => setField("statement", e.target.value)}
                disabled={saving}
                style={{
                  padding: "8px 12px",
                  fontSize: 13,
                  borderRadius: "6px",
                  border: "1px solid #b8b6b6",
                  backgroundColor: "#fff",
                  cursor: "pointer",
                  outline: "none",
                  fontFamily: "sans-serif",
                  width: "100%"
                }}
              >
                <option value="IS">Income Statement (IS)</option>
                <option value="BS">Balance Sheet (BS)</option>
                <option value="RE">Retained Earnings (RE)</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Comment</label>
            <textarea
              value={form.comment}
              onChange={(e) => setField("comment", e.target.value)}
              disabled={saving}
              rows="2"
              style={{
                padding: "8px 12px",
                fontSize: 13,
                borderRadius: "6px",
                border: "1px solid #b8b6b6",
                outline: "none",
                fontFamily: "sans-serif",
                width: "100%"
              }}
            />
          </div>

          {isEdit && (
            <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid #eee" }}>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenDeactivate(account);
                }}
                className="auth-button secondary"
                style={{
                  width: "100%",
                  backgroundColor: account.is_active ? '#c1121f' : '#4f772d',
                  color: 'white',
                  border: 'none',
                  fontSize: 13,
                  padding: '8px 12px'
                }}
              >
                {account.is_active ? '🔒 Deactivate Account' : '✓ Activate Account'}
              </button>
            </div>
          )}

          <div className="form-actions">
            <button 
              type="button" 
              onClick={onClose} 
              disabled={saving}
              className="auth-button"
              style={{
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                fontSize: 13
              }}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={saving}
              className="auth-button secondary"
              style={{
                backgroundColor: '#1C5C59',
                color: 'white',
                border: 'none',
                fontSize: 13,
                opacity: saving ? 0.5 : 1
              }}
            >
              {saving ? "Saving..." : isEdit ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Accounts() {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [deactivatingAccount, setDeactivatingAccount] = useState(null);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [userRole, setUserRole] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [managersAndAdmins, setManagersAndAdmins] = useState({ managers: [], admin_emails: [] });

  useEffect(() => {
    fetchUserRole();
    fetchAccounts();
    fetchManagersAndAdmins();
  }, []);

  useEffect(() => {
    const handleClickOutside = () => {
      if (showDatePicker) {
        setShowDatePicker(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showDatePicker]);

  async function fetchUserRole() {
    try {
      const res = await api.get("/auth/me/");
      setUserRole(res.data.role);
    } catch (err) {
      console.error("Failed to fetch user role:", err);
    }
  }

  async function fetchManagersAndAdmins() {
    try {
      const response = await api.get('/auth/managers-admins/');
      setManagersAndAdmins(response.data);
    } catch (err) {
      console.error('Failed to fetch managers and admins:', err);
    }
  }

  function handleSendEmail() {
    setShowEmailModal(true);
  }

  function handleCloseEmailModal() {
    setShowEmailModal(false);
  }

  async function fetchAccounts() {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/chart-of-accounts/");
      setAccounts(res.data);
    } catch (err) {
      setError("Failed to load accounts.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (selectedDate) {
      fetchAccounts();
    }
  }, [selectedDate]);

  function handleAdd() {
    setEditingAccount(null);
    setShowModal(true);
  }

  function handleEdit(account) {
    setEditingAccount(account);
    setShowModal(true);
  }

  const isAdmin = userRole === "ADMIN";

  const getTermType = (account) => {
    const accountNumber = parseInt(account.account_number);
    
    // Accounts 3000-5700 (equity, revenue, expense) should have empty terms
    if (accountNumber >= 3000 && accountNumber <= 5700) {
      return '';
    }
    
    const subcategory = (account.account_subcategory || '').toLowerCase();  
    const currentKeywords = ['current', 'short-term', 'short term', 'cash', 'receivable', 'payable'];                                                       
    for (const keyword of currentKeywords) {
      if (subcategory.includes(keyword)) {
        return 'Current';
      }
    }
    return 'Long Term';
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIndicator = (columnKey) => {
    if (sortConfig.key !== columnKey) {
      return ' ⌄';
    }
    return sortConfig.direction === 'asc' ? ' ⌃' : ' ⌄';
  };

  const getLiquidityOrder = (account) => {
    const categoryOrder = {
      'ASSET': 1,
      'LIABILITY': 2,
      'EQUITY': 3,
      'REVENUE': 4,
      'EXPENSE': 5,
    };

    const assetSubcategoryOrder = {
      'cash': 1,
      'current assets': 2,
      'current': 2,
      'accounts receivable': 3,
      'receivable': 3,
      'inventory': 4,
      'prepaid': 5,
      'short-term': 6,
      'investments': 7,
      'property': 8,
      'plant': 8,
      'equipment': 8,
      'fixed assets': 8,
      'long-term': 9,
      'intangible': 10,
      'other': 11,
    };

    const liabilitySubcategoryOrder = {
      'current liabilities': 1,
      'current': 1,
      'accounts payable': 2,
      'payable': 2,
      'short-term': 3,
      'notes payable': 4,
      'long-term': 5,
      'long-term liabilities': 5,
      'bonds': 6,
      'mortgage': 7,
      'other': 8,
    };

    const category = account.account_category;
    const subcategory = (account.account_subcategory || '').toLowerCase();
    
    let subcategoryOrder = 999;
    
    if (category === 'ASSET') {
      for (const [key, order] of Object.entries(assetSubcategoryOrder)) {
        if (subcategory.includes(key)) {
          subcategoryOrder = order;
          break;
        }
      }
    } else if (category === 'LIABILITY') {
      for (const [key, order] of Object.entries(liabilitySubcategoryOrder)) {
        if (subcategory.includes(key)) {
          subcategoryOrder = order;
          break;
        }
      }
    }

    return {
      categoryOrder: categoryOrder[category] || 999,
      subcategoryOrder: subcategoryOrder,
      accountNumber: parseInt(account.account_number) || 0,
      order: account.order || 0,
    };
  };

  const filteredAccounts = useMemo(() => {
    let filtered = accounts;

    // Filter out inactive accounts for managers and accountants
    if (userRole === "MANAGER" || userRole === "ACCOUNTANT") {
      filtered = filtered.filter((a) => a.is_active);
    }

    if (selectedDate) {
      filtered = filtered.filter((a) => {
        if (!a.created_at) return false;
        const accountDate = new Date(a.created_at).toISOString().split('T')[0];
        return accountDate === selectedDate;
      });
    }

    if (filter === "active") {
      filtered = filtered.filter((a) => a.is_active);
    } else if (filter === "inactive") {
      filtered = filtered.filter((a) => !a.is_active);
    } else if (["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"].includes(filter)) {
      filtered = filtered.filter((a) => a.account_category === filter);
    } else if (filter === "current_assets") {
      filtered = filtered.filter((a) => 
        a.account_category === "ASSET" && 
        a.account_subcategory.toLowerCase().includes("current")
      );
    } else if (filter === "fixed_assets") {
      filtered = filtered.filter((a) => 
        a.account_category === "ASSET" && 
        (a.account_subcategory.toLowerCase().includes("fixed") || 
         a.account_subcategory.toLowerCase().includes("property") ||
         a.account_subcategory.toLowerCase().includes("equipment"))
      );
    } else if (filter === "current_liabilities") {
      filtered = filtered.filter((a) => 
        a.account_category === "LIABILITY" && 
        a.account_subcategory.toLowerCase().includes("current")
      );
    } else if (filter === "long_term_liabilities") {
      filtered = filtered.filter((a) => 
        a.account_category === "LIABILITY" && 
        (a.account_subcategory.toLowerCase().includes("long") || 
         a.account_subcategory.toLowerCase().includes("term"))
      );
    } else if (filter === "cash") {
      filtered = filtered.filter((a) => 
        a.account_subcategory.toLowerCase().includes("cash")
      );
    } else if (filter === "accounts_receivable") {
      filtered = filtered.filter((a) => 
        a.account_subcategory.toLowerCase().includes("receivable")
      );
    } else if (filter === "accounts_payable") {
      filtered = filtered.filter((a) => 
        a.account_subcategory.toLowerCase().includes("payable")
      );
    } else if (filter === "inventory") {
      filtered = filtered.filter((a) => 
        a.account_subcategory.toLowerCase().includes("inventory")
      );
    } else if (filter === "equipment") {
      filtered = filtered.filter((a) => 
        a.account_subcategory.toLowerCase().includes("equipment")
      );
    } else if (filter === "other") {
      filtered = filtered.filter((a) => 
        a.account_subcategory.toLowerCase().includes("other")
      );
    } else if (filter === "zero_balance") {
      filtered = filtered.filter((a) => parseFloat(a.balance || 0) === 0);
    } else if (filter === "positive_balance") {
      filtered = filtered.filter((a) => parseFloat(a.balance || 0) > 0);
    } else if (filter === "negative_balance") {
      filtered = filtered.filter((a) => parseFloat(a.balance || 0) < 0);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.account_name.toLowerCase().includes(term) ||
          a.account_number.includes(term) ||
          a.account_category.toLowerCase().includes(term) ||
          a.account_subcategory.toLowerCase().includes(term)
      );
    }

    if (sortConfig.key) {
      filtered = [...filtered].sort((a, b) => {
        let aValue, bValue;

        switch (sortConfig.key) {
          case 'account_number':
            aValue = parseInt(a.account_number) || 0;
            bValue = parseInt(b.account_number) || 0;
            break;
          case 'account_name':
            aValue = a.account_name.toLowerCase();
            bValue = b.account_name.toLowerCase();
            break;
          case 'account_category':
            aValue = a.account_category.toLowerCase();
            bValue = b.account_category.toLowerCase();
            break;
          case 'account_subcategory':
            aValue = a.account_subcategory.toLowerCase();
            bValue = b.account_subcategory.toLowerCase();
            break;
          case 'terms':
            aValue = getTermType(a);
            bValue = getTermType(b);
            break;
          case 'balance':
            aValue = parseFloat(a.balance) || 0;
            bValue = parseFloat(b.balance) || 0;
            break;
          default:
            return 0;
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    } else {
      filtered = [...filtered].sort((a, b) => {
        const orderA = getLiquidityOrder(a);
        const orderB = getLiquidityOrder(b);

        if (orderA.categoryOrder !== orderB.categoryOrder) {
          return orderA.categoryOrder - orderB.categoryOrder;
        }

        if (orderA.subcategoryOrder !== orderB.subcategoryOrder) {
          return orderA.subcategoryOrder - orderB.subcategoryOrder;
        }

        if (orderA.order !== orderB.order) {
          return orderA.order - orderB.order;
        }

        return orderA.accountNumber - orderB.accountNumber;
      });
    }

    return filtered;
  }, [accounts, filter, searchTerm, sortConfig, selectedDate]);

  if (loading) {
    return <div style={{ padding: "12px 16px" }}>Loading...</div>;
  }

  return (
    <div style={{ padding: "12px 16px", maxWidth: "100%", boxSizing: "border-box" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontFamily: "Playfair Display", fontSize: "1.5em", fontWeight: "600" }}>Accounts</h2>
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

      {error && <div className="error-box">{error}</div>}

      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        marginBottom: 20, 
        gap: 20,
        flexWrap: "wrap"
      }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ position: "relative" }} onClick={(e) => e.stopPropagation()}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowDatePicker(!showDatePicker);
              }}
              style={{
                padding: "6px 10px",
                fontSize: 16,
                borderRadius: "6px",
                border: "1px solid #b8b6b6",
                backgroundColor: "#fff",
                cursor: "pointer",
                height: "30px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minWidth: "40px",
                color: "#000"
              }}
              title={selectedDate ? `Accounts created on: ${new Date(selectedDate).toLocaleDateString()}` : "Select a date to filter accounts"}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z"/>
              </svg>
            </button>
            {showDatePicker && (
              <div 
                style={{
                  position: "absolute",
                  top: "35px",
                  left: 0,
                  background: "white",
                  border: "1px solid #b8b6b6",
                  borderRadius: "6px",
                  padding: "12px",
                  boxShadow: "0 4px 8px rgba(0,0,0,0.15)",
                  zIndex: 1000,
                  minWidth: 220
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ marginBottom: 8, fontSize: 12, fontWeight: "bold", color: "#333" }}>
                  View accounts created on:
                </div>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setShowDatePicker(false);
                  }}
                  style={{
                    width: "100%",
                    padding: "6px 8px",
                    fontSize: 12,
                    borderRadius: "4px",
                    border: "1px solid #b8b6b6"
                  }}
                />
                <div style={{ marginTop: 8, fontSize: 11, color: "#666", textAlign: "center" }}>
                  {selectedDate ? `Selected: ${new Date(selectedDate).toLocaleDateString()}` : "No date selected - Showing all"}
                </div>
                <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
                  <button
                    onClick={() => {
                      setSelectedDate(new Date().toISOString().split('T')[0]);
                      setShowDatePicker(false);
                    }}
                    style={{
                      flex: 1,
                      padding: "4px 8px",
                      fontSize: 11,
                      backgroundColor: "#f5f5f5",
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                      cursor: "pointer"
                    }}
                  >
                    Today
                  </button>
                  <button
                    onClick={() => {
                      setSelectedDate("");
                      setShowDatePicker(false);
                    }}
                    style={{
                      flex: 1,
                      padding: "4px 8px",
                      fontSize: 11,
                      backgroundColor: "#f5f5f5",
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                      cursor: "pointer"
                    }}
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}
          </div>

          {userRole === 'ACCOUNTANT' && (
            <button
            onClick={handleSendEmail}
            style={{
              padding: "6px 10px",
              fontSize: 16,
              borderRadius: "6px",
              border: "1px solid #b8b6b6",
              backgroundColor: "#fff",
              cursor: "pointer",
              height: "30px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minWidth: "40px",
              color: "#000"
            }}
            title="Send email to manager or administrator"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V4zm2-1a1 1 0 0 0-1 1v.217l7 4.2 7-4.2V4a1 1 0 0 0-1-1H2zm13 2.383-4.708 2.825L15 11.105V5.383zm-.034 6.876-5.64-3.471L8 9.583l-1.326-.795-5.64 3.47A1 1 0 0 0 2 13h12a1 1 0 0 0 .966-.741zM1 11.105l4.708-2.897L1 5.383v5.722z"/>
            </svg>
          </button>
        )}

          {isAdmin && (
            <button 
              onClick={handleAdd} 
              className="auth-button secondary"
              style={{ 
                fontSize: 12, 
                padding: '6px 12px', 
                backgroundColor: '#1C5C59', 
                color: 'white', 
                border: 'none'
              }}
              title="Create a new account in the chart of accounts"
            >
              + Add Account
            </button>
          )}
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flex: "0 0 auto" }}>
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)} 
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
            title="Filter accounts by various criteria"
          >
            <option value="all">All Accounts</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
            <optgroup label="By Category">
              <option value="ASSET">Assets</option>
              <option value="LIABILITY">Liabilities</option>
              <option value="EQUITY">Equity</option>
              <option value="REVENUE">Revenue</option>
              <option value="EXPENSE">Expenses</option>
            </optgroup>
            <optgroup label="By Subtype">
              <option value="current_assets">Current Assets</option>
              <option value="fixed_assets">Fixed Assets</option>
              <option value="current_liabilities">Current Liabilities</option>
              <option value="long_term_liabilities">Long-term Liabilities</option>
              <option value="cash">Cash</option>
              <option value="accounts_receivable">Accounts Receivable</option>
              <option value="accounts_payable">Accounts Payable</option>
              <option value="inventory">Inventory</option>
              <option value="equipment">Equipment</option>
              <option value="other">Other</option>
            </optgroup>
            <optgroup label="By Balance">
              <option value="zero_balance">Zero Balance</option>
              <option value="positive_balance">Positive Balance</option>
              <option value="negative_balance">Negative Balance</option>
            </optgroup>
          </select>

          <input
            type="text"
            placeholder="Search accounts..."
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
            title="Search by account name, number, category, or subcategory"
          />
        </div>
      </div>

      <div style={{ overflowX: "auto", maxWidth: "100%" }}>
        <table style={{ width: "100%", tableLayout: "auto", borderCollapse: "collapse", background: "white" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #000" }}>
              <th 
                onClick={() => handleSort('account_number')}
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
                Account Number{getSortIndicator('account_number')}
              </th>
              <th 
                onClick={() => handleSort('account_name')}
                style={{ 
                  padding: "10px 12px", 
                  textAlign: "left", 
                  fontWeight: "bold", 
                  fontSize: "0.8em",
                  background: "white",
                  color: "#000",
                  minWidth: 150,
                  cursor: "pointer",
                  userSelect: "none"
                }}
              >
                Name{getSortIndicator('account_name')}
              </th>
              <th 
                onClick={() => handleSort('account_category')}
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
                Type{getSortIndicator('account_category')}
              </th>
              <th 
                onClick={() => handleSort('account_subcategory')}
                style={{ 
                  padding: "10px 12px", 
                  textAlign: "left", 
                  fontWeight: "bold", 
                  fontSize: "0.8em",
                  background: "white",
                  color: "#000",
                  width: "120px",
                  cursor: "pointer",
                  userSelect: "none"
                }}
              >
                Subtype{getSortIndicator('account_subcategory')}
              </th>
              <th 
                onClick={() => handleSort('terms')}
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
                Term{getSortIndicator('terms')}
              </th>
              <th 
                onClick={() => handleSort('balance')}
                style={{ 
                  padding: "10px 12px", 
                  textAlign: "right", 
                  fontWeight: "bold", 
                  fontSize: "0.8em",
                  background: "white",
                  color: "#000",
                  width: "100px",
                  cursor: "pointer",
                  userSelect: "none"
                }}
              >
                Balance{getSortIndicator('balance')}
              </th>
              <th style={{ 
                padding: "10px 12px", 
                textAlign: "left", 
                fontWeight: "bold", 
                fontSize: "0.8em",
                background: "white",
                color: "#000",
                minWidth: 150
              }}>Comments</th>
              {isAdmin && (
                <th style={{ 
                  padding: "10px 12px", 
                  textAlign: "center", 
                  fontWeight: "bold", 
                  fontSize: "0.8em",
                  background: "white",
                  color: "#000",
                  width: "40px"
                }}>Edit</th>
              )}
            </tr>
          </thead>
          <tbody>
            {filteredAccounts.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 8 : 7} style={{ textAlign: "center", padding: 20, borderBottom: "1px solid #ddd" }}>
                  No accounts found.
                </td>
              </tr>
            ) : (
              filteredAccounts.map((account) => (
                <tr key={account.id}>
                  <td style={{ 
                    padding: "10px 12px", 
                    borderBottom: "1px solid #ddd",
                    fontWeight: "normal",
                    fontSize: "0.85em"
                  }}>
                    <div 
                      onClick={() => {
                        const basePath = `/${userRole.toLowerCase()}`;
                        navigate(`${basePath}/ledger/${account.account_number}`);
                      }}
                      style={{
                        color: "#1C5C59",
                        cursor: "pointer",
                        transition: "all 0.2s",
                        fontWeight: "normal"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.textDecoration = "underline";
                        e.currentTarget.style.fontWeight = "600";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.textDecoration = "none";
                        e.currentTarget.style.fontWeight = "normal";
                      }}
                      title="Click to view account ledger"
                    >
                      {account.account_number}
                    </div>
                    {userRole === "ADMIN" && (
                      <div style={{ marginTop: 4 }}>
                        <span style={{
                          display: "inline-block",
                          padding: "2px 8px",
                          borderRadius: "12px",
                          fontSize: "0.7em",
                          fontWeight: "500",
                          backgroundColor: account.is_active ? "#4f772d" : "#c1121f",
                          color: "white"
                        }}>
                          {account.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>
                    )}
                  </td>
                  <td style={{
                    padding: "10px 12px",
                    borderBottom: "1px solid #ddd",
                    fontWeight: "normal",
                    fontSize: "0.85em"
                  }}>
                    <span
                      onClick={() => navigate(`/${userRole.toLowerCase()}/ledger/${account.account_number}`)}
                      style={{
                        cursor: 'pointer',
                        textDecoration: 'none',
                        color: '#333',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.fontWeight = 'bold';
                        e.target.style.textDecoration = 'underline';
                        e.target.style.color = '#1C5C59';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.fontWeight = 'normal';
                        e.target.style.textDecoration = 'none';
                        e.target.style.color = '#333';
                      }}
                      title="Click to view account ledger"
                    >
                      {account.account_name}
                    </span>
                  </td>
                  <td style={{ 
                    padding: "10px 12px", 
                    borderBottom: "1px solid #ddd",
                    fontWeight: "normal",
                    fontSize: "0.85em"
                  }}>{account.account_category}</td>
                  <td style={{ 
                    padding: "10px 12px", 
                    borderBottom: "1px solid #ddd",
                    fontWeight: "normal",
                    fontSize: "0.85em"
                  }}>{account.account_subcategory}</td>
                  <td style={{ 
                    padding: "10px 12px", 
                    borderBottom: "1px solid #ddd",
                    fontWeight: "normal",
                    fontSize: "0.85em"
                  }}>{getTermType(account)}</td>
                  <td style={{ 
                    padding: "10px 12px", 
                    borderBottom: "1px solid #ddd",
                    fontWeight: "normal",
                    fontSize: "0.85em",
                    textAlign: "right",
                    color: "#000"
                  }}>{formatCurrency(account.balance)}</td>
                  <td style={{ 
                    padding: "10px 12px", 
                    borderBottom: "1px solid #ddd",
                    fontWeight: "normal",
                    fontSize: "0.85em",
                    wordWrap: "break-word",
                    whiteSpace: "normal",
                    maxWidth: 200
                  }}>{account.comment || '-'}</td>
                  {isAdmin && (
                    <td style={{ 
                      padding: "10px 4px", 
                      borderBottom: "1px solid #ddd",
                      textAlign: "center"
                    }}>
                      <button
                        onClick={() => handleEdit(account)}
                        className="auth-button secondary"
                        style={{ 
                          fontSize: 11,
                          padding: '4px 8px',
                          backgroundColor: '#4f772d',
                          color: 'white',
                          border: 'none'
                        }}
                      >
                        Edit
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <AccountFormModal
          account={editingAccount}
          onClose={() => setShowModal(false)}
          onSaved={fetchAccounts}
          onOpenDeactivate={(account) => {
            setShowModal(false);
            setDeactivatingAccount(account);
            setShowDeactivateModal(true);
          }}
        />
      )}

      {showDeactivateModal && deactivatingAccount && (
        <DeactivateAccountModal
          account={deactivatingAccount}
          onClose={() => {
            setShowDeactivateModal(false);
            setDeactivatingAccount(null);
          }}
          onDeactivated={() => {
            setShowDeactivateModal(false);
            setDeactivatingAccount(null);
            fetchAccounts();
          }}
        />
      )}

      {showHelpModal && (
        <HelpModal onClose={() => setShowHelpModal(false)} page="chartOfAccounts" userRole={userRole} />
      )}

      {showEmailModal && (
        <EmailModal 
          onClose={handleCloseEmailModal}
          recipientType="manager"
          managersAndAdmins={managersAndAdmins}
          senderRole={userRole}
        />
      )}
    </div>
  );
}


