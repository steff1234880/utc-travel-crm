import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, X, Calendar as CalendarIcon } from 'lucide-react';
import api from '../../services/api';

interface AdminCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  packageId: string | null;
  packageTitle?: string;
}

interface PackageAvailability {
  id: string;
  startDate: string;
  endDate: string;
  isAvailable: boolean;
}

export default function AdminCalendarModal({ isOpen, onClose, packageId, packageTitle }: AdminCalendarModalProps) {
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());

  const { data: availabilitiesData, isLoading } = useQuery<{ data: PackageAvailability[] }>({
    queryKey: ['admin-package-availability', packageId],
    queryFn: async () => {
      const res = await api.get(`/packages/${packageId}/availability`);
      return res.data;
    },
    enabled: !!packageId && isOpen
  });

  const availabilities = availabilitiesData?.data || [];

  const toggleMutation = useMutation({
    mutationFn: async (dateStr: string) => {
      const res = await api.post(`/packages/${packageId}/availability/toggle`, { date: dateStr });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-package-availability', packageId] });
      // Also invalidate public calendar query just in case it is loaded
      queryClient.invalidateQueries({ queryKey: ['package-availability', packageId] });
    }
  });

  if (!isOpen || !packageId) return null;

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  // Calculate calendar grid
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const getStatusForDay = (day: number) => {
    const targetDateStr = new Date(Date.UTC(year, month, day)).toISOString().split('T')[0];
    
    // Find if there's an exact match or if this day falls inside an availability range
    const record = availabilities.find(a => {
      const start = a.startDate.split('T')[0];
      const end = a.endDate.split('T')[0];
      return targetDateStr >= start && targetDateStr <= end;
    });

    if (record) {
      return record.isAvailable ? 'available' : 'unavailable';
    }
    return 'none';
  };

  const handleDateClick = (day: number) => {
    // Generate YYYY-MM-DD
    const dateStr = new Date(Date.UTC(year, month, day)).toISOString().split('T')[0];
    toggleMutation.mutate(dateStr);
  };

  const renderGrid = () => {
    const grid = [];
    let currentDay = 1;
    
    // 6 rows to cover all month layouts
    for (let r = 0; r < 6; r++) {
      const row = [];
      for (let c = 0; c < 7; c++) {
        if (r === 0 && c < firstDayOfMonth) {
          row.push(null);
        } else if (currentDay > daysInMonth) {
          row.push(null);
        } else {
          row.push(currentDay);
          currentDay++;
        }
      }
      grid.push(row);
      if (currentDay > daysInMonth) break;
    }

    return grid.map((row, i) => (
      <div key={i} className="grid grid-cols-7 gap-2">
        {row.map((day, j) => {
          if (!day) return <div key={j} className="h-10 w-10"></div>;

          const status = getStatusForDay(day);
          
          let btnClass = "h-10 w-10 flex items-center justify-center rounded-full text-sm font-medium mx-auto transition-all ";
          
          if (status === 'unavailable') {
            btnClass += "border-2 border-red-500 text-red-700 bg-red-50 hover:bg-red-100";
          } else {
            btnClass += "text-slate-700 hover:bg-slate-100 border-2 border-transparent";
          }

          return (
            <div key={j} className="text-center">
              <button 
                onClick={() => handleDateClick(day)} 
                className={btnClass}
                disabled={toggleMutation.isPending}
                title={status === 'unavailable' ? 'Click to make Available' : 'Click to make Unavailable'}
              >
                {day}
              </button>
            </div>
          );
        })}
      </div>
    ));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-blue-600" />
              Manage Availability
            </h2>
            <p className="text-sm text-slate-500 mt-1 truncate max-w-[250px]">{packageTitle}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Calendar Body */}
        <div className="p-6 overflow-y-auto">
          {isLoading ? (
            <div className="text-center py-12 text-slate-500">Loading calendar data...</div>
          ) : (
            <>
              {/* Calendar Header */}
              <div className="flex justify-between items-center mb-6 bg-slate-50 rounded-xl p-2 border border-slate-100">
                <button onClick={handlePrevMonth} className="p-2 text-slate-500 hover:text-blue-600 hover:bg-white rounded-lg transition-colors">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="font-bold text-slate-900">
                  {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </div>
                <button onClick={handleNextMonth} className="p-2 text-slate-500 hover:text-blue-600 hover:bg-white rounded-lg transition-colors">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* Calendar Grid */}
              <div className="mb-6">
                <div className="grid grid-cols-7 gap-2 mb-2">
                  {daysOfWeek.map(day => (
                    <div key={day} className="text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
                      {day}
                    </div>
                  ))}
                </div>
                
                <div className="space-y-2">
                  {renderGrid()}
                </div>
              </div>

              {/* Instructions / Legend */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800">
                <p className="font-semibold mb-2">How to use:</p>
                <ul className="list-disc pl-5 space-y-1 text-blue-700">
                  <li>Click on any date to mark it as <strong className="text-red-600">Unavailable</strong> (red circle).</li>
                  <li>Click a red circled date to make it available again.</li>
                  <li>Changes are saved automatically.</li>
                </ul>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
