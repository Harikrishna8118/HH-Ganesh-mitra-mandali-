import React from 'react';
import {
  Vote,
  Trophy,
  CheckCircle,
  ExternalLink,
  Users,
  Clock,
  Sparkles,
  BarChart3,
} from 'lucide-react';
import { PollCharts } from './PollCharts.tsx';
import type { ChatPollResult, Poll } from '../types.ts';

interface PollResultCardProps {
  pollResult: ChatPollResult;
  onOpenPoll?: (pollId: string) => void;
  isCurrentUserSender?: boolean;
}

export const PollResultCard: React.FC<PollResultCardProps> = ({
  pollResult,
  onOpenPoll,
  isCurrentUserSender = false,
}) => {
  const [showChart, setShowChart] = React.useState(false);
  const isClosed = pollResult.status === 'closed';
  const totalVotes = pollResult.totalVotes || 0;

  const pollObj: Poll = React.useMemo(() => ({
    id: pollResult.pollId,
    question: pollResult.question,
    status: pollResult.status,
    totalVotes: pollResult.totalVotes,
    deadline: new Date().toISOString(),
    createdBy: 'chat',
    authorName: 'Mandali',
    createdAt: new Date().toISOString(),
    options: (pollResult.options || []).map((o, idx) => ({
      id: `opt_${idx}`,
      text: o.text,
      votes: o.votes,
    })),
  }), [pollResult]);

  return (
    <div
      className={`rounded-2xl p-4 border max-w-sm sm:max-w-md w-full my-1.5 shadow-xs transition ${
        isCurrentUserSender
          ? 'bg-red-800 text-white border-red-700'
          : 'bg-white text-slate-900 border-amber-200/90'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-black/10">
        <div className="flex items-center gap-1.5">
          <div
            className={`p-1.5 rounded-lg ${
              isCurrentUserSender
                ? 'bg-white/20 text-white'
                : 'bg-amber-100 text-amber-800'
            }`}
          >
            <Vote className="w-4 h-4" />
          </div>
          <div>
            <span
              className={`text-[10px] font-black uppercase tracking-wider ${
                isCurrentUserSender ? 'text-amber-200' : 'text-amber-800'
              }`}
            >
              Mandali Poll Decision
            </span>
            <div className="flex items-center gap-1.5">
              <span
                className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                  isClosed
                    ? isCurrentUserSender
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-100 text-slate-700'
                    : isCurrentUserSender
                    ? 'bg-emerald-500/30 text-emerald-200'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {isClosed ? 'Final Result' : 'Live Voting'}
              </span>
              <span
                className={`text-[11px] tabular-nums ${
                  isCurrentUserSender ? 'text-white/80' : 'text-slate-500'
                }`}
              >
                {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
              </span>
            </div>
          </div>
        </div>

        {isClosed && (
          <div className="flex items-center gap-1 text-[11px] font-bold text-amber-300">
            <Trophy className="w-3.5 h-3.5" />
            <span>Closed</span>
          </div>
        )}
      </div>

      {/* Question */}
      <div className="pt-2.5 pb-2">
        <h4
          className={`text-sm font-bold leading-snug ${
            isCurrentUserSender ? 'text-white' : 'text-slate-900'
          }`}
        >
          {pollResult.question}
        </h4>
      </div>

      {/* Options Progress Bars */}
      <div className="space-y-2 py-1">
        {pollResult.options.map((opt, idx) => {
          const isWinning =
            pollResult.winningOptionText === opt.text && opt.votes > 0;

          return (
            <div key={idx} className="space-y-1">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span
                  className={`flex items-center gap-1.5 truncate ${
                    isWinning
                      ? isCurrentUserSender
                        ? 'text-amber-300 font-bold'
                        : 'text-amber-900 font-bold'
                      : isCurrentUserSender
                      ? 'text-white/90'
                      : 'text-slate-700'
                  }`}
                >
                  {isWinning && (
                    <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  )}
                  <span className="truncate">{opt.text}</span>
                </span>
                <span
                  className={`tabular-nums shrink-0 ml-2 font-bold ${
                    isCurrentUserSender ? 'text-amber-200' : 'text-amber-900'
                  }`}
                >
                  {opt.pct}%{' '}
                  <span
                    className={`text-[10px] font-normal ${
                      isCurrentUserSender ? 'text-white/70' : 'text-slate-400'
                    }`}
                  >
                    ({opt.votes})
                  </span>
                </span>
              </div>

              {/* Progress bar */}
              <div
                className={`h-2 w-full rounded-full overflow-hidden ${
                  isCurrentUserSender ? 'bg-black/20' : 'bg-slate-100'
                }`}
              >
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isWinning
                      ? 'bg-amber-400'
                      : isCurrentUserSender
                      ? 'bg-white/60'
                      : 'bg-amber-600'
                  }`}
                  style={{ width: `${Math.max(opt.pct, 2)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Interactive Recharts visualization */}
      {showChart && (
        <div className="pt-2 pb-1 animate-in fade-in">
          <PollCharts poll={pollObj} compact />
        </div>
      )}

      {/* Footer & Interactive Action */}
      <div className="pt-3 mt-2 border-t border-black/10 flex items-center justify-between gap-2 flex-wrap">
        <span
          className={`text-[11px] ${
            isCurrentUserSender ? 'text-amber-200/90' : 'text-slate-500'
          }`}
        >
          {isClosed ? 'Decision recorded' : 'Voting in progress'}
        </span>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowChart(!showChart)}
            className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg transition active:scale-95 ${
              isCurrentUserSender
                ? 'bg-white/20 text-white hover:bg-white/30'
                : 'bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200'
            }`}
            title="Toggle Recharts live bar or pie chart"
          >
            <BarChart3 className="w-3 h-3" />
            <span>{showChart ? 'Hide Chart' : 'Charts'}</span>
          </button>

          {onOpenPoll && (
            <button
              type="button"
              onClick={() => onOpenPoll(pollResult.pollId)}
              className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg transition active:scale-95 ${
                isCurrentUserSender
                  ? 'bg-white text-red-800 hover:bg-amber-50 shadow-xs'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              <span>{isClosed ? 'Details' : 'Vote'}</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
