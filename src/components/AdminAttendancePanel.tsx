import React, { useState, useEffect, useRef, useMemo } from 'react';
import jsQR from 'jsqr';
import {
  Camera,
  CameraOff,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  Search,
  Download,
  Edit3,
  Trash2,
  UserCheck,
  UserX,
  QrCode,
  Keyboard,
  AlertCircle,
  Check,
  X,
  Sparkles,
  Users
} from 'lucide-react';
import {
  SubmissionRecord,
  AttendanceRecord,
  AttendanceSession,
  AttendanceStatus,
  getEffectiveMemberGroup,
  GROUP_BADGE_STYLES
} from '../types';
import {
  getTodayLocalDateStr,
  formatLiveTimeLabel,
  extractMembershipIdFromQr,
  markMemberAttendance,
  updateAttendanceRecord,
  deleteAttendanceRecord,
  deleteAttendanceByDate,
  upsertAttendanceSession
} from '../services/firebase';

interface AdminAttendancePanelProps {
  members: SubmissionRecord[];
  attendanceRecords: AttendanceRecord[];
  attendanceSessions: AttendanceSession[];
  currentUserEmail: string;
  onNotify: (message: string) => void;
}

interface ScanFeedback {
  type: 'marked' | 'already' | 'warning' | 'error';
  title: string;
  subtitle: string;
  scannedCode: string;
  timeLabel: string;
  member?: SubmissionRecord;
}

function playVerificationChime(success: boolean) {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = success ? 'sine' : 'triangle';
    osc.frequency.setValueAtTime(success ? 880 : 320, ctx.currentTime);
    if (success) {
      osc.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.08);
    }
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.22);
    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 300);
  } catch {
    // ignore audio failure
  }
}

export default function AdminAttendancePanel({
  members,
  attendanceRecords,
  attendanceSessions,
  currentUserEmail,
  onNotify
}: AdminAttendancePanelProps) {
  // Live ticking clock
  const [liveNow, setLiveNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setLiveNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const todayStr = getTodayLocalDateStr(liveNow);
  const liveTimeStr = formatLiveTimeLabel(liveNow);

  // Selected session date for viewing / editing / marking
  const [selectedDate, setSelectedDate] = useState<string>(() => getTodayLocalDateStr());
  const [eventTitle, setEventTitle] = useState<string>('Club Session / Event');
  const [savingTitle, setSavingTitle] = useState(false);

  // Sync event title whenever selectedDate changes or sessions update
  useEffect(() => {
    const existing = attendanceSessions.find((s) => s.date === selectedDate);
    if (existing?.eventTitle) {
      setEventTitle(existing.eventTitle);
    } else {
      setEventTitle('Club Session / Event');
    }
  }, [selectedDate, attendanceSessions]);

  // Scanner state
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [manualInput, setManualInput] = useState('');
  const [scanFeedback, setScanFeedback] = useState<ScanFeedback | null>(null);
  const [processingScan, setProcessingScan] = useState(false);

  // Filters, Date Delete Modal & Edit Modal state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'present' | 'absent'>('all');
  const [confirmDeleteDate, setConfirmDeleteDate] = useState<string | null>(null);
  const [deletingDate, setDeletingDate] = useState(false);
  const [editingEntry, setEditingEntry] = useState<{
    member: SubmissionRecord;
    record: AttendanceRecord | null;
    date: string;
    status: AttendanceStatus;
    timeLabel: string;
    eventTitle: string;
    note: string;
  } | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanLoopTimerRef = useRef<number | null>(null);
  const lastScannedRef = useRef<{ code: string; timestamp: number }>({ code: '', timestamp: 0 });
  const processScanRef = useRef<(raw: string) => void>(() => {});

  // Stop camera helper
  const stopCamera = () => {
    if (scanLoopTimerRef.current !== null) {
      window.clearTimeout(scanLoopTimerRef.current);
      scanLoopTimerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setCameraLoading(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Build map of attendance records for selectedDate
  const recordsByMemberForDate = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    attendanceRecords
      .filter((r) => r.date === selectedDate)
      .forEach((r) => {
        map.set(r.memberId, r);
        if (r.membershipId) {
          map.set(r.membershipId.toUpperCase(), r);
        }
      });
    return map;
  }, [attendanceRecords, selectedDate]);

  // Approved members list (+ any member with a record on selectedDate)
  const rosterRows = useMemo(() => {
    const rows: Array<{
      member: SubmissionRecord;
      record: AttendanceRecord | null;
      effectiveStatus: AttendanceStatus;
    }> = [];
    const seenIds = new Set<string>();

    members.forEach((m) => {
      const mKey = m.id || m.membershipId || m.studentId || m.phone;
      const rec =
        recordsByMemberForDate.get(mKey) ||
        (m.membershipId ? recordsByMemberForDate.get(m.membershipId.toUpperCase()) : undefined) ||
        null;

      if (m.status !== 'approved' && !rec) return;
      seenIds.add(mKey);
      const effectiveStatus: AttendanceStatus = rec?.status === 'present' ? 'present' : 'absent';
      rows.push({ member: m, record: rec, effectiveStatus });
    });

    // Also include any orphaned attendance records for selectedDate
    attendanceRecords
      .filter((r) => r.date === selectedDate && !seenIds.has(r.memberId))
      .forEach((rec) => {
        const placeholderMember: SubmissionRecord = {
          id: rec.memberId,
          membershipId: rec.membershipId,
          name: rec.memberName,
          studentId: rec.memberRoll || '',
          batch: (rec.memberBatch as any) || 'HSC 27',
          section: (rec.memberSection as any) || 'A',
          phone: '',
          whatsapp: '',
          sameAsPhone: true,
          email: rec.memberEmail || '',
          dob: '',
          photo: null,
          interestedSegments: [],
          agreedToRules: true,
          submittedAt: rec.scannedAt,
          status: 'approved',
          uid: rec.memberUid || undefined
        };
        rows.push({
          member: placeholderMember,
          record: rec,
          effectiveStatus: rec.status === 'present' ? 'present' : 'absent'
        });
      });

    // Sort: Present first (most recent scan first), then Absent alphabetically by ID/Name
    rows.sort((a, b) => {
      if (a.effectiveStatus !== b.effectiveStatus) {
        return a.effectiveStatus === 'present' ? -1 : 1;
      }
      if (a.effectiveStatus === 'present' && a.record && b.record) {
        return (b.record.scannedAt || '').localeCompare(a.record.scannedAt || '');
      }
      return (a.member.membershipId || a.member.name).localeCompare(
        b.member.membershipId || b.member.name
      );
    });

    return rows;
  }, [members, recordsByMemberForDate, attendanceRecords, selectedDate]);

  const savedRecordsForDateCount = useMemo(
    () => attendanceRecords.filter((r) => r.date === selectedDate).length,
    [attendanceRecords, selectedDate]
  );

  const hasSavedSessionForDate = useMemo(
    () =>
      attendanceSessions.some((s) => s.date === selectedDate) ||
      savedRecordsForDateCount > 0,
    [attendanceSessions, selectedDate, savedRecordsForDateCount]
  );

  const presentCount = useMemo(
    () => (hasSavedSessionForDate ? rosterRows.filter((r) => r.effectiveStatus === 'present').length : 0),
    [rosterRows, hasSavedSessionForDate]
  );
  const absentCount = useMemo(
    () => (hasSavedSessionForDate ? rosterRows.filter((r) => r.effectiveStatus === 'absent').length : 0),
    [rosterRows, hasSavedSessionForDate]
  );
  const attendancePercent =
    hasSavedSessionForDate && rosterRows.length > 0
      ? Math.round((presentCount / rosterRows.length) * 100)
      : 0;

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return rosterRows.filter(({ member, effectiveStatus }) => {
      if (!hasSavedSessionForDate && (statusFilter === 'present' || statusFilter === 'absent')) {
        return false;
      }
      if (statusFilter === 'present' && effectiveStatus !== 'present') return false;
      if (statusFilter === 'absent' && effectiveStatus !== 'absent') return false;
      if (!q) return true;
      const grp = (getEffectiveMemberGroup(member) || '').toLowerCase();
      return (
        (member.name || '').toLowerCase().includes(q) ||
        (member.membershipId || '').toLowerCase().includes(q) ||
        (member.studentId || '').toLowerCase().includes(q) ||
        (member.phone || '').toLowerCase().includes(q) ||
        grp.includes(q)
      );
    });
  }, [rosterRows, searchQuery, statusFilter, hasSavedSessionForDate]);

  const findMemberByCode = (rawInput: string): { normalizedId: string; member?: SubmissionRecord } => {
    const trimmed = rawInput.trim();
    const normalizedId = extractMembershipIdFromQr(trimmed);
    const digitsOnly = trimmed.replace(/\D/g, '');

    const match = members.find((m) => {
      const mid = (m.membershipId || '').trim().toUpperCase();
      if (mid && (mid === normalizedId || mid === trimmed.toUpperCase())) return true;
      if (m.id && m.id === trimmed) return true;
      if (m.studentId && m.studentId.trim() === trimmed) return true;
      if (digitsOnly.length >= 10 && (m.phone || '').replace(/\D/g, '').endsWith(digitsOnly.slice(-10))) {
        return true;
      }
      return false;
    });

    return { normalizedId, member: match };
  };

  // Core scan processor (auto-syncs live date & time when scanned!)
  const processScannedQr = async (rawValue: string, isManualEntry = false) => {
    const cleanRaw = rawValue.trim();
    if (!cleanRaw || processingScan) return;

    const nowMs = Date.now();
    if (
      !isManualEntry &&
      lastScannedRef.current.code === cleanRaw &&
      nowMs - lastScannedRef.current.timestamp < 2600
    ) {
      return;
    }
    lastScannedRef.current = { code: cleanRaw, timestamp: nowMs };

    const scanMoment = new Date();
    const liveDateForScan = isManualEntry ? selectedDate : getTodayLocalDateStr(scanMoment);
    const liveTimeForScan = formatLiveTimeLabel(scanMoment);

    if (!isManualEntry && selectedDate !== liveDateForScan) {
      setSelectedDate(liveDateForScan);
    }

    const { normalizedId, member } = findMemberByCode(cleanRaw);

    if (!member) {
      playVerificationChime(false);
      setScanFeedback({
        type: 'error',
        title: 'Member Not Found',
        subtitle: `No registered member matches "${normalizedId || cleanRaw}".`,
        scannedCode: normalizedId || cleanRaw,
        timeLabel: liveTimeForScan
      });
      return;
    }

    if (member.status !== 'approved') {
      playVerificationChime(false);
      setScanFeedback({
        type: 'warning',
        title: `Membership Not Approved (${member.status || 'pending'})`,
        subtitle: `${member.name} has status "${member.status || 'pending'}". Approve membership before marking event attendance.`,
        scannedCode: member.membershipId || normalizedId,
        timeLabel: liveTimeForScan,
        member
      });
      return;
    }

    const memberKey = member.id || member.membershipId || member.studentId || member.phone;
    const alreadyForDate = attendanceRecords.find(
      (r) =>
        r.date === liveDateForScan &&
        (r.memberId === memberKey ||
          (member.membershipId && r.membershipId?.toUpperCase() === member.membershipId.toUpperCase())) &&
        r.status === 'present'
    );

    if (alreadyForDate) {
      playVerificationChime(true);
      setScanFeedback({
        type: 'already',
        title: 'Already Marked Present',
        subtitle: `${member.name} was already checked in on ${liveDateForScan} at ${alreadyForDate.scannedTimeLabel}.`,
        scannedCode: member.membershipId || normalizedId,
        timeLabel: alreadyForDate.scannedTimeLabel,
        member
      });
      return;
    }

    try {
      setProcessingScan(true);
      const saved = await markMemberAttendance({
        member,
        date: liveDateForScan,
        eventTitle,
        status: 'present',
        method: isManualEntry ? 'manual' : 'qr_scan',
        markedBy: currentUserEmail,
        scannedDateObj: scanMoment
      });

      playVerificationChime(true);
      setScanFeedback({
        type: 'marked',
        title: 'Verified & Marked Present',
        subtitle: `${member.name} (${saved.membershipId}) checked in at ${saved.scannedTimeLabel}.`,
        scannedCode: saved.membershipId,
        timeLabel: saved.scannedTimeLabel,
        member
      });
      onNotify(`Marked ${member.name} (${saved.membershipId}) Present at ${saved.scannedTimeLabel}`);
      if (isManualEntry) {
        setManualInput('');
      }
    } catch (err) {
      console.error('Failed to record attendance:', err);
      playVerificationChime(false);
      setScanFeedback({
        type: 'error',
        title: 'Save Failed',
        subtitle: 'Could not record attendance right now. Check connection and try again.',
        scannedCode: member.membershipId || normalizedId,
        timeLabel: liveTimeForScan,
        member
      });
    } finally {
      setProcessingScan(false);
    }
  };

  processScanRef.current = (raw: string) => {
    void processScannedQr(raw, false);
  };

  const startCamera = async (mode: 'environment' | 'user' = facingMode) => {
    stopCamera();
    setCameraError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Browser camera API is unavailable here. Use HTTPS or Manual ID entry below.');
      return;
    }

    setCameraLoading(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      streamRef.current = stream;
      setCameraActive(true);
      setCameraLoading(false);

      // Attach stream once video element mounts
      setTimeout(async () => {
        const videoEl = videoRef.current;
        if (!videoEl) return;
        videoEl.srcObject = stream;
        try {
          await videoEl.play();
        } catch {
          // ignore autoplay catch
        }

        const scanFrame = () => {
          if (!streamRef.current || !videoRef.current) return;
          const v = videoRef.current;
          const c = canvasRef.current;
          if (v.readyState >= 2 && c && v.videoWidth > 0 && v.videoHeight > 0) {
            const targetW = Math.min(640, v.videoWidth);
            const scale = targetW / v.videoWidth;
            const targetH = Math.round(v.videoHeight * scale);
            if (c.width !== targetW || c.height !== targetH) {
              c.width = targetW;
              c.height = targetH;
            }
            const ctx = c.getContext('2d', { willReadFrequently: true });
            if (ctx) {
              ctx.drawImage(v, 0, 0, targetW, targetH);
              const imgData = ctx.getImageData(0, 0, targetW, targetH);
              const code = jsQR(imgData.data, targetW, targetH, {
                inversionAttempts: 'dontInvert'
              });
              if (code && code.data) {
                processScanRef.current(code.data);
              }
            }
          }
          scanLoopTimerRef.current = window.setTimeout(scanFrame, 120);
        };

        scanLoopTimerRef.current = window.setTimeout(scanFrame, 150);
      }, 60);
    } catch (err: any) {
      setCameraLoading(false);
      setCameraActive(false);
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        setCameraError('Camera permission denied. Allow camera access in your browser settings or use Manual ID check-in.');
      } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
        setCameraError('No camera device found on this device. Use Manual ID check-in instead.');
      } else {
        setCameraError('Could not start camera. Ensure no other app is using it or use Manual ID check-in.');
      }
    }
  };

  const handleSwitchCamera = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    if (cameraActive) {
      void startCamera(nextMode);
    }
  };

  const handleSaveSessionTitle = async () => {
    try {
      setSavingTitle(true);
      await upsertAttendanceSession(selectedDate, eventTitle, currentUserEmail);
      onNotify(`Saved session title for ${selectedDate}`);
    } catch (err) {
      console.error('Failed to save session title:', err);
    } finally {
      setSavingTitle(false);
    }
  };

  const handleQuickToggleStatus = async (
    member: SubmissionRecord,
    existingRec: AttendanceRecord | null,
    targetStatus: AttendanceStatus
  ) => {
    const now = new Date();
    try {
      if (existingRec) {
        await updateAttendanceRecord(
          existingRec,
          {
            status: targetStatus,
            scannedAt: now.toISOString(),
            scannedTimeLabel: formatLiveTimeLabel(now),
            eventTitle
          },
          currentUserEmail
        );
      } else {
        await markMemberAttendance({
          member,
          date: selectedDate,
          eventTitle,
          status: targetStatus,
          method: 'manual',
          markedBy: currentUserEmail,
          scannedDateObj: now
        });
      }
      onNotify(
        `${member.name} marked ${targetStatus === 'present' ? 'Present' : 'Absent'} for ${selectedDate}`
      );
    } catch (err) {
      console.error('Error toggling attendance:', err);
      alert('Failed to update attendance status.');
    }
  };

  const handleSaveEditModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry || savingEdit) return;
    setSavingEdit(true);
    try {
      if (editingEntry.record) {
        await updateAttendanceRecord(
          editingEntry.record,
          {
            date: editingEntry.date,
            status: editingEntry.status,
            scannedTimeLabel: editingEntry.timeLabel,
            eventTitle: editingEntry.eventTitle,
            note: editingEntry.note
          },
          currentUserEmail
        );
      } else {
        const created = await markMemberAttendance({
          member: editingEntry.member,
          date: editingEntry.date,
          eventTitle: editingEntry.eventTitle,
          status: editingEntry.status,
          method: 'manual',
          note: editingEntry.note,
          markedBy: currentUserEmail
        });
        if (editingEntry.timeLabel.trim() && editingEntry.timeLabel !== created.scannedTimeLabel) {
          await updateAttendanceRecord(
            created,
            { scannedTimeLabel: editingEntry.timeLabel },
            currentUserEmail
          );
        }
      }
      onNotify(`Attendance updated for ${editingEntry.member.name}`);
      setEditingEntry(null);
    } catch (err) {
      console.error('Error saving attendance edit:', err);
      alert('Failed to save attendance changes.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteEntry = async () => {
    if (!editingEntry?.record) return;
    if (!window.confirm(`Remove this attendance record for ${editingEntry.member.name}? They will appear as Absent (Not Scanned) for ${editingEntry.date}.`)) {
      return;
    }
    setSavingEdit(true);
    try {
      await deleteAttendanceRecord(editingEntry.record.id);
      onNotify(`Cleared attendance record for ${editingEntry.member.name}`);
      setEditingEntry(null);
    } catch (err) {
      console.error('Error deleting attendance record:', err);
      alert('Failed to delete attendance record.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteEntireDate = async () => {
    if (!confirmDeleteDate || deletingDate) return;
    setDeletingDate(true);
    try {
      const targetDate = confirmDeleteDate;
      const { deletedCount } = await deleteAttendanceByDate(targetDate);
      if (scanFeedback && selectedDate === targetDate) {
        setScanFeedback(null);
      }
      setConfirmDeleteDate(null);
      onNotify(
        `Deleted all attendance for ${targetDate} (${deletedCount} record${deletedCount === 1 ? '' : 's'} cleared — counts reset to 0/0)`
      );
    } catch (err) {
      console.error('Error deleting date attendance:', err);
      onNotify('Failed to delete attendance for this date. Check connection.');
    } finally {
      setDeletingDate(false);
    }
  };

  const handleExportCsv = () => {
    const headers = [
      'Membership ID',
      'Member Name',
      'Roll',
      'Group',
      'Batch',
      'Section',
      'Date',
      'Status',
      'Check-In Time',
      'Method',
      'Event Title',
      'Note'
    ];
    const escapeCsv = (val: string) => `"${(val || '').replace(/"/g, '""')}"`;
    const lines = [
      headers.join(','),
      ...filteredRows.map(({ member, record, effectiveStatus }) =>
        [
          escapeCsv(member.membershipId || ''),
          escapeCsv(member.name || ''),
          escapeCsv(member.studentId || ''),
          escapeCsv(getEffectiveMemberGroup(member) || ''),
          escapeCsv(member.batch || ''),
          escapeCsv(member.section || ''),
          escapeCsv(selectedDate),
          escapeCsv(
            !hasSavedSessionForDate
              ? 'Not Recorded'
              : effectiveStatus === 'present'
              ? 'Present'
              : 'Absent'
          ),
          escapeCsv(effectiveStatus === 'present' && record ? record.scannedTimeLabel : '—'),
          escapeCsv(record ? (record.method === 'qr_scan' ? 'QR Scan' : 'Manual') : 'Not Scanned'),
          escapeCsv(record?.eventTitle || eventTitle),
          escapeCsv(record?.note || '')
        ].join(',')
      )
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NGDCSC_Attendance_${selectedDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    onNotify(`Exported attendance CSV for ${selectedDate}`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. LIVE CLOCK & SESSION CONTROLS BAR */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Live Time Sync: {todayStr} • {liveTimeStr}</span>
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight pt-1">
              Event QR Scanner &amp; Attendance Register
            </h2>
            <p className="text-xs text-slate-500">
              Scan a member&apos;s Confirmation Slip QR code to record attendance with auto-synced live date &amp; time. Unscanned members automatically remain Absent.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value || todayStr)}
                className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
                aria-label="Select Attendance Date"
              />
            </div>

            {selectedDate !== todayStr && (
              <button
                type="button"
                onClick={() => setSelectedDate(todayStr)}
                className="px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold cursor-pointer transition-colors"
              >
                Sync Today
              </button>
            )}

            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold cursor-pointer transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              disabled={!hasSavedSessionForDate}
              onClick={() => setConfirmDeleteDate(selectedDate)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 border border-rose-600 text-white text-xs font-bold cursor-pointer disabled:cursor-not-allowed transition-colors"
              title={
                hasSavedSessionForDate
                  ? `Delete entire attendance for ${selectedDate} (reset everyone to 0/0)`
                  : 'No saved attendance session on this date'
              }
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Date Attendance</span>
            </button>
          </div>
        </div>

        {/* Event Title & Recent Session Chips */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div className="flex-1 flex items-center gap-2 max-w-xl">
            <input
              type="text"
              value={eventTitle}
              onChange={(e) => setEventTitle(e.target.value)}
              placeholder="Event / Meeting Name (e.g. Science Olympiad Workshop)"
              className="flex-1 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white text-xs font-semibold text-slate-900 outline-none"
            />
            <button
              type="button"
              onClick={handleSaveSessionTitle}
              disabled={savingTitle}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold border border-slate-200 cursor-pointer shrink-0 disabled:opacity-50"
            >
              {savingTitle ? 'Saving...' : 'Save Title'}
            </button>
          </div>

          {attendanceSessions.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <span className="text-[11px] font-bold text-slate-400 uppercase shrink-0 mr-1">
                Sessions:
              </span>
              {attendanceSessions.slice(0, 6).map((s) => (
                <button
                  key={s.date}
                  type="button"
                  onClick={() => setSelectedDate(s.date)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold border shrink-0 cursor-pointer transition-colors ${
                    selectedDate === s.date
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                  title={s.eventTitle}
                >
                  {s.date}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 2. CAMERA QR SCANNER + INSTANT VERIFICATION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Live Camera Feed */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                <QrCode className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">Camera QR Scanner</h3>
                <p className="text-[11px] text-slate-500">
                  Auto-syncs to today&apos;s live date &amp; time on scan
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSwitchCamera}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer transition-colors"
                title="Switch Front / Rear Camera"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{facingMode === 'environment' ? 'Rear Cam' : 'Front Cam'}</span>
              </button>

              {cameraActive ? (
                <button
                  type="button"
                  onClick={stopCamera}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer transition-colors shadow-xs"
                >
                  <CameraOff className="w-3.5 h-3.5" />
                  <span>Stop Camera</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => startCamera(facingMode)}
                  disabled={cameraLoading}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer transition-colors shadow-xs disabled:opacity-60"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>{cameraLoading ? 'Starting...' : 'Start QR Camera'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Camera Preview Box */}
          <div className="relative w-full aspect-video sm:aspect-16/10 rounded-2xl overflow-hidden bg-slate-950 border border-slate-200 flex items-center justify-center">
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
            />
            <canvas ref={canvasRef} className="hidden" />

            {cameraActive ? (
              <>
                {/* Crisp Corner Framing Overlay */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-48 h-48 sm:w-56 sm:h-56 relative">
                    <span className="absolute top-0 left-0 w-7 h-7 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl" />
                    <span className="absolute top-0 right-0 w-7 h-7 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl" />
                    <span className="absolute bottom-0 left-0 w-7 h-7 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl" />
                    <span className="absolute bottom-0 right-0 w-7 h-7 border-b-4 border-r-4 border-emerald-400 rounded-br-xl" />
                    <div className="absolute inset-x-3 top-1/2 h-0.5 bg-emerald-400/75 shadow-[0_0_10px_#34d399] animate-pulse" />
                  </div>
                </div>
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                  <span className="px-2.5 py-1 rounded-full bg-black/65 text-white text-[11px] font-semibold">
                    Point camera at Confirmation Slip QR
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-600/90 text-white text-[11px] font-mono font-bold">
                    {liveTimeStr}
                  </span>
                </div>
              </>
            ) : (
              <div className="text-center p-6 space-y-3 max-w-sm">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400">
                  <Camera className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-white">
                    Camera Ready for Event Check-In
                  </p>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Click <strong className="text-emerald-400">Start QR Camera</strong> to scan Confirmation Slip QR codes automatically.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => startCamera(facingMode)}
                  disabled={cameraLoading}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer transition-colors"
                >
                  <Camera className="w-4 h-4" />
                  <span>{cameraLoading ? 'Requesting Camera...' : 'Open Camera Scanner'}</span>
                </button>
              </div>
            )}
          </div>

          {cameraError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{cameraError}</span>
            </div>
          )}

          {/* Quick Manual / USB Scanner Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void processScannedQr(manualInput, true);
            }}
            className="flex flex-col sm:flex-row gap-2 pt-1"
          >
            <div className="relative flex-1">
              <Keyboard className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="Manual / USB Scanner: Enter Membership ID (e.g. NGDCSC-008) or Roll"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white text-xs font-semibold text-slate-900 outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={!manualInput.trim() || processingScan}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold cursor-pointer transition-colors disabled:opacity-50 shrink-0"
            >
              {processingScan ? 'Checking In...' : 'Mark Present'}
            </button>
          </form>
        </div>

        {/* Right: Verification Result & Session Summary */}
        <div className="lg:col-span-5 space-y-4">
          {/* Last Scan Status Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>Live Scan Verification</span>
              </h3>
              <span className="text-[11px] font-mono text-slate-500">{selectedDate}</span>
            </div>

            {scanFeedback ? (
              <div
                className={`p-4 rounded-xl border space-y-3 ${
                  scanFeedback.type === 'marked'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                    : scanFeedback.type === 'already'
                    ? 'bg-sky-50 border-sky-200 text-sky-950'
                    : scanFeedback.type === 'warning'
                    ? 'bg-amber-50 border-amber-200 text-amber-950'
                    : 'bg-rose-50 border-rose-200 text-rose-950'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {scanFeedback.type === 'marked' || scanFeedback.type === 'already' ? (
                      <CheckCircle2
                        className={`w-5 h-5 shrink-0 ${
                          scanFeedback.type === 'marked' ? 'text-emerald-600' : 'text-sky-600'
                        }`}
                      />
                    ) : (
                      <XCircle
                        className={`w-5 h-5 shrink-0 ${
                          scanFeedback.type === 'warning' ? 'text-amber-600' : 'text-rose-600'
                        }`}
                      />
                    )}
                    <h4 className="text-sm font-black">{scanFeedback.title}</h4>
                  </div>
                  <span className="text-[11px] font-mono font-bold opacity-75 shrink-0">
                    {scanFeedback.timeLabel}
                  </span>
                </div>

                {scanFeedback.member && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-200/80">
                    {scanFeedback.member.photo ? (
                      <img
                        src={scanFeedback.member.photo}
                        alt={scanFeedback.member.name}
                        className="w-12 h-14 rounded-lg object-cover border border-slate-200 shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-14 rounded-lg bg-slate-100 flex items-center justify-center font-black text-slate-500 shrink-0">
                        {scanFeedback.member.name.charAt(0)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-black text-slate-900 truncate">
                        {scanFeedback.member.name}
                      </p>
                      <p className="text-xs font-mono font-bold text-emerald-700">
                        {scanFeedback.member.membershipId || scanFeedback.scannedCode}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Roll {scanFeedback.member.studentId} • {scanFeedback.member.batch} (Sec{' '}
                        {scanFeedback.member.section})
                      </p>
                    </div>
                  </div>
                )}

                <p className="text-xs font-medium leading-relaxed">{scanFeedback.subtitle}</p>
              </div>
            ) : (
              <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-1.5">
                <p className="text-xs font-bold text-slate-700">Waiting for QR scan...</p>
                <p className="text-[11px] text-slate-500">
                  Member profile verification and check-in time will appear here immediately when scanned.
                </p>
              </div>
            )}
          </div>

          {/* Summary Stats for Selected Date */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs">
              <div className="flex items-center gap-1.5 text-emerald-700 mb-1">
                <UserCheck className="w-4 h-4" />
                <span className="text-[11px] font-bold uppercase">Present</span>
              </div>
              <p className="text-2xl font-black text-slate-900">{presentCount}</p>
              <p className="text-[11px] text-slate-500">
                {hasSavedSessionForDate ? `${attendancePercent}% attended` : 'No session yet'}
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs">
              <div className="flex items-center gap-1.5 text-rose-600 mb-1">
                <UserX className="w-4 h-4" />
                <span className="text-[11px] font-bold uppercase">Absent</span>
              </div>
              <p className="text-2xl font-black text-slate-900">{absentCount}</p>
              <p className="text-[11px] text-slate-500">
                {hasSavedSessionForDate ? 'Not scanned' : '0/0 cleared'}
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs">
              <div className="flex items-center gap-1.5 text-slate-600 mb-1">
                <Users className="w-4 h-4" />
                <span className="text-[11px] font-bold uppercase">Total</span>
              </div>
              <p className="text-2xl font-black text-slate-900">{rosterRows.length}</p>
              <p className="text-[11px] text-slate-500">Approved</p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. ATTENDANCE REGISTER TABLE (PRESENT & ABSENT FOR SELECTED DATE + EDITABLE) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-slate-900">
              Attendance Sheet — <span className="font-mono text-emerald-700">{selectedDate}</span>
            </h3>
            <p className="text-xs text-slate-500">
              Showing {filteredRows.length} of {rosterRows.length} members • Click Present/Absent or Edit on any row to adjust
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ID, name, roll..."
                className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white text-xs text-slate-900 outline-none w-48"
              />
            </div>

            <div className="inline-flex items-center p-0.5 rounded-xl bg-slate-100 border border-slate-200">
              {(['all', 'present', 'absent'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setStatusFilter(tab)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold capitalize cursor-pointer transition-colors ${
                    statusFilter === tab
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab === 'all'
                    ? `All (${rosterRows.length})`
                    : tab === 'present'
                    ? `Present (${presentCount})`
                    : `Absent (${absentCount})`}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Member</th>
                <th className="py-3 px-4">Membership ID</th>
                <th className="py-3 px-4">Batch / Roll</th>
                <th className="py-3 px-4">Status ({selectedDate})</th>
                <th className="py-3 px-4">Check-In Time</th>
                <th className="py-3 px-4 text-right">Admin Edit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-500">
                    No members match the current filter.
                  </td>
                </tr>
              ) : (
                filteredRows.map(({ member, record, effectiveStatus }) => {
                  const isPresent = effectiveStatus === 'present';
                  return (
                    <tr
                      key={member.id || member.membershipId || member.studentId}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {member.photo ? (
                            <img
                              src={member.photo}
                              alt={member.name}
                              className="w-9 h-9 rounded-lg object-cover border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-500 shrink-0">
                              {member.name?.charAt(0) || '?'}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 truncate max-w-[190px]">
                              {member.name}
                            </p>
                            {record?.note && (
                              <p className="text-[11px] text-slate-500 truncate max-w-[190px]">
                                Note: {record.note}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 font-mono font-bold text-emerald-800">
                          {member.membershipId || 'N/A'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-600">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-slate-800">{member.batch}</span>
                          <span>• Sec {member.section}</span>
                          {getEffectiveMemberGroup(member) && (
                            <span
                              className={`px-1.5 py-0.5 rounded border text-[10px] font-bold ${
                                GROUP_BADGE_STYLES[getEffectiveMemberGroup(member)!]
                              }`}
                            >
                              {getEffectiveMemberGroup(member)}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500">
                          Roll: {member.studentId || '—'}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        {isPresent ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Present</span>
                            {record?.method === 'qr_scan' && (
                              <span className="text-[10px] opacity-75">(QR)</span>
                            )}
                          </span>
                        ) : !hasSavedSessionForDate ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-600 font-bold text-[11px]">
                            <span>Not Recorded (0/0)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 font-bold text-[11px]">
                            <XCircle className="w-3.5 h-3.5 text-rose-500" />
                            <span>Absent</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-700">
                        {isPresent && record ? (
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{record.scannedTimeLabel}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400">Not Scanned</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              handleQuickToggleStatus(
                                member,
                                record,
                                isPresent ? 'absent' : 'present'
                              )
                            }
                            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border cursor-pointer transition-colors ${
                              isPresent
                                ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                            }`}
                          >
                            {isPresent ? 'Mark Absent' : 'Mark Present'}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setEditingEntry({
                                member,
                                record,
                                date: record?.date || selectedDate,
                                status: effectiveStatus,
                                timeLabel: record?.scannedTimeLabel || liveTimeStr,
                                eventTitle: record?.eventTitle || eventTitle,
                                note: record?.note || ''
                              })
                            }
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 cursor-pointer transition-colors"
                            title="Edit Attendance Details"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. EDIT ATTENDANCE MODAL */}
      {editingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-xs">
          <form
            onSubmit={handleSaveEditModal}
            className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden text-slate-900"
          >
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-base font-black text-slate-900">Edit Attendance Record</h3>
                <p className="text-xs text-slate-500">
                  {editingEntry.member.name} ({editingEntry.member.membershipId || 'Member'})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingEntry(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">Status</label>
                  <select
                    value={editingEntry.status}
                    onChange={(e) =>
                      setEditingEntry((prev) =>
                        prev ? { ...prev, status: e.target.value as AttendanceStatus } : null
                      )
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-900 outline-none"
                  >
                    <option value="present">Present</option>
                    <option value="absent">Absent</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">Date</label>
                  <input
                    type="date"
                    value={editingEntry.date}
                    onChange={(e) =>
                      setEditingEntry((prev) => (prev ? { ...prev, date: e.target.value } : null))
                    }
                    required
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono font-bold text-slate-900 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700">Check-In Time</label>
                  <button
                    type="button"
                    onClick={() =>
                      setEditingEntry((prev) =>
                        prev ? { ...prev, timeLabel: formatLiveTimeLabel(new Date()) } : null
                      )
                    }
                    className="text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer"
                  >
                    Sync Live Time Now
                  </button>
                </div>
                <input
                  type="text"
                  value={editingEntry.timeLabel}
                  onChange={(e) =>
                    setEditingEntry((prev) => (prev ? { ...prev, timeLabel: e.target.value } : null))
                  }
                  placeholder="e.g. 03:45:12 PM"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono font-semibold text-slate-900 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Event / Session Name</label>
                <input
                  type="text"
                  value={editingEntry.eventTitle}
                  onChange={(e) =>
                    setEditingEntry((prev) =>
                      prev ? { ...prev, eventTitle: e.target.value } : null
                    )
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-900 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Remarks / Note (Optional)</label>
                <input
                  type="text"
                  value={editingEntry.note}
                  onChange={(e) =>
                    setEditingEntry((prev) => (prev ? { ...prev, note: e.target.value } : null))
                  }
                  placeholder="e.g. Arrived late / Verified manually"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 outline-none"
                />
              </div>
            </div>

            <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-2">
              {editingEntry.record ? (
                <button
                  type="button"
                  onClick={handleDeleteEntry}
                  disabled={savingEdit}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingEntry(null)}
                  className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{savingEdit ? 'Saving...' : 'Save Attendance'}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* 5. CONFIRM DELETE ENTIRE DATE ATTENDANCE MODAL */}
      {confirmDeleteDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden text-slate-900">
            <div className="p-4 sm:p-5 border-b border-rose-100 bg-rose-50/70 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Delete Entire Date Attendance</h3>
                  <p className="text-xs font-mono font-bold text-rose-700">{confirmDeleteDate}</p>
                </div>
              </div>
              <button
                type="button"
                disabled={deletingDate}
                onClick={() => setConfirmDeleteDate(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-rose-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs leading-relaxed text-slate-700">
              <p>
                Are you sure you want to permanently delete <strong>all attendance records</strong> and the session entry for{' '}
                <span className="font-mono font-bold text-slate-900">{confirmDeleteDate}</span> ({eventTitle})?
              </p>
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 font-semibold">
                All members will reset to <strong>0 / 0</strong> for this date — neither Present nor Absent will be counted on Admin Panel or Member Dashboards.
              </div>
            </div>

            <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={deletingDate}
                onClick={() => setConfirmDeleteDate(null)}
                className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingDate}
                onClick={handleDeleteEntireDate}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50 shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{deletingDate ? 'Deleting...' : 'Yes, Delete Entire Date'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
