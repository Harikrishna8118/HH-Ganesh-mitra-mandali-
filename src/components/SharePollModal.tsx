import React, { useState } from 'react';
import {
  X,
  Vote,
  Send,
  Trophy,
  CheckCircle,
  Clock,
  Sparkles,
} from 'lucide-react';
import type { Poll } from '../types.ts';

interface SharePollModalProps {
  polls: Poll[];
  isOpen: boolean;
  onClose: () => void;
  onShare: (poll: Poll, customComment?: string) => Promise<void>;
}

export const SharePollModal: React.FC<SharePollModalProps> = ({
  polls,
  isOpen,
  onClose,
  onShare,
}) => {
  const [selectedPollId, setSelectedPollId] = useState<string>(polls[0]?.id || '');
  const [comment, setComment] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  if (!isOpen) return null;

  const selectedPoll = polls.find((p) => p.id === selectedPollId) || polls[0];

  const handleShareSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPoll) return;
    setIsSharing(true);
    setShareError(null);
    try {
      await onShare(selectedPoll, comment);
      onClose();
    } catch (err) {
      setShareError(err instanceof Error ? err.message : 'Unable to share poll results. Please check your connection.');
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-700 via-red-800 to-amber-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-xl">
              <Vote className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white leading-tight">
                Share Poll Result to Chat
              </h3>
              <p className="text-xs text-amber-200">
                Post live decision results for village group discussion
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleShareSubmit} className="p-5 overflow-y-auto space-y-4">
          {shareError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
              <span className="font-bold">Error:</span>
              <span>{shareError}</span>
            </div>
          )}

          {polls.length === 0 ? (
            <div className="p-6 text-center text-slate-500 space-y-1">
              <p className="text-sm font-semibold">No decision polls available</p>
              <p className="text-xs">Create a decision poll in Discussions first.</p>
            </div>
          ) : (
            <>
              {/* Poll Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Select Mandali Poll
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {polls.map((p) => {
                    const isSelected = p.id === selectedPoll?.id;
                    const isClosed = p.status === 'closed';

                    return (
                      <div
                        key={p.id}
                        onClick={() => setSelectedPollId(p.id)}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition flex items-start justify-between gap-3 ${
                          isSelected
                            ? 'bg-amber-50/80 border-amber-500 shadow-2xs ring-1 ring-amber-400'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                                isClosed
                                  ? 'bg-slate-100 text-slate-600'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {isClosed ? 'Closed' : 'Active'}
                            </span>
                            <span className="text-xs text-slate-400 tabular-nums">
                              {p.totalVotes || 0} votes
                            </span>
                          </div>
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {p.question}
                          </p>
                        </div>
                        {isSelected && (
                          <CheckCircle className="w-4 h-4 text-amber-600 shrink-0 mt-1" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Preview of chosen poll */}
              {selectedPoll && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <div className="text-[11px] font-bold text-slate-600 uppercase">
                    Preview in Chat:
                  </div>
                  <div className="text-xs font-bold text-slate-900">
                    {selectedPoll.question}
                  </div>
                  <div className="space-y-1">
                    {selectedPoll.options.map((opt) => {
                      const total = selectedPoll.totalVotes || 0;
                      const count = opt.votes || 0;
                      const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                      return (
                        <div key={opt.id} className="text-[11px] flex items-center justify-between">
                          <span className="text-slate-600 truncate">{opt.text}</span>
                          <span className="font-bold text-amber-900">{pct}% ({count})</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Custom comment input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Add Discussion Note (Optional)
                </label>
                <input
                  type="text"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="e.g. Here are the latest results for pooja timings. Please check and discuss!"
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSharing || !selectedPoll}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs transition active:scale-95 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSharing ? 'Sharing...' : 'Post to Community Chat'}</span>
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
};
