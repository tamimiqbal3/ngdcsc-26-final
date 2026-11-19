import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Send,
  Search,
  MessageSquare,
  ShieldCheck,
  User as UserIcon,
  ArrowLeft,
  AlertCircle,
  Lock
} from 'lucide-react';
import {
  SubmissionRecord,
  InboxThread,
  InboxMessage,
  PRESIDENT_EMAIL,
  PRESIDENT_DISPLAY_NAME,
  PRESIDENT_ROLE_LABEL
} from '../types';
import {
  isPresidentEmail,
  getMemberInboxThreadId,
  subscribeToPresidentInboxThreads,
  subscribeToMemberInboxThread,
  subscribeToInboxMessages,
  sendInboxMessage,
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
    // Member should only subscribe to the messages subcollection once their thread doc exists
    return Boolean(myThread && myThread.id === activeThreadId);
  }, [activeThreadId, isPresident, myThread]);

  const [messages, setMessages] = useState<InboxMessage[]>(() =>
    activeThreadId ? getCachedInboxMessages(activeThreadId) : []
  );
  const [draftText, setDraftText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

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
      // Skip if this member record happens to be President himself
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
        studentId: m.studentId || matchedThread?.memberRoll,
        membershipId: m.membershipId || matchedThread?.memberMembershipId,
        batch: m.batch || matchedThread?.memberBatch,
        section: m.section || matchedThread?.memberSection,
        photo: m.photo || matchedThread?.memberPhoto || null,
        thread: matchedThread
      });
    });

    // Include any historical thread not matched in allMembers so chat history is never lost
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

    // Sort: active chats newest first, then remaining members by name/serial
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

  // Keep selectedContact synced with latest thread metadata
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
        (c.studentId || '').toLowerCase().includes(q) ||
        (c.membershipId || '').toLowerCase().includes(q)
      );
    });
  }, [presidentContacts, searchTerm, listFilter]);

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
      setSendError('Could not deliver message. Please check your connection and try again.');
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

  // Group messages with date labels
  const renderedMessages = useMemo(() => {
    let lastDateLabel = '';
    return messages.map((msg) => {
      const dateLabel = formatMessageDateLabel(msg.createdAt);
      const showDateSeparator = Boolean(dateLabel && dateLabel !== lastDateLabel);
      if (dateLabel) lastDateLabel = dateLabel;
      return { msg, dateLabel, showDateSeparator };
    });
  }, [messages]);

  // ==================== PRESIDENT INBOX UI (1-on-1 WITH ANY MEMBER) ====================
  if (isPresident) {
    const activeThreadUnreadChats = threads.filter((t) => (t.unreadByPresident || 0) > 0).length;

    return (
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden animate-in fade-in duration-200">
        {/* Top President Header Banner */}
        <div className="px-5 py-4 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 font-black text-sm shrink-0">
              TI
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-black tracking-tight truncate">
                  {PRESIDENT_DISPLAY_NAME}
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black uppercase">
                  <ShieldCheck className="w-3 h-3" />
                  <span>{PRESIDENT_ROLE_LABEL}</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-300 truncate">
                {PRESIDENT_EMAIL} • Individual Private Inbox with Club Members
              </p>
            </div>
          </div>

          <div className="text-[11px] text-slate-300 font-semibold shrink-0">
            {activeThreadUnreadChats > 0
              ? `${activeThreadUnreadChats} unread conversation${activeThreadUnreadChats === 1 ? '' : 's'}`
              : `${presidentContacts.length} member${presidentContacts.length === 1 ? '' : 's'} reachable`}
          </div>
        </div>

        {/* Two-Pane Split View */}
        <div className="grid grid-cols-1 md:grid-cols-12 min-h-[540px] max-h-[680px]">
          {/* Left Member Directory / Active Threads */}
          <div
            className={`md:col-span-5 lg:col-span-4 border-r border-slate-200 flex flex-col bg-slate-50/50 min-h-0 ${
              mobileShowThread ? 'hidden md:flex' : 'flex'
            }`}
          >
            <div className="p-3 border-b border-slate-200 bg-white space-y-2.5">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search member name, ID, roll..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200/70">
                <button
                  type="button"
                  onClick={() => setListFilter('all')}
                  className={`py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    listFilter === 'all'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All Members ({presidentContacts.length})
                </button>
                <button
                  type="button"
                  onClick={() => setListFilter('chats')}
                  className={`py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    listFilter === 'chats'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Active Chats ({threads.length})
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {filteredContacts.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <MessageSquare className="w-7 h-7 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-600">No members match your search</p>
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
                      className={`w-full p-3.5 text-left flex items-start gap-3 transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-50/90 border-l-4 border-l-emerald-600'
                          : 'hover:bg-white'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full border border-slate-200 bg-white overflow-hidden flex items-center justify-center shrink-0">
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
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {contact.name}
                          </p>
                          {contact.thread?.lastMessageAt && (
                            <span className="text-[10px] text-slate-400 font-medium shrink-0">
                              {formatShortThreadTime(contact.thread.lastMessageAt)}
                            </span>
                          )}
                        </div>

                        <p className="text-[10.5px] font-mono text-slate-500 truncate mt-0.5">
                          {contact.membershipId || (contact.studentId ? `Roll ${contact.studentId}` : contact.email)}
                        </p>

                        <div className="flex items-center justify-between gap-2 mt-1">
                          <p className="text-[11px] text-slate-600 truncate">
                            {contact.thread
                              ? `${contact.thread.lastSenderRole === 'president' ? 'You: ' : ''}${contact.thread.lastMessage}`
                              : 'Click to start individual chat'}
                          </p>
                          {unread > 0 && (
                            <span className="px-1.5 py-0.5 min-w-[18px] text-center rounded-full bg-emerald-600 text-white text-[10px] font-black shrink-0">
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

          {/* Right Individual Chat Window */}
          <div
            className={`md:col-span-7 lg:col-span-8 flex flex-col bg-white min-h-0 ${
              mobileShowThread ? 'flex' : 'hidden md:flex'
            }`}
          >
            {!activeContact ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                  <MessageSquare className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-800">Select a Member to Message</p>
                  <p className="text-xs text-slate-500 max-w-xs">
                    Choose any member from the list to view full chat history or send a private message as {PRESIDENT_DISPLAY_NAME}.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Selected Member Chat Header */}
                <div className="px-4 sm:px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-3 bg-white">
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => setMobileShowThread(false)}
                      className="md:hidden p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                      aria-label="Back to member list"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>

                    <div className="w-10 h-10 rounded-full border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center shrink-0">
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
                      <h3 className="text-sm font-black text-slate-900 truncate">
                        {activeContact.name}
                      </h3>
                      <p className="text-[11px] text-slate-500 truncate">
                        {[
                          activeContact.membershipId,
                          activeContact.studentId ? `Roll ${activeContact.studentId}` : '',
                          activeContact.batch,
                          activeContact.section ? `Sec ${activeContact.section}` : '',
                          activeContact.email
                        ]
                          .filter(Boolean)
                          .join(' • ')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Chat History Scroll Area */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 bg-slate-50/70">
                  {renderedMessages.length === 0 ? (
                    <div className="h-full min-h-[260px] flex flex-col items-center justify-center text-center space-y-2 py-8">
                      <MessageSquare className="w-8 h-8 text-slate-300" />
                      <p className="text-xs font-bold text-slate-700">
                        No messages with {activeContact.name} yet
                      </p>
                      <p className="text-[11px] text-slate-500 max-w-xs">
                        Send an individual message below. Full conversation history will remain saved here.
                      </p>
                    </div>
                  ) : (
                    renderedMessages.map(({ msg, dateLabel, showDateSeparator }) => {
                      const isMine = msg.senderRole === 'president';
                      return (
                        <React.Fragment key={msg.id}>
                          {showDateSeparator && (
                            <div className="flex justify-center my-2">
                              <span className="px-3 py-0.5 rounded-full bg-white border border-slate-200 text-[10px] font-bold text-slate-500 shadow-2xs">
                                {dateLabel}
                              </span>
                            </div>
                          )}

                          <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                            <div
                              className={`max-w-[82%] sm:max-w-[75%] rounded-2xl px-4 py-2.5 shadow-2xs ${
                                isMine
                                  ? 'bg-emerald-700 text-white rounded-br-sm'
                                  : 'bg-white border border-slate-200 text-slate-900 rounded-bl-sm'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-3 mb-1">
                                <span
                                  className={`text-[10px] font-black uppercase tracking-wide ${
                                    isMine ? 'text-emerald-200' : 'text-slate-500'
                                  }`}
                                >
                                  {isMine ? `${PRESIDENT_DISPLAY_NAME} (${PRESIDENT_ROLE_LABEL})` : activeContact.name}
                                </span>
                                <span
                                  className={`text-[10px] ${
                                    isMine ? 'text-emerald-100/80' : 'text-slate-400'
                                  }`}
                                >
                                  {formatMessageTime(msg.createdAt)}
                                </span>
                              </div>
                              <p className="text-xs sm:text-sm whitespace-pre-wrap break-words leading-relaxed">
                                {msg.text}
                              </p>
                            </div>
                          </div>
                        </React.Fragment>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Error Notice */}
                {sendError && (
                  <div className="mx-4 mt-2 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{sendError}</span>
                  </div>
                )}

                {/* Message Composer */}
                <form
                  onSubmit={handleSend}
                  className="p-3 sm:p-4 border-t border-slate-200 bg-white flex items-end gap-2.5"
                >
                  <textarea
                    rows={1}
                    value={draftText}
                    onChange={(e) => setDraftText(e.target.value)}
                    onKeyDown={handleComposerKeyDown}
                    placeholder={`Message ${activeContact.name} as ${PRESIDENT_DISPLAY_NAME}...`}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-900 placeholder:text-slate-400 text-xs sm:text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none resize-none max-h-28"
                  />
                  <button
                    type="submit"
                    disabled={!draftText.trim() || sending}
                    className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                  >
                    {sending ? (
                      <DotLoader size="sm" color="white" />
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Send</span>
                      </>
                    )}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ==================== MEMBER INBOX UI (STRICTLY ONLY TO TAMIM IQBAL) ====================
  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden animate-in fade-in duration-200">
      {/* Recipient Header: Strictly Locked to Tamim Iqbal (President) */}
      <div className="px-5 py-4 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 font-black text-sm shrink-0">
            TI
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-black tracking-tight">
                {PRESIDENT_DISPLAY_NAME}
              </h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black uppercase">
                <ShieldCheck className="w-3 h-3" />
                <span>{PRESIDENT_ROLE_LABEL}</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-300 truncate">
              {PRESIDENT_EMAIL} • Official President Direct Inbox
            </p>
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-[10.5px] font-semibold text-slate-300 self-start sm:self-center shrink-0">
          <Lock className="w-3 h-3 text-emerald-400" />
          <span>Direct Chat with President Only</span>
        </div>
      </div>

      {/* Chat Thread Body */}
      <div className="h-[420px] sm:h-[460px] overflow-y-auto p-4 sm:p-5 space-y-3 bg-slate-50/70">
        {renderedMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-2.5 py-10">
            <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-emerald-600 shadow-2xs">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div className="space-y-1 max-w-sm">
              <p className="text-sm font-bold text-slate-800">
                Message {PRESIDENT_DISPLAY_NAME} ({PRESIDENT_ROLE_LABEL})
              </p>
              <p className="text-xs text-slate-500 leading-relaxed">
                Send a message directly to {PRESIDENT_DISPLAY_NAME}. Your full conversation history is preserved in your dashboard inbox.
              </p>
            </div>
          </div>
        ) : (
          renderedMessages.map(({ msg, dateLabel, showDateSeparator }) => {
            const isMine = msg.senderRole === 'member';
            return (
              <React.Fragment key={msg.id}>
                {showDateSeparator && (
                  <div className="flex justify-center my-2">
                    <span className="px-3 py-0.5 rounded-full bg-white border border-slate-200 text-[10px] font-bold text-slate-500 shadow-2xs">
                      {dateLabel}
                    </span>
                  </div>
                )}

                <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-2.5 shadow-2xs ${
                      isMine
                        ? 'bg-emerald-700 text-white rounded-br-sm'
                        : 'bg-white border border-slate-200 text-slate-900 rounded-bl-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <span
                        className={`text-[10px] font-black uppercase tracking-wide ${
                          isMine ? 'text-emerald-200' : 'text-emerald-700'
                        }`}
                      >
                        {isMine ? 'You' : `${PRESIDENT_DISPLAY_NAME} (${PRESIDENT_ROLE_LABEL})`}
                      </span>
                      <span
                        className={`text-[10px] ${
                          isMine ? 'text-emerald-100/80' : 'text-slate-400'
                        }`}
                      >
                        {formatMessageTime(msg.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm whitespace-pre-wrap break-words leading-relaxed">
                      {msg.text}
                    </p>
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

      {/* Composer */}
      <form
        onSubmit={handleSend}
        className="p-3 sm:p-4 border-t border-slate-200 bg-white flex items-end gap-2.5"
      >
        <textarea
          rows={1}
          value={draftText}
          onChange={(e) => setDraftText(e.target.value)}
          onKeyDown={handleComposerKeyDown}
          placeholder={`Write a message to ${PRESIDENT_DISPLAY_NAME} (${PRESIDENT_ROLE_LABEL})...`}
          className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-900 placeholder:text-slate-400 text-xs sm:text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none resize-none max-h-28"
        />
        <button
          type="submit"
          disabled={!draftText.trim() || sending}
          className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shrink-0"
        >
          {sending ? (
            <DotLoader size="sm" color="white" />
          ) : (
            <>
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
