import React, { useState } from 'react';
import { X, ArrowLeft, Settings as SettingsIcon, Volume2, VolumeX, Check, Info } from 'lucide-react';
import { soundEngine } from '../utils/audio';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBackToMenu: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onBackToMenu,
}) => {
  const [isMuted, setIsMuted] = useState(soundEngine.getMuted());
  const [soundSavedMsg, setSoundSavedMsg] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  if (!isOpen) return null;

  const handleToggleSound = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    soundEngine.setMuted(nextMuted);
    if (!nextMuted) {
      soundEngine.playFeatureClick();
    }
    setSoundSavedMsg(true);
    setTimeout(() => setSoundSavedMsg(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-[230] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 text-slate-950 space-y-6 animate-in zoom-in-95 duration-150"
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
              <h3 className="text-base font-black tracking-tight text-slate-950">App Settings</h3>
              <p className="text-xs text-slate-500">Audio preferences & sound effects</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                soundEngine.playFeatureClick();
                setShowInfo((prev) => !prev);
              }}
              aria-label="Settings feature information"
              title="About Settings"
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
              <span>About Settings</span>
            </div>
            <p className="leading-relaxed text-blue-900 font-medium">
              Control app sound effects including click chimes, gig/item post pop-up alerts, and success notification audio.
            </p>
          </div>
        )}

        <div className="space-y-4">
          {/* App Sound Toggle */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${!isMuted ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-500'}`}>
                {!isMuted ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">App Sound Effects</div>
                <div className="text-[10px] text-slate-500">{!isMuted ? 'Sound is turned ON' : 'Sound is turned OFF'}</div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleToggleSound}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${!isMuted ? 'bg-blue-600' : 'bg-slate-300'}`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${!isMuted ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
          </div>

          {soundSavedMsg && (
            <div className="text-center text-[10px] font-semibold text-emerald-600 flex items-center justify-center gap-1">
              <Check className="w-3 h-3" />
              <span>Sound preference updated</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
