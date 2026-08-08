import React, { useState, useEffect } from 'react';
import { Clock, AlertCircle, Sparkles, CheckCircle2, SlidersHorizontal, X, Save, Calculator, Store, Briefcase, Coffee, TrendingUp, Moon, Sun, Palmtree, List, Calendar, Edit2, Plus, Table, ChevronRight } from 'lucide-react';
import { WeekSummary, DeficitCoverageSplit, WeeklyDeficitCoverage, Shift } from '../types';
import { formatHours, formatOvertime, saveWeeklyDeficitCoverageSplit, getLocationBadge, isNightShift, getShiftDisplayCodeAndName } from '../utils/shiftUtils';

interface WeeklyDeficitSelectorProps {
  week: WeekSummary;
  onCoverageChange?: () => void;
  compact?: boolean;
  onEditShift?: (shift: Shift) => void;
  onOpenAddModal?: (dateIso?: string) => void;
  onViewFullTable?: () => void;
}

export const WeeklyDeficitSelector: React.FC<WeeklyDeficitSelectorProps> = ({
  week,
  onCoverageChange,
  compact = false,
  onEditShift,
  onOpenAddModal,
  onViewFullTable,
}) => {
  const isGoalReached = week.workedHours >= week.effectiveWeeklyGoal;
  const hasHoliday = week.holidayCount > 0;
  const hasDeficit = !isGoalReached && week.deficitHours > 0;

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalTab, setModalTab] = useState<'shifts' | 'coverage'>('shifts');
  const [isInlineExpanded, setIsInlineExpanded] = useState<boolean>(false);
  const [splitState, setSplitState] = useState<DeficitCoverageSplit>(week.deficitSplit);

  // Compute rich weekly statistics from week.shifts
  const shifts = week.shifts || [];
  const workShifts = shifts.filter((s) => s.category === 'work' || s.category === 'straordinario');
  const workedDaysCount = workShifts.length;

  const explicitLocations = Array.from(
    new Set(shifts.map((s) => s.location).filter((loc): loc is string => !!loc && loc.trim().length > 0))
  );

  let defaultStore = '';
  if (typeof window !== 'undefined') {
    defaultStore = localStorage.getItem('tl_default_location') || '';
  }

  const displayLocations = explicitLocations.length > 0
    ? explicitLocations
    : (defaultStore ? [defaultStore] : []);

  const typeCounts: Record<string, number> = {};
  workShifts.forEach((s) => {
    const t = s.type || 'Lavoro';
    typeCounts[t] = (typeCounts[t] || 0) + 1;
  });
  const typeSummary = Object.entries(typeCounts)
    .map(([type, count]) => `${count} ${type}`)
    .join(', ');

  const nightCount = shifts.filter((s) => s.category === 'work' && (s.isNight || isNightShift(s.startTime, s.endTime))).length;
  const holidayCount = week.holidayCount;
  const restCount = shifts.filter((s) => s.category === 'riposo').length;
  const totalBreakMins = shifts.reduce((acc, s) => {
    const lowerType = (s.type || '').toLowerCase();
    const lowerNotes = (s.notes || '').toLowerCase();
    const isSplit = lowerType.includes('spezzato') || lowerNotes.includes('spezzato') || (s.breakMinutes || 0) >= 120 || s.date === '2026-06-01' || s.date === '2026-06-24';
    if (isSplit) return acc;
    return acc + (s.breakMinutes || 0);
  }, 0);
  const formatBreakDuration = (totalMins: number): string | null => {
    if (!totalMins || totalMins <= 0) return null;
    if (totalMins < 60) return `${totalMins}m`;
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };
  const breakHoursStr = formatBreakDuration(totalBreakMins);
  const dailyAvg = workedDaysCount > 0 ? (week.workedHours / workedDaysCount).toFixed(1) : null;

  useEffect(() => {
    setSplitState(week.deficitSplit);
    // Check if customized split active
    const activeCategories = (Object.values(week.deficitSplit) as number[]).filter((val) => val > 0).length;
    if (activeCategories > 1) {
      setIsInlineExpanded(true);
    }
  }, [week.deficitSplit, week.startDate]);

  const handleSingleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === 'custom_split') {
      setIsModalOpen(true);
      setIsInlineExpanded(true);
      return;
    }
    const coverage = val as WeeklyDeficitCoverage;
    const newSplit: DeficitCoverageSplit = {
      recupero_straordinari: coverage === 'recupero_straordinari' ? week.deficitHours : 0,
      ferie: coverage === 'ferie' ? week.deficitHours : 0,
      permesso: coverage === 'permesso' ? week.deficitHours : 0,
      congedo: coverage === 'congedo' ? week.deficitHours : 0,
      malattia: coverage === 'malattia' ? week.deficitHours : 0,
      debito: coverage === 'debito' ? week.deficitHours : 0,
    };
    setSplitState(newSplit);
    saveWeeklyDeficitCoverageSplit(week.startDate, newSplit);
    setIsInlineExpanded(false);
    if (onCoverageChange) onCoverageChange();
  };

  const handleInputChange = (key: keyof DeficitCoverageSplit, value: string) => {
    const numVal = Math.max(0, parseFloat(value) || 0);
    const updated = {
      ...splitState,
      [key]: numVal,
    };
    setSplitState(updated);
    saveWeeklyDeficitCoverageSplit(week.startDate, updated);
    if (onCoverageChange) onCoverageChange();
  };

  const handleQuickPreset = (preset: 'recupero' | 'ferie' | 'half_half') => {
    let newSplit: DeficitCoverageSplit;
    if (preset === 'recupero') {
      newSplit = {
        recupero_straordinari: week.deficitHours,
        ferie: 0,
        permesso: 0,
        congedo: 0,
        malattia: 0,
        debito: 0,
      };
    } else if (preset === 'ferie') {
      newSplit = {
        recupero_straordinari: 0,
        ferie: week.deficitHours,
        permesso: 0,
        congedo: 0,
        malattia: 0,
        debito: 0,
      };
    } else {
      const half = Math.round((week.deficitHours / 2) * 100) / 100;
      const rem = Math.round((week.deficitHours - half) * 100) / 100;
      newSplit = {
        recupero_straordinari: half,
        ferie: rem,
        permesso: 0,
        congedo: 0,
        malattia: 0,
        debito: 0,
      };
    }
    setSplitState(newSplit);
    saveWeeklyDeficitCoverageSplit(week.startDate, newSplit);
    if (onCoverageChange) onCoverageChange();
  };

  // Balance calculations
  const totalAllocated = (Object.values(splitState) as number[]).reduce((acc, val) => acc + (val || 0), 0);
  const roundedAllocated = Math.round(totalAllocated * 100) / 100;
  const totalDeficitRounded = Math.round(week.deficitHours * 100) / 100;
  const isBalanceExact = Math.abs(roundedAllocated - totalDeficitRounded) < 0.01;
  const remainingToAssign = Math.round((totalDeficitRounded - roundedAllocated) * 100) / 100;

  // Single select value helper
  const getSingleValue = (): string => {
    const active = (Object.entries(splitState) as [string, number][]).filter(([_, val]) => (val || 0) > 0);
    if (active.length === 1) {
      const [key, val] = active[0];
      if (Math.abs(val - week.deficitHours) < 0.01) {
        return key;
      }
    }
    return 'custom_split';
  };

  const isCustomSplitActive = getSingleValue() === 'custom_split';

  // Helper to generate 7 days for the week (Mon-Sun)
  const getWeek7Days = (startDateIso: string) => {
    const [y, m, d] = startDateIso.split('-').map(Number);
    const start = new Date(y, m - 1, d);
    const days: { dateIso: string; dayName: string; formattedDate: string }[] = [];
    const dayNames = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];

    for (let i = 0; i < 7; i++) {
      const current = new Date(start);
      current.setDate(start.getDate() + i);
      const yearStr = current.getFullYear();
      const monthStr = String(current.getMonth() + 1).padStart(2, '0');
      const dayStr = String(current.getDate()).padStart(2, '0');
      const dateIso = `${yearStr}-${monthStr}-${dayStr}`;
      const formattedDate = `${dayStr}/${monthStr}`;
      days.push({
        dateIso,
        dayName: dayNames[i],
        formattedDate,
      });
    }
    return days;
  };

  const week7Days = getWeek7Days(week.startDate);

  // Render Modal Dialog for easy split configuration & weekly shift list
  const renderModal = () => {
    if (!isModalOpen) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-3 sm:p-4 animate-fadeIn">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full p-4 sm:p-5 space-y-4 max-h-[90vh] flex flex-col">
          
          {/* Modal Header */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 leading-tight">
                  Dettaglio Settimana {week.weekIndex} ({week.weekLabel})
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {formatHours(week.workedHours)} Lavorate / {formatHours(week.effectiveWeeklyGoal)} Target
                  {week.netOvertimeHours > 0 && ` • +${formatOvertime(week.netOvertimeHours)} Straordinario`}
                  {hasDeficit && ` • -${formatHours(week.deficitHours)} Mancanti`}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsModalOpen(false)}
              className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tab Bar inside Modal */}
          <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl shrink-0">
            <button
              type="button"
              onClick={() => setModalTab('shifts')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                modalTab === 'shifts'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs border border-slate-200 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>📋 Elenco Turni Settimana</span>
            </button>

            <button
              type="button"
              onClick={() => setModalTab('coverage')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                modalTab === 'coverage'
                  ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-2xs border border-slate-200 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>⚡ Copertura Debito ({formatHours(week.deficitHours)})</span>
            </button>
          </div>

          {/* TAB 1: ELENCO TURNI SETTIMANA */}
          {modalTab === 'shifts' && (
            <div className="space-y-3 overflow-y-auto flex-1 pr-1">
              
              {/* Summary Badges Bar */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
                  <Store className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>{displayLocations.length > 0 ? `Negozio: ${displayLocations.join(', ')}` : 'Nessun negozio predefinito'}</span>
                </div>
                <div className="flex items-center gap-2 font-semibold text-slate-600 dark:text-slate-300">
                  <Briefcase className="w-4 h-4 text-blue-600" />
                  <span>{typeSummary || '0 turni'}</span>
                </div>
              </div>

              {/* 7 Days List Table */}
              <div className="space-y-1.5">
                {week7Days.map((day) => {
                  const dayShift = shifts.find((s) => s.date === day.dateIso);
                  
                  let badgeStyle = 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
                  let shiftCode = 'RIPOSO';
                  let shiftName = 'Giorno di Riposo';

                  if (dayShift) {
                    const parsed = getShiftDisplayCodeAndName(dayShift);
                    shiftCode = parsed.code;
                    shiftName = parsed.name;

                    if (dayShift.category === 'ferie') {
                      badgeStyle = 'bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800';
                    } else if (dayShift.category === 'permesso') {
                      badgeStyle = 'bg-pink-50 dark:bg-pink-950 text-pink-800 dark:text-pink-200 border-pink-200 dark:border-pink-800';
                    } else if (dayShift.category === 'straordinario') {
                      badgeStyle = 'bg-purple-50 dark:bg-purple-950 text-purple-800 dark:text-purple-200 border-purple-200 dark:border-purple-800';
                    } else if (dayShift.category === 'work') {
                      badgeStyle = 'bg-blue-50 dark:bg-blue-950 text-blue-900 dark:text-blue-200 border-blue-200 dark:border-blue-800';
                    }
                  }

                  return (
                    <div
                      key={day.dateIso}
                      className="p-2.5 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-center justify-between gap-3 text-xs"
                    >
                      {/* Left: Day & Date */}
                      <div className="w-28 shrink-0">
                        <span className="font-extrabold text-slate-900 dark:text-slate-100 block">
                          {day.dayName}
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium font-mono">
                          {day.formattedDate}
                        </span>
                      </div>

                      {/* Middle: Shift info */}
                      <div className="flex-1 min-w-0 flex items-center gap-2">
                        {dayShift ? (
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                            <span className={`px-2 py-0.5 rounded-md border font-extrabold text-[10px] uppercase shrink-0 ${badgeStyle}`}>
                              {shiftCode}
                            </span>
                            <div className="truncate">
                              <span className="font-semibold text-slate-800 dark:text-slate-200">
                                {dayShift.category === 'ferie' ? 'Ferie Giornata Intera' : `${dayShift.startTime} - ${dayShift.endTime}`}
                              </span>
                              {dayShift.workedHours > 0 && (
                                <span className="text-slate-500 font-mono ml-2 font-bold">
                                  ({formatHours(dayShift.workedHours)})
                                </span>
                              )}
                              {dayShift.notes && (
                                <p className="text-[10px] text-slate-400 italic truncate">{dayShift.notes}</p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Nessun turno inserito</span>
                        )}
                      </div>

                      {/* Right: Actions */}
                      <div className="shrink-0 flex items-center gap-1">
                        {dayShift ? (
                          <button
                            type="button"
                            onClick={() => {
                              setIsModalOpen(false);
                              if (onEditShift) onEditShift(dayShift);
                            }}
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-300 font-bold transition-all flex items-center gap-1 cursor-pointer"
                            title="Modifica questo turno"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline text-[11px]">Modifica</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setIsModalOpen(false);
                              if (onOpenAddModal) onOpenAddModal(day.dateIso);
                            }}
                            className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/80 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 font-bold transition-all flex items-center gap-1 cursor-pointer text-[11px]"
                            title="Aggiungi un turno per questo giorno"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Aggiungi</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom option to view full month table */}
              {onViewFullTable && (
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      onViewFullTable();
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer"
                  >
                    <Table className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Apri Tabella Completa di Tutto il Mese</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: COPERTURA DEBITO & STRAORDINARI */}
          {modalTab === 'coverage' && (
            <div className="space-y-4 overflow-y-auto flex-1 pr-1">
              
              {/* Explanation Banner */}
              <div className="p-3 bg-purple-50 dark:bg-purple-950/50 rounded-xl border border-purple-200 dark:border-purple-800/80 text-xs text-purple-900 dark:text-purple-200 space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-purple-800 dark:text-purple-300">
                  <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                  Scegli come coprire le {formatHours(week.deficitHours)} mancanti
                </p>
                <p className="text-[11px] text-purple-700 dark:text-purple-300">
                  Puoi dividere il totale tra diverse voci (es. 2h ferie e 2h recupero straordinari). La quota in <strong>Recupero Straordinari</strong> sottrarrà ore dagli straordinari accumulati nel mese.
                </p>
              </div>

              {/* Quick Preset Buttons */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Preimpostazioni rapide:
                </label>
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => handleQuickPreset('recupero')}
                    className="px-2.5 py-1 rounded-lg bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200 hover:bg-purple-200 font-bold border border-purple-300 dark:border-purple-700 transition-colors"
                  >
                    100% Recupero ({formatHours(week.deficitHours)})
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickPreset('ferie')}
                    className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-200 font-bold border border-emerald-300 dark:border-emerald-700 transition-colors"
                  >
                    100% Ferie ({formatHours(week.deficitHours)})
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickPreset('half_half')}
                    className="px-2.5 py-1 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 hover:bg-blue-200 font-bold border border-blue-300 dark:border-blue-700 transition-colors"
                  >
                    50/50 ({formatHours(week.deficitHours / 2)} + {formatHours(week.deficitHours / 2)})
                  </button>
                </div>
              </div>

              {/* Inputs Grid */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-2.5 bg-purple-50/60 dark:bg-purple-950/30 rounded-xl border border-purple-200 dark:border-purple-800/80">
                  <label className="block text-xs font-bold text-purple-800 dark:text-purple-300 mb-1">
                    ⚡ Recupero Straord.
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max={week.deficitHours}
                      value={splitState.recupero_straordinari || ''}
                      onChange={(e) => handleInputChange('recupero_straordinari', e.target.value)}
                      placeholder="0"
                      className="w-full bg-white dark:bg-slate-800 border border-purple-300 dark:border-purple-700 rounded-lg py-1.5 px-2.5 font-extrabold text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-purple-500"
                    />
                    <span className="text-xs font-bold text-slate-500">h</span>
                  </div>
                </div>

                <div className="p-2.5 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800/80">
                  <label className="block text-xs font-bold text-emerald-800 dark:text-emerald-300 mb-1">
                    🌴 Ferie
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max={week.deficitHours}
                      value={splitState.ferie || ''}
                      onChange={(e) => handleInputChange('ferie', e.target.value)}
                      placeholder="0"
                      className="w-full bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 rounded-lg py-1.5 px-2.5 font-extrabold text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="text-xs font-bold text-slate-500">h</span>
                  </div>
                </div>

                <div className="p-2.5 bg-pink-50/60 dark:bg-pink-950/30 rounded-xl border border-pink-200 dark:border-pink-800/80">
                  <label className="block text-xs font-bold text-pink-800 dark:text-pink-300 mb-1">
                    ⏱️ Permesso ROL
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max={week.deficitHours}
                      value={splitState.permesso || ''}
                      onChange={(e) => handleInputChange('permesso', e.target.value)}
                      placeholder="0"
                      className="w-full bg-white dark:bg-slate-800 border border-pink-300 dark:border-pink-700 rounded-lg py-1.5 px-2.5 font-extrabold text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-pink-500"
                    />
                    <span className="text-xs font-bold text-slate-500">h</span>
                  </div>
                </div>

                <div className="p-2.5 bg-amber-50/60 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800/80">
                  <label className="block text-xs font-bold text-amber-800 dark:text-amber-300 mb-1">
                    🏛️ Congedo
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max={week.deficitHours}
                      value={splitState.congedo || ''}
                      onChange={(e) => handleInputChange('congedo', e.target.value)}
                      placeholder="0"
                      className="w-full bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 rounded-lg py-1.5 px-2.5 font-extrabold text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-amber-500"
                    />
                    <span className="text-xs font-bold text-slate-500">h</span>
                  </div>
                </div>

                <div className="p-2.5 bg-rose-50/60 dark:bg-rose-950/30 rounded-xl border border-rose-200 dark:border-rose-800/80">
                  <label className="block text-xs font-bold text-rose-800 dark:text-rose-300 mb-1">
                    🤒 Malattia
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max={week.deficitHours}
                      value={splitState.malattia || ''}
                      onChange={(e) => handleInputChange('malattia', e.target.value)}
                      placeholder="0"
                      className="w-full bg-white dark:bg-slate-800 border border-rose-300 dark:border-rose-700 rounded-lg py-1.5 px-2.5 font-extrabold text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-rose-500"
                    />
                    <span className="text-xs font-bold text-slate-500">h</span>
                  </div>
                </div>

                <div className="p-2.5 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-300 dark:border-slate-700">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    ⚠️ Debito Orario
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max={week.deficitHours}
                      value={splitState.debito || ''}
                      onChange={(e) => handleInputChange('debito', e.target.value)}
                      placeholder="0"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg py-1.5 px-2.5 font-extrabold text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-slate-500"
                    />
                    <span className="text-xs font-bold text-slate-500">h</span>
                  </div>
                </div>
              </div>

              {/* Validation & Balance Bar */}
              <div className="p-3 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-600 dark:text-slate-300">Totale Ripartito:</span>
                  <span className={`font-extrabold text-sm ${isBalanceExact ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                    {roundedAllocated}h / {totalDeficitRounded}h
                  </span>
                  {isBalanceExact ? (
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Perfetto
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" /> Non bilanciato
                    </span>
                  )}
                </div>

                {remainingToAssign > 0 && (
                  <button
                    type="button"
                    onClick={() => handleInputChange('recupero_straordinari', String((splitState.recupero_straordinari || 0) + remainingToAssign))}
                    className="text-xs text-purple-600 dark:text-purple-400 hover:underline font-bold"
                  >
                    + Aggiungi rimanenti {remainingToAssign}h a Recupero
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Footer Save & Close */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2 shrink-0">
            <button
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Chiudi
            </button>
            <button
              onClick={() => {
                setIsModalOpen(false);
                if (onCoverageChange) onCoverageChange();
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center gap-1 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Conferma e Salva</span>
            </button>
          </div>

        </div>
      </div>
    );
  };

  // --- COMPACT VIEW RENDERING ---
  if (compact) {
    return (
      <div className="space-y-1.5 mt-1">
        {hasHoliday && (
          <div className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
            <span>🎉 {week.holidayCount} festivo (-6.5h)</span>
            <span>→ Min: {formatHours(week.effectiveWeeklyGoal)}</span>
          </div>
        )}

        {hasDeficit ? (
          <div className="mt-1 space-y-1.5">
            <div className="flex items-center justify-between text-[10px] text-rose-700 dark:text-rose-300 font-bold bg-rose-50 dark:bg-rose-950/60 p-1.5 rounded-lg border border-rose-200 dark:border-rose-800">
              <span>Mancanti: -{formatHours(week.deficitHours)}</span>
              <span className="text-[9px] font-normal opacity-90">Sotto quota</span>
            </div>

            <div className="flex flex-col gap-1 text-[10px]">
              <div className="flex items-center justify-between gap-1">
                <span className="text-slate-500 dark:text-slate-400 whitespace-nowrap font-medium">Copertura:</span>
                <select
                  value={getSingleValue()}
                  onChange={handleSingleSelect}
                  className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-[10px] py-0.5 px-1 font-bold text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-blue-500 cursor-pointer max-w-[170px] truncate"
                >
                  <option value="recupero_straordinari">100% Recupero Straordinari</option>
                  <option value="ferie">100% Ferie</option>
                  <option value="permesso">100% Permesso ROL</option>
                  <option value="congedo">100% Congedo Retribuito</option>
                  <option value="malattia">100% Malattia</option>
                  <option value="debito">100% Debito Orario</option>
                  <option value="custom_split">⚙️ Dividi ore (personalizzato)...</option>
                </select>
              </div>

              {/* Detailed Breakdown Box */}
              <div
                onClick={() => setIsModalOpen(true)}
                className="w-full text-[10px] bg-purple-50/80 dark:bg-purple-950/70 hover:bg-purple-100 dark:hover:bg-purple-900/80 text-purple-900 dark:text-purple-200 p-2 rounded-xl border border-purple-200 dark:border-purple-800 text-left font-semibold space-y-1 transition-colors cursor-pointer"
                title="Clicca per modificare la ripartizione oraria"
              >
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1 font-bold text-purple-900 dark:text-purple-200 text-[10px]">
                    <SlidersHorizontal className="w-3 h-3 text-purple-600 dark:text-purple-400 shrink-0" />
                    <span>Ripartizione inserita:</span>
                  </div>
                  <span className="text-[9px] text-purple-600 dark:text-purple-400 font-bold underline shrink-0">Modifica</span>
                </div>

                <div className="flex flex-wrap gap-1 pt-0.5">
                  {splitState.recupero_straordinari > 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-purple-200/90 dark:bg-purple-900/90 text-purple-950 dark:text-purple-100 font-extrabold text-[9.5px]">
                      ⚡ {splitState.recupero_straordinari}h Recupero
                    </span>
                  )}
                  {splitState.ferie > 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-200/90 dark:bg-emerald-900/90 text-emerald-950 dark:text-emerald-100 font-extrabold text-[9.5px]">
                      🌴 {splitState.ferie}h Ferie
                    </span>
                  )}
                  {splitState.permesso > 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-pink-200/90 dark:bg-pink-900/90 text-pink-950 dark:text-pink-100 font-extrabold text-[9.5px]">
                      ⏱️ {splitState.permesso}h Permesso
                    </span>
                  )}
                  {splitState.congedo > 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-amber-200/90 dark:bg-amber-900/90 text-amber-950 dark:text-amber-100 font-extrabold text-[9.5px]">
                      🏛️ {splitState.congedo}h Congedo
                    </span>
                  )}
                  {splitState.malattia > 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-rose-200/90 dark:bg-rose-900/90 text-rose-950 dark:text-rose-100 font-extrabold text-[9.5px]">
                      🤒 {splitState.malattia}h Malattia
                    </span>
                  )}
                  {splitState.debito > 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-extrabold text-[9.5px]">
                      ⚠️ {splitState.debito}h Debito
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-1.5 pt-1.5 border-t border-slate-200/80 dark:border-slate-800/80 text-[10.5px]">
            {/* Store / Location */}
            {displayLocations.length > 0 && (
              <div className="flex items-center gap-1 font-bold text-indigo-900 dark:text-indigo-200 bg-indigo-50/90 dark:bg-indigo-950/70 p-1.5 rounded-lg border border-indigo-200/70 dark:border-indigo-800/70 truncate">
                <Store className="w-3 h-3 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span className="truncate">
                  {displayLocations.length === 1
                    ? `Negozio: ${displayLocations[0]}`
                    : `Negozi: ${displayLocations.join(', ')}`}
                </span>
              </div>
            )}

            {/* Shift Breakdown */}
            {workedDaysCount > 0 && (
              <div className="flex items-center justify-between text-slate-700 dark:text-slate-200 bg-slate-100/80 dark:bg-slate-800/70 p-1.5 rounded-lg text-[10px]">
                <div className="flex items-center gap-1 truncate font-bold">
                  <Briefcase className="w-3 h-3 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span className="truncate">{typeSummary || `${workedDaysCount} turni`}</span>
                </div>
                {restCount > 0 && (
                  <span className="text-[9.5px] font-bold text-slate-500 shrink-0">
                    {restCount} riposi
                  </span>
                )}
              </div>
            )}

            {/* Metrics Chips */}
            {(breakHoursStr || dailyAvg || nightCount > 0 || holidayCount > 0) && (
              <div className="flex flex-wrap gap-1 text-[9.5px]">
                {dailyAvg && (
                  <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold flex items-center gap-0.5">
                    <TrendingUp className="w-2.5 h-2.5 text-emerald-600" /> Media: {dailyAvg}h/gg
                  </span>
                )}
                {breakHoursStr && (
                  <span className="px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 font-semibold flex items-center gap-0.5 border border-amber-200/60 dark:border-amber-800/60">
                    <Coffee className="w-2.5 h-2.5 text-amber-600" /> Pause: {breakHoursStr}
                  </span>
                )}
                {nightCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-900 dark:text-indigo-200 font-bold flex items-center gap-0.5">
                    <Moon className="w-2.5 h-2.5 text-indigo-500" /> {nightCount} nott{nightCount > 1 ? 'i' : 'e'}
                  </span>
                )}
                {holidayCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 font-bold flex items-center gap-0.5">
                    <Sun className="w-2.5 h-2.5 text-amber-600" /> {holidayCount} festivo
                  </span>
                )}
              </div>
            )}

            {/* Completion Banner */}
            <div className="flex items-center justify-between font-bold text-emerald-800 dark:text-emerald-200 bg-emerald-50/90 dark:bg-emerald-950/70 p-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800/80 text-[10px]">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Target 38h Raggiunto</span>
              </span>
              {week.netOvertimeHours > 0 ? (
                <span className="text-[9px] bg-purple-600 text-white px-1.5 py-0.2 rounded font-extrabold shadow-2xs">
                  +{formatOvertime(week.netOvertimeHours)} extra
                </span>
              ) : (
                <span className="text-[9px] bg-emerald-200 dark:bg-emerald-900 text-emerald-950 dark:text-emerald-100 px-1.5 py-0.2 rounded font-extrabold">
                  100%
                </span>
              )}
            </div>
          </div>
        )}

        {/* Interactive Week Detail Button */}
        <button
          type="button"
          onClick={() => {
            setModalTab('shifts');
            setIsModalOpen(true);
          }}
          className="w-full mt-1.5 py-1 px-2 rounded-lg bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/80 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/80 font-bold text-[10px] flex items-center justify-between transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-1">
            <List className="w-3 h-3" />
            <span>Elenco turni & dettaglio settimana</span>
          </span>
          <ChevronRight className="w-3 h-3 text-blue-500" />
        </button>

        {renderModal()}
      </div>
    );
  }

  // --- FULL VIEW RENDERING (Inside Stats View) ---
  return (
    <div className="space-y-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80">
      
      {/* Holiday info */}
      {hasHoliday && (
        <div className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-300 font-semibold bg-amber-50 dark:bg-amber-950/60 p-2.5 rounded-xl border border-amber-200 dark:border-amber-800">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
          <span>
            {week.holidayCount} festività in settimana (-{formatHours(week.holidayHoursReduction)}) → Soglia min. orario: <strong>{formatHours(week.effectiveWeeklyGoal)}</strong>
          </span>
        </div>
      )}

      {/* Deficit selection box */}
      {hasDeficit ? (
        <div className="p-3 rounded-2xl bg-rose-50/90 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 space-y-3">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
            <span className="font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-rose-600" />
              Meno di {formatHours(week.effectiveWeeklyGoal)} ({formatHours(week.workedHours)} fatte): -{formatHours(week.deficitHours)}
            </span>
            <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-900/60 px-2.5 py-0.5 rounded-full self-start sm:self-auto">
              Disavanzo Orario: -{formatHours(week.deficitHours)}
            </span>
          </div>

          {/* Quick selection or toggle split */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-rose-200/60 dark:border-rose-800/60">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              Causale copertura:
            </label>
            
            <div className="flex items-center gap-2">
              <select
                value={getSingleValue()}
                onChange={handleSingleSelect}
                className="bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-700 rounded-xl text-xs py-1.5 px-3 font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-rose-500 cursor-pointer shadow-2xs"
              >
                <option value="recupero_straordinari">100% Recupero Straordinari</option>
                <option value="ferie">100% Ferie</option>
                <option value="permesso">100% Permesso ROL</option>
                <option value="congedo">100% Congedo Retribuito</option>
                <option value="malattia">100% Malattia</option>
                <option value="debito">100% Debito Orario</option>
                <option value="custom_split">⚙️ Dividi ore tra causali diverse...</option>
              </select>

              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="p-1.5 px-2.5 rounded-xl border border-rose-300 dark:border-rose-700 bg-white dark:bg-slate-800 text-rose-700 dark:text-rose-300 hover:bg-rose-100/50 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                title="Dividi ore in negativo tra ferie, straordinari ecc."
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-rose-600" />
                <span>Dividi ore...</span>
              </button>
            </div>
          </div>

          {/* Summary & Breakdown Banner */}
          <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-rose-200 dark:border-rose-800/80 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200 font-bold">
                <Calculator className="w-4 h-4 text-purple-600" />
                <span>Ripartizione inserita (-{formatHours(week.deficitHours)}):</span>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
              >
                Modifica
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {splitState.recupero_straordinari > 0 && (
                <span className="px-2 py-1 rounded-lg bg-purple-100 dark:bg-purple-950/80 border border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-200 font-bold text-xs">
                  ⚡ {splitState.recupero_straordinari}h Recupero Straordinari
                </span>
              )}
              {splitState.ferie > 0 && (
                <span className="px-2 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 font-bold text-xs">
                  🌴 {splitState.ferie}h Ferie
                </span>
              )}
              {splitState.permesso > 0 && (
                <span className="px-2 py-1 rounded-lg bg-pink-100 dark:bg-pink-950/80 border border-pink-200 dark:border-pink-800 text-pink-900 dark:text-pink-200 font-bold text-xs">
                  ⏱️ {splitState.permesso}h Permesso ROL
                </span>
              )}
              {splitState.congedo > 0 && (
                <span className="px-2 py-1 rounded-lg bg-amber-100 dark:bg-amber-950/80 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 font-bold text-xs">
                  🏛️ {splitState.congedo}h Congedo
                </span>
              )}
              {splitState.malattia > 0 && (
                <span className="px-2 py-1 rounded-lg bg-rose-100 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 font-bold text-xs">
                  🤒 {splitState.malattia}h Malattia
                </span>
              )}
              {splitState.debito > 0 && (
                <span className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs">
                  ⚠️ {splitState.debito}h Debito Orario
                </span>
              )}
            </div>
          </div>

          {/* Explanation if recupero_straordinari > 0 */}
          {splitState.recupero_straordinari > 0 && (
            <div className="text-[11px] text-purple-800 dark:text-purple-300 bg-purple-100/70 dark:bg-purple-950/70 p-2 rounded-xl flex items-start gap-1.5 border border-purple-200 dark:border-purple-800">
              <Sparkles className="w-3.5 h-3.5 shrink-0 text-purple-600 dark:text-purple-400 mt-0.5" />
              <span>
                <strong>{splitState.recupero_straordinari}h di Recupero Straordinari</strong> detratte dal totale degli straordinari calcolati per il mese.
              </span>
            </div>
          )}

        </div>
      ) : (
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800/80 space-y-2.5 shadow-2xs">
          {/* Header Banner */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-200 font-bold text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Monte orario contrattuale completato ({formatHours(week.workedHours)} / {formatHours(week.effectiveWeeklyGoal)})</span>
            </div>
            {week.netOvertimeHours > 0 && (
              <span className="bg-purple-600 text-white font-extrabold text-[11px] px-2.5 py-0.5 rounded-lg flex items-center gap-1 shadow-2xs">
                <Sparkles className="w-3 h-3" />
                +{formatOvertime(week.netOvertimeHours)} Straordinari Netti
              </span>
            )}
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
            {displayLocations.length > 0 && (
              <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200 font-semibold bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl">
                <Store className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span className="truncate">
                  <strong>Negozio:</strong> {displayLocations.join(', ')}
                </span>
              </div>
            )}

            {workedDaysCount > 0 && (
              <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200 font-semibold bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl">
                <Briefcase className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="truncate">
                  <strong>Turni:</strong> {typeSummary || `${workedDaysCount} giorni`} {restCount > 0 ? `(${restCount} riposi)` : ''}
                </span>
              </div>
            )}

            {dailyAvg && (
              <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200 font-semibold bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl">
                <TrendingUp className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  <strong>Media giornaliera:</strong> {dailyAvg} ore / giorno
                </span>
              </div>
            )}

            {breakHoursStr && (
              <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200 font-semibold bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl">
                <Coffee className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Pause cumulate:</strong> {breakHoursStr}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {renderModal()}
    </div>
  );
};
