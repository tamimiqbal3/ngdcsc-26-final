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
  Check
} from 'lucide-react';
import {
  SubmissionRecord,
  InboxThread,
  InboxMessage,
  PRESIDENT_EMAIL,
  PRESIDENT_DISPLAY_NAME,
  PRESIDENT_ROLE_LABEL,
  PRESIDENT_PHOTO_URL
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

interface InboxPanelProps {
  currentUserEmail: string;
  currentUserUid?: string | null;
  currentMember?: SubmissionRecord | null;
  allMembers?: SubmissionRecord[];
  onUnreadCountChange?: (count: number) => void;
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
  onUnreadCountChange
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

  // Clear unread counter when viewing an active conversation
  useEffect(() => {
    if (!activeThreadId) return;
    if (isPresident) {
      const th = threads.find((t) => t.id === activeThreadId);
      if (th && (th.unreadByPresident || 0) > 0) {
        markInboxThreadRead(activeThreadId, 'president');
      }
    } else if (myThread && myThread.id === activeThreadId && (myThread.unreadByMember || 0) > 0) {
      markInboxThreadRead(activeThreadId, 'member');
    }
  }, [activeThreadId, isPresident, threads, myThread]);

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
    if (!isPresident) return null;
    if (selectedContact) {
      return (
        presidentContacts.find((c) => c.threadId === selectedContact.threadId) ||
        selectedContact
      );
    }
    return presidentContacts[0] || null;
  }, [isPresident, selectedContact, presidentContacts]);

  const filteredContacts = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return presidentContacts.filter((c) => {
      if (listFilter === 'chats' && !c.thread) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
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
    return (
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden animate-in fade-in duration-200">
        {/* Clean President Identity Header + Individual Message All Action */}
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

        {/* Broadcast Delivery Toast Banner */}
        {broadcastBanner && (
          <div className="px-4 py-2.5 bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{broadcastBanner}</span>
          </div>
        )}

        {/* Two-Pane Messenger Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 h-[560px] sm:h-[620px]">
          {/* Left Member List */}
          <div
            className={`md:col-span-5 lg:col-span-4 border-r border-slate-200 flex flex-col bg-white min-h-0 ${
              mobileShowThread ? 'hidden md:flex' : 'flex'
            }`}
          >
            <div className="p-3 border-b border-slate-100 space-y-2.5">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search member..."
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
                  className={`py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    listFilter === 'chats'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Chats ({threads.length})
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
                                unread > 0 ? 'font-bold text-emerald-600' : 'text-slate-400'
                              }`}
                            >
                              {formatShortThreadTime(contact.thread.lastMessageAt)}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between gap-2 mt-0.5">
                          <p
                            className={`text-[11px] truncate ${
                              unread > 0
                                ? 'font-semibold text-slate-900'
                                : 'text-slate-500'
                            }`}
                          >
                            {contact.thread
                              ? `${contact.thread.lastSenderRole === 'president' ? 'You: ' : ''}${contact.thread.lastMessage}`
                              : contact.membershipId ||
                                (contact.batch
                                  ? `${contact.batch}${contact.section ? ` • Sec ${contact.section}` : ''}`
                                  : 'Tap to message')}
                          </p>
                          {unread > 0 && (
                            <span className="px-1.5 py-0.5 min-w-[18px] text-center rounded-full bg-emerald-600 text-white text-[10px] font-black leading-none shrink-0">
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
            className={`md:col-span-7 lg:col-span-8 flex flex-col bg-[#eef3f1] min-h-0 ${
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
                {/* Active Contact Header */}
                <div className="px-4 sm:px-5 py-3 border-b border-slate-200/80 flex items-center gap-3 bg-white">
                  <button
                    type="button"
                    onClick={() => setMobileShowThread(false)}
                    className="md:hidden p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                    aria-label="Back to member list"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>

                  <div className="w-9 h-9 rounded-full border border-slate-200 bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
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
                    <h3 className="text-sm font-bold text-slate-900 truncate leading-tight">
                      {activeContact.name}
                    </h3>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      {[
                        activeContact.membershipId,
                        activeContact.batch,
                        activeContact.section ? `Sec ${activeContact.section}` : ''
                      ]
                        .filter(Boolean)
                        .join(' • ')}
                    </p>
                  </div>
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
                                className={`mt-1 flex items-center justify-end gap-1 text-[10px] leading-none ${
                                  isMine ? 'text-emerald-100/85' : 'text-slate-400'
                                }`}
                              >
                                <span>{formatMessageTime(msg.createdAt)}</span>
                                {isMine && <CheckCheck className="w-3 h-3 opacity-90" />}
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
                        placeholder="Filter members..."
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
      </div>
    );
  }

  // ==================== MEMBER INBOX UI (STRICTLY ONLY TAMIM IQBAL - PRESIDENT) ====================
  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden animate-in fade-in duration-200 flex flex-col">
      {/* Clean Chat Header: Only Tamim Iqbal Photo, Name & President Badge */}
      <div className="px-4 sm:px-5 py-3.5 bg-slate-900 text-white flex items-center gap-3">
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
      <div className="h-[440px] sm:h-[490px] overflow-y-auto px-3.5 sm:px-5 py-4 bg-[#eef3f1]">
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
                      className={`mt-1 flex items-center justify-end gap-1 text-[10px] leading-none ${
                        isMine ? 'text-emerald-100/85' : 'text-slate-400'
                      }`}
                    >
                      <span>{formatMessageTime(msg.createdAt)}</span>
                      {isMine && <CheckCheck className="w-3 h-3 opacity-90" />}
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
  );
}
