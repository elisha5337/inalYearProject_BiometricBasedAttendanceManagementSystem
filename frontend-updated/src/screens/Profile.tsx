import { useEffect, useRef, useState } from 'react';
import { User as UserIcon, Mail, Phone, Building2, MapPin, Camera, Save, Shield, Bell, Globe } from 'lucide-react';
import { cn } from '../lib/utils';
import { User } from '../types';
import { ApiError } from '../lib/api';
import { changePassword, fetchProfile, updateProfile, type ProfileRecord } from '../lib/admin';

interface ProfileProps {
  user: User;
}

export default function Profile({ user }: ProfileProps) {
  const [activeTab, setActiveTab] = useState('general');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [formState, setFormState] = useState({
    fullName: user.name || `${user.firstName} ${user.lastName || ''}`.trim(),
    email: user.email,
    phone: '',
    position: '',
    department: '',
    bio: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const initials =
    (profile?.firstName || user.firstName || '').charAt(0) +
    ((profile?.lastName || user.lastName || '').charAt(0) || '');

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      try {
        setLoading(true);
        setError(null);

        const data = await fetchProfile();
        if (!cancelled) {
          setProfile(data);
          setFormState({
            fullName: data.fullName,
            email: data.email,
            phone: data.phone,
            position: data.position,
            department: data.department || 'No Department',
            bio: data.bio,
          });
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof ApiError ? loadError.message : 'Unable to load profile right now.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, []);

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  async function handleSave() {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const parts = formState.fullName.trim().split(/\s+/);
      const firstName = parts[0] || '';
      const lastName = parts.slice(1).join(' ');

      const updated = await updateProfile({
        firstName,
        lastName,
        email: formState.email.trim(),
        position: formState.position.trim(),
      });

      setProfile(updated);
      setFormState((current) => ({
        ...current,
        fullName: updated.fullName,
        email: updated.email,
        position: updated.position,
        department: updated.department || 'No Department',
      }));
      setSuccess('Profile updated successfully.');
    } catch (saveError) {
      setError(saveError instanceof ApiError ? saveError.message : 'Unable to save profile changes.');
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword() {
    const newPassword = window.prompt('Enter a new password with at least 8 characters:');
    if (!newPassword) {
      return;
    }

    try {
      await changePassword(newPassword);
      setSuccess('Password changed successfully.');
      setError(null);
    } catch (passwordError) {
      setError(passwordError instanceof ApiError ? passwordError.message : 'Unable to change password.');
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-end gap-6 pb-6 border-b border-slate-200">
        <div className="relative group shrink-0">
          <div className="w-32 h-32 rounded-3xl bg-blue-100 flex items-center justify-center text-blue-600 text-4xl font-bold overflow-hidden border-4 border-white shadow-xl">
            {profilePhoto ? (
              <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              initials || 'U'
            )}
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-2 right-2 p-2 bg-blue-600 text-white rounded-xl shadow-lg hover:bg-blue-700 transition-all scale-90 group-hover:scale-100"
          >
            <Camera className="w-4 h-4" />
          </button>
          <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} className="hidden" accept="image/*" />
        </div>

        <div className="flex-1 space-y-2">
          <h1 className="text-3xl font-bold text-slate-900">{profile?.fullName || user.name}</h1>
          <div className="flex flex-wrap gap-4 text-sm text-slate-500 font-medium">
            <span className="flex items-center gap-1.5 capitalize">
              <Shield className="w-4 h-4" /> {profile?.role || user.role}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4" /> Hawassa University, Main Campus
            </span>
          </div>
        </div>

        <button onClick={handleSave} disabled={saving || loading} className="primary-button gap-2 px-8">
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-2xl border border-green-100 bg-green-50 px-5 py-4 text-sm font-medium text-green-700">
          {success}
        </div>
      ) : null}

      <div className="flex gap-8">
        <aside className="w-64 hidden lg:block space-y-1">
          {[
            { id: 'general', label: 'General Info', icon: UserIcon },
            { id: 'security', label: 'Security', icon: Shield },
            { id: 'notifications', label: 'Notifications', icon: Bell },
            { id: 'language', label: 'Language & Region', icon: Globe },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all',
                activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-600 hover:bg-slate-100',
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </aside>

        <main className="flex-1 space-y-8">
          <div className="professional-card p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Full Name</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={formState.fullName}
                    onChange={(event) => setFormState((current) => ({ ...current, fullName: event.target.value }))}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={formState.email}
                    onChange={(event) => setFormState((current) => ({ ...current, email: event.target.value }))}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="tel"
                    value={formState.phone}
                    onChange={(event) => setFormState((current) => ({ ...current, phone: event.target.value }))}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Department</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={formState.department}
                    disabled
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-500 cursor-not-allowed"
                  />
                </div>
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-bold text-slate-700">Position</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={formState.position}
                    onChange={(event) => setFormState((current) => ({ ...current, position: event.target.value }))}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Bio</label>
              <textarea
                rows={4}
                value={formState.bio}
                onChange={(event) => setFormState((current) => ({ ...current, bio: event.target.value }))}
                placeholder="Tell us about yourself..."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              ></textarea>
            </div>
          </div>

          <div className="professional-card p-8 border-l-4 border-l-amber-500 bg-amber-50/30">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Account Security</h3>
            <p className="text-sm text-slate-600 mb-6">
              Manage your password and security settings to keep your account safe.
            </p>
            <button onClick={handleChangePassword} className="secondary-button text-blue-600 border-blue-200 hover:bg-blue-50">
              Change Password
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
