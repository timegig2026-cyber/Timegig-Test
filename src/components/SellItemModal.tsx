import React, { useState, useEffect } from 'react';
import { X, ArrowLeft, Tag, DollarSign, MapPin, Phone, CheckCircle2, Upload, Image as ImageIcon, Globe, Search, Info } from 'lucide-react';
import { ItemForSale, ItemCategory, ItemCondition, GeoLocationData } from '../types';
import { searchLocations } from '../utils/geo';
import { soundEngine } from '../utils/audio';

interface SellItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBackToMenu: () => void;
  userLocation: GeoLocationData;
  items: ItemForSale[];
  onAddItem: (item: ItemForSale) => void;
  currentUserEmail: string | null;
  currencySymbol: string;
}

const CATEGORIES: ItemCategory[] = [
  'Electronics',
  'Vehicles & Parts',
  'Home & Furniture',
  'Tools & Equipment',
  'Fashion & Clothing',
  'Sports & Outdoors',
  'Appliances',
  'Other',
];

const CONDITIONS: ItemCondition[] = ['Brand New', 'Like New', 'Good', 'Fair'];

export const SellItemModal: React.FC<SellItemModalProps> = ({
  isOpen,
  onClose,
  onBackToMenu,
  userLocation,
  items,
  onAddItem,
  currentUserEmail,
  currencySymbol,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ItemCategory>('Electronics');
  const [condition, setCondition] = useState<ItemCondition>('Like New');
  const [price, setPrice] = useState('250');
  const [description, setDescription] = useState('');
  const [contactInfo, setContactInfo] = useState(currentUserEmail || '');
  const [locationName, setLocationName] = useState('Current Map Location');
  const [lat, setLat] = useState(userLocation.lat);
  const [lng, setLng] = useState(userLocation.lng);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [successMsg, setSuccessMsg] = useState(false);

  // Location suggestions & full screen picker state
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setPhotoUrls((prev) => [...prev, event.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !price.trim()) return;

    soundEngine.playSuccessChime();
    const formattedPrice = price.startsWith(currencySymbol) ? price : `${currencySymbol}${price}`;
    const newItem: ItemForSale = {
      itemId: `item_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      sellerUid: currentUserEmail || 'seller_anonymous',
      sellerName: currentUserEmail ? currentUserEmail.split('@')[0] : 'Item Seller',
      title: title.trim(),
      category,
      condition,
      price: formattedPrice,
      description: description.trim(),
      contactInfo: contactInfo.trim() || currentUserEmail || 'contact@timegig.app',
      locationName: locationName.trim() || 'Selected Location',
      lat: Number(lat),
      lng: Number(lng),
      photoUrls: photoUrls,
      status: 'active',
      submittedAt: Date.now(),
      viewsCount: 1,
    };

    onAddItem(newItem);
    setSuccessMsg(true);
    setTimeout(() => {
      setSuccessMsg(false);
      setTitle('');
      setDescription('');
      setPhotoUrls([]);
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
                <h3 className="text-base font-black tracking-tight text-slate-950">Sell Any Item</h3>
                <p className="text-xs text-slate-500">List an item for sale on the map with photos</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  soundEngine.playFeatureClick();
                  setShowInfo((prev) => !prev);
                }}
                aria-label="Sell Item feature information"
                title="About Sell Item"
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
                <span>About Sell Item</span>
              </div>
              <p className="leading-relaxed text-blue-900 font-medium">
                List products for sale directly on the interactive map with photos, price, condition, and pickup location. Nearby buyers receive instant sound alerts, can view item photos in full screen, and earn buyer ratings when sold.
              </p>
            </div>
          )}

          {successMsg ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center border border-emerald-200">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-bold text-slate-950">Item Listed Successfully!</h4>
              <p className="text-xs text-slate-500 max-w-xs">
                Your item is now displayed at your location on the map for nearby buyers.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Item Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MacBook Pro M3 Max 16-inch"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ItemCategory)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat} className="bg-white text-slate-900">
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Condition</label>
                  <select
                    value={condition}
                    onChange={(e) => setCondition(e.target.value as ItemCondition)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    {CONDITIONS.map((cond) => (
                      <option key={cond} value={cond} className="bg-white text-slate-900">
                        {cond}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Price ({currencySymbol})</label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">{currencySymbol}</span>
                    <input
                      type="text"
                      required
                      placeholder="250"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-7 pr-2 py-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 font-semibold"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Upload Photos from Device (Multiple)</label>
                <div className="flex items-center gap-3">
                  <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-300 rounded-xl text-xs font-bold text-slate-700 cursor-pointer transition-colors">
                    <Upload className="w-4 h-4 text-blue-600" />
                    <span>Choose Images ({photoUrls.length} selected)</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                {photoUrls.length > 0 && (
                  <div className="flex gap-2 mt-2.5 overflow-x-auto pb-1">
                    {photoUrls.map((url, idx) => (
                      <div key={idx} className="relative w-14 h-14 rounded-lg overflow-hidden border border-slate-200 shrink-0">
                        <img src={url} alt={`Preview ${idx}`} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Item Description</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Describe features, specs, and pickup/delivery options..."
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
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <ImageIcon className="w-4 h-4" />
                <span>List Item on Map</span>
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Location Picker Overlay rendered on top without unmounting SellItemModal */}
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
                <MapPin className="w-5 h-5 text-emerald-600" />
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
                  className="w-full bg-white border border-slate-200 rounded-2xl pl-11 pr-4 py-3.5 text-sm text-slate-900 shadow-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-600"
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
                    className="w-full text-left p-4 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-2xl transition-all flex items-start gap-3.5 cursor-pointer shadow-sm group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
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
