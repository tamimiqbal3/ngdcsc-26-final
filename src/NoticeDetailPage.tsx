import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Calendar,
  FileText,
  Pin,
  Link2,
  Check,
  Download,
  Bell,
  User
} from 'lucide-react';
import { ClubNotice } from './types';
import DotLoader from './components/DotLoader';
import PdfInlineViewer from './components/PdfInlineViewer';

interface NoticeDetailPageProps {
  notice: ClubNotice | null;
  loading?: boolean;
  backLabel?: string;
  onBack: () => void;
  onViewAllNotices?: () => void;
  onNoticeViewed?: (noticeId: string) => void;
}

export default function NoticeDetailPage({
  notice,
  loading = false,
  backLabel = 'Back',
  onBack,
  onViewAllNotices,
  onNoticeViewed
}: NoticeDetailPageProps) {
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (notice?.id && onNoticeViewed) {
      onNoticeViewed(notice.id);
    }
  }, [notice?.id, onNoticeViewed]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [notice?.id]);

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

  const handleCopyLink = () => {
    if (!notice || typeof window === 'undefined') return;
    const url = `${window.location.origin}/notices?id=${encodeURIComponent(notice.id)}`;

    const markCopied = () => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(markCopied).catch(() => {});
    }
  };

  const isImageAttachment = Boolean(
    notice?.fileUrl &&
      (notice.fileType === 'image' || notice.fileUrl.startsWith('data:image'))
  );

  const isPdfAttachment = Boolean(
    notice?.fileUrl &&
      (notice.fileType === 'pdf' ||
        notice.fileUrl.startsWith('data:application/pdf') ||
        notice.fileName?.toLowerCase().endsWith('.pdf'))
  );

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 pt-24 sm:pt-28 pb-16 relative z-10 overflow-x-hidden formal-page-enter">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between gap-2.5 flex-wrap mb-6">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 text-xs font-semibold border border-slate-200 shadow-2xs transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-emerald-600" />
          <span>{backLabel}</span>
        </button>

        <div className="flex items-center gap-2">
          {onViewAllNotices && (
            <button
              type="button"
              onClick={onViewAllNotices}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 shadow-2xs transition-colors cursor-pointer"
            >
              <Bell className="w-3.5 h-3.5 text-emerald-600" />
              <span>All Notices</span>
            </button>
          )}

          {notice && (
            <button
              type="button"
              onClick={handleCopyLink}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold border shadow-2xs transition-colors cursor-pointer ${
                copiedLink
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Link Copied</span>
                </>
              ) : (
                <>
                  <Link2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Copy Share Link</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Loading / Not Found / Full Notice Page */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-xs">
          <DotLoader size="lg" color="emerald" className="mx-auto mb-3" />
          <p className="text-xs font-medium text-slate-500">Loading notice details...</p>
        </div>
      ) : !notice ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs space-y-4">
          <FileText className="w-10 h-10 text-slate-400 mx-auto" />
          <div className="space-y-1">
            <h1 className="text-lg font-bold text-slate-900">Notice Not Found</h1>
            <p className="text-xs sm:text-sm text-slate-500">
              This notice may have been removed or is no longer available.
            </p>
          </div>
          <button
            type="button"
            onClick={onViewAllNotices || onBack}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>View Notice Board</span>
          </button>
        </div>
      ) : (
        <article className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
          {/* Document Header */}
          <div className="px-5 sm:px-8 pt-6 sm:pt-8 pb-5 border-b border-slate-100 space-y-3">
            <div className="flex items-center flex-wrap gap-2">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wide border ${getCategoryBadgeClass(
                  notice.category
                )}`}
              >
                {notice.category || 'Notice'}
              </span>

              {notice.isPinned && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                  <Pin className="w-3 h-3 rotate-45 text-amber-600" />
                  <span>Pinned</span>
                </span>
              )}

              <span className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-500 ml-auto">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{notice.date}</span>
              </span>
            </div>

            <h1 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight leading-snug break-words">
              {notice.title}
            </h1>

            {notice.publishedBy && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium pt-0.5">
                <User className="w-3.5 h-3.5 text-emerald-600" />
                <span>Published by {notice.publishedBy}</span>
              </div>
            )}
          </div>

          {/* Notice Body Content */}
          <div className="px-5 sm:px-8 py-6 sm:py-7 space-y-6">
            {notice.content && (
              <div className="text-slate-700 text-sm sm:text-[15px] leading-relaxed whitespace-pre-wrap break-words font-sans">
                {notice.content}
              </div>
            )}

            {/* Embedded Attachment Reader (PDF / Image / Doc) */}
            {notice.fileUrl && (
              <div className="pt-5 border-t border-slate-100 space-y-3.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="text-xs sm:text-sm font-bold text-slate-800 truncate">
                      {notice.fileName || (isPdfAttachment ? 'Attached PDF Document' : 'Attachment')}
                    </span>
                  </div>

                  {!isPdfAttachment && (
                    <a
                      href={notice.fileUrl}
                      download={notice.fileName || 'NGDCSC_Notice'}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </a>
                  )}

                  {isPdfAttachment && (
                    <a
                      href={notice.fileUrl}
                      download={notice.fileName || 'NGDCSC_Notice.pdf'}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors shrink-0"
                      title="Optional offline copy"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Save Copy</span>
                    </a>
                  )}
                </div>

                {isPdfAttachment ? (
                  <PdfInlineViewer
                    fileUrl={notice.fileUrl}
                    fileName={notice.fileName}
                  />
                ) : isImageAttachment ? (
                  <div className="rounded-2xl overflow-hidden bg-slate-50 border border-slate-200 w-full flex items-center justify-center p-2 sm:p-3">
                    <img
                      src={notice.fileUrl}
                      alt={notice.title}
                      className="max-w-full w-auto max-h-[75vh] object-contain rounded-xl"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                    <span className="text-xs font-medium text-slate-700 truncate">
                      {notice.fileName || 'Document Attachment'}
                    </span>
                    <a
                      href={notice.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shrink-0"
                    >
                      Open Document
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        </article>
      )}
    </div>
  );
}
