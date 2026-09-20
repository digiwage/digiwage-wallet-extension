import { useCallback, useEffect, useState } from 'react';
import { addressToHex } from './contract.js';

export function useWallet() {
  const [address, setAddress] = useState(null);
  const [addressHex, setAddressHex] = useState(null);
  const [error, setError] = useState(null);
  const [checking, setChecking] = useState(true);

  const refresh = useCallback(async () => {
    setChecking(true);
    if (!window.digiwageLight) {
      setError('DigiWage Light Wallet extension not detected. Install it and reload this page.');
      setChecking(false);
      return;
    }
    try {
      const addr = await window.digiwageLight.getCurrentAddress();
      setAddress(addr || null);
      setAddressHex(addr ? addressToHex(addr) : null);
      setError(addr ? null : 'Wallet is locked or has no account yet. Unlock it in the extension and reload.');
    } catch (err) {
      setError(err.message);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { address, addressHex, error, checking, refresh };
}
