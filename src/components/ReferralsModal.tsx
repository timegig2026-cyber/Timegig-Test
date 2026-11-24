import React, { useState } from 'react';
import { X, ArrowLeft, Users, Search, Copy, Check, CheckCircle2, XCircle, Eye, AlertCircle, Crown, ShieldCheck, Building2, UserPlus, Info } from 'lucide-react';
import { soundEngine } from '../utils/audio';

export interface ReferralItem {
  id: string;
  name: string;
  email: string;
  plan: 'Tenant Sub' | 'User Sub';
  profit: string;
  date: string;
  status: 'pending_review' | 'approved' | 'rejected' | 'Frozen';
  selfieUrl?: string;
  idDocuments?: Array<{ id: string; name: string; url: string }>;
  paymentDocuments?: Array<{ id: string; name: string; url: string }>;
  rejectionReason?: string;
  referredByEmail?: string;
  referredByPlan?: 'Tenant Sub' | 'User Sub';
  joinedViaMainTenantLink?: boolean;
  routedToMainTenant?: boolean;
  assignedTotalTenants?: number;
  assignedUserSubSignups?: number;
}

interface ReferralsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBackToMenu: () => void;
  userEmail: string | null;
  currencySymbol: string;
  referrals: ReferralItem[];
  onUpdateReferralStatus: (id: string, newStatus: 'approved' | 'rejected' | 'Frozen', reason?: string) => void;
  onViewDocFullScreen: (imageUrl: string, title: string) => void;
  isMainTenant: boolean;
  userSubscriptionPlan?: 'Tenant Sub' | 'User Sub' | null;
  onUpdateTenantQuotas?: (id: string, totalTenants: number, userSubSignups: number) => void;
  referralTenantSubLimit?: number;
  referralUserSubLimit?: number;
}

const MAX_REFERRAL_TENANT_SUBS = 10;
const MAX_REFERRAL_USER_SUBS = 100;

export const ReferralsModal: React.FC<ReferralsModalProps> = ({
  isOpen,
  onClose,
  onBackToMenu,
  userEmail,
  referrals,
  onUpdateReferralStatus,
  onViewDocFullScreen,
  isMainTenant,
  userSubscriptionPlan = null,
  onUpdateTenantQuotas,
  referralTenantSubLimit = MAX_REFERRAL_TENANT_SUBS,
  referralUserSubLimit = MAX_REFERRAL_USER_SUBS,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'user_subs' | 'tenant_subs' | 'pending'>('all');

  // Rejection dialog state
  const [rejectingItem, setRejectingItem] = useState<ReferralItem | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');

  // Local edits for Main-Tenant-only Total Tenants & User Sub Signups per joined tenant
  const [quotaEdits, setQuotaEdits] = useState<Record<string, { totalTenants: string; userSubSignups: string }>>({});
  const [savedQuotaId, setSavedQuotaId] = useState<string | null>(null);

  if (!isOpen) return null;

  const isStrictMainTenant = isMainTenant && (userEmail || '').trim().toLowerCase() === 'timegig2026@gmail.com';

  const isUserSubMember = userSubscriptionPlan === 'User Sub' && !isMainTenant;
  const referralLink = isUserSubMember
    ? `https://timegig.app/ref/user_${encodeURIComponent(userEmail || 'member')}`
    : `https://timegig.app/ref/tenant_${encodeURIComponent(userEmail || 'timegig2026@gmail.com')}`;

  const handleCopy = () => {
    soundEngine.playFeatureClick();
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleApprove = (item: ReferralItem) => {
    soundEngine.playSuccessChime();
    onUpdateReferralStatus(item.id, 'approved');
  };

  const handleConfirmReject = () => {
    if (!rejectingItem) return;
    soundEngine.playFeatureClick();
    onUpdateReferralStatus(rejectingItem.id, 'rejected', rejectionReasonInput.trim() || 'Document verification failed.');
    setRejectingItem(null);
    setRejectionReasonInput('');
  };

  const handleToggleFreeze = (item: ReferralItem) => {
    soundEngine.playFeatureClick();
    const nextStatus = item.status === 'Frozen' ? 'approved' : 'Frozen';
    onUpdateReferralStatus(item.id, nextStatus);
  };

  const handleQuotaChange = (ref: ReferralItem, field: 'totalTenants' | 'userSubSignups', value: string) => {
    const clean = value.replace(/[^0-9]/g, '');
    const numeric = clean === '' ? '' : String(
      Math.min(
        field === 'totalTenants' ? MAX_REFERRAL_TENANT_SUBS : MAX_REFERRAL_USER_SUBS,
        parseInt(clean, 10) || 0
      )
    );
    setQuotaEdits((prev) => ({
      ...prev,
      [ref.id]: {
        totalTenants: prev[ref.id]?.totalTenants ?? String(Math.min(MAX_REFERRAL_TENANT_SUBS, ref.assignedTotalTenants ?? MAX_REFERRAL_TENANT_SUBS)),
        userSubSignups: prev[ref.id]?.userSubSignups ?? String(Math.min(MAX_REFERRAL_USER_SUBS, ref.assignedUserSubSignups ?? MAX_REFERRAL_USER_SUBS)),
        [field]: numeric,
      },
    }));
  };

  const handleSaveQuotas = (ref: ReferralItem) => {
    if (!isMainTenant || !onUpdateTenantQuotas) return;
    const current = quotaEdits[ref.id];
    const rawTotalTenants = parseInt(current?.totalTenants ?? String(ref.assignedTotalTenants ?? MAX_REFERRAL_TENANT_SUBS), 10) || 0;
    const rawUserSubSignups = parseInt(current?.userSubSignups ?? String(ref.assignedUserSubSignups ?? MAX_REFERRAL_USER_SUBS), 10) || 0;
    const totalTenants = Math.min(MAX_REFERRAL_TENANT_SUBS, Math.max(0, rawTotalTenants));
    const userSubSignups = Math.min(MAX_REFERRAL_USER_SUBS, Math.max(0, rawUserSubSignups));
    soundEngine.playSuccessChime();
    onUpdateTenantQuotas(ref.id, totalTenants, userSubSignups);
    setSavedQuotaId(ref.id);
    setTimeout(() => setSavedQuotaId(null), 2200);
  };

  // Visibility: Main Tenant sees ALL referrals (including all referrals referred by User Subs).
  // Regular referral Tenant sees referrals referred via their link (up to 10 Tenant Subs & 100 User Subs).
  // User Sub sees the referrals they referred (status routed to Main Tenant).
  const scopedReferrals = referrals.filter((item) => {
    if (isMainTenant) return true;
    const currentLower = (userEmail || '').trim().toLowerCase();
    if (isUserSubMember) {
      return item.referredByEmail?.toLowerCase() === currentLower || item.routedToMainTenant;
    }
    return !item.routedToMainTenant && (!item.referredByEmail || item.referredByEmail.toLowerCase() === currentLower);
  });

  const searchFiltered = scopedReferrals.filter((item) => {
    const q = searchQuery.toLowerCase();
    return (
      item.name.toLowerCase().includes(q) ||
      item.email.toLowerCase().includes(q) ||
      item.plan.toLowerCase().includes(q) ||
      (item.referredByEmail || '').toLowerCase().includes(q)
    );
  });

  const tenantSubList = searchFiltered.filter((r) => r.plan === 'Tenant Sub');
  const userSubList = searchFiltered.filter((r) => r.plan === 'User Sub');
  const pendingList = searchFiltered.filter((r) => r.status === 'pending_review');

  const totalTenantSubsCount = scopedReferrals.filter((r) => r.plan === 'Tenant Sub').length;
  const totalUserSubsCount = scopedReferrals.filter((r) => r.plan === 'User Sub').length;
  const activeTenantSubsCount = scopedReferrals.filter((r) => r.plan === 'Tenant Sub' && r.status !== 'rejected').length;
  const activeUserSubsCount = scopedReferrals.filter((r) => r.plan === 'User Sub' && r.status !== 'rejected').length;
  const effectiveTenantLimit = Math.min(MAX_REFERRAL_TENANT_SUBS, Math.max(0, referralTenantSubLimit));
  const effectiveUserLimit = Math.min(MAX_REFERRAL_USER_SUBS, Math.max(0, referralUserSubLimit));
  const pendingCount = scopedReferrals.filter((r) => r.status === 'pending_review').length;

  const renderReferralCard = (ref: ReferralItem) => {
    const currentEdit = quotaEdits[ref.id];
    const totalTenantsVal = currentEdit?.totalTenants ?? String(Math.min(MAX_REFERRAL_TENANT_SUBS, ref.assignedTotalTenants ?? MAX_REFERRAL_TENANT_SUBS));
    const userSubSignupsVal = currentEdit?.userSubSignups ?? String(Math.min(MAX_REFERRAL_USER_SUBS, ref.assignedUserSubSignups ?? MAX_REFERRAL_USER_SUBS));
    const approvedTenantSubsCount = scopedReferrals.filter((r) => r.plan === 'Tenant Sub' && r.status === 'approved' && r.id !== ref.id).length;
    const approvedUserSubsCount = scopedReferrals.filter((r) => r.plan === 'User Sub' && r.status === 'approved' && r.id !== ref.id).length;
    const isReferralTenantAtLimit =
      !isMainTenant &&
      !isUserSubMember &&
      ((ref.plan === 'Tenant Sub' && approvedTenantSubsCount >= effectiveTenantLimit) ||
        (ref.plan === 'User Sub' && approvedUserSubsCount >= effectiveUserLimit));

    return (
      <div
        key={ref.id}
        className={`bg-white border rounded-2xl p-5 shadow-sm space-y-4 transition-colors ${
          ref.status === 'pending_review'
            ? 'border-amber-300 ring-2 ring-amber-100'
            : ref.status === 'rejected'
            ? 'border-rose-200 bg-rose-50/20'
            : ref.status === 'Frozen'
            ? 'border-slate-300 opacity-75'
            : 'border-slate-200'
        }`}
      >
        {/* User Header & Selfie */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3.5">
            {ref.selfieUrl ? (
              <div
                className="relative w-14 h-14 rounded-2xl overflow-hidden border-2 border-purple-500/40 shrink-0 shadow-sm cursor-pointer group"
                onClick={() => onViewDocFullScreen(ref.selfieUrl!, `${ref.name} - Face Selfie`)}
                title="Click to view face selfie in full screen"
              >
                <img src={ref.selfieUrl} alt={ref.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                <div className="absolute inset-0 bg-slate-950/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                  <Eye className="w-4 h-4" />
                </div>
              </div>
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-purple-100 text-purple-700 font-bold text-lg flex items-center justify-center shrink-0">
                {ref.name.charAt(0)}
              </div>
            )}

            <div className="space-y-1">
              <div className="text-sm font-black text-slate-900 flex flex-wrap items-center gap-1.5">
                <span>{ref.name}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                    ref.plan === 'Tenant Sub'
                      ? 'bg-amber-100 text-amber-900 border-amber-300'
                      : 'bg-blue-100 text-blue-800 border-blue-200'
                  }`}
                >
                  {ref.plan}
                </span>
                {ref.status === 'pending_review' && (
                  <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 border border-amber-300 rounded-full text-[10px] font-bold">
                    Pending Approval
                  </span>
                )}
                {ref.status === 'approved' && (
                  <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-full text-[10px] font-bold">
                    Active (Approved)
                  </span>
                )}
                {ref.status === 'rejected' && (
                  <span className="px-2.5 py-0.5 bg-rose-100 text-rose-800 border border-rose-300 rounded-full text-[10px] font-bold">
                    Rejected
                  </span>
                )}
                {ref.status === 'Frozen' && (
                  <span className="px-2.5 py-0.5 bg-slate-200 text-slate-800 border border-slate-300 rounded-full text-[10px] font-bold">
                    Frozen
                  </span>
                )}
              </div>

              <div className="text-xs text-slate-500">
                {ref.email} • {ref.date}
              </div>

              {/* Routing & Origin badges */}
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {ref.referredByPlan === 'User Sub' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-50 border border-indigo-200 text-[10px] font-bold text-indigo-800">
                    <UserPlus className="w-3 h-3" />
                    Referred by User Sub ({ref.referredByEmail || 'User Sub Member'}) → Main Tenant
                  </span>
                )}
                {ref.joinedViaMainTenantLink && ref.plan === 'Tenant Sub' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 border border-amber-200 text-[10px] font-bold text-amber-800">
                    <Crown className="w-3 h-3" />
                    Joined via Main Tenant Link
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="text-right shrink-0">
            <div className="text-sm font-black text-emerald-600">+{ref.profit}</div>
            <div className="text-[10px] text-slate-400">Monthly Share</div>
          </div>
        </div>

        {/* Read-only Quota Summary if set on a Tenant Sub */}
        {ref.plan === 'Tenant Sub' && ref.joinedViaMainTenantLink && !isStrictMainTenant && (
          <div className="grid grid-cols-2 gap-2.5 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
            <div>
              <div className="text-[10px] text-slate-500 font-bold uppercase">Tenant Subs Limit</div>
              <div className="text-sm font-black text-slate-900">{Math.min(MAX_REFERRAL_TENANT_SUBS, ref.assignedTotalTenants ?? MAX_REFERRAL_TENANT_SUBS)} max</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 font-bold uppercase">User Subs Limit</div>
              <div className="text-sm font-black text-slate-900">{Math.min(MAX_REFERRAL_USER_SUBS, ref.assignedUserSubSignups ?? MAX_REFERRAL_USER_SUBS)} max</div>
            </div>
          </div>
        )}

        {/* MAIN TENANT ONLY: Set Total Tenant Subs & User Subs Signups for Tenants who joined through Main Tenant link */}
        {isStrictMainTenant && ref.plan === 'Tenant Sub' && ref.joinedViaMainTenantLink && (
          <div className="p-3.5 bg-amber-50/80 border border-amber-300 rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-black text-amber-950">
                <Building2 className="w-4 h-4 text-amber-700" />
                <span>Main Tenant Assignment (Max 10 Tenant / 100 User Subs)</span>
              </div>
              {savedQuotaId === ref.id && (
                <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  Saved
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[10px] font-bold text-amber-900 mb-1">Total Tenant Subs (Max 10)</label>
                <input
                  type="number"
                  min={0}
                  max={MAX_REFERRAL_TENANT_SUBS}
                  value={totalTenantsVal}
                  onChange={(e) => handleQuotaChange(ref, 'totalTenants', e.target.value)}
                  className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-xs font-black text-slate-950 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-amber-900 mb-1">User Subs Signups (Max 100)</label>
                <input
                  type="number"
                  min={0}
                  max={MAX_REFERRAL_USER_SUBS}
                  value={userSubSignupsVal}
                  onChange={(e) => handleQuotaChange(ref, 'userSubSignups', e.target.value)}
                  className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-xs font-black text-slate-950 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleSaveQuotas(ref)}
              className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-sm cursor-pointer transition-all active:scale-95"
            >
              Save Tenant Subs & User Subs Signups
            </button>
          </div>
        )}

        {/* Rejection Reason Notice */}
        {ref.status === 'rejected' && ref.rejectionReason && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Rejection Reason: {ref.rejectionReason}</span>
          </div>
        )}

        {/* Uploaded Documents Thumbnails (Click to view full screen) */}
        <div className="space-y-2 border-t border-slate-100 pt-3">
          <div className="text-xs font-bold text-slate-700 flex items-center justify-between">
            <span>Submitted Verification Documents:</span>
            <span className="text-[10px] text-blue-600 font-semibold">Click thumbnail to view full screen</span>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {ref.selfieUrl && (
              <button
                type="button"
                onClick={() => onViewDocFullScreen(ref.selfieUrl!, `${ref.name} - Face Selfie`)}
                className="flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-purple-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer shadow-sm group"
              >
                <img src={ref.selfieUrl} alt="Selfie" className="w-6 h-6 rounded-md object-cover border border-purple-300" />
                <span>View Face Selfie</span>
                <Eye className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-600" />
              </button>
            )}

            {ref.idDocuments && ref.idDocuments.length > 0 ? (
              ref.idDocuments.map((doc, dIdx) => (
                <button
                  key={doc.id || dIdx}
                  type="button"
                  onClick={() => onViewDocFullScreen(doc.url, `${ref.name} - ID Document (${doc.name})`)}
                  className="flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-blue-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer shadow-sm group"
                >
                  <img src={doc.url} alt="ID" className="w-6 h-6 rounded-md object-cover border border-slate-300" />
                  <span>ID Document</span>
                  <Eye className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600" />
                </button>
              ))
            ) : (
              <div className="text-xs text-slate-400 italic px-1 py-1">No separate ID attached</div>
            )}

            {ref.paymentDocuments && ref.paymentDocuments.length > 0 ? (
              ref.paymentDocuments.map((doc, pIdx) => (
                <button
                  key={doc.id || pIdx}
                  type="button"
                  onClick={() => onViewDocFullScreen(doc.url, `${ref.name} - Proof of Payment (${doc.name})`)}
                  className="flex items-center gap-2 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 cursor-pointer shadow-sm group"
                >
                  <img src={doc.url} alt="Payment" className="w-6 h-6 rounded-md object-cover border border-emerald-300" />
                  <span>Proof of Payment</span>
                  <Eye className="w-3.5 h-3.5 text-emerald-600" />
                </button>
              ))
            ) : (
              <div className="text-xs text-slate-400 italic px-1 py-1">No payment receipt attached</div>
            )}
          </div>
        </div>

        {/* Tenant Action Controls: Approve / Reject / Freeze (Only Tenant/Main Tenant can approve/reject) */}
        {!isUserSubMember ? (
          <div className="space-y-2 pt-2 border-t border-slate-100">
            {isReferralTenantAtLimit && ref.status === 'pending_review' && (
              <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-xl text-[11px] font-bold text-amber-900">
                Signup limit reached: Referral Tenants who joined via timegig2026@gmail.com can only sign up {effectiveTenantLimit} Tenant Subs and {effectiveUserLimit} User Subs.
              </div>
            )}
            <div className="flex items-center gap-2.5">
              {ref.status === 'pending_review' ? (
                <>
                  <button
                    type="button"
                    disabled={isReferralTenantAtLimit}
                    onClick={() => handleApprove(ref)}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-black text-xs rounded-xl shadow-sm flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isReferralTenantAtLimit ? 'Signup Cap Reached' : 'Approve & Activate Referral'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRejectingItem(ref);
                      setRejectionReasonInput('');
                    }}
                    className="flex-1 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Reject Submission</span>
                  </button>
                </>
              ) : (
                <>
                  {ref.status === 'approved' && (
                    <button
                      type="button"
                      onClick={() => handleToggleFreeze(ref)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold text-xs rounded-xl cursor-pointer"
                    >
                      Freeze Account
                    </button>
                  )}
                  {ref.status === 'Frozen' && (
                    <button
                      type="button"
                      onClick={() => handleToggleFreeze(ref)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl cursor-pointer shadow-sm"
                    >
                      Unfreeze & Activate
                    </button>
                  )}
                  {ref.status === 'rejected' && (
                    <button
                      type="button"
                      disabled={isReferralTenantAtLimit}
                      onClick={() => handleApprove(ref)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl cursor-pointer shadow-sm"
                    >
                      Re-Approve Submission
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="pt-2 border-t border-slate-100 text-[11px] font-semibold text-indigo-700">
            Routed to Main Tenant (timegig2026@gmail.com) for verification & approval.
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-[230] flex flex-col bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full h-full max-w-4xl mx-auto bg-white border border-slate-200 shadow-2xl flex flex-col overflow-hidden text-slate-950 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar with Search at the Very Top */}
        <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-3.5 border-b border-slate-200 bg-white gap-3 shrink-0">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onBackToMenu}
              className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center cursor-pointer shrink-0"
              title="Back to App Menu"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black tracking-tight text-slate-950 flex items-center gap-1.5">
                  <span>Referrals & Verifications</span>
                  {isMainTenant && (
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded-full text-[9px] font-black uppercase">
                      Main Tenant
                    </span>
                  )}
                </h3>
                <p className="text-[10px] text-slate-500">Separated User Subs & Tenant Subs • Full-screen doc review</p>
              </div>
            </div>
          </div>

          {/* Search bar at the very top */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search referrals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 font-semibold"
            />
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                soundEngine.playFeatureClick();
                setShowInfo((prev) => !prev);
              }}
              aria-label="Referrals feature information"
              title="About Referrals feature"
              className={`w-9 h-9 rounded-full flex items-center justify-center cursor-pointer transition-colors ${
                showInfo ? 'bg-blue-600 text-white' : 'bg-blue-50 hover:bg-blue-100 text-blue-600'
              }`}
            >
              <Info className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="hidden sm:flex w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 items-center justify-center cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50">
          <div className="max-w-2xl mx-auto w-full space-y-5">
            {showInfo && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-950 space-y-1 animate-in fade-in duration-150">
                <div className="font-black flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-blue-600" />
                  <span>How Referrals & Verifications Work</span>
                </div>
                <p className="leading-relaxed text-blue-900 font-medium">
                  View User Subs and Tenant Subs separately, inspect face selfies, ID documents, and proof of payment in full screen, and approve, reject, or freeze referrals before they use the app. All User Sub referrals route directly to the Main Tenant (timegig2026@gmail.com).
                </p>
              </div>
            )}
            {/* Main Tenant Inbox Banner */}
            {isMainTenant && (
              <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex items-start gap-3 shadow-sm">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0">
                  <Crown className="w-4 h-4" />
                </div>
                <div className="space-y-0.5 text-xs">
                  <div className="font-black text-amber-950">
                    Main Tenant Referral Inbox Active
                  </div>
                  <p className="text-amber-900 font-medium leading-relaxed">
                    You automatically receive all referrals shared by <strong>User Sub</strong> members as well as direct <strong>Tenant Sub</strong> signups. Only you can set Total Tenants & User Sub Signups for Tenants who joined through your link.
                  </p>
                </div>
              </div>
            )}

            {/* Referral Tenant Signup Caps Banner (Max 10 Tenant Subs / Max 100 User Subs) */}
            {!isMainTenant && !isUserSubMember && (
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-2.5 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-black text-blue-950">
                    Referral Tenant Signup Limits (Joined via timegig2026@gmail.com)
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-black">
                    10 Tenant / 100 User Max
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div className="bg-white border border-blue-200 rounded-xl p-2.5">
                    <div className="text-[10px] font-bold text-slate-500 uppercase">Tenant Sub Signups</div>
                    <div className="text-sm font-black text-slate-950">
                      {activeTenantSubsCount} / {effectiveTenantLimit}
                    </div>
                  </div>
                  <div className="bg-white border border-blue-200 rounded-xl p-2.5">
                    <div className="text-[10px] font-bold text-slate-500 uppercase">User Sub Signups</div>
                    <div className="text-sm font-black text-slate-950">
                      {activeUserSubsCount} / {effectiveUserLimit}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* User Sub Routing Info Banner */}
            {isUserSubMember && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 flex items-start gap-3 shadow-sm">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div className="space-y-0.5 text-xs">
                  <div className="font-black text-indigo-950">User Sub Referral Routing</div>
                  <p className="text-indigo-900 font-medium leading-relaxed">
                    All people you refer using your User Sub link are routed directly to the <strong>Main Tenant (timegig2026@gmail.com)</strong> in Referrals.
                  </p>
                </div>
              </div>
            )}

            {/* Referral Link Box */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-bold text-slate-800">
                  {isUserSubMember ? 'Your User Sub Referral Link (Routes to Main Tenant)' : 'Your Tenant Referral Invitation Link'}
                </div>
                <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
                  {isUserSubMember ? 'Sent to Main Tenant for approval' : 'New referrals require approval to use app'}
                </span>
              </div>

              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3">
                <input
                  type="text"
                  readOnly
                  value={referralLink}
                  className="w-full bg-transparent text-xs text-slate-700 font-mono outline-none truncate"
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer shadow-sm"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-200" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Separation Filter Tabs: All (Separated), User Subs, Tenant Subs, Pending */}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'all' ? 'bg-slate-900 text-white shadow-sm' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                All Separated ({scopedReferrals.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('user_subs')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'user_subs' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-slate-700 border border-slate-200 hover:bg-blue-50'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>User Subs ({totalUserSubsCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('tenant_subs')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'tenant_subs' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'bg-white text-slate-700 border border-slate-200 hover:bg-amber-50'
                }`}
              >
                <Crown className="w-3.5 h-3.5" />
                <span>Tenant Subs ({totalTenantSubsCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('pending')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'pending' ? 'bg-rose-600 text-white shadow-sm' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>Pending Review</span>
                {pendingCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-black">
                    {pendingCount}
                  </span>
                )}
              </button>
            </div>

            {/* Separated Referrals Content */}
            {activeTab === 'all' && (
              <div className="space-y-6">
                {/* SECTION 1: TENANT SUBS */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                        <Crown className="w-4 h-4" />
                      </div>
                      <h4 className="text-sm font-black text-slate-900">Tenant Subs ({tenantSubList.length})</h4>
                    </div>
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full">
                      Passive Network Tier
                    </span>
                  </div>

                  {tenantSubList.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-500 bg-white rounded-2xl border border-slate-200">
                      No Tenant Sub referrals yet.
                    </div>
                  ) : (
                    <div className="space-y-3.5">
                      {tenantSubList.map(renderReferralCard)}
                    </div>
                  )}
                </div>

                {/* SECTION 2: USER SUBS */}
                <div className="space-y-3 pt-2 border-t border-slate-200">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <h4 className="text-sm font-black text-slate-900">User Subs ({userSubList.length})</h4>
                    </div>
                    <span className="text-[10px] font-bold text-blue-800 bg-blue-100 px-2.5 py-0.5 rounded-full">
                      Standard App Access Tier
                    </span>
                  </div>

                  {userSubList.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-500 bg-white rounded-2xl border border-slate-200">
                      No User Sub referrals yet.
                    </div>
                  ) : (
                    <div className="space-y-3.5">
                      {userSubList.map(renderReferralCard)}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'user_subs' && (
              <div className="space-y-4">
                {userSubList.length === 0 ? (
                  <div className="text-center py-14 text-xs text-slate-500 bg-white rounded-2xl border border-slate-200">
                    No User Sub referrals found.
                  </div>
                ) : (
                  userSubList.map(renderReferralCard)
                )}
              </div>
            )}

            {activeTab === 'tenant_subs' && (
              <div className="space-y-4">
                {tenantSubList.length === 0 ? (
                  <div className="text-center py-14 text-xs text-slate-500 bg-white rounded-2xl border border-slate-200">
                    No Tenant Sub referrals found.
                  </div>
                ) : (
                  tenantSubList.map(renderReferralCard)
                )}
              </div>
            )}

            {activeTab === 'pending' && (
              <div className="space-y-4">
                {pendingList.length === 0 ? (
                  <div className="text-center py-14 text-xs text-slate-500 bg-white rounded-2xl border border-slate-200">
                    No pending referral reviews.
                  </div>
                ) : (
                  pendingList.map(renderReferralCard)
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reject Reason Modal Dialog */}
      {rejectingItem && (
        <div
          className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md"
          onClick={() => setRejectingItem(null)}
        >
          <div
            className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 text-slate-950 space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-black text-slate-950">Reject Referral Submission</h3>
              <button
                type="button"
                onClick={() => setRejectingItem(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Provide a clear rejection reason for <strong>{rejectingItem.name}</strong> ({rejectingItem.email}).
            </p>

            <textarea
              rows={3}
              required
              placeholder="e.g. Unclear face selfie or invalid ID document..."
              value={rejectionReasonInput}
              onChange={(e) => setRejectionReasonInput(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none font-medium"
            />

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setRejectingItem(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl cursor-pointer shadow-sm"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
