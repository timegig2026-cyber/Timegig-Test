import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { LogIn, LogOut, UserCircle, X, CheckCircle2, Search, LocateFixed, Globe, Plus, Minus, LayoutGrid, Sparkles, Star, Trash2, Edit3, Loader2, AlertCircle, Navigation, Eye, Check, ShieldAlert, ArrowRight, Info } from 'lucide-react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { auth } from './firebase';
import { MapView } from './components/MapView';
import { AuthModal } from './components/AuthModal';
import { TenantModal } from './components/TenantModal';
import { CreateGigModal } from './components/CreateGigModal';
import { SellItemModal } from './components/SellItemModal';
import { ReferralsModal, ReferralItem } from './components/ReferralsModal';
import { SeekersModal } from './components/SeekersModal';
import { ProfileModal } from './components/ProfileModal';
import { UpgradeModal, NewReferralSubmissionPayload } from './components/UpgradeModal';
import { SettingsModal } from './components/SettingsModal';
import { GeoLocationData, GigPost, ItemForSale, SeekerProfile } from './types';
import { searchLocations, fetchRoute } from './utils/geo';
import { soundEngine } from './utils/audio';

const LAST_LOCATION_STORAGE_KEY = 'timegig_last_location_v1';
const GIGS_STORAGE_KEY = 'timegig_gigs_v1';
const ITEMS_STORAGE_KEY = 'timegig_items_v1';
const REFERRALS_STORAGE_KEY = 'timegig_referrals_v1';
const SEEKERS_STORAGE_KEY = 'timegig_seekers_v1';
const USER_RATING_STORAGE_KEY = 'timegig_user_rating_v1';
const COMPLETED_COUNT_STORAGE_KEY = 'timegig_completed_count_v1';
const USER_PLAN_STORAGE_KEY = 'timegig_user_plan_v1';
const USER_SELFIE_STORAGE_KEY = 'timegig_user_selfie_v1';
const USER_SUB_EXPIRY_KEY = 'timegig_sub_expiry_v1';
const USER_STATUS_STORAGE_KEY = 'timegig_user_status_v1';
const TENANT_FEE_STORAGE_KEY = 'timegig_tenant_fee_v1';
const USER_FEE_STORAGE_KEY = 'timegig_user_fee_v1';
const TRIAL_DAYS_STORAGE_KEY = 'timegig_trial_days_v1';
const MAIN_TENANT_SUB_SIGNUPS_KEY = 'timegig_main_tenant_sub_signups_v1';
const MAIN_USER_SUB_SIGNUPS_KEY = 'timegig_main_user_sub_signups_v1';
const REFERRER_STORAGE_KEY = 'timegig_referrer_v1';
const MAIN_TENANT_EMAIL = 'timegig2026@gmail.com';
const MAX_REFERRAL_TENANT_SUBS = 10;
const MAX_REFERRAL_USER_SUBS = 100;

function loadInitialReferrerEmail(): string {
  try {
    const params = new URLSearchParams(window.location.search);
    const refParam = params.get('ref') || '';
    const pathMatch = window.location.pathname.match(/\/ref\/(.+)$/);
    const raw = refParam || (pathMatch ? pathMatch[1] : '');
    if (raw) {
      const stripped = decodeURIComponent(raw).replace(/^(tenant_|user_)/i, '').trim().toLowerCase();
      if (stripped) {
        localStorage.setItem(REFERRER_STORAGE_KEY, stripped);
        return stripped;
      }
    }
    const saved = localStorage.getItem(REFERRER_STORAGE_KEY);
    if (saved) return saved.trim().toLowerCase();
  } catch {}
  return MAIN_TENANT_EMAIL;
}

export interface NewPostAlert {
  id: string;
  type: 'gig' | 'item';
  title: string;
  priceOrBudget: string;
  creatorOrSeller: string;
  locationName: string;
  lat: number;
  lng: number;
  category?: string;
  imageUrl?: string;
  timestamp: number;
}

const DEFAULT_LOCATION: GeoLocationData = {
  lat: -33.9249,
  lng: 18.4241,
  timestamp: Date.now(),
  source: 'preset',
};

function loadInitialLocation(): GeoLocationData {
  try {
    const saved = localStorage.getItem(LAST_LOCATION_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as Partial<GeoLocationData>;
      if (typeof parsed.lat === 'number' && typeof parsed.lng === 'number') {
        return {
          lat: parsed.lat,
          lng: parsed.lng,
          timestamp: parsed.timestamp || Date.now(),
          source: parsed.source || 'preset',
        };
      }
    }
  } catch {}
  return DEFAULT_LOCATION;
}

function getCurrencySymbol(lat?: number, lng?: number): string {
  if (lat !== undefined && lng !== undefined) {
    if (lat >= -35 && lat <= -22 && lng >= 16 && lng <= 33) return 'R';
    if (lat >= 35 && lat <= 70 && lng >= -10 && lng <= 40) return '€';
    if (lat >= 50 && lat <= 60 && lng >= -8 && lng <= 2) return '£';
    if (lat >= 20 && lat <= 50 && lng >= 120 && lng <= 150) return '¥';
    if (lat >= -45 && lat <= -10 && lng >= 110 && lng <= 155) return 'A$';
  }
  return '$';
}

function loadInitialGigs(): GigPost[] {
  try {
    const saved = localStorage.getItem(GIGS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed.filter((g: GigPost) => g.gigId !== 'gig_sample_1');
      }
    }
  } catch {}
  return [];
}

function loadInitialItems(): ItemForSale[] {
  try {
    const saved = localStorage.getItem(ITEMS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed.filter((i: ItemForSale) => i.itemId !== 'item_sample_1');
      }
    }
  } catch {}
  return [];
}

function loadInitialReferrals(): ReferralItem[] {
  try {
    const saved = localStorage.getItem(REFERRALS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        const legacyMockIds = new Set(['ref_1', 'ref_2', 'ref_3', 'ref_4']);
        return parsed.filter((r: ReferralItem) => !legacyMockIds.has(r.id));
      }
    }
  } catch {}
  return [];
}

function loadInitialSeekers(): SeekerProfile[] {
  try {
    const saved = localStorage.getItem(SEEKERS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        const legacyMockIds = new Set(['s1', 's2', 's3']);
        return parsed.filter((s: SeekerProfile) => !legacyMockIds.has(s.uid));
      }
    }
  } catch {}
  return [];
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-[100dvh] w-screen flex items-center justify-center bg-slate-950 text-white p-6 text-center">
          <div className="max-w-sm space-y-3">
            <h1 className="text-lg font-bold">Something went wrong</h1>
            <p className="text-sm text-slate-400">
              Please reload the page to restore the map view.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="min-h-[44px] px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl cursor-pointer"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [userLocation, setUserLocation] = useState<GeoLocationData>(loadInitialLocation);
  const [flyToTarget, setFlyToTarget] = useState<{
    lat: number;
    lng: number;
    zoom?: number;
    timestamp: number;
  } | null>(null);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showPhoneMenu, setShowPhoneMenu] = useState(false);

  // Feature Modals
  const [showTenantModal, setShowTenantModal] = useState(false);
  const [showCreateGigModal, setShowCreateGigModal] = useState(false);
  const [showSellItemModal, setShowSellItemModal] = useState(false);
  const [showReferralsModal, setShowReferralsModal] = useState(false);
  const [showSeekersModal, setShowSeekersModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Selected map items for details popup & flow
  const [selectedGig, setSelectedGig] = useState<GigPost | null>(null);
  const [selectedItem, setSelectedItem] = useState<ItemForSale | null>(null);
  const [isEditingGig, setIsEditingGig] = useState(false);
  const [editGigTitle, setEditGigTitle] = useState('');
  const [editGigBudget, setEditGigBudget] = useState('');
  const [editGigDescription, setEditGigDescription] = useState('');
  const [isEditingItem, setIsEditingItem] = useState(false);
  const [editItemTitle, setEditItemTitle] = useState('');
  const [editItemPrice, setEditItemPrice] = useState('');
  const [editItemDescription, setEditItemDescription] = useState('');
  const [applyingGigId, setApplyingGigId] = useState<string | null>(null);
  const [activeRouteCoords, setActiveRouteCoords] = useState<[number, number][] | null>(null);
  const [ratingValue, setRatingValue] = useState<number>(5);
  const [completedGigSuccess, setCompletedGigSuccess] = useState(false);
  const [fullScreenImageUrl, setFullScreenImageUrl] = useState<string | null>(null);

  const [buySuccess, setBuySuccess] = useState(false);
  const [itemRatingValue, setItemRatingValue] = useState<number>(5);
  const [completedItemSuccess, setCompletedItemSuccess] = useState(false);

  // Cancellation state
  const [cancellingGig, setCancellingGig] = useState<GigPost | null>(null);
  const [cancellationReasonInput, setCancellationReasonInput] = useState('');
  const [cancellationNotice, setCancellationNotice] = useState<{
    reason: string;
    cancelledByName: string;
    gigTitle: string;
  } | null>(null);

  // Document full screen viewer state
  const [fullScreenDoc, setFullScreenDoc] = useState<{ url: string; title: string } | null>(null);

  // User Profile Rating & Completed Count state
  const [userRating, setUserRating] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(USER_RATING_STORAGE_KEY);
      if (saved) return parseFloat(saved);
    } catch {}
    return 5.0;
  });
  const [completedCount, setCompletedCount] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(COMPLETED_COUNT_STORAGE_KEY);
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!Number.isNaN(parsed) && parsed >= 0) return parsed;
      }
    } catch {}
    return 0;
  });
  const [userAccountStatus, setUserAccountStatus] = useState<'active' | 'pending_review' | 'rejected' | 'Frozen'>(() => {
    try {
      const saved = localStorage.getItem(USER_STATUS_STORAGE_KEY);
      if (saved === 'active' || saved === 'pending_review' || saved === 'rejected' || saved === 'Frozen') {
        return saved;
      }
    } catch {}
    return 'active';
  });

  // Active subscription plan state: 'Tenant Sub' | 'User Sub' | null
  const [userSubscriptionPlan, setUserSubscriptionPlan] = useState<'Tenant Sub' | 'User Sub' | null>(() => {
    try {
      const saved = localStorage.getItem(USER_PLAN_STORAGE_KEY);
      if (saved === 'Tenant Sub' || saved === 'User Sub') return saved;
    } catch {}
    return null;
  });

  // User Profile face selfie logo
  const [userSelfieUrl, setUserSelfieUrl] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem(USER_SELFIE_STORAGE_KEY);
      if (saved && !saved.includes('photo-1534528741775-53994a69daeb')) {
        return saved;
      }
    } catch {}
    return null;
  });

  // Subscription expiry date for locked plan calculation
  const [subscriptionExpiresAt, setSubscriptionExpiresAt] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(USER_SUB_EXPIRY_KEY);
      if (saved) return parseInt(saved, 10);
    } catch {}
    return Date.now() + 28 * 24 * 60 * 60 * 1000;
  });

  // Real-time on-screen pop-up alert for new gig / item posts
  const [newPostAlert, setNewPostAlert] = useState<NewPostAlert | null>(null);

  // Tenant-configurable monthly subscription fees & trial days (editable inside App Menu)
  const [tenantSubFee, setTenantSubFee] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(TENANT_FEE_STORAGE_KEY);
      if (saved) {
        const parsed = parseFloat(saved);
        if (!Number.isNaN(parsed) && parsed > 0) return parsed;
      }
    } catch {}
    return 299.99;
  });
  const [userSubFee, setUserSubFee] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(USER_FEE_STORAGE_KEY);
      if (saved) {
        const parsed = parseFloat(saved);
        if (!Number.isNaN(parsed) && parsed > 0) return parsed;
      }
    } catch {}
    return 29.99;
  });
  const [trialDays, setTrialDays] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(TRIAL_DAYS_STORAGE_KEY);
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!Number.isNaN(parsed) && parsed >= 0) return parsed;
      }
    } catch {}
    return 7;
  });

  // App Menu inline editor inputs & feedback
  const [menuTenantFeeInput, setMenuTenantFeeInput] = useState<string>(() => tenantSubFee.toFixed(2));
  const [menuUserFeeInput, setMenuUserFeeInput] = useState<string>(() => userSubFee.toFixed(2));
  const [menuTrialDaysInput, setMenuTrialDaysInput] = useState<string>(() => String(trialDays));
  const [menuPricingSaved, setMenuPricingSaved] = useState(false);

  // Passive monthly income reminder popup for tenants
  const [showPassiveIncomeReminder, setShowPassiveIncomeReminder] = useState(true);
  const [reminderLinkCopied, setReminderLinkCopied] = useState(false);
  const [showAccountInfo, setShowAccountInfo] = useState(false);

  // Gigs, Items, Referrals, and Seekers state
  const [gigs, setGigs] = useState<GigPost[]>(loadInitialGigs);
  const [items, setItems] = useState<ItemForSale[]>(loadInitialItems);
  const [referrals, setReferrals] = useState<ReferralItem[]>(loadInitialReferrals);
  const [seekers, setSeekers] = useState<SeekerProfile[]>(loadInitialSeekers);

  // Main Tenant (timegig2026@gmail.com) configurable total Tenant Sub & User Sub signups
  const [totalTenantSubSignups, setTotalTenantSubSignups] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(MAIN_TENANT_SUB_SIGNUPS_KEY);
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!Number.isNaN(parsed) && parsed >= 0) return parsed;
      }
    } catch {}
    return 0;
  });
  const [totalUserSubSignups, setTotalUserSubSignups] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(MAIN_USER_SUB_SIGNUPS_KEY);
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!Number.isNaN(parsed) && parsed >= 0) return parsed;
      }
    } catch {}
    return 0;
  });

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ display_name: string; lat: string; lon: string; place_id: number }>>([]);
  const [isSearching, setIsSearching] = useState(false);

  const mapRef = useRef<L.Map | null>(null);
  const hasInteractedWithMapRef = useRef(false);
  const hasCenteredOnGpsRef = useRef(false);

  const [referrerEmail] = useState<string>(loadInitialReferrerEmail);

  const currencySymbol = getCurrencySymbol(userLocation.lat, userLocation.lng);
  const currentUserEmail = authUser?.email || '';
  const isMainTenant = currentUserEmail.trim().toLowerCase() === MAIN_TENANT_EMAIL;
  const isTenantUser = userSubscriptionPlan !== 'User Sub';

  const currentUserLower = currentUserEmail.trim().toLowerCase();
  const currentTenantReferralRecord = referrals.find(
    (r) => r.plan === 'Tenant Sub' && r.email.trim().toLowerCase() === currentUserLower
  );
  const currentReferralTenantLimit = Math.min(
    MAX_REFERRAL_TENANT_SUBS,
    Math.max(0, currentTenantReferralRecord?.assignedTotalTenants ?? MAX_REFERRAL_TENANT_SUBS)
  );
  const currentReferralUserLimit = Math.min(
    MAX_REFERRAL_USER_SUBS,
    Math.max(0, currentTenantReferralRecord?.assignedUserSubSignups ?? MAX_REFERRAL_USER_SUBS)
  );
  const currentReferralTenantSubUsed = referrals.filter(
    (r) =>
      !r.routedToMainTenant &&
      r.plan === 'Tenant Sub' &&
      r.status !== 'rejected' &&
      (r.referredByEmail || '').trim().toLowerCase() === currentUserLower
  ).length;
  const currentReferralUserSubUsed = referrals.filter(
    (r) =>
      !r.routedToMainTenant &&
      r.plan === 'User Sub' &&
      r.status !== 'rejected' &&
      (r.referredByEmail || '').trim().toLowerCase() === currentUserLower
  ).length;

  const authUserRef = useRef<User | null>(null);
  const hasTriggeredPostSplashRef = useRef(false);

  const handlePostSplashRedirect = () => {
    if (hasTriggeredPostSplashRef.current) return;
    hasTriggeredPostSplashRef.current = true;
    setShowSplash(false);
    if (!authUserRef.current) {
      setShowAuthModal(true);
    } else if (!userSubscriptionPlan) {
      setShowUpgradeModal(true);
    }
  };

  // Splash screen timer (2s), then direct to Sign Up / Sign In (or Upgrade if already signed in)
  useEffect(() => {
    const timer = window.setTimeout(() => {
      handlePostSplashRedirect();
    }, 2000);
    return () => window.clearTimeout(timer);
  }, []);

  // Smooth Escape key handling to close the topmost modal, lightbox, menu, or search dropdown
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (fullScreenDoc) {
        setFullScreenDoc(null);
      } else if (fullScreenImageUrl) {
        setFullScreenImageUrl(null);
      } else if (cancellingGig) {
        setCancellingGig(null);
      } else if (selectedGig) {
        setIsEditingGig(false);
        setSelectedGig(null);
      } else if (selectedItem) {
        setIsEditingItem(false);
        setSelectedItem(null);
      } else if (showAuthModal) {
        setShowAuthModal(false);
      } else if (showAccountModal) {
        setShowAccountModal(false);
      } else if (showPhoneMenu) {
        setShowPhoneMenu(false);
      } else if (
        showTenantModal ||
        showCreateGigModal ||
        showSellItemModal ||
        showReferralsModal ||
        showSeekersModal ||
        showProfileModal ||
        showUpgradeModal ||
        showSettingsModal
      ) {
        closeAllModals();
      } else if (searchResults.length > 0) {
        setSearchResults([]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    fullScreenDoc,
    fullScreenImageUrl,
    cancellingGig,
    selectedGig,
    selectedItem,
    showAuthModal,
    showAccountModal,
    showPhoneMenu,
    showTenantModal,
    showCreateGigModal,
    showSellItemModal,
    showReferralsModal,
    showSeekersModal,
    showProfileModal,
    showUpgradeModal,
    showSettingsModal,
    searchResults.length,
  ]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      authUserRef.current = user;
      setAuthUser(user);
      if (!user) {
        setShowAccountModal(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(GIGS_STORAGE_KEY, JSON.stringify(gigs));
    } catch {}
  }, [gigs]);

  useEffect(() => {
    try {
      localStorage.setItem(ITEMS_STORAGE_KEY, JSON.stringify(items));
    } catch {}
  }, [items]);

  useEffect(() => {
    try {
      localStorage.setItem(REFERRALS_STORAGE_KEY, JSON.stringify(referrals));
    } catch {}
  }, [referrals]);

  useEffect(() => {
    try {
      localStorage.setItem(SEEKERS_STORAGE_KEY, JSON.stringify(seekers));
    } catch {}
  }, [seekers]);

  useEffect(() => {
    try {
      localStorage.setItem(USER_RATING_STORAGE_KEY, String(userRating));
    } catch {}
  }, [userRating]);

  useEffect(() => {
    try {
      localStorage.setItem(COMPLETED_COUNT_STORAGE_KEY, String(completedCount));
    } catch {}
  }, [completedCount]);

  useEffect(() => {
    try {
      localStorage.setItem(USER_STATUS_STORAGE_KEY, userAccountStatus);
    } catch {}
  }, [userAccountStatus]);

  useEffect(() => {
    try {
      if (userSubscriptionPlan) {
        localStorage.setItem(USER_PLAN_STORAGE_KEY, userSubscriptionPlan);
      } else {
        localStorage.removeItem(USER_PLAN_STORAGE_KEY);
      }
    } catch {}
  }, [userSubscriptionPlan]);

  useEffect(() => {
    try {
      if (userSelfieUrl) {
        localStorage.setItem(USER_SELFIE_STORAGE_KEY, userSelfieUrl);
      }
    } catch {}
  }, [userSelfieUrl]);

  useEffect(() => {
    try {
      localStorage.setItem(USER_SUB_EXPIRY_KEY, String(subscriptionExpiresAt));
    } catch {}
  }, [subscriptionExpiresAt]);

  useEffect(() => {
    try {
      localStorage.setItem(TENANT_FEE_STORAGE_KEY, String(tenantSubFee));
      localStorage.setItem(USER_FEE_STORAGE_KEY, String(userSubFee));
      localStorage.setItem(TRIAL_DAYS_STORAGE_KEY, String(trialDays));
    } catch {}
  }, [tenantSubFee, userSubFee, trialDays]);

  useEffect(() => {
    try {
      localStorage.setItem(MAIN_TENANT_SUB_SIGNUPS_KEY, String(totalTenantSubSignups));
      localStorage.setItem(MAIN_USER_SUB_SIGNUPS_KEY, String(totalUserSubSignups));
    } catch {}
  }, [totalTenantSubSignups, totalUserSubSignups]);

  // Auto-dismiss new post pop-up alert after 7 seconds
  useEffect(() => {
    if (!newPostAlert) return;
    const timer = window.setTimeout(() => {
      setNewPostAlert(null);
    }, 7000);
    return () => window.clearTimeout(timer);
  }, [newPostAlert]);

  useEffect(() => {
    if (!('geolocation' in navigator)) return;

    const handlePosition = (pos: GeolocationPosition) => {
      const nextLoc: GeoLocationData = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        timestamp: pos.timestamp,
        source: 'gps',
      };
      setUserLocation(nextLoc);
      try {
        localStorage.setItem(LAST_LOCATION_STORAGE_KEY, JSON.stringify(nextLoc));
      } catch {}
      if (!hasCenteredOnGpsRef.current && !hasInteractedWithMapRef.current) {
        hasCenteredOnGpsRef.current = true;
        setFlyToTarget({
          lat: nextLoc.lat,
          lng: nextLoc.lng,
          zoom: 16,
          timestamp: Date.now(),
        });
      }
    };

    navigator.geolocation.getCurrentPosition(handlePosition, () => {}, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000,
    });

    const watchId = navigator.geolocation.watchPosition(handlePosition, () => {}, {
      enableHighAccuracy: true,
      maximumAge: 15000,
      timeout: 15000,
    });

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Handle location search query
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      setIsSearching(true);
      const results = await searchLocations(searchQuery);
      setSearchResults(results);
      setIsSearching(false);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectSuggestion = (latStr: string, lonStr: string, displayName: string) => {
    soundEngine.playFeatureClick();
    const lat = parseFloat(latStr);
    const lon = parseFloat(lonStr);
    setSearchQuery(displayName);
    setSearchResults([]);
    setFlyToTarget({
      lat,
      lng: lon,
      zoom: 16,
      timestamp: Date.now(),
    });
  };

  const handleBackToLocation = () => {
    soundEngine.playFeatureClick();
    setFlyToTarget({
      lat: userLocation.lat,
      lng: userLocation.lng,
      zoom: 16,
      timestamp: Date.now(),
    });
  };

  const handleZoomIn = () => {
    soundEngine.playFeatureClick();
    const map = mapRef.current;
    if (map) {
      map.zoomIn();
    }
  };

  const handleZoomOut = () => {
    soundEngine.playFeatureClick();
    const map = mapRef.current;
    if (map) {
      map.zoomOut();
    }
  };

  const handleSignOut = async () => {
    soundEngine.playFeatureClick();
    try {
      await signOut(auth);
      setShowAccountModal(false);
    } catch (err) {
      console.error('Sign out failed:', err);
    }
  };

  const closeAllModals = () => {
    setShowTenantModal(false);
    setShowCreateGigModal(false);
    setShowSellItemModal(false);
    setShowReferralsModal(false);
    setShowSeekersModal(false);
    setShowProfileModal(false);
    setShowUpgradeModal(false);
    setShowSettingsModal(false);
  };

  const handleBackToMenuFromFeature = () => {
    soundEngine.playFeatureClick();
    closeAllModals();
    setShowPhoneMenu(true);
  };

  const handleMenuFeatureClick = (featureKey: string) => {
    soundEngine.playFeatureClick();
    setShowPhoneMenu(false);
    if (featureKey === 'signin') {
      if (!authUser) {
        setShowAuthModal(true);
      } else {
        setShowAccountModal(true);
      }
      return;
    }
    if (!authUser) {
      setShowAuthModal(true);
      return;
    }
    closeAllModals();
    if (featureKey === 'tenant') {
      if (userSubscriptionPlan === 'User Sub' && userAccountStatus === 'active') return;
      setShowTenantModal(true);
    }
    else if (featureKey === 'create_gig') setShowCreateGigModal(true);
    else if (featureKey === 'sell_item') setShowSellItemModal(true);
    else if (featureKey === 'referrals') setShowReferralsModal(true);
    else if (featureKey === 'seekers') setShowSeekersModal(true);
    else if (featureKey === 'profile') {
      if (userSubscriptionPlan === 'Tenant Sub') return;
      setShowProfileModal(true);
    }
    else if (featureKey === 'upgrade') setShowUpgradeModal(true);
    else if (featureKey === 'settings') setShowSettingsModal(true);
  };

  const handleSaveMenuPricing = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedTenant = parseFloat(menuTenantFeeInput.replace(',', '.'));
    const parsedUser = parseFloat(menuUserFeeInput.replace(',', '.'));
    const parsedTrial = parseInt(menuTrialDaysInput, 10);
    if (!Number.isNaN(parsedTenant) && parsedTenant > 0) setTenantSubFee(parsedTenant);
    if (!Number.isNaN(parsedUser) && parsedUser > 0) setUserSubFee(parsedUser);
    if (!Number.isNaN(parsedTrial) && parsedTrial >= 0) setTrialDays(parsedTrial);
    soundEngine.playSuccessChime();
    setMenuPricingSaved(true);
    setTimeout(() => setMenuPricingSaved(false), 2200);
  };

  // Gig creation: auto fly to newly created gig, play chime sound and show on-screen pop-up alert
  const handleAddGig = (newGig: GigPost) => {
    const enrichedGig: GigPost = {
      ...newGig,
      creatorSelfieUrl: userSelfieUrl || newGig.creatorSelfieUrl,
    };
    setGigs((prev) => [enrichedGig, ...prev]);
    setFlyToTarget({
      lat: enrichedGig.lat,
      lng: enrichedGig.lng,
      zoom: 16,
      timestamp: Date.now(),
    });
    setSelectedGig(enrichedGig);

    // Audio chime sound whenever there is a new gig post
    soundEngine.playNewPostNotification();

    // On-screen pop-up alert
    setNewPostAlert({
      id: enrichedGig.gigId,
      type: 'gig',
      title: enrichedGig.title,
      priceOrBudget: enrichedGig.budget,
      creatorOrSeller: enrichedGig.creatorName,
      locationName: enrichedGig.locationName,
      lat: enrichedGig.lat,
      lng: enrichedGig.lng,
      category: enrichedGig.category,
      imageUrl: enrichedGig.creatorSelfieUrl,
      timestamp: Date.now(),
    });
  };

  // Item creation: auto fly to newly created item, play chime sound and show on-screen pop-up alert
  const handleAddItem = (newItem: ItemForSale) => {
    setItems((prev) => [newItem, ...prev]);
    setFlyToTarget({
      lat: newItem.lat,
      lng: newItem.lng,
      zoom: 16,
      timestamp: Date.now(),
    });
    setSelectedItem(newItem);

    // Audio chime sound whenever there is a new item post
    soundEngine.playNewPostNotification();

    // On-screen pop-up alert
    setNewPostAlert({
      id: newItem.itemId,
      type: 'item',
      title: newItem.title,
      priceOrBudget: newItem.price,
      creatorOrSeller: newItem.sellerName,
      locationName: newItem.locationName,
      lat: newItem.lat,
      lng: newItem.lng,
      category: newItem.category,
      imageUrl: newItem.photoUrls?.[0],
      timestamp: Date.now(),
    });
  };

  // Edit / Delete gig
  const handleStartEditGig = (gig: GigPost) => {
    soundEngine.playFeatureClick();
    setEditGigTitle(gig.title);
    setEditGigBudget(gig.budget);
    setEditGigDescription(gig.description);
    setIsEditingGig(true);
  };

  const handleSaveEditGig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGig || !editGigTitle.trim()) return;
    soundEngine.playSuccessChime();
    const updated: GigPost = {
      ...selectedGig,
      title: editGigTitle.trim(),
      budget: editGigBudget.trim() || selectedGig.budget,
      description: editGigDescription.trim() || selectedGig.description,
    };
    setGigs((prev) => prev.map((g) => (g.gigId === updated.gigId ? updated : g)));
    setSelectedGig(updated);
    setIsEditingGig(false);
  };

  const handleDeleteGig = (gigId: string) => {
    soundEngine.playFeatureClick();
    setGigs((prev) => prev.filter((g) => g.gigId !== gigId));
    setIsEditingGig(false);
    setSelectedGig(null);
  };

  // Edit / Delete item
  const handleStartEditItem = (item: ItemForSale) => {
    soundEngine.playFeatureClick();
    setEditItemTitle(item.title);
    setEditItemPrice(item.price);
    setEditItemDescription(item.description);
    setIsEditingItem(true);
  };

  const handleSaveEditItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !editItemTitle.trim()) return;
    soundEngine.playSuccessChime();
    const updated: ItemForSale = {
      ...selectedItem,
      title: editItemTitle.trim(),
      price: editItemPrice.trim() || selectedItem.price,
      description: editItemDescription.trim() || selectedItem.description,
    };
    setItems((prev) => prev.map((i) => (i.itemId === updated.itemId ? updated : i)));
    setSelectedItem(updated);
    setIsEditingItem(false);
  };

  const handleDeleteItem = (itemId: string) => {
    soundEngine.playFeatureClick();
    setItems((prev) => prev.filter((i) => i.itemId !== itemId));
    setIsEditingItem(false);
    setSelectedItem(null);
  };

  // Apply to gig flow: circular loader waiting for owner acceptance
  const handleApplyToGig = async (gig: GigPost) => {
    soundEngine.playFeatureClick();
    setApplyingGigId(gig.gigId);

    // Simulate waiting for owner acceptance for 3 seconds, then accept and route navigation
    setTimeout(async () => {
      setApplyingGigId(null);
      soundEngine.playSuccessChime();

      // Fetch route from user location to gig owner destination
      const route = await fetchRoute([userLocation.lat, userLocation.lng], [gig.lat, gig.lng]);
      if (route) {
        setActiveRouteCoords(route);
      }
      setSelectedGig({
        ...gig,
        applicationStatus: 'accepted',
        applicantUid: currentUserEmail,
        applicantName: currentUserEmail.split('@')[0],
      });
    }, 3000);
  };

  // Owner completes gig and gives star rating to user
  const handleCompleteGig = (gig: GigPost) => {
    soundEngine.playSuccessChime();
    setCompletedGigSuccess(true);

    const applicantEmail = gig.applicantUid || '';
    const applicantName = gig.applicantName || 'Seeker';

    // Update global user rating & completed count
    setUserRating((prevRating) => {
      const nextRating = Number(((prevRating * completedCount + ratingValue) / (completedCount + 1)).toFixed(1));
      try {
        localStorage.setItem(USER_RATING_STORAGE_KEY, String(nextRating));
      } catch {}
      return nextRating;
    });

    setCompletedCount((prev) => {
      const nextCount = prev + 1;
      try {
        localStorage.setItem(COMPLETED_COUNT_STORAGE_KEY, String(nextCount));
      } catch {}
      return nextCount;
    });

    // Also update matching seeker in seekers list
    setSeekers((prev) =>
      prev.map((s) => {
        if (s.uid === applicantEmail || s.name.toLowerCase() === applicantName.toLowerCase()) {
          const newSeekerRating = Number(((s.rating * s.completedGigsCount + ratingValue) / (s.completedGigsCount + 1)).toFixed(1));
          return {
            ...s,
            rating: newSeekerRating,
            completedGigsCount: s.completedGigsCount + 1,
          };
        }
        return s;
      })
    );

    setTimeout(() => {
      setCompletedGigSuccess(false);
      setGigs((prev) => prev.filter((g) => g.gigId !== gig.gigId));
      setSelectedGig(null);
      setActiveRouteCoords(null);
    }, 2000);
  };

  // Owner/Seller completes item purchase and gives star rating to buyer
  const handleCompleteItem = (item: ItemForSale) => {
    soundEngine.playSuccessChime();
    setCompletedItemSuccess(true);

    setUserRating((prevRating) => {
      const nextRating = Number(((prevRating * completedCount + itemRatingValue) / (completedCount + 1)).toFixed(1));
      try {
        localStorage.setItem(USER_RATING_STORAGE_KEY, String(nextRating));
      } catch {}
      return nextRating;
    });

    setCompletedCount((prev) => {
      const nextCount = prev + 1;
      try {
        localStorage.setItem(COMPLETED_COUNT_STORAGE_KEY, String(nextCount));
      } catch {}
      return nextCount;
    });

    setTimeout(() => {
      setCompletedItemSuccess(false);
      setItems((prev) => prev.filter((i) => i.itemId !== item.itemId));
      setSelectedItem(null);
    }, 2000);
  };

  // Initiate cancel gig navigation
  const handleInitiateCancelNavigation = (gig: GigPost) => {
    soundEngine.playFeatureClick();
    setCancellingGig(gig);
    setCancellationReasonInput('');
  };

  // Confirm cancel gig navigation with mandatory reason
  const handleConfirmCancelNavigation = () => {
    if (!cancellingGig) return;
    const trimmedReason = cancellationReasonInput.trim();
    if (!trimmedReason) return;

    soundEngine.playFeatureClick();
    const canceller = authUser?.displayName || authUser?.email?.split('@')[0] || 'User';

    // Clear navigation coordinates on the map
    setActiveRouteCoords(null);

    const updatedGig: GigPost = {
      ...cancellingGig,
      status: 'cancelled',
      applicationStatus: 'none',
      cancellationReason: trimmedReason,
      cancelledByName: canceller,
      cancelledByUid: currentUserEmail,
    };

    setGigs((prev) => prev.map((g) => (g.gigId === cancellingGig.gigId ? updatedGig : g)));
    if (selectedGig?.gigId === cancellingGig.gigId) {
      setSelectedGig(updatedGig);
    }

    // Notice alert displayed on screen for both parties
    setCancellationNotice({
      reason: trimmedReason,
      cancelledByName: canceller,
      gigTitle: cancellingGig.title,
    });

    setCancellingGig(null);
    setCancellationReasonInput('');
  };

  // Referrals submissions and approval (enforce max 10 Tenant Subs & 100 User Subs for referral Tenants)
  const handleNewReferralSubmission = (submission: NewReferralSubmissionPayload): string | null => {
    const activeReferrerEmail = (submission.referredByEmail || referrerEmail || MAIN_TENANT_EMAIL).trim().toLowerCase();
    const referrerRecord = referrals.find(
      (r) => r.email.trim().toLowerCase() === activeReferrerEmail
    );
    const isReferrerUserSub =
      referrerRecord?.plan === 'User Sub' ||
      (activeReferrerEmail === currentUserEmail.trim().toLowerCase() && userSubscriptionPlan === 'User Sub');
    const isReferralTenantReferrer = activeReferrerEmail !== MAIN_TENANT_EMAIL && !isReferrerUserSub;

    if (isReferralTenantReferrer) {
      const tenantCap = Math.min(
        MAX_REFERRAL_TENANT_SUBS,
        Math.max(0, referrerRecord?.assignedTotalTenants ?? MAX_REFERRAL_TENANT_SUBS)
      );
      const userCap = Math.min(
        MAX_REFERRAL_USER_SUBS,
        Math.max(0, referrerRecord?.assignedUserSubSignups ?? MAX_REFERRAL_USER_SUBS)
      );
      const usedTenantSubs = referrals.filter(
        (r) =>
          !r.routedToMainTenant &&
          r.plan === 'Tenant Sub' &&
          r.status !== 'rejected' &&
          (r.referredByEmail || '').trim().toLowerCase() === activeReferrerEmail
      ).length;
      const usedUserSubs = referrals.filter(
        (r) =>
          !r.routedToMainTenant &&
          r.plan === 'User Sub' &&
          r.status !== 'rejected' &&
          (r.referredByEmail || '').trim().toLowerCase() === activeReferrerEmail
      ).length;

      if (submission.plan === 'Tenant Sub' && usedTenantSubs >= tenantCap) {
        return `Limit reached: Referral Tenants who joined through ${MAIN_TENANT_EMAIL} can only sign up ${tenantCap} Tenant Subs.`;
      }
      if (submission.plan === 'User Sub' && usedUserSubs >= userCap) {
        return `Limit reached: Referral Tenants who joined through ${MAIN_TENANT_EMAIL} can only sign up ${userCap} User Subs.`;
      }
    }

    const joinedViaMain = submission.plan === 'Tenant Sub' && activeReferrerEmail === MAIN_TENANT_EMAIL;

    const newRef: ReferralItem = {
      id: submission.id,
      name: submission.name,
      email: submission.email,
      plan: submission.plan,
      profit: submission.profit,
      date: 'Just now',
      status: 'pending_review',
      selfieUrl: submission.selfieUrl,
      idDocuments: submission.idDocuments,
      paymentDocuments: submission.paymentDocuments,
      referredByEmail: activeReferrerEmail,
      referredByPlan: isReferrerUserSub ? 'User Sub' : 'Tenant Sub',
      routedToMainTenant: isReferrerUserSub,
      joinedViaMainTenantLink: joinedViaMain,
      assignedTotalTenants: joinedViaMain ? MAX_REFERRAL_TENANT_SUBS : undefined,
      assignedUserSubSignups: joinedViaMain ? MAX_REFERRAL_USER_SUBS : undefined,
    };
    setReferrals((prev) => [newRef, ...prev]);
    if (submission.email && submission.email === currentUserEmail) {
      setUserAccountStatus('pending_review');
      setUserSubscriptionPlan(submission.plan);
      if (submission.selfieUrl) {
        setUserSelfieUrl(submission.selfieUrl);
      }
    }
    return null;
  };

  // Main Tenant only: set Total Tenants & User Sub Signups for Tenants who joined via Main Tenant link (capped at 10 & 100)
  const handleUpdateTenantQuotas = (id: string, totalTenants: number, userSubSignups: number) => {
    if (!isMainTenant) return;
    const clampedTenants = Math.min(MAX_REFERRAL_TENANT_SUBS, Math.max(0, totalTenants));
    const clampedUsers = Math.min(MAX_REFERRAL_USER_SUBS, Math.max(0, userSubSignups));
    setReferrals((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              assignedTotalTenants: clampedTenants,
              assignedUserSubSignups: clampedUsers,
            }
          : r
      )
    );
  };

  // Main Tenant (timegig2026@gmail.com) only: set Total Number of Signups for Tenant Sub & User Sub
  const handleUpdateMainSignups = (tenantSignups: number, userSignups: number) => {
    if (!isMainTenant) return;
    setTotalTenantSubSignups(Math.max(0, tenantSignups));
    setTotalUserSubSignups(Math.max(0, userSignups));
  };

  const handleUpdateReferralStatus = (
    id: string,
    newStatus: 'approved' | 'rejected' | 'Frozen',
    reason?: string
  ) => {
    setReferrals((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target && newStatus === 'approved' && !target.routedToMainTenant) {
        const refBy = (target.referredByEmail || '').trim().toLowerCase();
        if (refBy && refBy !== MAIN_TENANT_EMAIL) {
          const referrerTenant = prev.find((r) => r.plan === 'Tenant Sub' && r.email.trim().toLowerCase() === refBy);
          const cap =
            target.plan === 'Tenant Sub'
              ? Math.min(MAX_REFERRAL_TENANT_SUBS, Math.max(0, referrerTenant?.assignedTotalTenants ?? MAX_REFERRAL_TENANT_SUBS))
              : Math.min(MAX_REFERRAL_USER_SUBS, Math.max(0, referrerTenant?.assignedUserSubSignups ?? MAX_REFERRAL_USER_SUBS));
          const alreadyApproved = prev.filter(
            (r) =>
              r.id !== id &&
              !r.routedToMainTenant &&
              r.plan === target.plan &&
              r.status === 'approved' &&
              (r.referredByEmail || '').trim().toLowerCase() === refBy
          ).length;
          if (alreadyApproved >= cap) {
            return prev;
          }
        }
      }

      return prev.map((r) => {
        if (r.id === id) {
          const updated: ReferralItem = {
            ...r,
            status: newStatus,
            rejectionReason: reason || r.rejectionReason,
          };
          if (r.email === currentUserEmail) {
            setUserAccountStatus(newStatus === 'approved' ? 'active' : newStatus === 'rejected' ? 'rejected' : 'Frozen');
            if (newStatus === 'approved') {
              setUserSubscriptionPlan(r.plan);
              if (r.selfieUrl) {
                setUserSelfieUrl(r.selfieUrl);
              }
              setSubscriptionExpiresAt(Date.now() + 30 * 24 * 60 * 60 * 1000);
            }
          }
          return updated;
        }
        return r;
      });
    });
  };

  const handleViewDocFullScreen = (imageUrl: string, title: string) => {
    soundEngine.playFeatureClick();
    setFullScreenDoc({ url: imageUrl, title });
  };

  const displayName =
    authUser?.displayName?.trim() || authUser?.email?.split('@')[0] || 'Sign In';

  return (
    <ErrorBoundary>
      <div className="relative h-[100dvh] w-screen overflow-hidden bg-slate-950 select-none">
        <MapView
          userLocation={userLocation}
          selectedTile="satellite"
          flyToTarget={flyToTarget}
          mapRef={mapRef}
          gigs={gigs}
          items={items}
          navigationRouteCoords={activeRouteCoords}
          onSelectGig={(gig) => {
            soundEngine.playFeatureClick();
            setIsEditingGig(false);
            setSelectedGig(gig);
          }}
          onSelectItem={(item) => {
            soundEngine.playFeatureClick();
            setIsEditingItem(false);
            setSelectedItem(item);
          }}
          onUserInteract={() => {
            hasInteractedWithMapRef.current = true;
          }}
          onMapClick={() => {
            if (searchResults.length > 0) setSearchResults([]);
          }}
        />

        {/* Splash Screen Displaying Only the App Name */}
        {showSplash && (
          <div
            className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200 cursor-pointer p-6 text-center"
            onClick={handlePostSplashRedirect}
          >
            <h1 className="text-5xl sm:text-6xl font-black text-white tracking-tight drop-shadow-lg animate-in zoom-in-95 duration-200">
              TimeGiG
            </h1>
          </div>
        )}

        {/* Top Search Bar */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[160] w-11/12 max-w-lg">
          <div className="relative">
            {isSearching ? (
              <Loader2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-600 animate-spin pointer-events-none" />
            ) : (
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            )}
            <input
              type="text"
              placeholder="Search map location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full min-h-[46px] pl-11 pr-10 py-3 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-2xl shadow-2xl text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-shadow"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {searchResults.length > 0 && (
              <div className="absolute left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden max-h-72 overflow-y-auto z-[170] animate-in fade-in slide-in-from-top-1 duration-150">
                {searchResults.map((item) => (
                  <button
                    key={item.place_id}
                    type="button"
                    onClick={() => handleSelectSuggestion(item.lat, item.lon, item.display_name)}
                    className="w-full text-left px-4 py-3 text-xs font-semibold text-slate-800 hover:bg-blue-50 active:bg-blue-100 transition-colors flex items-center gap-2.5 border-b border-slate-100 last:border-0 cursor-pointer"
                  >
                    <Globe className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span className="truncate">{item.display_name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Active Gig Navigation Floating HUD */}
        {activeRouteCoords && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[160] w-11/12 max-w-md bg-white border border-blue-200 rounded-2xl shadow-2xl p-3.5 flex items-center justify-between gap-3 text-slate-900 animate-in slide-in-from-top duration-200">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 animate-pulse shadow-md">
                <Navigation className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-black text-slate-900 truncate">
                  Active Gig Navigation
                </div>
                <div className="text-[10px] text-blue-600 font-bold truncate">
                  {selectedGig ? selectedGig.title : 'Route to owner destination on map'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  const targetGig = selectedGig || gigs.find((g) => g.applicationStatus === 'accepted') || gigs[0];
                  if (targetGig) handleInitiateCancelNavigation(targetGig);
                }}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl cursor-pointer transition-all"
              >
                Cancel Navigation
              </button>
            </div>
          </div>
        )}

        {/* Mutual Cancellation Notice Banner */}
        {cancellationNotice && (
          <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[260] w-11/12 max-w-lg bg-rose-50 border-2 border-rose-400 rounded-2xl shadow-2xl p-4 text-slate-900 animate-in slide-in-from-top duration-200 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="text-xs font-black text-rose-950">
                  Gig Navigation Cancelled by {cancellationNotice.cancelledByName}
                </div>
                <p className="text-xs text-rose-800 font-medium leading-relaxed">
                  Reason provided: <strong>&ldquo;{cancellationNotice.reason}&rdquo;</strong>
                </p>
                <div className="text-[10px] text-rose-600 font-semibold">
                  Gig: {cancellationNotice.gigTitle}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setCancellationNotice(null)}
              className="w-7 h-7 rounded-full bg-rose-100 hover:bg-rose-200 text-rose-700 flex items-center justify-center cursor-pointer shrink-0"
              aria-label="Dismiss notice"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Real-time New Gig / Item Post Alert Pop-Up with Sound */}
        {newPostAlert && (
          <div
            className="fixed top-20 right-4 sm:right-6 z-[260] w-[92vw] max-w-sm bg-white border-2 border-emerald-400 rounded-3xl shadow-2xl p-4 text-slate-950 animate-in slide-in-from-top-4 duration-300 ring-4 ring-emerald-500/20"
            role="alert"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                {newPostAlert.imageUrl ? (
                  <img
                    src={newPostAlert.imageUrl}
                    alt={newPostAlert.creatorOrSeller}
                    className="w-12 h-12 rounded-2xl object-cover border-2 border-emerald-500 shrink-0 shadow-sm"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 font-black text-xl flex items-center justify-center shrink-0 border border-emerald-300">
                    {newPostAlert.type === 'gig' ? '💵' : '🛍️'}
                  </div>
                )}

                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">
                      {newPostAlert.type === 'gig' ? 'New Gig Live Alert' : 'New Item for Sale Alert'}
                    </span>
                  </div>
                  <h4 className="text-sm font-black text-slate-950 truncate leading-snug">
                    {newPostAlert.title}
                  </h4>
                  <div className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                    <span>{newPostAlert.priceOrBudget}</span>
                    <span className="text-slate-400 font-normal">•</span>
                    <span className="text-slate-500 font-medium truncate">{newPostAlert.locationName}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setNewPostAlert(null)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center cursor-pointer shrink-0"
                aria-label="Close notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  soundEngine.playFeatureClick();
                  setFlyToTarget({
                    lat: newPostAlert.lat,
                    lng: newPostAlert.lng,
                    zoom: 17,
                    timestamp: Date.now(),
                  });
                  if (newPostAlert.type === 'gig') {
                    const gigMatch = gigs.find((g) => g.gigId === newPostAlert.id);
                    if (gigMatch) setSelectedGig(gigMatch);
                  } else {
                    const itemMatch = items.find((i) => i.itemId === newPostAlert.id);
                    if (itemMatch) setSelectedItem(itemMatch);
                  }
                  setNewPostAlert(null);
                }}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 cursor-pointer transition-transform active:scale-95"
              >
                <span>View on Map</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setNewPostAlert(null)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Passive Monthly Income Reminder Popup for Tenants */}
        {!showSplash && authUser && isTenantUser && showPassiveIncomeReminder && !newPostAlert && (
          <div
            className="fixed bottom-4 left-4 z-[155] w-[88vw] max-w-xs sm:max-w-sm bg-white border-2 border-emerald-400 rounded-3xl shadow-2xl p-4 text-slate-950 animate-in slide-in-from-bottom-4 duration-300"
            role="status"
          >
            <div className="flex items-start justify-between gap-2.5">
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="space-y-0.5">
                  <div className="text-xs font-black text-emerald-950">
                    Passive Monthly Income Reminder
                  </div>
                  <p className="text-[11px] text-slate-700 font-medium leading-snug">
                    Share your <strong>Tenant Referral Link</strong> to earn passive monthly income from User Sub & Tenant Sub signups!
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPassiveIncomeReminder(false)}
                aria-label="Dismiss reminder"
                className="w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  soundEngine.playFeatureClick();
                  const tenantLink = `https://timegig.app/ref/tenant_${encodeURIComponent(currentUserEmail)}`;
                  navigator.clipboard.writeText(tenantLink);
                  setReminderLinkCopied(true);
                  setTimeout(() => setReminderLinkCopied(false), 2200);
                }}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[11px] rounded-xl shadow-sm cursor-pointer transition-all"
              >
                {reminderLinkCopied ? 'Link Copied!' : 'Copy Tenant Link'}
              </button>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playFeatureClick();
                  setShowPassiveIncomeReminder(false);
                  setShowTenantModal(true);
                }}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[11px] rounded-xl cursor-pointer"
              >
                Open Tenant
              </button>
            </div>
          </div>
        )}

        {/* Right Floating Map Controls: Menu on top of locator, then locator, zoom in, zoom out */}
        <div className="absolute bottom-20 right-4 z-[150] flex flex-col gap-2.5 items-end">
          <button
            type="button"
            onClick={() => {
              soundEngine.playFeatureClick();
              setShowPhoneMenu((prev) => !prev);
            }}
            title="Open App Menu"
            aria-label="Open App Menu"
            className="w-11 h-11 bg-white hover:bg-slate-50 border border-slate-200 rounded-full shadow-2xl flex items-center justify-center text-slate-900 transition-transform active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <LayoutGrid className="w-5 h-5 text-blue-600" />
          </button>
          <button
            type="button"
            onClick={handleBackToLocation}
            title="Re-center to my location"
            aria-label="Re-center to my location"
            className="w-11 h-11 bg-white hover:bg-slate-50 border border-slate-200 rounded-full shadow-2xl flex items-center justify-center text-blue-600 transition-transform active:scale-95 cursor-pointer"
          >
            <LocateFixed className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={handleZoomIn}
            title="Zoom In"
            aria-label="Zoom In"
            className="w-11 h-11 bg-white hover:bg-slate-50 border border-slate-200 rounded-full shadow-2xl flex items-center justify-center text-slate-900 transition-transform active:scale-95 cursor-pointer"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            title="Zoom Out"
            aria-label="Zoom Out"
            className="w-11 h-11 bg-white hover:bg-slate-50 border border-slate-200 rounded-full shadow-2xl flex items-center justify-center text-slate-900 transition-transform active:scale-95 cursor-pointer"
          >
            <Minus className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Centered App Menu Modal with Heavy Blur Background & White Theme */}
        {showPhoneMenu && (
          <div
            className="fixed inset-0 z-[220] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-150"
            onClick={() => setShowPhoneMenu(false)}
          >
            <div
              className="w-full max-w-sm sm:max-w-md bg-white border border-slate-200 rounded-3xl shadow-2xl p-5 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150 text-slate-950"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-200">
                <div className="text-sm font-black uppercase tracking-wider text-slate-900">
                  App Menu
                </div>
                <button
                  type="button"
                  onClick={() => setShowPhoneMenu(false)}
                  aria-label="Close menu"
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {!(userSubscriptionPlan === 'User Sub' && userAccountStatus === 'active') && (
                  <button
                    type="button"
                    onClick={() => handleMenuFeatureClick('tenant')}
                    className="flex flex-col items-center justify-center gap-2 p-3 rounded-2xl bg-slate-50 hover:bg-blue-50 border border-slate-200 transition-all cursor-pointer active:scale-95 group"
                  >
                    <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                      <span className="text-lg">💳</span>
                    </div>
                    <span className="text-xs font-black tracking-tight text-slate-900 text-center">
                      Tenant
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleMenuFeatureClick('create_gig')}
                  className="flex flex-col items-center justify-center gap-2 p-3 rounded-2xl bg-slate-50 hover:bg-amber-50 border border-slate-200 transition-all cursor-pointer active:scale-95 group"
                >
                  <div className="w-11 h-11 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                    <span className="text-lg">💼</span>
                  </div>
                  <span className="text-xs font-black tracking-tight text-slate-900 text-center">
                    Create Gig
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleMenuFeatureClick('sell_item')}
                  className="flex flex-col items-center justify-center gap-2 p-3 rounded-2xl bg-slate-50 hover:bg-emerald-50 border border-slate-200 transition-all cursor-pointer active:scale-95 group"
                >
                  <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                    <span className="text-lg">🛍️</span>
                  </div>
                  <span className="text-xs font-black tracking-tight text-slate-900 text-center">
                    Sell Item
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleMenuFeatureClick('referrals')}
                  className="flex flex-col items-center justify-center gap-2 p-3 rounded-2xl bg-slate-50 hover:bg-purple-50 border border-slate-200 transition-all cursor-pointer active:scale-95 group"
                >
                  <div className="w-11 h-11 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                    <span className="text-lg">🌐</span>
                  </div>
                  <span className="text-xs font-black tracking-tight text-slate-900 text-center">
                    Referrals
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleMenuFeatureClick('seekers')}
                  className="flex flex-col items-center justify-center gap-2 p-3 rounded-2xl bg-slate-50 hover:bg-cyan-50 border border-slate-200 transition-all cursor-pointer active:scale-95 group"
                >
                  <div className="w-11 h-11 rounded-2xl bg-cyan-600 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                    <span className="text-lg">👥</span>
                  </div>
                  <span className="text-xs font-black tracking-tight text-slate-900 text-center">
                    Seekers
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleMenuFeatureClick('upgrade')}
                  className="flex flex-col items-center justify-center gap-2 p-3 rounded-2xl bg-slate-50 hover:bg-amber-50 border border-slate-200 transition-all cursor-pointer active:scale-95 group"
                >
                  <div className="w-11 h-11 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                    <span className="text-lg">👑</span>
                  </div>
                  <span className="text-xs font-black tracking-tight text-slate-900 text-center">
                    Upgrade
                  </span>
                </button>

                {userSubscriptionPlan !== 'Tenant Sub' && (
                  <button
                    type="button"
                    onClick={() => handleMenuFeatureClick('profile')}
                    className="flex flex-col items-center justify-center gap-2 p-3 rounded-2xl bg-slate-50 hover:bg-indigo-50 border border-slate-200 transition-all cursor-pointer active:scale-95 group"
                  >
                    <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                      <span className="text-lg">👤</span>
                    </div>
                    <span className="text-xs font-black tracking-tight text-slate-900 text-center">
                      Profile
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleMenuFeatureClick('settings')}
                  className="flex flex-col items-center justify-center gap-2 p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-all cursor-pointer active:scale-95 group"
                >
                  <div className="w-11 h-11 rounded-2xl bg-slate-800 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                    <span className="text-lg">⚙️</span>
                  </div>
                  <span className="text-xs font-black tracking-tight text-slate-900 text-center">
                    Settings
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleMenuFeatureClick('signin')}
                  className="flex flex-col items-center justify-center gap-2 p-3 rounded-2xl bg-slate-50 hover:bg-blue-50 border border-slate-200 transition-all cursor-pointer active:scale-95 group col-span-3"
                >
                  <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                    <span className="text-lg">🔐</span>
                  </div>
                  <span className="text-xs font-black tracking-tight text-slate-900 text-center">
                    {authUser ? `Account (${displayName})` : 'Sign In'}
                  </span>
                </button>
              </div>

              {/* Tenant Pricing & Trial Days Controls Inside App Menu */}
              {isTenantUser && (
                <form
                  onSubmit={handleSaveMenuPricing}
                  className="mt-4 pt-3.5 border-t border-slate-200 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-800">
                      Tenant Subscription Fee & Trial Days
                    </span>
                    {menuPricingSaved && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        Saved
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Tenant Fee (R)</label>
                      <input
                        type="number"
                        step="0.01"
                        min={1}
                        value={menuTenantFeeInput}
                        onChange={(e) => setMenuTenantFeeInput(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">User Fee (R)</label>
                      <input
                        type="number"
                        step="0.01"
                        min={1}
                        value={menuUserFeeInput}
                        onChange={(e) => setMenuUserFeeInput(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Trial Days</label>
                      <input
                        type="number"
                        min={0}
                        value={menuTrialDaysInput}
                        onChange={(e) => setMenuTrialDaysInput(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl cursor-pointer transition-all active:scale-95"
                  >
                    Update Monthly Fees & Trial Days
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Feature Modals */}
        <TenantModal
          isOpen={showTenantModal && !(userSubscriptionPlan === 'User Sub' && userAccountStatus === 'active')}
          onClose={() => setShowTenantModal(false)}
          onBackToMenu={handleBackToMenuFromFeature}
          userEmail={currentUserEmail}
          currencySymbol={currencySymbol}
          userSelfieUrl={userSelfieUrl}
          onUpdateSelfie={(url) => setUserSelfieUrl(url)}
          isMainTenant={isMainTenant}
          joinedTenants={referrals.filter((r) => r.plan === 'Tenant Sub' && r.joinedViaMainTenantLink)}
          onUpdateJoinedTenantQuotas={handleUpdateTenantQuotas}
          tenantSubFee={tenantSubFee}
          userSubFee={userSubFee}
          trialDays={trialDays}
          totalTenantSubSignups={totalTenantSubSignups}
          totalUserSubSignups={totalUserSubSignups}
          onUpdateMainSignups={handleUpdateMainSignups}
          referralTenantSubCount={currentReferralTenantSubUsed}
          referralUserSubCount={currentReferralUserSubUsed}
          referralTenantSubLimit={currentReferralTenantLimit}
          referralUserSubLimit={currentReferralUserLimit}
        />

        <CreateGigModal
          isOpen={showCreateGigModal}
          onClose={() => setShowCreateGigModal(false)}
          onBackToMenu={handleBackToMenuFromFeature}
          userLocation={userLocation}
          gigs={gigs}
          onAddGig={handleAddGig}
          currentUserEmail={authUser?.email || null}
          currencySymbol={currencySymbol}
        />

        <SellItemModal
          isOpen={showSellItemModal}
          onClose={() => setShowSellItemModal(false)}
          onBackToMenu={handleBackToMenuFromFeature}
          userLocation={userLocation}
          items={items}
          onAddItem={handleAddItem}
          currentUserEmail={authUser?.email || null}
          currencySymbol={currencySymbol}
        />

        <ReferralsModal
          isOpen={showReferralsModal}
          onClose={() => setShowReferralsModal(false)}
          onBackToMenu={handleBackToMenuFromFeature}
          userEmail={currentUserEmail}
          currencySymbol={currencySymbol}
          referrals={referrals}
          onUpdateReferralStatus={handleUpdateReferralStatus}
          onViewDocFullScreen={handleViewDocFullScreen}
          isMainTenant={isMainTenant}
          userSubscriptionPlan={userSubscriptionPlan}
          onUpdateTenantQuotas={handleUpdateTenantQuotas}
          referralTenantSubLimit={currentReferralTenantLimit}
          referralUserSubLimit={currentReferralUserLimit}
        />

        <SeekersModal
          isOpen={showSeekersModal}
          onClose={() => setShowSeekersModal(false)}
          onBackToMenu={handleBackToMenuFromFeature}
          currencySymbol={currencySymbol}
          seekers={seekers}
        />

        <ProfileModal
          isOpen={showProfileModal && userSubscriptionPlan !== 'Tenant Sub'}
          onClose={() => setShowProfileModal(false)}
          onBackToMenu={handleBackToMenuFromFeature}
          userEmail={currentUserEmail}
          displayName={displayName}
          userRating={userRating}
          completedCount={completedCount}
          accountStatus={userAccountStatus}
          subscriptionPlan={userSubscriptionPlan}
          userSelfieUrl={userSelfieUrl}
          onUpdateSelfie={(url) => setUserSelfieUrl(url)}
        />

        <UpgradeModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          onBackToMenu={handleBackToMenuFromFeature}
          currencySymbol={currencySymbol}
          userEmail={currentUserEmail}
          onSubmissionSuccess={handleNewReferralSubmission}
          isApproved={userAccountStatus === 'active' && userSubscriptionPlan !== null && subscriptionExpiresAt > Date.now()}
          activePlan={userSubscriptionPlan}
          subscriptionExpiresAt={subscriptionExpiresAt}
          tenantSubFee={tenantSubFee}
          userSubFee={userSubFee}
          trialDays={trialDays}
          defaultReferrerEmail={referrerEmail}
        />

        <SettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          onBackToMenu={handleBackToMenuFromFeature}
        />

        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onAuthCompleted={() => {
            closeAllModals();
            setShowPhoneMenu(false);
            setShowUpgradeModal(true);
          }}
        />

        {/* Selected Gig Details Popup Modal with Profile Logo, Edit/Delete, and Acceptance/Completion Flow */}
        {selectedGig && (
          <div
            className="fixed inset-0 z-[235] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-150"
            onClick={() => {
              setIsEditingGig(false);
              setSelectedGig(null);
            }}
          >
            <div
              className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 text-slate-950 space-y-4 max-h-[90dvh] overflow-y-auto animate-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-3">
                  {selectedGig.creatorSelfieUrl ? (
                    <img
                      src={selectedGig.creatorSelfieUrl}
                      alt={selectedGig.creatorName}
                      className="w-12 h-12 rounded-full object-cover border-2 border-amber-400 shrink-0 shadow-sm"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 font-bold flex items-center justify-center shrink-0">
                      {selectedGig.creatorName.charAt(0)}
                    </div>
                  )}
                  <div>
                    <h3 className="text-base font-black text-slate-950">{selectedGig.title}</h3>
                    <p className="text-xs text-amber-600 font-bold">
                      Posted by {selectedGig.creatorName} • {selectedGig.category} • {selectedGig.budget}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingGig(false);
                    setSelectedGig(null);
                  }}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {isEditingGig ? (
                <form onSubmit={handleSaveEditGig} className="space-y-3 bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Gig Title</label>
                    <input
                      type="text"
                      required
                      value={editGigTitle}
                      onChange={(e) => setEditGigTitle(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Budget / Pay</label>
                    <input
                      type="text"
                      required
                      value={editGigBudget}
                      onChange={(e) => setEditGigBudget(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Description</label>
                    <textarea
                      rows={3}
                      required
                      value={editGigDescription}
                      onChange={(e) => setEditGigDescription(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingGig(false)}
                      className="flex-1 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl cursor-pointer shadow-sm"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-2 text-xs text-slate-700">
                  <p className="leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200 font-medium">{selectedGig.description}</p>
                  <div className="flex justify-between text-slate-500">
                    <span>Location: {selectedGig.locationName}</span>
                    <span>Contact: {selectedGig.contactInfo}</span>
                  </div>
                </div>
              )}

              {/* Owner Edit / Delete Controls */}
              {selectedGig.creatorUid === currentUserEmail && !isEditingGig && (
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleStartEditGig(selectedGig)}
                    className="flex-1 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Gig</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteGig(selectedGig.gigId)}
                    className="flex-1 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Gig</span>
                  </button>
                </div>
              )}

              {/* Show Cancellation Notice if previously cancelled */}
              {selectedGig.status === 'cancelled' && selectedGig.cancellationReason && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-rose-900">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>Navigation Cancelled by {selectedGig.cancelledByName || 'Participant'}</span>
                  </div>
                  <p className="text-rose-800 font-medium italic">
                    Reason: &ldquo;{selectedGig.cancellationReason}&rdquo;
                  </p>
                </div>
              )}

              {/* Gig Application Flow, Mutual Navigation Cancellation & Owner Completion Flow */}
              {applyingGigId === selectedGig.gigId ? (
                <div className="py-6 flex flex-col items-center justify-center space-y-2 text-center">
                  <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
                  <span className="text-xs font-bold text-slate-700">Waiting for gig owner to accept application...</span>
                </div>
              ) : selectedGig.applicationStatus === 'accepted' ? (
                <div className="space-y-3">
                  <div className="p-3 bg-emerald-100 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold text-center">
                    Gig Accepted! Navigating route to owner destination on map.
                  </div>

                  {/* Mutual Navigation Cancellation Button: Accessible to BOTH User & Owner */}
                  <button
                    type="button"
                    onClick={() => handleInitiateCancelNavigation(selectedGig)}
                    className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                  >
                    <AlertCircle className="w-4 h-4" />
                    <span>Cancel Gig Navigation (Reason Required)</span>
                  </button>

                  {/* Only Owner can click Gig Completed and rate user */}
                  {selectedGig.creatorUid === currentUserEmail ? (
                    <div className="space-y-2.5 bg-slate-50 border border-slate-200 p-3.5 rounded-2xl">
                      <div className="text-xs font-bold text-slate-800">Rate User Performance (Owner Only):</div>
                      <div className="flex items-center justify-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setRatingValue(star)}
                            className="p-1 cursor-pointer"
                          >
                            <Star className={`w-5 h-5 ${star <= ratingValue ? 'fill-amber-400 text-amber-500' : 'text-slate-300'}`} />
                          </button>
                        ))}
                      </div>

                      {completedGigSuccess ? (
                        <div className="text-xs font-bold text-emerald-600 text-center">Gig Completed & Star Rating Saved to Profile!</div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleCompleteGig(selectedGig)}
                          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl cursor-pointer shadow-sm"
                        >
                          Mark Gig Completed & Rate User
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="text-center text-xs text-slate-500 italic">Route active on map. Awaiting owner completion and star rating.</div>
                  )}
                </div>
              ) : selectedGig.status !== 'cancelled' ? (
                <button
                  type="button"
                  onClick={() => handleApplyToGig(selectedGig)}
                  className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl transition-all cursor-pointer shadow-md"
                >
                  Apply to Gig Now
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleApplyToGig(selectedGig)}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Re-apply to Gig
                </button>
              )}
            </div>
          </div>
        )}

        {/* Selected Item Details Popup Modal with Seller/Owner Star Rating & Buy Action */}
        {selectedItem && (
          <div
            className="fixed inset-0 z-[235] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-150"
            onClick={() => {
              setIsEditingItem(false);
              setSelectedItem(null);
            }}
          >
            <div
              className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 text-slate-950 space-y-4 max-h-[90dvh] overflow-y-auto animate-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🛍️</span>
                  <div>
                    <h3 className="text-base font-black text-slate-950">{selectedItem.title}</h3>
                    <p className="text-xs text-emerald-600 font-bold">{selectedItem.category} • {selectedItem.price} ({selectedItem.condition})</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingItem(false);
                    setSelectedItem(null);
                  }}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {selectedItem.photoUrls && selectedItem.photoUrls.length > 0 && (
                <div
                  className="w-full h-40 rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 cursor-pointer relative group"
                  onClick={() => setFullScreenImageUrl(selectedItem.photoUrls![0])}
                  title="Click to view full screen"
                >
                  <img src={selectedItem.photoUrls[0]} alt={selectedItem.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  <div className="absolute inset-0 bg-slate-950/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-bold">
                    Click to view full screen
                  </div>
                </div>
              )}

              {isEditingItem ? (
                <form onSubmit={handleSaveEditItem} className="space-y-3 bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Item Title</label>
                    <input
                      type="text"
                      required
                      value={editItemTitle}
                      onChange={(e) => setEditItemTitle(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Price</label>
                    <input
                      type="text"
                      required
                      value={editItemPrice}
                      onChange={(e) => setEditItemPrice(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Description</label>
                    <textarea
                      rows={3}
                      required
                      value={editItemDescription}
                      onChange={(e) => setEditItemDescription(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 resize-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingItem(false)}
                      className="flex-1 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl cursor-pointer shadow-sm"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-2 text-xs text-slate-700">
                  <p className="leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200 font-medium">{selectedItem.description}</p>
                  <div className="flex justify-between text-slate-500">
                    <span>Location: {selectedItem.locationName}</span>
                    <span>Seller: {selectedItem.contactInfo}</span>
                  </div>
                </div>
              )}

              {/* Only Seller/Owner can Edit, Delete and Complete Item Sale with Star Rating */}
              {selectedItem.sellerUid === currentUserEmail && !isEditingItem ? (
                <div className="space-y-3 pt-1">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleStartEditItem(selectedItem)}
                      className="flex-1 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit Item</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteItem(selectedItem.itemId)}
                      className="flex-1 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Item</span>
                    </button>
                  </div>

                  <div className="space-y-2 bg-slate-50 border border-slate-200 p-3.5 rounded-2xl">
                    <div className="text-xs font-bold text-slate-800">Rate Buyer on Transaction (Owner Only):</div>
                    <div className="flex items-center justify-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setItemRatingValue(star)}
                          className="p-1 cursor-pointer"
                        >
                          <Star className={`w-5 h-5 ${star <= itemRatingValue ? 'fill-amber-400 text-amber-500' : 'text-slate-300'}`} />
                        </button>
                      ))}
                    </div>

                    {completedItemSuccess ? (
                      <div className="text-xs font-bold text-emerald-600 text-center">Item Marked as Sold & Star Rating Saved!</div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleCompleteItem(selectedItem)}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl cursor-pointer shadow-sm"
                      >
                        Mark Item Sold & Rate Buyer
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  {buySuccess ? (
                    <div className="p-3 bg-emerald-100 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold text-center">
                      Purchase request sent to seller successfully!
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playSuccessChime();
                        setBuySuccess(true);
                        setTimeout(() => {
                          setBuySuccess(false);
                          setSelectedItem(null);
                        }, 2000);
                      }}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl transition-all cursor-pointer shadow-md"
                    >
                      Buy / Contact Seller Now
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Cancellation Reason Modal for Gig Navigation */}
        {cancellingGig && (
          <div
            className="fixed inset-0 z-[280] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-150"
            onClick={() => setCancellingGig(null)}
          >
            <div
              className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 text-slate-950 space-y-4 animate-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-black text-slate-950">Cancel Gig Navigation</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setCancellingGig(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-slate-700 font-medium">
                  Both user and owner can cancel gig navigation, but must provide a cancellation reason to each other for <strong>&ldquo;{cancellingGig.title}&rdquo;</strong>.
                </p>
                <p className="text-[11px] text-slate-500">
                  This reason will be displayed immediately to the other party.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  Reason for Cancellation <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g., Unforeseen delay / Emergency arose / Unable to reach location / Work terms altered..."
                  value={cancellationReasonInput}
                  onChange={(e) => setCancellationReasonInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none font-medium"
                />
              </div>

              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setCancellingGig(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Keep Navigation
                </button>
                <button
                  type="button"
                  disabled={!cancellationReasonInput.trim()}
                  onClick={handleConfirmCancelNavigation}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-xs rounded-xl cursor-pointer shadow-sm transition-all"
                >
                  Confirm Cancellation
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Full-Screen Document / Verification Lightbox Viewer for Tenant */}
        {fullScreenDoc && (
          <div
            className="fixed inset-0 z-[320] flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-md p-4 animate-in fade-in duration-150"
            onClick={() => setFullScreenDoc(null)}
          >
            <div
              className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white shrink-0">
                <div className="flex items-center gap-2.5">
                  <Eye className="w-5 h-5 text-blue-600" />
                  <h3 className="text-sm font-black text-slate-950 truncate max-w-md">
                    {fullScreenDoc.title}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={fullScreenDoc.url}
                    download="timegig_verification_doc.jpg"
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors"
                  >
                    <span>Open Raw</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => setFullScreenDoc(null)}
                    className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center cursor-pointer"
                    aria-label="Close document viewer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-900 min-h-[300px]">
                <img
                  src={fullScreenDoc.url}
                  alt={fullScreenDoc.title}
                  className="max-w-full max-h-[75vh] object-contain rounded-xl shadow-lg border border-slate-800"
                />
              </div>
            </div>
          </div>
        )}

        {/* Full-Screen Image Lightbox Viewer for Items */}
        {fullScreenImageUrl && (
          <div
            className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-in fade-in duration-150"
            onClick={() => setFullScreenImageUrl(null)}
          >
            <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-3xl shadow-2xl">
              <button
                type="button"
                onClick={() => setFullScreenImageUrl(null)}
                className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <img src={fullScreenImageUrl} alt="Full Screen Lightbox" className="max-w-full max-h-[90vh] object-contain rounded-2xl" />
            </div>
          </div>
        )}

        {showAccountModal && authUser && (
          <div
            className="fixed inset-0 z-[220] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-150"
            role="dialog"
            aria-modal="true"
            aria-labelledby="account-modal-title"
            onClick={() => setShowAccountModal(false)}
          >
            <div
              className="bg-white border border-slate-200 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden text-slate-950"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-5 border-b border-slate-200 flex items-center justify-between">
                <h2 id="account-modal-title" className="text-base font-bold text-slate-950">
                  Account
                </h2>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playFeatureClick();
                      setShowAccountInfo((prev) => !prev);
                    }}
                    aria-label="Account feature information"
                    title="About Account"
                    className={`w-9 h-9 rounded-full flex items-center justify-center cursor-pointer transition-colors ${
                      showAccountInfo ? 'bg-blue-600 text-white' : 'bg-blue-50 hover:bg-blue-100 text-blue-600'
                    }`}
                  >
                    <Info className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAccountModal(false)}
                    aria-label="Close account dialog"
                    className="min-w-[44px] min-h-[44px] rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-5 space-y-4">
                {showAccountInfo && (
                  <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-950 space-y-1 animate-in fade-in duration-150">
                    <div className="font-black flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-blue-600" />
                      <span>About Account</span>
                    </div>
                    <p className="leading-relaxed text-blue-900 font-medium">
                      View your signed-in account details, verification status, and sign out securely from TimeGiG.
                    </p>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  {authUser.photoURL ? (
                    <img
                      src={authUser.photoURL}
                      alt={displayName}
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 rounded-full object-cover border border-slate-200 shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <UserCircle className="w-7 h-7" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-slate-950 truncate">{displayName}</div>
                    {authUser.email && (
                      <div className="text-xs text-slate-500 truncate">{authUser.email}</div>
                    )}
                    {authUser.emailVerified && (
                      <div className="flex items-center gap-1 text-xs font-medium text-emerald-700 mt-0.5">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>Verified</span>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full min-h-[46px] py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600 focus-visible:ring-offset-2 active:scale-[0.98]"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}

export default App;
