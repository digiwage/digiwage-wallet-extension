import React, { useEffect, useState } from 'react';
import Avatar from './Avatar.jsx';
import { readContract, writeContract } from './sdk.js';
import { invalidateProfile } from './useProfile.js';

export default function ProfileTab({ myAddressHex }) {
  const [profile, setProfile] = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUri, setAvatarUri] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!myAddressHex) return;
    readContract('getProfile', [myAddressHex]).then(result => {
      setProfile(result);
      if (result.exists) {
        setDisplayName(result.displayName);
        setBio(result.bio);
        setAvatarUri(result.avatarUri);
      }
    }).catch(err => setError(err.message));
  }, [myAddressHex]);

  const save = async e => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await writeContract({ method: 'setProfile', args: [displayName, bio, avatarUri] });
      invalidateProfile(myAddressHex);
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card">
      <h2>Your profile</h2>
      <div className="profile-preview">
        <Avatar uri={avatarUri} name={displayName} address={myAddressHex} size={64} />
        <div>
          <div className="profile-preview-name">{displayName || 'No display name yet'}</div>
          <div className="muted">{bio || 'No bio yet'}</div>
        </div>
      </div>
      <form onSubmit={save}>
        <label>
          Display name
          <input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="e.g. Jane Doe" />
        </label>
        <label>
          Bio
          <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="What do you do?" />
        </label>
        <label>
          Avatar image URL
          <input value={avatarUri} onChange={e => setAvatarUri(e.target.value)} placeholder="https://..." />
        </label>
        {error && <div className="error">{error}</div>}
        {saved && <div className="success">Profile update sent -- confirm it in the extension popup.</div>}
        <button type="submit" disabled={busy}>{busy ? 'Saving...' : (profile && profile.exists ? 'Update profile' : 'Create profile')}</button>
      </form>
    </div>
  );
}
