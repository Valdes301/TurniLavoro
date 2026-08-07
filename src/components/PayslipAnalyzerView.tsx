import React, { useState, useMemo, useEffect } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  FileText, 
  Sparkles, 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  Eye, 
  EyeOff, 
  Calculator, 
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Info,
  DollarSign,
  FileSearch,
  BookOpen,
  Check,
  Zap,
  Trash2,
  BarChart3,
  BookmarkCheck,
  Plus
} from 'lucide-react';
import { Shift, ContractSettings, PayslipAnalysisResult, SavedPayslipRecord } from '../types';
import { PAYSLIP_GLOSSARY_IT, GlossaryItem, anonymizePayslipText } from '../utils/privacyUtils';
import { AnnualPayslipChartsView } from './AnnualPayslipChartsView';
import { RealPayslipPrivacyPreview } from './RealPayslipPrivacyPreview';

interface PayslipAnalyzerViewProps {
  selectedMonth: string;
  shifts: Shift[];
  contract: ContractSettings;
}

export const PayslipAnalyzerView: React.FC<PayslipAnalyzerViewProps> = ({
  selectedMonth,
  shifts,
  contract,
}) => {
  const [activeTab, setActiveTab] = useState<'glossary' | 'ai_analyzer' | 'annual_charts'>('annual_charts');

  // Saved Payslips persistence state
  const [savedRecords, setSavedRecords] = useState<SavedPayslipRecord[]>(() => {
    try {
      const stored = localStorage.getItem('tl_saved_payslips');
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  // Save to localStorage whenever savedRecords changes
  useEffect(() => {
    localStorage.setItem('tl_saved_payslips', JSON.stringify(savedRecords));
  }, [savedRecords]);

  // Handler to add or update a record
  const handleSaveRecord = (record: SavedPayslipRecord) => {
    setSavedRecords((prev) => {
      const idx = prev.findIndex((r) => r.monthIso === record.monthIso);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = record;
        return copy;
      } else {
        return [...prev, record];
      }
    });
  };

  // Handler to delete a record
  const handleDeleteRecord = (monthIso: string) => {
    setSavedRecords((prev) => prev.filter((r) => r.monthIso !== monthIso));
  };

  // Helper to seed realistic demo data for 2026
  const handleSeedDemoData = () => {
    const demoData: SavedPayslipRecord[] = [
      { id: '2026-01', monthIso: '2026-01', netAmount: 1680.50, grossAmount: 2240.00, workedHours: 160, overtimeHours: 8, ferieDays: 1, permessiHours: 0, irpefTax: 345.00, inpsDeduction: 206.00, tfrAccrued: 138.00, savedAt: new Date().toISOString() },
      { id: '2026-02', monthIso: '2026-02', netAmount: 1720.00, grossAmount: 2290.00, workedHours: 152, overtimeHours: 14, ferieDays: 2, permessiHours: 4, irpefTax: 358.00, inpsDeduction: 210.00, tfrAccrued: 141.00, savedAt: new Date().toISOString() },
      { id: '2026-03', monthIso: '2026-03', netAmount: 1650.00, grossAmount: 2200.00, workedHours: 168, overtimeHours: 6, ferieDays: 0, permessiHours: 0, irpefTax: 335.00, inpsDeduction: 202.00, tfrAccrued: 135.00, savedAt: new Date().toISOString() },
      { id: '2026-04', monthIso: '2026-04', netAmount: 1790.20, grossAmount: 2380.00, workedHours: 160, overtimeHours: 18, ferieDays: 1, permessiHours: 2, irpefTax: 382.00, inpsDeduction: 218.00, tfrAccrued: 146.00, savedAt: new Date().toISOString() },
      { id: '2026-05', monthIso: '2026-05', netAmount: 1710.00, grossAmount: 2270.00, workedHours: 160, overtimeHours: 12, ferieDays: 3, permessiHours: 6, irpefTax: 352.00, inpsDeduction: 208.00, tfrAccrued: 139.00, savedAt: new Date().toISOString() },
      { id: '2026-06', monthIso: '2026-06', netAmount: 1840.00, grossAmount: 2450.00, workedHours: 168, overtimeHours: 22, ferieDays: 0, permessiHours: 0, irpefTax: 405.00, inpsDeduction: 225.00, tfrAccrued: 150.00, savedAt: new Date().toISOString() },
      { id: '2026-07', monthIso: '2026-07', netAmount: 1695.00, grossAmount: 2260.00, workedHours: 160, overtimeHours: 10, ferieDays: 4, permessiHours: 8, irpefTax: 348.00, inpsDeduction: 207.00, tfrAccrued: 138.00, savedAt: new Date().toISOString() },
    ];
    setSavedRecords(demoData);
  };

  // Search state for offline glossary
  const [glossarySearch, setGlossarySearch] = useState('');
  const [selectedGlossaryCategory, setSelectedGlossaryCategory] = useState<string>('all');

  // Input state for AI Payslip Analysis
  const [rawText, setRawText] = useState('');
  const [userSurname, setUserSurname] = useState(() => localStorage.getItem('tl_user_surname') || '');
  const [companyName, setCompanyName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [showAnonymizedPreview, setShowAnonymizedPreview] = useState(false);

  // Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<PayslipAnalysisResult | null>(null);

  // Differimento pagamenti straordinari (0, 1, or 2 months) - DEFAULT 2 MONTHS PRIOR AS REQUESTED
  const [overtimeLagMonths, setOvertimeLagMonths] = useState<number>(() => {
    const saved = localStorage.getItem('tl_overtime_lag');
    return saved !== null ? Number(saved) : 2; // Default 2 months lag (straordinari 2 mesi prima)
  });

  // Target reference month for overtime & variables computation
  const { targetOvertimeMonthIso, currentMonthLabel, targetOvertimeMonthLabel } = useMemo(() => {
    const [y, m] = selectedMonth.split('-').map(Number);
    
    // Current month label (es. Agosto 2026)
    const currentDateObj = new Date(y, m - 1, 1);
    const currentLabel = currentDateObj.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });

    // Target overtime month object (es. 2 months earlier -> Giugno 2026)
    const targetDateObj = new Date(y, m - 1 - overtimeLagMonths, 1);
    const targetY = targetDateObj.getFullYear();
    const targetM = String(targetDateObj.getMonth() + 1).padStart(2, '0');
    const targetIso = `${targetY}-${targetM}`;
    const targetLabel = targetDateObj.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });

    return {
      targetOvertimeMonthIso: targetIso,
      currentMonthLabel: currentLabel,
      targetOvertimeMonthLabel: targetLabel,
    };
  }, [selectedMonth, overtimeLagMonths]);

  // Filtered shifts for selected month for standard hours
  const monthShifts = useMemo(() => {
    return shifts.filter((s) => s.date.startsWith(selectedMonth));
  }, [shifts, selectedMonth]);

  // Filtered shifts for target overtime month (delayed by offset)
  const overtimeTargetShifts = useMemo(() => {
    return shifts.filter((s) => s.date.startsWith(targetOvertimeMonthIso));
  }, [shifts, targetOvertimeMonthIso]);

  const appWorkedHours = useMemo(() => {
    return monthShifts.reduce((acc, s) => acc + s.workedHours, 0);
  }, [monthShifts]);

  // Overtime, Night, Holiday from the TARGET month (taking lag into account!)
  const appOvertimeHoursTarget = useMemo(() => {
    return overtimeTargetShifts.reduce((acc, s) => acc + s.overtimeHours, 0);
  }, [overtimeTargetShifts]);

  const appNightHoursTarget = useMemo(() => {
    return overtimeTargetShifts.filter((s) => s.isNight).reduce((acc, s) => acc + s.workedHours, 0);
  }, [overtimeTargetShifts]);

  const appHolidayHoursTarget = useMemo(() => {
    return overtimeTargetShifts.filter((s) => s.isHoliday).reduce((acc, s) => acc + s.workedHours, 0);
  }, [overtimeTargetShifts]);

  // Live anonymized text computation
  const { anonymizedText, redactionsCount } = useMemo(() => {
    if (!rawText) return { anonymizedText: '', redactionsCount: 0 };
    return anonymizePayslipText(rawText, userSurname, companyName);
  }, [rawText, userSurname, companyName]);

  // Handle File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      if (selected.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => setFilePreview(reader.result as string);
        reader.readAsDataURL(selected);
      } else {
        setFilePreview(null);
      }
    }
  };

  // Run AI Analysis
  const handleRunAnalysis = async () => {
    if (!rawText.trim() && !file) {
      setErrorMsg('Inserisci il testo della tua busta paga oppure seleziona una foto/PDF.');
      return;
    }

    setIsAnalyzing(true);
    setErrorMsg(null);

    try {
      let fileBase64 = '';
      let mimeType = '';

      if (file) {
        fileBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        mimeType = file.type;
        if (!mimeType || mimeType === 'application/octet-stream') {
          const lowerName = file.name.toLowerCase();
          if (lowerName.endsWith('.pdf')) mimeType = 'application/pdf';
          else if (lowerName.endsWith('.png')) mimeType = 'image/png';
          else if (lowerName.endsWith('.webp')) mimeType = 'image/webp';
          else mimeType = 'image/jpeg';
        }
      }

      const customKey = localStorage.getItem('tl_custom_gemini_key') || '';
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (customKey) {
        headers['x-gemini-api-key'] = customKey;
      }

      if (userSurname) {
        localStorage.setItem('tl_user_surname', userSurname);
      }

      // App totals payload for discrepancy checking taking lag into account
      const lagNoteText = overtimeLagMonths === 0 
        ? "Pagamento straordinari nello stesso mese di competenza (0 mesi ritardo)"
        : `Pagamento straordinari e variabili differito di ${overtimeLagMonths} ${overtimeLagMonths === 1 ? 'mese' : 'mesi'} (es. Straordinari svolti a ${targetOvertimeMonthLabel} accreditati nella busta paga di ${currentMonthLabel})`;

      const appTotalsForMonth = {
        currentMonthLabel,
        overtimeReferenceMonthLabel: targetOvertimeMonthLabel,
        workedHours: parseFloat(appWorkedHours.toFixed(1)),
        overtimeHours: parseFloat(appOvertimeHoursTarget.toFixed(1)),
        nightHours: parseFloat(appNightHoursTarget.toFixed(1)),
        holidayHours: parseFloat(appHolidayHoursTarget.toFixed(1)),
        overtimeLagNote: lagNoteText,
      };

      const response = await fetch('/api/analyze-payslip', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          textContent: anonymizedText,
          fileBase64: fileBase64 || undefined,
          mimeType: mimeType || undefined,
          customApiKey: customKey || undefined,
          appTotalsForMonth,
        }),
      });

      let json: any;
      try {
        json = await response.json();
      } catch (parseErr) {
        throw new Error(`Risposta dal server non valida (${response.status} ${response.statusText}). Verifica la dimensione della foto o del PDF.`);
      }

      if (!response.ok || !json.success) {
        throw new Error(json.error || `Errore durante l'analisi della busta paga (${response.status}).`);
      }

      setAnalysisResult(json.data);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Si è verificato un errore durante l\'analisi.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Filter glossary items
  const filteredGlossary = useMemo(() => {
    return PAYSLIP_GLOSSARY_IT.filter((item) => {
      const matchesSearch = 
        item.name.toLowerCase().includes(glossarySearch.toLowerCase()) ||
        item.definition.toLowerCase().includes(glossarySearch.toLowerCase()) ||
        item.key.toLowerCase().includes(glossarySearch.toLowerCase());

      const matchesCategory = 
        selectedGlossaryCategory === 'all' || item.category === selectedGlossaryCategory;

      return matchesSearch && matchesCategory;
    });
  }, [glossarySearch, selectedGlossaryCategory]);

  return (
    <div className="space-y-6 pb-12">
      
      {/* Top Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-lg border border-indigo-900/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full filter blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-xs font-semibold border border-emerald-500/30">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Protezione Privacy Attiva & Inviolabile</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Analizzatore Busta Paga & Voci Contratto
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Comprendi finalmente ogni singola voce del tuo cedolino paga (IRPEF, INPS, TFR, ROL, Indennità Turno), confronta le ore registrate e scopri trattamenti e trattenute in totale sicurezza.
            </p>
          </div>

          <div className="bg-slate-800/80 backdrop-blur-md border border-slate-700 p-4 rounded-2xl flex flex-col gap-2 min-w-[240px]">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
              <Lock className="w-4 h-4" />
              <span>Come proteggiamo i tuoi dati:</span>
            </div>
            <ul className="text-[11px] text-slate-300 space-y-1">
              <li className="flex items-start gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>Anonimizzazione automatica Codice Fiscale, Nome e IBAN prima dell'invio</span>
              </li>
              <li className="flex items-start gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>Modalità Glossario 100% Offline senza alcuna chiamata server</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('annual_charts')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'annual_charts'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <BarChart3 className="w-4 h-4 text-emerald-300" />
          <span>Storico & Grafici Annuali Cedolini ({savedRecords.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('ai_analyzer')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'ai_analyzer'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>Analizzatore Smart IA (Anonimizzato)</span>
        </button>

        <button
          onClick={() => setActiveTab('glossary')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'glossary'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Glossario Voci Busta Paga (100% Offline)</span>
        </button>
      </div>

      {/* TAB 0: Annual Charts & Saved History */}
      {activeTab === 'annual_charts' && (
        <AnnualPayslipChartsView
          records={savedRecords}
          onSaveRecord={handleSaveRecord}
          onDeleteRecord={handleDeleteRecord}
          onSeedDemoData={handleSeedDemoData}
        />
      )}

      {/* TAB 1: Glossary Offline */}
      {activeTab === 'glossary' && (
        <div className="space-y-6">
          
          {/* Controls & Search Bar */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  Dizionario Interattivo Voci e Trattenute Busta Paga
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Cerca codici o termini (es. IRPEF, ROL, TFR, Indennità Notturna) e leggi la spiegazione in italiano chiaro senza inviare alcun dato.
                </p>
              </div>

              {/* Filter pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {[
                  { id: 'all', label: 'Tutti' },
                  { id: 'competenze', label: 'Competenze (+)' },
                  { id: 'trattenute', label: 'Trattenute (-)' },
                  { id: 'tassazione', label: 'Tassazione IRPEF' },
                  { id: 'diritti', label: 'Ferie & TFR' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedGlossaryCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      selectedGlossaryCategory === cat.id
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Cerca voce o codice busta paga (es. Notturno, IRPEF, Conguaglio, Scatti...)"
                value={glossarySearch}
                onChange={(e) => setGlossarySearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Glossary Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredGlossary.map((item) => {
              const categoryBadge = {
                competenze: { label: 'Competenza (+)', color: 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300' },
                trattenute: { label: 'Trattenuta (-)', color: 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300' },
                tassazione: { label: 'Tassazione IRPEF', color: 'bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300' },
                diritti: { label: 'Diritti / TFR', color: 'bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300' },
              }[item.category];

              return (
                <div
                  key={item.key}
                  className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-md transition-all space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {item.name}
                      </h3>
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0 ${categoryBadge.color}`}>
                        {categoryBadge.label}
                      </span>
                    </div>
                    
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {item.definition}
                    </p>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
                    <div>
                      <strong className="text-slate-700 dark:text-slate-300">Come funziona: </strong>
                      {item.howItWorks}
                    </div>
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl font-mono text-[11px] text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-slate-800">
                      <strong>Esempio pratico:</strong> {item.example}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* TAB 2: AI Payslip Analyzer with Privacy Shield */}
      {activeTab === 'ai_analyzer' && (
        <div className="space-y-6">
          
          {/* Privacy Shield Instructions */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 rounded-xl">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Analisi della Busta Paga Protetta da Privacy Shield
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Il tuo browser anonimizza automaticamente ogni informazione sensibile prima dell'invio.
                  </p>
                </div>
              </div>

              {redactionsCount > 0 && (
                <div className="px-3 py-1.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5">
                  <Check className="w-4 h-4" />
                  <span>{redactionsCount} Dati Sensibili Oscurati nel Browser</span>
                </div>
              )}
            </div>

            {/* Optional anonymization helpers & Overtime lag rule */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Cognome Dipendente (Per oscurarlo):
                </label>
                <input
                  type="text"
                  placeholder="es. ROSSI"
                  value={userSurname}
                  onChange={(e) => {
                    setUserSurname(e.target.value);
                    localStorage.setItem('tl_user_surname', e.target.value);
                  }}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nome Azienda (Per oscurarlo):
                </label>
                <input
                  type="text"
                  placeholder="es. ACME SRL"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Accredito Straordinari & Variabili:
                </label>
                <select
                  value={overtimeLagMonths}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setOvertimeLagMonths(val);
                    localStorage.setItem('tl_overtime_lag', String(val));
                  }}
                  className="w-full px-3 py-2 bg-indigo-50/80 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-semibold text-indigo-900 dark:text-indigo-200 focus:outline-none"
                >
                  <option value={0}>Stesso Mese (0 Mesi di ritardo)</option>
                  <option value={1}>Differito di 1 Mese (es. Straordinari Luglio in Busta Agosto)</option>
                  <option value={2}>Differito di 2 Mesi (es. Straordinari Giugno in Busta Agosto)</option>
                </select>
              </div>
            </div>

            {/* Overtime Lag Rule Helper Banner */}
            <div className="p-3 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 rounded-xl text-xs text-blue-900 dark:text-blue-200 flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold">Regola di Confronto Attiva: </strong>
                Per la busta di <strong>{currentMonthLabel}</strong>, l'IA analizzerà le ore ordinarie di {currentMonthLabel} e confronterà gli straordinari/notturni/festivi con i turni dell'app di <strong>{targetOvertimeMonthLabel}</strong> {overtimeLagMonths > 0 ? `(slittamento di ${overtimeLagMonths} ${overtimeLagMonths === 1 ? 'mese' : 'mesi'})` : ''}.
              </div>
            </div>

            {/* Textarea or File upload */}
            <div className="space-y-3 pt-2">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                Incolla il testo delle voci della busta paga oppure carica una foto/PDF:
              </label>

              <textarea
                rows={5}
                placeholder="Incolla qui le righe del tuo cedolino... es.:&#10;101 Retribuzione Base 1.540,00&#10;102 Indennità Notturna 16 ore 48,00&#10;201 Trattenuta INPS 183,00&#10;301 IRPEF Lorda 350,00"
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                className="w-full p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                    id="payslip-file-input"
                  />
                  <label
                    htmlFor="payslip-file-input"
                    className="flex items-center justify-center gap-2 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer transition-colors w-full sm:w-auto"
                  >
                    <FileText className="w-4 h-4 text-slate-500" />
                    <span>{file ? file.name : 'Carica Foto/PDF Cedolino'}</span>
                  </label>

                  {file && (
                    <button
                      onClick={() => {
                        setFile(null);
                        setFilePreview(null);
                      }}
                      className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg cursor-pointer"
                      title="Rimuovi file"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Privacy Preview Toggle */}
                <button
                  onClick={() => setShowAnonymizedPreview(!showAnonymizedPreview)}
                  className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold hover:underline cursor-pointer bg-emerald-50 dark:bg-emerald-950/80 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800/80"
                >
                  {showAnonymizedPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  <span>{showAnonymizedPreview ? 'Nascondi Anteprima Reale Privacy' : 'Mostra Anteprima Reale Busta Paga Oscurata'}</span>
                </button>
              </div>

              {/* Real Payslip Privacy Shield Interactive Preview Component */}
              {showAnonymizedPreview && (
                <div className="pt-2">
                  <RealPayslipPrivacyPreview
                    rawText={rawText}
                    anonymizedText={anonymizedText}
                    userSurname={userSurname}
                    companyName={companyName}
                    filePreview={filePreview}
                    fileName={file?.name}
                    redactionsCount={redactionsCount}
                    currentMonthLabel={currentMonthLabel}
                  />
                </div>
              )}
            </div>

            {/* Error banner */}
            {errorMsg && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Action Submit Button */}
            <div className="pt-2">
              <button
                onClick={handleRunAnalysis}
                disabled={isAnalyzing}
                className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl font-bold text-sm shadow-md hover:from-indigo-700 hover:to-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isAnalyzing ? (
                  <>
                    <Sparkles className="w-4 h-4 animate-spin text-amber-300" />
                    <span>Analisi Busta Paga in corso...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 text-amber-300" />
                    <span>Analizza Voci e Spiega Busta Paga</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* RESULTS DISPLAY SECTION */}
          {analysisResult && (
            <div className="space-y-6 animate-in fade-in duration-300">
              
              {/* General Summary */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    <span>Sintesi e Giudizio Generale Busta Paga</span>
                  </div>

                  <button
                    onClick={() => {
                      const recordToSave: SavedPayslipRecord = {
                        id: selectedMonth,
                        monthIso: selectedMonth,
                        netAmount: analysisResult.netAmount || 1650,
                        grossAmount: analysisResult.grossAmount || 2200,
                        workedHours: analysisResult.totalWorkedHoursReported || appWorkedHours,
                        overtimeHours: analysisResult.overtimeHoursReported || appOvertimeHoursTarget,
                        ferieDays: 0,
                        permessiHours: 0,
                        irpefTax: 350,
                        inpsDeduction: 200,
                        tfrAccrued: 135,
                        generalSummary: analysisResult.generalSummary,
                        analysisResult,
                        savedAt: new Date().toISOString(),
                      };
                      handleSaveRecord(recordToSave);
                      setActiveTab('annual_charts');
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-2xs cursor-pointer transition-colors shrink-0"
                  >
                    <BookmarkCheck className="w-4 h-4" />
                    <span>Salva Questo Cedolino nello Storico ({selectedMonth})</span>
                  </button>
                </div>

                <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
                  {analysisResult.generalSummary}
                </p>
              </div>

              {/* Cross-Check Discrepancy Card (Busta vs App TurniLavoro) */}
              <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-md border border-indigo-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-indigo-500/20 rounded-xl text-indigo-300">
                      <FileSearch className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base">Confronto Busta Paga ({currentMonthLabel}) vs Registro Turni App</h3>
                      <p className="text-xs text-indigo-200">
                        {overtimeLagMonths > 0 
                          ? `Variabili (straordinari, notturni, festivi) prelevati dal mese di ${targetOvertimeMonthLabel} (slittamento ${overtimeLagMonths} ${overtimeLagMonths === 1 ? 'mese' : 'mesi'})`
                          : `Tutte le ore calcolate per il mese di ${currentMonthLabel}`}
                      </p>
                    </div>
                  </div>

                  <span className="px-3 py-1 bg-indigo-500/30 border border-indigo-400/30 rounded-full text-[11px] font-semibold text-indigo-200 self-start sm:self-auto">
                    {overtimeLagMonths > 0 ? `Straordinari: ${targetOvertimeMonthLabel}` : `Mese Stesso`}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/80 space-y-1">
                    <span className="text-[11px] text-slate-400 font-medium">Ore Ordinari ({currentMonthLabel})</span>
                    <div className="text-base font-bold text-white">
                      App: {appWorkedHours.toFixed(1)}h
                    </div>
                    <div className="text-xs text-slate-300">
                      Busta: {analysisResult.totalWorkedHoursReported !== undefined ? `${analysisResult.totalWorkedHoursReported}h` : 'N.D.'}
                    </div>
                  </div>

                  <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/80 space-y-1">
                    <span className="text-[11px] text-slate-400 font-medium">Straordinari ({targetOvertimeMonthLabel})</span>
                    <div className="text-base font-bold text-purple-300">
                      App: {appOvertimeHoursTarget.toFixed(1)}h
                    </div>
                    <div className="text-xs text-slate-300">
                      Busta: {analysisResult.overtimeHoursReported !== undefined ? `${analysisResult.overtimeHoursReported}h` : 'N.D.'}
                    </div>
                  </div>

                  <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/80 space-y-1">
                    <span className="text-[11px] text-slate-400 font-medium">Notturni ({targetOvertimeMonthLabel})</span>
                    <div className="text-base font-bold text-indigo-300">
                      App: {appNightHoursTarget.toFixed(1)}h
                    </div>
                    <div className="text-xs text-slate-300">
                      Busta: {analysisResult.nightHoursReported !== undefined ? `${analysisResult.nightHoursReported}h` : 'N.D.'}
                    </div>
                  </div>

                  <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/80 space-y-1">
                    <span className="text-[11px] text-slate-400 font-medium">Festivi ({targetOvertimeMonthLabel})</span>
                    <div className="text-base font-bold text-amber-300">
                      App: {appHolidayHoursTarget.toFixed(1)}h
                    </div>
                    <div className="text-xs text-slate-300">
                      Busta: {analysisResult.holidayHoursReported !== undefined ? `${analysisResult.holidayHoursReported}h` : 'N.D.'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Itemized Explanations */}
              <div className="space-y-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Dettaglio Spiegato Voce per Voce ({analysisResult.items.length} Voci Rilevate)
                </h3>

                <div className="grid grid-cols-1 gap-4">
                  {analysisResult.items.map((item, idx) => {
                    const isCompetenza = item.category === 'competenze';
                    const isTrattenuta = item.category === 'trattenute';

                    return (
                      <div
                        key={idx}
                        className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                              {item.codeOrName}
                            </span>
                            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                              isCompetenza ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' :
                              isTrattenuta ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300' :
                              'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                            }`}>
                              {item.category.toUpperCase()}
                            </span>
                          </div>

                          {item.amount !== undefined && (
                            <span className={`text-sm font-extrabold ${
                              isCompetenza ? 'text-emerald-600 dark:text-emerald-400' :
                              isTrattenuta ? 'text-rose-600 dark:text-rose-400' :
                              'text-slate-900 dark:text-slate-100'
                            }`}>
                              {isCompetenza ? '+' : isTrattenuta ? '-' : ''}{item.amount.toFixed(2)} €
                            </span>
                          )}
                        </div>

                        <div className="space-y-2 text-xs">
                          <div>
                            <strong className="text-slate-800 dark:text-slate-200">Cosa significa in parole semplici:</strong>
                            <p className="text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                              {item.plainItalianMeaning}
                            </p>
                          </div>

                          <div>
                            <strong className="text-slate-800 dark:text-slate-200">Come si calcola:</strong>
                            <p className="text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                              {item.howItIsCalculated}
                            </p>
                          </div>

                          {item.userAdvice && (
                            <div className="p-3 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900 rounded-xl text-amber-900 dark:text-amber-200 flex items-start gap-2">
                              <Info className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                              <div>
                                <strong className="font-semibold">Cosa controllare: </strong>
                                {item.userAdvice}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

        </div>
      )}

    </div>
  );
};
