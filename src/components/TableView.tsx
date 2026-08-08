import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Edit2, 
  Trash2, 
  Plus, 
  Moon, 
  Sparkles, 
  LayoutGrid, 
  Table as TableIcon, 
  SlidersHorizontal, 
  Check, 
  Clock, 
  Coffee, 
  FileText, 
  Calendar,
  Store
} from 'lucide-react';
import { Shift } from '../types';
import { getShiftDisplayCodeAndName, formatOvertime, formatHours, getLocationBadge } from '../utils/shiftUtils';

interface TableViewProps {
  shifts: Shift[];
  selectedMonth: string;
  onEditShift: (shift: Shift) => void;
  onDeleteShift: (shiftId: string) => void;
  onOpenAddModal: () => void;
}

interface VisibleColumns {
  date: boolean;
  shift: boolean;
  category: boolean;
  location: boolean;
  time: boolean;
  break: boolean;
  hours: boolean;
  overtime: boolean;
  notes: boolean;
  actions: boolean;
}

export const TableView: React.FC<TableViewProps> = ({
  shifts,
  selectedMonth,
  onEditShift,
  onDeleteShift,
  onOpenAddModal,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  
  // Default to 'cards' on mobile (< 640px) and 'table' on desktop
  const [viewMode, setViewMode] = useState<'cards' | 'table'>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 640) {
      return 'cards';
    }
    return 'table';
  });

  const [showColumnMenu, setShowColumnMenu] = useState(false);

  // Column visibility state for table mode
  const [visibleColumns, setVisibleColumns] = useState<VisibleColumns>({
    date: true,
    shift: true,
    category: true,
    location: true,
    time: true,
    break: true,
    hours: true,
    overtime: true,
    notes: true,
    actions: true,
  });

  // Filter shifts
  const filteredShifts = shifts.filter((s) => {
    const matchesMonth = s.date.startsWith(selectedMonth);
    const matchesCategory = categoryFilter === 'all' || s.category === categoryFilter;
    const matchesSearch =
      s.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.date.includes(searchTerm) ||
      (s.location || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.notes || '').toLowerCase().includes(searchTerm.toLowerCase());

    return matchesMonth && matchesCategory && matchesSearch;
  });

  // Sort by date ascending
  filteredShifts.sort((a, b) => a.date.localeCompare(b.date));

  const totalWorked = filteredShifts.reduce((acc, s) => acc + s.workedHours, 0);
  const totalOvertime = filteredShifts.reduce((acc, s) => acc + s.overtimeHours, 0);

  const toggleColumn = (key: keyof VisibleColumns) => {
    setVisibleColumns((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Helper for formatting Italian date display
  const formatItalianDate = (dateIso: string) => {
    const [y, m, d] = dateIso.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d, 12, 0, 0);
    const dayNames = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
    const monthNames = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giug', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
    
    return {
      dayName: dayNames[dateObj.getDay()],
      formatted: `${d} ${monthNames[dateObj.getMonth()]} ${y}`,
    };
  };

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case 'ferie':
        return 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case 'permesso':
        return 'bg-pink-100 dark:bg-pink-950/80 text-pink-800 dark:text-pink-300 border-pink-200 dark:border-pink-800';
      case 'congedo':
        return 'bg-purple-100 dark:bg-purple-950/80 text-purple-900 dark:text-purple-200 border-purple-200 dark:border-purple-800';
      case 'riposo':
        return 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700';
      case 'straordinario':
        return 'bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 'malattia':
        return 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800';
      default:
        return 'bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800';
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden space-y-0">
      
      {/* Controls Bar */}
      <div className="p-3.5 sm:p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex flex-col gap-3">
        
        {/* Top Controls Row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cerca turno, data o nota..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* View Mode Switcher & Add Button */}
          <div className="flex items-center gap-2 justify-between sm:justify-end">
            
            {/* View Mode Switcher (Cards vs Table) */}
            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setViewMode('cards')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === 'cards'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
                title="Vista a Schede (Perfetta per Smartphone - Nessuno scorrimento orizzontale)"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden xs:inline sm:inline">Schede</span>
              </button>
              
              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
                title="Vista a Tabella classica"
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span className="hidden xs:inline sm:inline">Tabella</span>
              </button>
            </div>

            {/* Column Customizer Toggle (when in Table mode or anytime) */}
            {viewMode === 'table' && (
              <div className="relative">
                <button
                  onClick={() => setShowColumnMenu((prev) => !prev)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Seleziona colonne da mostrare o nascondere"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-blue-500" />
                  <span className="hidden md:inline">Colonne</span>
                </button>

                {/* Column Selection Dropdown */}
                {showColumnMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg p-2 z-30 space-y-1 text-xs">
                    <div className="font-bold text-[11px] text-slate-400 dark:text-slate-500 uppercase px-2 py-1 border-b border-slate-100 dark:border-slate-800">
                      Mostra / Nascondi Colonne
                    </div>
                    {[
                      { key: 'date', label: 'Data' },
                      { key: 'shift', label: 'Turno / Sigla' },
                      { key: 'category', label: 'Categoria' },
                      { key: 'time', label: 'Orario' },
                      { key: 'break', label: 'Pausa' },
                      { key: 'hours', label: 'Ore Lavorate' },
                      { key: 'overtime', label: 'Straordinari' },
                      { key: 'notes', label: 'Note' },
                      { key: 'actions', label: 'Azioni' },
                    ].map((col) => (
                      <button
                        key={col.key}
                        onClick={() => toggleColumn(col.key as keyof VisibleColumns)}
                        className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-left text-slate-700 dark:text-slate-300 cursor-pointer"
                      >
                        <span>{col.label}</span>
                        {visibleColumns[col.key as keyof VisibleColumns] && (
                          <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Add Shift Button */}
            <button
              onClick={onOpenAddModal}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-colors shadow-2xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nuovo</span>
            </button>
          </div>

        </div>

        {/* Secondary Category Filter Bar */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 shrink-0 flex items-center gap-1">
            <Filter className="w-3 h-3" />
            <span>Filtra:</span>
          </span>
          {[
            { id: 'all', label: 'Tutti' },
            { id: 'work', label: 'Lavoro' },
            { id: 'ferie', label: 'Ferie' },
            { id: 'permesso', label: 'Permessi' },
            { id: 'straordinario', label: 'Extra' },
            { id: 'riposo', label: 'Riposi' },
            { id: 'malattia', label: 'Malattia' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                categoryFilter === cat.id
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-2xs font-bold'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

      </div>

      {/* RENDER MODE 1: CARDS VIEW (Responsive, No Horizontal Scroll for Mobile) */}
      {viewMode === 'cards' ? (
        <div className="p-3.5 sm:p-4 space-y-3">
          {filteredShifts.length === 0 ? (
            <div className="p-8 text-center text-slate-400 dark:text-slate-500 bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
              Nessun turno trovato per i filtri selezionati.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredShifts.map((shift) => {
                const { code, name } = getShiftDisplayCodeAndName(shift);
                const { dayName, formatted } = formatItalianDate(shift.date);
                const categoryClass = getCategoryBadgeClass(shift.category);

                return (
                  <div
                    key={shift.id}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3.5 shadow-2xs hover:border-blue-300 dark:hover:border-blue-700 transition-all flex flex-col justify-between space-y-3"
                  >
                    {/* Top Row: Date & Category */}
                    <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                            {dayName}
                          </span>
                          {shift.isHoliday && (
                            <span className="text-[10px] bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-extrabold px-1.5 py-0.2 rounded-md">
                              Festivo
                            </span>
                          )}
                        </div>
                        <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100 block">
                          {formatted}
                        </span>
                      </div>

                      <span className={`px-2 py-0.5 rounded-lg font-bold text-[10px] capitalize border ${categoryClass}`}>
                        {shift.category}
                      </span>
                    </div>

                    {/* Middle Info: Shift Name & Times */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded font-black text-xs bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300/60 dark:border-slate-700 shrink-0">
                          {code}
                        </span>
                        <span className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">
                          {name}
                        </span>
                        {shift.category === 'work' && shift.isNight && <Moon className="w-3.5 h-3.5 text-indigo-500 shrink-0 ml-auto" />}
                      </div>

                      {/* Time & Hours Banner */}
                      <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800/80 font-mono text-xs">
                        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                          <Clock className="w-3.5 h-3.5 text-blue-500 shrink-0" />
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
                              return <span className="font-bold text-violet-800 dark:text-violet-300">{t1} / {t2}</span>;
                            }
                            return <span className="font-semibold">{shift.startTime} - {shift.endTime}</span>;
                          })()}
                        </div>
                        <span className="font-extrabold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                          {formatHours(shift.workedHours)}
                        </span>
                      </div>

                      {/* Overtime / Pausa / Location / Notes Badges */}
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                        {shift.location && (
                          <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800 flex items-center gap-1">
                            <Store className="w-3 h-3 text-indigo-500" />
                            <span>{shift.location}</span>
                          </span>
                        )}

                        {shift.overtimeHours > 0 && (
                          <span className="px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 font-bold border border-purple-200 dark:border-purple-800 flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            <span>+{formatOvertime(shift.overtimeHours)} Straord.</span>
                          </span>
                        )}

                        {(() => {
                          const lowerType = (shift.type || '').toLowerCase();
                          const lowerNotes = (shift.notes || '').toLowerCase();
                          const isSplit = code === 'SP' || lowerType.includes('spezzato') || lowerNotes.includes('spezzato') || (shift.breakMinutes || 0) >= 120;
                          if (isSplit || !shift.breakMinutes) return null;
                          return (
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium flex items-center gap-1">
                              <Coffee className="w-3 h-3" />
                              <span>{shift.breakMinutes}m pausa</span>
                            </span>
                          );
                        })()}
                      </div>

                      {shift.notes && (
                        <div className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50/80 dark:bg-slate-800/40 p-2 rounded-xl border border-slate-100 dark:border-slate-800 flex items-start gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span className="italic">{shift.notes}</span>
                        </div>
                      )}
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                      <button
                        onClick={() => onEditShift(shift)}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900 rounded-xl transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Modifica</span>
                      </button>

                      <button
                        onClick={() => onDeleteShift(shift.id)}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900 rounded-xl transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Elimina</span>
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* RENDER MODE 2: TABLE VIEW (Classic customizable table) */
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                {visibleColumns.date && <th className="p-3">Data</th>}
                {visibleColumns.shift && <th className="p-3">Turno / Sigla</th>}
                {visibleColumns.category && <th className="p-3">Categoria</th>}
                {visibleColumns.location && <th className="p-3">Negozio</th>}
                {visibleColumns.time && <th className="p-3">Orario</th>}
                {visibleColumns.break && <th className="p-3">Pausa</th>}
                {visibleColumns.hours && <th className="p-3">Ore Lavorate</th>}
                {visibleColumns.overtime && <th className="p-3">Straordinari</th>}
                {visibleColumns.notes && <th className="p-3">Note</th>}
                {visibleColumns.actions && <th className="p-3 text-right">Azioni</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredShifts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400 dark:text-slate-500">
                    Nessun turno trovato per i filtri selezionati.
                  </td>
                </tr>
              ) : (
                filteredShifts.map((shift) => {
                  const { code, name } = getShiftDisplayCodeAndName(shift);
                  const categoryClass = getCategoryBadgeClass(shift.category);
                  const storeBadge = getLocationBadge(shift.location);

                  return (
                    <tr key={shift.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                      {visibleColumns.date && (
                        <td className="p-3 font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          {shift.date}
                          {shift.isHoliday && (
                            <span className="ml-1 text-[10px] bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold px-1.5 py-0.5 rounded-md">
                              Festivo
                            </span>
                          )}
                        </td>
                      )}

                      {visibleColumns.shift && (
                        <td className="p-3 font-medium text-slate-800 dark:text-slate-200">
                          <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.5 rounded font-black text-[11px] bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300/60 dark:border-slate-700 shrink-0">
                              {code}
                            </span>
                            <span className="truncate max-w-[150px]">{name}</span>
                            {shift.category === 'work' && shift.isNight && <Moon className="w-3 h-3 text-indigo-500 shrink-0" />}
                          </div>
                        </td>
                      )}

                      {visibleColumns.category && (
                        <td className="p-3 capitalize">
                          <span className={`px-2 py-0.5 rounded-md font-semibold text-[10px] ${categoryClass}`}>
                            {shift.category}
                          </span>
                        </td>
                      )}

                      {visibleColumns.location && (
                        <td className="p-3 text-slate-800 dark:text-slate-200">
                          {storeBadge ? (
                            <span className="inline-flex items-center gap-1 font-bold text-xs text-indigo-700 dark:text-indigo-300">
                              <span className={`px-1.5 py-0.2 rounded text-[10px] ${storeBadge.badgeBgClass}`}>
                                {storeBadge.code}
                              </span>
                              <span>{storeBadge.full}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-600 text-xs">-</span>
                          )}
                        </td>
                      )}

                      {visibleColumns.time && (
                        <td className="p-3 text-slate-600 dark:text-slate-300 font-mono whitespace-nowrap">
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
                              return <span className="font-bold text-violet-800 dark:text-violet-300">{t1} / {t2}</span>;
                            }
                            return `${shift.startTime} - ${shift.endTime}`;
                          })()}
                        </td>
                      )}

                      {visibleColumns.break && (
                        <td className="p-3 text-slate-500 dark:text-slate-400">
                          {(() => {
                            const lowerType = (shift.type || '').toLowerCase();
                            const lowerNotes = (shift.notes || '').toLowerCase();
                            const isSplit = code === 'SP' || lowerType.includes('spezzato') || lowerNotes.includes('spezzato') || (shift.breakMinutes || 0) >= 120;
                            if (isSplit) return '-';
                            return shift.breakMinutes ? `${shift.breakMinutes}m` : '-';
                          })()}
                        </td>
                      )}

                      {visibleColumns.hours && (
                        <td className="p-3 font-bold text-slate-900 dark:text-slate-100">
                          {formatHours(shift.workedHours)}
                        </td>
                      )}

                      {visibleColumns.overtime && (
                        <td className="p-3 font-bold text-purple-700 dark:text-purple-400">
                          {shift.overtimeHours > 0 ? `+${formatOvertime(shift.overtimeHours)}` : '-'}
                        </td>
                      )}

                      {visibleColumns.notes && (
                        <td className="p-3 text-slate-500 dark:text-slate-400 max-w-xs truncate">
                          {shift.notes || '-'}
                        </td>
                      )}

                      {visibleColumns.actions && (
                        <td className="p-3 text-right whitespace-nowrap space-x-1">
                          <button
                            onClick={() => onEditShift(shift)}
                            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 rounded-lg transition-colors"
                            title="Modifica"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteShift(shift.id)}
                            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-lg transition-colors"
                            title="Elimina"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer Total Bar */}
      <div className="bg-slate-50 dark:bg-slate-800/80 p-3.5 sm:p-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 gap-2">
        <span>Totale in Elenco: <strong>{filteredShifts.length} turni</strong></span>
        <div className="flex items-center gap-4">
          <span>Ore Totali: <strong className="text-slate-900 dark:text-slate-100">{formatHours(totalWorked)}</strong></span>
          <span>Straordinari: <strong className="text-purple-700 dark:text-purple-400">{totalOvertime > 0 ? `+${formatOvertime(totalOvertime)}` : '0h'}</strong></span>
        </div>
      </div>

    </div>
  );
};
