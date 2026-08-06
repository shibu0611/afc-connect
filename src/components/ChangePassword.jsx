import React, { useState } from 'react';
import { auth } from '../firebase';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';

export default function ChangePassword() {
  const [selectedUser, setSelectedUser] = useState('guest@afcconnect.com');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const currentUser = auth.currentUser;
  const userEmail = currentUser?.email?.toLowerCase() || '';
  const isAdmin = userEmail.includes('shivkumarjena') || userEmail.includes('shibu');

  const usersList = [
    'guest@afcconnect.com',
    'robby_7c@yahoo.com',
    'xsumonto987@gmail.com',
    'aruni.nayak21@gmail.com',
    'surendermessy@gmail.com'
  ];

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match!");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    try {
      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, newPassword);
      setMessage(`Password for ${selectedUser} updated successfully!`);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError("Failed to update password. Please check your admin current password.");
      console.error(err);
    }
  };

  return (
    <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
      <h3 style={{ margin: '0 0 10px 0', color: '#7e22ce' }}>🔒 Change Account Password</h3>
      <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '14px' }}>
        Select a user account and update their login password securely.
      </p>

      {message && <div style={{ marginBottom: '10px', padding: '8px', backgroundColor: '#f0fdf4', color: '#166534', borderRadius: '6px', fontSize: '12px' }}>{message}</div>}
      {error && <div style={{ marginBottom: '10px', padding: '8px', backgroundColor: '#fef2f2', color: '#dc2626', borderRadius: '6px', fontSize: '12px' }}>{error}</div>}

      <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {isAdmin && (
          <div>
            <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>Select User Account</label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              style={{ width: '100%', backgroundColor: '#f8fafc', color: '#1e293b', border: '1px solid #cbd5e1', padding: '10px', borderRadius: '8px', fontSize: '12px' }}
            >
              {usersList.map((email) => (
                <option key={email} value={email}>
                  {email}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>Admin Current Password *</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showCurrentPassword ? "text" : "password"}
              placeholder="Current Password *"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              style={{ width: '100%', backgroundColor: '#f8fafc', color: '#1e293b', border: '1px solid #cbd5e1', padding: '10px', borderRadius: '8px', fontSize: '12px' }}
            />
            <button
              type="button"
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              style={{ position: 'absolute', right: '10px', top: '10px', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}
            >
              {showCurrentPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        <div>
          <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>New Password (min 6 chars) *</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showNewPassword ? "text" : "password"}
              placeholder="New Password (min 6 chars) *"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              style={{ width: '100%', backgroundColor: '#f8fafc', color: '#1e293b', border: '1px solid #cbd5e1', padding: '10px', borderRadius: '8px', fontSize: '12px' }}
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              style={{ position: 'absolute', right: '10px', top: '10px', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}
            >
              {showNewPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        <div>
          <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>Confirm New Password *</label>
          <input
            type="password"
            placeholder="Confirm New Password *"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            style={{ width: '100%', backgroundColor: '#f8fafc', color: '#1e293b', border: '1px solid #cbd5e1', padding: '10px', borderRadius: '8px', fontSize: '12px' }}
          />
        </div>

        <button
          type="submit"
          style={{ backgroundColor: '#7e22ce', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px', marginTop: '4px' }}
        >
          🔐 Update Password
        </button>
      </form>
    </div>
  );
}