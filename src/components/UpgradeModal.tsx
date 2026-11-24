import React, { useState, useEffect } from 'react';
import { X, ArrowLeft, Crown, Sparkles, CheckCircle2, Camera, Upload, FileText, ArrowRight, ShieldCheck, DollarSign, Lock, Info } from 'lucide-react';
import { soundEngine } from '../utils/audio';

export interface NewReferralSubmissionPayload {
  id: string;
  name: string;
  email: string;
  plan: 'Tenant Sub' | 'User Sub';
  profit: string;
  date: string;
  status: 'pending_review' | 'approved' | 'rejected' | 'Frozen';
  selfieUrl: string;
  idDocuments: Array<{ id: string; name: string; url: string }>;
  paymentDocuments: Array<{ id: string; name: string; url: string }>;
  submittedAt: number;
  referredByEmail?: string;
}

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBackToMenu: () => void;
  currencySymbol: string;
  userEmail: string | null;
  onSubmissionSuccess: (submission: NewReferralSubmissionPayload) => string | null | void;
  isApproved?: boolean;
  activePlan?: 'Tenant Sub' | 'User Sub' | null;
  subscriptionExpiresAt?: number;
  tenantSubFee?: number;
  userSubFee?: number;
  trialDays?: number;
  defaultReferrerEmail?: string;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  isOpen,
  onClose,
  onBackToMenu,
  currencySymbol,
  userEmail,
  onSubmissionSuccess,
  isApproved = false,
  activePlan = null,
  subscriptionExpiresAt,
  tenantSubFee = 299.99,
  userSubFee = 29.99,
  trialDays = 7,
  defaultReferrerEmail = 'timegig2026@gmail.com',
}) => {
  const formatFee = (val: number) => val.toFixed(2).replace('.', ',');
  const [selectedPlan, setSelectedPlan] = useState<'Tenant Sub' | 'User Sub' | null>(null);
  const [step, setStep] = useState<'plans' | 'verification' | 'success'>('plans');

  // Verification step form data
  const [applicantName, setApplicantName] = useState(userEmail ? userEmail.split('@')[0] : 'Applicant');
  const [referrerEmailInput, setReferrerEmailInput] = useState(defaultReferrerEmail);
  const [selfieUrl, setSelfieUrl] = useState<string | null>(null);
  const [idDocs, setIdDocs] = useState<Array<{ id: string; name: string; url: string }>>([]);
  const [paymentDocs, setPaymentDocs] = useState<Array<{ id: string; name: string; url: string }>>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    setReferrerEmailInput(defaultReferrerEmail);
  }, [defaultReferrerEmail, isOpen]);

  useEffect(() => {
    if (userEmail) {
      setApplicantName(userEmail.split('@')[0]);
    }
  }, [userEmail]);

  if (!isOpen) return null;

  const handleSelectPlan = (plan: 'Tenant Sub' | 'User Sub') => {
    soundEngine.playFeatureClick();
    setSelectedPlan(plan);
    setStep('verification');
    setErrorMsg(null);
  };

  const handleSelfieUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setSelfieUrl(event.target.result as string);
        setErrorMsg(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleIdDocsUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setIdDocs((prev) => [
            ...prev,
            {
              id: `id_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
              name: file.name,
              url: event.target!.result as string,
            },
          ]);
          setErrorMsg(null);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handlePaymentDocsUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setPaymentDocs((prev) => [
            ...prev,
            {
              id: `pay_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
              name: file.name,
              url: event.target!.result as string,
            },
          ]);
          setErrorMsg(null);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSubmitVerification = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selfieUrl) {
      setErrorMsg('Please capture or upload your face selfie.');
      return;
    }
    if (idDocs.length === 0) {
      setErrorMsg('Please upload at least one ID document from your device.');
      return;
    }
    if (paymentDocs.length === 0) {
      setErrorMsg('Please upload proof of payment document.');
      return;
    }

    const newSubmission: NewReferralSubmissionPayload = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name: applicantName.trim() || 'New Member',
      email: userEmail || '',
      plan: selectedPlan || 'User Sub',
      profit: selectedPlan === 'Tenant Sub' ? `R${(tenantSubFee * 0.4).toFixed(2)}` : `R${(userSubFee * 0.5).toFixed(2)}`,
      date: 'Just now',
      status: 'pending_review',
      selfieUrl: selfieUrl,
      idDocuments: idDocs,
      paymentDocuments: paymentDocs,
      submittedAt: Date.now(),
      referredByEmail: referrerEmailInput.trim().toLowerCase() || 'timegig2026@gmail.com',
    };

    const rejectionOrCapError = onSubmissionSuccess(newSubmission);
    if (typeof rejectionOrCapError === 'string' && rejectionOrCapError.trim().length > 0) {
      setErrorMsg(rejectionOrCapError);
      return;
    }

    soundEngine.playSuccessChime();
    setStep('success');
  };

  const handleResetAndClose = () => {
    setStep('plans');
    setSelectedPlan(null);
    setSelfieUrl(null);
    setIdDocs([]);
    setPaymentDocs([]);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[230] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xl animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 text-slate-950 space-y-6 max-h-[92vh] overflow-y-auto animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                if (step === 'verification') {
                  setStep('plans');
                } else {
                  onBackToMenu();
                }
              }}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center cursor-pointer"
              title="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                <Crown className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-black tracking-tight text-slate-950">
                  {step === 'verification' ? 'Subscription Verification' : 'Upgrade Subscriptions'}
                </h3>
                <p className="text-xs text-slate-500">
                  {step === 'verification' ? `Complete verification for ${selectedPlan}` : 'Choose your subscription tier'}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                soundEngine.playFeatureClick();
                setShowInfo((prev) => !prev);
              }}
              aria-label="Upgrade feature information"
              title="About Upgrade Subscriptions"
              className={`w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-colors ${
                showInfo ? 'bg-blue-600 text-white' : 'bg-blue-50 hover:bg-blue-100 text-blue-600'
              }`}
            >
              <Info className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleResetAndClose}
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
              <span>About Upgrade Subscriptions</span>
            </div>
            <p className="leading-relaxed text-blue-900 font-medium">
              Select Tenant Sub or User Sub, capture a face selfie, upload your ID document and proof of payment, and submit to your tenant for approval. Once approved, plans lock until your active billing cycle ends.
            </p>
          </div>
        )}

        {/* STEP 1: Subscription Plans Selection */}
        {step === 'plans' && (
          <div className="space-y-4">
            {/* If user is approved, display Locked Subscription Notice */}
            {isApproved && activePlan && (
              <div className="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-2xl flex items-start gap-3 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Lock className="w-5 h-5" />
                </div>
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-emerald-950 uppercase tracking-wider">{activePlan}</span>
                    <span className="px-2 py-0.5 bg-emerald-200 text-emerald-900 rounded-full text-[10px] font-black">
                      Approved & Active
                    </span>
                  </div>
                  <p className="text-xs text-emerald-800 font-medium leading-relaxed">
                    Subscription plans are <strong>locked</strong> until your active billing cycle ends on{' '}
                    <strong>
                      {subscriptionExpiresAt
                        ? new Date(subscriptionExpiresAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                        : new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </strong>
                    . You cannot change plans until the current subscription period completes.
                  </p>
                </div>
              </div>
            )}

            {trialDays > 0 && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between text-xs font-bold text-blue-900">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <span>{trialDays}-Day Free Trial Available</span>
                </span>
                <span className="px-2 py-0.5 bg-blue-600 text-white rounded-full text-[10px] font-black uppercase">
                  {trialDays} Days Trial
                </span>
              </div>
            )}

            {/* Tenant Sub Card */}
            <div className={`border-2 rounded-2xl p-5 space-y-3.5 shadow-sm transition-colors ${
              isApproved && activePlan === 'Tenant Sub'
                ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-emerald-400 ring-2 ring-emerald-100'
                : 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-300'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-900 font-black text-sm">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>Tenant Sub</span>
                </div>
                <span className="px-2.5 py-0.5 bg-amber-200 text-amber-900 rounded-full text-[10px] font-black uppercase">
                  Passive Income
                </span>
              </div>

              <div className="text-3xl font-black text-slate-950">
                R{formatFee(tenantSubFee)}<span className="text-xs font-bold text-slate-500"> / month</span>
              </div>

              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                Become a tenant and earn a passive monthly income from user subscriptions across your referral network. It's a <strong>R{formatFee(tenantSubFee)}</strong> subscription fee to keep your tenant account active{trialDays > 0 ? ` (${trialDays}-day free trial included)` : ''}.
              </p>

              <ul className="text-xs text-slate-700 space-y-1.5 font-medium border-t border-amber-200/60 pt-2.5">
                <li>• Earn continuous monthly passive income from user subscriptions</li>
                <li>• Generate custom Tenant Referral Links to build your network</li>
                <li>• Full review, approve and freeze controls over referred members</li>
              </ul>

              {isApproved && activePlan ? (
                <button
                  type="button"
                  disabled
                  className={`w-full py-3.5 font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-not-allowed ${
                    activePlan === 'Tenant Sub'
                      ? 'bg-amber-600/85 text-white shadow-inner'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  <Lock className="w-4 h-4" />
                  <span>
                    {activePlan === 'Tenant Sub'
                      ? 'Current Active Plan (Locked Until Subscription Ends)'
                      : 'Locked Until Current Subscription Ends'}
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSelectPlan('Tenant Sub')}
                  className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <span>Subscribe to Tenant Sub (R{formatFee(tenantSubFee)})</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* User Sub Card */}
            <div className={`border-2 rounded-2xl p-5 space-y-3.5 shadow-sm transition-colors ${
              isApproved && activePlan === 'User Sub'
                ? 'bg-blue-50/50 border-emerald-400 ring-2 ring-emerald-100'
                : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-900 font-black text-sm">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span>User Sub</span>
                </div>
                <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded-full text-[10px] font-bold uppercase">
                  Standard Access
                </span>
              </div>

              <div className="text-3xl font-black text-slate-950">
                R{formatFee(userSubFee)}<span className="text-xs font-bold text-slate-500"> / month</span>
              </div>

              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                Users use the app and pay a monthly subscription fee of <strong>R{formatFee(userSubFee)}</strong> to keep account active and access all gigs, items, and mapping tools{trialDays > 0 ? ` (${trialDays}-day free trial included)` : ''}.
              </p>

              <ul className="text-xs text-slate-700 space-y-1.5 font-medium border-t border-slate-200 pt-2.5">
                <li>• Full map access to view and apply to gigs</li>
                <li>• Post gigs and sell items across the interactive globe</li>
                <li>• Verified user seeker profile badge</li>
              </ul>

              {isApproved && activePlan ? (
                <button
                  type="button"
                  disabled
                  className={`w-full py-3.5 font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-not-allowed ${
                    activePlan === 'User Sub'
                      ? 'bg-blue-600/85 text-white shadow-inner'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  <Lock className="w-4 h-4" />
                  <span>
                    {activePlan === 'User Sub'
                      ? 'Current Active Plan (Locked Until Subscription Ends)'
                      : 'Locked Until Current Subscription Ends'}
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSelectPlan('User Sub')}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <span>Subscribe to User Sub (R{formatFee(userSubFee)})</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* STEP 2: Face Selfie, ID Docs & Proof of Payment Verification Form */}
        {step === 'verification' && (
          <form onSubmit={handleSubmitVerification} className="space-y-4">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[10px] text-blue-600 uppercase font-black tracking-wider">Selected Plan</span>
                <div className="text-sm font-black text-slate-950">{selectedPlan}</div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500 font-bold">Monthly Fee{trialDays > 0 ? ` (${trialDays}d trial)` : ''}</span>
                <div className="text-sm font-black text-emerald-600">
                  {selectedPlan === 'Tenant Sub' ? `R${formatFee(tenantSubFee)}` : `R${formatFee(userSubFee)}`}
                </div>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700 text-center">
                {errorMsg}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Your Full Name</label>
              <input
                type="text"
                required
                value={applicantName}
                onChange={(e) => setApplicantName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Referred By (Tenant / Referrer Email)
              </label>
              <input
                type="email"
                value={referrerEmailInput}
                onChange={(e) => {
                  setReferrerEmailInput(e.target.value);
                  setErrorMsg(null);
                }}
                placeholder="timegig2026@gmail.com"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 font-semibold"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Referral Tenants who joined via timegig2026@gmail.com can sign up up to 10 Tenant Subs and 100 User Subs.
              </p>
            </div>

            {/* 1. Face Selfie Upload */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-800">
                1. Capture / Upload Face Selfie <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center gap-3">
                <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-slate-50 hover:bg-slate-100 border-2 border-dashed border-slate-300 rounded-xl text-xs font-bold text-slate-700 cursor-pointer transition-colors">
                  <Camera className="w-4 h-4 text-blue-600" />
                  <span>{selfieUrl ? 'Change Face Selfie' : 'Take or Upload Face Selfie'}</span>
                  <input type="file" accept="image/*" capture="user" onChange={handleSelfieUpload} className="hidden" />
                </label>
                {selfieUrl && (
                  <div className="relative w-14 h-14 rounded-xl overflow-hidden border-2 border-emerald-500 shrink-0 shadow-sm">
                    <img src={selfieUrl} alt="Selfie preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            </div>

            {/* 2. Upload ID Documents from Device */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-800">
                2. Upload ID Documents from Device <span className="text-rose-500">*</span>
              </label>
              <label className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-50 hover:bg-slate-100 border-2 border-dashed border-slate-300 rounded-xl text-xs font-bold text-slate-700 cursor-pointer transition-colors">
                <Upload className="w-4 h-4 text-purple-600" />
                <span>Choose ID Documents (Passport, ID, License)</span>
                <input type="file" accept="image/*,.pdf" multiple onChange={handleIdDocsUpload} className="hidden" />
              </label>
              {idDocs.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1 pt-1">
                  {idDocs.map((doc) => (
                    <div key={doc.id} className="relative w-14 h-14 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shrink-0">
                      <img src={doc.url} alt={doc.name} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 3. Upload Proof of Payment from Device */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-800">
                3. Submit Proof of Payment ({selectedPlan === 'Tenant Sub' ? `R${formatFee(tenantSubFee)}` : `R${formatFee(userSubFee)}`}) <span className="text-rose-500">*</span>
              </label>
              <label className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-50 hover:bg-slate-100 border-2 border-dashed border-slate-300 rounded-xl text-xs font-bold text-slate-700 cursor-pointer transition-colors">
                <FileText className="w-4 h-4 text-emerald-600" />
                <span>Upload Proof of Payment Document / Receipt</span>
                <input type="file" accept="image/*,.pdf" multiple onChange={handlePaymentDocsUpload} className="hidden" />
              </label>
              {paymentDocs.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1 pt-1">
                  {paymentDocs.map((doc) => (
                    <div key={doc.id} className="relative w-14 h-14 rounded-xl overflow-hidden border border-emerald-300 bg-emerald-50 shrink-0">
                      <img src={doc.url} alt={doc.name} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Submit Subscription Verification to Tenant</span>
            </button>
          </form>
        )}

        {/* STEP 3: Submission Success Notice */}
        {step === 'success' && (
          <div className="py-8 flex flex-col items-center justify-center space-y-4 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center border-2 border-emerald-300 shadow-lg">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h4 className="text-lg font-black text-slate-950">Subscription Verification Submitted!</h4>
              <p className="text-xs text-slate-600 max-w-sm leading-relaxed">
                Your face selfie, ID documents, and proof of payment have been submitted to the tenant who referred you. Your account will become <strong>Active</strong> as soon as the tenant reviews and approves your submission in the Referrals feature.
              </p>
            </div>
            <button
              type="button"
              onClick={handleResetAndClose}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
            >
              Done / Return to Map
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
