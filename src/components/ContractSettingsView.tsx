import React, { useState, useEffect } from 'react';
import { Settings, Save, Plus, Trash2, Download, Upload, RotateCcw, Check, Clock, Key, Server, Cpu, ExternalLink, CheckCircle2, XCircle, RefreshCw, Database, HardDrive, Store, Sparkles } from 'lucide-react';
import { ContractSettings, VacationSettings, ShiftPreset, ShiftCategory } from '../types';
import { DEFAULT_PRESETS, getSavedStores, addSavedStore, deleteSavedStore, getLocationBadge } from '../utils/shiftUtils';
import { StorageManagementSection } from './StorageManagementSection';

interface ContractSettingsViewProps {
  contract: ContractSettings;
  vacationSettings: VacationSettings;
  presets: ShiftPreset[];
  onSaveContract: (c: ContractSettings) => void;
  onSaveVacationSettings: (v: VacationSettings) => void;
  onSavePresets: (presets: ShiftPreset[]) => void;
  onExportBackup: () => void;
  onImportBackup: (jsonStr: string) => void;
  onResetDemoData: () => void;
}

export const ContractSettingsView: React.FC<ContractSettingsViewProps> = ({
  contract,
  vacationSettings,
  presets,
  onSaveContract,
  onSaveVacationSettings,
  onSavePresets,
  onExportBackup,
  onImportBackup,
  onResetDemoData,
}) => {
  const [localContract, setLocalContract] = useState<ContractSettings>({ ...contract });
  const [localVacation, setLocalVacation] = useState<VacationSettings>({ ...vacationSettings });
  const [localPresets, setLocalPresets] = useState<ShiftPreset[]>([...presets]);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Store Locations State
  const [storesList, setStoresList] = useState<string[]>(() => getSavedStores());
  const [newStoreInput, setNewStoreInput] = useState<string>('');

  const handleAddStore = () => {
    if (!newStoreInput.trim()) return;
    const updated = addSavedStore(newStoreInput.trim());
    setStoresList(updated);
    setNewStoreInput('');
  };

  const handleDeleteStore = (storeName: string) => {
    const updated = deleteSavedStore(storeName);
    setStoresList(updated);
  };

  // AI Key & Docker status
  const [customKey, setCustomKey] = useState<string>(() => localStorage.getItem('tl_custom_gemini_key') || '');
  const [isEnvConfigured, setIsEnvConfigured] = useState<boolean>(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState<string>('');

  // DB Info status
  const [dbInfo, setDbInfo] = useState<{ path: string; lastUpdated?: string; totalShifts?: number } | null>(null);

  useEffect(() => {
    fetch('/api/config')
      .then((res) => res.json())
      .then((data) => {
        if (data && typeof data.isEnvConfigured === 'boolean') {
          setIsEnvConfigured(data.isEnvConfigured);
        }
      })
      .catch(() => setIsEnvConfigured(false));

    fetch('/api/database')
      .then((res) => res.json())
      .then((resData) => {
        if (resData && resData.success) {
          setDbInfo({
            path: resData.dbFilePath || './data/database.json',
            lastUpdated: resData.data?.updatedAt,
            totalShifts: Array.isArray(resData.data?.shifts) ? resData.data.shifts.length : 0,
          });
        }
      })
      .catch(() => null);
  }, []);

  const handleSaveCustomKey = () => {
    if (customKey.trim()) {
      localStorage.setItem('tl_custom_gemini_key', customKey.trim());
    } else {
      localStorage.removeItem('tl_custom_gemini_key');
    }
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleTestKey = async () => {
    setTestStatus('testing');
    setTestMessage('Verifica connessione con le API Gemini in corso...');
    try {
      const activeKey = customKey.trim() || undefined;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (activeKey) {
        headers['x-gemini-api-key'] = activeKey;
      }

      const res = await fetch('/api/test-key', {
        method: 'POST',
        headers,
        body: JSON.stringify({ customApiKey: activeKey }),
      });

      const data = await res.json();
      if (data.success) {
        setTestStatus('success');
        setTestMessage(data.message || 'Connessione stabilita con successo!');
      } else {
        setTestStatus('error');
        setTestMessage(data.error || 'Impossibile connettersi con la chiave fornita.');
      }
    } catch (err: any) {
      setTestStatus('error');
      setTestMessage(err.message || 'Errore di rete durante il test.');
    }
  };

  // New Preset state
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetCode, setNewPresetCode] = useState('');
  const [newPresetCategory, setNewPresetCategory] = useState<ShiftCategory>('work');
  const [newPresetStart, setNewPresetStart] = useState('08:00');
  const [newPresetEnd, setNewPresetEnd] = useState('16:00');
  const [newPresetColor, setNewPresetColor] = useState('#3b82f6');

  const handleSaveAll = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveContract(localContract);
    onSaveVacationSettings(localVacation);
    onSavePresets(localPresets);

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleAddPreset = () => {
    if (!newPresetName || !newPresetCode) return;
    const newP: ShiftPreset = {
      id: `preset-${Date.now()}`,
      name: newPresetName,
      code: newPresetCode,
      category: newPresetCategory,
      startTime: newPresetStart,
      endTime: newPresetEnd,
      breakMinutes: 30,
      color: newPresetColor,
    };
    setLocalPresets([...localPresets, newP]);
    setNewPresetName('');
    setNewPresetCode('');
  };

  const handleDeletePreset = (id: string) => {
    setLocalPresets(localPresets.filter((p) => p.id !== id));
  };

  const handleUpdatePreset = (id: string, updatedFields: Partial<ShiftPreset>) => {
    setLocalPresets((prev) => prev.map((p) => (p.id === id ? { ...p, ...updatedFields } : p)));
  };

  const handleResetDefaultPresets = () => {
    if (window.confirm('Vuoi ripristinare i tipi di turno e gli orari predefiniti?')) {
      setLocalPresets([...DEFAULT_PRESETS]);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        onImportBackup(content);
      }
    };
    reader.readAsText(file);
  };

  return (
    <form onSubmit={handleSaveAll} className="space-y-6">
      
      {/* Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-600" />
            <span>Configurazione Contratto e Presets</span>
          </h2>
          <p className="text-xs text-slate-500">
            Personalizza gli orari di lavoro contrattuali, le soglie di straordinario e i tuoi presettaggi dei turni.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setLocalContract({
                ...localContract,
                hourlyRate: 11.2478,
                monthlyHoursGoal: 168,
                overtimeMultiplier: 1.20,
                overtimeNightMultiplier: 1.30,
                sundayHolidayMultiplier: 1.30,
                nightShiftMultiplier: 1.20,
                estimatedTaxRatePct: 23,
                estimatedInpsRatePct: 9.757,
              });
              setLocalVacation({
                ...localVacation,
                annualAccruedDays: 26,
                initialCarriedOverDays: 6.8,
                rolHoursTotal: 32,
                rolHoursCarriedOver: 22.76,
                congedoParentaleMaxDays: 180,
                congedoParentalePayRatePct: 30,
              });
              setSavedSuccess(true);
              setTimeout(() => setSavedSuccess(false), 3000);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-purple-50 text-purple-700 border border-purple-200 font-bold rounded-xl text-xs hover:bg-purple-100 transition-colors cursor-pointer"
            title="Applica i valori reali estratti dal cedolino Italmark (11.25 €/h, Straordinari 120%/130%)"
          >
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span>Carica Busta Reale Italmark</span>
          </button>

          <button
            type="submit"
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl text-xs hover:bg-blue-700 transition-colors shadow-md shadow-blue-500/20 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Salva Modifiche</span>
          </button>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>Impostazioni salvate con successo!</span>
        </div>
      )}

      {/* Contractual Settings */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xs space-y-4">
        <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-2">
          1. Parametri Orario di Lavoro & Straordinari
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Ore Settimanali Contrattuali
            </label>
            <input
              type="number"
              value={localContract.weeklyHoursGoal}
              onChange={(e) => setLocalContract({ ...localContract, weeklyHoursGoal: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Ore Mensili Target (Obiettivo)
            </label>
            <input
              type="number"
              value={localContract.monthlyHoursGoal}
              onChange={(e) => setLocalContract({ ...localContract, monthlyHoursGoal: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Soglia Straordinario Giornaliero (h)
            </label>
            <input
              type="number"
              value={localContract.overtimeThresholdDaily}
              onChange={(e) => setLocalContract({ ...localContract, overtimeThresholdDaily: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Paga Oraria Base (€/h)
            </label>
            <input
              type="number"
              step="0.1"
              value={localContract.hourlyRate}
              onChange={(e) => setLocalContract({ ...localContract, hourlyRate: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Straordinario Diurno (es. 1.25 = +25%)
            </label>
            <input
              type="number"
              step="0.05"
              value={localContract.overtimeMultiplier}
              onChange={(e) => setLocalContract({ ...localContract, overtimeMultiplier: parseFloat(e.target.value) || 1 })}
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Straordinario Notturno (es. 1.40 = +40%)
            </label>
            <input
              type="number"
              step="0.05"
              value={localContract.overtimeNightMultiplier ?? 1.40}
              onChange={(e) => setLocalContract({ ...localContract, overtimeNightMultiplier: parseFloat(e.target.value) || 1 })}
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Maggiorazione Festiva/Domenicale (es. 1.30 = +30%)
            </label>
            <input
              type="number"
              step="0.05"
              value={localContract.sundayHolidayMultiplier ?? 1.30}
              onChange={(e) => setLocalContract({ ...localContract, sundayHolidayMultiplier: parseFloat(e.target.value) || 1 })}
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Maggiorazione Notturna Ordinaria (es. 1.20 = +20%)
            </label>
            <input
              type="number"
              step="0.05"
              value={localContract.nightShiftMultiplier ?? 1.20}
              onChange={(e) => setLocalContract({ ...localContract, nightShiftMultiplier: parseFloat(e.target.value) || 1 })}
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Aliquota Fiscale Media IRPEF (%)
            </label>
            <input
              type="number"
              step="1"
              value={localContract.estimatedTaxRatePct ?? 23}
              onChange={(e) => setLocalContract({ ...localContract, estimatedTaxRatePct: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Trattenute INPS a Carico Lavoratore (%)
            </label>
            <input
              type="number"
              step="0.1"
              value={localContract.estimatedInpsRatePct ?? 9.19}
              onChange={(e) => setLocalContract({ ...localContract, estimatedInpsRatePct: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Vacation Accrual Settings */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xs space-y-4">
        <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-2">
          2. Diritto Ferie, Permessi e Congedo Parentale
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Ferie Spettanti all'Anno (Giorni)
            </label>
            <input
              type="number"
              value={localVacation.annualAccruedDays}
              onChange={(e) => setLocalVacation({ ...localVacation, annualAccruedDays: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Ferie Residue Anni Precedenti (Giorni)
            </label>
            <input
              type="number"
              value={localVacation.initialCarriedOverDays}
              onChange={(e) => setLocalVacation({ ...localVacation, initialCarriedOverDays: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Permessi ROL Spettanti Annuoli (Ore)
            </label>
            <input
              type="number"
              value={localVacation.rolHoursTotal}
              onChange={(e) => setLocalVacation({ ...localVacation, rolHoursTotal: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Permessi ROL Arrestrati (Ore)
            </label>
            <input
              type="number"
              value={localVacation.rolHoursCarriedOver}
              onChange={(e) => setLocalVacation({ ...localVacation, rolHoursCarriedOver: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Congedo Parentale Parametri */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400">
              Parametri Congedo Parentale (INPS / D.Lgs 105/2022)
            </span>
            <span className="text-[11px] text-slate-500">Impostato al 30% di indennità</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Giorni Spettanti di Legge (es. 180 gg = 6 mesi)
              </label>
              <input
                type="number"
                value={localVacation.congedoParentaleMaxDays ?? 180}
                onChange={(e) => setLocalVacation({ ...localVacation, congedoParentaleMaxDays: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Percentuale Retribuzione Spettante (%)
              </label>
              <select
                value={localVacation.congedoParentalePayRatePct ?? 30}
                onChange={(e) => setLocalVacation({ ...localVacation, congedoParentalePayRatePct: parseInt(e.target.value) || 30 })}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none font-bold text-purple-700 dark:text-purple-300"
              >
                <option value={30}>30% (Indennità INPS standard - Il tuo valore)</option>
                <option value={80}>80% (Primo mese ex Legge di Bilancio)</option>
                <option value={100}>100% (Retribuzione intera integrata)</option>
                <option value={0}>0% (Non retribuito / Mesi eccedenti)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Giorni già fruiti prima dell'App
              </label>
              <input
                type="number"
                value={localVacation.congedoParentaleDaysUsedPreviously ?? 0}
                onChange={(e) => setLocalVacation({ ...localVacation, congedoParentaleDaysUsedPreviously: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Presets List & Customization */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
          <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
            3. Definizione Orari e Tipi di Turno (Presets)
          </h3>
          <button
            type="button"
            onClick={handleResetDefaultPresets}
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Ripristina Turni Predefiniti</span>
          </button>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          Puoi modificare direttamente gli orari di inizio e fine, il codice e il nome di qualsiasi turno.
          Questi parametri vengono usati sia nei pulsanti rapidi che per l'auto-rilevamento degli orari.
        </p>

        <div className="space-y-3">
          {localPresets.map((p) => (
            <div
              key={p.id}
              className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/60 space-y-2"
            >
              <div className="grid grid-cols-2 sm:grid-cols-12 gap-2 items-center">
                
                {/* Color & Code */}
                <div className="col-span-2 sm:col-span-2 flex items-center gap-1.5">
                  <input
                    type="color"
                    value={p.color || '#3b82f6'}
                    onChange={(e) => handleUpdatePreset(p.id, { color: e.target.value })}
                    className="w-7 h-7 rounded border-0 cursor-pointer bg-transparent shrink-0"
                    title="Scegli colore"
                  />
                  <input
                    type="text"
                    value={p.code}
                    onChange={(e) => handleUpdatePreset(p.id, { code: e.target.value })}
                    placeholder="Codice (es. PC)"
                    className="w-full px-2 py-1 text-xs font-bold uppercase bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg"
                    title="Codice / Sigla Turno"
                  />
                </div>

                {/* Name */}
                <div className="col-span-2 sm:col-span-3">
                  <input
                    type="text"
                    value={p.name}
                    onChange={(e) => handleUpdatePreset(p.id, { name: e.target.value })}
                    placeholder="Nome Turno"
                    className="w-full px-2.5 py-1 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg"
                    title="Nome Completo Turno"
                  />
                </div>

                {/* Start & End Times */}
                <div className="col-span-1 sm:col-span-2 flex items-center gap-1">
                  <input
                    type="time"
                    value={p.startTime}
                    onChange={(e) => handleUpdatePreset(p.id, { startTime: e.target.value })}
                    className="w-full px-1.5 py-1 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg"
                    title="Ora Inizio"
                  />
                  <span className="text-slate-400 text-xs">-</span>
                  <input
                    type="time"
                    value={p.endTime}
                    onChange={(e) => handleUpdatePreset(p.id, { endTime: e.target.value })}
                    className="w-full px-1.5 py-1 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg"
                    title="Ora Fine"
                  />
                </div>

                {/* Break minutes */}
                <div className="col-span-1 sm:col-span-2 flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    step="5"
                    value={p.breakMinutes}
                    onChange={(e) => handleUpdatePreset(p.id, { breakMinutes: parseInt(e.target.value) || 0 })}
                    className="w-full px-2 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg"
                    title="Pausa in minuti"
                  />
                  <span className="text-[10px] text-slate-500 shrink-0">m pausa</span>
                </div>

                {/* Category & Delete */}
                <div className="col-span-2 sm:col-span-3 flex items-center gap-1.5">
                  <select
                    value={p.category}
                    onChange={(e) => handleUpdatePreset(p.id, { category: e.target.value as ShiftCategory })}
                    className="w-full px-2 py-1 text-[11px] bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg"
                  >
                    <option value="work">Lavoro</option>
                    <option value="ferie">Ferie</option>
                    <option value="permesso">Permesso</option>
                    <option value="congedo">Congedo</option>
                    <option value="riposo">Riposo</option>
                    <option value="straordinario">Straordinario</option>
                    <option value="malattia">Malattia</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => handleDeletePreset(p.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors shrink-0"
                    title="Rimuovi questo preset"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

              </div>
            </div>
          ))}
        </div>

        {/* Add Preset Form */}
        <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/80 space-y-3 pt-3">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Aggiungi Nuovo Tipo di Turno / Preset</span>
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
            <input
              type="text"
              placeholder="Nome (es. Pomeriggio breve)"
              value={newPresetName}
              onChange={(e) => setNewPresetName(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg col-span-2"
            />
            <input
              type="text"
              placeholder="Codice (es. PB)"
              value={newPresetCode}
              onChange={(e) => setNewPresetCode(e.target.value)}
              className="px-2 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg font-bold uppercase"
            />
            <input
              type="time"
              value={newPresetStart}
              onChange={(e) => setNewPresetStart(e.target.value)}
              className="px-2 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg"
            />
            <input
              type="time"
              value={newPresetEnd}
              onChange={(e) => setNewPresetEnd(e.target.value)}
              className="px-2 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg"
            />
            <button
              type="button"
              onClick={handleAddPreset}
              className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-colors cursor-pointer"
            >
              + Aggiungi
            </button>
          </div>
        </div>
      </div>

      {/* Gestione Negozi e Sedi di Lavoro */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
          <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Store className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>4. Gestione Negozi e Sedi di Lavoro</span>
          </h3>
          <span className="text-xs text-slate-500 font-semibold">
            {storesList.length} sedi registrate
          </span>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          Gestisci l'elenco delle sedi o dei negozi in cui lavori. Queste opzioni compaiono nei pulsanti rapidi quando aggiungi o modifichi i turni o utilizzi l'IA. Se aggiungi un negozio per errore o con un refuso, puoi eliminarlo facilmente con un clic sul cestino.
        </p>

        {/* Existing Stores List */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
          {storesList.map((storeName) => {
            const badge = getLocationBadge(storeName);
            return (
              <div
                key={storeName}
                className="p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between gap-2 shadow-2xs"
              >
                <div className="flex items-center gap-2 truncate">
                  <span className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-xs shrink-0 ${badge?.badgeBgClass || 'bg-indigo-600 text-white'}`}>
                    {badge?.code || storeName.charAt(0).toUpperCase()}
                  </span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                    {storeName}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteStore(storeName)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer shrink-0"
                  title={`Elimina sede "${storeName}"`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Add Store Box */}
        <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/80 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={newStoreInput}
              onChange={(e) => setNewStoreInput(e.target.value)}
              placeholder="Inserisci nome nuova sede o negozio (es. Lazise, Peschiera...)"
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddStore();
                }
              }}
            />
          </div>
          <button
            type="button"
            onClick={handleAddStore}
            disabled={!newStoreInput.trim()}
            className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl text-xs hover:bg-indigo-700 transition-colors shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>Aggiungi Sede</span>
          </button>
        </div>
      </div>

      {/* Backup & Restore */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
        <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2">
          4. Salvataggio, Backup e Ripristino Dati
        </h3>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onExportBackup}
              className="flex items-center gap-1.5 px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Download className="w-4 h-4 text-blue-600" />
              <span>Esporta Backup JSON</span>
            </button>

            <label className="flex items-center gap-1.5 px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors">
              <Upload className="w-4 h-4 text-emerald-600" />
              <span>Importa Backup JSON</span>
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>
          </div>

          <button
            type="button"
            onClick={onResetDemoData}
            className="flex items-center gap-1.5 px-4 py-2 border border-rose-200 text-rose-700 hover:bg-rose-50 rounded-xl text-xs font-semibold transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Ripristina Dati Dimostrativi</span>
          </button>
        </div>
      </div>

      {/* Database Locale Permanente */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-600" />
            <span>Database Locale Permanente (`database.json`)</span>
          </h3>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[11px] border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Attivo & Sincronizzato
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
            <span className="text-slate-500 font-semibold block text-[11px]">Percorso File Database</span>
            <code className="text-slate-800 font-mono font-bold text-[11px] block truncate" title={dbInfo?.path || './data/database.json'}>
              {dbInfo?.path || './data/database.json'}
            </code>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
            <span className="text-slate-500 font-semibold block text-[11px]">Turni Salvati su Disco</span>
            <span className="text-slate-900 font-bold text-sm">
              {dbInfo?.totalShifts ?? 0} turni registrati
            </span>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
            <span className="text-slate-500 font-semibold block text-[11px]">Ultimo Salvataggio</span>
            <span className="text-slate-800 font-medium">
              {dbInfo?.lastUpdated ? new Date(dbInfo.lastUpdated).toLocaleString('it-IT') : 'In tempo reale'}
            </span>
          </div>
        </div>

        <p className="text-[11px] text-slate-500 leading-relaxed">
          I dati vengono memorizzati in modo permanente nel file <code className="bg-slate-100 px-1 py-0.5 rounded">./data/database.json</code> sul server. Se utilizzi Docker Compose su Raspberry Pi, i dati rimarranno conservati anche riavviando il container o spegnendo il dispositivo.
        </p>
      </div>

      {/* Gestione Spazio su Disco & Archiviazione */}
      <StorageManagementSection onExportBackup={onExportBackup} />

      {/* AI Key & Docker Configuration */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <Key className="w-4 h-4 text-indigo-600" />
            <span>5. Configurazione IA & Chiave API Gemini (Docker / Raspberry Pi)</span>
          </h3>

          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
          >
            <span>Ottieni Chiave API Gratuita</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Docker / Server Env Status Badge */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <Server className="w-4 h-4 text-slate-600 shrink-0" />
            <div>
              <span className="font-bold text-slate-800 block">Stato Ambiente Docker / Server</span>
              <span className="text-slate-500 text-[11px]">Variabile d'ambiente <code className="bg-slate-200 px-1 py-0.5 rounded text-[10px]">GEMINI_API_KEY</code></span>
            </div>
          </div>

          <div>
            {isEnvConfigured ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Configurata da Docker Compose
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 font-semibold text-[11px]">
                <Server className="w-3.5 h-3.5 text-amber-600" />
                Non presente in Docker (Usa chiave custom sotto)
              </span>
            )}
          </div>
        </div>

        {/* Custom API Key Input */}
        <div className="space-y-3 pt-1">
          <label className="block text-xs font-semibold text-slate-800">
            Chiave API Gemini Personalizzata (Override Locale)
          </label>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <input
              type="password"
              value={customKey}
              onChange={(e) => setCustomKey(e.target.value)}
              placeholder="Incolla qui la tua chiave AI (es. AIzaSy...)"
              className="flex-1 px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSaveCustomKey}
                className="px-4 py-2 bg-slate-900 text-white font-bold rounded-xl text-xs hover:bg-slate-800 transition-colors shadow-xs cursor-pointer whitespace-nowrap"
              >
                Salva Chiave
              </button>

              <button
                type="button"
                onClick={handleTestKey}
                disabled={testStatus === 'testing'}
                className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl text-xs hover:bg-indigo-700 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap"
              >
                {testStatus === 'testing' ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Cpu className="w-3.5 h-3.5" />
                )}
                <span>Testa Connessione IA</span>
              </button>
            </div>
          </div>
          <p className="text-[11px] text-slate-500">
            Se inserisci una chiave qui, verrà usata in via prioritaria per l'estrazione automatica dei turni da foto e PDF.
          </p>
        </div>

        {/* Test Result Feedback */}
        {testStatus !== 'idle' && (
          <div
            className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 ${
              testStatus === 'testing'
                ? 'bg-blue-50 border-blue-200 text-blue-800'
                : testStatus === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-semibold'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            {testStatus === 'testing' && <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />}
            {testStatus === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
            {testStatus === 'error' && <XCircle className="w-4 h-4 text-rose-600 shrink-0" />}
            <span>{testMessage}</span>
          </div>
        )}
      </div>

    </form>
  );
};
