import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Calendar,
  FileText,
  Pin,
  Link2,
  Check,
  ChevronRight,
  BookOpen
} from 'lucide-react';
import { ClubNotice } from './types';
import { subscribeToNotices, getCachedNotices } from './services/firebase';
import DotLoader from './components/DotLoader';

interface NoticesPageProps {
  onBack: () => void;
  onOpenNotice: (notice: ClubNotice) => void;
  onOpenAdmin?: () => void;
}

export default function NoticesPage({ onBack, onOpenNotice }: NoticesPageProps) {
  const [notices, setNotices] = useState<ClubNotice[]>(() => getCachedNotices());
  const [loading, setLoading] = useState(() => getCachedNotices().length === 0);
  const [copiedNoticeId, setCopiedNoticeId] = useState<string | null>(null);

  // Real-time listener for notices
  useEffect(() => {
    const unsubscribe = subscribeToNotices((liveNotices) => {
      setNotices(liveNotices);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const sortedNotices = [...notices].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime();
  });

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case 'Urgent':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Olympiad':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Workshop':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'General':
        return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'Notice':
      default:
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
  };

  const getNoticeShareUrl = (noticeId: string) => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/notices?id=${encodeURIComponent(noticeId)}`;
  };

  const handleCopyNoticeLink = (noticeId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const url = getNoticeShareUrl(noticeId);
    if (!url) return;

    const markCopied = () => {
      setCopiedNoticeId(noticeId);
      setTimeout(() => {
        setCopiedNoticeId((prev) => (prev === noticeId ? null : prev));
      }, 2000);
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(markCopied).catch(() => {
        fallbackCopy(url);
        markCopied();
      });
    } else {
      fallbackCopy(url);
      markCopied();
    }
  };

  const fallbackCopy = (text: string) => {
    try {
      const el = document.createElement('textarea');
      el.value = text;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    } catch {
      // ignore
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 pt-24 sm:pt-28 pb-12 relative z-10 overflow-x-hidden formal-page-enter">
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 text-xs font-medium border border-slate-200 shadow-2xs transition-colors cursor-pointer shrink-0"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-emerald-600" />
          <span>Back to Home</span>
        </button>

        <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight truncate">
          Notices
        </h1>
      </div>

      {/* Notices List */}
      {loading ? (
        <div className="py-20 text-center">
          <DotLoader size="lg" color="emerald" className="mx-auto mb-3" />
          <p className="text-xs font-medium text-slate-500">Loading notices...</p>
        </div>
      ) : sortedNotices.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8">
          <FileText className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-800">No notices published yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sortedNotices.map((notice) => {
            const isCopied = copiedNoticeId === notice.id;
            const isPdf = Boolean(
              notice.fileUrl &&
                (notice.fileType === 'pdf' ||
                  notice.fileUrl.startsWith('data:application/pdf') ||
                  notice.fileName?.toLowerCase().endsWith('.pdf'))
            );
            return (
              <div
                key={notice.id}
                onClick={() => onOpenNotice(notice)}
                className={`group min-w-0 break-words rounded-2xl bg-white border p-5 transition-all duration-200 hover:shadow-md cursor-pointer flex flex-col justify-between overflow-hidden ${
                  notice.isPinned
                    ? 'border-emerald-300'
                    : 'border-slate-200/90 hover:border-slate-300'
                }`}
              >
                <div className="min-w-0">
                  {/* Header: Category, Pinned, Date */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${getCategoryBadgeClass(
                          notice.category
                        )}`}
                      >
                        {notice.category || 'Notice'}
                      </span>
                      {notice.isPinned && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                          <Pin className="w-2.5 h-2.5 rotate-45 text-amber-600" />
                          <span>Pinned</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-slate-400 font-mono text-[11px] shrink-0">
                      <Calendar className="w-3 h-3" />
                      <span>{notice.date}</span>
                    </div>
                  </div>

                  {/* Notice Title */}
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition-colors leading-snug line-clamp-2 break-words mb-2">
                    {notice.title}
                  </h3>

                  {/* Notice Body Snippet */}
                  <p className="text-xs sm:text-[13px] text-slate-600 line-clamp-3 leading-relaxed break-words">
                    {notice.content}
                  </p>

                  {/* Attachment Preview (Clean, fitted inside card) */}
                  {notice.fileUrl && (
                    <div className="mt-3.5 pt-3 border-t border-slate-100">
                      {notice.fileType === 'image' || notice.fileUrl.startsWith('data:image') ? (
                        <div className="rounded-xl overflow-hidden bg-slate-50 border border-slate-200/80 flex items-center justify-center">
                          <img
                            src={notice.fileUrl}
                            alt={notice.title}
                            loading="lazy"
                            decoding="async"
                            className="w-full max-h-48 object-contain"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-medium w-full justify-between min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            {isPdf ? (
                              <BookOpen className="w-4 h-4 text-emerald-600 shrink-0" />
                            ) : (
                              <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                            )}
                            <span className="truncate">{notice.fileName || 'Attachment'}</span>
                          </div>
                          {isPdf && (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded shrink-0">
                              Read PDF
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer with Copy Link & Read Notice indicator */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 group-hover:translate-x-0.5 transition-transform">
                    <span>Open Notice</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>

                  <button
                    type="button"
                    onClick={(e) => handleCopyNoticeLink(notice.id, e)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                      isCopied
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Link Copied</span>
                      </>
                    ) : (
                      <>
                        <Link2 className="w-3.5 h-3.5" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
