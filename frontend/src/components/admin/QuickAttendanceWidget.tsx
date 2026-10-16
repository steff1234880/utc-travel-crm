import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { 
  Clock, 
  LogIn, 
  LogOut, 
  CheckCircle2, 
  ArrowRight,
  AlertCircle,
  Loader2
} from 'lucide-react';
import api from '../../services/api';

interface QuickAttendanceWidgetProps {
  variant?: 'banner' | 'card' | 'compact';
  className?: string;
}

export default function QuickAttendanceWidget({
  variant = 'card',
  className = ''
}: QuickAttendanceWidgetProps) {
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: todayData, isLoading, isError } = useQuery({
    queryKey: ['attendance-today'],
    queryFn: async () => {
      const res = await api.get('/hr/attendance/today');
      return res.data?.data;
    },
    staleTime: 30000,
  });

  const checkInMutation = useMutation({
    mutationFn: async () => {
      setActionError(null);
      const res = await api.post('/hr/attendance/check-in', {});
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-today'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-all'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-my-history'] });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || 'Failed to check in';
      setActionError(msg);
    }
  });

  const checkOutMutation = useMutation({
    mutationFn: async () => {
      setActionError(null);
      const res = await api.post('/hr/attendance/check-out', {});
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-today'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-all'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-my-history'] });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || 'Failed to check out';
      setActionError(msg);
    }
  });

  const record = todayData?.record;
  const isCheckedIn = Boolean(record?.checkInTime);
  const isCheckedOut = Boolean(record?.checkOutTime);

  const formatTime = (isoString?: string) => {
    if (!isoString) return '--:--';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '--:--';
    }
  };

  if (isLoading) {
    if (variant === 'compact') {
      return (
        <div className={`flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-xl text-xs text-slate-400 ${className}`}>
          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#8b182b]" />
          <span>Attendance...</span>
        </div>
      );
    }
    return (
      <div className={`p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between animate-pulse ${className}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100" />
          <div className="space-y-1.5">
            <div className="w-28 h-3.5 bg-slate-100 rounded" />
            <div className="w-40 h-2.5 bg-slate-100 rounded" />
          </div>
        </div>
        <div className="w-24 h-9 bg-slate-100 rounded-xl" />
      </div>
    );
  }

  // ----------------------------------------------------
  // COMPACT PILL VARIANT (For desk top bar & workspace headers)
  // ----------------------------------------------------
  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {actionError && (
          <span 
            title={actionError} 
            className="text-[11px] text-rose-600 bg-rose-50 border border-rose-200 px-2 py-1 rounded-lg truncate max-w-[180px]"
          >
            {actionError}
          </span>
        )}

        {!isCheckedIn ? (
          <button
            onClick={() => checkInMutation.mutate()}
            disabled={checkInMutation.isPending}
            title="Start your workday: Check In"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-xs transition-all disabled:opacity-50"
          >
            {checkInMutation.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <LogIn className="w-3.5 h-3.5" />
            )}
            <span>Check In</span>
          </button>
        ) : !isCheckedOut ? (
          <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200/80 px-2.5 py-1 rounded-xl shadow-2xs">
            <span className="text-[11px] font-bold text-amber-900 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              In: {formatTime(record.checkInTime)}
            </span>
            <button
              onClick={() => checkOutMutation.mutate()}
              disabled={checkOutMutation.isPending}
              title="Finish your workday: Check Out"
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-extrabold text-[11px] rounded-lg shadow-xs transition-all disabled:opacity-50"
            >
              {checkOutMutation.isPending ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <LogOut className="w-3 h-3" />
              )}
              <span>Check Out</span>
            </button>
          </div>
        ) : (
          <Link
            to="/admin/attendance"
            title={`Checked In: ${formatTime(record.checkInTime)} • Checked Out: ${formatTime(record.checkOutTime)} • Worked: ${record.workingHours || 0}h`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Out: {formatTime(record.checkOutTime)} ({record.workingHours || 0}h)</span>
          </Link>
        )}
      </div>
    );
  }

  // ----------------------------------------------------
  // CARD / BANNER VARIANT (For employee dashboards)
  // ----------------------------------------------------
  return (
    <div className={`bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 transition-all ${className}`}>
      {actionError && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-semibold">{actionError}</span>
          </div>
          <button 
            onClick={() => setActionError(null)} 
            className="text-rose-500 hover:text-rose-800 text-xs font-bold ml-2"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left Status Area */}
        <div className="flex items-center gap-3.5">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs ${
            !isCheckedIn 
              ? 'bg-slate-100 text-slate-500' 
              : !isCheckedOut 
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
          }`}>
            <Clock className="w-6 h-6" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Daily Work Attendance
              </span>
              {isCheckedIn && !isCheckedOut && (
                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  Active Shift
                </span>
              )}
              {isCheckedOut && (
                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3 text-blue-600" />
                  Completed
                </span>
              )}
            </div>

            <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight mt-0.5">
              {!isCheckedIn ? (
                'You have not checked in today'
              ) : !isCheckedOut ? (
                <span className="text-slate-900">
                  Checked in at <span className="text-[#8b182b] font-mono font-bold">{formatTime(record.checkInTime)}</span>
                </span>
              ) : (
                <span className="text-slate-900">
                  Shift Completed • <span className="text-emerald-700 font-mono font-bold">{record.workingHours || 0} Hours</span> logged
                </span>
              )}
            </h3>

            {/* Timestamps Row */}
            <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
              {isCheckedIn && (
                <span className="font-medium">
                  Check-in: <strong className="text-slate-700 font-mono">{formatTime(record.checkInTime)}</strong>
                </span>
              )}
              {isCheckedOut && (
                <>
                  <span className="text-slate-300">•</span>
                  <span className="font-medium">
                    Check-out: <strong className="text-slate-700 font-mono">{formatTime(record.checkOutTime)}</strong>
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="font-medium">
                    Total: <strong className="text-emerald-700 font-mono">{record.workingHours || 0}h</strong>
                  </span>
                </>
              )}
              {!isCheckedIn && (
                <span>Standard shift starts 09:30 AM. Arrivals after 09:30 AM are logged as Late.</span>
              )}
            </div>
          </div>
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center gap-2.5 sm:self-center self-start flex-wrap">
          {!isCheckedIn ? (
            <button
              onClick={() => checkInMutation.mutate()}
              disabled={checkInMutation.isPending}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-xs hover:shadow-md transition-all disabled:opacity-50"
            >
              {checkInMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <LogIn className="w-4 h-4" />
              )}
              <span>{checkInMutation.isPending ? 'Checking In...' : 'Check In Now'}</span>
            </button>
          ) : !isCheckedOut ? (
            <button
              onClick={() => checkOutMutation.mutate()}
              disabled={checkOutMutation.isPending}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-extrabold text-xs sm:text-sm flex items-center gap-2 shadow-xs hover:shadow-md transition-all disabled:opacity-50"
            >
              {checkOutMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <LogOut className="w-4 h-4" />
              )}
              <span>{checkOutMutation.isPending ? 'Checking Out...' : 'Check Out Now'}</span>
            </button>
          ) : (
            <div className="px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Attendance Recorded</span>
            </div>
          )}

          <Link
            to="/admin/attendance"
            className="px-3.5 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-700 hover:text-[#8b182b] font-semibold text-xs flex items-center gap-1 transition-colors"
          >
            <span>History</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
