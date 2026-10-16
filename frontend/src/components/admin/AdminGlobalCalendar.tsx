import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import api from '../../services/api';

interface GlobalAvailability {
  id: string;
  date: string;
  isAvailable: boolean;
}

export default function AdminGlobalCalendar() {
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());

  const { data: availabilitiesData, isLoading } = useQuery<{ data: GlobalAvailability[] }>({
    queryKey: ['admin-global-calendar'],
    queryFn: async () => {
      const res = await api.get('/dashboard/calendar');
      return res.data;
    }
  });

  const availabilities = availabilitiesData?.data || [];

  const toggleMutation = useMutation({
    mutationFn: async (dateStr: string) => {
      const res = await api.post(`/dashboard/calendar/toggle`, { date: dateStr });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-global-calendar'] });
      queryClient.invalidateQueries({ queryKey: ['global-calendar'] }); // Invalidate public
    }
  });

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const getStatusForDay = (day: number) => {
    const targetDateStr = new Date(Date.UTC(year, month, day)).toISOString().split('T')[0];
    const record = availabilities.find(a => a.date.split('T')[0] === targetDateStr);

    if (record && !record.isAvailable) {
      return 'unavailable';
    }
    return 'available';
  };

  const handleDateClick = (day: number) => {
    const dateStr = new Date(Date.UTC(year, month, day)).toISOString().split('T')[0];
    toggleMutation.mutate(dateStr);
  };

  const renderGrid = () => {
    const grid = [];
    let currentDay = 1;

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
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-blue-600" />
            Global Availability
          </h2>
          <p className="text-sm text-slate-500 mt-1">Manage global block-out dates</p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-slate-500 animate-pulse">Loading calendar...</div>
      ) : (
        <>
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

          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-xs text-blue-800">
            Click on any date to toggle its global availability status. Red circles mark the date as unavailable globally across all packages on the Home Page.
          </div>
        </>
      )}
    </div>
  );
}
