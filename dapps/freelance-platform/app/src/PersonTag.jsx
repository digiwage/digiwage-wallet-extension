import React from 'react';
import Avatar from './Avatar.jsx';
import { useProfile } from './useProfile.js';

function abbreviate(hex) {
  return hex.slice(0, 6) + '...' + hex.slice(-4);
}

export default function PersonTag({ addressHex, size = 24 }) {
  const profile = useProfile(addressHex);
  const name = profile && profile.exists && profile.displayName ? profile.displayName : abbreviate(addressHex);
  const avatarUri = profile && profile.exists ? profile.avatarUri : null;

  return (
    <span className="person-tag">
      <Avatar uri={avatarUri} name={name} address={addressHex} size={size} />
      <span>{name}</span>
    </span>
  );
}
