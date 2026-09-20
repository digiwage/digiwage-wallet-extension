import React, { useState } from 'react';

function colorFor(seed) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const hue = hash % 360;
  return `hsl(${hue}, 55%, 45%)`;
}

export default function Avatar({ uri, name, address, size = 40 }) {
  const [failed, setFailed] = useState(false);
  const seed = address || name || '?';
  const initial = (name || address || '?').replace(/^0x/, '').charAt(0).toUpperCase();

  if (uri && !failed) {
    return (
      <img
        src={uri}
        alt={name || 'avatar'}
        className="avatar"
        style={{ width: size, height: size }}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div
      className="avatar avatar-fallback"
      style={{ width: size, height: size, background: colorFor(seed), fontSize: size * 0.42 }}
    >
      {initial}
    </div>
  );
}
