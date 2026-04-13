import { useState } from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  Building2, 
  Shield,
  Fingerprint,
  Key, 
  Camera,
  CheckCircle2,
  AlertCircle,
  Clock
} from 'lucide-react';
import { User as UserType } from '../../types';

export default function Profile({ user }: { user: UserType }) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>
        <button 
          onClick={() => setIsEditing(!isEditing)}
          className="primary-button"
        >
          {isEditing ? 'Save Changes' : 'Edit Profile'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Basic Info */}
        <div className="lg:col-span-1 space-y-8">
          <div className="professional-card p-8 flex flex-col items-center text-center">
            <div className="relative group">
              <div className="w-32 h-32 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-4xl font-bold border-4 border-white shadow-xl">
                {user.name.charAt(0)}
              </div>
              <button className="absolute bottom-0 right-0 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center border-4 border-white shadow-lg hover:bg-blue-700 transition-colors">
                <Camera className="w-5 h-5" />
              </button>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mt-6">{user.name}</h2>
            <p className="text-slate-500 text-sm font-medium uppercase tracking-wider mt-1">{user.role}</p>
            
            <div className="w-full h-px bg-slate-100 my-6"></div>
            
            <div className="w-full space-y-4">
              <div className="flex items-center gap-3 text-slate-600">
                <Mail className="w-4 h-4 text-slate-400" />
                <span className="text-sm">{user.email}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-600">
                <Phone className="w-4 h-4 text-slate-400" />
                <span className="text-sm">+251 911 234 567</span>
              </div>
              <div className="flex items-center gap-3 text-slate-600">
                <Building2 className="w-4 h-4 text-slate-400" />
                <span className="text-sm">N/A</span>
              </div>
            </div>
          </div>

          <div className="professional-card p-6">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Fingerprint className="w-5 h-5 text-blue-600" />
              Biometric Status
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-100">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-900">Fingerprint Enrolled</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-100">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-900">Face ID Enrolled</span>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 text-center">
                Last updated: Jan 15, 2026. Contact Admin to re-enroll.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column - Detailed Info & Settings */}
        <div className="lg:col-span-2 space-y-8">
          <div className="professional-card p-8">
            <h3 className="text-lg font-bold text-slate-900 mb-6">Account Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Full Name</label>
                <input
                  type="text"
                  disabled={!isEditing}
                  defaultValue={user.name}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Employee ID</label>
                <input
                  type="text"
                  disabled
                  defaultValue="HU-IOT-2024-0486"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none opacity-60"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Work Email</label>
                <input
                  type="email"
                  disabled
                  defaultValue={user.email}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none opacity-60"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Phone Number</label>
                <input
                  type="tel"
                  disabled={!isEditing}
                  defaultValue="+251 911 234 567"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                />
              </div>
            </div>
          </div>

          <div className="professional-card p-8">
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Key className="w-5 h-5 text-blue-600" />
              Security Settings
            </h3>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-900">Change Password</p>
                  <p className="text-xs text-slate-500">Update your account password regularly for better security</p>
                </div>
                <button className="secondary-button">Update</button>
              </div>
              <div className="h-px bg-slate-100"></div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-900">Two-Factor Authentication</p>
                  <p className="text-xs text-slate-500">Add an extra layer of security to your account</p>
                </div>
                <div className="w-12 h-6 bg-blue-600 rounded-full relative cursor-pointer">
                  <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                </div>
              </div>
            </div>
          </div>

          <div className="professional-card p-6 bg-slate-900 text-white">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center shrink-0">
                <Clock className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h4 className="font-bold">Last Biometric Activity</h4>
                <p className="text-sm text-slate-400 mt-1">
                  Last check-in: <span className="text-white font-medium">Today at 08:42 AM</span> via <span className="text-blue-400 font-medium">Fingerprint</span>
                </p>
                <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Please use biometric terminals to mark attendance.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
