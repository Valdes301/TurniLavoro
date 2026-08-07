import React from 'react';
import { 
  X, 
  Clock, 
  Calendar, 
  TrendingUp, 
  Palmtree, 
  Zap, 
  CheckCircle2, 
  AlertCircle,
  CalendarDays,
  Sparkles
} from 'lucide-react';
import { Shift, ContractSettings, VacationSettings } from '../types';
import { getWeeksForMonth, formatHours, formatOvertime, formatDateToIso } from '../utils/shiftUtils';
import { WeeklyDeficitSelector } from './WeeklyDeficitSelector';

interface SidebarProps {
  selectedMonth: string; // YYYY-MM
  shifts: Shift[];
  contract: ContractSettings;
  vacationSettings: VacationSettings;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  selectedMonth,
  shifts,
  contract,
  vacationSettings,
  isOpen,
  onClose,
}) => {
  // Compute Monday-Sunday weeks for the month
  const weeks = getWeeksForMonth(selectedMonth, shifts, contract.weeklyHoursGoal);

  // Filter month shifts
  const monthShifts = shifts.filter((s) => s.date.startsWith(selectedMonth));
  const totalWorkedMonth = monthShifts.reduce((acc, s) => acc + (s.workedHours || 0), 0);
  const totalOvertimeMonth = monthShifts.reduce((acc, s) => acc + (s.overtimeHours || 0), 0);

  // Month progress percentage
  const monthTarget = contract.monthlyHoursGoal || 160;
  const monthProgressPct = Math.min(100, Math.round((totalWorkedMonth / monthTarget) * 100));

  // Vacation / ROL stats
  const usedFerie = shifts.filter((s) => s.category === 'ferie').length;
  const totalAccruedFerie = vacationSettings.annualAccruedDays + vacationSettings.initialCarriedOverDays;
  const remainingFerie = totalAccruedFerie - usedFerie;

  const usedRol = shifts
    .filter((s) => s.category === 'permesso')
    .reduce((acc, s) => acc + (s.workedHours || 0), 0);
  const totalAccruedRol = vacationSettings.rolHoursTotal + vacationSettings.rolHoursCarriedOver;
  const remainingRol = totalAccruedRol - usedRol;

  // Month label
  const [yStr, mStr] = selectedMonth.split('-');
  const dateObj = new Date(parseInt(yStr, 10), parseInt(mStr, 10) - 1, 1);
  const monthName = dateObj.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });

  // Today shift lookup
  const todayIso = formatDateToIso(new Date());
  const todayShift = shifts.find((s) => s.date === todayIso);

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div 
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`
          fixed lg:static top-0 right-0 bottom-0 z-50 lg:z-auto
          w-[88vw] max-w-sm sm:w-88 shrink-0 bg-white dark:bg-slate-900 border-l lg:border-l-0 lg:border-r border-slate-200 dark:border-slate-800
          shadow-2xl lg:shadow-none transition-transform duration-300 ease-in-out
          flex flex-col h-full lg:h-auto overflow-y-auto
          ${isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/80 sticky top-0 backdrop-blur-md z-10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100">Riepilogo Turni</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 capitalize font-medium">{monthName}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors lg:hidden"
            title="Chiudi pannello"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-5 flex-1">
          
          {/* Today's Shift Card */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white shadow-md space-y-2 border border-slate-700/60">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                Oggi ({todayIso.split('-').reverse().join('/')})
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-white/10 text-slate-200">
                {todayShift ? todayShift.type : 'Nessun Turno'}
              </span>
            </div>

            {todayShift ? (
              <div>
                <p className="text-sm font-bold text-white">{todayShift.type} ({todayShift.category})</p>
                <p className="text-xs text-slate-300 font-medium mt-0.5">
                  {todayShift.category === 'ferie' ? 'Giornata Intera Ferie' : `${todayShift.startTime} - ${todayShift.endTime}`}
                  {todayShift.workedHours > 0 && ` • ${formatHours(todayShift.workedHours)} lavorate`}
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-400 font-medium">Nessun turno assegnato per la giornata odierna.</p>
            )}
          </div>

          {/* Weekly Mon-Sun Breakdown */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 uppercase tracking-wide">
                <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Settimane (Lun - Dom)</span>
              </h3>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Target: {contract.weeklyHoursGoal}h
              </span>
            </div>

            <div className="space-y-2">
              {weeks.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Nessun dato per questo mese.</p>
              ) : (
                weeks.map((w) => {
                  const isGoalReached = w.workedHours >= w.effectiveWeeklyGoal;
                  const hasOvertime = w.overtimeHours > 0;
                  const hasDeficit = !isGoalReached && w.deficitHours > 0;

                  return (
                    <div
                      key={w.weekIndex}
                      className={`p-3 rounded-xl border transition-all ${
                        hasDeficit
                          ? 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800'
                          : w.isCurrentWeek
                          ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 shadow-2xs'
                          : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900 dark:text-slate-100">Sett. {w.weekIndex}</span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">({w.weekLabel})</span>
                          {w.isCurrentWeek && (
                            <span className="px-1.5 py-0.2 text-[9px] font-bold bg-blue-600 text-white rounded-md">
                              In corso
                            </span>
                          )}
                        </div>

                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {formatHours(w.workedHours)} <span className="text-slate-400 dark:text-slate-500 font-normal">/ {formatHours(w.effectiveWeeklyGoal)}</span>
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden mb-1.5">
                        <div
                          className={`h-full transition-all rounded-full ${
                            hasOvertime
                              ? 'bg-purple-600'
                              : isGoalReached
                              ? 'bg-emerald-500'
                              : 'bg-rose-500'
                          }`}
                          style={{ width: `${w.percentGoal}%` }}
                        />
                      </div>

                      {/* Interactive deficit selector compact */}
                      <WeeklyDeficitSelector
                        week={w}
                        compact={true}
                      />
                    </div>
                  );
                })
              )}
            </div>
            
            <p className="text-[10px] text-slate-400 dark:text-slate-500 italic leading-tight pt-0.5">
              * L'intervallo settimanale mantiene sempre il ciclo Lunedì-Domenica, anche tra mesi differenti.
            </p>
          </div>

          {/* Monthly Totals Card */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-3">
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Totale Mese ({monthName.split(' ')[0]})</span>
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 rounded-full">
                {monthProgressPct}% Target
              </span>
            </h3>

            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold block">Ore Lavorate</span>
                <span className="text-base font-extrabold text-slate-900 dark:text-slate-100">{formatHours(totalWorkedMonth)}</span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 block">/ {monthTarget}h</span>
              </div>

              <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold block">Straordinario</span>
                <span className="text-base font-extrabold text-purple-700 dark:text-purple-400">+{formatOvertime(totalOvertimeMonth)}</span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 block">nel mese</span>
              </div>
            </div>
          </div>

          {/* Ferie & ROL Balances */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-3">
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <Palmtree className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>Saldo Ferie & Permessi</span>
            </h3>

            <div className="space-y-2">
              <div className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">Ferie Residue</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">Godute: {usedFerie} gg</span>
                </div>
                <span className="text-sm font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/80 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
                  {remainingFerie} gg
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">Permessi ROL Residui</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">Utilizzate: {formatHours(usedRol)}</span>
                </div>
                <span className="text-sm font-extrabold text-pink-700 dark:text-pink-300 bg-pink-50 dark:bg-pink-950/80 px-2.5 py-1 rounded-lg border border-pink-200 dark:border-pink-800">
                  {formatHours(remainingRol)}
                </span>
              </div>
            </div>
          </div>

        </div>
      </aside>
    </>
  );
};
