import React from 'react';
import { Clock, Activity, FileText, DollarSign, Plane, Users, PlusCircle, AlertCircle, CheckCircle } from 'lucide-react';

export interface TimelineEvent {
  id: string;
  type: 'AUDIT' | 'FOLLOWUP' | 'NOTIFICATION' | 'PAYMENT' | 'OPERATIONS' | string;
  title: string;
  description: string;
  timestamp: string;
  user?: string;
  metadata?: any;
}

interface TimelineProps {
  events: TimelineEvent[];
  loading?: boolean;
}

const getIcon = (type: string, title: string) => {
  const t = title.toLowerCase();
  if (t.includes('payment') || type === 'PAYMENT') return <DollarSign className="h-4 w-4" />;
  if (t.includes('tour') || type === 'OPERATIONS') return <Plane className="h-4 w-4" />;
  if (t.includes('lead') || t.includes('customer')) return <Users className="h-4 w-4" />;
  if (type === 'FOLLOWUP') return <Activity className="h-4 w-4" />;
  if (t.includes('created')) return <PlusCircle className="h-4 w-4" />;
  if (t.includes('completed') || t.includes('won')) return <CheckCircle className="h-4 w-4" />;
  if (t.includes('cancelled') || t.includes('lost')) return <AlertCircle className="h-4 w-4" />;
  return <FileText className="h-4 w-4" />;
};

const getColor = (type: string, title: string) => {
  const t = title.toLowerCase();
  if (t.includes('completed') || t.includes('won')) return 'bg-emerald-500/20 text-emerald-400 ring-emerald-500/30';
  if (t.includes('payment')) return 'bg-amber-500/20 text-amber-400 ring-amber-500/30';
  if (t.includes('cancelled') || t.includes('lost')) return 'bg-rose-500/20 text-rose-400 ring-rose-500/30';
  if (type === 'FOLLOWUP') return 'bg-blue-500/20 text-blue-400 ring-blue-500/30';
  return 'bg-slate-700 text-slate-300 ring-slate-600';
};

/**
 * Format a timestamp string for display.
 * Uses toLocaleString() for browser-local timezone rendering.
 */
const formatTimestamp = (timestamp: string): string => {
  if (!timestamp) return '—';
  return new Date(timestamp).toLocaleString();
};

export const Timeline: React.FC<TimelineProps> = ({ events, loading }) => {
  if (loading) {
    return <div className="animate-pulse space-y-4 py-4 text-slate-400">Loading timeline...</div>;
  }

  if (!events || events.length === 0) {
    return <div className="py-8 text-center text-slate-500 italic">No activity recorded yet.</div>;
  }

  return (
    <div className="flow-root">
      <ul className="-mb-8">
        {events.map((event, eventIdx) => (
          <li key={event.id}>
            <div className="relative pb-8">
              {eventIdx !== events.length - 1 ? (
                <span className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-slate-700/50" aria-hidden="true" />
              ) : null}
              <div className="relative flex space-x-3">
                <div>
                  <span
                    className={`h-8 w-8 rounded-full flex items-center justify-center ring-4 ${getColor(event.type, event.title)}`}
                  >
                    {getIcon(event.type, event.title)}
                  </span>
                </div>
                <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                  <div>
                    <p className="text-sm text-white font-medium">
                      {event.title}
                    </p>
                    <p className="text-sm text-slate-400 mt-1">{event.description}</p>
                    {event.user && (
                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                        <Users className="h-3 w-3" /> {event.user}
                      </p>
                    )}
                  </div>
                  <div className="whitespace-nowrap text-right text-xs text-slate-500 flex flex-col items-end gap-1">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {/* For FOLLOWUP events, timestamp IS scheduledFor (the saved follow-up date) */}
                      {formatTimestamp(event.timestamp)}
                    </span>
                    {/* Show record creation date as secondary info for FOLLOWUP events */}
                    {event.type === 'FOLLOWUP' && event.metadata?.createdAt && (
                      <span className="text-[10px] text-slate-600">
                        Added: {formatTimestamp(event.metadata.createdAt)}
                      </span>
                    )}
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300">
                      {event.type}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

