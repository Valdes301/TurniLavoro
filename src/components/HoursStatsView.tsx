import React from 'react';
import { 
  Clock, 
  Sparkles, 
  Moon, 
  Sun, 
  Calculator, 
  TrendingUp, 
  CheckCircle2, 
  BarChart2, 
  PieChart as PieChartIcon, 
  Calendar, 
  Award,
  Palmtree,
  Activity
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell, 
  AreaChart, 
  Area 
} from 'recharts';
import { Shift, ContractSettings } from '../types';
import { getShiftDisplayCodeAndName, getWeeksForMonth, formatOvertime, formatHours } from '../utils/shiftUtils';
import { WeeklyDeficitSelector } from './WeeklyDeficitSelector';

interface HoursStatsViewProps {
  selectedMonth: string;
  shifts: Shift[];
  contract: ContractSettings;
  onEditShift?: (shift: Shift) => void;
  onOpenAddModal?: (dateIso?: string) => void;
}

export const HoursStatsView: React.FC<HoursStatsViewProps> = ({
  selectedMonth,
  shifts,
  contract,
  onEditShift,
  onOpenAddModal,
}) => {
  const [, setDeficitTick] = React.useState<number>(0);

  React.useEffect(() => {
    const handleDeficitChange = () => setDeficitTick((prev) => prev + 1);
    window.addEventListener('weekly_deficit_changed', handleDeficitChange);
    return () => window.removeEventListener('weekly_deficit_changed', handleDeficitChange);
  }, []);

  const [yearStr, monthStr] = selectedMonth.split('-');
  const selectedYearNum = parseInt(yearStr);
  const selectedMonthNum = parseInt(monthStr);

  const monthShifts = shifts.filter((s) => s.date.startsWith(selectedMonth));
  const monthWeeks = getWeeksForMonth(selectedMonth, shifts, contract.weeklyHoursGoal);

  // Compute key totals
  const totalWorked = monthShifts.reduce((acc, s) => acc + s.workedHours, 0);
  const totalGrossOvertime = monthWeeks.reduce((acc, w) => acc + w.overtimeHours, 0);
  const totalRecuperoStraordinari = monthWeeks.reduce((acc, w) => acc + (w.deficitSplit?.recupero_straordinari || 0), 0);
  const totalNetOvertime = Math.max(0, totalGrossOvertime - totalRecuperoStraordinari);

  const totalNightShifts = monthShifts.filter((s) => s.category === 'work' && s.isNight).length;
  const totalNightHours = monthShifts.filter((s) => s.category === 'work' && s.isNight).reduce((acc, s) => acc + s.workedHours, 0);
  const totalHolidayShifts = monthShifts.filter((s) => s.isHoliday).length;
  const totalHolidayHours = monthShifts.filter((s) => s.isHoliday).reduce((acc, s) => acc + s.workedHours, 0);

  const ferieDays = monthShifts.filter((s) => s.category === 'ferie').length;
  const permessiHours = monthShifts.filter((s) => s.category === 'permesso').reduce((acc, s) => acc + s.workedHours, 0);
  const workedDaysCount = monthShifts.filter((s) => s.category === 'work' || s.category === 'straordinario').length;

  const targetMonthlyHours = contract.monthlyHoursGoal || 160;
  const completionPercentage = Math.min(100, Math.round((totalWorked / targetMonthlyHours) * 100));

  // Daily Averages
  const avgDailyWorked = workedDaysCount > 0 ? (totalWorked / workedDaysCount).toFixed(1) : '0';
  const avgWeeklyWorked = (totalWorked / 4.33).toFixed(1);

  // Financial Estimates & Detailed Projections
  const baseRate = contract.hourlyRate || 12;
  const baseEarnings = totalWorked * baseRate;
  const overtimeMultiplier = contract.overtimeMultiplier || 1.25;
  const overtimeBonus = totalNetOvertime * baseRate * (overtimeMultiplier - 1);

  const nightMultiplier = contract.nightShiftMultiplier || 1.20;
  const nightShiftBonus = totalNightHours * baseRate * (nightMultiplier - 1);

  const holidayMultiplier = contract.sundayHolidayMultiplier || 1.30;
  const holidayShiftBonus = totalHolidayHours * baseRate * (holidayMultiplier - 1);

  const congedoShifts = monthShifts.filter((s) => s.category === 'congedo');
  const congedoHoursTotal = congedoShifts.reduce((acc, s) => acc + s.workedHours, 0);
  // Indennità Congedo Parentale (30%)
  const congedoIndemnityPay = congedoHoursTotal * baseRate * 0.30;

  const totalEstimatedEarningsGross = baseEarnings + overtimeBonus + nightShiftBonus + holidayShiftBonus + congedoIndemnityPay;

  // Tax & INPS estimations
  const taxPct = contract.estimatedTaxRatePct ?? 23;
  const inpsPct = contract.estimatedInpsRatePct ?? 9.19;
  const totalDeductionsPct = taxPct + inpsPct;
  const totalEstimatedEarningsNet = Math.max(0, totalEstimatedEarningsGross * (1 - totalDeductionsPct / 100));

  // --- CHART 1: Daily Hours Breakdown (Bar Chart for current month days) ---
  const daysInMonth = new Date(selectedYearNum, selectedMonthNum, 0).getDate();
  const dailyChartData = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dayPadded = String(d).padStart(2, '0');
    const dateIso = `${selectedMonth}-${dayPadded}`;
    const dayShifts = monthShifts.filter((s) => s.date === dateIso);

    const worked = dayShifts.reduce((acc, s) => acc + s.workedHours, 0);
    const overtime = dayShifts.reduce((acc, s) => acc + s.overtimeHours, 0);

    dailyChartData.push({
      day: `${d}`,
      dateIso,
      'Ore Ordinarie': Math.max(0, parseFloat((worked - overtime).toFixed(1))),
      'Straordinario': parseFloat(overtime.toFixed(1)),
      'Totale': parseFloat(worked.toFixed(1)),
    });
  }

  // --- CHART 2: Shift Category Pie Distribution ---
  const categoriesCount = {
    Lavoro: monthShifts.filter((s) => s.category === 'work').length,
    Straordinario: monthShifts.filter((s) => s.category === 'straordinario').length,
    Ferie: monthShifts.filter((s) => s.category === 'ferie').length,
    Permesso: monthShifts.filter((s) => s.category === 'permesso').length,
    Riposo: monthShifts.filter((s) => s.category === 'riposo').length,
    Malattia: monthShifts.filter((s) => s.category === 'malattia').length,
  };

  const pieData = Object.entries(categoriesCount)
    .filter(([_, value]) => value > 0)
    .map(([name, value]) => ({ name, value }));

  const PIE_COLORS: Record<string, string> = {
    Lavoro: '#3b82f6', // blue
    Straordinario: '#a855f7', // purple
    Ferie: '#10b981', // emerald
    Permesso: '#ec4899', // pink
    Riposo: '#64748b', // slate
    Malattia: '#f43f5e', // rose
  };

  // --- CHART 3: Shift Types Frequency (Mattina, Pomeriggio, Notte, Continuato, Spezzato) ---
  const shiftTypeCounts: Record<string, number> = {};
  monthShifts.forEach((s) => {
    const { name } = getShiftDisplayCodeAndName(s);
    shiftTypeCounts[name] = (shiftTypeCounts[name] || 0) + 1;
  });

  const shiftTypeData = Object.entries(shiftTypeCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // --- CHART 4: Historical 6-Month Trend ---
  const historicalData = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(selectedYearNum, selectedMonthNum - 1 - i, 1);
    const yStr = d.getFullYear();
    const mStr = String(d.getMonth() + 1).padStart(2, '0');
    const monthKey = `${yStr}-${mStr}`;
    const mName = d.toLocaleDateString('it-IT', { month: 'short' });

    const mShifts = shifts.filter((s) => s.date.startsWith(monthKey));
    const mWorked = mShifts.reduce((acc, s) => acc + s.workedHours, 0);
    const mOvertime = mShifts.reduce((acc, s) => acc + s.overtimeHours, 0);

    historicalData.push({
      month: `${mName.toUpperCase()} ${yStr.toString().substring(2)}`,
      'Ore Totali': parseFloat(mWorked.toFixed(1)),
      'Straordinari': parseFloat(mOvertime.toFixed(1)),
    });
  }

  return (
    <div className="space-y-6">
      
      {/* Target Progress Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-400/30">
              <Clock className="w-3.5 h-3.5" />
              <span>Obiettivo Contrattuale Mensile</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {formatHours(totalWorked)} <span className="text-sm font-normal text-slate-300">/ {targetMonthlyHours} ore</span>
            </h2>
            <p className="text-xs text-slate-300 max-w-md">
              {totalWorked >= targetMonthlyHours ? (
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  Hai raggiunto l'obiettivo mensile previsto dal tuo contratto!
                </span>
              ) : (
                `Ti mancano ${formatHours(targetMonthlyHours - totalWorked)} per completare l'orario contrattuale.`
              )}
            </p>
          </div>

          {/* Progress bar */}
          <div className="w-full md:w-64 space-y-2">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-300">Avanzamento Target</span>
              <span className="text-indigo-300 font-bold">{completionPercentage}%</span>
            </div>
            <div className="h-3.5 w-full bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700">
              <div
                className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>0h</span>
              <span>{targetMonthlyHours}h contrattuali</span>
            </div>
          </div>

        </div>
      </div>

      {/* Grid Stats KPI */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        
        {/* Total Standard */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Ore Lavorate</span>
            <div className="p-1 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
            {formatHours(totalWorked)}
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            {workedDaysCount} giorni lavorati
          </p>
        </div>

        {/* Total Overtime */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Straordinario Netto</span>
            <div className="p-1 rounded-lg bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-bold text-purple-700 dark:text-purple-400">
            {totalNetOvertime > 0 ? `+${formatOvertime(totalNetOvertime)}` : '0h'}
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            {totalRecuperoStraordinari > 0
              ? `Lordo: +${formatOvertime(totalGrossOvertime)} (-${totalRecuperoStraordinari}h rec.)`
              : `Soglia >${contract.overtimeThresholdDaily}h/gg`}
          </p>
        </div>

        {/* Daily Average */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Media Giornaliera</span>
            <div className="p-1 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
              <Activity className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-bold text-emerald-700 dark:text-emerald-400">
            {avgDailyWorked}h
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            per giorno lavorato
          </p>
        </div>

        {/* Night Hours */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Turni Notturni</span>
            <div className="p-1 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
              <Moon className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-bold text-indigo-900 dark:text-indigo-300">
            {totalNightShifts} <span className="text-xs font-normal opacity-80">({totalNightHours.toFixed(0)}h)</span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            {contract.nightStart}-{contract.nightEnd}
          </p>
        </div>

        {/* Ferie & Permessi */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Ferie / Permessi</span>
            <div className="p-1 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
              <Palmtree className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-bold text-emerald-800 dark:text-emerald-300">
            {ferieDays}gg <span className="text-xs font-normal opacity-80">({formatHours(permessiHours)})</span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            nel mese selezionato
          </p>
        </div>

        {/* Holiday Hours */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Festivi / Dom</span>
            <div className="p-1 rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
              <Sun className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-bold text-amber-800 dark:text-amber-300">
            {totalHolidayShifts} <span className="text-xs font-normal opacity-80">({totalHolidayHours.toFixed(0)}h)</span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            Turni festivi italiani
          </p>
        </div>

      </div>

      {/* Weekly Breakdown & Deficit Management */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Dettaglio Settimanale & Disavanzi Orari
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Obiettivo base 38h/sett. Riduzione di -6.5h per ciascun giorno festivo nella settimana (minimo 31:30).
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {monthWeeks.map((w) => (
            <div
              key={w.weekIndex}
              className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  Settimana {w.weekIndex} ({w.weekLabel})
                </span>
                <span className="font-semibold text-slate-600 dark:text-slate-300">
                  {formatHours(w.workedHours)} / {formatHours(w.effectiveWeeklyGoal)}
                </span>
              </div>

              <WeeklyDeficitSelector
                week={w}
                compact={false}
                onEditShift={onEditShift}
                onOpenAddModal={onOpenAddModal}
              />
            </div>
          ))}
        </div>
      </div>

      {/* --- GRAPH SECTION 1: Daily Hours Bar Chart --- */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Ore Lavorate e Straordinari per Giorno del Mese
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Andamento giornaliero orari ordinari e straordinari accumulati
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300">
            Mese: {selectedMonth}
          </span>
        </div>

        <div className="h-72 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#0f172a', 
                  borderColor: '#334155', 
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '12px'
                }} 
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              <Bar dataKey="Ore Ordinarie" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Straordinario" stackId="a" fill="#a855f7" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* --- GRAPH SECTION 2: Category Pie Chart + Shift Types Distribution Bar Chart --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Pie Chart: Categories */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs space-y-4 flex flex-col justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400">
              <PieChartIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Ripartizione Categorie Turni
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Distribuzione tra lavoro, straordinario, ferie, permessi e riposo
              </p>
            </div>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            {pieData.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Nessun turno nel mese selezionato</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[entry.name] || '#3b82f6'} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#0f172a', 
                      borderColor: '#334155', 
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '12px'
                    }} 
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Bar Chart: Frequency of Shift Types */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs space-y-4 flex flex-col justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Frequenza Tipologie Turno
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Numero di uscite per ciascuna fascia (Mattino, Pomeriggio, Notte, Continuato)
              </p>
            </div>
          </div>

          <div className="h-64 w-full pt-2">
            {shiftTypeData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">
                Nessun dato
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={shiftTypeData} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={120} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#0f172a', 
                      borderColor: '#334155', 
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '12px'
                    }} 
                  />
                  <Bar dataKey="count" name="Uscite" fill="#6366f1" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>

      {/* --- GRAPH SECTION 3: Historical 6-Month Area Chart --- */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs space-y-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Confronto Storico Ultimi 6 Mesi
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Evoluzione delle ore lavorate e straordinari mese su mese
            </p>
          </div>
        </div>

        <div className="h-64 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={historicalData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorWorked" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorOvertime" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#0f172a', 
                  borderColor: '#334155', 
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '12px'
                }} 
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              <Area type="monotone" dataKey="Ore Totali" stroke="#3b82f6" fillOpacity={1} fill="url(#colorWorked)" />
              <Area type="monotone" dataKey="Straordinari" stroke="#a855f7" fillOpacity={1} fill="url(#colorOvertime)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Financial Estimates Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Simulatore Retributivo & Straordinari</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Stima analitica di stipendio lordo e netto su paga oraria base ({baseRate.toFixed(2)} €/h)
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
            <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 block truncate">Paga Base Ore ({baseRate}€/h)</span>
            <p className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">€ {baseEarnings.toFixed(2)}</p>
          </div>

          <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200/80 dark:border-purple-800">
            <span className="text-[10px] font-bold uppercase text-purple-700 dark:text-purple-300 block truncate">Maggiorazione Straordinario</span>
            <p className="text-base font-bold text-purple-900 dark:text-purple-200 mt-0.5">€ {overtimeBonus.toFixed(2)}</p>
          </div>

          <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800">
            <span className="text-[10px] font-bold uppercase text-indigo-700 dark:text-indigo-300 block truncate">Indennità Notturna/Festiva</span>
            <p className="text-base font-bold text-indigo-900 dark:text-indigo-200 mt-0.5">€ {(nightShiftBonus + holidayShiftBonus).toFixed(2)}</p>
          </div>

          <div className="p-3 rounded-xl bg-pink-50 dark:bg-pink-950/60 border border-pink-200/80 dark:border-pink-800">
            <span className="text-[10px] font-bold uppercase text-pink-700 dark:text-pink-300 block truncate">Congedo Parentale (30%)</span>
            <p className="text-base font-bold text-pink-900 dark:text-pink-200 mt-0.5">€ {congedoIndemnityPay.toFixed(2)}</p>
          </div>

          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200/80 dark:border-emerald-800 col-span-2 sm:col-span-1">
            <span className="text-[10px] font-bold uppercase text-emerald-800 dark:text-emerald-300 block truncate">Totale Lordo Stimato</span>
            <p className="text-base sm:text-lg font-bold text-emerald-950 dark:text-emerald-100 mt-0.5">€ {totalEstimatedEarningsGross.toFixed(2)}</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-900/90 to-teal-900 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm border border-emerald-500/20">
          <div>
            <span className="text-xs uppercase font-bold text-emerald-300 tracking-wider block">Stima Netto in Busta Paga</span>
            <p className="text-xs text-emerald-100/80 mt-0.5">
              Al netto delle ritenute IRPEF stimate ({taxPct}%) e contributi INPS ({inpsPct}%)
            </p>
          </div>
          <div className="text-left sm:text-right shrink-0">
            <p className="text-2xl sm:text-3xl font-extrabold text-emerald-200">€ {totalEstimatedEarningsNet.toFixed(2)}</p>
          </div>
        </div>

        <p className="text-[11px] text-slate-400 mt-2 italic">
          * Nota: La stima economica è basata sui parametri contrattuali impostati (paga oraria, aliquote fiscali e maggiorazioni). Puoi affinare questi dati caricando le tue buste paga ufficiali nell'Analizzatore Cedolini.
        </p>
      </div>

    </div>
  );
};

