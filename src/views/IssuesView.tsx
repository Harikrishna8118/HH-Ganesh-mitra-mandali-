import React, { useState } from 'react';
import {
  AlertCircle,
  Plus,
  Clock,
  CheckCircle2,
  Hourglass,
  MessageSquare,
  AlertTriangle,
  User,
  Filter,
} from 'lucide-react';
import { reportIssue, updateIssueStatus } from '../services/mandaliService.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { EmptyState } from '../components/EmptyState.tsx';
import type { IssueReport, IssueStatus, IssuePriority } from '../types.ts';

interface IssuesViewProps {
  issues: IssueReport[];
  onOpenAuth: () => void;
}

const CATEGORIES = [
  'Electricity Problem',
  'Decoration Problem',
  'Sound & Audio Problem',
  'Cleaning Problem',
  'Water Supply Problem',
  'Safety Concern',
  'Event / Stage Problem',
  'Other',
];

export const IssuesView: React.FC<IssuesViewProps> = ({ issues = [], onOpenAuth }) => {
  const { currentUser, isLoggedIn, isAdmin } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<IssuePriority>('medium');
  const [imageUrl, setImageUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [issueError, setIssueError] = useState<string | null>(null);

  // Admin response state
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [adminResponseText, setAdminResponseText] = useState('');
  const [newStatus, setNewStatus] = useState<IssueStatus>('in_progress');

  const filteredIssues = issues.filter((iss) => {
    if (filterStatus === 'all') return true;
    return iss.status === filterStatus;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onOpenAuth();
      return;
    }
    setIsSubmitting(true);
    setIssueError(null);
    try {
      await reportIssue({
        reportedBy: currentUser.uid,
        reporterName: currentUser.fullName,
        reporterPhone: currentUser.mobileNumber,
        title: title.trim(),
        category,
        description: description.trim(),
        priority,
        imageUrl: imageUrl.trim() || undefined,
      });

      setShowModal(false);
      setTitle('');
      setDescription('');
      setImageUrl('');
    } catch (err: any) {
      setIssueError(err?.message || 'Failed to submit issue report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdminUpdateStatus = async (issue: IssueReport) => {
    if (!isAdmin) return;
    try {
      setIssueError(null);
      await updateIssueStatus(
        issue.id,
        newStatus,
        adminResponseText.trim(),
        issue.reportedBy,
        currentUser?.uid || 'admin',
        currentUser?.fullName || 'Admin'
      );
      setUpdatingId(null);
      setAdminResponseText('');
    } catch (err: any) {
      setIssueError(err?.message || 'Failed to update issue status. Please try again.');
      setTimeout(() => setIssueError(null), 4000);
    }
  };

  const getStatusBadge = (status: IssueStatus) => {
    switch (status) {
      case 'open':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
            <Hourglass className="w-3 h-3 text-amber-700" />
            OPEN
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-blue-800 bg-blue-100 px-2 py-0.5 rounded">
            <Clock className="w-3 h-3 text-blue-700" />
            IN PROGRESS
          </span>
        );
      case 'resolved':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
            <CheckCircle2 className="w-3 h-3 text-emerald-700" />
            RESOLVED
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Community Issue Reporting
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Report electricity, cleaning, sound, or stage issues for quick mandali resolution
          </p>
        </div>

        <button
          onClick={() => {
            if (!isLoggedIn) onOpenAuth();
            else setShowModal(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-xs self-start sm:self-auto transition active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Report New Problem</span>
        </button>
      </div>

      {issueError && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold flex items-center justify-between gap-3 animate-in fade-in">
          <span>{issueError}</span>
          <button
            onClick={() => setIssueError(null)}
            className="text-red-500 hover:text-red-700 font-bold px-1.5 py-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl w-fit">
        {['all', 'open', 'in_progress', 'resolved'].map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-colors ${
              filterStatus === s
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {s.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Issues List */}
      {issues.length === 0 ? (
        <EmptyState
          icon={AlertCircle}
          title="No issues reported yet."
          description="Everything is currently running smoothly! Members can report any mandapa or festival issues using the button above."
          actionText="Report an Issue"
          onAction={() => {
            if (!isLoggedIn) onOpenAuth();
            else setShowModal(true);
          }}
          className="my-6"
        />
      ) : filteredIssues.length === 0 ? (
        <div className="py-12 text-center text-xs text-slate-500">
          No reports found under "{filterStatus}".
        </div>
      ) : (
        <div className="space-y-4">
          {filteredIssues.map((item) => (
            <div
              key={item.id}
              className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {getStatusBadge(item.status)}
                    <span className="text-xs font-bold text-slate-700">
                      {item.category}
                    </span>
                    <span className="text-xs text-slate-400">·</span>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider ${
                        item.priority === 'high'
                          ? 'text-red-700'
                          : item.priority === 'medium'
                          ? 'text-amber-700'
                          : 'text-slate-500'
                      }`}
                    >
                      {item.priority} Priority
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900">
                    {item.title}
                  </h3>
                </div>

                {isAdmin && (
                  <button
                    onClick={() => {
                      setUpdatingId(updatingId === item.id ? null : item.id);
                      setNewStatus(item.status);
                      setAdminResponseText(item.adminResponse || '');
                    }}
                    className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-red-700 bg-slate-50 hover:bg-red-50 border border-slate-200 rounded-lg shrink-0"
                  >
                    Manage Status
                  </button>
                )}
              </div>

              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                {item.description}
              </p>

              {item.imageUrl && (
                <div className="mt-2">
                  <img
                    src={item.imageUrl}
                    alt="Issue photo"
                    referrerPolicy="no-referrer"
                    className="max-h-48 rounded-xl object-cover border border-slate-200 shadow-2xs"
                  />
                </div>
              )}

              {/* Admin response block if available */}
              {item.adminResponse && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
                  <span className="font-bold text-red-700 block text-[11px] uppercase tracking-wider">
                    Committee Action / Response
                  </span>
                  <p className="text-slate-700 leading-relaxed">
                    {item.adminResponse}
                  </p>
                </div>
              )}

              {/* Inline Admin Update Box */}
              {updatingId === item.id && isAdmin && (
                <div className="mt-3 p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2.5 text-xs">
                  <span className="font-bold text-slate-900 block">
                    Update Problem Status & Add Response
                  </span>
                  <div className="flex gap-2">
                    {(['open', 'in_progress', 'resolved'] as IssueStatus[]).map((st) => (
                      <button
                        type="button"
                        key={st}
                        onClick={() => setNewStatus(st)}
                        className={`px-3 py-1 text-xs font-semibold rounded-lg capitalize border ${
                          newStatus === st
                            ? 'bg-red-600 text-white border-red-600'
                            : 'bg-white text-slate-700 border-slate-300'
                        }`}
                      >
                        {st.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={adminResponseText}
                    onChange={(e) => setAdminResponseText(e.target.value)}
                    placeholder="e.g. Electrician sent to Main Mandapa..."
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setUpdatingId(null)}
                      className="px-3 py-1 rounded-md border border-slate-300 text-slate-600"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleAdminUpdateStatus(item)}
                      className="px-3 py-1 rounded-md bg-red-600 text-white font-bold"
                    >
                      Save Status
                    </button>
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 tabular-nums">
                <span className="flex items-center gap-1 font-medium text-slate-500">
                  <User className="w-3 h-3" />
                  Reported by <strong>{item.reporterName}</strong>
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(item.createdAt).toLocaleDateString([], {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* REPORT ISSUE MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl p-5 border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-base font-bold text-slate-900">Report Problem or Concern</h2>
            {issueError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold">
                {issueError}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Problem Title <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Stage floodlights not working on left wing"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Urgency / Priority
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['low', 'medium', 'high'] as IssuePriority[]).map((p) => (
                    <button
                      type="button"
                      key={p}
                      onClick={() => setPriority(p)}
                      className={`py-1.5 text-xs font-bold capitalize rounded-lg border ${
                        priority === p
                          ? p === 'high'
                            ? 'bg-red-600 text-white border-red-600'
                            : p === 'medium'
                            ? 'bg-amber-600 text-white border-amber-600'
                            : 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-slate-700 border-slate-200'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Description & Location <span className="text-red-600">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe exact location in H. Hosahalli, what needs fixing..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Photo URL (Optional)
                </label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/issue-photo.jpg"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-1/2 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-1/2 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Issue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
