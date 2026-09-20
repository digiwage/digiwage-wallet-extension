import { useEffect, useState } from 'react';
import { readContract } from './sdk.js';

const cache = new Map();

export function useProfile(addressHex) {
  const [profile, setProfile] = useState(() => cache.get(addressHex) || null);

  useEffect(() => {
    let cancelled = false;
    if (!addressHex) {
      return undefined;
    }
    if (cache.has(addressHex)) {
      setProfile(cache.get(addressHex));
      return undefined;
    }
    readContract('getProfile', [addressHex]).then(result => {
      if (cancelled) return;
      cache.set(addressHex, result);
      setProfile(result);
    }).catch(() => {
      if (!cancelled) setProfile(null);
    });
    return () => { cancelled = true; };
  }, [addressHex]);

  return profile;
}

export function invalidateProfile(addressHex) {
  cache.delete(addressHex);
}
