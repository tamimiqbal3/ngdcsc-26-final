import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Calendar,
  Download,
  FileText,
  Pin,
  Link2,
  Check,
  X
} from 'lucide-react';
import { ClubNotice } from './types';
import { subscribeToNotices, getCachedNotices } from './services/firebase';
import DotLoader from './components/DotLoader';

interface NoticesPageProps {
  onBack: () => void;
  onOpenAdmin?: () => void;
}

export default function NoticesPage({ onBack }: NoticesPageProps) {
  const [notices, setNotices] = useState<ClubNotice[]>(() => getCachedNotices());
  const [loading, setLoading] = useState(() => getCachedNotices().length === 0);
  const [activeNoticeModal, setActiveNoticeModal] = useState<ClubNotice | null>(null);
  const [copiedNoticeId, setCopiedNoticeId] = useState<string | null>(null);
  const [initialDeepLinkHandled, setInitialDeepLinkHandled] = useState(false);

  // Real-time listener for notices
  useEffect(() => {
    const unsubscribe = subscribeToNotices((liveNotices) => {
      setNotices(liveNotices);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Auto-open specific notice when visited via shared ?id=... link
  useEffect(() => {
    if (initialDeepLinkHandled || notices.length === 0 || typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const targetId = params.get('id');
    if (targetId) {
      const matched = notices.find((n) => n.id === targetId);
      if (matched) {
        setActiveNoticeModal(matched);
      }
      setInitialDeepLinkHandled(true);
    } else {
      setInitialDeepLinkHandled(true);
    }
  }, [notices, initialDeepLinkHandled]);

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

  const openNoticeModal = (notice: ClubNotice) => {
    setActiveNoticeModal(notice);
    try {
      window.history.replaceState(null, '', `/notices?id=${encodeURIComponent(notice.id)}`);
    } catch {
      // ignore
    }
  };

  const closeNoticeModal = () => {
    setActiveNoticeModal(null);
    try {
      window.history.replaceState(null, '', '/notices');
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
            return (
              <div
                key={notice.id}
                onClick={() => openNoticeModal(notice)}
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
                            <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span className="truncate">{notice.fileName || 'Attachment'}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Minimal Footer with Copy Link */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end">
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

      {/* Active Notice Detail Modal (Strictly fits viewport with internal scroll) */}
      {activeNoticeModal && (
        <div
          onClick={closeNoticeModal}
          className="fixed inset-0 z-50 bg-slate-900/45 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full max-h-[88vh] flex flex-col overflow-hidden text-slate-900 shadow-2xl relative"
          >
            {/* Fixed Modal Header */}
            <div className="px-5 sm:px-7 pt-5 pb-4 border-b border-slate-100 shrink-0 relative">
              <button
                type="button"
                onClick={closeNoticeModal}
                aria-label="Close notice"
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center flex-wrap gap-2 mb-2.5 pr-10">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wide border ${getCategoryBadgeClass(
                    activeNoticeModal.category
                  )}`}
                >
                  {activeNoticeModal.category || 'Notice'}
                </span>
                <span className="text-slate-500 text-xs font-mono">
                  {activeNoticeModal.date}
                </span>
                {activeNoticeModal.isPinned && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                    Pinned
                  </span>
                )}
              </div>

              <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight leading-snug break-words pr-8">
                {activeNoticeModal.title}
              </h2>
            </div>

            {/* Scrollable Modal Content */}
            <div className="px-5 sm:px-7 py-4 overflow-y-auto flex-1 min-h-0 space-y-5">
              {activeNoticeModal.content && (
                <div className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap break-words font-sans">
                  {activeNoticeModal.content}
                </div>
              )}

              {activeNoticeModal.fileUrl && (
                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 min-w-0">
                      <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="truncate">{activeNoticeModal.fileName || 'Attachment'}</span>
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={activeNoticeModal.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors"
                      >
                        <span>Open</span>
                      </a>
                      <a
                        href={activeNoticeModal.fileUrl}
                        download={activeNoticeModal.fileName || 'NGDCSC_Notice'}
                        className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </a>
                    </div>
                  </div>

                  {(activeNoticeModal.fileType === 'image' ||
                    activeNoticeModal.fileUrl.startsWith('data:image')) && (
                    <div className="rounded-xl overflow-hidden bg-slate-50 border border-slate-200 w-full flex items-center justify-center p-2">
                      <img
                        src={activeNoticeModal.fileUrl}
                        alt={activeNoticeModal.title}
                        className="max-w-full w-auto max-h-[48vh] object-contain rounded-lg"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Fixed Modal Footer */}
            <div className="px-5 sm:px-7 py-3.5 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between gap-2 shrink-0 text-xs">
              <button
                type="button"
                onClick={() => handleCopyNoticeLink(activeNoticeModal.id)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-semibold border transition-colors cursor-pointer ${
                  copiedNoticeId === activeNoticeModal.id
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                {copiedNoticeId === activeNoticeModal.id ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Link Copied</span>
                  </>
                ) : (
                  <>
                    <Link2 className="w-3.5 h-3.5" />
                    <span>Copy Share Link</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={closeNoticeModal}
                className="px-4 py-2 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
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
