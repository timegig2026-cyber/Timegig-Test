import React, { useState } from 'react';
import { X, ArrowLeft, UserCheck, Search, Star, MapPin, CheckCircle2, Info } from 'lucide-react';
import { SeekerProfile } from '../types';
import { soundEngine } from '../utils/audio';

interface SeekersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBackToMenu: () => void;
  currencySymbol: string;
  seekers?: SeekerProfile[];
}

export const SeekersModal: React.FC<SeekersModalProps> = ({
  isOpen,
  onClose,
  onBackToMenu,
  currencySymbol,
  seekers,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [hiredSeekerId, setHiredSeekerId] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);

  if (!isOpen) return null;

  const currentSeekers = seekers || [];

  const filteredSeekers = currentSeekers.filter(
    (seeker) =>
      seeker.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      seeker.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      seeker.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      seeker.skills.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleHire = (seekerId: string) => {
    soundEngine.playSuccessChime();
    setHiredSeekerId(seekerId);
    setTimeout(() => setHiredSeekerId(null), 3000);
  };

  return (
    <div
      className="fixed inset-0 z-[230] flex flex-col bg-slate-950/60 backdrop-blur-xl animate-in fade-in duration-200"
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
              <div className="w-9 h-9 rounded-xl bg-cyan-100 text-cyan-600 flex items-center justify-center shrink-0">
                <UserCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black tracking-tight text-slate-950">Service Seekers</h3>
                <p className="text-[10px] text-slate-500">Hire local professionals</p>
              </div>
            </div>
          </div>

          {/* Search bar at the very top */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name, skill, category..."
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
              aria-label="Seekers feature information"
              title="About Seekers"
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
          <div className="max-w-xl mx-auto w-full space-y-4">
            {showInfo && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-950 space-y-1 animate-in fade-in duration-150">
                <div className="font-black flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-blue-600" />
                  <span>About Service Seekers</span>
                </div>
                <p className="leading-relaxed text-blue-900 font-medium">
                  Browse verified local professionals by skill, hourly rate, and live star rating earned from completed gigs on TimeGiG.
                </p>
              </div>
            )}
            {filteredSeekers.length === 0 ? (
              <div className="text-center py-12 text-xs text-slate-500">No seekers found matching your search.</div>
            ) : (
              filteredSeekers.map((seeker) => (
                <div key={seeker.uid} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm hover:border-cyan-300 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3.5">
                      <img
                        src={seeker.selfieUrl}
                        alt={seeker.name}
                        className="w-14 h-14 rounded-full object-cover border-2 border-cyan-500/30 shrink-0 shadow-sm"
                      />
                      <div>
                        <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                          <span>{seeker.name}</span>
                          {seeker.isAvailable && (
                            <span className="w-2 h-2 rounded-full bg-emerald-500" title="Available now" />
                          )}
                        </div>
                        <div className="text-xs text-cyan-600 font-bold">{seeker.title}</div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                          <span className="flex items-center gap-1 text-amber-500 font-bold">
                            <Star className="w-3.5 h-3.5 fill-amber-500" />
                            {seeker.rating.toFixed(1)} ({seeker.completedGigsCount} gigs)
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-0.5 text-slate-600">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            {seeker.locationName}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-base font-black text-emerald-600">{currencySymbol}{seeker.hourlyRate}</div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">{seeker.bio}</p>

                  <div className="flex flex-wrap gap-1.5">
                    {seeker.skills.map((skill, sIdx) => (
                      <span key={sIdx} className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-700 font-semibold">
                        {skill}
                      </span>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleHire(seeker.uid)}
                    className="w-full py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                  >
                    {hiredSeekerId === seeker.uid ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                        <span>Hire Request Sent Successfully!</span>
                      </>
                    ) : (
                      <span>Hire / Contact Seeker</span>
                    )}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
