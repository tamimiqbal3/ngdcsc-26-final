import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Send,
  Search,
  MessageSquare,
  User as UserIcon,
  ArrowLeft,
  AlertCircle,
  CheckCheck,
  CheckCircle2,
  X,
  Users,
  Check,
  Mail,
  Phone,
  Calendar,
  Hash,
  Award,
  ShieldCheck
} from 'lucide-react';
import {
  SubmissionRecord,
  InboxThread,
  InboxMessage,
  PRESIDENT_EMAIL,
  PRESIDENT_DISPLAY_NAME,
  PRESIDENT_ROLE_LABEL,
  PRESIDENT_PHOTO_URL,
  getEffectiveMemberGroup,
  GROUP_BADGE_STYLES
} from '../types';
import {
  isPresidentEmail,
  getMemberInboxThreadId,
  subscribeToPresidentInboxThreads,
  subscribeToMemberInboxThread,
  subscribeToInboxMessages,
  sendInboxMessage,
  sendPresidentIndividualBroadcast,
  markInboxThreadRead,
  getCachedPresidentInboxThreads,
  getCachedMemberInboxThread,
  getCachedInboxMessages
} from '../services/firebase';
import DotLoader from './DotLoader';
import NotificationToggleControl from './NotificationToggleControl';

interface InboxPanelProps {
  currentUserEmail: string;
  currentUserUid?: string | null;
  currentMember?: SubmissionRecord | null;
  allMembers?: SubmissionRecord[];
  onUnreadCountChange?: (count: number) => void;
  fullScreen?: boolean;
  onBack?: () => void;
  backLabel?: string;
}

interface PresidentContactRow {
  threadId: string;
  memberId: string;
  memberUid?: string | null;
  name: string;
  email: string;
  status?: string;
  studentId?: string;
  membershipId?: string;
  batch?: string;
  section?: string;
  photo?: string | null;
  thread?: InboxThread;
}

function formatMessageTime(iso: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function formatMessageDateLabel(iso: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const now = new Date();
    const todayKey = now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (d.toDateString() === todayKey) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '';
  }
}

function formatShortThreadTime(iso?: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

function isMessageSeen(msgCreatedAt?: string, recipientLastReadAt?: string): boolean {
  if (!msgCreatedAt || !recipientLastReadAt) return false;
  const msgMs = Date.parse(msgCreatedAt);
  const readMs = Date.parse(recipientLastReadAt);
  if (!Number.isNaN(msgMs) && !Number.isNaN(readMs)) {
    return msgMs <= readMs;
  }
  return msgCreatedAt <= recipientLastReadAt;
}

function pickLatestIso(...values: Array<string | null | undefined>): string | undefined {
  let best: string | undefined;
  let bestMs = -Infinity;
  for (const val of values) {
    if (!val) continue;
    const ms = Date.parse(val);
    if (!Number.isNaN(ms)) {
      if (ms > bestMs || (ms === bestMs && (!best || val > best))) {
        bestMs = ms;
        best = val;
      }
    } else if (!best || val > best) {
      best = val;
    }
  }
  return best;
}

/**
 * Safely parses URLs in chat messages (https://..., http://..., www....) and renders them as real clickable links.
 */
function renderMessageTextWithLinks(text: string, isMineBubble: boolean): React.ReactNode {
  const urlPattern = /((?:https?:\/\/|www\.)[^\s<>]+)/gi;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let partKey = 0;

  while ((match = urlPattern.exec(text)) !== null) {
    const matchStart = match.index;
    const rawToken = match[0];

    if (matchStart > lastIndex) {
      parts.push(
        <React.Fragment key={`t-${partKey++}`}>
          {text.slice(lastIndex, matchStart)}
        </React.Fragment>
      );
    }

    // Separate trailing sentence punctuation that is not part of the URL
    let cleanUrl = rawToken;
    let trailing = '';
    while (cleanUrl.length > 0 && /[.,!?;:'"\]>]$/.test(cleanUrl)) {
      trailing = cleanUrl.slice(-1) + trailing;
      cleanUrl = cleanUrl.slice(0, -1);
    }
    while (
      cleanUrl.endsWith(')') &&
      (cleanUrl.match(/\(/g)?.length || 0) < (cleanUrl.match(/\)/g)?.length || 0)
    ) {
      trailing = ')' + trailing;
      cleanUrl = cleanUrl.slice(0, -1);
    }

    const candidateHref = cleanUrl.toLowerCase().startsWith('www.')
      ? `https://${cleanUrl}`
      : cleanUrl;

    let isSafeHttpUrl = false;
    try {
      const parsed = new URL(candidateHref);
      isSafeHttpUrl = parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      isSafeHttpUrl = false;
    }

    if (isSafeHttpUrl) {
      parts.push(
        <a
          key={`l-${partKey++}`}
          href={candidateHref}
          target="_blank"
          rel="noopener noreferrer"
          className={`underline decoration-1.5 underline-offset-2 font-semibold break-all transition-opacity hover:opacity-80 ${
            isMineBubble ? 'text-cyan-200' : 'text-blue-600'
          }`}
        >
          {cleanUrl}
        </a>
      );
    } else {
      parts.push(
        <React.Fragment key={`u-${partKey++}`}>{cleanUrl}</React.Fragment>
      );
    }

    if (trailing) {
      parts.push(
        <React.Fragment key={`p-${partKey++}`}>{trailing}</React.Fragment>
      );
    }

    lastIndex = matchStart + rawToken.length;
  }

  if (lastIndex < text.length) {
    parts.push(
      <React.Fragment key={`t-${partKey++}`}>{text.slice(lastIndex)}</React.Fragment>
    );
  }

  return parts.length > 0 ? parts : text;
}

function PresidentAvatar({ sizeClass = 'w-10 h-10' }: { sizeClass?: string }) {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div
      className={`${sizeClass} rounded-full overflow-hidden bg-slate-800 border border-white/20 flex items-center justify-center shrink-0 shadow-xs`}
    >
      {!imgFailed ? (
        <img
          src={PRESIDENT_PHOTO_URL}
          alt={PRESIDENT_DISPLAY_NAME}
          onError={() => setImgFailed(true)}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
      ) : (
        <span className="text-emerald-300 font-black text-xs">TI</span>
      )}
    </div>
  );
}

export default function InboxPanel({
  currentUserEmail,
  currentUserUid,
  currentMember,
  allMembers = [],
  onUnreadCountChange,
  fullScreen = false,
  onBack,
  backLabel = 'Back to Dashboard'
}: InboxPanelProps) {
  const isPresident = isPresidentEmail(currentUserEmail);

  // President states
  const [threads, setThreads] = useState<InboxThread[]>(() =>
    isPresident ? getCachedPresidentInboxThreads() : []
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [listFilter, setListFilter] = useState<'all' | 'chats'>('all');
  const [selectedContact, setSelectedContact] = useState<PresidentContactRow | null>(null);
  const [mobileShowThread, setMobileShowThread] = useState(false);
  const [viewingContactDetails, setViewingContactDetails] = useState<PresidentContactRow | null>(null);

  // President Individual Broadcast Modal states (send same text individually to all/selected members)
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastScope, setBroadcastScope] = useState<'all' | 'approved' | 'selected'>('all');
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<string[]>([]);
  const [broadcastSearch, setBroadcastSearch] = useState('');
  const [broadcastText, setBroadcastText] = useState('');
  const [broadcastSending, setBroadcastSending] = useState(false);
  const [broadcastProgress, setBroadcastProgress] = useState<{ done: number; total: number } | null>(null);
  const [broadcastError, setBroadcastError] = useState<string | null>(null);
  const [broadcastBanner, setBroadcastBanner] = useState<string | null>(null);

  // Member states
  const [myThread, setMyThread] = useState<InboxThread | null>(() =>
    !isPresident && currentUserUid ? getCachedMemberInboxThread(currentUserUid) : null
  );

  // Shared active conversation states
  const activeThreadId = useMemo(() => {
    if (isPresident) {
      return selectedContact?.threadId || null;
    }
    if (myThread?.id) return myThread.id;
    if (currentMember) return getMemberInboxThreadId(currentMember);
    if (currentUserEmail) {
      return getMemberInboxThreadId({ email: currentUserEmail });
    }
    return null;
  }, [isPresident, selectedContact?.threadId, myThread?.id, currentMember, currentUserEmail]);

  const shouldSubscribeMessages = useMemo(() => {
    if (!activeThreadId) return false;
    if (isPresident) return true;
    return Boolean(myThread && myThread.id === activeThreadId);
  }, [activeThreadId, isPresident, myThread]);

  const [messages, setMessages] = useState<InboxMessage[]>(() =>
    activeThreadId ? getCachedInboxMessages(activeThreadId) : []
  );
  const [draftText, setDraftText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const lastReadSyncRef = useRef<Record<string, string>>({});
  const [visibilityPulse, setVisibilityPulse] = useState(0);

  useEffect(() => {
    const bump = () => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        setVisibilityPulse((n) => n + 1);
      }
    };
    window.addEventListener('focus', bump);
    document.addEventListener('visibilitychange', bump);
    return () => {
      window.removeEventListener('focus', bump);
      document.removeEventListener('visibilitychange', bump);
    };
  }, []);

  useEffect(() => {
    const el = composerRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [draftText]);

  // Subscribe to thread list (President vs Member)
  useEffect(() => {
    if (isPresident) {
      return subscribeToPresidentInboxThreads((list) => {
        setThreads(list);
      });
    }
    if (!currentUserUid) return;
    return subscribeToMemberInboxThread(
      currentUserUid,
      currentMember?.email || currentUserEmail,
      (thread) => {
        setMyThread(thread);
      }
    );
  }, [isPresident, currentUserUid, currentUserEmail, currentMember?.email]);

  // Propagate unread count up to Dashboard/Admin badge
  useEffect(() => {
    if (!onUnreadCountChange) return;
    if (isPresident) {
      const total = threads.reduce((sum, t) => sum + (t.unreadByPresident || 0), 0);
      onUnreadCountChange(total);
    } else {
      onUnreadCountChange(myThread?.unreadByMember || 0);
    }
  }, [isPresident, threads, myThread?.unreadByMember, onUnreadCountChange]);

  // Subscribe to messages of the active conversation
  useEffect(() => {
    if (!activeThreadId || !shouldSubscribeMessages) {
      setMessages([]);
      return;
    }
    const cached = getCachedInboxMessages(activeThreadId);
    setMessages(cached);

    const unsub = subscribeToInboxMessages(activeThreadId, (msgs) => {
      setMessages(msgs);
    });
    return () => unsub();
  }, [activeThreadId, shouldSubscribeMessages]);

  // Clear unread counter & persist read receipt timestamp immediately in Firestore when viewing chat
  useEffect(() => {
    if (!activeThreadId) return;
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
      return;
    }

    if (isPresident) {
      if (!selectedContact) return;
      const th = threads.find((t) => t.id === activeThreadId);
      if (!th) return;

      const latestMemberMsg = [...messages]
        .reverse()
        .find((m) => m.senderRole === 'member');
      const latestMemberTs = pickLatestIso(
        latestMemberMsg?.createdAt,
        th.lastSenderRole === 'member' ? th.lastMessageAt : undefined
      );

      const needsMark =
        (th.unreadByPresident || 0) > 0 ||
        Boolean(latestMemberTs && !isMessageSeen(latestMemberTs, th.presidentLastReadAt));

      if (needsMark) {
        const syncSignature = `president:${th.unreadByPresident || 0}:${latestMemberTs || ''}:${th.presidentLastReadAt || ''}`;
        if (lastReadSyncRef.current[activeThreadId] === syncSignature) return;
        lastReadSyncRef.current[activeThreadId] = syncSignature;

        markInboxThreadRead(activeThreadId, 'president', {
          latestIncomingCreatedAt: latestMemberTs,
          currentLastReadAt: th.presidentLastReadAt
        }).catch(() => {
          delete lastReadSyncRef.current[activeThreadId];
        });
      }
    } else if (myThread && myThread.id === activeThreadId) {
      const latestPresidentMsg = [...messages]
        .reverse()
        .find((m) => m.senderRole === 'president');
      const latestPresidentTs = pickLatestIso(
        latestPresidentMsg?.createdAt,
        myThread.lastSenderRole === 'president' ? myThread.lastMessageAt : undefined
      );

      const needsUidLink = Boolean(!myThread.memberUid && currentUserUid);
      const needsMark =
        (myThread.unreadByMember || 0) > 0 ||
        Boolean(latestPresidentTs && !isMessageSeen(latestPresidentTs, myThread.memberLastReadAt)) ||
        needsUidLink;

      if (needsMark) {
        const syncSignature = `member:${myThread.unreadByMember || 0}:${latestPresidentTs || ''}:${myThread.memberLastReadAt || ''}:${myThread.memberUid || ''}`;
        if (lastReadSyncRef.current[activeThreadId] === syncSignature) return;
        lastReadSyncRef.current[activeThreadId] = syncSignature;

        markInboxThreadRead(activeThreadId, 'member', {
          latestIncomingCreatedAt: latestPresidentTs,
          currentLastReadAt: myThread.memberLastReadAt,
          viewerUid: currentUserUid,
          currentMemberUid: myThread.memberUid
        }).catch(() => {
          delete lastReadSyncRef.current[activeThreadId];
        });
      }
    }
  }, [activeThreadId, isPresident, selectedContact, threads, myThread, messages, currentUserUid, visibilityPulse]);

  // Auto-scroll to newest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, activeThreadId]);

  // Build unified searchable contact list for Tamim Iqbal (President)
  const presidentContacts = useMemo<PresidentContactRow[]>(() => {
    if (!isPresident) return [];

    const threadsById = new Map<string, InboxThread>();
    const threadsByEmail = new Map<string, InboxThread>();
    threads.forEach((t) => {
      threadsById.set(t.id, t);
      if (t.memberId) threadsById.set(t.memberId, t);
      if (t.memberEmailLower) threadsByEmail.set(t.memberEmailLower, t);
    });

    const usedThreadIds = new Set<string>();
    const rows: PresidentContactRow[] = [];

    allMembers.forEach((m) => {
      if ((m.status as any) === 'deleted') return;
      const emailClean = (m.email || '').trim();
      const emailLower = emailClean.toLowerCase();
      if (emailLower === PRESIDENT_EMAIL) return;

      const defaultThreadId = getMemberInboxThreadId(m);
      const matchedThread =
        threadsById.get(defaultThreadId) ||
        (m.id ? threadsById.get(m.id) : undefined) ||
        (emailLower ? threadsByEmail.get(emailLower) : undefined);

      if (matchedThread) {
        usedThreadIds.add(matchedThread.id);
      }

      rows.push({
        threadId: matchedThread?.id || defaultThreadId,
        memberId: m.id || defaultThreadId,
        memberUid: m.uid || matchedThread?.memberUid || null,
        name: m.name || matchedThread?.memberName || 'Club Member',
        email: emailClean || matchedThread?.memberEmail || '',
        status: m.status,
        studentId: m.studentId || matchedThread?.memberRoll,
        membershipId: m.membershipId || matchedThread?.memberMembershipId,
        batch: m.batch || matchedThread?.memberBatch,
        section: m.section || matchedThread?.memberSection,
        photo: m.photo || matchedThread?.memberPhoto || null,
        thread: matchedThread
      });
    });

    threads.forEach((t) => {
      if (usedThreadIds.has(t.id)) return;
      if (t.memberEmailLower === PRESIDENT_EMAIL) return;
      rows.push({
        threadId: t.id,
        memberId: t.memberId || t.id,
        memberUid: t.memberUid || null,
        name: t.memberName || t.memberEmail || 'Club Member',
        email: t.memberEmail || '',
        studentId: t.memberRoll,
        membershipId: t.memberMembershipId,
        batch: t.memberBatch,
        section: t.memberSection,
        photo: t.memberPhoto || null,
        thread: t
      });
    });

    rows.sort((a, b) => {
      const aTime = a.thread?.lastMessageAt || '';
      const bTime = b.thread?.lastMessageAt || '';
      if (aTime && bTime) return bTime.localeCompare(aTime);
      if (aTime) return -1;
      if (bTime) return 1;
      return a.name.localeCompare(b.name);
    });

    return rows;
  }, [isPresident, allMembers, threads]);

  const activeContact = useMemo<PresidentContactRow | null>(() => {
    if (!isPresident || !selectedContact) return null;
    return (
      presidentContacts.find((c) => c.threadId === selectedContact.threadId) ||
      selectedContact
    );
  }, [isPresident, selectedContact, presidentContacts]);

  const viewingFullMember = useMemo<SubmissionRecord | null>(() => {
    if (!isPresident || !viewingContactDetails) return null;
    const emailLower = (viewingContactDetails.email || '').trim().toLowerCase();
    return (
      allMembers.find(
        (m) =>
          (viewingContactDetails.memberId && m.id === viewingContactDetails.memberId) ||
          (emailLower && (m.email || '').trim().toLowerCase() === emailLower) ||
          (viewingContactDetails.studentId && m.studentId === viewingContactDetails.studentId)
      ) || null
    );
  }, [isPresident, viewingContactDetails, allMembers]);

  const filteredContacts = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return presidentContacts.filter((c) => {
      if (listFilter === 'chats' && !c.thread) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.studentId || '').toLowerCase().includes(q) ||
        (c.membershipId || '').toLowerCase().includes(q)
      );
    });
  }, [presidentContacts, searchTerm, listFilter]);

  const approvedContacts = useMemo(
    () => presidentContacts.filter((c) => c.status === 'approved'),
    [presidentContacts]
  );

  const broadcastSelectableContacts = useMemo(() => {
    const q = broadcastSearch.trim().toLowerCase();
    if (!q) return presidentContacts;
    return presidentContacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.studentId || '').toLowerCase().includes(q) ||
        (c.membershipId || '').toLowerCase().includes(q) ||
        (c.batch || '').toLowerCase().includes(q)
    );
  }, [presidentContacts, broadcastSearch]);

  const broadcastTargetRecipients = useMemo(() => {
    if (broadcastScope === 'all') return presidentContacts;
    if (broadcastScope === 'approved') return approvedContacts;
    const picked = new Set(selectedRecipientIds);
    return presidentContacts.filter((c) => picked.has(c.threadId));
  }, [broadcastScope, presidentContacts, approvedContacts, selectedRecipientIds]);

  const handleOpenBroadcastModal = () => {
    setShowBroadcastModal(true);
    setBroadcastError(null);
    setBroadcastProgress(null);
  };

  const toggleRecipientId = (threadId: string) => {
    setSelectedRecipientIds((prev) =>
      prev.includes(threadId) ? prev.filter((id) => id !== threadId) : [...prev, threadId]
    );
  };

  const handleSendIndividualBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanText = broadcastText.trim();
    if (!cleanText || broadcastSending) return;

    const targets = broadcastTargetRecipients;
    if (targets.length === 0) {
      setBroadcastError('Please choose at least one member to receive this message.');
      return;
    }

    setBroadcastSending(true);
    setBroadcastError(null);
    setBroadcastProgress({ done: 0, total: targets.length });

    try {
      const { sentCount, failedCount } = await sendPresidentIndividualBroadcast({
        recipients: targets,
        senderEmail: currentUserEmail,
        senderUid: currentUserUid || null,
        text: cleanText,
        onProgress: (done, total) => setBroadcastProgress({ done, total })
      });

      setBroadcastText('');
      setShowBroadcastModal(false);
      setBroadcastProgress(null);
      setBroadcastBanner(
        failedCount > 0
          ? `Sent individually to ${sentCount} members (${failedCount} failed).`
          : `Sent individually to ${sentCount} member${sentCount === 1 ? '' : 's'}.`
      );
      setTimeout(() => setBroadcastBanner(null), 4500);
    } catch (err: any) {
      console.error('Broadcast send error:', err);
      setBroadcastError(err?.message || 'Could not send messages. Please try again.');
    } finally {
      setBroadcastSending(false);
    }
  };

  const handleSelectContact = (contact: PresidentContactRow) => {
    setSelectedContact(contact);
    setMobileShowThread(true);
    setSendError(null);
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanText = draftText.trim();
    if (!cleanText || sending) return;

    const targetThreadId = isPresident ? activeContact?.threadId : activeThreadId;
    if (!targetThreadId) return;

    const memberInfo = isPresident && activeContact
      ? {
          id: activeContact.memberId,
          uid: activeContact.memberUid || null,
          email: activeContact.email,
          name: activeContact.name,
          studentId: activeContact.studentId,
          membershipId: activeContact.membershipId,
          batch: activeContact.batch,
          section: activeContact.section,
          photo: activeContact.photo || null
        }
      : {
          id: currentMember?.id || targetThreadId,
          uid: currentUserUid || currentMember?.uid || null,
          email: currentMember?.email || currentUserEmail,
          name: currentMember?.name || currentUserEmail,
          studentId: currentMember?.studentId,
          membershipId: currentMember?.membershipId,
          batch: currentMember?.batch,
          section: currentMember?.section,
          photo: currentMember?.photo || null
        };

    setSending(true);
    setSendError(null);
    const prevDraft = draftText;
    setDraftText('');

    try {
      await sendInboxMessage({
        threadId: targetThreadId,
        memberInfo,
        senderEmail: currentUserEmail,
        senderUid: currentUserUid || null,
        text: cleanText
      });
    } catch (err: any) {
      console.error('Error sending inbox message:', err);
      setDraftText(prevDraft);
      setSendError('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleComposerKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Group messages by date separator & consecutive sender runs
  const renderedMessages = useMemo(() => {
    let lastDateLabel = '';
    return messages.map((msg, idx) => {
      const dateLabel = formatMessageDateLabel(msg.createdAt);
      const showDateSeparator = Boolean(dateLabel && dateLabel !== lastDateLabel);
      if (dateLabel) lastDateLabel = dateLabel;

      const prevMsg = idx > 0 ? messages[idx - 1] : null;
      const nextMsg = idx < messages.length - 1 ? messages[idx + 1] : null;

      const sameSenderAsPrev =
        !showDateSeparator && Boolean(prevMsg && prevMsg.senderRole === msg.senderRole);
      const sameSenderAsNext =
        Boolean(
          nextMsg &&
            nextMsg.senderRole === msg.senderRole &&
            formatMessageDateLabel(nextMsg.createdAt) === dateLabel
        );

      return {
        msg,
        dateLabel,
        showDateSeparator,
        isFirstInRun: !sameSenderAsPrev,
        isLastInRun: !sameSenderAsNext
      };
    });
  }, [messages]);

  // ==================== PRESIDENT INBOX UI (1-on-1 WITH ANY MEMBER + INDIVIDUAL BROADCAST) ====================
  if (isPresident) {
    const totalUnreadForPresident = threads.reduce((sum, t) => sum + (t.unreadByPresident || 0), 0);
    return (
      <div
        className={
          fullScreen
            ? 'h-[100dvh] w-full flex flex-col bg-slate-50 overflow-hidden animate-in fade-in duration-200'
            : 'bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden animate-in fade-in duration-200'
        }
      >
        {/* Top Full-Screen Navigation & President Header */}
        {fullScreen && (
          <div className="h-14 shrink-0 bg-white border-b border-slate-200 px-3 sm:px-6 flex items-center justify-between gap-3 z-20">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors cursor-pointer shrink-0 border border-slate-200/80"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{backLabel}</span>
                </button>
              )}
              <div className="hidden sm:block h-5 w-px bg-slate-200" />
              <div className="flex items-center gap-2 min-w-0">
                <img
                  src="/assets/club-logo.png"
                  alt="NGDC Science Club"
                  className="w-7 h-7 rounded-lg object-contain bg-slate-50 border border-slate-200 p-0.5 shrink-0"
                />
                <span className="text-sm font-black text-slate-900 truncate">Inbox</span>
                {totalUnreadForPresident > 0 && (
                  <span className="px-1.5 py-0.5 min-w-[20px] text-center rounded-full bg-red-600 text-white text-[10px] font-black leading-none">
                    {totalUnreadForPresident}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <NotificationToggleControl compact />
              <button
                type="button"
                onClick={handleOpenBroadcastModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer shrink-0"
              >
                <Users className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Message All Individually</span>
                <span className="sm:hidden">Message All</span>
              </button>
            </div>
          </div>
        )}

        {/* Clean President Identity Header when embedded */}
        {!fullScreen && (
          <div className="px-4 sm:px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative shrink-0">
                <PresidentAvatar sizeClass="w-10 h-10" />
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-slate-900" />
              </div>
              <div className="flex items-center gap-2 min-w-0 flex-wrap">
                <h2 className="text-sm sm:text-base font-bold tracking-tight truncate">
                  {PRESIDENT_DISPLAY_NAME}
                </h2>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-extrabold uppercase tracking-wide">
                  {PRESIDENT_ROLE_LABEL}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleOpenBroadcastModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition-all cursor-pointer shrink-0"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Message All Individually</span>
            </button>
          </div>
        )}

        {/* Broadcast Delivery Toast Banner */}
        {broadcastBanner && (
          <div className="px-4 py-2.5 bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{broadcastBanner}</span>
          </div>
        )}

        {/* Two-Pane Messenger Layout */}
        <div
          className={
            fullScreen
              ? 'flex-1 min-h-0 w-full flex bg-white overflow-hidden'
              : 'grid grid-cols-1 md:grid-cols-12 h-[560px] sm:h-[620px]'
          }
        >
          {/* Left Member List */}
          <div
            className={`${
              fullScreen
                ? 'w-full md:w-[340px] lg:w-[380px] shrink-0'
                : 'md:col-span-5 lg:col-span-4'
            } border-r border-slate-200 flex flex-col bg-white min-h-0 ${
              mobileShowThread ? 'hidden md:flex' : 'flex'
            }`}
          >
            {fullScreen && (
              <div className="px-4 pt-3.5 pb-2 flex items-center justify-between gap-2 border-b border-slate-100">
                <div className="flex items-center gap-2.5 min-w-0">
                  <PresidentAvatar sizeClass="w-8 h-8" />
                  <div className="min-w-0">
                    <p className="text-xs font-extrabold text-slate-900 truncate">{PRESIDENT_DISPLAY_NAME}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">{PRESIDENT_ROLE_LABEL}</p>
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-slate-500">{presidentContacts.length} Members</span>
              </div>
            )}
            <div className="p-3 border-b border-slate-100 space-y-2.5">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search name, roll, email, ID..."
                  className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-100/80 border border-transparent text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-emerald-500 focus:outline-none transition-all"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    aria-label="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100">
                <button
                  type="button"
                  onClick={() => setListFilter('all')}
                  className={`py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    listFilter === 'all'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  All ({presidentContacts.length})
                </button>
                <button
                  type="button"
                  onClick={() => setListFilter('chats')}
                  className={`py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    listFilter === 'chats'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <span>Chats ({threads.length})</span>
                  {threads.reduce((sum, t) => sum + (t.unreadByPresident || 0), 0) > 0 && (
                    <span className="px-1.5 py-0.5 min-w-[16px] text-center rounded-full bg-red-600 text-white text-[10px] font-black leading-none">
                      {threads.reduce((sum, t) => sum + (t.unreadByPresident || 0), 0)}
                    </span>
                  )}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
              {filteredContacts.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <MessageSquare className="w-6 h-6 text-slate-300 mx-auto" />
                  <p className="text-xs font-semibold text-slate-500">No members found</p>
                </div>
              ) : (
                filteredContacts.map((contact) => {
                  const isSelected = activeContact?.threadId === contact.threadId;
                  const unread = contact.thread?.unreadByPresident || 0;
                  return (
                    <button
                      key={contact.threadId}
                      type="button"
                      onClick={() => handleSelectContact(contact)}
                      className={`w-full px-3 py-2.5 rounded-xl text-left flex items-center gap-3 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-50 ring-1 ring-emerald-200/80'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full border border-slate-200 bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                        {contact.photo ? (
                          <img
                            src={contact.photo}
                            alt={contact.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <UserIcon className="w-4 h-4 text-slate-400" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p
                            className={`text-xs truncate ${
                              unread > 0 || isSelected
                                ? 'font-bold text-slate-900'
                                : 'font-semibold text-slate-800'
                            }`}
                          >
                            {contact.name}
                          </p>
                          {contact.thread?.lastMessageAt && (
                            <span
                              className={`text-[10px] shrink-0 ${
                                unread > 0 ? 'font-bold text-red-600' : 'text-slate-400'
                              }`}
                            >
                              {formatShortThreadTime(contact.thread.lastMessageAt)}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between gap-2 mt-0.5">
                          <p
                            className={`text-[11px] truncate flex items-center gap-1 ${
                              unread > 0
                                ? 'font-semibold text-slate-900'
                                : 'text-slate-500'
                            }`}
                          >
                            {contact.thread ? (
                              <>
                                {contact.thread.lastSenderRole === 'president' && (
                                  isMessageSeen(contact.thread.lastMessageAt, contact.thread.memberLastReadAt) ? (
                                    <CheckCheck className="w-3.5 h-3.5 text-sky-600 shrink-0" aria-label="Seen" />
                                  ) : (
                                    <Check className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-label="Sent" />
                                  )
                                )}
                                <span className="truncate">{contact.thread.lastMessage}</span>
                              </>
                            ) : (
                              contact.membershipId ||
                              (contact.batch
                                ? `${contact.batch}${contact.section ? ` • Sec ${contact.section}` : ''}`
                                : 'Tap to message')
                            )}
                          </p>
                          {unread > 0 && (
                            <span className="px-1.5 py-0.5 min-w-[18px] text-center rounded-full bg-red-600 text-white text-[10px] font-black leading-none shrink-0 shadow-2xs">
                              {unread}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Conversation Canvas */}
          <div
            className={`${
              fullScreen ? 'flex-1 min-w-0' : 'md:col-span-7 lg:col-span-8'
            } flex flex-col bg-[#eef3f1] min-h-0 ${
              mobileShowThread ? 'flex' : 'hidden md:flex'
            }`}
          >
            {!activeContact ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-2.5">
                <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-emerald-600 shadow-2xs">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-slate-800">Select a conversation</p>
                <p className="text-xs text-slate-500">Pick any member to view messages or send a text.</p>
              </div>
            ) : (
              <>
                {/* Active Contact Header — Strictly ONLY Tamim Iqbal can click photo/name to inspect member details */}
                <div className="px-4 sm:px-5 py-3 border-b border-slate-200/80 flex items-center justify-between gap-3 bg-white">
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => setMobileShowThread(false)}
                      className="md:hidden p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer shrink-0"
                      aria-label="Back to member list"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setViewingContactDetails(activeContact)}
                      className="flex items-center gap-3 min-w-0 text-left group cursor-pointer rounded-xl py-1 pr-2.5 -ml-1 pl-1 hover:bg-slate-50 transition-colors"
                      title="Click to view full member profile"
                    >
                      <div className="w-10 h-10 rounded-full border border-slate-200 group-hover:border-emerald-400 bg-slate-100 overflow-hidden flex items-center justify-center shrink-0 transition-colors">
                        {activeContact.photo ? (
                          <img
                            src={activeContact.photo}
                            alt={activeContact.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <UserIcon className="w-4 h-4 text-slate-400" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 truncate leading-tight transition-colors">
                          {activeContact.name}
                        </h3>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          {[
                            activeContact.membershipId,
                            activeContact.batch,
                            activeContact.section ? `Sec ${activeContact.section}` : ''
                          ]
                            .filter(Boolean)
                            .join(' • ') || 'View profile details'}
                        </p>
                      </div>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setViewingContactDetails(activeContact)}
                    className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 text-xs font-semibold transition-colors cursor-pointer shrink-0"
                  >
                    <UserIcon className="w-3.5 h-3.5" />
                    <span>Details</span>
                  </button>
                </div>

                {/* Messages Stream */}
                <div className="flex-1 overflow-y-auto px-3.5 sm:px-5 py-4">
                  {renderedMessages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-2 py-8">
                      <div className="w-11 h-11 rounded-2xl bg-white/90 border border-slate-200 flex items-center justify-center text-emerald-600 shadow-2xs">
                        <MessageSquare className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-bold text-slate-700">
                        Say hello to {activeContact.name}
                      </p>
                    </div>
                  ) : (
                    renderedMessages.map(({ msg, dateLabel, showDateSeparator, isFirstInRun, isLastInRun }) => {
                      const isMine = msg.senderRole === 'president';
                      const memberLastRead = activeContact?.thread?.memberLastReadAt;
                      const isSeenByRecipient = isMine && isMessageSeen(msg.createdAt, memberLastRead);
                      return (
                        <React.Fragment key={msg.id}>
                          {showDateSeparator && (
                            <div className="flex justify-center my-3.5">
                              <span className="px-3 py-1 rounded-full bg-white/90 border border-slate-200/80 text-[10px] font-bold text-slate-500 shadow-2xs">
                                {dateLabel}
                              </span>
                            </div>
                          )}

                          <div
                            className={`flex items-end gap-2 ${isMine ? 'justify-end' : 'justify-start'} ${
                              isFirstInRun ? 'mt-3' : 'mt-1'
                            }`}
                          >
                            {!isMine && (
                              <div className="w-7 h-7 shrink-0">
                                {isLastInRun && (
                                  <div className="w-7 h-7 rounded-full overflow-hidden bg-white border border-slate-200 flex items-center justify-center">
                                    {activeContact.photo ? (
                                      <img
                                        src={activeContact.photo}
                                        alt={activeContact.name}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                                    )}
                                  </div>
                                )}
                              </div>
                            )}

                            <div
                              className={`max-w-[78%] sm:max-w-[70%] px-3.5 py-2 shadow-2xs ${
                                isMine
                                  ? `bg-gradient-to-br from-emerald-600 to-emerald-700 text-white rounded-2xl ${
                                      isLastInRun ? 'rounded-br-xs' : ''
                                    }`
                                  : `bg-white text-slate-900 border border-slate-200/80 rounded-2xl ${
                                      isLastInRun ? 'rounded-bl-xs' : ''
                                    }`
                              }`}
                            >
                              <p className="text-[13px] sm:text-sm whitespace-pre-wrap break-words leading-relaxed">
                                {renderMessageTextWithLinks(msg.text, isMine)}
                              </p>
                              <div
                                className={`mt-1 flex items-center justify-end gap-1.5 text-[10px] leading-none ${
                                  isMine ? 'text-emerald-100/90' : 'text-slate-400'
                                }`}
                              >
                                <span>{formatMessageTime(msg.createdAt)}</span>
                                {isMine &&
                                  (isSeenByRecipient ? (
                                    <span
                                      title="Seen"
                                      className="inline-flex items-center px-1 py-0.5 rounded-full bg-white text-sky-600 shadow-2xs"
                                    >
                                      <CheckCheck
                                        className="w-3.5 h-3.5 stroke-[2.6]"
                                        aria-label="Seen"
                                      />
                                    </span>
                                  ) : (
                                    <span
                                      title="Sent"
                                      className="inline-flex items-center text-emerald-100/80"
                                    >
                                      <Check
                                        className="w-3.5 h-3.5 stroke-[2.25]"
                                        aria-label="Sent"
                                      />
                                    </span>
                                  ))}
                              </div>
                            </div>
                          </div>
                        </React.Fragment>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {sendError && (
                  <div className="mx-4 mb-2 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{sendError}</span>
                  </div>
                )}

                {/* Modern Composer */}
                <form
                  onSubmit={handleSend}
                  className="p-3 sm:p-3.5 border-t border-slate-200/80 bg-white"
                >
                  <div className="flex items-end gap-2 bg-slate-100/90 border border-slate-200/90 focus-within:bg-white focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/15 rounded-2xl px-3 py-2 transition-all">
                    <textarea
                      ref={composerRef}
                      rows={1}
                      value={draftText}
                      onChange={(e) => setDraftText(e.target.value)}
                      onKeyDown={handleComposerKeyDown}
                      placeholder={`Message ${activeContact.name}...`}
                      className="flex-1 bg-transparent text-slate-900 placeholder:text-slate-400 text-xs sm:text-sm outline-none resize-none max-h-[140px] overflow-y-auto py-1"
                    />
                    <button
                      type="submit"
                      disabled={!draftText.trim() || sending}
                      className="w-9 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all cursor-pointer disabled:opacity-40 flex items-center justify-center shrink-0"
                      aria-label="Send message"
                    >
                      {sending ? (
                        <DotLoader size="sm" color="white" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>

        {/* Send Same Message Individually to Multiple / All Members Modal */}
        {showBroadcastModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-lg rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <PresidentAvatar sizeClass="w-8 h-8" />
                  <div>
                    <h3 className="text-sm font-bold leading-tight">Send Individually to Members</h3>
                    <p className="text-[11px] text-slate-300">
                      Each member receives this text separately in their 1-on-1 chat
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => !broadcastSending && setShowBroadcastModal(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
                  aria-label="Close modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSendIndividualBroadcast} className="p-5 space-y-4">
                {/* Audience Mode Tabs */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                    Recipients
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-100">
                    <button
                      type="button"
                      onClick={() => setBroadcastScope('all')}
                      className={`py-2 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                        broadcastScope === 'all'
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      All ({presidentContacts.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setBroadcastScope('approved')}
                      className={`py-2 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                        broadcastScope === 'approved'
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Approved ({approvedContacts.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setBroadcastScope('selected')}
                      className={`py-2 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                        broadcastScope === 'selected'
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Custom ({selectedRecipientIds.length})
                    </button>
                  </div>
                </div>

                {/* Custom Member Multi-Picker */}
                {broadcastScope === 'selected' && (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="p-2 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
                      <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <input
                        type="text"
                        value={broadcastSearch}
                        onChange={(e) => setBroadcastSearch(e.target.value)}
                        placeholder="Filter name, roll, email..."
                        className="flex-1 bg-transparent text-xs text-slate-900 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedRecipientIds(
                            selectedRecipientIds.length === presidentContacts.length
                              ? []
                              : presidentContacts.map((c) => c.threadId)
                          )
                        }
                        className="text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer shrink-0"
                      >
                        {selectedRecipientIds.length === presidentContacts.length ? 'Clear' : 'Select All'}
                      </button>
                    </div>
                    <div className="max-h-36 overflow-y-auto divide-y divide-slate-100">
                      {broadcastSelectableContacts.map((c) => {
                        const checked = selectedRecipientIds.includes(c.threadId);
                        return (
                          <button
                            key={c.threadId}
                            type="button"
                            onClick={() => toggleRecipientId(c.threadId)}
                            className="w-full px-3 py-2 text-left flex items-center justify-between gap-2 hover:bg-slate-50 cursor-pointer"
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-900 truncate">{c.name}</p>
                              {(c.membershipId || c.batch) && (
                                <p className="text-[10px] text-slate-500 truncate">
                                  {[c.membershipId, c.batch].filter(Boolean).join(' • ')}
                                </p>
                              )}
                            </div>
                            <span
                              className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                                checked
                                  ? 'bg-emerald-600 border-emerald-600 text-white'
                                  : 'bg-white border-slate-300'
                              }`}
                            >
                              {checked && <Check className="w-3 h-3 stroke-[3]" />}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Message Textarea */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                    Message (Links become clickable automatically)
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={broadcastText}
                    onChange={(e) => setBroadcastText(e.target.value)}
                    placeholder="Write message or paste link (https://...) to send individually to each member..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-900 placeholder:text-slate-400 text-xs sm:text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none resize-y"
                  />
                </div>

                {broadcastError && (
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{broadcastError}</span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    disabled={broadcastSending}
                    onClick={() => setShowBroadcastModal(false)}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={
                      broadcastSending ||
                      !broadcastText.trim() ||
                      broadcastTargetRecipients.length === 0
                    }
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-2"
                  >
                    {broadcastSending ? (
                      <>
                        <DotLoader size="sm" color="white" />
                        <span>
                          Sending {broadcastProgress?.done || 0}/{broadcastProgress?.total || broadcastTargetRecipients.length}...
                        </span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>
                          Send to {broadcastTargetRecipients.length} Individually
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* Tamim Iqbal ONLY: Member Full Details Modal (triggered by clicking member name or photo) */}
        {viewingContactDetails && (
          <div
            className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setViewingContactDetails(null)}
          >
            <div
              className="bg-white w-full max-w-lg max-h-[88dvh] flex flex-col rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Dark Header with Photo, Name, Status & Membership ID */}
              <div className="px-5 py-5 bg-slate-900 text-white flex items-start justify-between gap-4 shrink-0">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-2 border-white/20 bg-slate-800 overflow-hidden flex items-center justify-center shrink-0">
                    {(viewingFullMember?.photo || viewingContactDetails.photo) ? (
                      <img
                        src={viewingFullMember?.photo || viewingContactDetails.photo || ''}
                        alt={viewingFullMember?.name || viewingContactDetails.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <UserIcon className="w-8 h-8 text-slate-400" />
                    )}
                  </div>
                  <div className="min-w-0 space-y-1">
                    <h3 className="text-base sm:text-lg font-black truncate">
                      {viewingFullMember?.name || viewingContactDetails.name}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                      {(viewingFullMember?.membershipId || viewingContactDetails.membershipId) && (
                        <span className="font-mono font-bold text-emerald-400">
                          {viewingFullMember?.membershipId || viewingContactDetails.membershipId}
                        </span>
                      )}
                      {(viewingFullMember?.status || viewingContactDetails.status) && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="capitalize font-semibold text-white">
                            {viewingFullMember?.status || viewingContactDetails.status}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setViewingContactDetails(null)}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white cursor-pointer shrink-0"
                  aria-label="Close member details"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable Details Body */}
              <div className="p-5 overflow-y-auto space-y-5 text-xs sm:text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-slate-100">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Hash className="w-3 h-3" /> College Roll
                    </p>
                    <p className="font-mono font-bold text-slate-900 mt-0.5">
                      {viewingFullMember?.studentId || viewingContactDetails.studentId || '—'}
                    </p>
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Academic Group
                    </p>
                    {(() => {
                      const grp = getEffectiveMemberGroup(
                        viewingFullMember || {
                          studentId: viewingContactDetails.studentId || ''
                        }
                      );
                      return grp ? (
                        <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${GROUP_BADGE_STYLES[grp]}`}>
                          {grp}
                        </span>
                      ) : (
                        <p className="font-semibold text-slate-700 mt-0.5">—</p>
                      );
                    })()}
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Batch &amp; Section
                    </p>
                    <p className="font-bold text-slate-900 mt-0.5">
                      {[
                        viewingFullMember?.batch || viewingContactDetails.batch,
                        (viewingFullMember?.section || viewingContactDetails.section)
                          ? `Section ${viewingFullMember?.section || viewingContactDetails.section}`
                          : ''
                      ]
                        .filter(Boolean)
                        .join(' · ') || '—'}
                    </p>
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Date of Birth
                    </p>
                    <p className="font-mono font-semibold text-slate-800 mt-0.5">
                      {viewingFullMember?.dob || '—'}
                    </p>
                  </div>

                  <div className="sm:col-span-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Mail className="w-3 h-3" /> Email Address
                    </p>
                    <p className="font-semibold text-slate-900 break-all mt-0.5">
                      {viewingFullMember?.email || viewingContactDetails.email || '—'}
                    </p>
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Phone className="w-3 h-3" /> Mobile Number
                    </p>
                    <p className="font-mono font-bold text-slate-900 mt-0.5">
                      {viewingFullMember?.phone || '—'}
                    </p>
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" /> WhatsApp
                    </p>
                    <p className="font-mono font-semibold text-slate-800 mt-0.5">
                      {viewingFullMember?.whatsapp || viewingFullMember?.phone || '—'}
                    </p>
                  </div>
                </div>

                {viewingFullMember?.interestedSegments && viewingFullMember.interestedSegments.length > 0 && (
                  <div className="pb-4 border-b border-slate-100">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> Interested Science Wings
                    </p>
                    <p className="text-xs font-medium text-slate-800 leading-relaxed">
                      {viewingFullMember.interestedSegments.join(' · ')}
                    </p>
                  </div>
                )}

                {viewingFullMember?.skills && viewingFullMember.skills.length > 0 && (
                  <div className="pb-4 border-b border-slate-100">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
                      <Award className="w-3.5 h-3.5" /> Skills
                    </p>
                    <p className="text-xs font-medium text-slate-800 leading-relaxed">
                      {viewingFullMember.skills.join(' · ')}
                    </p>
                  </div>
                )}

                {viewingFullMember?.experienceAchievements && (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                      Experience &amp; Achievements
                    </p>
                    <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                      {viewingFullMember.experienceAchievements}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==================== MEMBER INBOX UI (STRICTLY ONLY TAMIM IQBAL - PRESIDENT, NO DETAILS CLICK) ====================
  return (
    <div
      className={
        fullScreen
          ? 'h-[100dvh] w-full flex flex-col bg-slate-100 overflow-hidden animate-in fade-in duration-200'
          : 'bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden animate-in fade-in duration-200 flex flex-col'
      }
    >
      {fullScreen && (
        <div className="h-14 shrink-0 bg-white border-b border-slate-200 px-3 sm:px-6 flex items-center justify-between gap-3 z-20">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors cursor-pointer shrink-0 border border-slate-200/80"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-emerald-600" />
                <span>{backLabel}</span>
              </button>
            )}
            <div className="hidden sm:block h-5 w-px bg-slate-200" />
            <div className="flex items-center gap-2 min-w-0">
              <img
                src="/assets/club-logo.png"
                alt="NGDC Science Club"
                className="w-7 h-7 rounded-lg object-contain bg-slate-50 border border-slate-200 p-0.5 shrink-0"
              />
              <span className="text-sm font-black text-slate-900 truncate">Inbox</span>
            </div>
          </div>
          <NotificationToggleControl compact />
        </div>
      )}

      <div
        className={
          fullScreen
            ? 'flex-1 min-h-0 w-full flex justify-center md:p-5 overflow-hidden'
            : 'flex flex-col flex-1 min-h-0'
        }
      >
      <div
        className={
          fullScreen
            ? 'w-full max-w-3xl h-full flex flex-col bg-white md:rounded-2xl md:border md:border-slate-200 md:shadow-sm overflow-hidden'
            : 'flex flex-col flex-1 min-h-0'
        }
      >
        {/* Clean Chat Header: Only Tamim Iqbal Photo, Name & President Badge (non-clickable for members) */}
        <div className="px-4 sm:px-5 py-3.5 bg-slate-900 text-white flex items-center gap-3 shrink-0">
          <div className="relative shrink-0">
            <PresidentAvatar sizeClass="w-11 h-11" />
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-slate-900" />
          </div>
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <h2 className="text-sm sm:text-base font-bold tracking-tight">
              {PRESIDENT_DISPLAY_NAME}
            </h2>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-extrabold uppercase tracking-wide">
              {PRESIDENT_ROLE_LABEL}
            </span>
          </div>
        </div>

        {/* Messages Canvas */}
        <div className={fullScreen ? 'flex-1 min-h-0 overflow-y-auto px-3.5 sm:px-6 py-4 bg-[#eef3f1]' : 'h-[440px] sm:h-[490px] overflow-y-auto px-3.5 sm:px-5 py-4 bg-[#eef3f1]'}>
        {renderedMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-3 py-10">
            <PresidentAvatar sizeClass="w-16 h-16" />
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-2">
                <p className="text-sm font-bold text-slate-900">{PRESIDENT_DISPLAY_NAME}</p>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase">
                  {PRESIDENT_ROLE_LABEL}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Write a message below to start your conversation.
              </p>
            </div>
          </div>
        ) : (
          renderedMessages.map(({ msg, dateLabel, showDateSeparator, isFirstInRun, isLastInRun }) => {
            const isMine = msg.senderRole === 'member';
            const presidentLastRead = myThread?.presidentLastReadAt;
            const isSeenByPresident = isMine && isMessageSeen(msg.createdAt, presidentLastRead);
            return (
              <React.Fragment key={msg.id}>
                {showDateSeparator && (
                  <div className="flex justify-center my-3.5">
                    <span className="px-3 py-1 rounded-full bg-white/90 border border-slate-200/80 text-[10px] font-bold text-slate-500 shadow-2xs">
                      {dateLabel}
                    </span>
                  </div>
                )}

                <div
                  className={`flex items-end gap-2 ${isMine ? 'justify-end' : 'justify-start'} ${
                    isFirstInRun ? 'mt-3' : 'mt-1'
                  }`}
                >
                  {!isMine && (
                    <div className="w-7 h-7 shrink-0">
                      {isLastInRun && <PresidentAvatar sizeClass="w-7 h-7" />}
                    </div>
                  )}

                  <div
                    className={`max-w-[80%] sm:max-w-[72%] px-3.5 py-2 shadow-2xs ${
                      isMine
                        ? `bg-gradient-to-br from-emerald-600 to-emerald-700 text-white rounded-2xl ${
                            isLastInRun ? 'rounded-br-xs' : ''
                          }`
                        : `bg-white text-slate-900 border border-slate-200/80 rounded-2xl ${
                            isLastInRun ? 'rounded-bl-xs' : ''
                          }`
                    }`}
                  >
                    <p className="text-[13px] sm:text-sm whitespace-pre-wrap break-words leading-relaxed">
                      {renderMessageTextWithLinks(msg.text, isMine)}
                    </p>
                    <div
                      className={`mt-1 flex items-center justify-end gap-1.5 text-[10px] leading-none ${
                        isMine ? 'text-emerald-100/90' : 'text-slate-400'
                      }`}
                    >
                      <span>{formatMessageTime(msg.createdAt)}</span>
                      {isMine &&
                        (isSeenByPresident ? (
                          <span
                            title="Seen"
                            className="inline-flex items-center px-1 py-0.5 rounded-full bg-white text-sky-600 shadow-2xs"
                          >
                            <CheckCheck
                              className="w-3.5 h-3.5 stroke-[2.6]"
                              aria-label="Seen"
                            />
                          </span>
                        ) : (
                          <span
                            title="Sent"
                            className="inline-flex items-center text-emerald-100/80"
                          >
                            <Check
                              className="w-3.5 h-3.5 stroke-[2.25]"
                              aria-label="Sent"
                            />
                          </span>
                        ))}
                    </div>
                  </div>
                </div>
              </React.Fragment>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {sendError && (
        <div className="mx-4 mt-2 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{sendError}</span>
        </div>
      )}

      {/* Modern Composer */}
      <form
        onSubmit={handleSend}
        className="p-3 sm:p-3.5 border-t border-slate-200/80 bg-white"
      >
        <div className="flex items-end gap-2 bg-slate-100/90 border border-slate-200/90 focus-within:bg-white focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/15 rounded-2xl px-3 py-2 transition-all">
          <textarea
            ref={composerRef}
            rows={1}
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            onKeyDown={handleComposerKeyDown}
            placeholder={`Message ${PRESIDENT_DISPLAY_NAME}...`}
            className="flex-1 bg-transparent text-slate-900 placeholder:text-slate-400 text-xs sm:text-sm outline-none resize-none max-h-[140px] overflow-y-auto py-1"
          />
          <button
            type="submit"
            disabled={!draftText.trim() || sending}
            className="w-9 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all cursor-pointer disabled:opacity-40 flex items-center justify-center shrink-0"
            aria-label="Send message"
          >
            {sending ? (
              <DotLoader size="sm" color="white" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </form>
      </div>
      </div>
    </div>
  );
}
