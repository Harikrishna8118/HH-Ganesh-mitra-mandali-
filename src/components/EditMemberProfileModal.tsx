import React, { useState } from 'react';
import {
  User,
  MapPin,
  Camera,
  Heart,
  Check,
  X,
  Sparkles,
  Phone,
  Eye,
  EyeOff,
  Save,
  CheckCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { updateProfile } from '../services/mandaliService.ts';
import { ImageGalleryPicker } from './ImageGalleryPicker.tsx';
import type { MemberProfile } from '../types.ts';

interface EditMemberProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
  initialProfile?: MemberProfile | null;
}

const DEVOTIONAL_AVATARS = [
  { label: 'Ganesh Gold', url: 'https://images.unsplash.com/photo-1567591974584-f1832d9e605d?auto=format&fit=crop&w=200&q=80' },
  { label: 'Murti Blessing', url: 'https://images.unsplash.com/photo-1599818817757-d35272a08342?auto=format&fit=crop&w=200&q=80' },
  { label: 'Temple Light', url: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=200&q=80' },
  { label: 'Festive Diya', url: 'https://images.unsplash.com/photo-1605371924599-2d0365da1ae0?auto=format&fit=crop&w=200&q=80' },
];

const AVAILABLE_AREAS = [
  'Pooja & Rituals',
  'Prasada Distribution',
  'Stage & Decoration',
  'Sound & Lighting',
  'Cultural Programs',
  'Finance & Accounts',
  'Crowd & Queue Management',
  'Youth Volunteer',
];

export const EditMemberProfileModal: React.FC<EditMemberProfileModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  initialProfile,
}) => {
  const { currentUser, updateUserSession } = useAuth();

  const [fullName, setFullName] = useState(
    initialProfile?.fullName || currentUser?.fullName || ''
  );
  const [villageAddress, setVillageAddress] = useState(
    initialProfile?.villageAddress || currentUser?.villageAddress || ''
  );
  const [bio, setBio] = useState(
    initialProfile?.bio || currentUser?.bio || ''
  );
  const [avatarUrl, setAvatarUrl] = useState(
    initialProfile?.avatarUrl || currentUser?.avatarUrl || ''
  );
  const [isPhonePublic, setIsPhonePublic] = useState(
    initialProfile?.isPhonePublic ?? currentUser?.isPhonePublic ?? false
  );
  const [selectedAreas, setSelectedAreas] = useState<string[]>(
    initialProfile?.areasOfInterest || currentUser?.areasOfInterest || []
  );

  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !currentUser) return null;

  const toggleArea = (area: string) => {
    setSelectedAreas((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setError('Please provide your full name.');
      return;
    }

    setIsSaving(true);
    setError(null);

    const payload = {
      fullName: fullName.trim(),
      villageAddress: villageAddress.trim() || undefined,
      bio: bio.trim() || undefined,
      avatarUrl: avatarUrl.trim() || undefined,
      isPhonePublic,
      areasOfInterest: selectedAreas,
    };

    try {
      // 1. Update user session
      await updateUserSession(payload);

      // 2. If approved or active in profiles, update profile document
      if (currentUser.isApproved) {
        await updateProfile(currentUser.uid, payload);
      }

      setSuccess(true);
      if (onSaved) onSaved();

      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl border border-amber-200 flex flex-col my-8">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-red-600 via-amber-600 to-amber-700 text-white p-5 sm:p-6 relative">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-black/20 hover:bg-black/40 text-amber-100 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center text-amber-200 shrink-0 ring-2 ring-white/20">
              <User className="w-6 h-6 stroke-[2]" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-200 bg-black/25 px-2 py-0.5 rounded-full">
                Member Profile Management
              </span>
              <h3 className="text-lg font-black text-white tracking-tight mt-0.5">
                Edit Mandali Membership Details
              </h3>
              <p className="text-xs text-amber-100/90">
                Update your public profile, residence, and areas of service as your wish
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSave} className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          
          {/* Full Name */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Ramesh Gowda"
              className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white text-slate-900 placeholder:text-slate-400 font-medium"
            />
          </div>

          {/* Village Address / Residence */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Village Area / Residence (H. Hosahalli)
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={villageAddress}
                onChange={(e) => setVillageAddress(e.target.value)}
                placeholder="e.g. Near Temple Square, Main Street, H. Hosahalli"
                className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white text-slate-900 placeholder:text-slate-400 font-medium"
              />
            </div>
          </div>

          {/* Bio / Devotional Note */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              About Me / Devotional Service Note
            </label>
            <textarea
              rows={2}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Brief note about your role or enthusiasm for Ganesh Mandali..."
              className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white text-slate-900 placeholder:text-slate-400 font-medium"
            />
          </div>

          {/* Areas of Interest / Volunteer Preferences */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              Areas of Service & Interest (Choose as your wish)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {AVAILABLE_AREAS.map((area) => {
                const isSelected = selectedAreas.includes(area);
                return (
                  <button
                    key={area}
                    type="button"
                    onClick={() => toggleArea(area)}
                    className={`text-[11px] font-semibold px-2.5 py-1.5 rounded-xl border transition flex items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'bg-red-600 text-white border-red-600 shadow-2xs font-bold'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                    <span>{area}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Profile Photo directly from Gallery or Camera */}
          <ImageGalleryPicker
            value={avatarUrl}
            onChange={setAvatarUrl}
            label="Profile Photo / Avatar"
            helperText="Add directly from your device photo gallery or take a new picture"
            shape="circle"
            presets={DEVOTIONAL_AVATARS}
          />

          {/* Contact Privacy Toggle */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={isPhonePublic}
                onChange={(e) => setIsPhonePublic(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-red-600 rounded border-slate-300 focus:ring-red-500"
              />
              <div className="text-xs text-slate-700 leading-snug">
                <span className="font-bold block">Public Phone Visibility</span>
                <span className="text-[11px] text-slate-500">
                  Allow fellow mandali members to see and call +91 {currentUser.mobileNumber} in the directory for festival coordination.
                </span>
              </div>
            </label>
          </div>

          {error && (
            <div className="p-2.5 bg-red-50 text-red-700 text-xs font-semibold rounded-xl border border-red-200">
              {error}
            </div>
          )}

          {success && (
            <div className="p-2.5 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200 flex items-center gap-2 animate-in fade-in">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>Membership profile details saved successfully!</span>
            </div>
          )}

          {/* Footer Controls */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs shadow-md transition active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSaving ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Profile</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
