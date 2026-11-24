import React, { useState, useEffect } from 'react';
import { X, ArrowLeft, UserCircle, CheckCircle2, Save, Mail, Phone, MapPin, Shield, Star, Award, Clock, Camera, Info } from 'lucide-react';
import { soundEngine } from '../utils/audio';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBackToMenu: () => void;
  userEmail: string | null;
  displayName: string;
  userRating?: number;
  completedCount?: number;
  accountStatus?: 'active' | 'pending_review' | 'rejected' | 'Frozen';
  subscriptionPlan?: 'Tenant Sub' | 'User Sub' | null;
  userSelfieUrl?: string | null;
  onUpdateSelfie?: (url: string) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  onBackToMenu,
  userEmail,
  displayName,
  userRating = 5.0,
  completedCount = 0,
  accountStatus = 'active',
  subscriptionPlan = null,
  userSelfieUrl = null,
  onUpdateSelfie,
}) => {
  const [firstName, setFirstName] = useState(displayName.split(' ')[0] || '');
  const [lastName, setLastName] = useState(displayName.split(' ')[1] || '');
  const [contactInfo, setContactInfo] = useState('');
  const [locationName, setLocationName] = useState('');
  const [savedMsg, setSavedMsg] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [selfieLogo, setSelfieLogo] = useState<string | null>(userSelfieUrl || null);

  useEffect(() => {
    if (userSelfieUrl) {
      setSelfieLogo(userSelfieUrl);
    }
  }, [userSelfieUrl]);

  const handleSelfieUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        const url = event.target.result as string;
        setSelfieLogo(url);
        onUpdateSelfie?.(url);
        soundEngine.playSuccessChime();
      }
    };
    reader.readAsDataURL(file);
  };

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    soundEngine.playSuccessChime();
    setSavedMsg(true);
    setTimeout(() => {
      setSavedMsg(false);
      onClose();
    }, 1500);
  };

  return (
    <div
      className="fixed inset-0 z-[230] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 text-slate-950 space-y-5 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onBackToMenu}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center cursor-pointer"
              title="Back to App Menu"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h3 className="text-base font-black tracking-tight text-slate-950">User Profile</h3>
              <p className="text-xs text-slate-500">Manage your account identity & details</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                soundEngine.playFeatureClick();
                setShowInfo((prev) => !prev);
              }}
              aria-label="Profile feature information"
              title="About Profile"
              className={`w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-colors ${
                showInfo ? 'bg-blue-600 text-white' : 'bg-blue-50 hover:bg-blue-100 text-blue-600'
              }`}
            >
              <Info className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {showInfo && (
          <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-950 space-y-1 animate-in fade-in duration-150">
            <div className="font-black flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-blue-600" />
              <span>About User Profile</span>
            </div>
            <p className="leading-relaxed text-blue-900 font-medium">
              View your active subscription tier, account approval status, earned star ratings from completed gigs/items, and upload or update your face selfie logo shown on your posts.
            </p>
          </div>
        )}

        {savedMsg ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-3 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center border border-emerald-200">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-lg font-bold text-slate-950">Profile Updated Successfully!</h4>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <div className="flex items-center gap-4 pb-2">
              {/* User Face Selfie Logo */}
              <div className="relative group shrink-0">
                {selfieLogo ? (
                  <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-blue-600 shadow-lg bg-slate-100">
                    <img src={selfieLogo} alt="User Face Selfie Logo" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white font-black text-2xl flex items-center justify-center shadow-lg border border-slate-200">
                    {firstName.charAt(0).toUpperCase()}
                  </div>
                )}
                <label
                  className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center cursor-pointer shadow-md transition-colors"
                  title="Upload / Change Face Selfie Logo"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <input
                    type="file"
                    accept="image/*"
                    capture="user"
                    className="hidden"
                    onChange={handleSelfieUpload}
                  />
                </label>
              </div>
              <div className="space-y-1">
                <div className="text-sm font-black text-slate-900 flex flex-wrap items-center gap-1.5">
                  <span>{firstName} {lastName}</span>
                  {userEmail === 'timegig2026@gmail.com' && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-[10px] text-amber-800 font-bold flex items-center gap-1">
                      <Shield className="w-3 h-3" /> Admin
                    </span>
                  )}
                  {subscriptionPlan && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      subscriptionPlan === 'Tenant Sub'
                        ? 'bg-purple-100 border-purple-300 text-purple-800'
                        : 'bg-blue-100 border-blue-300 text-blue-800'
                    }`}>
                      {subscriptionPlan}
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-500 flex items-center gap-1">
                  <Mail className="w-3 h-3 text-slate-400" />
                  <span>{userEmail || 'timegig2026@gmail.com'}</span>
                </div>
              </div>
            </div>

            {/* Performance Star Rating & Account Verification Badges */}
            <div className="grid grid-cols-2 gap-2.5 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Seeker & Gig Rating</span>
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center text-amber-500">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                  </div>
                  <span className="text-sm font-black text-slate-950">{userRating.toFixed(1)}</span>
                  <span className="text-[10px] text-slate-500 font-semibold">({completedCount} completed)</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Account Status</span>
                <div className="flex items-center gap-1.5">
                  {accountStatus === 'active' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[10px] border border-emerald-300">
                      <CheckCircle2 className="w-3 h-3" /> Active (Approved)
                    </span>
                  ) : accountStatus === 'pending_review' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold text-[10px] border border-amber-300">
                      <Clock className="w-3 h-3" /> Pending Tenant Approval
                    </span>
                  ) : accountStatus === 'Frozen' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 font-bold text-[10px] border border-slate-300">
                      Frozen
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-bold text-[10px] border border-rose-300">
                      Verification Needed
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">First Name</label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Last Name</label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Contact Phone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={contactInfo}
                  onChange={(e) => setContactInfo(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Default Location Name</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-sm rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              <Save className="w-4 h-4" />
              <span>Save Profile Changes</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
