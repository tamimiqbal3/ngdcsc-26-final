import React from 'react';
import { 
  BarChart3, 
  Users, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Sparkles, 
  TrendingUp, 
  Layers, 
  Compass, 
  ArrowUpRight,
  ShieldCheck,
  Award
} from 'lucide-react';
import { SubmissionRecord } from './types';

interface AdminDashboardViewProps {
  members: SubmissionRecord[];
  onSelectMember: (member: SubmissionRecord) => void;
  onGoToMembersTab: () => void;
}

export default function AdminDashboardView({
  members,
  onSelectMember,
  onGoToMembersTab
}: AdminDashboardViewProps) {
  const total = members.length;
  const approvedCount = members.filter(m => m.status === 'approved').length;
  const pendingCount = members.filter(m => m.status === 'pending').length;
  const rejectedCount = members.filter(m => m.status === 'rejected').length;

  const approvedPercent = total > 0 ? Math.round((approvedCount / total) * 100) : 0;
  const pendingPercent = total > 0 ? Math.round((pendingCount / total) * 100) : 0;
  const rejectedPercent = total > 0 ? Math.round((rejectedCount / total) * 100) : 0;

  // Batch Breakdown
  const hsc27Count = members.filter(m => (m.batch || '').includes('27')).length;
  const hsc28Count = members.filter(m => (m.batch || '').includes('28')).length;
  const otherBatchCount = total - (hsc27Count + hsc28Count);

  const hsc27Percent = total > 0 ? Math.round((hsc27Count / total) * 100) : 0;
  const hsc28Percent = total > 0 ? Math.round((hsc28Count / total) * 100) : 0;

  // Section Breakdown
  const sections = ['A', 'B', 'C', 'D', 'E', 'F'];
  const sectionCounts = sections.map(sec => ({
    section: sec,
    count: members.filter(m => (m.section || '').toUpperCase() === sec).length
  }));
  const maxSectionCount = Math.max(...sectionCounts.map(s => s.count), 1);

  // Segment Breakdown
  const standardSegments = [
    { key: 'Olympiad', label: 'Science Olympiad', color: 'bg-emerald-500', barColor: 'from-emerald-500 to-teal-400' },
    { key: 'Project', label: 'Science Project & Innovation', color: 'bg-blue-500', barColor: 'from-blue-500 to-cyan-400' },
    { key: 'Robotics', label: 'Robotics & Programming', color: 'bg-purple-500', barColor: 'from-purple-500 to-indigo-400' },
    { key: 'Astronomy', label: 'Astronomy & Space Science', color: 'bg-amber-500', barColor: 'from-amber-500 to-orange-400' },
    { key: 'Quiz', label: 'Science Quizzing', color: 'bg-rose-500', barColor: 'from-rose-500 to-pink-400' },
    { key: 'Wall Magazine', label: 'Wall Magazine & Publication', color: 'bg-teal-500', barColor: 'from-teal-500 to-emerald-400' }
  ];

  const segmentStats = standardSegments.map(seg => {
    const count = members.filter(m => 
      (m.interestedSegments || []).some(s => s.toLowerCase().includes(seg.key.toLowerCase()))
    ).length;
    const percent = total > 0 ? Math.round((count / total) * 100) : 0;
    return {
      ...seg,
      count,
      percent
    };
  }).sort((a, b) => b.count - a.count);

  const maxSegmentCount = Math.max(...segmentStats.map(s => s.count), 1);

  // Recent 6 Submissions
  const recentMembers = [...members].slice(0, 6);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Dashboard Top Banner */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <TrendingUp className="w-5 h-5" />
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Club Analytics &amp; Visual Dashboard
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
            Real-time visual distribution of registrations, segments, batches, and verification status.
          </p>
        </div>

        <button
          type="button"
          onClick={onGoToMembersTab}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer shrink-0"
        >
          <Users className="w-4 h-4" />
          <span>Manage Members</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 4 Key Stat Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Registrations */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Registrations</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">{total}</p>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Live from Database</span>
          </div>
        </div>

        {/* Approved Members */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Approved Members</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-emerald-600 mt-2">{approvedCount}</p>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
            <span className="font-bold text-emerald-600">{approvedPercent}%</span>
            <span>of total applications</span>
          </div>
        </div>

        {/* Pending Review */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Pending Review</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-amber-600 mt-2">{pendingCount}</p>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
            <span className="font-bold text-amber-600">{pendingPercent}%</span>
            <span>awaiting decision</span>
          </div>
        </div>

        {/* Rejected / Other */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">Rejected</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-rose-600 mt-2">{rejectedCount}</p>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
            <span className="font-bold text-rose-600">{rejectedPercent}%</span>
            <span>rejected records</span>
          </div>
        </div>
      </div>

      {/* Main Graphs Grid: Segments Distribution & Batch Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Segments Popularity Graph (Spans 2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-600" />
                <span>Club Segments Interest Graph</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Distribution of member interests across scientific domains
              </p>
            </div>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
              {total} Total Responses
            </span>
          </div>

          {/* Visual Bars for Each Segment */}
          <div className="space-y-4">
            {segmentStats.map((seg) => {
              const relativeWidth = Math.max(Math.round((seg.count / maxSegmentCount) * 100), seg.count > 0 ? 6 : 0);
              return (
                <div key={seg.label} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${seg.color}`}></span>
                      <span>{seg.label}</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-extrabold text-slate-900">{seg.count}</span>
                      <span className="text-slate-400 font-semibold text-[11px]">({seg.percent}%)</span>
                    </div>
                  </div>

                  {/* Progress Bar Container */}
                  <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden">
                    <div 
                      className={`h-full rounded-full bg-gradient-to-r ${seg.barColor} transition-all duration-700 ease-out`}
                      style={{ width: `${relativeWidth}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>* Members can choose multiple scientific segments</span>
            <span className="font-bold text-emerald-700">Top: {segmentStats[0]?.label || 'None'}</span>
          </div>
        </div>

        {/* Right Column: Batch Split (HSC 27 vs 28) & Verification Status */}
        <div className="space-y-6">
          {/* Batch Breakdown Card */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600" />
                <span>Batch Distribution</span>
              </h3>
              <span className="text-xs font-bold text-slate-500">HSC 27 vs 28</span>
            </div>

            {/* Split Visual Progress */}
            <div className="w-full h-4 rounded-full bg-slate-100 overflow-hidden flex">
              <div 
                style={{ width: `${hsc27Percent}%` }}
                className="h-full bg-emerald-500 transition-all duration-500"
                title={`HSC 27: ${hsc27Count} (${hsc27Percent}%)`}
              />
              <div 
                style={{ width: `${hsc28Percent}%` }}
                className="h-full bg-blue-500 transition-all duration-500"
                title={`HSC 28: ${hsc28Count} (${hsc28Percent}%)`}
              />
              {otherBatchCount > 0 && (
                <div 
                  style={{ width: `${100 - (hsc27Percent + hsc28Percent)}%` }}
                  className="h-full bg-slate-400 transition-all duration-500"
                  title={`Other: ${otherBatchCount}`}
                />
              )}
            </div>

            {/* Batch Metrics List */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                  <span className="font-extrabold text-xs text-slate-800">HSC 27 (2nd Year)</span>
                </div>
                <div className="text-right">
                  <span className="font-black text-xs text-slate-900">{hsc27Count}</span>
                  <span className="text-[11px] text-slate-500 ml-1">({hsc27Percent}%)</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                  <span className="font-extrabold text-xs text-slate-800">HSC 28 (1st Year)</span>
                </div>
                <div className="text-right">
                  <span className="font-black text-xs text-slate-900">{hsc28Count}</span>
                  <span className="text-[11px] text-slate-500 ml-1">({hsc28Percent}%)</span>
                </div>
              </div>

              {otherBatchCount > 0 && (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-slate-400"></span>
                    <span className="font-extrabold text-xs text-slate-800">Other / Alumni</span>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-xs text-slate-900">{otherBatchCount}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Status Breakdown Bar Card */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Membership Approval Ratio</span>
            </h3>

            {/* Split Visual Progress */}
            <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden flex">
              <div style={{ width: `${approvedPercent}%` }} className="h-full bg-emerald-500" />
              <div style={{ width: `${pendingPercent}%` }} className="h-full bg-amber-400" />
              <div style={{ width: `${rejectedPercent}%` }} className="h-full bg-rose-400" />
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-100">
                <span className="text-[10px] uppercase font-bold text-emerald-700 block">Approved</span>
                <span className="font-black text-emerald-800 text-sm">{approvedCount}</span>
              </div>
              <div className="p-2 rounded-xl bg-amber-50 border border-amber-100">
                <span className="text-[10px] uppercase font-bold text-amber-700 block">Pending</span>
                <span className="font-black text-amber-800 text-sm">{pendingCount}</span>
              </div>
              <div className="p-2 rounded-xl bg-rose-50 border border-rose-100">
                <span className="text-[10px] uppercase font-bold text-rose-700 block">Rejected</span>
                <span className="font-black text-rose-800 text-sm">{rejectedCount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Grid: College Section Breakdown & Recent Submissions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Section Breakdown (Columns/Bars) */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Compass className="w-4 h-4 text-indigo-600" />
              <span>Section Breakdown (A - F)</span>
            </h3>
            <span className="text-xs text-slate-400 font-medium">Class Sections</span>
          </div>

          <div className="grid grid-cols-6 gap-2 pt-4 items-end h-44 pb-2 border-b border-slate-100">
            {sectionCounts.map(item => {
              const heightPercent = maxSectionCount > 0 
                ? Math.max(Math.round((item.count / maxSectionCount) * 100), 10) 
                : 10;
              return (
                <div key={item.section} className="flex flex-col items-center gap-1.5 h-full justify-end">
                  <span className="text-[11px] font-black text-slate-800 font-mono">
                    {item.count}
                  </span>
                  <div 
                    style={{ height: `${heightPercent}%` }}
                    className="w-full max-w-[32px] rounded-t-lg bg-gradient-to-t from-indigo-600 to-indigo-400 hover:from-indigo-500 hover:to-indigo-300 transition-all cursor-pointer shadow-2xs"
                    title={`Section ${item.section}: ${item.count} students`}
                  />
                  <span className="text-xs font-black text-slate-700">
                    {item.section}
                  </span>
                </div>
              );
            })}
          </div>

          <p className="text-[11px] text-slate-500 text-center">
            Distribution of students across science college sections.
          </p>
        </div>

        {/* Recent Registrations Table (Spans 2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600" />
                <span>Recent Submissions</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Latest registrations received</p>
            </div>
            <button
              type="button"
              onClick={onGoToMembersTab}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
            >
              View All ({members.length}) →
            </button>
          </div>

          {recentMembers.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              No submissions registered yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentMembers.map(member => (
                <div 
                  key={member.id || member.studentId}
                  onClick={() => onSelectMember(member)}
                  className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50 rounded-xl px-2 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                      {member.photo ? (
                        <img src={member.photo} alt={member.name} className="w-full h-full object-cover" />
                      ) : (
                        <Users className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{member.name}</p>
                      <p className="text-[11px] text-slate-500 truncate">
                        Roll: {member.studentId || 'N/A'} • {member.batch || 'HSC'} • Sec {member.section || 'A'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                      member.status === 'approved'
                        ? 'bg-emerald-100 text-emerald-800'
                        : member.status === 'rejected'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {member.status || 'pending'}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
                      {member.submittedAt?.split(',')[0] || ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
