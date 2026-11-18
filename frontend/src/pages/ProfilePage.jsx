import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { userApi } from '../api/userApi';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Alert from '../components/common/Alert';

export default function ProfilePage() {
  const { isAuthenticated, openAuthModal, updateUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [profileMessage, setProfileMessage] = useState({ type: '', text: '' });
  const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' });

  // Profile fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('UNSPECIFIED');
  const [address, setAddress] = useState('');
  const [role, setRole] = useState('');

  // Password fields
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    let active = true;
    async function loadProfile() {
      try {
        const data = await userApi.getProfile();
        if (active && data) {
          setFullName(data.fullName || '');
          setEmail(data.email || '');
          setPhoneNumber(data.phoneNumber || '');
          setAge(data.age || '');
          setGender(data.gender || 'UNSPECIFIED');
          setAddress(data.address || '');
          setRole(data.role || 'ROLE_USER');
        }
      } catch (err) {
        console.error('Failed to load user profile:', err);
      } finally {
        if (active) setLoading(false);
      }
    }
    loadProfile();

    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileMessage({ type: '', text: '' });
    setSavingProfile(true);

    try {
      const updated = await userApi.updateProfile({
        fullName,
        phoneNumber,
        age: age ? parseInt(age, 10) : null,
        gender,
        address
      });
      updateUser({ fullName: updated.fullName });
      setProfileMessage({ type: 'success', text: 'Profile details saved successfully.' });
    } catch (err) {
      setProfileMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to update profile.'
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordMessage({ type: '', text: '' });

    if (newPassword.length < 8) {
      setPasswordMessage({ type: 'error', text: 'Password must be at least 8 characters.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    setSavingPassword(true);
    try {
      await userApi.changePassword(newPassword);
      setPasswordMessage({ type: 'success', text: 'Your password was successfully updated.' });
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to update password.'
      });
    } finally {
      setSavingPassword(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 bg-white border border-neutral-900 text-center">
        <h2 className="text-base font-black uppercase tracking-wider text-black">Sign In Required</h2>
        <p className="text-xs text-neutral-500 mt-2 mb-6">
          Access your account settings and saved shipping address.
        </p>
        <button
          onClick={() => openAuthModal('email')}
          className="w-full py-3 bg-black hover:bg-neutral-800 text-white font-bold text-xs uppercase tracking-wider transition"
        >
          Sign In Now
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="py-24 flex items-center justify-center">
        <LoadingSpinner size="lg" color="black" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8 pb-4 border-b border-neutral-200">
        <h1 className="text-xl font-black uppercase tracking-wider text-black">Account Settings</h1>
        <p className="text-xs text-neutral-400 font-mono mt-1">
          PERSONAL DETAILS & PREFERRED DELIVERY DESTINATION
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column: Account Summary */}
        <div className="md:col-span-1">
          <div className="bg-white p-6 border border-neutral-200 text-left space-y-4">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-widest text-neutral-400">Account</p>
              <h3 className="font-bold text-base text-black mt-0.5">{fullName || 'Apex User'}</h3>
              <p className="text-xs text-neutral-500 font-mono mt-0.5">{email}</p>
              <span className="inline-block mt-2 px-2 py-0.5 text-[10px] font-mono uppercase bg-neutral-100 text-neutral-800">
                {role}
              </span>
            </div>

            <div className="pt-4 border-t border-neutral-100 space-y-2 text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase text-neutral-400 block">Phone</span>
                <span className="font-mono text-neutral-800">{phoneNumber || 'Not provided'}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-neutral-400 block">Default Address</span>
                <span className="text-neutral-700 leading-relaxed block">{address || 'No address saved.'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Edit Forms */}
        <div className="md:col-span-2 space-y-8">
          {/* Form 1: Profile & Delivery Address */}
          <div className="bg-white p-6 border border-neutral-200">
            <h2 className="text-xs font-black uppercase tracking-wider text-black mb-1">
              Personal & Shipping Information
            </h2>
            <p className="text-xs text-neutral-400 mb-6 font-mono">
              Auto-fills your shipping address during 1-click checkout.
            </p>

            {profileMessage.text && (
              <Alert
                type={profileMessage.type}
                message={profileMessage.text}
                className="mb-6"
                onClose={() => setProfileMessage({ type: '', text: '' })}
              />
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs border border-neutral-300 focus:border-black focus:outline-none transition font-sans"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wider mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-3.5 py-2 text-xs border border-neutral-300 focus:border-black focus:outline-none transition font-sans"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wider mb-1">
                    Age
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="28"
                    className="w-full px-3.5 py-2 text-xs border border-neutral-300 focus:border-black focus:outline-none transition font-sans"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wider mb-1">
                  Gender
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs border border-neutral-300 focus:border-black focus:outline-none transition font-sans bg-white"
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                  <option value="UNSPECIFIED">Prefer not to say</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wider mb-1">
                  Default Shipping Address
                </label>
                <textarea
                  rows={3}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street address, City, State, PIN Code"
                  className="w-full px-3.5 py-2 text-xs border border-neutral-300 focus:border-black focus:outline-none transition font-sans"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-6 py-2.5 bg-black hover:bg-neutral-800 disabled:bg-neutral-300 text-white font-bold text-xs uppercase tracking-wider transition"
                >
                  {savingProfile ? <LoadingSpinner size="sm" color="white" /> : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>

          {/* Form 2: Change Password */}
          <div className="bg-white p-6 border border-neutral-200">
            <h2 className="text-xs font-black uppercase tracking-wider text-black mb-1">
              Account Security
            </h2>
            <p className="text-xs text-neutral-400 mb-6 font-mono">
              Optional. Configure a password for traditional sign in.
            </p>

            {passwordMessage.text && (
              <Alert
                type={passwordMessage.type}
                message={passwordMessage.text}
                className="mb-6"
                onClose={() => setPasswordMessage({ type: '', text: '' })}
              />
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wider mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    className="w-full px-3.5 py-2 text-xs border border-neutral-300 focus:border-black focus:outline-none transition font-sans"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wider mb-1">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className="w-full px-3.5 py-2 text-xs border border-neutral-300 focus:border-black focus:outline-none transition font-sans"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="px-6 py-2.5 bg-black hover:bg-neutral-800 disabled:bg-neutral-300 text-white font-bold text-xs uppercase tracking-wider transition"
                >
                  {savingPassword ? <LoadingSpinner size="sm" color="white" /> : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
