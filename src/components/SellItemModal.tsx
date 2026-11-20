import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Tag,
  Camera,
  Upload,
  MapPin,
  Phone,
  Trash2,
  Info,
  Check,
  AlertCircle,
  Smartphone,
  Car,
  Armchair,
  Wrench,
  Shirt,
  Bike,
  Plug,
  Package,
  Plus,
} from 'lucide-react';
import { ItemCategory, ItemCondition, ItemForSale } from '../types';
import { soundEngine } from '../utils/audio';

interface SellItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialLocation: { lat: number; lng: number; address: string } | null;
  onPickLocationOnMap: () => void;
  userContact: string;
  onSubmitItem: (itemData: {
    title: string;
    category: ItemCategory;
    price: string;
    description: string;
    condition: ItemCondition;
    photoUrl?: string;
    photoUrls?: string[];
    contactInfo: string;
    locationName: string;
    lat: number;
    lng: number;
  }) => Promise<void>;
  isSubmitting: boolean;
  onOpenInfo: () => void;
  editItem?: ItemForSale | null;
}

const CATEGORIES: Array<{ id: ItemCategory; label: string; icon: React.ElementType }> = [
  { id: 'Electronics', label: 'Electronics', icon: Smartphone },
  { id: 'Vehicles & Parts', label: 'Vehicles & Parts', icon: Car },
  { id: 'Home & Furniture', label: 'Home & Furniture', icon: Armchair },
  { id: 'Tools & Equipment', label: 'Tools', icon: Wrench },
  { id: 'Fashion & Clothing', label: 'Fashion', icon: Shirt },
  { id: 'Sports & Outdoors', label: 'Sports', icon: Bike },
  { id: 'Appliances', label: 'Appliances', icon: Plug },
  { id: 'Other', label: 'Other', icon: Package },
];

const CONDITIONS: ItemCondition[] = ['Brand New', 'Like New', 'Good', 'Fair'];

// Helper to compress uploaded item image to ~300KB JPEG for reliable Firestore storage
async function compressImageForSale(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to decode image'));
      img.onload = () => {
        const maxDim = 960;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(typeof reader.result === 'string' ? reader.result : '');
          return;
        }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        let quality = 0.75;
        let compressed = canvas.toDataURL('image/jpeg', quality);
        if (compressed.length > 450000) {
          compressed = canvas.toDataURL('image/jpeg', 0.55);
        }
        resolve(compressed);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export const SellItemModal: React.FC<SellItemModalProps> = ({
  isOpen,
  onClose,
  initialLocation,
  onPickLocationOnMap,
  userContact,
  onSubmitItem,
  isSubmitting,
  onOpenInfo,
  editItem,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ItemCategory>('Electronics');
  const [priceNumber, setPriceNumber] = useState('');
  const [description, setDescription] = useState('');
  const [condition, setCondition] = useState<ItemCondition>('Like New');
  const [contactInfo, setContactInfo] = useState('');
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [isCompressingPhoto, setIsCompressingPhoto] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (editItem) {
      setTitle(editItem.title);
      setCategory(editItem.category);
      setPriceNumber(editItem.price.replace(/[^0-9.]/g, '') || editItem.price);
      setDescription(editItem.description);
      setCondition(editItem.condition);
      setContactInfo(editItem.contactInfo);
      setPhotoUrls(editItem.photoUrls || (editItem.photoUrl ? [editItem.photoUrl] : []));
    } else {
      setTitle('');
      setCategory('Electronics');
      setPriceNumber('');
      setDescription('');
      setCondition('Like New');
      setContactInfo(userContact || '');
      setPhotoUrls([]);
    }
    setErrorMsg(null);
  }, [isOpen, editItem, userContact]);

  if (!isOpen) return null;

  const handlePhotosSelected = async (files: FileList | File[]) => {
    setIsCompressingPhoto(true);
    setErrorMsg(null);
    try {
      const newUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        if (f.type.startsWith('image/')) {
          const compressed = await compressImageForSale(f);
          newUrls.push(compressed);
        }
      }
      setPhotoUrls((prev) => [...prev, ...newUrls].slice(0, 6));
      soundEngine.playFeatureClick();
    } catch {
      setErrorMsg('Could not process some images. Please try selecting other photos.');
    } finally {
      setIsCompressingPhoto(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!initialLocation) {
      setErrorMsg('Please specify a location for this item on the map.');
      return;
    }

    const trimmedTitle = title.trim();
    if (trimmedTitle.length < 2) {
      setErrorMsg('Please enter an item title (at least 2 characters).');
      return;
    }

    const cleanPriceVal = priceNumber.replace(/[^0-9.]/g, '').trim();
    if (!cleanPriceVal || isNaN(Number(cleanPriceVal)) || Number(cleanPriceVal) <= 0) {
      setErrorMsg('Please enter a valid selling price in Rands (e.g. 450).');
      return;
    }
    const formattedPrice = `R${parseFloat(cleanPriceVal).toLocaleString('en-ZA')}`;

    const trimmedDesc = description.trim();
    if (trimmedDesc.length < 3) {
      setErrorMsg('Please add a short description of the item (condition, details, etc.).');
      return;
    }

    const trimmedContact = contactInfo.trim();
    if (trimmedContact.length < 3) {
      setErrorMsg('Please enter your contact details (phone, WhatsApp, or email) so buyers can reach you.');
      return;
    }

    setErrorMsg(null);
    try {
      await onSubmitItem({
        title: trimmedTitle.slice(0, 120),
        category,
        price: formattedPrice,
        description: trimmedDesc.slice(0, 500),
        condition,
        photoUrl: photoUrls[0] || undefined,
        photoUrls: photoUrls.length > 0 ? photoUrls : undefined,
        contactInfo: trimmedContact.slice(0, 80),
        locationName: initialLocation.address.slice(0, 200),
        lat: Number(initialLocation.lat.toFixed(6)),
        lng: Number(initialLocation.lng.toFixed(6)),
      });
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to list item for sale. Please try again.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[230] flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200"
      onClick={() => {
        soundEngine.playFeatureClick();
        onClose();
      }}
    >
      <div
        className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-950 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0 shadow-sm">
              <Tag className="w-5 h-5 stroke-[2.5px]" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-950 truncate flex items-center gap-1.5">
                <span>{editItem ? 'Edit Item for Sale' : 'Sell Item on Map'}</span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase">
                  Marketplace
                </span>
              </h2>
              <p className="text-[11px] font-semibold text-slate-500 truncate">
                List items live on the GlobalGeoAtlas map for local buyers
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                soundEngine.playFeatureClick();
                onOpenInfo();
              }}
              title="About Selling Items"
              aria-label="About Selling Items"
              className="w-8 h-8 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 flex items-center justify-center cursor-pointer transition-all active:scale-90"
            >
              <Info className="w-4 h-4 stroke-[2.25px]" />
            </button>
            <button
              type="button"
              onClick={() => {
                soundEngine.playFeatureClick();
                onClose();
              }}
              aria-label="Close modal"
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer transition-all active:scale-90"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2 text-rose-800 text-xs font-bold animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Multiple Photos Upload Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700">
                Item Photos <span className="text-slate-400 font-normal lowercase">(up to 6 images)</span>
              </label>
              <span className="text-[10px] font-bold text-emerald-600">
                {photoUrls.length} / 6 selected
              </span>
            </div>

            {photoUrls.length > 0 ? (
              <div className="space-y-2">
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {photoUrls.map((url, idx) => (
                    <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border-2 border-emerald-400 bg-slate-900 group shadow-sm">
                      <img
                        src={url}
                        alt={`Item photo ${idx + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {idx === 0 && (
                        <span className="absolute top-1 left-1 bg-emerald-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow-sm">
                          Cover
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playFeatureClick();
                          setPhotoUrls((prev) => prev.filter((_, i) => i !== idx));
                        }}
                        title="Remove photo"
                        className="absolute top-1 right-1 p-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow cursor-pointer transition-all active:scale-90"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}

                  {photoUrls.length < 6 && (
                    <button
                      type="button"
                      disabled={isCompressingPhoto}
                      onClick={() => fileInputRef.current?.click()}
                      className="aspect-square rounded-xl border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50/50 flex flex-col items-center justify-center gap-1 text-slate-600 hover:text-emerald-700 transition-all cursor-pointer active:scale-95"
                    >
                      <Plus className="w-5 h-5 stroke-[2.5px]" />
                      <span className="text-[9px] font-black">Add More</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={isCompressingPhoto}
                  onClick={() => cameraInputRef.current?.click()}
                  className="py-3.5 px-3 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 text-emerald-800 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-sm"
                >
                  <Camera className="w-5 h-5 text-emerald-600" />
                  <span className="text-xs font-black">Take Photo</span>
                  <span className="text-[10px] font-semibold text-emerald-600">Camera capture</span>
                </button>

                <button
                  type="button"
                  disabled={isCompressingPhoto}
                  onClick={() => fileInputRef.current?.click()}
                  className="py-3.5 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-sm"
                >
                  <Upload className="w-5 h-5 text-blue-600" />
                  <span className="text-xs font-black">Select Photos</span>
                  <span className="text-[10px] font-semibold text-slate-500">Upload multiple</span>
                </button>
              </div>
            )}

            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handlePhotosSelected(e.target.files);
                }
                e.target.value = '';
              }}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handlePhotosSelected(e.target.files);
                }
                e.target.value = '';
              }}
            />
          </div>

          {/* Item Title & Price Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700">
                Item Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={120}
                placeholder="e.g. iPhone 13 Pro 128GB Blue"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500 transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700">
                Price (ZAR) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs font-black text-slate-500 select-none">
                  R
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  required
                  maxLength={15}
                  placeholder="500"
                  value={priceNumber}
                  onChange={(e) => setPriceNumber(e.target.value)}
                  className="w-full pl-7 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-black text-emerald-700 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Category Selector */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700">
              Category <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {CATEGORIES.map((cat) => {
                const IconComp = cat.icon;
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      soundEngine.playFeatureClick();
                      setCategory(cat.id);
                    }}
                    className={`py-2 px-2.5 rounded-xl border flex items-center gap-2 text-left transition-all cursor-pointer text-xs font-bold ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm scale-[1.02]'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <IconComp className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-slate-500'}`} />
                    <span className="truncate text-[11px] font-black">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Item Condition */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700">
              Condition <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {CONDITIONS.map((c) => {
                const isSelected = condition === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      soundEngine.playFeatureClick();
                      setCondition(c);
                    }}
                    className={`py-2 px-2 rounded-xl border text-center transition-all cursor-pointer text-[11px] font-black ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm scale-[1.02]'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700">
              Description <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              maxLength={500}
              placeholder="Describe specs, inclusions, reasons for selling..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500 resize-none transition-all"
            />
          </div>

          {/* Location Picker */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700">
              Pickup / Item Location <span className="text-rose-500">*</span>
            </label>
            <div className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-2xl">
              <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
              <div className="min-w-0 flex-1 text-xs font-bold text-slate-800 truncate">
                {initialLocation ? initialLocation.address : 'No location specified'}
              </div>
              <button
                type="button"
                onClick={onPickLocationOnMap}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[11px] font-black shadow-sm shrink-0 cursor-pointer active:scale-95"
              >
                Choose on Map
              </button>
            </div>
          </div>

          {/* Contact Info */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700">
              Contact Info (Phone / WhatsApp / Email) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                required
                maxLength={80}
                placeholder="+27 82 123 4567 or email"
                value={contactInfo}
                onChange={(e) => setContactInfo(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500 transition-all"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || isCompressingPhoto}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-2xl text-xs font-black shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
            >
              <Tag className="w-4 h-4 stroke-[2.5px]" />
              <span>
                {isSubmitting
                  ? 'Publishing Item...'
                  : editItem
                  ? 'Update Item Listing'
                  : 'Publish Item Live on Map'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
