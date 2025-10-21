import { useState } from 'react';
import '../styles/auth.css';

export default function SelectAccountModal({ 
  isOpen, 
  onClose, 
  accounts, 
  onAccountSelected 
}) {
  const [selectedCategory, setSelectedCategory] = useState('all');

  const filteredAccounts = (accounts || []).filter(account => {
    const matchesCategory = selectedCategory === 'all' || account.account_category === selectedCategory;
    const isActive = account.is_active && !account.is_closed;
    const hasZeroBalance = parseFloat(account.balance) === 0;
    
    return matchesCategory && isActive && hasZeroBalance;
  });

  const handleAccountSelect = (account) => {
    onAccountSelected(account);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', width: '90%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, color: '#000000' }}>
            Select Account to Close
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

        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', flexWrap: 'wrap' }}>
            <select
              value=""
              onChange={(e) => {
                const accountId = e.target.value;
                if (accountId) {
                  const account = filteredAccounts.find(acc => acc.id.toString() === accountId);
                  if (account) {
                    onAccountSelected(account);
                  }
                }
              }}
              style={{
                flex: 1,
                minWidth: '300px',
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            >
              <option value="">
                {filteredAccounts.length === 0 
                  ? 'No accounts available to close (zero balance required)' 
                  : 'Select an account to close...'
                }
              </option>
              {filteredAccounts.map(account => (
                <option key={account.id} value={account.id}>
                  {account.account_number} - {account.account_name} ({account.account_category}) - Balance: $0.00
                </option>
              ))}
            </select>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                minWidth: '150px'
              }}
            >
              <option value="all">All Categories</option>
              <option value="ASSET">Assets</option>
              <option value="LIABILITY">Liabilities</option>
              <option value="EQUITY">Equity</option>
              <option value="REVENUE">Revenue</option>
              <option value="EXPENSE">Expenses</option>
            </select>
          </div>
          
          <div style={{
            padding: '12px',
            backgroundColor: '#fff3cd',
            border: '1px solid #ffeaa7',
            borderRadius: '6px',
            fontSize: '13px',
            color: '#856404'
          }}>
            <strong>⚠️ Note:</strong> Only accounts with exactly $0.00 balance can be closed. Closed accounts cannot be used in new journal entries.
          </div>
        </div>

        {filteredAccounts.length === 0 && (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px', 
            color: '#666',
            fontSize: '14px',
            backgroundColor: '#f8f9fa',
            borderRadius: '6px',
            border: '1px solid #dee2e6'
          }}>
            {selectedCategory !== 'all' 
              ? 'No accounts found in this category that can be closed' 
              : 'No accounts available to close (all accounts have non-zero balances or are already closed)'
            }
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
          <button
            onClick={onClose}
            className="auth-button secondary"
            style={{ padding: '8px 16px' }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
