import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  ArrowLeft, 
  Calendar, 
  Tag, 
  Download, 
  FileText, 
  Pin, 
  Search, 
  ExternalLink, 
  ShieldCheck, 
  Sparkles,
  Image as ImageIcon,
  CheckCircle2,
  X,
  Clock,
  Layers
} from 'lucide-react';
import { ClubNotice } from './types';
import { fetchNoticesFromFirebase } from './services/firebase';

interface NoticesPageProps {
  onBack: () => void;
  onOpenAdmin?: () => void;
}

export default function NoticesPage({ onBack, onOpenAdmin }: NoticesPageProps) {
  const [notices, setNotices] = useState<ClubNotice[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeNoticeModal, setActiveNoticeModal] = useState<ClubNotice | null>(null);

  useEffect(() => {
    loadNotices();
  }, []);

  const loadNotices = async () => {
    setLoading(true);
    try {
      const data = await fetchNoticesFromFirebase();
      setNotices(data);
    } catch (err) {
      console.error('Error fetching notices:', err);
    } finally {
      setLoading(false);
    }
  };

  const sortedNotices = [...notices].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime();
  });

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case 'Urgent':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'Olympiad':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      case 'Workshop':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      case 'General':
        return 'bg-teal-500/20 text-teal-300 border-teal-500/40';
      case 'Notice':
      default:
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 pt-3 pb-8 sm:pt-4 relative z-10 formal-page-enter">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 text-slate-200 hover:text-white text-xs font-bold border border-white/10 backdrop-blur-md shadow-xs hover:shadow transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-emerald-400" />
          <span>Back to Home</span>
        </button>


      </div>

      {/* Header Banner - Translucent Dark Glass */}
      <div className="relative rounded-3xl bg-slate-950/50 backdrop-blur-md text-white p-6 sm:p-8 mb-7 border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.3)] overflow-hidden">
        <div className="absolute -right-12 -bottom-12 w-56 h-56 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold tracking-wide uppercase mb-2">
              <Bell className="w-3.5 h-3.5 text-emerald-400" />
              <span>Official Notice Board</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Club Notices &amp; Announcements
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl leading-relaxed">
              Official announcements, olympiad schedules, workshop guidelines, and member updates published by the executive body.
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <span className="px-3.5 py-1.5 rounded-xl bg-slate-900/80 backdrop-blur-sm border border-emerald-500/30 text-xs font-bold text-emerald-300 shadow-xs">
              {notices.length} {notices.length === 1 ? 'Notice' : 'Notices'} Published
            </span>
          </div>
        </div>
      </div>

      {/* Notices Feed - Card-based Responsive Grid Layout with Subtle Hover Effects */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="w-8 h-8 border-3 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-bold text-slate-400">Loading notices...</p>
        </div>
      ) : sortedNotices.length === 0 ? (
        <div className="text-center py-16 bg-slate-950/40 backdrop-blur-md rounded-2xl border border-white/10 p-8">
          <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-200">No notices found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            There are no active notices published right now. Please check back later.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {sortedNotices.map((notice) => (
            <div
              key={notice.id}
              onClick={() => setActiveNoticeModal(notice)}
              className={`group relative rounded-2xl bg-slate-950/40 hover:bg-slate-900/60 backdrop-blur-md border p-5 sm:p-6 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(0,229,153,0.12)] cursor-pointer flex flex-col justify-between ${
                notice.isPinned
                  ? 'border-emerald-500/40 shadow-[0_4px_20px_rgba(0,229,153,0.06)]'
                  : 'border-white/10 hover:border-emerald-500/40'
              }`}
            >
              {/* Card Header: Category Badge + Pinned + Date */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-extrabold uppercase tracking-wide border ${getCategoryBadgeClass(notice.category)}`}>
                      {notice.category || 'Notice'}
                    </span>
                    {notice.isPinned && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        <Pin className="w-3 h-3 rotate-45" />
                        <span>Pinned</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[11px]">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>{notice.date}</span>
                  </div>
                </div>

                {/* Card Title */}
                <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-emerald-300 transition-colors leading-snug line-clamp-2 mb-2">
                  {notice.title}
                </h3>

                {/* Card Content Snippet */}
                <p className="text-xs sm:text-sm text-slate-300 line-clamp-3 leading-relaxed">
                  {notice.content}
                </p>

                {/* Optional Attached File / Image Thumbnail Preview */}
                {notice.fileUrl && (
                  <div className="mt-3.5 pt-3 border-t border-white/10">
                    {notice.fileType === 'image' ? (
                      <div className="relative rounded-xl overflow-hidden bg-slate-900/80 border border-white/10 h-32 w-full flex items-center justify-center">
                        <img 
                          src={notice.fileUrl} 
                          alt={notice.title} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-2.5">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-white drop-shadow-md">
                            <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Attached Image</span>
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-400/30 text-blue-300 text-xs font-bold">
                        <FileText className="w-3.5 h-3.5 text-blue-400" />
                        <span className="truncate max-w-[200px]">{notice.fileName || 'Attached Notice Document'}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Card Action Footer */}
              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                <span className="text-slate-400 text-[11px]">
                  By <strong className="text-slate-200 font-semibold">{notice.publishedBy || 'Executive Committee'}</strong>
                </span>

                <span className="inline-flex items-center gap-1 text-emerald-400 font-bold group-hover:translate-x-0.5 transition-transform text-[11px]">
                  <span>Read Notice</span>
                  <span>&rarr;</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Active Notice Detail Modal - Translucent Dark Glass */}
      {activeNoticeModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-slate-950/90 backdrop-blur-2xl border border-white/15 rounded-3xl max-w-2xl w-full p-6 sm:p-8 text-white shadow-2xl relative my-8">
            <button
              type="button"
              onClick={() => setActiveNoticeModal(null)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-2 mb-3">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-extrabold uppercase tracking-wide border ${getCategoryBadgeClass(activeNoticeModal.category)}`}>
                {activeNoticeModal.category || 'Notice'}
              </span>
              <span className="text-slate-400 text-xs font-mono">
                {activeNoticeModal.date}
              </span>
              {activeNoticeModal.isPinned && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Pinned Notice
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mb-4 leading-snug">
              {activeNoticeModal.title}
            </h2>

            {/* Notice Full Content */}
            <div className="text-slate-200 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap mb-6 bg-slate-900/50 rounded-2xl p-4 sm:p-5 border border-white/10 font-sans">
              {activeNoticeModal.content}
            </div>

            {/* Attached File / Document */}
            {activeNoticeModal.fileUrl && (
              <div className="mb-6 p-4 rounded-2xl bg-slate-900/60 border border-white/10">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-emerald-400" />
                    <span>Attached Document</span>
                  </span>
                  <a
                    href={activeNoticeModal.fileUrl}
                    download={activeNoticeModal.fileName || 'NGDCSC_Notice'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-all cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download File</span>
                  </a>
                </div>

                {activeNoticeModal.fileType === 'image' ? (
                  <div className="rounded-xl overflow-hidden bg-black/40 border border-white/10 max-h-96 flex items-center justify-center">
                    <img 
                      src={activeNoticeModal.fileUrl} 
                      alt="Notice attachment" 
                      className="w-full h-auto max-h-96 object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-white/10 text-xs">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-400 shrink-0" />
                      <div>
                        <p className="font-bold text-white">{activeNoticeModal.fileName || 'Notice Document'}</p>
                        <p className="text-[10px] text-slate-400 font-mono">PDF / Document File</p>
                      </div>
                    </div>
                    <a
                      href={activeNoticeModal.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-xs"
                    >
                      Open
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-white/10 text-xs">
              <span className="text-slate-400">
                Published by: <strong className="text-white">{activeNoticeModal.publishedBy || 'Executive Committee'}</strong>
              </span>

              <button
                type="button"
                onClick={() => setActiveNoticeModal(null)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
