import React, { useState, useEffect } from 'react';
import { HardDrive, Database, RefreshCw, Sparkles, Trash2, CheckCircle2, AlertCircle, Cpu, FileJson, Archive, ShieldCheck, Zap } from 'lucide-react';
import { DiskStorageStats } from '../types';

interface StorageManagementSectionProps {
  onExportBackup: () => void;
  onRefreshShiftsNeeded?: () => void;
}

export const StorageManagementSection: React.FC<StorageManagementSectionProps> = ({
  onExportBackup,
  onRefreshShiftsNeeded,
}) => {
  const [stats, setStats] = useState<DiskStorageStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isCompacting, setIsCompacting] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  
  // Clean options
  const [selectedCleanYear, setSelectedCleanYear] = useState<number>(2025);
  const [removeEmpty, setRemoveEmpty] = useState(true);

  // LocalStorage estimation
  const [localStorageSizeKB, setLocalStorageSizeKB] = useState<string>('0');

  const fetchStorageStats = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/storage');
      const data = await res.json();
      if (data.success && data.stats) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Errore durante il caricamento dello spazio su disco:', err);
    } finally {
      setLoading(false);
    }

    // Estimate LocalStorage footprint
    try {
      let totalBytes = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('tl_')) {
          const val = localStorage.getItem(key) || '';
          totalBytes += (key.length + val.length) * 2; // UTF-16 approximation
        }
      }
      setLocalStorageSizeKB((totalBytes / 1024).toFixed(1));
    } catch (e) {
      setLocalStorageSizeKB('N/D');
    }
  };

  useEffect(() => {
    fetchStorageStats();
  }, []);

  const handleCompactDatabase = async () => {
    setIsCompacting(true);
    setActionMessage(null);
    try {
      const res = await fetch('/api/storage/compact', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setActionMessage({
          type: 'success',
          text: data.message || 'Database compattato con successo!',
        });
        if (data.stats) setStats(data.stats);
      } else {
        setActionMessage({
          type: 'error',
          text: data.error || 'Impossibile compattare il database.',
        });
      }
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err.message || 'Errore durante la compattazione.',
      });
    } finally {
      setIsCompacting(false);
    }
  };

  const handleCleanStorage = async () => {
    if (!window.confirm(`Sei sicuro di voler archiviare e rimuovere i turni antecedenti al ${selectedCleanYear}? Consiglio: Un backup verrà comunque generato prima.`)) {
      return;
    }

    // Export safety backup first
    onExportBackup();

    setIsCleaning(true);
    setActionMessage(null);
    try {
      const res = await fetch('/api/storage/clean', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          beforeYear: selectedCleanYear,
          removeEmptyShifts: removeEmpty,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage({
          type: 'success',
          text: data.message || 'Pulizia ed archiviazione completate!',
        });
        if (data.stats) setStats(data.stats);
        if (onRefreshShiftsNeeded) onRefreshShiftsNeeded();
      } else {
        setActionMessage({
          type: 'error',
          text: data.error || 'Errore durante la pulizia dello spazio.',
        });
      }
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err.message || 'Errore durante l\'esecuzione della pulizia.',
      });
    } finally {
      setIsCleaning(false);
    }
  };

  const usedPerc = stats?.diskInfo?.usedPercentage ?? 5;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xs space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Gestione dello Spazio su Disco e Archiviazione</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Monitora l'occupazione di memoria del database locale (<code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-[11px]">database.json</code>), ottimizza le dimensioni su disco e archivia i dati storici.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchStorageStats}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Aggiorna Dati Disco</span>
        </button>
      </div>

      {/* Action feedback message */}
      {actionMessage && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 font-semibold'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
          }`}
        >
          {actionMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
          )}
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* Visual Usage Progress Bar */}
      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
        <div className="flex justify-between items-center text-xs">
          <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            Capacità Archiviazione Server
          </span>
          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
            {stats?.diskInfo?.usedFormatted || '0 KB'} / {stats?.diskInfo?.totalFormatted || 'Container'}
          </span>
        </div>

        <div className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex">
          <div
            className={`h-full transition-all duration-500 ${
              usedPerc > 85 ? 'bg-rose-500' : usedPerc > 70 ? 'bg-amber-500' : 'bg-emerald-500'
            }`}
            style={{ width: `${Math.max(2, Math.min(100, usedPerc))}%` }}
          />
        </div>

        <div className="flex justify-between items-center text-[11px] text-slate-500 dark:text-slate-400">
          <span>Stato: <strong className="text-emerald-600 dark:text-emerald-400">Ottimale</strong></span>
          <span>Spazio Libero: {stats?.diskInfo?.freeFormatted || 'Infinita su Cloud/Local'}</span>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        
        {/* Card 1: DB File Size */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-[11px]">Database (`database.json`)</span>
            <FileJson className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-base font-extrabold text-slate-900 dark:text-slate-100 font-mono">
            {stats?.dbFileSizeFormatted || 'Caricamento...'}
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
            {stats?.totalShifts ?? 0} turni e {stats?.totalPresets ?? 0} preset salvati
          </span>
        </div>

        {/* Card 2: Data Directory */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-[11px]">Cartella Server (`/data`)</span>
            <HardDrive className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="text-base font-extrabold text-slate-900 dark:text-slate-100 font-mono">
            {stats?.dataFolderSizeFormatted || '0 KB'}
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
            Persistente in Docker volume
          </span>
        </div>

        {/* Card 3: RAM Memory */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-[11px]">Memoria Server (RAM)</span>
            <Cpu className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="text-base font-extrabold text-slate-900 dark:text-slate-100 font-mono">
            {stats?.memoryUsage?.heapUsedFormatted || '0 MB'}
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
            Heap totale: {stats?.memoryUsage?.heapTotalFormatted || '0 MB'}
          </span>
        </div>

        {/* Card 4: LocalStorage */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-[11px]">Cache Browser LocalStorage</span>
            <Zap className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="text-base font-extrabold text-slate-900 dark:text-slate-100 font-mono">
            {localStorageSizeKB} KB
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
            Sincronizzato offline nel browser
          </span>
        </div>

      </div>

      {/* Storage Management Tools */}
      <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
        <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>Strumenti di Manutenzione e Pulizia Disco</span>
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Tool 1: Compact Database */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                <FileJson className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Compatta e Ottimizza File Database</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Rimuove spazi vuoti e proprietà ridondanti dal file JSON senza perdere alcun dato. Riduce l'occupazione di memoria su disco ed accelera la lettura.
              </p>
            </div>

            <button
              type="button"
              onClick={handleCompactDatabase}
              disabled={isCompacting}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isCompacting ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Zap className="w-3.5 h-3.5" />
              )}
              <span>Esegui Compattazione Ora</span>
            </button>
          </div>

          {/* Tool 2: Archive & Clean Old Shifts */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                <Archive className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Archiviazione e Pulizia Storico Turni</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mb-2">
                Rimuove dal database del server i turni molto vecchi per liberare spazio su disco. Verrà scaricato prima un backup automatico di sicurezza.
              </p>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-600 dark:text-slate-400">Rimuovi prima del:</span>
                <select
                  value={selectedCleanYear}
                  onChange={(e) => setSelectedCleanYear(parseInt(e.target.value, 10))}
                  className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-xs font-bold"
                >
                  <option value={2024}>2024</option>
                  <option value={2025}>2025</option>
                  <option value={2026}>2026</option>
                </select>
              </div>

              <label className="flex items-center gap-2 mt-2 text-[11px] text-slate-600 dark:text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={removeEmpty}
                  onChange={(e) => setRemoveEmpty(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span>Elimina anche voci non compilate / vuote</span>
              </label>
            </div>

            <button
              type="button"
              onClick={handleCleanStorage}
              disabled={isCleaning}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isCleaning ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
              <span>Archivia Turni Vecchi e Libera Spazio</span>
            </button>
          </div>

        </div>
      </div>

      {/* Safety Notice */}
      <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl text-[11px] text-amber-900 dark:text-amber-200 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>I tuoi dati sono protetti. Puoi scaricare un backup JSON completo del disco in qualsiasi momento.</span>
        </div>
        <button
          type="button"
          onClick={onExportBackup}
          className="px-3 py-1 bg-amber-200 dark:bg-amber-800 hover:bg-amber-300 text-amber-900 dark:text-amber-100 rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0"
        >
          Scarica Backup JSON
        </button>
      </div>

    </div>
  );
};
