import React, { useState, useEffect } from 'react';
import { 
  Shift, 
  ContractSettings, 
  VacationSettings, 
  ShiftPreset, 
  ViewMode 
} from './types';
import { 
  DEFAULT_CONTRACT, 
  DEFAULT_PRESETS, 
  generateICSFile, 
  generateCSVReport,
  getShiftNameAndCodeByTime,
  recalculateWeeklyOvertimeForShifts,
  formatDateToIso,
  isNightShift,
  roundClockIn,
  roundClockOut,
  calculateShiftDuration,
  sanitizeShift
} from './utils/shiftUtils';
import { getInitialShifts, INITIAL_VACATION } from './data/initialData';

import { Navbar } from './components/Navbar';
import { CalendarView } from './components/CalendarView';
import { TableView } from './components/TableView';
import { HoursStatsView } from './components/HoursStatsView';
import { VacationTrackerView } from './components/VacationTrackerView';
import { PayslipAnalyzerView } from './components/PayslipAnalyzerView';
import { ReportsPrintView } from './components/ReportsPrintView';
import { ContractSettingsView } from './components/ContractSettingsView';
import { DockerGuideView } from './components/DockerGuideView';
import { ShiftFormModal } from './components/ShiftFormModal';
import { AIExtractorModal } from './components/AIExtractorModal';
import { Sidebar } from './components/Sidebar';

export default function App() {
  // Current Month State (YYYY-MM)
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  });

  // Current View
  const [currentView, setCurrentView] = useState<ViewMode>('calendar');

  // Theme State ('light' | 'dark' | 'system')
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() => {
    const saved = localStorage.getItem('tl_theme_v1');
    if (saved === 'dark' || saved === 'light' || saved === 'system') return saved;
    return 'system';
  });

  useEffect(() => {
    localStorage.setItem('tl_theme_v1', theme);
    const root = document.documentElement;
    
    const applyDark = (isDark: boolean) => {
      if (isDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    if (theme === 'dark') {
      applyDark(true);
    } else if (theme === 'light') {
      applyDark(false);
    } else {
      // system preference
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      applyDark(mediaQuery.matches);

      const handleChange = (e: MediaQueryListEvent) => {
        applyDark(e.matches);
      };

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  // Sidebar Open state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Persistence States
  const [shifts, setShifts] = useState<Shift[]>(() => {
    let parsedShifts: Shift[] = [];
    const saved = localStorage.getItem('tl_shifts_v1');
    if (saved) {
      try { parsedShifts = JSON.parse(saved); } catch (e) { console.error(e); }
    }
    
    const initialShifts = getInitialShifts();
    const shiftMap = new Map<string, Shift>();

    // Load initial canonical shifts
    for (const initShift of initialShifts) {
      shiftMap.set(initShift.id, sanitizeShift(initShift));
    }

    // Merge saved shifts from localStorage with official CCNL timbrature rounding
    for (const s of parsedShifts) {
      shiftMap.set(s.id, sanitizeShift(s));
    }

    return Array.from(shiftMap.values());
  });

  const [contract, setContract] = useState<ContractSettings>(() => {
    const saved = localStorage.getItem('tl_contract_v1');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return DEFAULT_CONTRACT;
  });

  const [vacationSettings, setVacationSettings] = useState<VacationSettings>(() => {
    const saved = localStorage.getItem('tl_vacation_v1');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return INITIAL_VACATION;
  });

  const [presets, setPresets] = useState<ShiftPreset[]>(() => {
    const saved = localStorage.getItem('tl_presets_v1');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return DEFAULT_PRESETS;
  });

  // Mobile times visibility state
  const [showMobileTimes, setShowMobileTimes] = useState<boolean>(true);

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [selectedDateForAdd, setSelectedDateForAdd] = useState<string | undefined>(undefined);

  // Recalculate overtime for all shifts considering both daily thresholds AND weekly contract goal (e.g. 38h)
  const processedShifts = React.useMemo(() => {
    return recalculateWeeklyOvertimeForShifts(shifts, contract);
  }, [shifts, contract]);

  // Sync LocalStorage & Remote Database
  const [dbLoaded, setDbLoaded] = useState(false);

  // Load initial data from server database file
  useEffect(() => {
    fetch('/api/database')
      .then((res) => res.json())
      .then((resData) => {
        if (resData && resData.success && resData.data) {
          const db = resData.data;
          let hasDataInDb = false;

          if (db.shifts && Array.isArray(db.shifts) && db.shifts.length > 0) {
            setShifts(db.shifts.map(sanitizeShift));
            hasDataInDb = true;
          }
          if (db.contract && typeof db.contract === 'object') {
            setContract(db.contract);
            hasDataInDb = true;
          }
          if (db.vacation && typeof db.vacation === 'object') {
            setVacationSettings(db.vacation);
            hasDataInDb = true;
          }
          if (db.presets && Array.isArray(db.presets) && db.presets.length > 0) {
            setPresets(db.presets);
            hasDataInDb = true;
          }

          // If database is empty, seed it with initial defaults
          if (!hasDataInDb) {
            fetch('/api/database', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                shifts: getInitialShifts(),
                contract: DEFAULT_CONTRACT,
                vacation: INITIAL_VACATION,
                presets: DEFAULT_PRESETS,
              }),
            }).catch(console.error);
          }
        }
      })
      .catch((err) => {
        console.warn('Could not load database file from server, falling back to local storage:', err);
      })
      .finally(() => {
        setDbLoaded(true);
      });
  }, []);

  // Save changes to database file and localStorage
  useEffect(() => {
    localStorage.setItem('tl_shifts_v1', JSON.stringify(shifts));
    if (dbLoaded) {
      fetch('/api/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shifts }),
      }).catch(console.error);
    }
  }, [shifts, dbLoaded]);

  useEffect(() => {
    localStorage.setItem('tl_contract_v1', JSON.stringify(contract));
    if (dbLoaded) {
      fetch('/api/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contract }),
      }).catch(console.error);
    }
  }, [contract, dbLoaded]);

  useEffect(() => {
    localStorage.setItem('tl_vacation_v1', JSON.stringify(vacationSettings));
    if (dbLoaded) {
      fetch('/api/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vacation: vacationSettings }),
      }).catch(console.error);
    }
  }, [vacationSettings, dbLoaded]);

  useEffect(() => {
    localStorage.setItem('tl_presets_v1', JSON.stringify(presets));
    if (dbLoaded) {
      fetch('/api/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ presets }),
      }).catch(console.error);
    }
  }, [presets, dbLoaded]);

  // Handlers for Shifts
  const handleSaveShift = (newShift: Shift) => {
    setShifts((prev) => {
      const idx = prev.findIndex((s) => s.id === newShift.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = newShift;
        return updated;
      }
      return [...prev, newShift];
    });
    setEditingShift(null);
    setSelectedDateForAdd(undefined);
  };

  const handleDeleteShift = (shiftId: string) => {
    setShifts((prev) => prev.filter((s) => s.id !== shiftId));
  };

  const handleShiftsExtracted = (
    extractedShifts: Shift[],
    replaceMode: 'dates' | 'month' | 'none' | boolean = 'dates'
  ) => {
    if (extractedShifts.length === 0) return;

    setShifts((prev) => {
      if (replaceMode === 'dates' || replaceMode === true) {
        // Replace ONLY shifts that share exact dates with the newly loaded shifts
        const extractedDates = new Set(extractedShifts.map((s) => s.date));
        const preservedShifts = prev.filter((s) => !extractedDates.has(s.date));
        return [...preservedShifts, ...extractedShifts];
      } else if (replaceMode === 'month') {
        // Replace all shifts for the months contained in the extracted shifts batch
        const monthPrefixes = new Set(extractedShifts.map((s) => s.date.substring(0, 7)));
        const preservedShifts = prev.filter((s) => !monthPrefixes.has(s.date.substring(0, 7)));
        return [...preservedShifts, ...extractedShifts];
      } else {
        // Append without replacing
        return [...prev, ...extractedShifts];
      }
    });

    // Automatically navigate to the month of the first extracted shift
    if (extractedShifts[0]?.date) {
      setSelectedMonth(extractedShifts[0].date.substring(0, 7));
    }
    setCurrentView('calendar');
  };

  const handleAddVacationPeriod = (
    startDateStr: string,
    endDateStr: string,
    type: 'ferie' | 'permesso' | 'congedo',
    notes: string
  ) => {
    const [sy, sm, sd] = startDateStr.split('-').map(Number);
    const [ey, em, ed] = endDateStr.split('-').map(Number);
    const start = new Date(sy, sm - 1, sd, 12, 0, 0);
    const end = new Date(ey, em - 1, ed, 12, 0, 0);

    const newShifts: Shift[] = [];
    for (let d = new Date(start); d <= end; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 12, 0, 0)) {
      const dateIso = formatDateToIso(d);
      const shiftType = type === 'ferie' ? 'Ferie' : type === 'permesso' ? 'Permesso' : 'Congedo';
      const defaultNotes = notes || (type === 'ferie' ? 'Giornata di ferie' : type === 'permesso' ? 'Permesso ROL' : 'Congedo');
      newShifts.push({
        id: `vacation-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        date: dateIso,
        type: shiftType,
        category: type,
        startTime: '08:00',
        endTime: type === 'permesso' ? '12:00' : '16:00',
        breakMinutes: 0,
        workedHours: type === 'permesso' ? 4 : 0,
        overtimeHours: 0,
        isNight: false,
        isHoliday: false,
        notes: defaultNotes,
      });
    }

    setShifts((prev) => {
      // replace any shift on those dates
      const datesToReplace = new Set(newShifts.map((s) => s.date));
      const filtered = prev.filter((s) => !datesToReplace.has(s.date));
      return [...filtered, ...newShifts];
    });
  };

  // Export handlers
  const handleExportICS = () => {
    const monthShifts = processedShifts.filter((s) => s.date.startsWith(selectedMonth));
    const icsContent = generateICSFile(
      monthShifts.length > 0 ? monthShifts : processedShifts,
      `Turni Lavoro - ${selectedMonth}`
    );
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `turni_${selectedMonth}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportCSV = () => {
    const monthShifts = processedShifts.filter((s) => s.date.startsWith(selectedMonth));
    const csvContent = generateCSVReport(
      monthShifts.length > 0 ? monthShifts : processedShifts,
      selectedMonth
    );
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `report_turni_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportBackup = () => {
    let payslips = [];
    try {
      const storedP = localStorage.getItem('tl_saved_payslips');
      if (storedP) payslips = JSON.parse(storedP);
    } catch (e) {
      console.error(e);
    }

    let stores = [];
    try {
      const storedS = localStorage.getItem('tl_stores_v1');
      if (storedS) stores = JSON.parse(storedS);
    } catch (e) {
      console.error(e);
    }

    const backupObj = {
      shifts,
      contract,
      vacationSettings,
      presets,
      payslips,
      stores,
      version: '2.0',
      exportedAt: new Date().toISOString(),
    };
    const jsonStr = JSON.stringify(backupObj, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `backup_completo_turnilavoro_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportBackup = (jsonStr: string) => {
    try {
      const data = JSON.parse(jsonStr);
      if (data.shifts) setShifts(data.shifts);
      if (data.contract) setContract(data.contract);
      if (data.vacationSettings) setVacationSettings(data.vacationSettings);
      if (data.presets) setPresets(data.presets);
      if (data.payslips) {
        localStorage.setItem('tl_saved_payslips', JSON.stringify(data.payslips));
      }
      if (data.stores) {
        localStorage.setItem('tl_stores_v1', JSON.stringify(data.stores));
      }

      // Sync entire restored payload to server database.json
      fetch('/api/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shifts: data.shifts || shifts,
          contract: data.contract || contract,
          vacation: data.vacationSettings || vacationSettings,
          presets: data.presets || presets,
          payslips: data.payslips || [],
        }),
      }).catch(console.error);

      alert('Backup completo ripristinato con successo! Tutti i turni, contratti e buste paga sono stati caricati.');
      window.location.reload();
    } catch (e) {
      alert('File di backup non valido.');
    }
  };

  const handleResetDemoData = () => {
    if (confirm('Sei sicuro di voler ripristinare i dati di esempio iniziali? I tuoi dati attuali verranno sovrascritti.')) {
      setShifts(getInitialShifts());
      setContract(DEFAULT_CONTRACT);
      setVacationSettings(INITIAL_VACATION);
      setPresets(DEFAULT_PRESETS);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      
      {/* Top Header Navbar */}
      <Navbar
        currentView={currentView}
        setCurrentView={setCurrentView}
        selectedMonth={selectedMonth}
        setSelectedMonth={setSelectedMonth}
        onOpenAddModal={() => {
          setSelectedDateForAdd(undefined);
          setEditingShift(null);
          setIsAddModalOpen(true);
        }}
        onExportICS={handleExportICS}
        onExportCSV={handleExportCSV}
        onExportJSON={handleExportBackup}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        showMobileTimes={showMobileTimes}
        onToggleMobileTimes={() => setShowMobileTimes(prev => !prev)}
        theme={theme}
        onChangeTheme={setTheme}
      />

      {/* Main Container with Layout & Sidebar */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 flex flex-col lg:flex-row gap-6">
        
        {/* Main View Area */}
        <main className="flex-1 min-w-0">
          
          {currentView === 'calendar' && (
            <CalendarView
              selectedMonth={selectedMonth}
              shifts={processedShifts}
              presets={presets}
              showMobileTimes={showMobileTimes}
              onSelectDate={(dateStr) => {
                setSelectedDateForAdd(dateStr);
                setEditingShift(null);
                setIsAddModalOpen(true);
              }}
              onEditShift={(shift) => {
                setEditingShift(shift);
                setIsAddModalOpen(true);
              }}
              onOpenSidebar={() => setIsSidebarOpen(true)}
            />
          )}

          {currentView === 'table' && (
            <TableView
              shifts={processedShifts}
              selectedMonth={selectedMonth}
              onEditShift={(shift) => {
                setEditingShift(shift);
                setIsAddModalOpen(true);
              }}
              onDeleteShift={handleDeleteShift}
              onOpenAddModal={() => {
                setSelectedDateForAdd(undefined);
                setEditingShift(null);
                setIsAddModalOpen(true);
              }}
            />
          )}

          {currentView === 'stats' && (
            <HoursStatsView
              selectedMonth={selectedMonth}
              shifts={processedShifts}
              contract={contract}
            />
          )}

          {currentView === 'ferie' && (
            <VacationTrackerView
              shifts={processedShifts}
              vacationSettings={vacationSettings}
              contract={contract}
              onUpdateSettings={setVacationSettings}
              onAddVacationShift={handleAddVacationPeriod}
              onDeleteShift={handleDeleteShift}
            />
          )}

          {currentView === 'payslip' && (
            <PayslipAnalyzerView
              selectedMonth={selectedMonth}
              shifts={processedShifts}
              contract={contract}
            />
          )}

          {currentView === 'reports' && (
            <ReportsPrintView
              selectedMonth={selectedMonth}
              setSelectedMonth={setSelectedMonth}
              shifts={processedShifts}
              contract={contract}
              vacationSettings={vacationSettings}
              onExportBackup={handleExportBackup}
              onImportBackup={handleImportBackup}
              onResetDemoData={handleResetDemoData}
            />
          )}

          {currentView === 'settings' && (
            <ContractSettingsView
              contract={contract}
              vacationSettings={vacationSettings}
              presets={presets}
              onSaveContract={setContract}
              onSaveVacationSettings={setVacationSettings}
              onSavePresets={setPresets}
              onExportBackup={handleExportBackup}
              onImportBackup={handleImportBackup}
              onResetDemoData={handleResetDemoData}
            />
          )}

          {currentView === 'docker' && (
            <DockerGuideView />
          )}

          {currentView === 'upload' && (
            <AIExtractorModal
              selectedMonth={selectedMonth}
              onShiftsExtracted={handleShiftsExtracted}
              onClose={() => setCurrentView('calendar')}
            />
          )}

        </main>

        {/* Sidebar for Condensed Weekly Mon-Sun & Monthly Stats */}
        <Sidebar
          selectedMonth={selectedMonth}
          shifts={processedShifts}
          contract={contract}
          vacationSettings={vacationSettings}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

      </div>

      {/* Shift Edit / Add Form Modal */}
      {isAddModalOpen && (
        <ShiftFormModal
          initialShift={editingShift}
          initialDate={selectedDateForAdd}
          presets={presets}
          contract={contract}
          onSave={handleSaveShift}
          onDelete={handleDeleteShift}
          onClose={() => {
            setIsAddModalOpen(false);
            setEditingShift(null);
            setSelectedDateForAdd(undefined);
          }}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-slate-500 flex flex-col sm:flex-row justify-between items-center gap-2">
          <span>TurniLavoro • Gestione Turni, Ore Straordinarie e Ferie</span>
          <span>Analisi Intelligente orari da PDF e Foto via Gemini AI</span>
        </div>
      </footer>

    </div>
  );
}
