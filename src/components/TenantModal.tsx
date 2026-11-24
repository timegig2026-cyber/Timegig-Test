import React, { useState, useEffect } from 'react';
import { X, ArrowLeft, Copy, Check, Share2, TrendingUp, Users, Camera, Sparkles, Crown, Building2, Info } from 'lucide-react';
import { soundEngine } from '../utils/audio';
import type { ReferralItem } from './ReferralsModal';

interface TenantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBackToMenu: () => void;
  userEmail: string | null;
  currencySymbol: string;
  userSelfieUrl?: string | null;
  onUpdateSelfie?: (url: string) => void;
  isMainTenant?: boolean;
  joinedTenants?: ReferralItem[];
  onUpdateJoinedTenantQuotas?: (id: string, totalTenants: number, userSubSignups: number) => void;
  tenantSubFee?: number;
  userSubFee?: number;
  trialDays?: number;
  totalTenantSubSignups?: number;
  totalUserSubSignups?: number;
  onUpdateMainSignups?: (tenantSubSignups: number, userSubSignups: number) => void;
  referralTenantSubCount?: number;
  referralUserSubCount?: number;
  referralTenantSubLimit?: number;
  referralUserSubLimit?: number;
}

const MAX_REFERRAL_TENANT_SUBS = 10;
const MAX_REFERRAL_USER_SUBS = 100;

export const TenantModal: React.FC<TenantModalProps> = ({
  isOpen,
  onClose,
  onBackToMenu,
  userEmail,
  userSelfieUrl,
  onUpdateSelfie,
  isMainTenant = false,
  joinedTenants = [],
  onUpdateJoinedTenantQuotas,
  tenantSubFee = 299.99,
  userSubFee = 29.99,
  trialDays = 7,
  totalTenantSubSignups = 0,
  totalUserSubSignups = 0,
  onUpdateMainSignups,
  referralTenantSubCount = 0,
  referralUserSubCount = 0,
  referralTenantSubLimit = MAX_REFERRAL_TENANT_SUBS,
  referralUserSubLimit = MAX_REFERRAL_USER_SUBS,
}) => {
  const [copied, setCopied] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [quotaEdits, setQuotaEdits] = useState<Record<string, { totalTenants: string; userSubSignups: string }>>({});
  const [savedId, setSavedId] = useState<string | null>(null);
  const [mainTenantSignupsInput, setMainTenantSignupsInput] = useState<string>(String(totalTenantSubSignups));
  const [mainUserSignupsInput, setMainUserSignupsInput] = useState<string>(String(totalUserSubSignups));
  const [mainSignupsSaved, setMainSignupsSaved] = useState(false);

  useEffect(() => {
    setMainTenantSignupsInput(String(totalTenantSubSignups));
    setMainUserSignupsInput(String(totalUserSubSignups));
  }, [totalTenantSubSignups, totalUserSubSignups, isOpen]);

  if (!isOpen) return null;

  const isStrictMainTenant = isMainTenant && (userEmail || '').trim().toLowerCase() === 'timegig2026@gmail.com';
  const referralLink = `https://timegig.app/ref/tenant_${encodeURIComponent(userEmail || 'timegig2026@gmail.com')}`;

  const handleCopy = () => {
    soundEngine.playFeatureClick();
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShare = async () => {
    soundEngine.playFeatureClick();
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join TimeGig Network',
          text: 'Join my TimeGig Tenant network and build global passive income!',
          url: referralLink,
        });
      } catch {}
    } else {
      handleCopy();
    }
  };

  const handleSelfieUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUpdateSelfie) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        soundEngine.playSuccessChime();
        onUpdateSelfie(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleQuotaChange = (tenant: ReferralItem, field: 'totalTenants' | 'userSubSignups', value: string) => {
    const clean = value.replace(/[^0-9]/g, '');
    const numeric = clean === '' ? '' : String(
      Math.min(
        field === 'totalTenants' ? MAX_REFERRAL_TENANT_SUBS : MAX_REFERRAL_USER_SUBS,
        parseInt(clean, 10) || 0
      )
    );
    setQuotaEdits((prev) => ({
      ...prev,
      [tenant.id]: {
        totalTenants: prev[tenant.id]?.totalTenants ?? String(Math.min(MAX_REFERRAL_TENANT_SUBS, tenant.assignedTotalTenants ?? MAX_REFERRAL_TENANT_SUBS)),
        userSubSignups: prev[tenant.id]?.userSubSignups ?? String(Math.min(MAX_REFERRAL_USER_SUBS, tenant.assignedUserSubSignups ?? MAX_REFERRAL_USER_SUBS)),
        [field]: numeric,
      },
    }));
  };

  const handleSaveQuotas = (tenant: ReferralItem) => {
    if (!isStrictMainTenant || !onUpdateJoinedTenantQuotas) return;
    const current = quotaEdits[tenant.id];
    const rawTotalTenants = parseInt(current?.totalTenants ?? String(tenant.assignedTotalTenants ?? MAX_REFERRAL_TENANT_SUBS), 10) || 0;
    const rawUserSubSignups = parseInt(current?.userSubSignups ?? String(tenant.assignedUserSubSignups ?? MAX_REFERRAL_USER_SUBS), 10) || 0;
    const totalTenants = Math.min(MAX_REFERRAL_TENANT_SUBS, Math.max(0, rawTotalTenants));
    const userSubSignups = Math.min(MAX_REFERRAL_USER_SUBS, Math.max(0, rawUserSubSignups));
    soundEngine.playSuccessChime();
    onUpdateJoinedTenantQuotas(tenant.id, totalTenants, userSubSignups);
    setSavedId(tenant.id);
    setTimeout(() => setSavedId(null), 2200);
  };

  const handleSaveMainSignups = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isStrictMainTenant || !onUpdateMainSignups) return;
    const nextTenantSignups = Math.max(0, parseInt(mainTenantSignupsInput, 10) || 0);
    const nextUserSignups = Math.max(0, parseInt(mainUserSignupsInput, 10) || 0);
    soundEngine.playSuccessChime();
    onUpdateMainSignups(nextTenantSignups, nextUserSignups);
    setMainSignupsSaved(true);
    setTimeout(() => setMainSignupsSaved(false), 2200);
  };

  // All profit balances reset to R0.00
  const tenantSubProfit = 0.0;
  const userSubProfit = 0.0;
  const totalProfitBalance = 0.0;

  const formatFee = (val: number) => val.toFixed(2).replace('.', ',');

  return (
    <div
      className="fixed inset-0 z-[230] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xl animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 text-slate-950 space-y-5 max-h-[92vh] overflow-y-auto animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
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
              <h3 className="text-base font-black tracking-tight text-slate-950">Tenant Dashboard</h3>
              <p className="text-xs text-slate-500">Global Network Earnings & Profit</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                soundEngine.playFeatureClick();
                setShowInfo((prev) => !prev);
              }}
              aria-label="Tenant feature information"
              title="About Tenant feature"
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
              <span>How Tenant Feature Works</span>
            </div>
            <p className="leading-relaxed text-blue-900 font-medium">
              Track your passive monthly income balances, update your tenant face selfie, copy & share your Tenant Referral Link, and (for the Main Tenant timegig2026@gmail.com) assign Total Tenant Subs and User Subs signups for referral Tenants who joined via the main tenant referral link.
            </p>
          </div>
        )}

        {/* Tenant Face Selfie at the Top (replaces Profile icon in Tenant Sub) */}
        <div className="flex flex-col items-center justify-center space-y-2 pt-1">
          <div className="relative">
            {userSelfieUrl ? (
              <img
                src={userSelfieUrl}
                alt="Tenant Face Selfie"
                className="w-24 h-24 rounded-full object-cover border-4 border-amber-400 shadow-lg"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-amber-100 text-amber-800 font-black text-3xl flex items-center justify-center border-4 border-amber-400 shadow-lg">
                {(userEmail || 'T').charAt(0).toUpperCase()}
              </div>
            )}
            {onUpdateSelfie && (
              <label
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-md cursor-pointer border-2 border-white"
                title="Capture or upload tenant face selfie"
              >
                <Camera className="w-4 h-4" />
                <input type="file" accept="image/*" capture="user" onChange={handleSelfieUpload} className="hidden" />
              </label>
            )}
          </div>
          <div className="text-center space-y-0.5">
            <div className="text-sm font-black text-slate-950">{userEmail}</div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black uppercase">
              <Crown className="w-3 h-3 text-amber-700" />
              <span>{isStrictMainTenant ? 'Main Tenant Account' : 'Tenant Sub Account'}</span>
            </div>
          </div>
        </div>

        {/* Passive Monthly Income Reminder Banner */}
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-300 rounded-2xl p-3.5 flex items-start gap-3 shadow-sm">
          <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="space-y-0.5 text-xs">
            <div className="font-black text-emerald-950">Earn Passive Monthly Income</div>
            <p className="text-emerald-900 font-medium leading-relaxed">
              Share your Tenant Referral Link below to earn passive monthly income from every User Sub (R{formatFee(userSubFee)}/mo) and Tenant Sub (R{formatFee(tenantSubFee)}/mo) signup
              {trialDays > 0 ? ` (${trialDays}-day free trial active).` : '.'}
            </p>
          </div>
        </div>

        {/* Total Profit Balance (R0.00) */}
        <div className="py-1">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
            Total Profit Balance
          </div>
          <div className="text-3xl sm:text-4xl font-black text-emerald-600 tracking-tight">
            R{totalProfitBalance.toFixed(2)}
          </div>
        </div>

        {/* Sub Profits Grid (R0.00) */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-blue-600 font-bold">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Tenant Sub Profit</span>
            </div>
            <div className="text-xl font-black text-slate-900">
              R{tenantSubProfit.toFixed(2)}
            </div>
            <div className="text-[10px] font-bold text-slate-600">
              {isStrictMainTenant
                ? `Total Tenant Sub Signups: ${totalTenantSubSignups}`
                : `Tenant Subs: ${referralTenantSubCount} / ${Math.min(MAX_REFERRAL_TENANT_SUBS, referralTenantSubLimit)} max`}
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-purple-600 font-bold">
              <Users className="w-3.5 h-3.5" />
              <span>User Sub Profit</span>
            </div>
            <div className="text-xl font-black text-slate-900">
              R{userSubProfit.toFixed(2)}
            </div>
            <div className="text-[10px] font-bold text-slate-600">
              {isStrictMainTenant
                ? `Total User Sub Signups: ${totalUserSubSignups}`
                : `User Subs: ${referralUserSubCount} / ${Math.min(MAX_REFERRAL_USER_SUBS, referralUserSubLimit)} max`}
            </div>
          </div>
        </div>

        {/* Referral Tenant Signup Cap Banner (Max 10 Tenant Subs & 100 User Subs) */}
        {!isStrictMainTenant && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3.5 space-y-1.5 text-xs">
            <div className="font-black text-blue-950 flex items-center justify-between">
              <span>Referral Tenant Signup Limits</span>
              <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-black">
                10 Tenant / 100 User Max
              </span>
            </div>
            <p className="text-blue-900 font-medium leading-relaxed">
              Referral Tenants who joined through <strong>timegig2026@gmail.com</strong> referral link can only sign up up to <strong>10 Tenant Subs</strong> ({referralTenantSubCount}/{Math.min(MAX_REFERRAL_TENANT_SUBS, referralTenantSubLimit)} used) and <strong>100 User Subs</strong> ({referralUserSubCount}/{Math.min(MAX_REFERRAL_USER_SUBS, referralUserSubLimit)} used).
            </p>
          </div>
        )}

        {/* Tenant Referral Link & Network Building */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
          <div className="text-xs font-bold text-slate-800">
            Tenant Referral Link (Share & Build Passive Income)
          </div>
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2.5 shadow-sm">
            <input
              type="text"
              readOnly
              value={referralLink}
              className="w-full bg-transparent text-xs text-slate-700 font-mono outline-none truncate"
            />
            <button
              type="button"
              onClick={handleCopy}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 shrink-0 cursor-pointer shadow-sm"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-200" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
          <button
            type="button"
            onClick={handleShare}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
          >
            <Share2 className="w-4 h-4" />
            <span>Share Tenant Referral Link</span>
          </button>
        </div>

        {/* MAIN TENANT (timegig2026@gmail.com) ONLY: Set Total Number of Signups for Tenant Sub & User Sub */}
        {isStrictMainTenant && (
          <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 space-y-4">
            <form onSubmit={handleSaveMainSignups} className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-black text-amber-950">
                  <Building2 className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>Main Tenant Signups Setup</span>
                </div>
                {mainSignupsSaved && (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    Saved
                  </span>
                )}
              </div>
              <p className="text-[11px] text-amber-900 font-medium">
                Only <strong>timegig2026@gmail.com</strong> can set total number of signups for <strong>Tenant Sub</strong> and <strong>User Sub</strong>.
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-bold text-amber-950 mb-1">Tenant Sub Total Signups</label>
                  <input
                    type="number"
                    min={0}
                    value={mainTenantSignupsInput}
                    onChange={(e) => setMainTenantSignupsInput(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-xs font-black text-slate-950 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-amber-950 mb-1">User Sub Total Signups</label>
                  <input
                    type="number"
                    min={0}
                    value={mainUserSignupsInput}
                    onChange={(e) => setMainUserSignupsInput(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-xs font-black text-slate-950 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-sm cursor-pointer transition-all active:scale-95"
              >
                Save Tenant Sub & User Sub Signups
              </button>
            </form>

            {joinedTenants.length > 0 && (
              <div className="space-y-3 pt-3 border-t border-amber-200">
                <p className="text-[11px] text-amber-900 font-medium">
                  Referral Tenants who joined through main tenant <strong>timegig2026@gmail.com</strong> referral link can only sign up up to <strong>10 Tenant Subs</strong> and <strong>100 User Subs</strong>:
                </p>
                {joinedTenants.map((tenant) => {
                  const edit = quotaEdits[tenant.id];
                  const totalVal = edit?.totalTenants ?? String(Math.min(MAX_REFERRAL_TENANT_SUBS, tenant.assignedTotalTenants ?? MAX_REFERRAL_TENANT_SUBS));
                  const userSubVal = edit?.userSubSignups ?? String(Math.min(MAX_REFERRAL_USER_SUBS, tenant.assignedUserSubSignups ?? MAX_REFERRAL_USER_SUBS));
                  return (
                    <div key={tenant.id} className="bg-white border border-amber-200 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-black text-slate-900 block">{tenant.name}</span>
                          <span className="text-[10px] text-slate-500">{tenant.email}</span>
                        </div>
                        {savedId === tenant.id && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                            Saved
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Total Tenant Subs (Max 10)</label>
                          <input
                            type="number"
                            min={0}
                            max={MAX_REFERRAL_TENANT_SUBS}
                            value={totalVal}
                            onChange={(e) => handleQuotaChange(tenant, 'totalTenants', e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-black text-slate-900"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-0.5">User Subs Signups (Max 100)</label>
                          <input
                            type="number"
                            min={0}
                            max={MAX_REFERRAL_USER_SUBS}
                            value={userSubVal}
                            onChange={(e) => handleQuotaChange(tenant, 'userSubSignups', e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-black text-slate-900"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSaveQuotas(tenant)}
                        className="w-full py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-[11px] rounded-lg cursor-pointer"
                      >
                        Save Tenant Subs & User Subs Signups
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
