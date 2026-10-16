import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  MapPin,
  Clock,
  Users,
  AlertCircle,
  CheckCircle2,
  Tag,
  ArrowRight,
  Sparkles,
  UserCheck,
  ShieldCheck
} from 'lucide-react';
import api from '../services/api';
import EnquiryModal from './EnquiryModal';
import JoinGroupTourModal from './JoinGroupTourModal';
import { groupTourService, GroupTourCalendarItem } from '../services/groupTourService';

interface GlobalAvailability {
  id: string;
  date: string;
  isAvailable: boolean;
}

interface TravelPackage {
  id: string;
  title: string;
  slug: string;
  durationDays: number;
  durationNights: number;
  basePrice: number;
  currency: string;
  destination: { name: string };
  images: { url: string }[];
}

interface GlobalTravelCalendarProps {
  preselectedPackage?: { id: string; title: string };
}

export default function GlobalTravelCalendar({ preselectedPackage }: GlobalTravelCalendarProps = {}) {
  const [bookingMode, setBookingMode] = useState<'GROUP' | 'CUSTOM'>('GROUP');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);
  const [customEndDateStr, setCustomEndDateStr] = useState<string | null>(null);
  const [selectedGroupTour, setSelectedGroupTour] = useState<GroupTourCalendarItem | null>(null);
  
  // Custom Trip form state
  const [travellerCount, setTravellerCount] = useState<number>(2);

  // Modals
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isEnquiryModalOpen, setIsEnquiryModalOpen] = useState(false);
  const [selectedPackageForEnquiry, setSelectedPackageForEnquiry] = useState<{ id?: string; title?: string }>(
    preselectedPackage ? { id: preselectedPackage.id, title: preselectedPackage.title } : {}
  );

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1; // 1-indexed for API

  // Fetch Global Unavailabilities (admin blocked dates)
  const { data: availabilitiesData } = useQuery<{ data: GlobalAvailability[] }>({
    queryKey: ['global-calendar', year, month],
    queryFn: async () => {
      const res = await api.get('/dashboard/calendar');
      return res.data;
    },
  });

  // Fetch Group Tours Calendar Data
  const { data: groupToursData, refetch: refetchGroupTours } = useQuery<{ data: GroupTourCalendarItem[] }>({
    queryKey: ['group-tours-calendar', year, month],
    queryFn: async () => {
      const data = await groupTourService.getCalendarGroupTours(month, year);
      return { data };
    },
  });

  // Fetch Standard Packages for selected date range fallback
  const { data: tripsData, isLoading: isLoadingTrips } = useQuery<{ data: TravelPackage[] }>({
    queryKey: ['available-trips', selectedDateStr],
    queryFn: async () => {
      if (!selectedDateStr) return { data: [] };
      const res = await api.get(`/dashboard/calendar/trips?startDate=${selectedDateStr}`);
      return res.data;
    },
    enabled: !!selectedDateStr && bookingMode === 'CUSTOM',
  });

  const availabilities = availabilitiesData?.data || [];
  const groupTours = groupToursData?.data || [];
  const availableTrips = tripsData?.data || [];

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 2, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month, 1));

  /**
   * Helper: Find Group Tour for a specific day date
   */
  const getGroupTourForDay = (day: number): GroupTourCalendarItem | undefined => {
    const targetDateStr = new Date(Date.UTC(year, month - 1, day)).toISOString().split('T')[0];
    return groupTours.find((gt) => {
      const gtStart = gt.startDate.split('T')[0];
      const gtEnd = gt.endDate.split('T')[0];
      return targetDateStr >= gtStart && targetDateStr <= gtEnd;
    });
  };

  /**
   * Helper: Check if day is globally marked unavailable by admin
   */
  const isDayUnavailable = (day: number): boolean => {
    const targetDateStr = new Date(Date.UTC(year, month - 1, day)).toISOString().split('T')[0];
    const record = availabilities.find((a) => a.date.split('T')[0] === targetDateStr);
    return !!record && !record.isAvailable;
  };

  const handleDateClick = (day: number) => {
    const targetDateStr = new Date(Date.UTC(year, month - 1, day)).toISOString().split('T')[0];
    
    if (bookingMode === 'GROUP') {
      const gt = getGroupTourForDay(day);
      setSelectedDateStr(targetDateStr);
      setCustomEndDateStr(null);
      if (gt) {
        setSelectedGroupTour(gt);
      } else {
        setSelectedGroupTour(null);
      }
    } else {
      // CUSTOM mode logic
      if (!selectedDateStr || (selectedDateStr && customEndDateStr)) {
        // Start new range
        setSelectedDateStr(targetDateStr);
        setCustomEndDateStr(null);
      } else {
        // We have start date but no end date
        const startDate = new Date(selectedDateStr);
        const endDate = new Date(targetDateStr);
        
        if (endDate < startDate) {
          // If they click a date before start, make it the new start
          setSelectedDateStr(targetDateStr);
          setCustomEndDateStr(null);
        } else {
          // Check if range contains unavailable dates
          let hasUnavailable = false;
          let current = new Date(startDate);
          while (current <= endDate) {
            const currentStr = current.toISOString().split('T')[0];
            const record = availabilities.find((a) => a.date.split('T')[0] === currentStr);
            if (record && !record.isAvailable) {
              hasUnavailable = true;
              break;
            }
            current.setDate(current.getDate() + 1);
          }
          
          if (hasUnavailable) {
            // A range containing an unavailable date must not be selectable
            setSelectedDateStr(targetDateStr);
            setCustomEndDateStr(null);
          } else {
            setCustomEndDateStr(targetDateStr);
          }
        }
      }
      setSelectedGroupTour(null);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Open':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'Almost Full':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'Full':
        return 'bg-rose-50 text-rose-800 border-rose-200';
      case 'Completed':
        return 'bg-stone-100 text-stone-700 border-stone-200';
      case 'Cancelled':
        return 'bg-rose-50 text-rose-800 border-rose-200';
      default:
        return 'bg-stone-100 text-stone-700 border-stone-200';
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
          if (!day) return <div key={j} className="w-10 h-10 sm:w-11 sm:h-11 text-sm"></div>;

          const targetDateStr = new Date(Date.UTC(year, month - 1, day)).toISOString().split('T')[0];
          const groupTour = getGroupTourForDay(day);
          const unavailable = bookingMode === 'CUSTOM' ? isDayUnavailable(day) : false;
          const isGroupModeUnbookable = bookingMode === 'GROUP' && !groupTour;

          let isSelected = false;
          let isInRange = false;

          if (bookingMode === 'GROUP') {
            isSelected = selectedDateStr === targetDateStr;
          } else {
            if (selectedDateStr && !customEndDateStr) {
              isSelected = selectedDateStr === targetDateStr;
            } else if (selectedDateStr && customEndDateStr) {
              isSelected = selectedDateStr === targetDateStr || customEndDateStr === targetDateStr;
              isInRange = targetDateStr > selectedDateStr && targetDateStr < customEndDateStr;
            }
          }

          let btnClass = "relative w-10 h-10 sm:w-11 sm:h-11 text-sm flex flex-col items-center justify-center rounded-lg text-xs font-semibold mx-auto transition-all duration-200 cursor-pointer ";

          if (unavailable || isGroupModeUnbookable) {
            btnClass += "bg-stone-50/70 text-slate-300 cursor-not-allowed ";
            if (unavailable) btnClass += "line-through text-rose-300 ";
          } else if (bookingMode === 'GROUP') {
            if (groupTour) {
              if (isSelected) {
                btnClass += "bg-[#8b182b] text-white shadow-md font-bold ring-2 ring-[#8b182b]/40 ";
              } else if (groupTour.status === 'Full' || groupTour.availableSlots <= 0) {
                btnClass += "bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100 font-bold ";
              } else if (groupTour.status === 'Almost Full' || groupTour.availableSlots <= 3) {
                btnClass += "bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 font-bold ";
              } else {
                btnClass += "text-slate-700 hover:bg-stone-100 hover:text-[#8b182b] border border-transparent font-bold ";
              }
            }
          } else {
            // CUSTOM DATES MODE
            if (isSelected) {
              btnClass += "bg-[#8b182b] text-white shadow-md font-bold ring-2 ring-[#8b182b]/40 ";
            } else if (isInRange) {
              btnClass += "bg-[#8b182b]/10 text-[#8b182b] font-bold ";
            } else if (groupTour) {
              btnClass += "text-slate-700 hover:bg-stone-100 hover:text-[#8b182b] border border-transparent font-semibold ";
            } else {
              btnClass += "text-slate-700 hover:bg-stone-100 hover:text-[#8b182b] border border-transparent ";
            }
          }

          return (
            <div key={j} className="text-center">
              <button
                onClick={() => handleDateClick(day)}
                className={btnClass}
                disabled={unavailable || isGroupModeUnbookable}
                title={
                  unavailable
                    ? 'Date Blocked'
                    : bookingMode === 'GROUP'
                    ? groupTour
                      ? `Group Tour: ${groupTour.title} (${groupTour.availableSlots} slots left)`
                      : 'No Group Tour on this date'
                    : groupTour
                    ? `Customize trip on ${targetDateStr} (Group Tour also scheduled)`
                    : `Customize trip on ${targetDateStr}`
                }
              >
                <span>{day}</span>
                {groupTour && (
                  <span className={`absolute bottom-0.5 w-1.5 h-1.5 rounded-full ${
                    isSelected ? 'bg-white' : 'bg-[#8b182b]'
                  }`}></span>
                )}
              </button>
            </div>
          );
        })}
      </div>
    ));
  };

  return (
    <div className="bg-white rounded-[24px] p-5 border border-stone-200/90 shadow-lg space-y-4 text-slate-900 w-full max-w-[420px] mx-auto">
      {/* 1. HEADER & MODE SWITCH */}
      <div className="space-y-4 pb-3 border-b border-stone-100">
        <div className="flex items-center justify-between">
          <h3 className="font-serif font-bold text-[#8b182b] text-base uppercase tracking-wider flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-[#8b182b]" />
            Choose Your Date
          </h3>
          <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-[#8b182b]/10 text-[#8b182b] border border-[#8b182b]/20">
            Universal Travel Company
          </span>
        </div>

        {/* BOOKING MODE TOGGLE (GROUP TOUR | CUSTOM DATES) */}
        <div className="inline-flex p-1 bg-stone-100 rounded-xl border border-stone-200/80 w-full text-xs">
          <button
            onClick={() => setBookingMode('GROUP')}
            className={`flex-1 py-2 px-3 rounded-lg font-bold uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-1.5 ${
              bookingMode === 'GROUP'
                ? 'bg-[#8b182b] text-white shadow-sm'
                : 'text-stone-600 hover:text-slate-900 hover:bg-stone-200/50'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Group Tour
          </button>
          <button
            onClick={() => setBookingMode('CUSTOM')}
            className={`flex-1 py-2 px-3 rounded-lg font-bold uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-1.5 ${
              bookingMode === 'CUSTOM'
                ? 'bg-[#8b182b] text-white shadow-sm'
                : 'text-stone-600 hover:text-slate-900 hover:bg-stone-200/50'
            }`}
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            Custom Dates
          </button>
        </div>
      </div>

      {/* 2. CALENDAR MONTH NAVIGATION & GRID */}
      <div className="space-y-4">
        {/* Month Navigation Header */}
        <div className="flex justify-between items-center bg-stone-50 p-2 rounded-xl border border-stone-200/60">
          <button
            onClick={handlePrevMonth}
            className="p-1 hover:bg-white rounded-lg text-slate-600 hover:text-[#8b182b] transition-all shadow-2xs"
            title="Previous Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="text-sm font-bold text-[#001738] uppercase tracking-wide font-serif">
            {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </div>
          <button
            onClick={handleNextMonth}
            className="p-1 hover:bg-white rounded-lg text-slate-600 hover:text-[#8b182b] transition-all shadow-2xs"
            title="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Calendar Grid */}
        <div>
          <div className="grid grid-cols-7 gap-1 mb-2">
            {daysOfWeek.map((day) => (
              <div key={day} className="text-center text-[11px] font-bold text-[#8ba3c7] uppercase tracking-wider">
                {day.substring(0, 2)}
              </div>
            ))}
          </div>
          <div className="space-y-1">{renderGrid()}</div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between text-[10px] font-semibold text-slate-600 pt-2 border-t border-stone-100">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
            <span>Available</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#8b182b] inline-block"></span>
            <span>Group Tour</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-400 inline-block"></span>
            <span>Blocked / Full</span>
          </div>
        </div>
      </div>

      {/* 3. SELECTED DATE INFORMATION AREA */}
      <div className="pt-2 border-t border-stone-100">
        {bookingMode === 'GROUP' ? (
          selectedGroupTour ? (
            <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200/80 space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] uppercase border ${getStatusBadgeClass(selectedGroupTour.status)}`}>
                    {selectedGroupTour.status}
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 mt-1 line-clamp-1">{selectedGroupTour.title}</h4>
                  <p className="text-[11px] text-slate-500 flex items-center mt-0.5">
                    <MapPin className="w-3 h-3 mr-1 text-[#8b182b]" /> {selectedGroupTour.destination}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-base font-black text-[#8b182b]">,1{selectedGroupTour.pricePerPerson.toLocaleString('en-IN')}</div>
                  <div className="text-[9px] font-bold text-slate-400 uppercase">per person</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] bg-white p-2.5 rounded-xl border border-stone-100">
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase block">Departure</span>
                  <span className="font-bold text-slate-900">
                    {new Date(selectedGroupTour.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase block">Seats Left</span>
                  <span className="font-bold text-[#8b182b]">{selectedGroupTour.availableSlots} Seats</span>
                </div>
              </div>

              <button
                disabled={!selectedGroupTour.isJoinable || selectedGroupTour.availableSlots <= 0}
                onClick={() => setIsJoinModalOpen(true)}
                className="w-full py-3.5 bg-[#8b182b] hover:bg-[#a31c33] text-white font-bold text-sm rounded-[14px] uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:bg-slate-300"
              >
                <Users className="w-3.5 h-3.5" />
                JOIN GROUP TOUR ({selectedGroupTour.availableSlots} Left)
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="bg-stone-50 rounded-2xl p-3.5 border border-stone-200/60 text-center space-y-1.5">
              <span className="text-xs font-bold text-slate-700 block">Select a Departure Date</span>
              <p className="text-[11px] text-slate-500">
                Click any highlighted date with a burgundy dot to view Group Tour availability.
              </p>
            </div>
          )
        ) : (
          selectedDateStr ? (
            <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200/80 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-stone-200/60">
                <div>
                  <span className="text-[10px] font-bold text-[#8b182b] uppercase tracking-wider">Custom Private Travel</span>
                  <h4 className="text-xs font-bold text-slate-900">
                    Date: {new Date(selectedDateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    {customEndDateStr && ` - ${new Date(customEndDateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`}
                  </h4>
                </div>
                <div className="w-24">
                  <select
                    value={travellerCount}
                    onChange={(e) => setTravellerCount(Number(e.target.value))}
                    className="w-full bg-white border border-stone-200 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#8b182b]"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 10, 15].map((num) => (
                      <option key={num} value={num}>
                        {num} {num === 1 ? 'Guest' : 'Guests'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1.5 text-[10px] text-slate-600">
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span>Private Vehicle</span>
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span>Tailored Itinerary</span>
                </div>
              </div>

              <button
                onClick={() => {
                  setSelectedPackageForEnquiry(preselectedPackage ? { id: preselectedPackage.id, title: preselectedPackage.title } : {});
                  setIsEnquiryModalOpen(true);
                }}
                className="w-full py-3.5 bg-[#8b182b] hover:bg-[#a31c33] text-white font-bold text-sm rounded-[14px] uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                PLAN CUSTOM TRIP
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="bg-stone-50 rounded-2xl p-3.5 border border-stone-200/60 text-center space-y-1.5">
              <span className="text-xs font-bold text-slate-700 block">Select Custom Travel Date</span>
              <p className="text-[11px] text-slate-500">
                Click any available date to plan a private trip for your group.
              </p>
            </div>
          )
        )}
      </div>

      {/* 4. BOTTOM ACTION BUTTON */}
      <button
        onClick={() => {
          setSelectedPackageForEnquiry(preselectedPackage ? { id: preselectedPackage.id, title: preselectedPackage.title } : {});
          setIsEnquiryModalOpen(true);
        }}
        className="w-full py-3 bg-[#8b182b] hover:bg-[#a31c33] text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all text-center block"
      >
        View All Departures
      </button>

      {/* MODALS */}
      <JoinGroupTourModal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
        groupTour={selectedGroupTour}
        onSuccess={() => {
          refetchGroupTours();
          if (selectedGroupTour) {
            groupTourService.getPublicGroupTourById(selectedGroupTour.id).then((updated) => {
              setSelectedGroupTour(updated);
            });
          }
        }}
      />

      <EnquiryModal
        isOpen={isEnquiryModalOpen}
        onClose={() => setIsEnquiryModalOpen(false)}
        packageId={selectedPackageForEnquiry.id}
        packageName={selectedPackageForEnquiry.title}
        defaultDate={selectedDateStr || undefined}
      />
    </div>
  );
}
