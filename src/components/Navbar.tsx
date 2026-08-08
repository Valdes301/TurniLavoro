import React, { useState } from 'react';
import { 
  Calendar, 
  List, 
  FileUp, 
  Clock, 
  Palmtree, 
  Settings, 
  Download, 
  ChevronLeft, 
  ChevronRight,
  Plus,
  PanelRight,
  BarChart3,
  Server,
  Sun,
  Moon,
  Laptop,
  Receipt,
  Printer,
  Menu,
  X,
  Database
} from 'lucide-react';
import { ViewMode } from '../types';

interface NavbarProps {
  currentView: ViewMode;
  setCurrentView: (view: ViewMode) => void;
  selectedMonth: string; // YYYY-MM
  setSelectedMonth: (month: string) => void;
  onOpenAddModal: () => void;
  onExportICS: () => void;
  onExportCSV: () => void;
  onExportJSON?: () => void;
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
  showMobileTimes?: boolean;
  onToggleMobileTimes?: () => void;
  theme: 'light' | 'dark' | 'system';
  onChangeTheme: (theme: 'light' | 'dark' | 'system') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  setCurrentView,
  selectedMonth,
  setSelectedMonth,
  onOpenAddModal,
  onExportICS,
  onExportCSV,
  onExportJSON,
  onToggleSidebar,
  isSidebarOpen,
  showMobileTimes = true,
  onToggleMobileTimes,
  theme,
  onChangeTheme,
}) => {
  const [isNavDrawerOpen, setIsNavDrawerOpen] = useState(false);

  // Parse year and month
  const [yearStr, monthStr] = selectedMonth.split('-');
  const dateObj = new Date(parseInt(yearStr), parseInt(monthStr) - 1, 1);
  
  const monthNameItalian = dateObj.toLocaleDateString('it-IT', {
    month: 'long',
    year: 'numeric',
  });

  const handlePrevMonth = () => {
    const prevDate = new Date(parseInt(yearStr), parseInt(monthStr) - 2, 1);
    const y = prevDate.getFullYear();
    const m = String(prevDate.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${y}-${m}`);
  };

  const handleNextMonth = () => {
    const nextDate = new Date(parseInt(yearStr), parseInt(monthStr), 1);
    const y = nextDate.getFullYear();
    const m = String(nextDate.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${y}-${m}`);
  };

  const handleCurrentMonth = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${y}-${m}`);
  };

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between py-3 gap-3">
          
          {/* Logo & Month Navigation */}
          <div className="flex items-center justify-between">
            {/* Clickable Clock Icon Logo that opens Navigation Sidebar */}
            <button
              onClick={() => setIsNavDrawerOpen(!isNavDrawerOpen)}
              className="flex items-center gap-3 group text-left p-1 -ml-1 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              title="Apri Menu Navigazione Pagine"
            >
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 group-hover:shadow-blue-500/30 transition-all">
                  <Clock className="w-5 h-5" />
                </div>
                <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-xs">
                  <Menu className="w-2.5 h-2.5" />
                </span>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-none group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    TurniLavoro
                  </h1>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 sm:hidden">
                    Menu
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Monitoraggio Turni & Ferie
                </p>
              </div>
            </button>

            {/* Month Navigator */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition-all shadow-2xs hover:text-slate-900 dark:hover:text-white"
                title="Mese precedente"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <button
                onClick={handleCurrentMonth}
                className="px-3 text-xs font-semibold text-slate-800 dark:text-slate-200 capitalize hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                {monthNameItalian}
              </button>

              <button
                onClick={handleNextMonth}
                className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition-all shadow-2xs hover:text-slate-900 dark:hover:text-white"
                title="Mese successivo"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between sm:justify-end gap-1 sm:gap-2 w-full sm:w-auto py-0.5">
            {/* 1. + Turno */}
            <button
              onClick={onOpenAddModal}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-1.5 sm:px-3 py-1.5 text-xs font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-all shadow-xs cursor-pointer whitespace-nowrap"
              title="Aggiungi nuovo turno"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span>+ Turno</span>
            </button>

            {/* 2. Carica Orario AI */}
            <button
              onClick={() => setCurrentView('upload')}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-1.5 sm:px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200/80 dark:border-indigo-800 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-all cursor-pointer whitespace-nowrap"
              title="Carica orario AI da PDF o Foto"
            >
              <FileUp className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span className="hidden md:inline">Carica Orario AI</span>
              <span className="md:hidden">Carica AI</span>
            </button>

            {/* 3. Orari ON/OFF */}
            {currentView === 'calendar' && onToggleMobileTimes && (
              <button
                onClick={onToggleMobileTimes}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-1 px-1.5 sm:px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer whitespace-nowrap ${
                  showMobileTimes
                    ? 'bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                }`}
                title="Mostra o nascondi gli orari nei riquadri del calendario su smartphone"
              >
                <Clock className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span className="hidden md:inline">Orari: </span>
                <span>{showMobileTimes ? 'ON' : 'OFF'}</span>
              </button>
            )}

            {/* 4. Riepilogo */}
            <button
              onClick={onToggleSidebar}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1 px-1.5 sm:px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer whitespace-nowrap ${
                isSidebarOpen
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
              title="Mostra / Nascondi Sidebar di Riepilogo"
            >
              <PanelRight className="w-3.5 h-3.5 shrink-0" />
              <span>Riepilogo</span>
            </button>
          </div>

        </div>

        {/* Navigation Tabs (Hidden on mobile, visible on sm and up) */}
        <nav className="hidden sm:flex space-x-1 border-t border-slate-100 dark:border-slate-800/80 pt-1 pb-1 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setCurrentView('calendar')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              currentView === 'calendar'
                ? 'bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Calendario Turni</span>
          </button>

          <button
            onClick={() => setCurrentView('table')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              currentView === 'table'
                ? 'bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <List className="w-4 h-4" />
            <span>Elenco Turni</span>
          </button>

          <button
            onClick={() => setCurrentView('stats')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              currentView === 'stats'
                ? 'bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Ore & Straordinari</span>
          </button>

          <button
            onClick={() => setCurrentView('ferie')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              currentView === 'ferie'
                ? 'bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Palmtree className="w-4 h-4" />
            <span>Ferie e Permessi</span>
          </button>

          <button
            onClick={() => setCurrentView('payslip')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              currentView === 'payslip'
                ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800 shadow-2xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Receipt className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Busta Paga</span>
          </button>

          <button
            onClick={() => setCurrentView('reports')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              currentView === 'reports'
                ? 'bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800 shadow-2xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Printer className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Stampe & Report</span>
          </button>

          <button
            onClick={() => setCurrentView('settings')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              currentView === 'settings'
                ? 'bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Contratto & Presets</span>
          </button>

          <button
            onClick={() => setCurrentView('docker')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              currentView === 'docker'
                ? 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Server className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Guida Docker & Pi</span>
          </button>
        </nav>
      </div>

      {/* Slide-over Navigation Drawer Sidebar (Triggered by Clock icon) */}
      {isNavDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" 
            onClick={() => setIsNavDrawerOpen(false)}
          />

          {/* Drawer Sidebar Panel */}
          <div className="fixed inset-y-0 left-0 max-w-full flex">
            <div className="w-80 max-w-[85vw] bg-white dark:bg-slate-900 shadow-2xl border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between h-full">
              
              {/* Header */}
              <div className="p-3 px-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/90 dark:bg-slate-800/60 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-xs shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-900 dark:text-slate-100 text-sm leading-tight">
                      Menu Pagine
                    </h2>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      Seleziona la sezione
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsNavDrawerOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
                  title="Chiudi Menu"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Navigation Links - Categorized Sections */}
              <div className="p-2 sm:p-2.5 overflow-y-auto space-y-3 flex-1 min-h-0 scrollbar-thin">
                
                {/* Category 1: Pianificazione */}
                <div className="space-y-1">
                  <div className="px-2 py-0.5 text-[10px] font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                    📅 Pianificazione & Turni
                  </div>
                  {[
                    { id: 'calendar', label: 'Calendario Turni', desc: 'Vista mensile e settimanale', icon: Calendar, color: 'text-blue-600 dark:text-blue-400' },
                    { id: 'table', label: 'Tabella Elenco Turni', desc: 'Vista a tabella dettagliata e filtri', icon: List, color: 'text-sky-600 dark:text-sky-400' },
                    { id: 'stats', label: 'Ore & Straordinari', desc: 'Statistiche e riepiloghi settimanali', icon: Clock, color: 'text-purple-600 dark:text-purple-400' },
                  ].map((item) => {
                    const IconComp = item.icon;
                    const isActive = currentView === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setCurrentView(item.id as ViewMode);
                          setIsNavDrawerOpen(false);
                        }}
                        className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-left transition-all cursor-pointer ${
                          isActive
                            ? 'bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800 shadow-2xs font-bold'
                            : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-transparent'
                        }`}
                      >
                        <div className={`p-1.5 rounded-lg shrink-0 ${isActive ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 ' + item.color}`}>
                          <IconComp className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold truncate leading-tight">{item.label}</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-normal truncate leading-tight">{item.desc}</div>
                        </div>
                        {isActive && (
                          <div className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Category 2: Presenze & Compensi */}
                <div className="space-y-1 pt-1 border-t border-slate-100 dark:border-slate-800">
                  <div className="px-2 py-0.5 text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                    🌴 Ferie & Busta Paga
                  </div>
                  {[
                    { id: 'ferie', label: 'Ferie e Permessi', desc: 'Saldo ferie, ROL e storico goduti', icon: Palmtree, color: 'text-emerald-600 dark:text-emerald-400' },
                    { id: 'payslip', label: 'Busta Paga', desc: 'Analisi competenze e trattenute', icon: Receipt, color: 'text-amber-600 dark:text-amber-400' },
                  ].map((item) => {
                    const IconComp = item.icon;
                    const isActive = currentView === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setCurrentView(item.id as ViewMode);
                          setIsNavDrawerOpen(false);
                        }}
                        className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-left transition-all cursor-pointer ${
                          isActive
                            ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800 shadow-2xs font-bold'
                            : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-transparent'
                        }`}
                      >
                        <div className={`p-1.5 rounded-lg shrink-0 ${isActive ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-800 ' + item.color}`}>
                          <IconComp className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold truncate leading-tight">{item.label}</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-normal truncate leading-tight">{item.desc}</div>
                        </div>
                        {isActive && (
                          <div className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-400 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Category 3: Report & Impostazioni */}
                <div className="space-y-1 pt-1 border-t border-slate-100 dark:border-slate-800">
                  <div className="px-2 py-0.5 text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                    ⚙️ Report & Configurazione
                  </div>
                  {[
                    { id: 'reports', label: 'Backup, Ripristino & Report', desc: 'Salvataggio JSON, PDF cartellino e CSV', icon: Database, color: 'text-emerald-600 dark:text-emerald-400' },
                    { id: 'settings', label: 'Contratto & Presets', desc: 'Soglie orarie, festivi e negozi', icon: Settings, color: 'text-indigo-600 dark:text-indigo-400' },
                    { id: 'docker', label: 'Guida Docker & Pi', desc: 'Installazione, server e backup', icon: Server, color: 'text-cyan-600 dark:text-cyan-400' },
                  ].map((item) => {
                    const IconComp = item.icon;
                    const isActive = currentView === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setCurrentView(item.id as ViewMode);
                          setIsNavDrawerOpen(false);
                        }}
                        className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-left transition-all cursor-pointer ${
                          isActive
                            ? 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800 shadow-2xs font-bold'
                            : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-transparent'
                        }`}
                      >
                        <div className={`p-1.5 rounded-lg shrink-0 ${isActive ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 ' + item.color}`}>
                          <IconComp className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold truncate leading-tight">{item.label}</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-normal truncate leading-tight">{item.desc}</div>
                        </div>
                        {isActive && (
                          <div className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>

              </div>

              {/* Footer Quick Actions - Compact & Streamlined */}
              <div className="p-2.5 sm:p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-800/80 space-y-2 shrink-0">
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => {
                      setIsNavDrawerOpen(false);
                      onOpenAddModal();
                    }}
                    className="flex items-center justify-center gap-1 py-1.5 px-2 bg-blue-600 text-white font-bold text-xs rounded-lg hover:bg-blue-700 shadow-xs transition-all cursor-pointer truncate"
                    title="Aggiungi nuovo turno"
                  >
                    <Plus className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Nuovo Turno</span>
                  </button>

                  <button
                    onClick={() => {
                      setCurrentView('upload');
                      setIsNavDrawerOpen(false);
                    }}
                    className="flex items-center justify-center gap-1 py-1.5 px-2 bg-indigo-600 text-white font-bold text-xs rounded-lg hover:bg-indigo-700 shadow-xs transition-all cursor-pointer truncate"
                    title="Carica orario AI da PDF o Foto"
                  >
                    <FileUp className="w-3.5 h-3.5 shrink-0 text-indigo-200" />
                    <span className="truncate">Carica Orario AI</span>
                  </button>
                </div>

                {/* Export Data Section with 4 Download/Export Options */}
                <div className="space-y-1 pt-1 border-t border-slate-200/80 dark:border-slate-700/80">
                  <div className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    Esporta / Download
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    <button
                      onClick={() => {
                        setCurrentView('reports');
                        setIsNavDrawerOpen(false);
                      }}
                      className="flex items-center justify-center gap-1 py-1.5 px-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-[10.5px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                      title="Apri Stampa e Report PDF"
                    >
                      <Printer className="w-3 h-3 text-red-500 dark:text-red-400 shrink-0" />
                      <span>PDF</span>
                    </button>
                    <button
                      onClick={() => {
                        onExportICS();
                        setIsNavDrawerOpen(false);
                      }}
                      className="flex items-center justify-center gap-1 py-1.5 px-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-[10.5px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                      title="Esporta calendario iCal (.ics)"
                    >
                      <Download className="w-3 h-3 text-blue-600 dark:text-blue-400 shrink-0" />
                      <span>iCal</span>
                    </button>
                    <button
                      onClick={() => {
                        onExportCSV();
                        setIsNavDrawerOpen(false);
                      }}
                      className="flex items-center justify-center gap-1 py-1.5 px-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-[10.5px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                      title="Esporta in foglio Excel CSV"
                    >
                      <Download className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>CSV</span>
                    </button>
                    <button
                      onClick={() => {
                        if (onExportJSON) onExportJSON();
                        else onExportCSV();
                        setIsNavDrawerOpen(false);
                      }}
                      className="flex items-center justify-center gap-1 py-1.5 px-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-[10.5px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                      title="Download backup completo JSON"
                    >
                      <Download className="w-3 h-3 text-purple-600 dark:text-purple-400 shrink-0" />
                      <span>JSON</span>
                    </button>
                  </div>
                </div>

                {/* Visual Theme Section */}
                <div className="space-y-1 pt-1 border-t border-slate-200/80 dark:border-slate-700/80">
                  <div className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    Tema Visivo
                  </div>
                  <div className="grid grid-cols-3 gap-1 bg-white dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                    <button
                      onClick={() => onChangeTheme('light')}
                      className={`flex items-center justify-center gap-1 py-1 px-1.5 rounded-md text-[10.5px] font-bold cursor-pointer transition-all ${
                        theme === 'light' 
                          ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 shadow-2xs' 
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                      }`}
                      title="Chiaro"
                    >
                      <Sun className="w-3 h-3 text-amber-500 shrink-0" />
                      <span>Chiaro</span>
                    </button>
                    <button
                      onClick={() => onChangeTheme('dark')}
                      className={`flex items-center justify-center gap-1 py-1 px-1.5 rounded-md text-[10.5px] font-bold cursor-pointer transition-all ${
                        theme === 'dark' 
                          ? 'bg-blue-900 text-blue-200 shadow-2xs' 
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                      }`}
                      title="Scuro"
                    >
                      <Moon className="w-3 h-3 text-blue-400 shrink-0" />
                      <span>Scuro</span>
                    </button>
                    <button
                      onClick={() => onChangeTheme('system')}
                      className={`flex items-center justify-center gap-1 py-1 px-1.5 rounded-md text-[10.5px] font-bold cursor-pointer transition-all ${
                        theme === 'system' 
                          ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-2xs' 
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                      }`}
                      title="Sistema"
                    >
                      <Laptop className="w-3 h-3 text-indigo-500 shrink-0" />
                      <span>Auto</span>
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </header>
  );
};

