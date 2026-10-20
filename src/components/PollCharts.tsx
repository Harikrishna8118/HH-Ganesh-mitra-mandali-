import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie,
  Legend,
} from 'recharts';
import { BarChart3, PieChart as PieIcon, Trophy, Users, Sparkles, TrendingUp } from 'lucide-react';
import type { Poll } from '../types.ts';

interface PollChartsProps {
  poll: Poll;
  compact?: boolean;
}

const PALETTE = [
  '#DC2626', // Red
  '#D97706', // Amber
  '#059669', // Emerald
  '#7C3AED', // Purple
  '#2563EB', // Blue
  '#DB2777', // Pink
  '#4B5563', // Slate
];

export const PollCharts: React.FC<PollChartsProps> = ({ poll, compact = false }) => {
  const [chartType, setChartType] = useState<'bar' | 'pie'>('bar');
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const totalVotes = poll.totalVotes || 0;

  const data = useMemo(() => {
    return (poll.options || []).map((opt, idx) => {
      const votes = opt.votes || 0;
      const pct = totalVotes > 0 ? Number(((votes / totalVotes) * 100).toFixed(1)) : 0;
      return {
        name: opt.text.length > 25 ? opt.text.slice(0, 22) + '...' : opt.text,
        fullName: opt.text,
        votes,
        percentage: pct,
        color: PALETTE[idx % PALETTE.length],
      };
    });
  }, [poll.options, totalVotes]);

  const winningOption = useMemo(() => {
    if (totalVotes === 0) return null;
    let highest = poll.options[0];
    for (const opt of poll.options) {
      if ((opt.votes || 0) > (highest.votes || 0)) {
        highest = opt;
      }
    }
    return highest;
  }, [poll.options, totalVotes]);

  if (totalVotes === 0) {
    return (
      <div className="p-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center space-y-1.5 my-2">
        <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
          <BarChart3 className="w-4 h-4" />
        </div>
        <p className="text-xs font-bold text-slate-700">No votes cast yet</p>
        <p className="text-[11px] text-slate-500">
          Cast the first vote above to generate the live real-time Recharts visualization!
        </p>
      </div>
    );
  }

  // Custom Tooltip for Recharts
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white p-2.5 rounded-xl shadow-xl text-xs space-y-1 border border-slate-700 z-50">
          <div className="font-bold text-amber-300">{item.fullName}</div>
          <div className="flex items-center justify-between gap-3 text-slate-300 text-[11px]">
            <span>Turnout:</span>
            <strong className="text-white tabular-nums">{item.votes} votes ({item.percentage}%)</strong>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50/80 via-white to-amber-50/30 border border-slate-200 shadow-2xs space-y-3">
      
      {/* Chart Top Controls */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-red-600" />
            <span>Democratic Pulse</span>
          </span>
          {winningOption && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-950 text-[10px] font-bold">
              <Trophy className="w-3 h-3 text-amber-700" />
              <span>Leading: {winningOption.text}</span>
            </span>
          )}
        </div>

        {/* Toggle between Bar and Pie */}
        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setChartType('bar')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition ${
              chartType === 'bar'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Bar Chart</span>
          </button>
          <button
            type="button"
            onClick={() => setChartType('pie')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition ${
              chartType === 'pie'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PieIcon className="w-3.5 h-3.5" />
            <span>Pie Chart</span>
          </button>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="w-full h-56 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'bar' ? (
            <BarChart
              data={data}
              margin={{ top: 10, right: 10, left: -15, bottom: 25 }}
            >
              <XAxis
                dataKey="name"
                interval={0}
                tick={{ fontSize: 10, fill: '#64748B' }}
                angle={-15}
                textAnchor="end"
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 10, fill: '#64748B' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="votes" radius={[6, 6, 0, 0]} barSize={34}>
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color}
                    className="hover:opacity-85 transition-opacity"
                  />
                ))}
              </Bar>
            </BarChart>
          ) : (
            <PieChart>
              <Tooltip content={<CustomTooltip />} />
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={compact ? 30 : 42}
                outerRadius={compact ? 65 : 80}
                paddingAngle={4}
                dataKey="votes"
                onMouseEnter={(_, index) => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color}
                    stroke={activeIndex === index ? '#000' : '#fff'}
                    strokeWidth={activeIndex === index ? 2 : 1}
                    className="transition-all cursor-pointer"
                  />
                ))}
              </Pie>
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(val, entry: any) => (
                  <span className="text-[11px] font-semibold text-slate-700">
                    {val} ({entry.payload.percentage}%)
                  </span>
                )}
              />
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Footer Breakdown pills */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-500">
        <span className="flex items-center gap-1 font-medium">
          <Users className="w-3.5 h-3.5 text-slate-400" />
          <span>Total participation: <strong>{totalVotes}</strong> votes</span>
        </span>
        <span className="text-amber-800 font-bold flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-600" />
          <span>Live Democratic Visualization</span>
        </span>
      </div>
    </div>
  );
};
