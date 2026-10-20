import React, { useState } from 'react';
import { AlertTriangle, Check, ChevronDown, ChevronUp, Phone } from 'lucide-react';
import { resolveEmergency } from '../services/mandaliService.ts';
import { useAuth } from '../context/AuthContext.tsx';
import type { EmergencyReport } from '../types.ts';

interface EmergencyBannerProps {
  emergencies: EmergencyReport[];
}

export const EmergencyBanner: React.FC<EmergencyBannerProps> = ({ emergencies }) => {
  const { currentUser, isAdmin } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  const activeReports = emergencies.filter((e) => e.isActive);

  if (activeReports.length === 0) return null;

  const current = activeReports[0];

  const handleResolve = async (id: string) => {
    if (!isAdmin) return;
    try {
      await resolveEmergency(
        id,
        notes.trim() || 'Resolved by administrator on site',
        currentUser?.uid || 'admin',
        currentUser?.fullName || 'Administrator'
      );
      setResolvingId(null);
      setNotes('');
    } catch {
      setResolvingId(null);
    }
  };

  return (
    <div className="bg-red-600 text-white border-b-2 border-red-700 shadow-md">
      <div className="max-w-6xl mx-auto px-4 py-2.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex h-3 w-3 shrink-0 rounded-full bg-white animate-ping" />
            <div className="min-w-0">
              <span className="text-xs font-black uppercase tracking-wider bg-red-800 px-1.5 py-0.5 rounded text-white mr-2">
                ACTIVE EMERGENCY: {current.category}
              </span>
              <span className="text-xs font-medium truncate inline-block align-middle max-w-[240px] sm:max-w-md">
                {current.description}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-red-100 hover:text-white flex items-center gap-1 font-semibold underline underline-offset-2"
            >
              {expanded ? 'Hide Details' : 'Details'}
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {expanded && (
          <div className="mt-3 pt-3 border-t border-red-500/80 text-xs space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-red-700/60 p-3 rounded-lg">
              <div>
                <p><strong>Reported By:</strong> {current.reporterName}</p>
                <p className="flex items-center gap-1.5 mt-0.5">
                  <Phone className="w-3.5 h-3.5" />
                  <a href={`tel:${current.reporterPhone}`} className="underline font-semibold">
                    {current.reporterPhone}
                  </a>
                </p>
              </div>
              <div>
                <p><strong>Time:</strong> {new Date(current.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                <p><strong>Location/Notes:</strong> {current.description}</p>
              </div>
            </div>

            {isAdmin && (
              <div className="bg-white text-slate-900 p-3 rounded-lg mt-2 space-y-2 shadow-xs">
                <p className="font-bold text-xs text-red-700">Administrator Incident Resolution</p>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Resolution notes (e.g., First aid provided, electrician arrived...)"
                  className="w-full text-xs p-2 border border-slate-300 rounded-md"
                />
                <button
                  onClick={() => handleResolve(current.id)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-md text-xs flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  Mark Incident Resolved
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
