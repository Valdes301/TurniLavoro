import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Clock, 
  Calendar, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  Sparkles, 
  BarChart3, 
  PieChart as PieIcon, 
  ShieldAlert,
  HelpCircle,
  FileSpreadsheet,
  Zap
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
  AreaChart, 
  Area,
  LineChart,
  Line
} from 'recharts';
import { SavedPayslipRecord } from '../types';

interface AnnualPayslipChartsViewProps {
  records: SavedPayslipRecord[];
  onSaveRecord: (record: SavedPayslipRecord) => void;
  onDeleteRecord: (id: string) => void;
  onSeedDemoData: () => void;
}

const MONTH_NAMES_IT = [
  'Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu',
  'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'
];

export const AnnualPayslipChartsView: React.FC<AnnualPayslipChartsViewProps> = ({
  records,
  onSaveRecord,
  onDeleteRecord,
  onSeedDemoData,
}) => {
  const [selectedYear, setSelectedYear] = useState<string>('2026');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Partial<SavedPayslipRecord> | null>(null);

  // Available years from records or defaults
  const availableYears = useMemo(() => {
    const set = new Set<string>(['2026', '2025']);
    records.forEach((r) => {
      if (r.monthIso) set.add(r.monthIso.split('-')[0]);
    });
    return Array.from(set).sort().reverse();
  }, [records]);

  // Aggregate 12 months data for selected year
  const chartData = useMemo(() => {
    return MONTH_NAMES_IT.map((monthName, idx) => {
      const monthNumStr = String(idx + 1).padStart(2, '0');
      const monthIso = `${selectedYear}-${monthNumStr}`;
      const rec = records.find((r) => r.monthIso === monthIso);

      return {
        monthName,
        monthIso,
        netAmount: rec ? rec.netAmount : 0,
        grossAmount: rec ? rec.grossAmount : 0,
        workedHours: rec ? rec.workedHours : 0,
        overtimeHours: rec ? rec.overtimeHours : 0,
        ferieDays: rec ? rec.ferieDays : 0,
        permessiHours: rec ? rec.permessiHours : 0,
        irpefTax: rec ? rec.irpefTax || 0 : 0,
        inpsDeduction: rec ? rec.inpsDeduction || 0 : 0,
        tfrAccrued: rec ? rec.tfrAccrued || 0 : 0,
        isSaved: Boolean(rec),
      };
    });
  }, [records, selectedYear]);

  // Annual Totals & Metrics
  const annualMetrics = useMemo(() => {
    const savedForYear = chartData.filter((d) => d.isSaved);
    const count = savedForYear.length;

    const totalNet = savedForYear.reduce((acc, d) => acc + d.netAmount, 0);
    const totalGross = savedForYear.reduce((acc, d) => acc + d.grossAmount, 0);
    const totalWorked = savedForYear.reduce((acc, d) => acc + d.workedHours, 0);
    const totalOvertime = savedForYear.reduce((acc, d) => acc + d.overtimeHours, 0);
    const totalFerie = savedForYear.reduce((acc, d) => acc + d.ferieDays, 0);
    const totalPermessi = savedForYear.reduce((acc, d) => acc + d.permessiHours, 0);
    const totalTaxes = savedForYear.reduce((acc, d) => acc + (d.irpefTax + d.inpsDeduction), 0);
    const avgNet = count > 0 ? totalNet / count : 0;

    return {
      count,
      totalNet,
      totalGross,
      totalWorked,
      totalOvertime,
      totalFerie,
      totalPermessi,
      totalTaxes,
      avgNet,
    };
  }, [chartData]);

  // Open Form modal
  const handleOpenAddEdit = (monthIso?: string) => {
    if (monthIso) {
      const existing = records.find((r) => r.monthIso === monthIso);
      if (existing) {
        setEditingRecord({ ...existing });
      } else {
        setEditingRecord({
          id: monthIso,
          monthIso,
          netAmount: 1650,
          grossAmount: 2200,
          workedHours: 160,
          overtimeHours: 10,
          ferieDays: 2,
          permessiHours: 4,
          irpefTax: 350,
          inpsDeduction: 200,
          tfrAccrued: 135,
        });
      }
    } else {
      setEditingRecord({
        id: `${selectedYear}-01`,
        monthIso: `${selectedYear}-01`,
        netAmount: 1650,
        grossAmount: 2200,
        workedHours: 160,
        overtimeHours: 10,
        ferieDays: 2,
        permessiHours: 4,
        irpefTax: 350,
        inpsDeduction: 200,
        tfrAccrued: 135,
      });
    }
    setIsModalOpen(true);
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord || !editingRecord.monthIso) return;

    const recordToSave: SavedPayslipRecord = {
      id: editingRecord.monthIso,
      monthIso: editingRecord.monthIso,
      netAmount: Number(editingRecord.netAmount) || 0,
      grossAmount: Number(editingRecord.grossAmount) || 0,
      workedHours: Number(editingRecord.workedHours) || 0,
      overtimeHours: Number(editingRecord.overtimeHours) || 0,
      ferieDays: Number(editingRecord.ferieDays) || 0,
      permessiHours: Number(editingRecord.permessiHours) || 0,
      irpefTax: Number(editingRecord.irpefTax) || 0,
      inpsDeduction: Number(editingRecord.inpsDeduction) || 0,
      tfrAccrued: Number(editingRecord.tfrAccrued) || 0,
      generalSummary: editingRecord.generalSummary || 'Inserimento manuale / aggiornato',
      savedAt: new Date().toISOString(),
    };

    onSaveRecord(recordToSave);
    setIsModalOpen(false);
    setEditingRecord(null);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Controls Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Storico & Analisi Annuale Buste Paga ({selectedYear})
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Monitora l'andamento del tuo netto in busta, straordinari accumulati, tassazione IRPEF e ferie durante l'anno.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Year selector */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            {availableYears.map((yr) => (
              <button
                key={yr}
                onClick={() => setSelectedYear(yr)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  selectedYear === yr
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                {yr}
              </button>
            ))}
          </div>

          <button
            onClick={() => handleOpenAddEdit()}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-2xs cursor-pointer transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Aggiungi Cedolino</span>
          </button>


        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5 text-emerald-500" /> Totale Netto Incassato
          </span>
          <div className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
            {annualMetrics.totalNet.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
          </div>
          <p className="text-[11px] text-slate-500">
            Media mensile: <strong>{annualMetrics.avgNet.toFixed(2)} €/mese</strong>
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-blue-500" /> Totale Retribuzione Lorda
          </span>
          <div className="text-xl font-extrabold text-blue-600 dark:text-blue-400">
            {annualMetrics.totalGross.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
          </div>
          <p className="text-[11px] text-slate-500">
            Su {annualMetrics.count} cedolini salvati
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-purple-500" /> Ore Straordinario
          </span>
          <div className="text-xl font-extrabold text-purple-600 dark:text-purple-400">
            {annualMetrics.totalOvertime.toFixed(1)} h
          </div>
          <p className="text-[11px] text-slate-500">
            Tot. Ore Ordinari: {annualMetrics.totalWorked.toFixed(1)} h
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-500" /> Totale Trattenute (IRPEF + INPS)
          </span>
          <div className="text-xl font-extrabold text-rose-600 dark:text-rose-400">
            {annualMetrics.totalTaxes.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
          </div>
          <p className="text-[11px] text-slate-500">
            Tassazione & Previdenza trattenuta
          </p>
        </div>

      </div>

      {/* RECHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* CHART 1: Net vs Gross Salary */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Stipendio Mensile: Lordo vs Netto (€)
              </h3>
              <p className="text-[11px] text-slate-500">
                Confronto retribuzione lorda contrattuale e netto in busta paga
              </p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="monthName" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip 
                  formatter={(value: any) => [`${Number(value).toFixed(2)} €`, '']}
                  contentStyle={{ borderRadius: '12px', fontSize: '12px', backgroundColor: '#0f172a', color: '#fff', border: 'none' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="grossAmount" name="Lordo (€)" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="netAmount" name="Netto (€)" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 2: Worked Hours & Overtime */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Ore Lavorate & Straordinario (Ore/Mese)
              </h3>
              <p className="text-[11px] text-slate-500">
                Ore ordinarie e straordinari retribuiti
              </p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="monthName" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip 
                  formatter={(value: any) => [`${Number(value).toFixed(1)} h`, '']}
                  contentStyle={{ borderRadius: '12px', fontSize: '12px', backgroundColor: '#0f172a', color: '#fff', border: 'none' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="workedHours" name="Ore Ordinarie (h)" fill="#3b82f6" stackId="hours" radius={[0, 0, 0, 0]} />
                <Bar dataKey="overtimeHours" name="Straordinari (h)" fill="#a855f7" stackId="hours" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 3: Ferie & Permessi ROL */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Ferie (Giorni) & Permessi ROL (Ore)
              </h3>
              <p className="text-[11px] text-slate-500">
                Assenze retribuite fruite nel corso dell'anno
              </p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="monthName" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', fontSize: '12px', backgroundColor: '#0f172a', color: '#fff', border: 'none' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Area type="monotone" dataKey="ferieDays" name="Ferie Fruite (gg)" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.2} />
                <Area type="monotone" dataKey="permessiHours" name="Permessi ROL (h)" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 4: Taxes & Deductions Breakdown */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Imposte IRPEF & Contributi INPS (€)
              </h3>
              <p className="text-[11px] text-slate-500">
                Andamento trattenute IRPEF e contributi previdenziali a carico dipendente
              </p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="monthName" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip 
                  formatter={(value: any) => [`${Number(value).toFixed(2)} €`, '']}
                  contentStyle={{ borderRadius: '12px', fontSize: '12px', backgroundColor: '#0f172a', color: '#fff', border: 'none' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="irpefTax" name="IRPEF (€)" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="inpsDeduction" name="INPS (€)" fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* MONTHLY RECORDS TABLE */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Registro Cedolini Salvati ({selectedYear})
            </h3>
            <p className="text-xs text-slate-500">
              Clicca su una riga per modificare i dati o inserire un mese mancante.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold bg-slate-50 dark:bg-slate-950">
                <th className="py-2.5 px-3">Mese</th>
                <th className="py-2.5 px-3">Stato</th>
                <th className="py-2.5 px-3 text-right">Netto (€)</th>
                <th className="py-2.5 px-3 text-right">Lordo (€)</th>
                <th className="py-2.5 px-3 text-right">Ore Ord.</th>
                <th className="py-2.5 px-3 text-right">Straordinari</th>
                <th className="py-2.5 px-3 text-right">Ferie (gg)</th>
                <th className="py-2.5 px-3 text-right">IRPEF (€)</th>
                <th className="py-2.5 px-3 text-center">Azione</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {chartData.map((d) => (
                <tr 
                  key={d.monthIso}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-slate-100">
                    {d.monthName} {selectedYear}
                  </td>
                  <td className="py-2.5 px-3">
                    {d.isSaved ? (
                      <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded-full font-semibold text-[10px]">
                        Salvato
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-full text-[10px]">
                        Vuoto
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                    {d.isSaved ? `${d.netAmount.toFixed(2)} €` : '-'}
                  </td>
                  <td className="py-2.5 px-3 text-right font-medium text-slate-700 dark:text-slate-300">
                    {d.isSaved ? `${d.grossAmount.toFixed(2)} €` : '-'}
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-400">
                    {d.isSaved ? `${d.workedHours.toFixed(1)} h` : '-'}
                  </td>
                  <td className="py-2.5 px-3 text-right text-purple-600 dark:text-purple-400 font-semibold">
                    {d.isSaved ? `${d.overtimeHours.toFixed(1)} h` : '-'}
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-400">
                    {d.isSaved ? `${d.ferieDays} gg` : '-'}
                  </td>
                  <td className="py-2.5 px-3 text-right text-rose-600 dark:text-rose-400 font-medium">
                    {d.isSaved ? `${d.irpefTax.toFixed(2)} €` : '-'}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleOpenAddEdit(d.monthIso)}
                        className="p-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg"
                        title="Modifica o inserisci dati"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      {d.isSaved && (
                        <button
                          onClick={() => onDeleteRecord(d.monthIso)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg"
                          title="Elimina cedolino"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD / EDIT MODAL */}
      {isModalOpen && editingRecord && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl max-w-lg w-full space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
                Inserisci / Modifica Cedolino Paga
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Mese di Riferimento (YYYY-MM):
                </label>
                <input
                  type="month"
                  value={editingRecord.monthIso || `${selectedYear}-01`}
                  onChange={(e) => setEditingRecord({ ...editingRecord, monthIso: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-slate-900 dark:text-slate-100"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Netto in Busta (€):
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingRecord.netAmount ?? ''}
                    onChange={(e) => setEditingRecord({ ...editingRecord, netAmount: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 font-bold"
                    placeholder="1650.00"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Lordo Contrattuale (€):
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingRecord.grossAmount ?? ''}
                    onChange={(e) => setEditingRecord({ ...editingRecord, grossAmount: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100"
                    placeholder="2200.00"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Ore Ordinarie (h):
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={editingRecord.workedHours ?? ''}
                    onChange={(e) => setEditingRecord({ ...editingRecord, workedHours: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100"
                    placeholder="160"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Straordinari Retribuiti (h):
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={editingRecord.overtimeHours ?? ''}
                    onChange={(e) => setEditingRecord({ ...editingRecord, overtimeHours: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100"
                    placeholder="12"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Ferie Fruite (Giorni):
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={editingRecord.ferieDays ?? ''}
                    onChange={(e) => setEditingRecord({ ...editingRecord, ferieDays: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100"
                    placeholder="2"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Permessi ROL Fruiti (Ore):
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={editingRecord.permessiHours ?? ''}
                    onChange={(e) => setEditingRecord({ ...editingRecord, permessiHours: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100"
                    placeholder="4"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Ritenuta IRPEF (€):
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingRecord.irpefTax ?? ''}
                    onChange={(e) => setEditingRecord({ ...editingRecord, irpefTax: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100"
                    placeholder="350.00"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Contributi INPS (€):
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingRecord.inpsDeduction ?? ''}
                    onChange={(e) => setEditingRecord({ ...editingRecord, inpsDeduction: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100"
                    placeholder="200.00"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-semibold hover:bg-slate-200"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-2xs"
                >
                  Salva Cedolino
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
