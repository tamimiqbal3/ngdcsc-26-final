import type { ClubNotice } from '../types';

export type SeoRouteKey =
  | 'home'
  | 'notices'
  | 'notice_detail'
  | 'committee'
  | 'status'
  | 'form'
  | 'login'
  | 'dashboard'
  | 'slip'
  | 'admin'
  | '404';

export interface RouteSeoMetadata {
  title: string;
  description: string;
  keywords: string[];
  canonicalPath: string;
  robots: string;
  ogType: 'website' | 'article';
  breadcrumbLabel: string;
}

// Core formal English & Bangla keywords shared across NGDC SCIENCE CLUB pages
const CORE_BRAND_KEYWORDS: string[] = [
  'NGDC SCIENCE CLUB',
  'NGDC Science Club',
  'NGDCSC',
  'NGDC',
  'ngdcsc',
  'ngdc',
  'NGDC Rajshahi',
  'NGDCSC Rajshahi',
  'New Government Degree College',
  'New Govt. Degree College',
  'New Government Degree College Rajshahi',
  'New Govt. Degree College Rajshahi',
  'New Govt Degree College Science Club',
  'New Government Degree College Science Club',
  'NGDC Science Club Official Website',
  'NGDC Science Club Portal',
  'Rajshahi College Science Club',
  'Rajshahi Science Club',
  'NGDC Student Portal',
  'NGDC Official Portal',
  'NGDC HSC Science',
  'NGDC HSC 27',
  'NGDC HSC 28',
  'এনজিডিসি',
  'এনজিডিসিএসসি',
  'এনজিডিসি সায়েন্স ক্লাব',
  'এনজিডিসি বিজ্ঞান ক্লাব',
  'নিউ গভঃ ডিগ্রি কলেজ',
  'নিউ গভর্নমেন্ট ডিগ্রি কলেজ',
  'নিউ গভর্নমেন্ট ডিগ্রি কলেজ রাজশাহী',
  'নিউ গভঃ ডিগ্রি কলেজ রাজশাহী',
  'নিউ গভঃ ডিগ্রি কলেজ বিজ্ঞান ক্লাব',
  'নতুন সরকারি ডিগ্রি কলেজ রাজশাহী',
  'রাজশাহী নিউ গভঃ ডিগ্রি কলেজ সায়েন্স ক্লাব',
  'এনজিডিসি রাজশাহী',
  'এনজিডিসি অফিশিয়াল ওয়েবসাইট'
];

const CORE_ACADEMIC_KEYWORDS: string[] = [
  'Bangladesh Science Olympiad',
  'Rajshahi Science Olympiad',
  'NGDC Science Fest',
  '1st NGDC Science Fest',
  'Inter-College Science Festival Rajshahi',
  'Higher Secondary Science Club Bangladesh',
  'Class 11 Science NGDC',
  'Class 12 Science NGDC',
  'Physics Olympiad NGDC',
  'Mathematics Olympiad NGDC',
  'Chemistry Olympiad NGDC',
  'Biology Olympiad NGDC',
  'Astronomy and Astrophysics Wing NGDC',
  'Robotics and Programming NGDC',
  'Science Project Exhibition NGDC',
  'Scientific Wall Magazine NGDC',
  'Science Quiz Competition Rajshahi',
  'STEM Education Rajshahi',
  'বিজ্ঞান মেলা রাজশাহী',
  'এনজিডিসি বিজ্ঞান উৎসব',
  'বিজ্ঞান অলিম্পিয়াড',
  'গণিত অলিম্পিয়াড',
  'পদার্থবিজ্ঞান অলিম্পিয়াড',
  'রসায়ন অলিম্পিয়াড',
  'জীববিজ্ঞান অলিম্পিয়াড',
  'রোবটিক্স ও প্রোগ্রামিং',
  'জ্যোতির্বিজ্ঞান ও মহাকাশ বিজ্ঞান',
  'বিজ্ঞান প্রজেক্ট প্রদর্শনী',
  'বিজ্ঞান দেয়ালিকা ও প্রকাশনা',
  'বিজ্ঞান কুইজ প্রতিযোগিতা'
];

const HOME_SPECIFIC_KEYWORDS: string[] = [
  'NGDC Science Club Overview',
  'NGDC Science Club Home',
  'New Govt Degree College Science Organization',
  'Best Science Club in Rajshahi',
  'Official Student Science Society NGDC',
  'NGDC Academic Co-Curricular Activities',
  'NGDC Specialized Science Wings',
  'NGDC 6 Activity Wings',
  'NGDC Research and Innovation Hub',
  'Science Olympiad Coaching Rajshahi',
  'NGDC Arduino and Python Workshop',
  'NGDC Stargazing Observation Camp',
  'NGDC Annual Science Festival',
  'NGDC College Science Department',
  'NGDC Student Innovation Platform',
  'NGDC Science Club Achievements',
  'NGDC Science Club Membership Info',
  'NGDC Science Club Rajshahi Bangladesh',
  'New Government Degree College Co-Curricular',
  'NGDC Science Wing Registration',
  'NGDC Olympiad Preparation',
  'NGDC Rubik Cube Speedcubing',
  'NGDC Scientific Publication',
  'NGDC Science Society Overview',
  'এনজিডিসি সায়েন্স ক্লাব পরিচিতি',
  'এনজিডিসি বিজ্ঞান ক্লাব মূল পাতা',
  'রাজশাহীর সেরা বিজ্ঞান ক্লাব',
  'নিউ গভঃ ডিগ্রি কলেজ বিজ্ঞান কার্যক্রম',
  'বিজ্ঞান গবেষণা ও উদ্ভাবন প্ল্যাটফর্ম',
  'অলিম্পিয়াড প্রশিক্ষণ ও মেন্টরশিপ',
  'একাদশ ও দ্বাদশ শ্রেণির বিজ্ঞান ক্লাব',
  'আন্তঃকলেজ বিজ্ঞান উৎসব রাজশাহী',
  'এনজিডিসি বিজ্ঞান বিভাগের সহশিক্ষা কার্যক্রম',
  'কলেজ বিজ্ঞান সংঘ রাজশাহী',
  'বিজ্ঞান মনস্ক শিক্ষার্থী সংগঠন',
  'এনজিডিসি স্টুডেন্ট কমিউনিটি',
  'বিজ্ঞান ও প্রযুক্তি চর্চা এনজিডিসি',
  'এনজিডিসি বার্ষিক বিজ্ঞান উৎসব',
  'নিউ গভর্নমেন্ট ডিগ্রি কলেজ সহশিক্ষা',
  'এনজিডিসি সায়েন্স ক্লাব ওভারভিউ'
];

const NOTICES_SPECIFIC_KEYWORDS: string[] = [
  'NGDC Notice Board',
  'NGDC Official Notice',
  'NGDCSC Notice Board',
  'NGDC Science Club Notices',
  'NGDC Circular PDF',
  'NGDC Academic Announcement',
  'New Govt Degree College Notice',
  'New Government Degree College Notice Board',
  'NGDC Science Club Event Notice',
  'NGDC Olympiad Notice',
  'NGDC Workshop Schedule',
  'NGDC Exam and Session Notice',
  'NGDC Admission and Club Notice',
  'NGDC Science Fest Notice',
  'NGDC Urgent Announcement',
  'NGDC Latest Updates',
  'NGDC Student Circulars',
  'NGDC PDF Notice Reader',
  'NGDC Science Club Circular Archive',
  'Rajshahi College Notice Board',
  'NGDC HSC 27 Notice',
  'NGDC HSC 28 Notice',
  'NGDC Meeting Announcement',
  'NGDC Competition Guidelines',
  'এনজিডিসি নোটিশ বোর্ড',
  'এনজিডিসি অফিশিয়াল নোটিশ',
  'নিউ গভঃ ডিগ্রি কলেজ নোটিশ',
  'নিউ গভর্নমেন্ট ডিগ্রি কলেজ নোটিশ বোর্ড',
  'এনজিডিসি সায়েন্স ক্লাব বিজ্ঞপ্তি',
  'বিজ্ঞান ক্লাব জরুরি নোটিশ',
  'অলিম্পিয়াড নোটিশ এনজিডিসি',
  'কর্মশালা ও সেমিনার বিজ্ঞপ্তি',
  'বিজ্ঞান মেলা ঘোষণা এনজিডিসি',
  'ক্লাব মিটিং নোটিশ',
  'পিডিএফ নোটিশ এনজিডিসি',
  'সর্বশেষ নোটিশ ও ঘোষণা',
  'কলেজ নোটিশ রাজশাহী',
  'একাদশ শ্রেণির নোটিশ এনজিডিসি',
  'দ্বাদশ শ্রেণির নোটিশ এনজিডিসি',
  'বিজ্ঞান ক্লাবের নিয়মিত আপডেট'
];

const COMMITTEE_SPECIFIC_KEYWORDS: string[] = [
  'NGDC Executive Committee',
  'NGDCSC Executive Committee',
  'NGDC Science Club Committee',
  'NGDC Science Club Leadership',
  'NGDC Science Club President',
  'Tamim Iqbal NGDC Science Club',
  'NGDC Science Club General Secretary',
  'NGDC Student Leadership Panel',
  'New Govt Degree College Club Leaders',
  'New Government Degree College Executive Panel',
  'NGDC Science Club Organizers',
  'NGDC Wing Coordinators',
  'NGDC Governing Body',
  'NGDC Executive Members Directory',
  'NGDC Office Bearers',
  'NGDC Science Club Administration',
  'NGDC Committee 2026',
  'NGDC Founding and Executive Members',
  'Rajshahi College Club Committee',
  'NGDC Vice President and Secretaries',
  'NGDC Technical and Publication Secretary',
  'NGDC Event Management Lead',
  'NGDC Olympiad Secretary',
  'NGDC Committee Contact',
  'এনজিডিসি কার্যনির্বাহী কমিটি',
  'এনজিডিসি সায়েন্স ক্লাব কমিটি',
  'এনজিডিসিএসসি নেতৃত্ব প্যানেল',
  'নিউ গভঃ ডিগ্রি কলেজ ক্লাব কমিটি',
  'এনজিডিসি সায়েন্স ক্লাব সভাপতি',
  'এনজিডিসি সায়েন্স ক্লাব সাধারণ সম্পাদক',
  'তামিম ইকবাল এনজিডিসি সায়েন্স ক্লাব',
  'ক্লাব পরিচালনা পর্ষদ',
  'কার্যনির্বাহী সদস্য তালিকা',
  'বিজ্ঞান ক্লাব সমন্বয়ক',
  'অফিস বেয়ারার এনজিডিসি',
  'রাজশাহী কলেজ সায়েন্স ক্লাব নেতৃবৃন্দ',
  'এনজিডিসি স্টুডেন্ট লিডারশিপ',
  'নিউ গভর্নমেন্ট ডিগ্রি কলেজ কমিটি',
  'ক্লাব অ্যাডমিনিস্ট্রেশন এনজিডিসি',
  'এনজিডিসি সায়েন্স ক্লাব কর্তৃপক্ষ'
];

const STATUS_SPECIFIC_KEYWORDS: string[] = [
  'NGDC Application Status',
  'NGDCSC Status Check',
  'NGDC Science Club Membership Verification',
  'Check NGDC Membership Status',
  'NGDC Confirmation Slip Download',
  'NGDCSC Membership ID Lookup',
  'NGDC QR Code Member Verification',
  'NGDC Official Confirmation Slip',
  'New Govt Degree College Membership Check',
  'NGDC Member Search by Phone',
  'NGDC Member Search by ID',
  'NGDC Approved Member Status',
  'NGDC Pending Application Check',
  'NGDC Student Membership Card',
  'NGDC Digital Confirmation Receipt',
  'Verify NGDC Club Member',
  'NGDC Serial Membership ID',
  'NGDC Enrollment Verification',
  'NGDC A4 PDF Confirmation Slip',
  'NGDC Science Club Member Status Portal',
  'NGDC Application Tracking',
  'NGDC Member Roll Verification',
  'NGDC Official Member Lookup',
  'NGDC Club Status Checker',
  'এনজিডিসি আবেদন অবস্থা যাচাই',
  'এনজিডিসি সদস্যপদ স্ট্যাটাস',
  'এনজিডিসি কনফার্মেশন স্লিপ',
  'মেম্বারশিপ আইডি যাচাই',
  'ফোন নম্বর দিয়ে স্ট্যাটাস চেক',
  'এনজিডিসি সায়েন্স ক্লাব অনুমোদন যাচাই',
  'কিউআর কোড মেম্বার ভেরিফিকেশন',
  'পিডিএফ স্লিপ ডাউনলোড এনজিডিসি',
  'নিউ গভঃ ডিগ্রি কলেজ সদস্য যাচাই',
  'আবেদন ট্র্যাকিং এনজিডিসি',
  'অফিশিয়াল মেম্বারশিপ স্লিপ',
  'এনজিডিসিএসসি ভেরিফিকেশন পোর্টাল',
  'সদস্য অনুমোদন তালিকা',
  'ডিজিটাল মেম্বারশিপ রসিদ',
  'সদস্য তথ্য অনুসন্ধান',
  'এনজিডিসি ক্লাব স্ট্যাটাস চেক'
];

const FORM_SPECIFIC_KEYWORDS: string[] = [
  'NGDC Membership Registration',
  'NGDC Science Club Registration Form',
  'NGDCSC Online Admission Form',
  'Join NGDC Science Club',
  'Apply for NGDC Science Club',
  'New Govt Degree College Club Registration',
  'New Government Degree College Science Form',
  'NGDC HSC 27 Club Registration',
  'NGDC HSC 28 Club Registration',
  'NGDC Student Enrollment Form',
  'NGDC Online Member Application',
  'Register for NGDC Science Wings',
  'NGDC Science Olympiad Sign Up',
  'NGDC Robotics Wing Application',
  'NGDC College Roll Registration',
  'NGDC Membership Criteria and Rules',
  'NGDC New Member Intake',
  'Rajshahi NGDC Club Application',
  'NGDC Student Recruitment Form',
  'NGDC Digital Registration Portal',
  'NGDC Science Club Joining Process',
  'NGDC Academic Group Selection',
  'NGDC Skills and Co-Curricular Form',
  'NGDC Official Admission Portal',
  'এনজিডিসি সদস্য নিবন্ধন',
  'এনজিডিসি সায়েন্স ক্লাব আবেদন ফর্ম',
  'অনলাইন সদস্য ভর্তি ফর্ম',
  'নিউ গভঃ ডিগ্রি কলেজ ক্লাব নিবন্ধন',
  'নতুন সদস্য আবেদন এনজিডিসি',
  'এইচএসসি ২৭ ক্লাব রেজিস্ট্রেশন',
  'এইচএসসি ২৮ ক্লাব রেজিস্ট্রেশন',
  'বিজ্ঞান ক্লাবে যোগদান ফর্ম',
  'এনজিডিসি বিজ্ঞান শাখা নির্বাচন',
  'কলেজ রোল দিয়ে নিবন্ধন',
  'ক্লাব নিয়মাবলি ও ঘোষণা',
  'অনলাইন অ্যাডমিশন পোর্টাল এনজিডিসি',
  'বিজ্ঞান ক্লাব সদস্যপদ আবেদন',
  'নিউ গভর্নমেন্ট ডিগ্রি কলেজ ভর্তি সহায়তা',
  'রাজশাহী বিজ্ঞান ক্লাব রেজিস্ট্রেশন',
  'এনজিডিসিএসসি মেম্বারশিপ ফর্ম'
];

const AUTH_DASHBOARD_KEYWORDS: string[] = [
  'NGDC Member Login',
  'NGDC Student Dashboard',
  'NGDCSC Member Portal Sign In',
  'NGDC Science Club Account Login',
  'New Govt Degree College Member Dashboard',
  'NGDC Attendance Record Portal',
  'NGDC Member Inbox Messaging',
  'NGDC Profile Management Portal',
  'NGDC Confirmation Slip Dashboard',
  'NGDC Password Reset and Recovery',
  'NGDC Push Notification Alerts',
  'NGDC Student Account Access',
  'NGDC Registered Member Sign In',
  'NGDC Club Attendance Tracking',
  'NGDC President Direct Inbox',
  'NGDC Member Verification Dashboard',
  'NGDC Personal Academic Profile',
  'NGDC Club Event Attendance History',
  'NGDC Member Digital ID Access',
  'NGDC Portal Authentication',
  'NGDC Science Club Sign Up Login',
  'NGDC Member Support Inbox',
  'NGDC Online Member Workspace',
  'NGDC Secure Member Portal',
  'এনজিডিসি মেম্বার লগইন',
  'এনজিডিসি স্টুডেন্ট ড্যাশবোর্ড',
  'সদস্য পোর্টাল সাইন ইন',
  'এনজিডিসি সায়েন্স ক্লাব অ্যাকাউন্ট',
  'উপস্থিতি ও অ্যাটেনডেন্স রেকর্ড',
  'মেম্বার ইনবক্স ও মেসেজিং',
  'প্রোফাইল এডিট ও আপডেট',
  'ড্যাশবোর্ড কনফার্মেশন স্লিপ',
  'পাসওয়ার্ড পরিবর্তন ও রিসেট',
  'নিউ গভঃ ডিগ্রি কলেজ মেম্বার লগইন',
  'প্রেসিডেন্ট ডাইরেক্ট ইনবক্স',
  'বিজ্ঞান ক্লাব মেম্বার ড্যাশবোর্ড',
  'ক্লাব ইভেন্ট উপস্থিতি তালিকা',
  'সদস্য অ্যাকাউন্ট নিরাপত্তা',
  'এনজিডিসিএসসি পোর্টাল অ্যাক্সেস',
  'ডিজিটাল মেম্বার ওয়ার্কস্পেস'
];

function dedupeKeywords(groups: string[][]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const group of groups) {
    for (const raw of group) {
      const clean = raw.trim();
      if (!clean) continue;
      const key = clean.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        out.push(clean);
      }
    }
  }
  return out;
}

export function buildRouteSeoMetadata(
  route: SeoRouteKey,
  activeNotice?: ClubNotice | null
): RouteSeoMetadata {
  switch (route) {
    case 'notices':
      return {
        title: 'Official Notice Board – NGDC SCIENCE CLUB | NGDCSC',
        description:
          'Read official notices, circulars, PDF announcements, Olympiad schedules, and workshop updates from NGDC SCIENCE CLUB (New Government Degree College, Rajshahi). এনজিডিসি সায়েন্স ক্লাবের অফিশিয়াল নোটিশ বোর্ড।',
        keywords: dedupeKeywords([
          NOTICES_SPECIFIC_KEYWORDS,
          CORE_BRAND_KEYWORDS,
          CORE_ACADEMIC_KEYWORDS
        ]),
        canonicalPath: '/notices',
        robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
        ogType: 'website',
        breadcrumbLabel: 'Notice Board'
      };

    case 'notice_detail': {
      const noticeTitle = activeNotice?.title?.trim() || 'Official Club Notice';
      const noticeCategory = activeNotice?.category || 'Notice';
      const noticeDate = activeNotice?.date ? ` (${activeNotice.date})` : '';
      const rawSnippet = (activeNotice?.content || '').replace(/\s+/g, ' ').trim();
      const snippet =
        rawSnippet.length > 135
          ? `${rawSnippet.slice(0, 132)}...`
          : rawSnippet ||
            `Official ${noticeCategory} announcement published by NGDC SCIENCE CLUB, New Government Degree College, Rajshahi.`;

      const dynamicKeywords = [
        noticeTitle,
        `${noticeTitle} NGDC`,
        `${noticeTitle} NGDC Science Club`,
        `${noticeTitle} NGDCSC`,
        `${noticeCategory} Notice NGDC`,
        ...(activeNotice?.date ? [`NGDC Notice ${activeNotice.date}`] : []),
        ...(activeNotice?.fileName ? [activeNotice.fileName, 'NGDC Notice PDF Document'] : [])
      ];

      return {
        title: `${noticeTitle} – NGDC SCIENCE CLUB`,
        description: `${noticeCategory}${noticeDate}: ${snippet} | NGDC SCIENCE CLUB (NGDCSC), New Government Degree College, Rajshahi.`,
        keywords: dedupeKeywords([
          dynamicKeywords,
          NOTICES_SPECIFIC_KEYWORDS,
          CORE_BRAND_KEYWORDS,
          CORE_ACADEMIC_KEYWORDS
        ]),
        canonicalPath: activeNotice?.id
          ? `/notices?id=${encodeURIComponent(activeNotice.id)}`
          : '/notices',
        robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
        ogType: 'article',
        breadcrumbLabel: noticeTitle
      };
    }

    case 'committee':
      return {
        title: 'Executive Committee – NGDC SCIENCE CLUB | NGDCSC',
        description:
          'Meet the official Executive Committee and student leadership of NGDC SCIENCE CLUB at New Government Degree College, Rajshahi. এনজিডিসি সায়েন্স ক্লাবের কার্যনির্বাহী কমিটি।',
        keywords: dedupeKeywords([
          COMMITTEE_SPECIFIC_KEYWORDS,
          CORE_BRAND_KEYWORDS,
          CORE_ACADEMIC_KEYWORDS
        ]),
        canonicalPath: '/committee',
        robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
        ogType: 'website',
        breadcrumbLabel: 'Executive Committee'
      };

    case 'status':
      return {
        title: 'Check Membership Status & Verification – NGDC SCIENCE CLUB',
        description:
          'Verify your NGDC SCIENCE CLUB (NGDCSC) application status, confirm membership ID, and access your official confirmation slip. নিউ গভঃ ডিগ্রি কলেজ সায়েন্স ক্লাব সদস্যপদ যাচাই।',
        keywords: dedupeKeywords([
          STATUS_SPECIFIC_KEYWORDS,
          CORE_BRAND_KEYWORDS,
          CORE_ACADEMIC_KEYWORDS
        ]),
        canonicalPath: '/status',
        robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
        ogType: 'website',
        breadcrumbLabel: 'Membership Status'
      };

    case 'form':
      return {
        title: 'Membership Registration Form – NGDC SCIENCE CLUB | NGDCSC',
        description:
          'Apply online for NGDC SCIENCE CLUB membership at New Government Degree College, Rajshahi (HSC 27 & HSC 28 Science). এনজিডিসি সায়েন্স ক্লাবে অনলাইন সদস্য নিবন্ধন।',
        keywords: dedupeKeywords([
          FORM_SPECIFIC_KEYWORDS,
          CORE_BRAND_KEYWORDS,
          CORE_ACADEMIC_KEYWORDS
        ]),
        canonicalPath: '/form',
        robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
        ogType: 'website',
        breadcrumbLabel: 'Membership Registration'
      };

    case 'login':
      return {
        title: 'Member Portal Sign In – NGDC SCIENCE CLUB | NGDCSC',
        description:
          'Sign in to your NGDC SCIENCE CLUB (NGDCSC) member account to view confirmation slips, attendance records, and club inbox. এনজিডিসি সায়েন্স ক্লাব মেম্বার লগইন।',
        keywords: dedupeKeywords([
          AUTH_DASHBOARD_KEYWORDS,
          CORE_BRAND_KEYWORDS,
          CORE_ACADEMIC_KEYWORDS
        ]),
        canonicalPath: '/login',
        robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
        ogType: 'website',
        breadcrumbLabel: 'Member Sign In'
      };

    case 'dashboard':
      return {
        title: 'Member Dashboard – NGDC SCIENCE CLUB | NGDCSC',
        description:
          'Manage your NGDC SCIENCE CLUB profile, attendance history, confirmation slip, and direct club inbox. এনজিডিসি সায়েন্স ক্লাব মেম্বার ড্যাশবোর্ড।',
        keywords: dedupeKeywords([
          AUTH_DASHBOARD_KEYWORDS,
          CORE_BRAND_KEYWORDS,
          CORE_ACADEMIC_KEYWORDS
        ]),
        canonicalPath: '/dashboard',
        robots: 'noindex, nofollow',
        ogType: 'website',
        breadcrumbLabel: 'Member Dashboard'
      };

    case 'slip':
      return {
        title: 'Confirmation Slip – NGDC SCIENCE CLUB | NGDCSC',
        description:
          'Official membership confirmation slip for approved members of NGDC SCIENCE CLUB, New Government Degree College, Rajshahi.',
        keywords: dedupeKeywords([
          STATUS_SPECIFIC_KEYWORDS,
          CORE_BRAND_KEYWORDS,
          CORE_ACADEMIC_KEYWORDS
        ]),
        canonicalPath: '/slip',
        robots: 'noindex, nofollow',
        ogType: 'website',
        breadcrumbLabel: 'Confirmation Slip'
      };

    case 'admin':
      return {
        title: 'Executive Admin Console – NGDC SCIENCE CLUB',
        description:
          'Authorized administration console for NGDC SCIENCE CLUB (New Government Degree College, Rajshahi).',
        keywords: dedupeKeywords([CORE_BRAND_KEYWORDS]),
        canonicalPath: '/admin',
        robots: 'noindex, nofollow',
        ogType: 'website',
        breadcrumbLabel: 'Admin Console'
      };

    case '404':
      return {
        title: 'Page Not Found – NGDC SCIENCE CLUB | NGDCSC',
        description:
          'The requested page could not be found on the NGDC SCIENCE CLUB official portal (New Government Degree College, Rajshahi).',
        keywords: dedupeKeywords([CORE_BRAND_KEYWORDS, CORE_ACADEMIC_KEYWORDS]),
        canonicalPath: '/',
        robots: 'noindex, follow',
        ogType: 'website',
        breadcrumbLabel: 'Not Found'
      };

    case 'home':
    default:
      return {
        title: 'NGDC SCIENCE CLUB – New Govt. Degree College, Rajshahi | NGDCSC',
        description:
          'Official website of NGDC SCIENCE CLUB (NGDCSC), New Government Degree College, Rajshahi. Explore notices, Science Olympiad wings, robotics, science fest, executive committee, and online membership registration.',
        keywords: dedupeKeywords([
          HOME_SPECIFIC_KEYWORDS,
          CORE_BRAND_KEYWORDS,
          CORE_ACADEMIC_KEYWORDS
        ]),
        canonicalPath: '/',
        robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
        ogType: 'website',
        breadcrumbLabel: 'Overview'
      };
  }
}

export function buildStructuredDataJsonLd(
  meta: RouteSeoMetadata,
  origin: string,
  route: SeoRouteKey,
  activeNotice?: ClubNotice | null
): Record<string, any> {
  const cleanOrigin = origin.replace(/\/+$/, '');
  const pageUrl = `${cleanOrigin}${meta.canonicalPath}`;
  const logoUrl = `${cleanOrigin}/assets/club-logo.png`;

  const graph: any[] = [
    {
      '@type': 'Organization',
      '@id': `${cleanOrigin}/#organization`,
      name: 'NGDC SCIENCE CLUB',
      alternateName: [
        'NGDCSC',
        'NGDC Science Club',
        'New Government Degree College Science Club',
        'New Govt. Degree College Science Club',
        'এনজিডিসি সায়েন্স ক্লাব',
        'এনজিডিসি বিজ্ঞান ক্লাব',
        'নিউ গভঃ ডিগ্রি কলেজ সায়েন্স ক্লাব'
      ],
      url: cleanOrigin,
      logo: {
        '@type': 'ImageObject',
        url: logoUrl
      },
      email: 'ngdcsc.org@gmail.com',
      sameAs: [
        'https://facebook.com/ngdcsc',
        'https://instagram.com/ngdcsc_'
      ],
      parentOrganization: {
        '@type': 'EducationalOrganization',
        name: 'New Government Degree College, Rajshahi',
        alternateName: [
          'NGDC',
          'New Govt. Degree College, Rajshahi',
          'নিউ গভঃ ডিগ্রি কলেজ, রাজশাহী',
          'নিউ গভর্নমেন্ট ডিগ্রি কলেজ, রাজশাহী'
        ],
        address: {
          '@type': 'PostalAddress',
          addressLocality: 'Rajshahi',
          addressRegion: 'Rajshahi Division',
          addressCountry: 'BD'
        }
      }
    },
    {
      '@type': 'WebSite',
      '@id': `${cleanOrigin}/#website`,
      url: cleanOrigin,
      name: 'NGDC SCIENCE CLUB',
      alternateName: ['NGDCSC', 'NGDC Science Club Portal'],
      inLanguage: ['en', 'bn'],
      publisher: { '@id': `${cleanOrigin}/#organization` }
    },
    {
      '@type': route === 'notices' ? 'CollectionPage' : 'WebPage',
      '@id': `${pageUrl}#webpage`,
      url: pageUrl,
      name: meta.title,
      description: meta.description,
      keywords: meta.keywords.join(', '),
      inLanguage: ['en', 'bn'],
      isPartOf: { '@id': `${cleanOrigin}/#website` },
      about: { '@id': `${cleanOrigin}/#organization` }
    }
  ];

  if (route !== 'home') {
    const items: any[] = [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'NGDC SCIENCE CLUB',
        item: `${cleanOrigin}/`
      }
    ];
    if (route === 'notice_detail') {
      items.push({
        '@type': 'ListItem',
        position: 2,
        name: 'Notice Board',
        item: `${cleanOrigin}/notices`
      });
      items.push({
        '@type': 'ListItem',
        position: 3,
        name: meta.breadcrumbLabel,
        item: pageUrl
      });
    } else {
      items.push({
        '@type': 'ListItem',
        position: 2,
        name: meta.breadcrumbLabel,
        item: pageUrl
      });
    }
    graph.push({
      '@type': 'BreadcrumbList',
      itemListElement: items
    });
  }

  if (route === 'notice_detail' && activeNotice) {
    graph.push({
      '@type': 'NewsArticle',
      headline: activeNotice.title,
      datePublished: activeNotice.date || activeNotice.createdAt || new Date().toISOString().split('T')[0],
      description: meta.description,
      articleSection: activeNotice.category || 'Notice',
      author: {
        '@type': 'Organization',
        name: activeNotice.publishedBy || 'NGDC SCIENCE CLUB'
      },
      publisher: { '@id': `${cleanOrigin}/#organization` },
      mainEntityOfPage: { '@id': `${pageUrl}#webpage` }
    });
  }

  return {
    '@context': 'https://schema.org',
    '@graph': graph
  };
}
