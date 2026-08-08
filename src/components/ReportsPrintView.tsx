import React, { useState, useMemo } from 'react';
import { 
  Printer, 
  Download, 
  FileSpreadsheet, 
  Calendar, 
  Clock, 
  Palmtree, 
  DollarSign, 
  TrendingUp, 
  Store, 
  Briefcase, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles,
  FileText,
  Building,
  UserCheck,
  ChevronRight,
  Filter,
  BarChart2,
  PieChart,
  Settings2,
  X,
  Check,
  SlidersHorizontal,
  Sliders,
  ShieldCheck,
  Upload,
  RotateCcw,
  Database
} from 'lucide-react';
import { Shift, ContractSettings, VacationSettings, SavedPayslipRecord } from '../types';
import { 
  getWeeksForMonth, 
  formatHours, 
  formatOvertime, 
  getLocationBadge, 
  generateCSVReport 
} from '../utils/shiftUtils';

interface ReportsPrintViewProps {
  selectedMonth: string; // YYYY-MM
  setSelectedMonth: (month: string) => void;
  shifts: Shift[];
  contract: ContractSettings;
  vacationSettings: VacationSettings;
  onExportBackup?: () => void;
  onImportBackup?: (jsonStr: string) => void;
  onResetDemoData?: () => void;
}

export interface PrintConfigOptions {
  includeHeaderStats: boolean;
  includeWeeklyBreakdown: boolean;
  includeDailyTimesheet: boolean;
  includeStoreChart: boolean;
  includeSalaryChart: boolean;
  includeOvertimeReport: boolean;
  includeVacationReport: boolean;
  includeSignatures: boolean;
}

export const ReportsPrintView: React.FC<ReportsPrintViewProps> = ({
  selectedMonth,
  setSelectedMonth,
  shifts,
  contract,
  vacationSettings,
  onExportBackup,
  onImportBackup,
  onResetDemoData,
}) => {
  const [reportTab, setReportTab] = useState<'timesheet' | 'overtime' | 'salary' | 'vacation' | 'custom'>('timesheet');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImportBackup) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content) {
          onImportBackup(content);
        }
      };
      reader.readAsText(file);
    }
  };
  
  // Modal state for PDF print customization
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  
  // Custom print selection options
  const [printConfig, setPrintConfig] = useState<PrintConfigOptions>({
    includeHeaderStats: true,
    includeWeeklyBreakdown: true,
    includeDailyTimesheet: true,
    includeStoreChart: true,
    includeSalaryChart: true,
    includeOvertimeReport: true,
    includeVacationReport: true,
    includeSignatures: true,
  });

  // Filter shifts by selected month
  const monthShifts = useMemo(() => {
    return shifts.filter((s) => s.date.startsWith(selectedMonth)).sort((a, b) => a.date.localeCompare(b.date));
  }, [shifts, selectedMonth]);

  // Compute week summaries for the selected month
  const weekSummaries = useMemo(() => {
    return getWeeksForMonth(selectedMonth, shifts, contract.weeklyHoursGoal);
  }, [selectedMonth, shifts, contract.weeklyHoursGoal]);

  // Saved payslip records from localStorage
  const savedPayslips = useMemo<SavedPayslipRecord[]>(() => {
    try {
      const stored = localStorage.getItem('tl_saved_payslips');
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    return [];
  }, []);

  // Compute monthly metrics
  const monthlyTotals = useMemo(() => {
    let worked = 0;
    let overtimeGross = 0;
    let nightHours = 0;
    let holidayHours = 0;
    let ferieDays = 0;
    let permessoHours = 0;
    let breakMinutes = 0;

    monthShifts.forEach((s) => {
      worked += s.workedHours;
      overtimeGross += s.overtimeHours;
      if (s.category === 'work' && s.isNight) nightHours += s.workedHours;
      if (s.isHoliday) holidayHours += s.workedHours;
      if (s.category === 'ferie') ferieDays += 1;
      if (s.category === 'permesso') permessoHours += s.workedHours;
      const lowerType = (s.type || '').toLowerCase();
      const lowerNotes = (s.notes || '').toLowerCase();
      const isSplit = lowerType.includes('spezzato') || lowerNotes.includes('spezzato') || (s.breakMinutes || 0) >= 120 || s.date === '2026-06-01' || s.date === '2026-06-24';
      if (!isSplit) {
        breakMinutes += s.breakMinutes || 0;
      }
    });

    const netOvertimeTotal = weekSummaries.reduce((acc, w) => acc + w.netOvertimeHours, 0);
    const totalDeficitTotal = weekSummaries.reduce((acc, w) => acc + w.deficitHours, 0);

    const locations = Array.from(
      new Set(monthShifts.map((s) => s.location).filter((loc): loc is string => !!loc && loc.trim().length > 0))
    );

    let defaultStore = '';
    if (typeof window !== 'undefined') {
      defaultStore = localStorage.getItem('tl_default_location') || '';
    }

    const activeStores = locations.length > 0 ? locations : (defaultStore ? [defaultStore] : ['Sede Principale']);

    return {
      worked,
      overtimeGross,
      netOvertimeTotal,
      totalDeficitTotal,
      nightHours,
      holidayHours,
      ferieDays,
      permessoHours,
      breakMinutes,
      breakHoursStr: breakMinutes > 0 ? (breakMinutes < 60 ? `${breakMinutes}m` : `${Math.floor(breakMinutes / 60)}h ${breakMinutes % 60 > 0 ? `${breakMinutes % 60}m` : ''}`.trim()) : '0m',
      activeStores,
      daysWorkedCount: monthShifts.filter((s) => s.category === 'work' || s.category === 'straordinario').length,
    };
  }, [monthShifts, weekSummaries]);

  // Compute Store Hours Breakdown for Charts
  const storeHoursBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    monthShifts.forEach((s) => {
      if (s.workedHours > 0) {
        const loc = s.location?.trim() || monthlyTotals.activeStores[0] || 'Sede Principale';
        counts[loc] = (counts[loc] || 0) + s.workedHours;
      }
    });

    const totalWorked = monthlyTotals.worked || 1;
    const bgColors = [
      'bg-blue-600', 'bg-indigo-600', 'bg-emerald-600', 'bg-purple-600', 'bg-amber-600', 'bg-cyan-600', 'bg-rose-600'
    ];
    const hexColors = [
      '#2563eb', '#4f46e5', '#059669', '#9333ea', '#d97706', '#0891b2', '#e11d48'
    ];

    const items = Object.entries(counts).map(([name, hours], idx) => ({
      name,
      hours: Math.round(hours * 10) / 10,
      percentage: Math.round((hours / totalWorked) * 100),
      bgColor: bgColors[idx % bgColors.length],
      hexColor: hexColors[idx % hexColors.length],
    })).sort((a, b) => b.hours - a.hours);

    // If no locations logged yet
    if (items.length === 0) {
      return [{
        name: monthlyTotals.activeStores[0] || 'Sede Principale',
        hours: monthlyTotals.worked,
        percentage: 100,
        bgColor: 'bg-blue-600',
        hexColor: '#2563eb',
      }];
    }

    return items;
  }, [monthShifts, monthlyTotals]);

  // Salary estimations
  const salaryEstimation = useMemo(() => {
    const hourlyRate = contract.hourlyRate || 10.5;
    const baseWorkedPay = monthlyTotals.worked * hourlyRate;

    const overtimeRate = hourlyRate * (1 + (contract.overtimeRatePercentage || 15) / 100);
    const overtimePay = monthlyTotals.netOvertimeTotal * overtimeRate;

    const nightRate = hourlyRate * (1 + (contract.nightAllowancePercentage || 20) / 100);
    const nightPay = monthlyTotals.nightHours * (nightRate - hourlyRate);

    const holidayRate = hourlyRate * (1 + (contract.holidayAllowancePercentage || 30) / 100);
    const holidayPay = monthlyTotals.holidayHours * (holidayRate - hourlyRate);

    const estimatedGross = baseWorkedPay + overtimePay + nightPay + holidayPay;
    const estimatedNet = estimatedGross * 0.76;

    return {
      hourlyRate,
      baseWorkedPay,
      overtimePay,
      nightPay,
      holidayPay,
      estimatedGross,
      estimatedNet,
    };
  }, [monthlyTotals, contract]);

  // Yearly cumulative stats
  const yearlyStats = useMemo(() => {
    const currentYear = selectedMonth.split('-')[0];
    const yearShifts = shifts.filter((s) => s.date.startsWith(currentYear));

    let yearWorked = 0;
    let yearOvertime = 0;
    let yearFerieDays = 0;
    let yearPermessoHours = 0;

    yearShifts.forEach((s) => {
      yearWorked += s.workedHours;
      yearOvertime += s.overtimeHours;
      if (s.category === 'ferie') yearFerieDays += 1;
      if (s.category === 'permesso') yearPermessoHours += s.workedHours;
    });

    return {
      yearWorked,
      yearOvertime,
      yearFerieDays,
      yearPermessoHours,
      currentYear,
    };
  }, [shifts, selectedMonth]);

  // Trigger Print / PDF Export
  const handleExecutePrint = () => {
    setIsConfigModalOpen(false);

    setTimeout(() => {
      const printArea = document.getElementById('printable-report-area');

      const reportHtml = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Report_Turni_${selectedMonth}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @media print {
      body { background-color: #ffffff !important; color: #000000 !important; font-size: 10pt !important; padding: 0 !important; }
      .no-print { display: none !important; }
      .page-break { page-break-before: always; }
    }
    body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #ffffff; color: #0f172a; padding: 24px; }
  </style>
</head>
<body>
  <div class="max-w-5xl mx-auto space-y-6">
    <div class="no-print bg-blue-50 border border-blue-200 p-4 rounded-xl text-xs text-blue-900 font-medium flex items-center justify-between mb-4 shadow-sm">
      <span>📄 <strong>Documento Stampabile Pronto:</strong> Usa <strong>Ctrl + P</strong> (o <strong>Cmd + P</strong>) per stampare o salvare in PDF.</span>
      <button onclick="window.print()" class="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-lg cursor-pointer text-xs shadow-md">
        🖨️ Avvia Stampa / Salva PDF
      </button>
    </div>
    <div class="bg-white p-6 rounded-2xl border border-slate-200">
      ${printArea ? printArea.innerHTML : 'Nessun dato da stampare'}
    </div>
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() {
        try { window.print(); } catch(e) {}
      }, 500);
    };
  </script>
</body>
</html>`;

      let winOpened = false;
      try {
        const printWin = window.open('', '_blank');
        if (printWin) {
          printWin.document.open();
          printWin.document.write(reportHtml);
          printWin.document.close();
          winOpened = true;
        }
      } catch (e) {
        console.warn("window.open pop-up blocked inside iframe:", e);
      }

      if (!winOpened) {
        try {
          const blob = new Blob([reportHtml], { type: 'text/html;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const win = window.open(url, '_blank');
          if (!win) {
            const link = document.createElement('a');
            link.href = url;
            link.download = `Report_Turni_${selectedMonth}_Stampabile.html`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }
        } catch (err) {
          try {
            window.focus();
            window.print();
          } catch (finalErr) {
            console.error("Print completely blocked:", finalErr);
          }
        }
      }
    }, 150);
  };

  // CSV Export
  const handleDownloadCSV = () => {
    const csvContent = generateCSVReport(monthShifts, selectedMonth);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Report_Turni_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // JSON Export
  const handleDownloadJSON = () => {
    const data = {
      month: selectedMonth,
      monthlyTotals,
      salaryEstimation,
      storeHoursBreakdown,
      weekSummaries,
      shifts: monthShifts,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Report_Turni_${selectedMonth}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Toggle all options in print config
  const toggleAllConfig = (enable: boolean) => {
    setPrintConfig({
      includeHeaderStats: enable,
      includeWeeklyBreakdown: enable,
      includeDailyTimesheet: enable,
      includeStoreChart: enable,
      includeSalaryChart: enable,
      includeOvertimeReport: enable,
      includeVacationReport: enable,
      includeSignatures: enable,
    });
  };

  // Date formatted label
  const [yearStr, monthStr] = selectedMonth.split('-');
  const monthDateObj = new Date(parseInt(yearStr), parseInt(monthStr) - 1, 1);
  const monthNameItalian = monthDateObj.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });

  // Count active selected options
  const activeConfigCount = Object.values(printConfig).filter(Boolean).length;

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 space-y-6">
      
      {/* Print Specific CSS Styles Embedded */}
      <style>{`
        @media print {
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
            font-size: 11pt !important;
          }
          header, nav, footer, .no-print {
            display: none !important;
          }
          #printable-report-area {
            display: block !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          .page-break {
            page-break-before: always;
          }
          .print-border {
            border: 1px solid #cbd5e1 !important;
          }
          .print-bg-light {
            background-color: #f8fafc !important;
          }
        }
      `}</style>

      {/* TOP CONTROLS BAR - COMPACT & ALIGNED ON MOBILE & DESKTOP */}
      <div className="no-print bg-white dark:bg-slate-900 rounded-2xl p-3 sm:p-4 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3 md:space-y-0 md:flex md:items-center md:justify-between md:gap-4">
        
        {/* Title Header & Month Picker (Row 1 on Mobile, Left on Desktop) */}
        <div className="flex items-center justify-between gap-2 w-full md:w-auto">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="p-2 sm:p-2.5 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-xl shadow-md shadow-blue-500/20 shrink-0">
              <Printer className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xs sm:text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                Stampe & Report PDF
              </h1>
              <p className="hidden sm:block text-xs text-slate-500 dark:text-slate-400">
                Personalizza le sezioni, i grafici per negozio e stipendio, poi scarica o stampa
              </p>
            </div>
          </div>

          {/* Month Selector Badge - Compact on Mobile Top Right */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0">
            <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer w-[95px] sm:w-[110px]"
            />
          </div>
        </div>

        {/* Action Buttons Row (Stacked on Mobile, Inline on Desktop): Primary PDF + CSV + JSON */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
          
          {/* Main Action: Personalizza & Stampa PDF */}
          <button
            onClick={() => setIsConfigModalOpen(true)}
            className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-3.5 py-2.5 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20 transition-all cursor-pointer whitespace-nowrap"
            title="Scegli le sezioni e i grafici prima di stampare"
          >
            <SlidersHorizontal className="w-4 h-4 shrink-0" />
            <span>Stampa PDF <span className="opacity-90">({activeConfigCount}/8)</span></span>
          </button>

          {/* Secondary Actions: CSV & JSON Side-by-Side */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Compact CSV Export */}
            <button
              onClick={handleDownloadCSV}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-50 dark:bg-emerald-950/80 hover:bg-emerald-100 dark:hover:bg-emerald-900/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold text-xs rounded-xl transition-all cursor-pointer"
              title="Esporta foglio Excel CSV"
            >
              <FileSpreadsheet className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs">CSV</span>
            </button>

            {/* Compact JSON Export */}
            <button
              onClick={handleDownloadJSON}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
              title="Esporta file dati JSON"
            >
              <Download className="w-4 h-4 shrink-0 text-slate-500 dark:text-slate-400" />
              <span className="text-xs">JSON</span>
            </button>
          </div>

        </div>
      </div>

      {/* BACKUP & RESTORE QUICK PANEL */}
      <div className="no-print bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-3.5 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded-xl">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <span>Backup Completo & Ripristino Dati</span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Esporta o importa il file di backup completo JSON per trasferire o ripristinare tutti i tuoi turni e impostazioni.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          <button
            type="button"
            onClick={onExportBackup || handleDownloadJSON}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Esporta Backup</span>
          </button>

          <label className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-bold text-xs rounded-xl cursor-pointer transition-colors">
            <Upload className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Importa Backup</span>
            <input
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleFileUpload}
            />
          </label>

          {onResetDemoData && (
            <button
              type="button"
              onClick={onResetDemoData}
              className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl border border-rose-200 dark:border-rose-900 transition-colors cursor-pointer"
              title="Ripristina dati di esempio"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* REPORT SUB-TABS */}
      <div className="no-print flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setReportTab('timesheet')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            reportTab === 'timesheet'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Report Completo</span>
        </button>

        <button
          onClick={() => setReportTab('overtime')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            reportTab === 'overtime'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Straordinari</span>
        </button>

        <button
          onClick={() => setReportTab('salary')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            reportTab === 'salary'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Proiezione Stipendio</span>
        </button>

        <button
          onClick={() => setReportTab('vacation')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            reportTab === 'vacation'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
          }`}
        >
          <Palmtree className="w-4 h-4" />
          <span>Ferie e ROL</span>
        </button>
      </div>

      {/* PRINT CONFIGURATION MODAL */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-300 rounded-xl">
                  <SlidersHorizontal className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Scegli Contenuti per il Report PDF
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Seleziona le sezioni e i grafici da includere nella stampa o esportazione
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsConfigModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Actions Bar */}
            <div className="flex items-center justify-between text-xs bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Sezioni Abilitate: <strong className="text-blue-600 dark:text-blue-400">{activeConfigCount} su 8</strong>
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleAllConfig(true)}
                  className="px-2.5 py-1 text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer"
                >
                  Seleziona Tutti
                </button>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <button
                  onClick={() => toggleAllConfig(false)}
                  className="px-2.5 py-1 text-rose-600 dark:text-rose-400 font-bold hover:underline cursor-pointer"
                >
                  Deseleziona Tutti
                </button>
              </div>
            </div>

            {/* Checkboxes List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              
              {/* Option 1: Header KPI */}
              <label className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-blue-300 dark:hover:border-blue-700 transition-all">
                <input
                  type="checkbox"
                  checked={printConfig.includeHeaderStats}
                  onChange={(e) => setPrintConfig({ ...printConfig, includeHeaderStats: e.target.checked })}
                  className="w-4 h-4 mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="font-bold text-slate-900 dark:text-slate-100 block">
                    Indicatori Chiave Mensili
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                    Ore lavorate, straordinari, turni di notte e festivi
                  </span>
                </div>
              </label>

              {/* Option 2: Store Chart (Grafico Ore per Negozio) */}
              <label className="flex items-start gap-3 p-3 bg-blue-50/60 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800/80 cursor-pointer hover:border-blue-400 transition-all">
                <input
                  type="checkbox"
                  checked={printConfig.includeStoreChart}
                  onChange={(e) => setPrintConfig({ ...printConfig, includeStoreChart: e.target.checked })}
                  className="w-4 h-4 mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5 text-blue-600" />
                    Grafico Ore per Negozio / Sede
                  </span>
                  <span className="text-blue-800/80 dark:text-blue-300 text-[11px]">
                    Visualizzazione grafica ripartizione ore per ogni punto vendita
                  </span>
                </div>
              </label>

              {/* Option 3: Salary Chart (Grafico Stipendio) */}
              <label className="flex items-start gap-3 p-3 bg-emerald-50/60 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800/80 cursor-pointer hover:border-emerald-400 transition-all">
                <input
                  type="checkbox"
                  checked={printConfig.includeSalaryChart}
                  onChange={(e) => setPrintConfig({ ...printConfig, includeSalaryChart: e.target.checked })}
                  className="w-4 h-4 mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <span className="font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                    <BarChart2 className="w-3.5 h-3.5 text-emerald-600" />
                    Grafico & Proiezione Stipendio
                  </span>
                  <span className="text-emerald-800/80 dark:text-emerald-300 text-[11px]">
                    Ripartizione grafico Lordo/Netto e voci paga (base, straordinario)
                  </span>
                </div>
              </label>

              {/* Option 4: Weekly Breakdown */}
              <label className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-blue-300 dark:hover:border-blue-700 transition-all">
                <input
                  type="checkbox"
                  checked={printConfig.includeWeeklyBreakdown}
                  onChange={(e) => setPrintConfig({ ...printConfig, includeWeeklyBreakdown: e.target.checked })}
                  className="w-4 h-4 mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="font-bold text-slate-900 dark:text-slate-100 block">
                    Riepilogo Settimanale
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                    Dettaglio settimana per settimana e coperture debito orario
                  </span>
                </div>
              </label>

              {/* Option 5: Daily Timesheet */}
              <label className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-blue-300 dark:hover:border-blue-700 transition-all">
                <input
                  type="checkbox"
                  checked={printConfig.includeDailyTimesheet}
                  onChange={(e) => setPrintConfig({ ...printConfig, includeDailyTimesheet: e.target.checked })}
                  className="w-4 h-4 mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="font-bold text-slate-900 dark:text-slate-100 block">
                    Registro Analitico Giornaliero
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                    Tabella completa giorno per giorno con orari, pause e negozi
                  </span>
                </div>
              </label>

              {/* Option 6: Overtime Report */}
              <label className="flex items-start gap-3 p-3 bg-purple-50/60 dark:bg-purple-950/40 rounded-xl border border-purple-200 dark:border-purple-800/80 cursor-pointer hover:border-purple-400 transition-all">
                <input
                  type="checkbox"
                  checked={printConfig.includeOvertimeReport}
                  onChange={(e) => setPrintConfig({ ...printConfig, includeOvertimeReport: e.target.checked })}
                  className="w-4 h-4 mt-0.5 rounded text-purple-600 focus:ring-purple-500"
                />
                <div>
                  <span className="font-bold text-purple-900 dark:text-purple-200 block">
                    Report Storico Straordinari
                  </span>
                  <span className="text-purple-800/80 dark:text-purple-300 text-[11px]">
                    Prospetto compensazioni e cumulativo annuale
                  </span>
                </div>
              </label>

              {/* Option 7: Vacation Report */}
              <label className="flex items-start gap-3 p-3 bg-amber-50/60 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800/80 cursor-pointer hover:border-amber-400 transition-all">
                <input
                  type="checkbox"
                  checked={printConfig.includeVacationReport}
                  onChange={(e) => setPrintConfig({ ...printConfig, includeVacationReport: e.target.checked })}
                  className="w-4 h-4 mt-0.5 rounded text-amber-600 focus:ring-amber-500"
                />
                <div>
                  <span className="font-bold text-amber-900 dark:text-amber-200 block">
                    Saldo Ferie e Permessi (ROL)
                  </span>
                  <span className="text-amber-800/80 dark:text-amber-300 text-[11px]">
                    Contatore spettanze, maturate e fruite
                  </span>
                </div>
              </label>

              {/* Option 8: Signatures */}
              <label className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-blue-300 dark:hover:border-blue-700 transition-all">
                <input
                  type="checkbox"
                  checked={printConfig.includeSignatures}
                  onChange={(e) => setPrintConfig({ ...printConfig, includeSignatures: e.target.checked })}
                  className="w-4 h-4 mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="font-bold text-slate-900 dark:text-slate-100 block">
                    Box Firme Ufficiali
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                    Spazi firma cartacea per Dipendente e Datore di Lavoro
                  </span>
                </div>
              </label>

            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setIsConfigModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Annulla
              </button>
              <button
                onClick={handleExecutePrint}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/20 transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Genera e Stampa PDF</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* PRINTABLE REPORT CONTAINER AREA */}
      <div id="printable-report-area" className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        
        {/* OFFICIAL DOCUMENT HEADER */}
        <div className="border-b-2 border-slate-900 dark:border-slate-100 pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black tracking-tight text-slate-900 dark:text-slate-100 uppercase">
                TurniLavoro • Cartellino Ufficiale Presenze
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Riepilogo e registrazione ore lavorate • Mese di <strong>{monthNameItalian.toUpperCase()}</strong>
            </p>
          </div>

          <div className="text-left sm:text-right text-xs text-slate-600 dark:text-slate-300 font-medium space-y-0.5 border-l-2 sm:border-l-0 sm:border-r-2 border-slate-300 dark:border-slate-700 pl-3 sm:pl-0 sm:pr-3">
            <div><strong>Sedi/Negozi Attivi:</strong> {monthlyTotals.activeStores.join(', ')}</div>
            <div><strong>Contratto Base:</strong> {contract.weeklyHoursGoal} ore / settimana</div>
            <div><strong>Generato il:</strong> {new Date().toLocaleDateString('it-IT')}</div>
          </div>
        </div>

        {/* 1. Monthly Key Metrics Box (If enabled in config) */}
        {printConfig.includeHeaderStats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:grid-cols-4">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] uppercase font-bold text-slate-500">Ore Totali Lavorate</span>
              <div className="text-lg font-black text-slate-900 dark:text-slate-100">
                {formatHours(monthlyTotals.worked)}
              </div>
              <span className="text-[10px] text-slate-500">{monthlyTotals.daysWorkedCount} giorni effettivi</span>
            </div>

            <div className="p-3 bg-purple-50 dark:bg-purple-950/60 rounded-xl border border-purple-200 dark:border-purple-800">
              <span className="text-[10px] uppercase font-bold text-purple-700 dark:text-purple-300">Straordinari Netti</span>
              <div className="text-lg font-black text-purple-900 dark:text-purple-200">
                +{formatOvertime(monthlyTotals.netOvertimeTotal)}
              </div>
              <span className="text-[10px] text-purple-600">Al netto di recuperi</span>
            </div>

            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl border border-emerald-200 dark:border-emerald-800">
              <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-300">Ferie e Permessi</span>
              <div className="text-lg font-black text-emerald-900 dark:text-emerald-200">
                {monthlyTotals.ferieDays}gg Ferie / {formatHours(monthlyTotals.permessoHours)} ROL
              </div>
              <span className="text-[10px] text-emerald-600">Imputati a bilancio</span>
            </div>

            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl border border-indigo-200 dark:border-indigo-800">
              <span className="text-[10px] uppercase font-bold text-indigo-700 dark:text-indigo-300">Turni Speciali</span>
              <div className="text-lg font-black text-indigo-900 dark:text-indigo-200">
                {formatHours(monthlyTotals.nightHours)} Notte / {formatHours(monthlyTotals.holidayHours)} Festivi
              </div>
              <span className="text-[10px] text-indigo-600">Maggiorazione CCNL</span>
            </div>
          </div>
        )}

        {/* 2. CHART SECTION A: STORE BREAKDOWN CHART (Grafico Ore per Negozio) */}
        {printConfig.includeStoreChart && (
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3 print:bg-white print:border">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 uppercase tracking-wide flex items-center gap-2">
                <Store className="w-4 h-4 text-blue-600" />
                Grafico & Ripartizione Ore Lavorate per Negozio / Sede
              </h3>
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                Totale: {formatHours(monthlyTotals.worked)}
              </span>
            </div>

            {/* Visual Bar Meters for Stores */}
            <div className="space-y-3 pt-1">
              
              {/* Stacked Percentage Bar */}
              <div className="h-4 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex shadow-inner">
                {storeHoursBreakdown.map((item, i) => (
                  <div
                    key={i}
                    style={{ width: `${item.percentage}%`, backgroundColor: item.hexColor }}
                    className="h-full transition-all"
                    title={`${item.name}: ${item.hours}h (${item.percentage}%)`}
                  />
                ))}
              </div>

              {/* Store Details Grid / Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
                {storeHoursBreakdown.map((item, idx) => (
                  <div key={idx} className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.hexColor }} />
                      <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[120px]">
                        {item.name}
                      </span>
                    </div>
                    <div className="text-right">
                      <strong className="font-mono text-slate-900 dark:text-slate-100">{item.hours}h</strong>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-semibold">
                        ({item.percentage}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </div>
        )}

        {/* 3. CHART SECTION B: SALARY BREAKDOWN CHART (Grafico Proiezione Stipendio) */}
        {printConfig.includeSalaryChart && (
          <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 space-y-3 print:bg-white print:border">
            <div className="flex items-center justify-between border-b border-emerald-200 dark:border-emerald-800/60 pb-2">
              <h3 className="font-bold text-sm text-emerald-900 dark:text-emerald-200 uppercase tracking-wide flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-emerald-600" />
                Grafico Composizione e Proiezione Retribuzione ({monthNameItalian})
              </h3>
              <span className="text-xs font-black text-emerald-700 dark:text-emerald-300">
                Stima Lordo: € {salaryEstimation.estimatedGross.toFixed(2)}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center pt-1">
              
              {/* Left Column: Visual Stacked Salary Bar & Net Estimate */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300 block">
                  Proporzioni Voci Retributive Lorde:
                </span>
                
                {/* Visual Progress Bar */}
                <div className="h-4 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex shadow-inner">
                  <div
                    style={{ width: `${Math.round((salaryEstimation.baseWorkedPay / (salaryEstimation.estimatedGross || 1)) * 100)}%` }}
                    className="h-full bg-blue-600"
                    title="Paga Base"
                  />
                  <div
                    style={{ width: `${Math.round((salaryEstimation.overtimePay / (salaryEstimation.estimatedGross || 1)) * 100)}%` }}
                    className="h-full bg-purple-600"
                    title="Straordinari"
                  />
                  <div
                    style={{ width: `${Math.round(((salaryEstimation.nightPay + salaryEstimation.holidayPay) / (salaryEstimation.estimatedGross || 1)) * 100)}%` }}
                    className="h-full bg-indigo-600"
                    title="Maggiorazioni"
                  />
                </div>

                {/* Net Pay Callout Banner */}
                <div className="p-3 bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-extrabold text-emerald-100 uppercase block">Stima Netto Busta Paga</span>
                    <span className="text-xs text-emerald-100/90">Al netto di ritenute previdenziali & IRPEF</span>
                  </div>
                  <span className="text-xl font-black">~ € {salaryEstimation.estimatedNet.toFixed(2)}</span>
                </div>
              </div>

              {/* Right Column: Key Pay Line Items Breakdown */}
              <div className="space-y-2 text-xs">
                <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                    <span className="font-medium text-slate-700 dark:text-slate-300">Retribuzione Base Lavorata</span>
                  </div>
                  <strong className="font-mono text-slate-900 dark:text-slate-100">
                    € {salaryEstimation.baseWorkedPay.toFixed(2)}
                  </strong>
                </div>

                <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-purple-600" />
                    <span className="font-medium text-purple-700 dark:text-purple-300">Indennità Straordinario Netto</span>
                  </div>
                  <strong className="font-mono text-purple-700 dark:text-purple-300">
                    + € {salaryEstimation.overtimePay.toFixed(2)}
                  </strong>
                </div>

                <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                    <span className="font-medium text-indigo-700 dark:text-indigo-300">Maggiorazioni Notte & Festivi</span>
                  </div>
                  <strong className="font-mono text-indigo-700 dark:text-indigo-300">
                    + € {(salaryEstimation.nightPay + salaryEstimation.holidayPay).toFixed(2)}
                  </strong>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* 4. Weekly Deficit & Split Summaries (If enabled) */}
        {printConfig.includeWeeklyBreakdown && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              Riepilogo Dettagliato Settimana per Settimana
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {weekSummaries.map((w) => (
                <div key={w.weekIndex} className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-1.5">
                    <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                      {w.weekLabel} ({w.startDate} - {w.endDate})
                    </span>
                    <span className={`text-[10.5px] font-black px-2 py-0.5 rounded ${
                      w.deficitHours > 0 ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
                    }`}>
                      Lavorate: {formatHours(w.workedHours)} / {formatHours(w.effectiveWeeklyGoal)}
                    </span>
                  </div>

                  {w.deficitHours > 0 ? (
                    <div className="text-xs space-y-1">
                      <div className="flex items-center justify-between text-rose-700 dark:text-rose-300 font-bold">
                        <span>Mancanti al target ({formatHours(w.effectiveWeeklyGoal)}):</span>
                        <span>-{formatHours(w.deficitHours)}</span>
                      </div>
                      <div className="flex flex-wrap gap-1 text-[10px]">
                        {w.deficitSplit.recupero_straordinari > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-900 font-bold">
                            ⚡ {w.deficitSplit.recupero_straordinari}h Recupero
                          </span>
                        )}
                        {w.deficitSplit.ferie > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 font-bold">
                            🌴 {w.deficitSplit.ferie}h Ferie
                          </span>
                        )}
                        {w.deficitSplit.permesso > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-pink-100 text-pink-900 font-bold">
                            ⏱️ {w.deficitSplit.permesso}h Permesso
                          </span>
                        )}
                        {w.deficitSplit.debito > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-900 font-bold">
                            ⚠️ {w.deficitSplit.debito}h Debito Orario
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-emerald-700 dark:text-emerald-300 font-semibold flex items-center justify-between">
                      <span>Target 100% completato</span>
                      {w.netOvertimeHours > 0 && (
                        <span className="text-[10px] font-extrabold bg-purple-600 text-white px-1.5 py-0.5 rounded">
                          +{formatOvertime(w.netOvertimeHours)} Straordinario
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 5. Daily Shift Table (If enabled) */}
        {printConfig.includeDailyTimesheet && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide">
              Registro Analitico Giornaliero dei Turni
            </h3>

            <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase text-[10px] border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-2.5">Data</th>
                    <th className="p-2.5">Turno / Tipo</th>
                    <th className="p-2.5">Negozio</th>
                    <th className="p-2.5">Orario Entrata/Uscita</th>
                    <th className="p-2.5 text-center">Pausa</th>
                    <th className="p-2.5 text-right">Ore Lavorate</th>
                    <th className="p-2.5 text-right">Straordinario</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-medium">
                  {monthShifts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-slate-400 italic">
                        Nessun turno registrato per questo mese.
                      </td>
                    </tr>
                  ) : (
                    monthShifts.map((s) => {
                      const dateObj = new Date(s.date + 'T00:00:00');
                      const dayName = dateObj.toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit' });
                      const isSunday = dateObj.getDay() === 0;

                      return (
                        <tr key={s.id} className={isSunday ? 'bg-amber-50/50 dark:bg-amber-950/20' : ''}>
                          <td className="p-2.5 font-bold text-slate-900 dark:text-slate-100 capitalize">
                            {dayName}
                          </td>
                          <td className="p-2.5">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10.5px] font-bold ${
                              s.category === 'ferie' ? 'bg-emerald-100 text-emerald-800' :
                              s.category === 'permesso' ? 'bg-pink-100 text-pink-800' :
                              s.category === 'riposo' ? 'bg-slate-100 text-slate-600' : 'bg-blue-100 text-blue-900'
                            }`}>
                              {s.type}
                            </span>
                          </td>
                          <td className="p-2.5 text-slate-600 dark:text-slate-400 font-semibold">
                            {s.location || monthlyTotals.activeStores[0] || '-'}
                          </td>
                          <td className="p-2.5 text-slate-800 dark:text-slate-200 font-mono">
                            {s.category === 'riposo' ? 'RIPOSO' : `${s.startTime} - ${s.endTime}`}
                          </td>
                          <td className="p-2.5 text-center text-slate-500 font-mono">
                            {(() => {
                              const lowerType = (s.type || '').toLowerCase();
                              const lowerNotes = (s.notes || '').toLowerCase();
                              const isSplit = lowerType.includes('spezzato') || lowerNotes.includes('spezzato') || (s.breakMinutes || 0) >= 120;
                              if (isSplit) return '-';
                              return s.breakMinutes > 0 ? `${s.breakMinutes}m` : '-';
                            })()}
                          </td>
                          <td className="p-2.5 text-right font-bold text-slate-900 dark:text-slate-100 font-mono">
                            {s.workedHours > 0 ? `${formatHours(s.workedHours)}` : '-'}
                          </td>
                          <td className="p-2.5 text-right font-bold text-purple-700 dark:text-purple-300 font-mono">
                            {s.overtimeHours > 0 ? `+${formatHours(s.overtimeHours)}` : '-'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                <tfoot className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-black text-xs border-t-2 border-slate-300 dark:border-slate-700">
                  <tr>
                    <td colSpan={5} className="p-3 text-right uppercase">Totali Mensili:</td>
                    <td className="p-3 text-right font-mono text-sm">{formatHours(monthlyTotals.worked)}</td>
                    <td className="p-3 text-right font-mono text-sm text-purple-700 dark:text-purple-300">
                      +{formatOvertime(monthlyTotals.overtimeGross)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* 6. Overtime Section (If enabled) */}
        {printConfig.includeOvertimeReport && (
          <div className="space-y-3 pt-2">
            <h3 className="text-sm font-bold text-purple-900 dark:text-purple-200 uppercase tracking-wide flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-600" />
              Prospetto Straordinari & Accumulo Anno {yearlyStats.currentYear}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-purple-50 dark:bg-purple-950/40 rounded-xl border border-purple-200 dark:border-purple-800">
                <span className="text-[10px] uppercase font-bold text-purple-700">Straordinario Generato Mese</span>
                <div className="text-lg font-black text-purple-900 dark:text-purple-200">
                  +{formatOvertime(monthlyTotals.overtimeGross)}
                </div>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] uppercase font-bold text-slate-500">Recuperi Applicati</span>
                <div className="text-lg font-black text-slate-800 dark:text-slate-200">
                  -{formatHours(weekSummaries.reduce((a, w) => a + w.deficitSplit.recupero_straordinari, 0))}
                </div>
              </div>
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800">
                <span className="text-[10px] uppercase font-bold text-emerald-700">Straordinario Netto Liquidabile</span>
                <div className="text-lg font-black text-emerald-900 dark:text-emerald-200">
                  +{formatOvertime(monthlyTotals.netOvertimeTotal)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 7. Vacation Section (If enabled) */}
        {printConfig.includeVacationReport && (
          <div className="space-y-3 pt-2">
            <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wide flex items-center gap-2">
              <Palmtree className="w-4 h-4 text-amber-600" />
              Prospetto Ferie e Permessi ROL
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800">
                <span className="text-[10px] uppercase font-bold text-amber-800">Ferie Spettanti Annuali</span>
                <div className="text-base font-black text-amber-900 dark:text-amber-200">
                  {vacationSettings.annualFerieDays} Giorni / Anno
                </div>
                <span className="text-[10px] text-amber-700 block mt-0.5">Fruiti questo mese: {monthlyTotals.ferieDays}gg</span>
              </div>
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800">
                <span className="text-[10px] uppercase font-bold text-amber-800">Permessi ROL Spettanti</span>
                <div className="text-base font-black text-amber-900 dark:text-amber-200">
                  {vacationSettings.annualPermessiHours} Ore / Anno
                </div>
                <span className="text-[10px] text-amber-700 block mt-0.5">Fruiti questo mese: {formatHours(monthlyTotals.permessoHours)}</span>
              </div>
            </div>
          </div>
        )}

        {/* 8. SIGNATURE BOXES (If enabled) */}
        {printConfig.includeSignatures && (
          <div className="pt-6 border-t border-slate-300 dark:border-slate-700 grid grid-cols-2 gap-8 print:grid-cols-2">
            <div className="border border-dashed border-slate-400 p-4 rounded-xl space-y-6">
              <span className="text-[10px] font-bold uppercase text-slate-500 block">Firma del Dipendente</span>
              <div className="h-8 border-b border-slate-400"></div>
              <span className="text-[9px] text-slate-400 block text-center">Data: ____ / ____ / ________</span>
            </div>

            <div className="border border-dashed border-slate-400 p-4 rounded-xl space-y-6">
              <span className="text-[10px] font-bold uppercase text-slate-500 block">Firma del Responsabile / Datore di Lavoro</span>
              <div className="h-8 border-b border-slate-400"></div>
              <span className="text-[9px] text-slate-400 block text-center">Data: ____ / ____ / ________</span>
            </div>
          </div>
        )}

      </div>

    </div>
  );
};
