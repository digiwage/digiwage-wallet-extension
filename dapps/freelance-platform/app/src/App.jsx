import React, { useState } from 'react';
import { useWallet } from './useWallet.js';
import PersonTag from './PersonTag.jsx';
import ProfileTab from './ProfileTab.jsx';
import JobsTab from './JobsTab.jsx';
import MarketplaceTab from './MarketplaceTab.jsx';
import OrdersTab from './OrdersTab.jsx';

const TABS = [
  { id: 'jobs', label: 'Jobs' },
  { id: 'marketplace', label: 'Marketplace' },
  { id: 'orders', label: 'Orders' },
  { id: 'profile', label: 'Profile' }
];

export default function App() {
  const { address, addressHex, error: walletError, checking, refresh } = useWallet();
  const [tab, setTab] = useState('jobs');

  return (
    <div className="app">
      <header>
        <div className="brand-row">
          <h1>DigiWage Freelance Hub</h1>
          {address && <PersonTag addressHex={addressHex} size={28} />}
        </div>
        <p className="muted">Job board + service marketplace, example dApp for the DigiWage Light Wallet extension. Runs on the forktest chain.</p>
        {checking && <p>Checking for wallet...</p>}
        {!checking && walletError && (
          <div className="error">{walletError} <button onClick={refresh}>Retry</button></div>
        )}
      </header>

      {address && (
        <>
          <nav className="tabs">
            {TABS.map(t => (
              <button key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
                {t.label}
              </button>
            ))}
          </nav>
          <main>
            {tab === 'jobs' && <JobsTab myAddressHex={addressHex} />}
            {tab === 'marketplace' && <MarketplaceTab myAddressHex={addressHex} />}
            {tab === 'orders' && <OrdersTab myAddressHex={addressHex} />}
            {tab === 'profile' && <ProfileTab myAddressHex={addressHex} />}
          </main>
        </>
      )}
    </div>
  );
}
