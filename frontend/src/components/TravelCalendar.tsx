import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

export interface PackageAvailability {
  id: string;
  startDate: string;
  endDate: string;
  isAvailable: boolean;
}

interface TravelCalendarProps {
  availabilities: PackageAvailability[];
  onSelectDate: (availability: PackageAvailability | null) => void;
}

export default function TravelCalendar({ availabilities, onSelectDate }: TravelCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const getStatusForDay = (day: number) => {
    const targetDateStr = new Date(Date.UTC(year, month, day)).toISOString().split('T')[0];
    
    const record = availabilities.find(a => {
      const start = a.startDate.split('T')[0];
      const end = a.endDate.split('T')[0];
      return targetDateStr >= start && targetDateStr <= end;
    });

    if (record && !record.isAvailable) return 'unavailable';
    return 'available';
  };

  const handleSelect = (day: number) => {
    const status = getStatusForDay(day);
    if (status === 'unavailable') return;
    
    const targetDateStr = new Date(Date.UTC(year, month, day)).toISOString().split('T')[0];
    const record = availabilities.find(a => {
      const start = a.startDate.split('T')[0];
      const end = a.endDate.split('T')[0];
      return targetDateStr >= start && targetDateStr <= end;
    });
    
    if (record) {
      onSelectDate(record);
    } else {
      onSelectDate({
        id: 'custom-' + targetDateStr,
        startDate: new Date(year, month, day).toISOString(),
        endDate: new Date(year, month, day).toISOString(),
        isAvailable: true
      });
    }
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
      <div key={i} className="grid grid-cols-7 gap-1">
        {row.map((day, j) => {
          if (!day) return <div key={j} className="h-8 w-8 sm:h-9 sm:w-9"></div>;

          const status = getStatusForDay(day);
          let circleClass = "h-8 w-8 sm:h-9 sm:w-9 flex items-center justify-center rounded-xl text-xs font-semibold mx-auto cursor-pointer transition-all duration-200 ";
          
          if (status === 'unavailable') {
            circleClass += "bg-rose-50 text-rose-400 border border-rose-200 cursor-not-allowed line-through";
          } else {
            circleClass += "border border-blue-200 text-blue-900 hover:bg-blue-50 font-semibold";
          }

          return (
            <div key={j} className="text-center">
              <button 
                onClick={() => handleSelect(day)} 
                className={circleClass} 
                disabled={status === 'unavailable'}
                title={status === 'unavailable' ? 'Date Blocked' : 'Click to select date'}
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
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/90">
      <div className="text-center mb-5">
        <h3 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center justify-center gap-2 mb-1">
          <CalendarIcon className="w-4 h-4 text-blue-600" />
          CHOOSE YOUR DATE
        </h3>
        <p className="text-xs text-slate-500 font-medium">Select your preferred travel date</p>
      </div>

      {/* Calendar Header */}
      <div className="flex justify-between items-center mb-4 bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
        <button onClick={handlePrevMonth} className="p-1 hover:bg-white rounded-lg text-slate-500 transition-colors shadow-sm">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="font-black text-slate-900 text-xs uppercase tracking-wide">
          {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </div>
        <button onClick={handleNextMonth} className="p-1 hover:bg-white rounded-lg text-slate-500 transition-colors shadow-sm">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="mb-5">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {daysOfWeek.map(day => (
            <div key={day} className="text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {day.substring(0, 2)}
            </div>
          ))}
        </div>
        
        <div className="space-y-1">
          {renderGrid()}
        </div>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-4 text-xs font-semibold text-slate-600 pt-3 border-t border-slate-100">
        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-blue-600 rounded-full"></div> Available</div>
        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-rose-300 rounded-full"></div> Blocked</div>
      </div>
    </div>
  );
}


