import React, { useState } from 'react';
import { Plus, Clock, Palmtree, Sparkles, Moon, Sun, AlertCircle, Calendar as CalendarIcon, CalendarDays, ChevronLeft, ChevronRight, MapPin, FileText, Store } from 'lucide-react';
import { Shift, ShiftPreset } from '../types';
import { formatHours, formatOvertime, isItalianNationalHoliday, getShiftDisplayCodeAndName, formatDateToIso, getWeeksForMonth, getLocationBadge } from '../utils/shiftUtils';
import { WeeklyDeficitSelector } from './WeeklyDeficitSelector';

interface CalendarViewProps {
  selectedMonth: string; // YYYY-MM
  shifts: Shift[];
  presets: ShiftPreset[];
  showMobileTimes?: boolean;
  onSelectDate: (dateStr: string) => void;
  onEditShift: (shift: Shift) => void;
  onOpenSidebar?: () => void;
  onOpenAddModal?: (dateIso?: string) => void;
  onViewFullTable?: () => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  selectedMonth,
  shifts,
  presets,
  showMobileTimes = true,
  onSelectDate,
  onEditShift,
  onOpenSidebar,
  onOpenAddModal,
  onViewFullTable,
}) => {
  const [calendarMode, setCalendarMode] = useState<'monthly' | 'weekly'>('monthly');
  const [activeWeekIndex, setActiveWeekIndex] = useState<number>(0);
  const [, setDeficitTick] = React.useState<number>(0);

  React.useEffect(() => {
    const handleDeficitChange = () => setDeficitTick((prev) => prev + 1);
    window.addEventListener('weekly_deficit_changed', handleDeficitChange);
    return () => window.removeEventListener('weekly_deficit_changed', handleDeficitChange);
  }, []);

  const [yearStr, monthStr] = selectedMonth.split('-');
  const year = parseInt(yearStr);
  const month = parseInt(monthStr);

  // Generate days in month
  const firstDayOfMonth = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();

  // Italian starting day of week: Monday (0) to Sunday (6)
  let startingDayOfWeek = firstDayOfMonth.getDay() - 1;
  if (startingDayOfWeek === -1) startingDayOfWeek = 6; // Sunday = index 6

  const daysArray: (number | null)[] = [];
  for (let i = 0; i < startingDayOfWeek; i++) {
    daysArray.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    daysArray.push(d);
  }

  // Filter shifts for selected month
  const monthShifts = shifts.filter((s) => s.date.startsWith(selectedMonth));

  // Get weekly summaries for the month
  const weeks = getWeeksForMonth(selectedMonth, shifts, 38);

  // Ensure activeWeekIndex is within bounds when month changes
  const safeWeekIndex = Math.min(activeWeekIndex, Math.max(0, weeks.length - 1));
  const activeWeek = weeks[safeWeekIndex];

  // Compute stats for current month
  const totalWorkedHours = monthShifts.reduce((acc, s) => acc + s.workedHours, 0);
  const totalOvertime = monthShifts.reduce((acc, s) => acc + s.overtimeHours, 0);
  const totalFerieDays = monthShifts.filter((s) => s.category === 'ferie').length;
  const totalWorkedDays = monthShifts.filter(
    (s) => s.category === 'work' || s.category === 'straordinario'
  ).length;

  const todayStr = formatDateToIso(new Date());

  const getShiftForDate = (dateStr: string) => {
    return shifts.filter((s) => s.date === dateStr);
  };

  const weekDaysItalian = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
  const weekDaysFullItalian = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];

  // Helper to parse HH:mm to minutes from midnight
  const parseTimeToMinutes = (timeStr: string) => {
    if (!timeStr || !timeStr.includes(':')) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + (m || 0);
  };

  // Helper to render 24h timeline bar for a shift
  const renderTimelineBar = (shift: Shift) => {
    if (shift.category === 'riposo' || shift.category === 'ferie') return null;
    const startMins = parseTimeToMinutes(shift.startTime);
    let endMins = parseTimeToMinutes(shift.endTime);
    if (endMins <= startMins) {
      // Crosses midnight
      endMins += 24 * 60;
    }
    const leftPct = Math.min(100, Math.max(0, (startMins / (24 * 60)) * 100));
    const widthPct = Math.min(100 - leftPct, Math.max(3, ((endMins - startMins) / (24 * 60)) * 100));

    let barColor = 'bg-blue-500';
    if (shift.category === 'straordinario') barColor = 'bg-purple-500';
    if (shift.category === 'work' && shift.isNight) barColor = 'bg-indigo-600';

    return (
      <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
        <div className="flex justify-between text-[9px] text-slate-400 font-mono mb-1">
          <span>00:00</span>
          <span>06:00</span>
          <span>12:00</span>
          <span>18:00</span>
          <span>24:00</span>
        </div>
        <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full relative overflow-hidden">
          <div
            className={`h-full ${barColor} rounded-full transition-all`}
            style={{ left: `${leftPct}%`, width: `${widthPct}%`, position: 'absolute' }}
            title={`Fascia: ${shift.startTime} - ${shift.endTime}`}
          />
        </div>
      </div>
    );
  };

  // Generate 7 date objects for the active week (Monday to Sunday)
  const getDaysForActiveWeek = () => {
    if (!activeWeek) return [];
    const days = [];
    const [my, mm, md] = activeWeek.startDate.split('-').map(Number);
    const mondayDate = new Date(my, mm - 1, md, 12, 0, 0);

    for (let i = 0; i < 7; i++) {
      const d = new Date(mondayDate.getFullYear(), mondayDate.getMonth(), mondayDate.getDate() + i, 12, 0, 0);
      const iso = formatDateToIso(d);
      days.push({
        dateIso: iso,
        dateObj: d,
        dayNameShort: weekDaysItalian[i],
        dayNameFull: weekDaysFullItalian[i],
        dayNumber: d.getDate(),
        monthNumber: d.getMonth() + 1,
      });
    }
    return days;
  };

  return (
    <div className="space-y-4">
      
      {/* Top Calendar Mode Switcher & Navigation Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
        
        {/* Toggle Mode Buttons */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700 w-full sm:w-auto">
          <button
            onClick={() => setCalendarMode('monthly')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              calendarMode === 'monthly'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            <span>Vista Mensile</span>
          </button>
          <button
            onClick={() => setCalendarMode('weekly')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              calendarMode === 'weekly'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Vista Settimanale</span>
          </button>
        </div>

        {/* Weekly Navigation Controls if in Weekly Mode */}
        {calendarMode === 'weekly' && weeks.length > 0 && (
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end overflow-x-auto">
            <button
              onClick={() => setActiveWeekIndex((prev) => Math.max(0, prev - 1))}
              disabled={safeWeekIndex === 0}
              className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 dark:text-slate-300"
              title="Settimana precedente"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Week Selector Pills */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
              {weeks.map((w, idx) => {
                const monDay = w.startDate.split('-')[2];
                const sunDay = w.endDate.split('-')[2];
                return (
                  <button
                    key={w.weekIndex}
                    onClick={() => setActiveWeekIndex(idx)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      idx === safeWeekIndex
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    Sett {w.weekIndex} ({monDay}-{sunDay})
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setActiveWeekIndex((prev) => Math.min(weeks.length - 1, prev + 1))}
              disabled={safeWeekIndex === weeks.length - 1}
              className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 dark:text-slate-300"
              title="Settimana successiva"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

      </div>

      {/* Mobile Compact Summary Bar */}
      <div 
        onClick={onOpenSidebar}
        className="sm:hidden flex items-center justify-between bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-3 rounded-2xl shadow-md cursor-pointer active:scale-[0.99] transition-transform"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/10 rounded-xl text-blue-300">
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-xs">
            <span className="font-bold text-white block">
              Totale Mese: {formatHours(totalWorkedHours)}
            </span>
            <span className="text-[10px] text-slate-300 font-medium">
              Extra: +{formatOvertime(totalOvertime)} • Ferie: {totalFerieDays}gg
            </span>
          </div>
        </div>

        <button 
          type="button"
          className="text-[11px] font-bold px-2.5 py-1.5 bg-blue-500/30 border border-blue-400/40 text-blue-100 rounded-xl flex items-center gap-1 hover:bg-blue-500/40"
        >
          <span>Dettagli Lun-Dom</span>
          <span>→</span>
        </button>
      </div>

      {/* Desktop Monthly KPI Bar */}
      <div className="hidden sm:grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Giorni Lavorati</span>
            <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-slate-900 dark:text-slate-100">{totalWorkedDays}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">turni</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Ore Totali</span>
            <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-slate-900 dark:text-slate-100">{formatHours(totalWorkedHours)}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">lavorate</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Straordinari</span>
            <div className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-purple-700 dark:text-purple-400">+{formatOvertime(totalOvertime)}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">extra</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Ferie Godute</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
              <Palmtree className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-emerald-700 dark:text-emerald-400">{totalFerieDays}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">giorni</span>
          </div>
        </div>
      </div>

      {/* RENDER MODE: MONTHLY GRID */}
      {calendarMode === 'monthly' ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
          
          {/* Days of Week Header */}
          <div className="grid grid-cols-7 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-center py-2 text-[11px] sm:text-xs font-bold text-slate-600 dark:text-slate-300">
            {weekDaysItalian.map((day, idx) => (
              <div key={day} className={idx >= 5 ? 'text-amber-600 dark:text-amber-400' : ''}>
                {day}
              </div>
            ))}
          </div>

          {/* Days Cells */}
          <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 dark:divide-slate-800 bg-slate-100 dark:bg-slate-800">
            {daysArray.map((dayNum, index) => {
              if (dayNum === null) {
                return <div key={`empty-${index}`} className="bg-slate-50/50 dark:bg-slate-950/40 min-h-[70px] sm:min-h-[110px]" />;
              }

              const dayPadded = String(dayNum).padStart(2, '0');
              const dateStr = `${selectedMonth}-${dayPadded}`;
              const dateShifts = getShiftForDate(dateStr);
              const isToday = dateStr === todayStr;
              const isHoliday = isItalianNationalHoliday(dateStr);
              const isWeekend = (index % 7) === 5 || (index % 7) === 6;

              const shiftWithLocation = dateShifts.find((s) => s.location && s.location.trim());
              const storeBadge = getLocationBadge(shiftWithLocation?.location);

              return (
                <div
                  key={dateStr}
                  onClick={() => onSelectDate(dateStr)}
                  className={`bg-white dark:bg-slate-900 min-h-[75px] sm:min-h-[110px] p-1 sm:p-2 flex flex-col justify-between transition-all hover:bg-slate-50/80 dark:hover:bg-slate-800/60 group cursor-pointer relative ${
                    isToday ? 'ring-2 ring-blue-500 ring-inset bg-blue-50/20 dark:bg-blue-950/30' : ''
                  }`}
                >
                  {/* Cell Day Header */}
                  <div className="flex items-center justify-between mb-0.5">
                    <div className="flex items-center gap-1">
                      <span
                        className={`text-[11px] sm:text-xs font-bold w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full ${
                          isToday
                            ? 'bg-blue-600 text-white shadow-xs'
                            : isHoliday
                            ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 font-extrabold'
                            : isWeekend
                            ? 'text-slate-500 dark:text-slate-400 font-semibold'
                            : 'text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {dayNum}
                      </span>

                      {/* Store / Negozio Shorthand Letter Badge */}
                      {storeBadge && (
                        <span
                          className={`text-[9px] sm:text-[10px] font-extrabold px-1.5 py-0.2 rounded shadow-2xs tracking-wider cursor-help ${storeBadge.badgeBgClass}`}
                          title={`Negozio / Sede: ${storeBadge.full}`}
                        >
                          {storeBadge.code}
                        </span>
                      )}
                    </div>

                    {/* Add icon on hover */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectDate(dateStr);
                      }}
                      className="hidden sm:block opacity-0 group-hover:opacity-100 p-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-blue-600 hover:text-white transition-all"
                      title="Aggiungi turno"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Cell Shifts List */}
                  <div className="space-y-1 my-auto overflow-hidden">
                    {dateShifts.length === 0 ? (
                      <div className="text-[9px] sm:text-[10px] text-slate-300 dark:text-slate-600 font-normal italic text-center py-1 group-hover:text-slate-400">
                        +
                      </div>
                    ) : (
                      dateShifts.map((shift) => {
                        const { code, name } = getShiftDisplayCodeAndName(shift);

                        // Color mapping
                        let badgeStyle = 'bg-blue-50 dark:bg-blue-950/80 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800';
                        const lowerType = (shift.type || '').toLowerCase();

                        if (shift.category === 'ferie') {
                          badgeStyle = 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800';
                        } else if (shift.category === 'riposo') {
                          badgeStyle = 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
                        } else if (shift.category === 'permesso') {
                          badgeStyle = 'bg-pink-50 dark:bg-pink-950/80 text-pink-800 dark:text-pink-200 border-pink-200 dark:border-pink-800';
                        } else if (shift.category === 'congedo') {
                          badgeStyle = 'bg-purple-100 dark:bg-purple-950/80 text-purple-900 dark:text-purple-200 border-purple-300 dark:border-purple-800 font-bold';
                        } else if (shift.category === 'straordinario') {
                          badgeStyle = 'bg-purple-50 dark:bg-purple-950/80 text-purple-800 dark:text-purple-200 border-purple-200 dark:border-purple-800';
                        } else if (shift.category === 'malattia') {
                          badgeStyle = 'bg-rose-50 dark:bg-rose-950/80 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-800';
                        } else if (code === 'PC' || lowerType.includes('pomeriggio continuato')) {
                          badgeStyle = 'bg-orange-50 dark:bg-orange-950/80 text-orange-900 dark:text-orange-200 border-orange-200 dark:border-orange-800';
                        } else if (code === 'MC' || lowerType.includes('mattino continuato')) {
                          badgeStyle = 'bg-blue-50 dark:bg-blue-950/80 text-blue-900 dark:text-blue-200 border-blue-200 dark:border-blue-800';
                        } else if (code === 'SP' || lowerType.includes('spezzato')) {
                          badgeStyle = 'bg-violet-50 dark:bg-violet-950/80 text-violet-900 dark:text-violet-200 border-violet-200 dark:border-violet-800';
                        } else if (code === 'P' || lowerType.includes('pomeriggio')) {
                          badgeStyle = 'bg-amber-50 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 border-amber-200 dark:border-amber-800';
                        } else if (code === 'M' || lowerType.includes('mattino') || lowerType.includes('mattina')) {
                          badgeStyle = 'bg-sky-50 dark:bg-sky-950/80 text-sky-900 dark:text-sky-200 border-sky-200 dark:border-sky-800';
                        }

                        return (
                          <div
                            key={shift.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditShift(shift);
                            }}
                            className={`p-1 sm:p-1.5 rounded-md sm:rounded-lg border text-[9px] sm:text-[11px] leading-tight font-medium transition-all shadow-2xs hover:scale-[1.02] cursor-pointer ${badgeStyle}`}
                          >
                            <div className="flex items-center justify-between font-bold w-full overflow-hidden" title={name}>
                              {/* SIGLA BADGE (Solo la sigla) */}
                              <span className="font-extrabold text-[10px] sm:text-xs px-1 py-0.2 rounded bg-black/10 dark:bg-white/15 tracking-tight">
                                {code}
                              </span>
                              {shift.category === 'work' && shift.isNight && <Moon className="w-2.5 h-2.5 text-indigo-500 shrink-0 ml-auto" />}
                            </div>

                            {shift.category !== 'riposo' && (
                              <div className="text-[7.5px] sm:text-[10px] opacity-95 mt-0.5 font-mono leading-tight">
                                {showMobileTimes && (
                                  <div className="font-semibold text-[7.5px] sm:text-[10px] tracking-tighter sm:tracking-tight font-mono">
                                    {(() => {
                                      const lowerType = (shift.type || '').toLowerCase();
                                      const lowerNotes = (shift.notes || '').toLowerCase();
                                      const isSplit = code === 'SP' || lowerType.includes('spezzato') || lowerNotes.includes('spezzato') || (shift.breakMinutes || 0) >= 120;
                                      
                                      if (isSplit) {
                                        let t1 = '07:00-13:00';
                                        let t2 = '16:00-19:30';
                                        const match = shift.notes?.match(/(\d{2}:\d{2}-\d{2}:\d{2})\s*\/\s*(\d{2}:\d{2}-\d{2}:\d{2})/);
                                        if (match) {
                                          t1 = match[1];
                                          t2 = match[2];
                                        }
                                        return (
                                          <div className="text-[7px] sm:text-[9.5px] leading-tight font-bold text-violet-800 dark:text-violet-300">
                                            <span className="block">{t1}</span>
                                            <span className="block">{t2}</span>
                                          </div>
                                        );
                                      }

                                      return (
                                        <>
                                          <span className="block sm:inline">{shift.startTime}</span>
                                          <span className="hidden sm:inline">-</span>
                                          <span className="block sm:inline">{shift.endTime}</span>
                                        </>
                                      );
                                    })()}
                                  </div>
                                )}
                                <div className="font-bold text-[8px] sm:text-[10px] text-right sm:text-left mt-0.5 opacity-90 whitespace-nowrap">
                                  {formatHours(shift.workedHours)}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Footer indicator if holiday */}
                  {isHoliday && dateShifts.length === 0 && (
                    <div className="text-[8px] sm:text-[9px] text-amber-600 dark:text-amber-400 font-medium truncate text-right">
                      Festivo
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Riepilogo Settimanale (Weekly Overtime & Deficit Breakdown) */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-100 dark:border-slate-800 pb-2">
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 uppercase tracking-wide">
                <Clock className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>Riepilogo Settimanale Orari e Festività (Lun - Dom)</span>
              </h4>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Obiettivo base: <strong>38h/sett.</strong> (ogni festività = <strong>-6.5h</strong> → target min: <strong>31:30</strong>)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
              {weeks.map((w) => {
                const hasOvertime = w.overtimeHours > 0;
                const hasDeficit = w.workedHours < w.effectiveWeeklyGoal && w.deficitHours > 0;

                return (
                  <div
                    key={w.weekIndex}
                    className={`p-3 rounded-xl border text-xs flex flex-col justify-between transition-all ${
                      hasDeficit
                        ? 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800/80'
                        : hasOvertime
                        ? 'bg-purple-50/70 dark:bg-purple-950/40 border-purple-300 dark:border-purple-800'
                        : w.isCurrentWeek
                        ? 'bg-blue-50/60 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800'
                        : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200 mb-1">
                        <span>Settimana {w.weekIndex}</span>
                        {w.isCurrentWeek && (
                          <span className="text-[9px] px-1.5 py-0.2 bg-blue-600 text-white font-bold rounded">In corso</span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{w.weekLabel}</p>
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 space-y-1.5">
                      <div className="flex items-baseline justify-between">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-medium">Lavorate / Min</span>
                          <span className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">
                            {formatHours(w.workedHours)} <span className="text-xs font-normal text-slate-400">/ {formatHours(w.effectiveWeeklyGoal)}</span>
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block font-medium">Esito</span>
                          {w.netOvertimeHours > 0 ? (
                            <span className="font-extrabold text-purple-700 dark:text-purple-300 text-xs bg-purple-100 dark:bg-purple-900/60 px-1.5 py-0.5 rounded border border-purple-200 dark:border-purple-700">
                              +{formatOvertime(w.netOvertimeHours)}
                            </span>
                          ) : hasDeficit ? (
                            <span className="font-extrabold text-rose-700 dark:text-rose-300 text-xs bg-rose-100 dark:bg-rose-900/60 px-1.5 py-0.5 rounded border border-rose-200 dark:border-rose-700">
                              -{formatHours(w.deficitHours)}
                            </span>
                          ) : (
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400 text-xs">OK</span>
                          )}
                        </div>
                      </div>

                      {/* Interactive deficit selector compact */}
                      <WeeklyDeficitSelector
                        week={w}
                        compact={true}
                        onEditShift={onEditShift}
                        onOpenAddModal={onOpenAddModal || onSelectDate}
                        onViewFullTable={onViewFullTable}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* RENDER MODE: WEEKLY VIEW (7 Detailed Day Columns) */
        <div className="space-y-4">
          
          {/* Active Week Summary Header Banner */}
          {activeWeek && (
            <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-4 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/10 rounded-xl text-blue-300">
                  <CalendarDays className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base">
                    Settimana {activeWeek.weekIndex}: dal {activeWeek.startDate.split('-').reverse().join('/')} al {activeWeek.endDate.split('-').reverse().join('/')}
                  </h3>
                  <p className="text-xs text-slate-300">
                    Minimo contrattuale: <strong>{formatHours(activeWeek.effectiveWeeklyGoal)}</strong> {activeWeek.holidayCount > 0 ? `(${activeWeek.holidayCount} festività = -${formatHours(activeWeek.holidayHoursReduction)})` : ''} • {activeWeek.shifts.length} turni assegnati
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="px-3 py-1.5 rounded-xl bg-blue-500/30 border border-blue-400/40 text-blue-100 font-bold">
                  Ore Lavorate: {formatHours(activeWeek.workedHours)}
                </span>
                {activeWeek.overtimeHours > 0 && (
                  <span className="px-3 py-1.5 rounded-xl bg-purple-500/30 border border-purple-400/40 text-purple-200 font-bold">
                    Extra: +{formatOvertime(activeWeek.overtimeHours)}
                  </span>
                )}
                {activeWeek.deficitHours > 0 && (
                  <span className="px-3 py-1.5 rounded-xl bg-rose-500/30 border border-rose-400/40 text-rose-200 font-bold">
                    Sotto quota: -{formatHours(activeWeek.deficitHours)}
                  </span>
                )}
              </div>
            </div>
          )}

          {activeWeek && activeWeek.deficitHours > 0 && (
            <WeeklyDeficitSelector
              week={activeWeek}
              compact={false}
            />
          )}

          {/* 7 Day Columns Grid */}
          <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
            {getDaysForActiveWeek().map((dayItem, idx) => {
              const dayShifts = getShiftForDate(dayItem.dateIso);
              const isToday = dayItem.dateIso === todayStr;
              const isHoliday = isItalianNationalHoliday(dayItem.dateIso);
              const isWeekend = idx >= 5;

              const shiftWithLocation = dayShifts.find((s) => s.location && s.location.trim());
              const weekStoreBadge = getLocationBadge(shiftWithLocation?.location);

              return (
                <div
                  key={dayItem.dateIso}
                  className={`bg-white dark:bg-slate-900 rounded-2xl border p-3 flex flex-col justify-between transition-all shadow-2xs ${
                    isToday
                      ? 'border-blue-500 ring-2 ring-blue-500/30 dark:ring-blue-500/50 bg-blue-50/20 dark:bg-blue-950/20'
                      : isHoliday
                      ? 'border-amber-300 dark:border-amber-800 bg-amber-50/30 dark:bg-amber-950/20'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {/* Day Column Header */}
                  <div>
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                      <div>
                        <span className={`text-xs font-bold uppercase tracking-wider block ${
                          isWeekend ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'
                        }`}>
                          {dayItem.dayNameShort}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`text-sm font-extrabold block ${
                            isToday ? 'text-blue-600 dark:text-blue-400' : 'text-slate-900 dark:text-slate-100'
                          }`}>
                            {dayItem.dayNumber}/{dayItem.monthNumber}
                          </span>
                          {weekStoreBadge && (
                            <span
                              className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded shadow-2xs tracking-wider cursor-help ${weekStoreBadge.badgeBgClass}`}
                              title={`Negozio / Sede: ${weekStoreBadge.full}`}
                            >
                              {weekStoreBadge.code}
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => onSelectDate(dayItem.dateIso)}
                        className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-blue-600 hover:text-white transition-all cursor-pointer"
                        title="Aggiungi turno in questa data"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {isHoliday && (
                      <div className="mt-1.5 text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-100/60 dark:bg-amber-950/80 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>Festività Nazionale</span>
                      </div>
                    )}

                    {/* Shifts List for Day */}
                    <div className="mt-3 space-y-2">
                      {dayShifts.length === 0 ? (
                        <div 
                          onClick={() => onSelectDate(dayItem.dateIso)}
                          className="p-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 dark:hover:bg-blue-950/30 transition-all group"
                        >
                          <span className="text-xs text-slate-400 dark:text-slate-500 font-medium group-hover:text-blue-600 dark:group-hover:text-blue-400 block">
                            Riposo / Libero
                          </span>
                          <span className="text-[10px] text-slate-300 dark:text-slate-600 block mt-0.5">
                            + Clicca per inserire
                          </span>
                        </div>
                      ) : (
                        dayShifts.map((shift) => {
                          const { code, name } = getShiftDisplayCodeAndName(shift);

                          let badgeColor = 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/80 text-blue-900 dark:text-blue-100';
                          if (shift.category === 'ferie') {
                            badgeColor = 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-100';
                          } else if (shift.category === 'riposo') {
                            badgeColor = 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200';
                          } else if (shift.category === 'permesso') {
                            badgeColor = 'border-pink-200 dark:border-pink-800 bg-pink-50 dark:bg-pink-950/80 text-pink-900 dark:text-pink-100';
                          } else if (shift.category === 'straordinario') {
                            badgeColor = 'border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/80 text-purple-900 dark:text-purple-100';
                          } else if (shift.category === 'malattia') {
                            badgeColor = 'border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/80 text-rose-900 dark:text-rose-100';
                          }

                          return (
                            <div
                              key={shift.id}
                              onClick={() => onEditShift(shift)}
                              className={`p-2.5 rounded-xl border ${badgeColor} transition-all hover:scale-[1.02] cursor-pointer shadow-2xs space-y-1.5`}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <div className="flex items-center gap-1.5 font-bold text-xs truncate">
                                  <span className="px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/15 text-[10px] font-extrabold tracking-tight">
                                    {code}
                                  </span>
                                  <span className="truncate" title={name}>{name}</span>
                                </div>
                                {shift.category === 'work' && shift.isNight && <Moon className="w-3.5 h-3.5 text-indigo-500 shrink-0" />}
                              </div>

                              {shift.category !== 'riposo' && shift.category !== 'ferie' && (
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs font-mono pt-1 border-t border-black/5 dark:border-white/10 gap-0.5">
                                  {(() => {
                                    const lowerType = (shift.type || '').toLowerCase();
                                    const lowerNotes = (shift.notes || '').toLowerCase();
                                    const isSplit = code === 'SP' || lowerType.includes('spezzato') || lowerNotes.includes('spezzato') || (shift.breakMinutes || 0) >= 120;
                                    
                                    if (isSplit) {
                                      let t1 = '07:00-13:00';
                                      let t2 = '16:00-19:30';
                                      const match = shift.notes?.match(/(\d{2}:\d{2}-\d{2}:\d{2})\s*\/\s*(\d{2}:\d{2}-\d{2}:\d{2})/);
                                      if (match) {
                                        t1 = match[1];
                                        t2 = match[2];
                                      }
                                      return <span className="font-semibold text-violet-800 dark:text-violet-300">{t1} / {t2}</span>;
                                    }
                                    return <span className="font-semibold">{shift.startTime} - {shift.endTime}</span>;
                                  })()}
                                  <span className="font-bold">{formatHours(shift.workedHours)}</span>
                                </div>
                              )}

                              {shift.location && (
                                <div className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1 truncate pt-0.5">
                                  <Store className="w-3 h-3 text-indigo-500 shrink-0" />
                                  <span className="truncate">{shift.location}</span>
                                </div>
                              )}

                              {shift.notes && (
                                <div className="text-[10px] opacity-80 flex items-center gap-1 truncate pt-0.5">
                                  <FileText className="w-3 h-3 shrink-0" />
                                  <span className="truncate">{shift.notes}</span>
                                </div>
                              )}

                              {/* 24h Visual Timeline Bar */}
                              {renderTimelineBar(shift)}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Day Column Footer */}
                  <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 dark:text-slate-500 font-medium flex justify-between">
                    <span>Totale giorno:</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {dayShifts.reduce((acc, s) => acc + s.workedHours, 0)}h
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}

    </div>
  );
};

