import React, { useState, useEffect } from 'react';
import { X, ArrowLeft, Briefcase, MapPin, DollarSign, Phone, CheckCircle2, Send, Globe, Search, Info } from 'lucide-react';
import { GigPost, GigCategory, GeoLocationData } from '../types';
import { searchLocations } from '../utils/geo';
import { soundEngine } from '../utils/audio';

interface CreateGigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBackToMenu: () => void;
  userLocation: GeoLocationData;
  gigs: GigPost[];
  onAddGig: (gig: GigPost) => void;
  currentUserEmail: string | null;
  currencySymbol: string;
}

const CATEGORIES: GigCategory[] = ['Handyman', 'Delivery', 'Cleaning', 'Tech & IT', 'Tutoring', 'Events', 'Other'];

export const CreateGigModal: React.FC<CreateGigModalProps> = ({
  isOpen,
  onClose,
  onBackToMenu,
  userLocation,
  gigs,
  onAddGig,
  currentUserEmail,
  currencySymbol,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<GigCategory>('Handyman');
  const [budget, setBudget] = useState('150');
  const [description, setDescription] = useState('');
  const [contactInfo, setContactInfo] = useState(currentUserEmail || '');
  const [locationName, setLocationName] = useState('Current Map Location');
  const [lat, setLat] = useState(userLocation.lat);
  const [lng, setLng] = useState(userLocation.lng);
  const [successMsg, setSuccessMsg] = useState(false);

  // Location search suggestions & picker state
  const [locationSuggestions, setLocationSuggestions] = useState<Array<{ display_name: string; lat: string; lon: string; place_id: number }>>([]);
  const [showFullLocationPicker, setShowFullLocationPicker] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLat(userLocation.lat);
      setLng(userLocation.lng);
      if (!contactInfo && currentUserEmail) {
        setContactInfo(currentUserEmail);
      }
    }
  }, [isOpen, currentUserEmail, userLocation.lat, userLocation.lng]);

  useEffect(() => {
    if (!locationName || locationName.trim().length < 2) {
      setLocationSuggestions([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      const results = await searchLocations(locationName);
      setLocationSuggestions(results);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [locationName]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    soundEngine.playSuccessChime();
    const formattedBudget = budget.startsWith(currencySymbol) ? budget : `${currencySymbol}${budget}`;
    const newGig: GigPost = {
      gigId: `gig_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      creatorUid: currentUserEmail || 'user_anonymous',
      creatorName: currentUserEmail ? currentUserEmail.split('@')[0] : 'Gig Poster',
      creatorSelfieUrl: undefined,
      title: title.trim(),
      category,
      budget: formattedBudget,
      description: description.trim(),
      contactInfo: contactInfo.trim() || currentUserEmail || 'contact@timegig.app',
      locationName: locationName.trim() || 'Selected Location',
      lat: Number(lat),
      lng: Number(lng),
      status: 'active',
      submittedAt: Date.now(),
      viewsCount: 1,
    };

    onAddGig(newGig);
    setSuccessMsg(true);
    setTimeout(() => {
      setSuccessMsg(false);
      setTitle('');
      setDescription('');
    }, 1500);
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[230] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-150"
        onClick={onClose}
      >
        <div
          className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 text-slate-950 space-y-5 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150"
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
                <h3 className="text-base font-black tracking-tight text-slate-950">Create Gig Post</h3>
                <p className="text-xs text-slate-500">Post a gig on the map for app users to apply</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  soundEngine.playFeatureClick();
                  setShowInfo((prev) => !prev);
                }}
                aria-label="Create Gig feature information"
                title="About Create Gig"
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
                <span>About Create Gig</span>
              </div>
              <p className="leading-relaxed text-blue-900 font-medium">
                Publish paid gigs directly on the live map with your budget, category, and exact destination. Users receive real-time sound alerts, can apply to your gig, follow turn-by-turn road navigation upon acceptance, and earn star ratings upon completion.
              </p>
            </div>
          )}

          {successMsg ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center border border-emerald-200">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-bold text-slate-950">Gig Posted Successfully!</h4>
              <p className="text-xs text-slate-500 max-w-xs">
                Your gig is now live on the interactive map for nearby users to view and apply.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Gig Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Urgent Office Plumbing Fix"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as GigCategory)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat} className="bg-white text-slate-900">
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Budget / Pay ({currencySymbol})</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">{currencySymbol}</span>
                    <input
                      type="text"
                      required
                      placeholder="150"
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 font-semibold"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Description & Requirements</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Describe what needs to be done, expected duration, and tools required..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Location Name</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={locationName}
                      onChange={(e) => {
                        setLocationName(e.target.value);
                        setShowFullLocationPicker(true);
                      }}
                      onFocus={() => setShowFullLocationPicker(true)}
                      placeholder="Type location..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Contact Info</label>
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
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-sm rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <Send className="w-4 h-4" />
                <span>Publish Gig to Map</span>
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Location Picker Overlay rendered on top without unmounting CreateGigModal */}
      {showFullLocationPicker && (
        <div
          className="fixed inset-0 z-[250] flex flex-col bg-slate-950/70 backdrop-blur-md p-4 sm:p-8 animate-in fade-in duration-150"
          onClick={() => setShowFullLocationPicker(false)}
        >
          <div
            className="w-full h-full max-w-3xl mx-auto bg-white border border-slate-200 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-950 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white shrink-0">
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-black text-slate-950">Select Full Location Name</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowFullLocationPicker(false)}
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-slate-50 border-b border-slate-200 shrink-0">
              <div className="relative max-w-xl mx-auto w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  autoFocus
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  placeholder="Type any city, address or landmark..."
                  className="w-full bg-white border border-slate-200 rounded-2xl pl-11 pr-4 py-3.5 text-sm text-slate-900 shadow-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-white">
              {locationSuggestions.length === 0 ? (
                <div className="text-center py-16 text-sm text-slate-500 font-medium">
                  Type at least 2 characters to search full location names...
                </div>
              ) : (
                locationSuggestions.map((sug) => (
                  <button
                    key={sug.place_id}
                    type="button"
                    onClick={() => {
                      setLocationName(sug.display_name);
                      setLat(parseFloat(sug.lat));
                      setLng(parseFloat(sug.lon));
                      setShowFullLocationPicker(false);
                    }}
                    className="w-full text-left p-4 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-2xl transition-all flex items-start gap-3.5 cursor-pointer shadow-sm group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                      <Globe className="w-5 h-5" />
                    </div>
                    <div className="flex-1 text-sm font-bold text-slate-900 leading-snug break-words">
                      {sug.display_name}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
