import React, { useState } from 'react';
import { Palmtree, Calendar, Plus, Clock, CheckCircle, AlertCircle, Trash2, Edit2, FileText, Baby, Calculator, Info, ShieldCheck, HeartHandshake } from 'lucide-react';
import { Shift, VacationSettings, ContractSettings } from '../types';
import { formatDateToIso } from '../utils/shiftUtils';

interface VacationTrackerViewProps {
  shifts: Shift[];
  vacationSettings: VacationSettings;
  contract?: ContractSettings;
  onUpdateSettings: (settings: VacationSettings) => void;
  onAddVacationShift: (startDate: string, endDate: string, type: 'ferie' | 'permesso' | 'congedo', notes: string) => void;
  onDeleteShift: (id: string) => void;
}

export const VacationTrackerView: React.FC<VacationTrackerViewProps> = ({
  shifts,
  vacationSettings,
  contract,
  onUpdateSettings,
  onAddVacationShift,
  onDeleteShift,
}) => {
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showCongedoConfig, setShowCongedoConfig] = useState(false);
  const [startDate, setStartDate] = useState(formatDateToIso(new Date()));
  const [endDate, setEndDate] = useState(formatDateToIso(new Date()));
  const [requestType, setRequestType] = useState<'ferie' | 'permesso' | 'congedo'>('ferie');
  const [requestNotes, setRequestNotes] = useState('');

  // Filter all shifts that are ferie, permesso or congedo
  const ferieShifts = shifts.filter((s) => s.category === 'ferie');
  const permessoShifts = shifts.filter((s) => s.category === 'permesso');
  const congedoShifts = shifts.filter((s) => s.category === 'congedo');
  const historyShifts = [...ferieShifts, ...permessoShifts, ...congedoShifts].sort((a, b) => b.date.localeCompare(a.date));

  // Total used ferie (number of distinct ferie days)
  const usedFerieDays = ferieShifts.length;
  const totalAccruedFerie = vacationSettings.annualAccruedDays + vacationSettings.initialCarriedOverDays;
  const remainingFerieDays = totalAccruedFerie - usedFerieDays;

  // Total used ROL in hours
  const usedRolHours = permessoShifts.reduce((acc, s) => acc + s.workedHours, 0);
  const totalAccruedRol = vacationSettings.rolHoursTotal + vacationSettings.rolHoursCarriedOver;
  const remainingRolHours = totalAccruedRol - usedRolHours;

  // Congedo Parentale Detailed Calculations (D.Lgs 105/2022 & INPS)
  const congedoMaxDays = vacationSettings.congedoParentaleMaxDays ?? 180; // Default 180 gg = 6 mesi individuali
  const congedoPrevDays = vacationSettings.congedoParentaleDaysUsedPreviously ?? 0;
  const congedoAppDays = congedoShifts.length;
  const congedoTotalUsedDays = congedoPrevDays + congedoAppDays;
  const congedoRemainingDays = Math.max(0, congedoMaxDays - congedoTotalUsedDays);
  const congedoRemainingMonths = (congedoRemainingDays / 30).toFixed(1);
  const congedoPayRatePct = vacationSettings.congedoParentalePayRatePct ?? 30; // 30% per l'utente

  // Financial simulation for 1 day of Congedo (8h standard)
  const baseRate = contract?.hourlyRate || 12;
  const dailyBasePay = 8 * baseRate;
  const dailyCongedoAllowance = dailyBasePay * (congedoPayRatePct / 100);
  const dailyDeductionLoss = dailyBasePay - dailyCongedoAllowance;

  // Congedo Config Local State for inline editing
  const [editMaxDays, setEditMaxDays] = useState(congedoMaxDays);
  const [editPayRate, setEditPayRate] = useState(congedoPayRatePct);
  const [editPrevDays, setEditPrevDays] = useState(congedoPrevDays);

  const handleSaveCongedoSettings = () => {
    onUpdateSettings({
      ...vacationSettings,
      congedoParentaleMaxDays: editMaxDays,
      congedoParentalePayRatePct: editPayRate,
      congedoParentaleDaysUsedPreviously: editPrevDays,
    });
    setShowCongedoConfig(false);
  };

  const handleCreateRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) return;
    onAddVacationShift(startDate, endDate, requestType, requestNotes);
    setShowRequestModal(false);
    setRequestNotes('');
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-full overflow-hidden">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-emerald-300 shrink-0">
            <Palmtree className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-xl font-bold leading-snug">Gestione Ferie, Permessi e Congedi</h2>
            <p className="text-[11px] sm:text-xs text-emerald-200/90 leading-tight">
              Monitora il tuo saldo ferie residuo, i permessi ROL, i congedi e inserisci nuove richieste nel calendario.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowRequestModal(true)}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-3.5 py-2.5 bg-white text-emerald-900 rounded-xl text-xs font-bold hover:bg-emerald-50 transition-colors shadow-md cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Registra Assenza / Congedo</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        
        {/* Ferie Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5 sm:pb-3 gap-1">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1.5 sm:p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 shrink-0">
                <Palmtree className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 truncate">Ferie (Giorni)</h3>
            </div>
            <span className="text-[10px] sm:text-xs font-semibold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 shrink-0">
              {remainingFerieDays >= 0 ? `${remainingFerieDays} gg res.` : 'In negativo'}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1.5 sm:gap-2 text-center py-0.5">
            <div className="p-1.5 sm:p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
              <span className="text-[8px] sm:text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold block truncate">Spettanti</span>
              <p className="text-xs sm:text-base font-bold text-slate-800 dark:text-slate-200 truncate">{totalAccruedFerie} gg</p>
            </div>
            <div className="p-1.5 sm:p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
              <span className="text-[8px] sm:text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold block truncate">Godute</span>
              <p className="text-xs sm:text-base font-bold text-emerald-700 dark:text-emerald-400 truncate">{usedFerieDays} gg</p>
            </div>
            <div className="p-1.5 sm:p-2.5 bg-emerald-50 dark:bg-emerald-950/80 rounded-xl border border-emerald-200/80 dark:border-emerald-800 overflow-hidden">
              <span className="text-[8px] sm:text-[10px] text-emerald-800 dark:text-emerald-300 uppercase font-bold block truncate">Residuo</span>
              <p className="text-sm sm:text-lg font-bold text-emerald-900 dark:text-emerald-200 truncate">{remainingFerieDays} gg</p>
            </div>
          </div>

          <div className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between pt-0.5">
            <span>Annualità: {vacationSettings.annualAccruedDays} gg</span>
            <span>Arretrati: {vacationSettings.initialCarriedOverDays} gg</span>
          </div>
        </div>

        {/* Permessi Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5 sm:pb-3 gap-1">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1.5 sm:p-2 rounded-xl bg-pink-50 dark:bg-pink-950 text-pink-600 dark:text-pink-400 shrink-0">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 truncate">Permessi ROL (Ore)</h3>
            </div>
            <span className="text-[10px] sm:text-xs font-semibold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-pink-100 dark:bg-pink-950 text-pink-800 dark:text-pink-300 shrink-0">
              {remainingRolHours.toFixed(1)}h res.
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1.5 sm:gap-2 text-center py-0.5">
            <div className="p-1.5 sm:p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
              <span className="text-[8px] sm:text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold block truncate">Spettanti</span>
              <p className="text-xs sm:text-base font-bold text-slate-800 dark:text-slate-200 truncate">{totalAccruedRol}h</p>
            </div>
            <div className="p-1.5 sm:p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
              <span className="text-[8px] sm:text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold block truncate">Utilizzate</span>
              <p className="text-xs sm:text-base font-bold text-pink-700 dark:text-pink-400 truncate">{usedRolHours.toFixed(1)}h</p>
            </div>
            <div className="p-1.5 sm:p-2.5 bg-pink-50 dark:bg-pink-950/80 rounded-xl border border-pink-200/80 dark:border-pink-800 overflow-hidden">
              <span className="text-[8px] sm:text-[10px] text-pink-800 dark:text-pink-300 uppercase font-bold block truncate">Residuo</span>
              <p className="text-sm sm:text-lg font-bold text-pink-900 dark:text-pink-200 truncate">{remainingRolHours.toFixed(1)}h</p>
            </div>
          </div>

          <div className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between pt-0.5">
            <span>Annuoli: {vacationSettings.rolHoursTotal}h</span>
            <span>Arretrati: {vacationSettings.rolHoursCarriedOver}h</span>
          </div>
        </div>

        {/* Congedi Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5 sm:pb-3 gap-1">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1.5 sm:p-2 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 shrink-0">
                <Baby className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 truncate">Congedo Parentale</h3>
            </div>
            <span className="text-[10px] sm:text-xs font-semibold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 shrink-0">
              {congedoRemainingDays} gg res. ({congedoRemainingMonths} mesi)
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1.5 sm:gap-2 text-center py-0.5">
            <div className="p-1.5 sm:p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
              <span className="text-[8px] sm:text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold block truncate">Di Legge</span>
              <p className="text-xs sm:text-base font-bold text-slate-800 dark:text-slate-200 truncate">{congedoMaxDays} gg</p>
            </div>
            <div className="p-1.5 sm:p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
              <span className="text-[8px] sm:text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold block truncate">Fruiti Totali</span>
              <p className="text-xs sm:text-base font-bold text-purple-700 dark:text-purple-400 truncate">{congedoTotalUsedDays} gg</p>
            </div>
            <div className="p-1.5 sm:p-2.5 bg-purple-50 dark:bg-purple-950/80 rounded-xl border border-purple-200/80 dark:border-purple-800 overflow-hidden">
              <span className="text-[8px] sm:text-[10px] text-purple-800 dark:text-purple-300 uppercase font-bold block truncate">Rimanenti</span>
              <p className="text-sm sm:text-lg font-bold text-purple-900 dark:text-purple-200 truncate">{congedoRemainingDays} gg</p>
            </div>
          </div>

          <div className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between pt-0.5">
            <span>Indennità: {congedoPayRatePct}% INPS</span>
            <span>Precedenti: {congedoPrevDays} gg</span>
          </div>
        </div>

      </div>

      {/* Dettaglio Legge e Calcolatore Economico Congedo Parentale (30%) */}
      <div className="bg-gradient-to-br from-purple-900/90 via-indigo-900 to-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 text-white shadow-xl space-y-4 border border-purple-500/30">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-500/20 border border-purple-400/30 rounded-2xl text-purple-300 shrink-0">
              <Baby className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold flex items-center gap-2 text-white">
                <span>Monitoraggio Congedo Parentale (D.Lgs 105/2022 & INPS)</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-purple-500/30 text-purple-200 font-extrabold border border-purple-400/30">
                  Indennizzato al {congedoPayRatePct}%
                </span>
              </h3>
              <p className="text-xs text-purple-200/80">
                Calcolo dei giorni spettanti di legge, residuo usufruibile e impatto economico stimato in busta paga.
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowCongedoConfig(!showCongedoConfig)}
            className="px-3.5 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Modifica Parametri Congedo</span>
          </button>
        </div>

        {/* Inline Config Drawer */}
        {showCongedoConfig && (
          <div className="p-4 bg-white/10 border border-white/20 rounded-2xl space-y-3">
            <h4 className="text-xs font-bold text-purple-200 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-purple-300" />
              <span>Personalizza Diritto e Giorni Fruiti per il Congedo Parentale</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-purple-200 mb-1">
                  Giorni di Legge Spettanti (Max)
                </label>
                <input
                  type="number"
                  value={editMaxDays}
                  onChange={(e) => setEditMaxDays(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-900/90 border border-purple-400/40 text-white rounded-xl"
                />
                <span className="text-[9px] text-purple-300/80 block mt-0.5">180 gg = 6 mesi per genitore</span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-purple-200 mb-1">
                  Tasso di Indennità retributiva (%)
                </label>
                <select
                  value={editPayRate}
                  onChange={(e) => setEditPayRate(parseInt(e.target.value) || 30)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-900/90 border border-purple-400/40 text-white rounded-xl font-bold"
                >
                  <option value={30}>30% (Indennità INPS standard - Impostato)</option>
                  <option value={80}>80% (Primo mese elevato)</option>
                  <option value={100}>100% (Retribuzione intera)</option>
                  <option value={0}>0% (Non retribuito)</option>
                </select>
                <span className="text-[9px] text-purple-300/80 block mt-0.5">Pagamento selezionato per la tua situazione</span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-purple-200 mb-1">
                  Giorni già fruiti in precedenza
                </label>
                <input
                  type="number"
                  value={editPrevDays}
                  onChange={(e) => setEditPrevDays(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-900/90 border border-purple-400/40 text-white rounded-xl"
                />
                <span className="text-[9px] text-purple-300/80 block mt-0.5">Fruiti prima di questa app</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowCongedoConfig(false)}
                className="px-3 py-1.5 text-xs text-purple-200 hover:text-white"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={handleSaveCongedoSettings}
                className="px-4 py-1.5 bg-purple-500 text-white text-xs font-bold rounded-xl hover:bg-purple-400"
              >
                Salva Impostazioni
              </button>
            </div>
          </div>
        )}

        {/* Progress bar of legal usage */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-purple-200 font-semibold">
            <span>Progressivo Giorni Utilizzati: <strong className="text-white">{congedoTotalUsedDays} giorni</strong> ({congedoPrevDays} prec. + {congedoAppDays} in app)</span>
            <span>Residuo Spettante: <strong className="text-emerald-300">{congedoRemainingDays} giorni (~{congedoRemainingMonths} mesi)</strong> di {congedoMaxDays} gg</span>
          </div>

          <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden border border-white/10 p-0.5">
            <div
              className="h-full bg-gradient-to-r from-purple-500 via-indigo-400 to-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.round((congedoTotalUsedDays / congedoMaxDays) * 100))}%` }}
            />
          </div>
        </div>

        {/* Financial Calculation Simulation Box */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
          <div className="p-3 bg-white/5 border border-white/10 rounded-2xl space-y-1">
            <span className="text-[10px] uppercase font-bold text-purple-300 block">Diritto di Legge INPS</span>
            <p className="text-sm font-bold text-white">Fino a 6 Mesi (180 gg)</p>
            <p className="text-[11px] text-purple-200/80">Spettanza individuale per genitore dipendente entro 12 anni di vita del bambino.</p>
          </div>

          <div className="p-3 bg-white/5 border border-white/10 rounded-2xl space-y-1">
            <span className="text-[10px] uppercase font-bold text-purple-300 block">Trattamento Economico</span>
            <p className="text-sm font-bold text-emerald-300">Indennità al {congedoPayRatePct}%</p>
            <p className="text-[11px] text-purple-200/80">
              Su retribuzione oraria base di {baseRate.toFixed(2)} €/h: per 1 giorno di congedo (8h) ricevi <strong>+{dailyCongedoAllowance.toFixed(2)} €</strong> (trattenuta netta -{dailyDeductionLoss.toFixed(2)} €).
            </p>
          </div>

          <div className="p-3 bg-white/5 border border-white/10 rounded-2xl space-y-1">
            <span className="text-[10px] uppercase font-bold text-purple-300 block">Stato nel Calendario</span>
            <p className="text-sm font-bold text-purple-200">{congedoAppDays} giornate registrate</p>
            <p className="text-[11px] text-purple-200/80">I turni inseriti come "Congedo" vengono conteggiati automaticamente nel saldo e nella previsione stipendiale.</p>
          </div>
        </div>
      </div>

      {/* History Log */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
        <div className="p-3 sm:p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 sm:gap-2">
          <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Storico Ferie, Permessi e Congedi</span>
          </h3>
          <span className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">Totale: {historyShifts.length} eventi</span>
        </div>

        {/* Mobile View: Fixed vertical card list (No horizontal scroll) */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800 sm:hidden">
          {historyShifts.length === 0 ? (
            <div className="p-6 text-center text-slate-400 dark:text-slate-500 text-xs">
              Nessun evento di ferie, permesso o congedo ancora registrato nel calendario.
            </div>
          ) : (
            historyShifts.map((shift) => (
              <div key={shift.id} className="p-3 space-y-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-bold text-xs text-slate-900 dark:text-slate-100">{shift.date}</span>
                    <span
                      className={`px-2 py-0.5 rounded-md font-semibold text-[10px] truncate max-w-[150px] ${
                        shift.category === 'ferie'
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                          : shift.category === 'permesso'
                          ? 'bg-pink-100 dark:bg-pink-950 text-pink-800 dark:text-pink-300'
                          : 'bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300'
                      }`}
                    >
                      {shift.type} ({shift.category})
                    </span>
                  </div>
                  <button
                    onClick={() => onDeleteShift(shift.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer shrink-0"
                    title="Elimina dal calendario"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 gap-2">
                  <span className="font-medium text-[11px]">
                    {shift.category === 'ferie' || shift.category === 'congedo'
                      ? 'Giornata Intera'
                      : `${shift.startTime} - ${shift.endTime} (${shift.workedHours}h)`}
                  </span>
                  {shift.notes && (
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 truncate italic">
                      {shift.notes}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop View: Standard Table */}
        <div className="hidden sm:block">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3">Data</th>
                <th className="p-3">Tipo</th>
                <th className="p-3">Orario / Durata</th>
                <th className="p-3">Note</th>
                <th className="p-3 text-right">Azione</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {historyShifts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400 dark:text-slate-500">
                    Nessun evento di ferie, permesso o congedo ancora registrato nel calendario.
                  </td>
                </tr>
              ) : (
                historyShifts.map((shift) => (
                  <tr key={shift.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="p-3 font-bold text-slate-900 dark:text-slate-100">{shift.date}</td>
                    <td className="p-3 capitalize">
                      <span
                        className={`px-2 py-0.5 rounded-md font-semibold text-[10px] ${
                          shift.category === 'ferie'
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                            : shift.category === 'permesso'
                            ? 'bg-pink-100 dark:bg-pink-950 text-pink-800 dark:text-pink-300'
                            : 'bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300'
                        }`}
                      >
                        {shift.type} ({shift.category})
                      </span>
                    </td>
                    <td className="p-3 text-slate-700 dark:text-slate-300 font-medium">
                      {shift.category === 'ferie' || shift.category === 'congedo'
                        ? 'Giornata Intera'
                        : `${shift.startTime} - ${shift.endTime} (${shift.workedHours}h)`}
                    </td>
                    <td className="p-3 text-slate-500 dark:text-slate-400">{shift.notes || '-'}</td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => onDeleteShift(shift.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                        title="Elimina dal calendario"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Vacation Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900">Registra Ferie / Permesso / Congedo</h3>
              <button
                onClick={() => setShowRequestModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRequest} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo Assenza</label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setRequestType('ferie')}
                    className={`py-2 text-[11px] font-bold rounded-xl border transition-all ${
                      requestType === 'ferie'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    🏖️ Ferie
                  </button>
                  <button
                    type="button"
                    onClick={() => setRequestType('permesso')}
                    className={`py-2 text-[11px] font-bold rounded-xl border transition-all ${
                      requestType === 'permesso'
                        ? 'bg-pink-50 border-pink-500 text-pink-800'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    ⏱️ Permesso ROL
                  </button>
                  <button
                    type="button"
                    onClick={() => setRequestType('congedo')}
                    className={`py-2 text-[11px] font-bold rounded-xl border transition-all ${
                      requestType === 'congedo'
                        ? 'bg-purple-50 border-purple-500 text-purple-800'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    🏛️ Congedo
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Data Inizio</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Data Fine</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Note (Opzionale)</label>
                <input
                  type="text"
                  value={requestNotes}
                  onChange={(e) => setRequestNotes(e.target.value)}
                  placeholder="es. Vacanze estive, Visita medica..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm"
                >
                  Registra nel Calendario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
