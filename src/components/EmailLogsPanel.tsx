import React, { useState, useMemo } from 'react';
import { 
  Mail, 
  CheckCircle2, 
  XCircle, 
  Send, 
  ExternalLink, 
  Copy, 
  Check, 
  Search, 
  Download, 
  Clock, 
  Trash2, 
  Eye, 
  AlertCircle,
  FileText,
  User as UserIcon,
  Phone,
  RefreshCw,
  Sparkles,
  Inbox,
  Code,
  Layout,
  MessageSquare,
  ShieldCheck,
  CheckCheck
} from 'lucide-react';
import { SubmissionRecord, EmailLogRecord, EmailType } from '../types';
import { saveEmailLogToFirebase, deleteEmailLogFromFirebase, updateMemberInFirebase } from '../services/firebase';

interface EmailLogsPanelProps {
  members: SubmissionRecord[];
  emailLogs: EmailLogRecord[];
  currentUserEmail: string;
  onRefreshData?: () => void;
  onUpdateMemberStatus?: (memberId: string, newStatus: 'approved' | 'rejected') => Promise<void>;
}

const OFFICIAL_SENDER = 'ngdcsc.org@gmail.com';
const CLUB_LOGO_URL = 'https://plain-apac-prod-public.komododecks.com/202609/21/iFpbvbXJaON4rnVidFRy/image.png';
const WHATSAPP_GROUP_URL = 'https://chat.whatsapp.com/J0ooCmabbIT2dfJdXTLhni';
const VERIFY_STATUS_URL = 'https://ngdcsc.vercel.app/status';
const MAIN_SITE_URL = 'https://ngdcsc.vercel.app';

/**
 * Generates modern, bulletproof, responsive HTML Email Template with NGDC Science Club Branding
 */
export function buildRichEmailHtml({
  member,
  type,
  customNote
}: {
  member: SubmissionRecord;
  type: EmailType;
  customNote?: string;
}): string {
  const memName = member.name || 'Student';
  const membershipId = member.membershipId || 'NGDCSC-PENDING';
  const roll = member.studentId || 'N/A';
  const batch = member.batch || 'N/A';
  const section = member.section ? `Section ${member.section}` : 'N/A';
  const phone = member.phone || 'N/A';

  if (type === 'confirmation') {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Membership Approved - NGDC Science Club</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f1f5f9; padding: 24px 12px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01); border: 1px solid #e2e8f0;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #064e3b 0%, #065f46 60%, #047857 100%); padding: 32px 24px; text-align: center; border-bottom: 4px solid #10b981;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center">
                    <img src="${CLUB_LOGO_URL}" alt="NGDC Science Club Logo" width="75" height="75" style="display: block; margin: 0 auto 12px; border-radius: 12px; background: rgba(255, 255, 255, 0.15); padding: 6px; border: 1px solid rgba(255, 255, 255, 0.25);">
                    <h1 style="margin: 0 0 4px; font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: 0.5px; text-transform: uppercase;">New Government Degree College Science Club</h1>
                    <p style="margin: 0; font-size: 13px; color: #a7f3d0; font-weight: 500;">New Government Degree College, Rajshahi • Estd. 2017</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content Body -->
          <tr>
            <td style="padding: 32px 24px;">
              <!-- Approval Badge -->
              <div style="text-align: center; margin-bottom: 24px;">
                <span style="display: inline-block; background-color: #d1fae5; color: #065f46; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; padding: 6px 16px; border-radius: 9999px; border: 1px solid #a7f3d0;">
                  ✓ Official Membership Confirmation
                </span>
                <h2 style="margin: 12px 0 6px; font-size: 22px; font-weight: 800; color: #0f172a;">Welcome to NGDC Science Club!</h2>
                <p style="margin: 0; font-size: 14px; color: #64748b;">Your registration has been verified and approved by the Executive Committee.</p>
              </div>

              <p style="font-size: 15px; color: #334155; margin: 0 0 16px;">
                Dear <strong>${memName}</strong>,
              </p>
              <p style="font-size: 14px; color: #334155; margin: 0 0 20px; line-height: 1.6;">
                Congratulations! We are delighted to inform you that your application for membership in <strong>New Government Degree College Science Club (NGDCSC)</strong> has been officially approved. You are now a recognized general member of our science club family!
              </p>

              <!-- Credentials Card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; margin-bottom: 24px;">
                <tr>
                  <td style="background-color: #047857; padding: 10px 16px; color: #ffffff; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
                    Official Member Credentials
                  </td>
                </tr>
                <tr>
                  <td style="padding: 16px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="6" border="0" style="font-size: 13px;">
                      <tr>
                        <td width="40%" style="color: #64748b; font-weight: 600;">Membership ID:</td>
                        <td width="60%">
                          <span style="display: inline-block; background-color: #047857; color: #ffffff; font-family: monospace; font-size: 13px; font-weight: 700; padding: 4px 10px; border-radius: 6px;">
                            ${membershipId}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #64748b; font-weight: 600;">Full Name:</td>
                        <td style="color: #0f172a; font-weight: 700;">${memName}</td>
                      </tr>
                      <tr>
                        <td style="color: #64748b; font-weight: 600;">College Roll / ID:</td>
                        <td style="color: #0f172a; font-weight: 600; font-family: monospace;">${roll}</td>
                      </tr>
                      <tr>
                        <td style="color: #64748b; font-weight: 600;">Academic Batch:</td>
                        <td style="color: #0f172a; font-weight: 600;">${batch}</td>
                      </tr>
                      <tr>
                        <td style="color: #64748b; font-weight: 600;">Class Section:</td>
                        <td style="color: #0f172a; font-weight: 600;">${section}</td>
                      </tr>
                      <tr>
                        <td style="color: #64748b; font-weight: 600;">Registered Phone:</td>
                        <td style="color: #0f172a; font-weight: 600;">${phone}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              ${customNote ? `
              <div style="background-color: #ecfdf5; border-left: 4px solid #059669; padding: 14px; border-radius: 8px; margin-bottom: 24px; font-size: 13px; color: #065f46;">
                <strong>Special Executive Note:</strong><br>${customNote}
              </div>
              ` : ''}

              <!-- Action Call to Buttons -->
              <div style="text-align: center; margin: 28px 0;">
                <p style="font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 14px; text-transform: uppercase; letter-spacing: 0.5px;">
                  Complete Your Onboarding (Next Steps)
                </p>

                <!-- Button 1: WhatsApp Community -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin-bottom: 12px; width: 100%; max-width: 380px;">
                  <tr>
                    <td align="center" style="border-radius: 12px; background-color: #25D366;">
                      <a href="${WHATSAPP_GROUP_URL}" target="_blank" style="display: block; padding: 14px 20px; font-size: 14px; font-weight: 700; color: #ffffff; text-decoration: none; border-radius: 12px; text-align: center;">
                        💬 Join Official WhatsApp Community
                      </a>
                    </td>
                  </tr>
                </table>

                <!-- Button 2: Digital ID & Status Check -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="width: 100%; max-width: 380px;">
                  <tr>
                    <td align="center" style="border-radius: 12px; background-color: #059669;">
                      <a href="${VERIFY_STATUS_URL}" target="_blank" style="display: block; padding: 13px 20px; font-size: 14px; font-weight: 700; color: #ffffff; text-decoration: none; border-radius: 12px; text-align: center;">
                        🛡️ Check Digital ID &amp; Verification Status
                      </a>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Rules & Next Steps -->
              <div style="background-color: #f1f5f9; padding: 16px; border-radius: 12px; margin-bottom: 24px; font-size: 12px; color: #475569; line-height: 1.6;">
                <p style="margin: 0 0 6px; font-weight: 700; color: #1e293b; text-transform: uppercase; font-size: 11px;">
                  Important Guidelines for Members:
                </p>
                <ul style="margin: 0; padding-left: 18px;">
                  <li>Join the official WhatsApp community immediately to receive meeting schedules and competition alerts.</li>
                  <li>Keep your Membership ID (<strong>${membershipId}</strong>) handy for event entries, workshops, and science projects.</li>
                  <li>Visit our official website <a href="${MAIN_SITE_URL}" style="color: #059669; font-weight: 600;">ngdcsc.vercel.app</a> regularly for published notices.</li>
                </ul>
              </div>

              <!-- Sign-off -->
              <p style="font-size: 13px; color: #475569; margin: 0 0 4px;">Warm regards,</p>
              <p style="font-size: 14px; font-weight: 800; color: #0f172a; margin: 0 0 2px;">Executive Committee</p>
              <p style="font-size: 12px; color: #64748b; margin: 0;">New Government Degree College Science Club (NGDCSC)</p>
              <p style="font-size: 12px; color: #64748b; margin: 0;">New Government Degree College, Rajshahi</p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 24px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8;">
              <p style="margin: 0 0 4px;">This official communication is dispatched from <strong>${OFFICIAL_SENDER}</strong>.</p>
              <p style="margin: 0 0 4px;">
                <a href="${MAIN_SITE_URL}" style="color: #059669; text-decoration: none; font-weight: 600;">Website: ngdcsc.vercel.app</a> • 
                <a href="${VERIFY_STATUS_URL}" style="color: #059669; text-decoration: none; font-weight: 600;">Status Check: ngdcsc.vercel.app/status</a>
              </p>
              <p style="margin: 0;">&copy; ${new Date().getFullYear()} NGDC Science Club. All rights reserved.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  } else {
    // Decline Template
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Application Update - NGDC Science Club</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f1f5f9; padding: 24px 12px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); padding: 28px 24px; text-align: center; border-bottom: 4px solid #64748b;">
              <img src="${CLUB_LOGO_URL}" alt="NGDC Science Club Logo" width="65" height="65" style="display: block; margin: 0 auto 10px; border-radius: 10px; background: rgba(255, 255, 255, 0.1); padding: 5px;">
              <h1 style="margin: 0 0 4px; font-size: 18px; font-weight: 800; color: #ffffff; letter-spacing: 0.5px; text-transform: uppercase;">New Government Degree College Science Club</h1>
              <p style="margin: 0; font-size: 12px; color: #cbd5e1;">New Government Degree College, Rajshahi</p>
            </td>
          </tr>

          <!-- Main Content Body -->
          <tr>
            <td style="padding: 32px 24px;">
              <!-- Notice Badge -->
              <div style="text-align: center; margin-bottom: 24px;">
                <span style="display: inline-block; background-color: #f1f5f9; color: #475569; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; padding: 6px 16px; border-radius: 9999px; border: 1px solid #e2e8f0;">
                  Membership Application Review
                </span>
                <h2 style="margin: 12px 0 6px; font-size: 20px; font-weight: 800; color: #0f172a;">Application Status Update</h2>
              </div>

              <p style="font-size: 15px; color: #334155; margin: 0 0 16px;">
                Dear <strong>${memName}</strong>,
              </p>
              <p style="font-size: 14px; color: #334155; margin: 0 0 16px; line-height: 1.6;">
                Thank you for your interest in joining <strong>New Government Degree College Science Club (NGDCSC)</strong> and taking the time to submit your membership registration.
              </p>
              <p style="font-size: 14px; color: #334155; margin: 0 0 20px; line-height: 1.6;">
                After careful consideration and review of the received applications by our Executive Committee, we regret to inform you that we are unable to accept your membership application for this current academic session.
              </p>

              ${member.rejectionReason ? `
              <div style="background-color: #fff1f2; border-left: 4px solid #f43f5e; padding: 14px; border-radius: 8px; margin-bottom: 24px; font-size: 13px; color: #9f1239;">
                <strong>Review Feedback / Reason:</strong><br>${member.rejectionReason}
              </div>
              ` : ''}

              <!-- Application Summary -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 14px 16px; font-size: 12px; color: #64748b;">
                    <strong>Student Name:</strong> ${memName}<br>
                    <strong>Roll / ID:</strong> ${roll} • <strong>Batch:</strong> ${batch} • <strong>Section:</strong> ${section}
                  </td>
                </tr>
              </table>

              <!-- Queries Box -->
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin-bottom: 24px; text-align: center;">
                <p style="margin: 0 0 10px; font-size: 13px; font-weight: 700; color: #1e293b;">
                  Have Questions or Require Verification?
                </p>
                <p style="margin: 0 0 14px; font-size: 12px; color: #64748b; line-height: 1.5;">
                  If you believe there was a clerical mistake in your roll or batch verification, please reply directly to this email with your college identity verification.
                </p>
                <a href="mailto:${OFFICIAL_SENDER}" style="display: inline-block; background-color: #0f172a; color: #ffffff; text-decoration: none; font-size: 12px; font-weight: 700; padding: 10px 18px; border-radius: 8px;">
                  Contact Executive Committee (${OFFICIAL_SENDER})
                </a>
              </div>

              <p style="font-size: 13px; color: #334155; margin: 0 0 20px; line-height: 1.6;">
                We genuinely appreciate your enthusiasm for science and extracurricular learning. We encourage you to participate in our open science workshops, seminars, and exhibitions throughout the college year.
              </p>

              <!-- Sign-off -->
              <p style="font-size: 13px; color: #475569; margin: 0 0 4px;">Sincerely,</p>
              <p style="font-size: 14px; font-weight: 800; color: #0f172a; margin: 0 0 2px;">Executive Committee</p>
              <p style="font-size: 12px; color: #64748b; margin: 0;">New Government Degree College Science Club (NGDCSC)</p>
              <p style="font-size: 12px; color: #64748b; margin: 0;">New Government Degree College, Rajshahi</p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 24px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8;">
              <p style="margin: 0 0 4px;">Dispatched from <strong>${OFFICIAL_SENDER}</strong> • <a href="${MAIN_SITE_URL}" style="color: #475569; text-decoration: none; font-weight: 600;">ngdcsc.vercel.app</a></p>
              <p style="margin: 0;">&copy; ${new Date().getFullYear()} NGDC Science Club. All rights reserved.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }
}

/**
 * Generates formatted clean plain text / markdown version for clipboard & mail clients
 */
export function buildFormattedPlainText({
  member,
  type,
  customNote
}: {
  member: SubmissionRecord;
  type: EmailType;
  customNote?: string;
}): string {
  const memName = member.name || 'Student';
  const membershipId = member.membershipId || 'NGDCSC-PENDING';
  const roll = member.studentId || 'N/A';
  const batch = member.batch || 'N/A';
  const section = member.section ? `Section ${member.section}` : 'N/A';

  if (type === 'confirmation') {
    return `🎉 OFFICIAL MEMBERSHIP CONFIRMATION — NGDC SCIENCE CLUB

Dear ${memName},

Congratulations! We are delighted to inform you that your membership application for New Government Degree College Science Club (NGDCSC) has been reviewed and officially APPROVED by the Executive Committee.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OFFICIAL MEMBER CREDENTIALS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Full Name: ${memName}
• Official Membership ID: ${membershipId}
• Student Roll / ID: ${roll}
• Academic Batch: ${batch}
• Class Section: ${section}
• Registered Phone: ${member.phone}

${customNote ? `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nSPECIAL NOTE:\n${customNote}\n` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NEXT STEPS & OFFICIAL LINKS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Join our Official WhatsApp Community:
👉 ${WHATSAPP_GROUP_URL}

2. Check Your Digital ID & Membership Status:
👉 ${VERIFY_STATUS_URL}

3. Official Website:
👉 ${MAIN_SITE_URL}

We warmly welcome you to the NGDC Science Club family! Get ready for upcoming scientific olympiads, workshops, science fairs, and knowledge sessions.

Warm regards,
Executive Committee
NGDC Science Club (NGDCSC)
New Government Degree College, Rajshahi
Official Email: ${OFFICIAL_SENDER}`;
  } else {
    return `UPDATE: NGDC SCIENCE CLUB MEMBERSHIP APPLICATION

Dear ${memName},

Thank you for your interest and for submitting your membership application to New Government Degree College Science Club (NGDCSC).

After careful review by the Executive Committee, we regret to inform you that we are unable to accept your application for this session.

${member.rejectionReason ? `Reason / Review Note:\n${member.rejectionReason}\n\n` : ''}If you believe there was a mistake in your submitted credentials (such as Roll or Batch), please reply directly to this email (${OFFICIAL_SENDER}) with your student verification details.

Check application status anytime:
👉 ${VERIFY_STATUS_URL}

We wish you the very best in your academic studies at New Government Degree College.

Sincerely,
Executive Committee
NGDC Science Club (NGDCSC)
New Government Degree College, Rajshahi
Official Email: ${OFFICIAL_SENDER}`;
  }
}

export default function EmailLogsPanel({
  members,
  emailLogs,
  currentUserEmail,
  onRefreshData,
  onUpdateMemberStatus
}: EmailLogsPanelProps) {
  // Filters & State
  const [activeSubTab, setActiveSubTab] = useState<'members' | 'logs'>('members');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBatch, setFilterBatch] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterEmailStatus, setFilterEmailStatus] = useState<string>('All');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Email Compose Modal State
  const [composingMember, setComposingMember] = useState<SubmissionRecord | null>(null);
  const [emailType, setEmailType] = useState<EmailType>('confirmation');
  const [modalViewTab, setModalViewTab] = useState<'preview' | 'text' | 'html'>('preview');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailCustomNote, setEmailCustomNote] = useState('');
  const [plainTextBody, setPlainTextBody] = useState('');
  const [autoUpdateMemberStatus, setAutoUpdateMemberStatus] = useState(true);
  const [sendingState, setSendingState] = useState(false);

  // View Log Detail Modal
  const [viewingLog, setViewingLog] = useState<EmailLogRecord | null>(null);

  const showToast = (msg: string) => {
    setCopiedText(msg);
    setTimeout(() => setCopiedText(null), 3000);
  };

  // Compute live rich HTML template
  const currentHtmlEmail = useMemo(() => {
    if (!composingMember) return '';
    return buildRichEmailHtml({
      member: composingMember,
      type: emailType,
      customNote: emailCustomNote
    });
  }, [composingMember, emailType, emailCustomNote]);

  // Open modal for a specific member and email type
  const openComposeModal = (member: SubmissionRecord, type: EmailType) => {
    setComposingMember(member);
    setEmailType(type);
    setModalViewTab('preview');
    setEmailCustomNote('');

    const membershipId = member.membershipId || 'NGDCSC';
    const subject = type === 'confirmation'
      ? `🎉 Welcome to NGDC Science Club - Membership Approved! [ID: ${membershipId}]`
      : `Update regarding your NGDC Science Club Membership Application`;
    setEmailSubject(subject);

    const txt = buildFormattedPlainText({ member, type });
    setPlainTextBody(txt);
    setAutoUpdateMemberStatus(true);
  };

  // Switch type inside modal
  const handleTypeChange = (type: EmailType) => {
    if (!composingMember) return;
    setEmailType(type);
    const membershipId = composingMember.membershipId || 'NGDCSC';
    const subject = type === 'confirmation'
      ? `🎉 Welcome to NGDC Science Club - Membership Approved! [ID: ${membershipId}]`
      : `Update regarding your NGDC Science Club Membership Application`;
    setEmailSubject(subject);

    const txt = buildFormattedPlainText({ member: composingMember, type, customNote: emailCustomNote });
    setPlainTextBody(txt);
  };

  // Copy Rich Formatted HTML into clipboard as text/html for direct pasting in Gmail
  const copyRichFormattedHtml = async () => {
    if (!composingMember) return;
    try {
      const html = currentHtmlEmail;
      const text = plainTextBody;
      const blobHtml = new Blob([html], { type: 'text/html' });
      const blobText = new Blob([text], { type: 'text/plain' });

      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': blobHtml,
            'text/plain': blobText
          })
        ]);
        showToast('✨ Copied Rich Graphic Template! Simply paste (Ctrl+V) in Gmail.');
      } else {
        await navigator.clipboard.writeText(text);
        showToast('Copied formatted template to clipboard!');
      }
    } catch (err) {
      console.warn('Clipboard write warning:', err);
      navigator.clipboard.writeText(plainTextBody);
      showToast('Copied plain text to clipboard!');
    }
  };

  // Dispatch Action: Log to Firebase & trigger Gmail / Mailto
  const handleDispatchEmail = async (method: 'gmail' | 'mailto' | 'copy_rich' | 'mark_only') => {
    if (!composingMember) return;
    setSendingState(true);

    const recipientEmail = (composingMember.email || '').trim();
    const recipientName = composingMember.name || 'Member';
    const memberId = composingMember.id;
    const membershipId = composingMember.membershipId;

    const logRecord: EmailLogRecord = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      memberId,
      membershipId,
      recipientName,
      recipientEmail,
      recipientPhone: composingMember.phone,
      senderEmail: OFFICIAL_SENDER,
      emailType,
      subject: emailSubject,
      body: plainTextBody,
      sentAt: new Date().toISOString(),
      sentBy: currentUserEmail || OFFICIAL_SENDER,
      status: 'sent'
    };

    try {
      // 1. Copy Rich Formatted template automatically so when Gmail opens, admin can just Ctrl+V if they want full visual layout!
      await copyRichFormattedHtml();

      // 2. Save log to Firestore
      await saveEmailLogToFirebase(logRecord);

      // 3. Optionally update member status if toggled
      if (autoUpdateMemberStatus && memberId) {
        if (emailType === 'confirmation' && composingMember.status !== 'approved') {
          if (onUpdateMemberStatus) {
            await onUpdateMemberStatus(memberId, 'approved');
          } else {
            await updateMemberInFirebase(memberId, { ...composingMember, status: 'approved' });
          }
        } else if (emailType === 'decline' && composingMember.status !== 'rejected') {
          if (onUpdateMemberStatus) {
            await onUpdateMemberStatus(memberId, 'rejected');
          } else {
            await updateMemberInFirebase(memberId, { ...composingMember, status: 'rejected' });
          }
        }
      }

      // 4. Open mail client
      if (method === 'gmail') {
        const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(recipientEmail)}&su=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(plainTextBody)}`;
        window.open(gmailUrl, '_blank', 'noopener,noreferrer');
        showToast('🚀 Opened Gmail! Rich template is copied to clipboard.');
      } else if (method === 'mailto') {
        const mailtoUrl = `mailto:${encodeURIComponent(recipientEmail)}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(plainTextBody)}`;
        window.location.href = mailtoUrl;
        showToast('Opened Mail Client!');
      } else if (method === 'mark_only') {
        showToast(`Saved email log for ${recipientName}!`);
      }

      setComposingMember(null);
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      console.error('Error recording email dispatch:', err);
      alert('Error saving email log: ' + (err?.message || 'Check connection'));
    } finally {
      setSendingState(false);
    }
  };

  const handleDeleteLog = async (logId: string) => {
    if (!window.confirm('Are you sure you want to delete this email log record?')) return;
    try {
      await deleteEmailLogFromFirebase(logId);
      showToast('Email log record deleted');
      if (onRefreshData) onRefreshData();
    } catch (err) {
      console.error('Error deleting log:', err);
    }
  };

  // Helper map: memberId -> list of sent email logs
  const memberLogsMap = useMemo(() => {
    const map = new Map<string, EmailLogRecord[]>();
    for (const log of emailLogs) {
      if (log.memberId) {
        const existing = map.get(log.memberId) || [];
        existing.push(log);
        map.set(log.memberId, existing);
      }
    }
    return map;
  }, [emailLogs]);

  // Filtered Members
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        (m.name || '').toLowerCase().includes(q) ||
        (m.studentId || '').toLowerCase().includes(q) ||
        (m.email || '').toLowerCase().includes(q) ||
        (m.phone || '').includes(q) ||
        (m.membershipId || '').toLowerCase().includes(q);

      const matchBatch = filterBatch === 'All' || m.batch === filterBatch;
      const matchStatus = filterStatus === 'All' || m.status === filterStatus;

      // Email status filter
      const mLogs = (m.id ? memberLogsMap.get(m.id) : null) || [];
      const hasConfirm = mLogs.some((l) => l.emailType === 'confirmation') || m.lastEmailSent?.type === 'confirmation';
      const hasDecline = mLogs.some((l) => l.emailType === 'decline') || m.lastEmailSent?.type === 'decline';

      let matchEmailStatus = true;
      if (filterEmailStatus === 'confirmation_sent') {
        matchEmailStatus = hasConfirm;
      } else if (filterEmailStatus === 'decline_sent') {
        matchEmailStatus = hasDecline;
      } else if (filterEmailStatus === 'not_sent') {
        matchEmailStatus = !hasConfirm && !hasDecline;
      }

      return matchSearch && matchBatch && matchStatus && matchEmailStatus;
    });
  }, [members, searchQuery, filterBatch, filterStatus, filterEmailStatus, memberLogsMap]);

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return emailLogs.filter((log) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        (log.recipientName || '').toLowerCase().includes(q) ||
        (log.recipientEmail || '').toLowerCase().includes(q) ||
        (log.membershipId || '').toLowerCase().includes(q) ||
        (log.subject || '').toLowerCase().includes(q);

      const matchType = filterStatus === 'All' || log.emailType === filterStatus;
      return matchSearch && matchType;
    });
  }, [emailLogs, searchQuery, filterStatus]);

  // Statistics
  const totalMembersWithEmail = useMemo(() => members.filter((m) => m.email && m.email.trim()).length, [members]);
  const totalConfirmationsSent = useMemo(() => emailLogs.filter((l) => l.emailType === 'confirmation').length, [emailLogs]);
  const totalDeclinesSent = useMemo(() => emailLogs.filter((l) => l.emailType === 'decline').length, [emailLogs]);
  const pendingNotificationCount = useMemo(() => {
    return members.filter((m) => {
      const mLogs = (m.id ? memberLogsMap.get(m.id) : null) || [];
      return (m.status === 'approved' || m.status === 'rejected') && mLogs.length === 0;
    }).length;
  }, [members, memberLogsMap]);

  // Export Logs CSV
  const exportLogsCSV = () => {
    if (emailLogs.length === 0) {
      alert('No email logs available to export.');
      return;
    }
    const headers = ['Log ID', 'Sent At', 'Recipient Name', 'Recipient Email', 'Recipient Phone', 'Membership ID', 'Email Type', 'Subject', 'Sent By'];
    const rows = emailLogs.map((l) => [
      `"${l.id}"`,
      `"${l.sentAt}"`,
      `"${l.recipientName}"`,
      `"${l.recipientEmail}"`,
      `"${l.recipientPhone || ''}"`,
      `"${l.membershipId || ''}"`,
      `"${l.emailType}"`,
      `"${l.subject.replace(/"/g, '""')}"`,
      `"${l.sentBy}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `NGDCSC_Email_Logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Toast */}
      {copiedText && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl bg-slate-900 text-white font-bold text-xs shadow-2xl flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-top-3">
          <CheckCheck className="w-4 h-4 text-emerald-400 stroke-[3]" />
          <span>{copiedText}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 p-5 sm:p-6 rounded-2xl text-white shadow-sm border border-emerald-800/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" />
                <span>Email Logs &amp; Rich Notification Dispatcher</span>
              </span>
              <span className="px-2 py-0.5 rounded-lg bg-white/10 text-slate-300 text-[10px] font-bold">
                From: {OFFICIAL_SENDER}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <span>সদস্যপদ ইমেইল ম্যানেজমেন্ট ও হিস্ট্রি লগ</span>
              <Sparkles className="w-5 h-5 text-emerald-400" />
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              সদস্যের ছবির পাশ থেকে এক ক্লিকে <strong>{OFFICIAL_SENDER}</strong> থেকে আকর্ষণীয় গ্রাফিকাল টেমপ্লেটে কনফার্মেশন ও ডিক্লাইন ইমেইল পাঠান (হোয়াটসঅ্যাপ গ্রুপ লিংক ও <span className="text-emerald-400 font-mono">ngdcsc.vercel.app/status</span> লিংকসহ)।
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onRefreshData && (
              <button
                type="button"
                onClick={onRefreshData}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/15 transition-all cursor-pointer"
                title="Refresh real-time data"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            )}
            <button
              type="button"
              onClick={exportLogsCSV}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Quick Links Indicator */}
        <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center gap-2 sm:gap-4 text-[11px] text-slate-300 font-medium">
          <span className="flex items-center gap-1 text-emerald-300 font-bold">
            <MessageSquare className="w-3.5 h-3.5 text-[#25D366]" />
            <span>Official WhatsApp Link:</span>
            <a href={WHATSAPP_GROUP_URL} target="_blank" rel="noreferrer" className="text-white underline font-mono text-[10px]">
              chat.whatsapp.com/J0ooCmabbIT2dfJdXTLhni
            </a>
          </span>
          <span className="text-slate-500 hidden sm:inline">•</span>
          <span className="flex items-center gap-1 text-emerald-300 font-bold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Status Check Link:</span>
            <a href={VERIFY_STATUS_URL} target="_blank" rel="noreferrer" className="text-white underline font-mono text-[10px]">
              ngdcsc.vercel.app/status
            </a>
          </span>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-white/10">
          <div className="bg-white/5 p-3 rounded-xl border border-white/10">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total with Email</p>
            <p className="text-xl font-black text-white mt-0.5">{totalMembersWithEmail}</p>
          </div>
          <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Confirmation Sent</p>
            <p className="text-xl font-black text-emerald-300 mt-0.5">{totalConfirmationsSent}</p>
          </div>
          <div className="bg-rose-500/10 p-3 rounded-xl border border-rose-500/20">
            <p className="text-[10px] font-bold uppercase tracking-wider text-rose-400">Decline Sent</p>
            <p className="text-xl font-black text-rose-300 mt-0.5">{totalDeclinesSent}</p>
          </div>
          <div className="bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Pending Notice</p>
            <p className="text-xl font-black text-amber-300 mt-0.5">{pendingNotificationCount}</p>
          </div>
        </div>
      </div>

      {/* View Switcher Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2 flex-wrap gap-2">
        <div className="flex items-center gap-1.5 bg-slate-200/70 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveSubTab('members')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'members'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserIcon className="w-3.5 h-3.5 text-emerald-600" />
            <span>সদস্য তালিকা ও ইমেইল পাঠান</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-700 font-bold">
              {filteredMembers.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('logs')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'logs'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Inbox className="w-3.5 h-3.5 text-blue-600" />
            <span>প্রেরিত ইমেইল লগস হিস্ট্রি</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-700 font-bold">
              {emailLogs.length}
            </span>
          </button>
        </div>

        <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Logged-in Admin: {currentUserEmail || OFFICIAL_SENDER}</span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, roll, email, membership ID..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-emerald-600 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeSubTab === 'members' && (
            <>
              {/* Batch Filter */}
              <select
                value={filterBatch}
                onChange={(e) => setFilterBatch(e.target.value)}
                className="px-3 py-2 text-xs font-bold rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:bg-white"
              >
                <option value="All">All Batches</option>
                <option value="HSC 27">HSC 27</option>
                <option value="HSC 28">HSC 28</option>
              </select>

              {/* Membership Status Filter */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 text-xs font-bold rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:bg-white"
              >
                <option value="All">All Membership Status</option>
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
              </select>

              {/* Email Delivery Status Filter */}
              <select
                value={filterEmailStatus}
                onChange={(e) => setFilterEmailStatus(e.target.value)}
                className="px-3 py-2 text-xs font-bold rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:bg-white"
              >
                <option value="All">All Email Status</option>
                <option value="confirmation_sent">Confirmation Sent</option>
                <option value="decline_sent">Decline Sent</option>
                <option value="not_sent">No Email Sent Yet</option>
              </select>
            </>
          )}

          {activeSubTab === 'logs' && (
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 text-xs font-bold rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:bg-white"
            >
              <option value="All">All Types</option>
              <option value="confirmation">Confirmation Only</option>
              <option value="decline">Decline Only</option>
            </select>
          )}

          {(searchQuery || filterBatch !== 'All' || filterStatus !== 'All' || filterEmailStatus !== 'All') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setFilterBatch('All');
                setFilterStatus('All');
                setFilterEmailStatus('All');
              }}
              className="px-2.5 py-2 text-[11px] font-bold rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ===================== SUBTAB 1: MEMBERS LIST WITH DIRECT EMAIL BUTTONS ===================== */}
      {activeSubTab === 'members' && (
        <div className="space-y-4">
          {filteredMembers.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-slate-200">
              <Mail className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">কোনো রেজিস্টার্ড সদস্য পাওয়া যায়নি</p>
              <p className="text-xs text-slate-400 mt-1">ফিল্টারের মান পরিবর্তন করে আবার চেষ্টা করুন।</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMembers.map((member) => {
                const memberLogs = (member.id ? memberLogsMap.get(member.id) : null) || [];
                const lastLog = memberLogs[0] || (member.lastEmailSent ? {
                  emailType: member.lastEmailSent.type,
                  sentAt: member.lastEmailSent.sentAt,
                  sentBy: member.lastEmailSent.sentBy || 'Admin'
                } : null);

                const hasValidEmail = Boolean(member.email && member.email.includes('@'));

                return (
                  <div
                    key={member.id || member.studentId}
                    className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-3 relative group"
                  >
                    {/* Top Row: Photo + Member Info */}
                    <div className="flex items-start gap-3.5">
                      {/* Photo */}
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 relative shadow-inner">
                        {member.photo ? (
                          <img
                            src={member.photo}
                            alt={member.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400">
                            <UserIcon className="w-7 h-7" />
                          </div>
                        )}
                        {member.membershipId && (
                          <span className="absolute bottom-0 inset-x-0 bg-slate-900/80 backdrop-blur-xs text-[8px] text-white font-mono text-center py-0.5 truncate px-1 font-bold">
                            {member.membershipId}
                          </span>
                        )}
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-1">
                          <h3 className="text-xs font-black text-slate-900 truncate" title={member.name}>
                            {member.name}
                          </h3>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase shrink-0 ${
                              member.status === 'approved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : member.status === 'rejected'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {member.status || 'pending'}
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-500 font-medium flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-slate-700 font-bold">Roll: {member.studentId}</span>
                          <span>•</span>
                          <span>{member.batch}</span>
                          {member.section && (
                            <>
                              <span>•</span>
                              <span>Sec {member.section}</span>
                            </>
                          )}
                        </div>

                        {/* Email address with copy */}
                        <div className="pt-0.5 flex items-center gap-1.5 text-xs">
                          {hasValidEmail ? (
                            <div className="flex items-center gap-1 text-slate-700 font-medium truncate max-w-[200px]" title={member.email}>
                              <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">{member.email}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(member.email);
                                  showToast('Copied email to clipboard!');
                                }}
                                title="Copy Email"
                                className="p-0.5 hover:text-emerald-600 text-slate-400 transition-colors cursor-pointer"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-amber-600 font-bold flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              <span>No valid email provided</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Email Log Status Badge */}
                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 flex items-center justify-between text-[10px]">
                      <span className="text-slate-500 font-bold flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>Email Status:</span>
                      </span>
                      {lastLog ? (
                        <span
                          className={`font-black flex items-center gap-1 ${
                            lastLog.emailType === 'confirmation' ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {lastLog.emailType === 'confirmation' ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <XCircle className="w-3 h-3 text-rose-600" />
                          )}
                          <span>
                            {lastLog.emailType === 'confirmation' ? 'Confirmation Sent' : 'Decline Sent'}
                          </span>
                          {lastLog.sentAt && (
                            <span className="text-[9px] text-slate-400 font-normal">
                              ({new Date(lastLog.sentAt).toLocaleDateString()})
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-medium italic">Not sent yet</span>
                      )}
                    </div>

                    {/* Action Buttons: 2 Buttons Requested (Confirmation & Decline) */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {/* 1. Confirmation Email Button */}
                      <button
                        type="button"
                        disabled={!hasValidEmail}
                        onClick={() => openComposeModal(member, 'confirmation')}
                        className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        title="Send Official Membership Confirmation Email"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">কনফার্মেশন</span>
                      </button>

                      {/* 2. Decline Email Button */}
                      <button
                        type="button"
                        disabled={!hasValidEmail}
                        onClick={() => openComposeModal(member, 'decline')}
                        className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        title="Send Official Membership Decline Email"
                      >
                        <XCircle className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">ডিক্লাইন</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===================== SUBTAB 2: DISPATCHED EMAIL LOGS HISTORY ===================== */}
      {activeSubTab === 'logs' && (
        <div className="space-y-4">
          {filteredLogs.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-slate-200">
              <Inbox className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">কোনো প্রেরিত ইমেইল লগ পাওয়া যায়নি</p>
              <p className="text-xs text-slate-400 mt-1">সদস্যদের কনফার্মেশন বা ডিক্লাইন ইমেইল পাঠালে এখানে স্বয়ংক্রিয়ভাবে রেকর্ড সংরক্ষিত হবে।</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px] font-black tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Date &amp; Time</th>
                      <th className="py-3 px-4">Recipient</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Subject</th>
                      <th className="py-3 px-4">Dispatched By</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                          {log.sentAt ? new Date(log.sentAt).toLocaleString() : 'N/A'}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{log.recipientName}</div>
                          <div className="text-[11px] text-slate-500 font-mono">{log.recipientEmail}</div>
                          {log.membershipId && (
                            <span className="text-[9px] font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                              {log.membershipId}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                              log.emailType === 'confirmation'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {log.emailType === 'confirmation' ? (
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <XCircle className="w-3 h-3 text-rose-600" />
                            )}
                            <span>{log.emailType}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 max-w-xs truncate text-slate-700" title={log.subject}>
                          {log.subject}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-slate-500 text-[11px] font-mono">
                          {log.sentBy}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap space-x-1.5">
                          <button
                            type="button"
                            onClick={() => setViewingLog(log)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-slate-100 transition-colors cursor-pointer"
                            title="View Full Email Body"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteLog(log.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete Log Record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================== MODAL: EMAIL COMPOSE & RICH TEMPLATE DISPATCH ===================== */}
      {composingMember && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/90">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white ${
                    emailType === 'confirmation' ? 'bg-emerald-600' : 'bg-rose-600'
                  }`}
                >
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900">
                    {emailType === 'confirmation'
                      ? 'মেম্বারশিপ কনফার্মেশন ইমেইল পাঠান'
                      : 'মেম্বারশিপ ডিক্লাইন ইমেইল পাঠান'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    From: <strong>{OFFICIAL_SENDER}</strong> • To: <strong>{composingMember.email}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setComposingMember(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
              {/* Member Quick Summary Card */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-200 shrink-0 border border-slate-300">
                    {composingMember.photo ? (
                      <img src={composingMember.photo} alt={composingMember.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <UserIcon className="w-6 h-6" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-black text-slate-900 text-sm truncate">{composingMember.name}</p>
                    <p className="text-slate-500 font-mono text-[11px] truncate">
                      Roll: {composingMember.studentId} • {composingMember.batch} {composingMember.section ? `• Sec ${composingMember.section}` : ''}
                    </p>
                    <p className="text-slate-600 font-mono text-[11px] font-bold text-emerald-700">
                      ID: {composingMember.membershipId || 'To be generated'}
                    </p>
                  </div>
                </div>

                {/* Switch Type Toggle inside modal */}
                <div className="flex flex-col sm:items-end gap-1 shrink-0">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Select Mode</span>
                  <div className="inline-flex rounded-xl bg-slate-200 p-1">
                    <button
                      type="button"
                      onClick={() => handleTypeChange('confirmation')}
                      className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                        emailType === 'confirmation' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-700'
                      }`}
                    >
                      Confirmation
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTypeChange('decline')}
                      className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                        emailType === 'decline' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-700'
                      }`}
                    >
                      Decline
                    </button>
                  </div>
                </div>
              </div>

              {/* Subject Field */}
              <div className="space-y-1">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-600">
                  Subject Line:
                </label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 font-medium focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>

              {/* Special Note / Custom message */}
              <div className="space-y-1">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-600 flex items-center justify-between">
                  <span>Additional Executive Note / Custom Message (Optional):</span>
                  <span className="text-slate-400 font-normal">Included in template</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Please bring 2 passport photos to the next meeting on Monday."
                  value={emailCustomNote}
                  onChange={(e) => setEmailCustomNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:bg-white focus:border-emerald-600 focus:outline-none"
                />
              </div>

              {/* View Switcher: Live Graphic Preview vs Plain Text vs HTML Source */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50">
                <div className="bg-slate-100/90 px-3 py-2 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setModalViewTab('preview')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        modalViewTab === 'preview' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Layout className="w-3.5 h-3.5 text-emerald-600" />
                      <span>✨ Graphic Template Preview</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setModalViewTab('text')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        modalViewTab === 'text' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5 text-slate-600" />
                      <span>Plain Text</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setModalViewTab('html')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        modalViewTab === 'html' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Code className="w-3.5 h-3.5 text-slate-600" />
                      <span>HTML Code</span>
                    </button>
                  </div>

                  {/* Copy Rich Template Button */}
                  <button
                    type="button"
                    onClick={copyRichFormattedHtml}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                    title="Copy formatted template to clipboard (pastes directly with styling in Gmail)"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Formatted Template</span>
                  </button>
                </div>

                {/* Tab 1: Live Interactive Graphic Preview */}
                {modalViewTab === 'preview' && (
                  <div className="p-3 bg-slate-200/50 max-h-96 overflow-y-auto">
                    <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                      {/* Visual Header */}
                      <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-emerald-950 p-5 text-center text-white border-b-4 border-emerald-500">
                        <img src={CLUB_LOGO_URL} alt="Logo" className="w-14 h-14 mx-auto mb-2 rounded-xl bg-white/10 p-1.5" />
                        <h4 className="font-extrabold text-sm uppercase tracking-wide">New Government Degree College Science Club</h4>
                        <p className="text-[11px] text-emerald-200 font-medium">New Government Degree College, Rajshahi</p>
                      </div>

                      {/* Visual Body */}
                      <div className="p-5 space-y-4">
                        <div className="text-center space-y-1">
                          <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            emailType === 'confirmation' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {emailType === 'confirmation' ? '✓ Official Membership Confirmation' : 'Application Review Update'}
                          </span>
                          <h3 className="text-base font-extrabold text-slate-900">
                            {emailType === 'confirmation' ? `Welcome to NGDC Science Club!` : `Membership Review Notice`}
                          </h3>
                        </div>

                        <p className="text-slate-700 text-xs">
                          Dear <strong>{composingMember.name}</strong>,
                        </p>
                        <p className="text-slate-700 text-xs leading-relaxed">
                          {emailType === 'confirmation'
                            ? `Congratulations! We are delighted to inform you that your application for membership in New Government Degree College Science Club (NGDCSC) has been officially approved.`
                            : `Thank you for your application to New Government Degree College Science Club. After review by the Executive Committee, we regret to inform you that your application could not be accepted for the current session.`}
                        </p>

                        {/* Credentials Box */}
                        {emailType === 'confirmation' && (
                          <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
                            <div className="bg-emerald-700 text-white font-bold text-[10px] px-3 py-1.5 uppercase">
                              Official Member Credentials
                            </div>
                            <div className="p-3 space-y-1.5 text-[11px]">
                              <div className="flex justify-between border-b border-slate-200/60 pb-1">
                                <span className="text-slate-500">Membership ID:</span>
                                <span className="font-mono font-bold text-white bg-emerald-700 px-2 py-0.5 rounded text-[10px]">
                                  {composingMember.membershipId || 'NGDCSC-001'}
                                </span>
                              </div>
                              <div className="flex justify-between border-b border-slate-200/60 pb-1">
                                <span className="text-slate-500">Student Roll / ID:</span>
                                <span className="font-mono font-bold text-slate-800">{composingMember.studentId}</span>
                              </div>
                              <div className="flex justify-between border-b border-slate-200/60 pb-1">
                                <span className="text-slate-500">Academic Batch:</span>
                                <span className="font-bold text-slate-800">{composingMember.batch}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">Class Section:</span>
                                <span className="font-bold text-slate-800">Section {composingMember.section || 'A'}</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {emailCustomNote && (
                          <div className="p-3 rounded-xl bg-emerald-50 border-l-4 border-emerald-600 text-[11px] text-emerald-900">
                            <strong>Executive Note:</strong> {emailCustomNote}
                          </div>
                        )}

                        {/* Styled Buttons */}
                        <div className="pt-2 space-y-2 text-center">
                          {emailType === 'confirmation' && (
                            <>
                              <a
                                href={WHATSAPP_GROUP_URL}
                                target="_blank"
                                rel="noreferrer"
                                className="block w-full py-2.5 rounded-xl bg-[#25D366] text-white font-bold text-xs text-center shadow-xs"
                              >
                                💬 Join Official WhatsApp Community
                              </a>
                              <a
                                href={VERIFY_STATUS_URL}
                                target="_blank"
                                rel="noreferrer"
                                className="block w-full py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs text-center shadow-xs"
                              >
                                🛡️ Check Digital Status &amp; ID Card ({VERIFY_STATUS_URL})
                              </a>
                            </>
                          )}
                          {emailType === 'decline' && (
                            <a
                              href={VERIFY_STATUS_URL}
                              target="_blank"
                              rel="noreferrer"
                              className="block w-full py-2.5 rounded-xl bg-slate-800 text-white font-bold text-xs text-center shadow-xs"
                            >
                              🛡️ Check Application Status ({VERIFY_STATUS_URL})
                            </a>
                          )}
                        </div>

                        {/* Visual Footer */}
                        <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 space-y-0.5">
                          <p className="font-bold text-slate-700">Executive Committee</p>
                          <p>New Government Degree College Science Club (NGDCSC), Rajshahi</p>
                          <p className="text-[10px] text-slate-400">Email: {OFFICIAL_SENDER} • Website: ngdcsc.vercel.app</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 2: Plain Text */}
                {modalViewTab === 'text' && (
                  <div className="p-3">
                    <textarea
                      rows={10}
                      value={plainTextBody}
                      onChange={(e) => setPlainTextBody(e.target.value)}
                      className="w-full p-3 rounded-xl bg-white border border-slate-200 text-slate-900 font-mono text-[11px] leading-relaxed focus:outline-none"
                    />
                  </div>
                )}

                {/* Tab 3: HTML Code */}
                {modalViewTab === 'html' && (
                  <div className="p-3">
                    <textarea
                      rows={10}
                      readOnly
                      value={currentHtmlEmail}
                      className="w-full p-3 rounded-xl bg-slate-900 text-emerald-400 font-mono text-[11px] leading-relaxed focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Auto Status Update Checkbox */}
              <label className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoUpdateMemberStatus}
                  onChange={(e) => setAutoUpdateMemberStatus(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                />
                <span className="text-slate-700 text-xs font-semibold">
                  ইমেইল প্রেরণের সাথে সাথে মেম্বারের স্ট্যাটাস স্বয়ংক্রিয়ভাবে{' '}
                  <strong className={emailType === 'confirmation' ? 'text-emerald-700' : 'text-rose-700'}>
                    {emailType === 'confirmation' ? 'Approved' : 'Rejected'}
                  </strong>{' '}
                  হিসেবে ডাটাবেজে আপডেট করুন
                </span>
              </label>
            </div>

            {/* Modal Footer / Dispatch Actions */}
            <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/90 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              <button
                type="button"
                onClick={() => setComposingMember(null)}
                className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-200 text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>

              <div className="flex flex-wrap items-center gap-2">
                {/* Option 1: Mark as Sent Only */}
                <button
                  type="button"
                  disabled={sendingState}
                  onClick={() => handleDispatchEmail('mark_only')}
                  className="px-3.5 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition-all cursor-pointer"
                  title="Save to database email logs only"
                >
                  Mark as Sent
                </button>

                {/* Option 2: Send via Default Mail App */}
                <button
                  type="button"
                  disabled={sendingState}
                  onClick={() => handleDispatchEmail('mailto')}
                  className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-all cursor-pointer"
                  title="Open default system mail client"
                >
                  Mail App
                </button>

                {/* Option 3: Primary - Send via Gmail Web */}
                <button
                  type="button"
                  disabled={sendingState}
                  onClick={() => handleDispatchEmail('gmail')}
                  className={`px-4 py-2.5 rounded-xl text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    emailType === 'confirmation'
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                      : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                  }`}
                  title="Opens Gmail composer with pre-filled recipient and subject; graphic template is copied to clipboard"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send via Gmail ({OFFICIAL_SENDER})</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== MODAL: VIEW SENT EMAIL LOG ===================== */}
      {viewingLog && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-white ${
                    viewingLog.emailType === 'confirmation' ? 'bg-emerald-600' : 'bg-rose-600'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Sent Email Record</h3>
                  <p className="text-[11px] text-slate-500 font-mono">{viewingLog.sentAt ? new Date(viewingLog.sentAt).toLocaleString() : 'N/A'}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingLog(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto space-y-3.5 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1 font-mono text-[11px]">
                <p><strong>From:</strong> {viewingLog.senderEmail}</p>
                <p><strong>To:</strong> {viewingLog.recipientName} &lt;{viewingLog.recipientEmail}&gt;</p>
                {viewingLog.membershipId && <p><strong>Membership ID:</strong> {viewingLog.membershipId}</p>}
                <p><strong>Type:</strong> <span className="uppercase font-bold">{viewingLog.emailType}</span></p>
                <p><strong>Sent By:</strong> {viewingLog.sentBy}</p>
              </div>

              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase">Subject:</p>
                <p className="font-bold text-slate-900 text-sm mt-0.5">{viewingLog.subject}</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[11px] font-bold text-slate-500 uppercase">Message Content:</p>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(viewingLog.body);
                      showToast('Copied email content!');
                    }}
                    className="text-[10px] text-emerald-700 font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </button>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-sans whitespace-pre-wrap text-[11px] leading-relaxed max-h-72 overflow-y-auto">
                  {viewingLog.body}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setViewingLog(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all cursor-pointer"
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
