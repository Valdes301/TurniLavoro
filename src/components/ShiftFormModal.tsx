import React, { useState } from 'react';
import { X, Clock, Trash2, Check, Sparkles, Store, MapPin, Plus } from 'lucide-react';
import { Shift, ShiftPreset, ShiftCategory, ContractSettings } from '../types';
import { 
  calculateShiftDuration, 
  calculateOvertime, 
  isNightShift, 
  isItalianNationalHoliday, 
  getShiftNameAndCodeByTime, 
  formatDateToIso, 
  getLocationBadge,
  getSavedStores,
  addSavedStore,
  deleteSavedStore
} from '../utils/shiftUtils';

interface ShiftFormModalProps {
  initialShift?: Shift | null;
  initialDate?: string;
  presets: ShiftPreset[];
  contract: ContractSettings;
  onSave: (shift: Shift) => void;
  onDelete?: (shiftId: string) => void;
  onClose: () => void;
}

export const ShiftFormModal: React.FC<ShiftFormModalProps> = ({
  initialShift,
  initialDate,
  presets,
  contract,
  onSave,
  onDelete,
  onClose,
}) => {
  const [date, setDate] = useState<string>(
    initialShift?.date || initialDate || formatDateToIso(new Date())
  );
  const [type, setType] = useState<string>(initialShift?.type || 'Mattino continuato');
  const [category, setCategory] = useState<ShiftCategory>(
    initialShift?.category || 'work'
  );
  const [startTime, setStartTime] = useState<string>(initialShift?.startTime || '08:00');
  const [endTime, setEndTime] = useState<string>(initialShift?.endTime || '16:00');
  const [breakMinutes, setBreakMinutes] = useState<number>(
    initialShift?.breakMinutes ?? 30
  );
  const [notes, setNotes] = useState<string>(initialShift?.notes || '');
  const [location, setLocation] = useState<string>(initialShift?.location || '');

  // Saved stores state
  const [savedStores, setSavedStores] = useState<string[]>(() => getSavedStores());
  const [newStoreInput, setNewStoreInput] = useState<string>('');
  const [isAddingStore, setIsAddingStore] = useState<boolean>(false);

  const handleRemoveStore = (storeName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = deleteSavedStore(storeName);
    setSavedStores(updated);
    if (location.toLowerCase() === storeName.toLowerCase()) {
      setLocation('');
    }
  };

  const handleAddNewStore = () => {
    if (!newStoreInput.trim()) return;
    const updated = addSavedStore(newStoreInput.trim());
    setSavedStores(updated);
    setLocation(newStoreInput.trim());
    setNewStoreInput('');
    setIsAddingStore(false);
  };

  // Computed values
  const workedHours = calculateShiftDuration(startTime, endTime, breakMinutes);
  const overtimeHours = calculateOvertime(workedHours, category, contract.overtimeThresholdDaily);
  const isNight = category === 'work' && isNightShift(startTime, endTime);
  const isHoliday = isItalianNationalHoliday(date);

  const applyPreset = (preset: ShiftPreset) => {
    setType(preset.name);
    setCategory(preset.category);
    setStartTime(preset.startTime);
    setEndTime(preset.endTime);
    setBreakMinutes(preset.breakMinutes);
  };

  const autoDetectType = () => {
    if (category === 'work') {
      const detected = getShiftNameAndCodeByTime(startTime, endTime, breakMinutes);
      setType(`${detected.code} - ${detected.name}`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let finalType = (type || '').trim();
    if (!finalType || /^(lavoro|turno|work|lavoro ordinario|ordinario)$/i.test(finalType)) {
      if (category === 'work') {
        const detected = getShiftNameAndCodeByTime(startTime, endTime, breakMinutes);
        finalType = `${detected.code} - ${detected.name}`;
      } else if (category === 'riposo') {
        finalType = 'R - Riposo';
      } else if (category === 'ferie') {
        finalType = 'F - Ferie';
      } else if (category === 'permesso') {
        finalType = 'PER - Permesso ROL';
      } else if (category === 'congedo') {
        finalType = 'CONG - Congedo';
      } else if (category === 'malattia') {
        finalType = 'MAL - Malattia';
      } else if (category === 'straordinario') {
        finalType = 'STR - Straordinario';
      }
    }

    const newShift: Shift = {
      id: initialShift?.id || `shift-${Date.now()}`,
      date,
      type: finalType,
      category,
      startTime,
      endTime,
      breakMinutes,
      workedHours,
      overtimeHours,
      isNight,
      isHoliday,
      notes,
      location,
    };
    onSave(newShift);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden my-8">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-sm">
              {initialShift ? 'Modifica Turno' : 'Aggiungi Nuovo Turno'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          {/* Quick Presets */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Seleziona Preset Rapido
            </label>
            <div className="flex flex-wrap gap-1.5">
              {presets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950 transition-all cursor-pointer flex items-center gap-1.5"
                  style={{ borderLeftColor: preset.color, borderLeftWidth: '3px' }}
                >
                  <span className="font-bold text-slate-900 dark:text-slate-100">{preset.code}</span>
                  <span className="text-slate-600 dark:text-slate-400 text-[11px]">{preset.startTime}-{preset.endTime}</span>
                </button>
              ))}
            </div>
          </div>

          <hr className="border-slate-100 dark:border-slate-800" />

          {/* Date & Shift Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Data Turno
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              {isHoliday && (
                <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold mt-1">
                  🎉 Giorno festivo o Domenica
                </p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Nome/Codice Turno
                </label>
                {category === 'work' && (
                  <button
                    type="button"
                    onClick={autoDetectType}
                    className="text-[10px] text-blue-600 dark:text-blue-400 hover:text-blue-800 font-bold underline cursor-pointer"
                    title="Calcola automaticamente nome in base all'orario"
                  >
                    Auto-Rileva
                  </button>
                )}
              </div>
              <input
                type="text"
                required
                value={type}
                onChange={(e) => setType(e.target.value)}
                placeholder="es. Mattino continuato, Pomeriggio, Spezzato"
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Tipologia / Categoria
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ShiftCategory)}
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none capitalize"
            >
              <option value="work">Turno di Lavoro Ordinario</option>
              <option value="ferie">Ferie (Giornata Intera)</option>
              <option value="permesso">Permesso / ROL</option>
              <option value="congedo">Congedo (Parentale, Straordinario, L.104)</option>
              <option value="riposo">Riposo Programmato / Smonto</option>
              <option value="straordinario">Turno Straordinario dedicato</option>
              <option value="malattia">Malattia</option>
              <option value="altro">Altro / Festività soppressa</option>
            </select>
          </div>

          {/* Times & Break */}
          {category !== 'riposo' && (
            <div className="grid grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Orario Inizio
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Orario Fine
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Pausa (min)
                </label>
                <input
                  type="number"
                  min="0"
                  step="5"
                  value={breakMinutes}
                  onChange={(e) => setBreakMinutes(parseInt(e.target.value) || 0)}
                  className="w-full px-2 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>
          )}

          {/* Computed Summary Badges */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 font-semibold border border-blue-200/60 dark:border-blue-800">
              Ore Lavorate: {workedHours}h
            </span>
            {overtimeHours > 0 && (
              <span className="px-3 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 font-semibold border border-purple-200/60 dark:border-purple-800">
                ⚡ Straordinario: {overtimeHours}h
              </span>
            )}
            {isNight && (
              <span className="px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 font-semibold border border-indigo-200/60 dark:border-indigo-800">
                🌙 Turno Notturno
              </span>
            )}
          </div>

          {/* Negozio / Sede di Lavoro */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Negozio / Sede di Lavoro</span>
              </label>
              <div className="flex items-center gap-2">
                {location && (
                  <button
                    type="button"
                    onClick={() => setLocation('')}
                    className="text-[10px] text-rose-600 dark:text-rose-400 hover:underline font-bold flex items-center gap-0.5 cursor-pointer"
                    title="Rimuovi sede da questo turno"
                  >
                    <X className="w-3 h-3" />
                    <span>Svuota</span>
                  </button>
                )}
                {location && (
                  <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-indigo-600 text-white shadow-2xs">
                    Lettera: {getLocationBadge(location)?.code || '?'}
                  </span>
                )}
              </div>
            </div>

            {/* Quick Location Chips with Delete Buttons */}
            <div className="flex flex-wrap gap-1.5 mb-2 items-center">
              {savedStores.map((storeName) => (
                <div
                  key={storeName}
                  className={`group relative inline-flex items-center rounded-lg text-xs font-bold border transition-all ${
                    location.toLowerCase() === storeName.toLowerCase()
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setLocation(storeName)}
                    className="px-2.5 py-1 cursor-pointer flex items-center gap-1"
                  >
                    <span className="opacity-80 text-[10px]">[{storeName.charAt(0)}]</span>
                    <span>{storeName}</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleRemoveStore(storeName, e)}
                    className="p-1 pr-1.5 opacity-60 hover:opacity-100 hover:text-rose-500 transition-opacity cursor-pointer"
                    title={`Elimina "${storeName}" dai salvati`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}

              {/* Add Store Button */}
              {!isAddingStore ? (
                <button
                  type="button"
                  onClick={() => setIsAddingStore(true)}
                  className="px-2 py-1 rounded-lg text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Nuovo</span>
                </button>
              ) : (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={newStoreInput}
                    onChange={(e) => setNewStoreInput(e.target.value)}
                    placeholder="Nome negozio..."
                    autoFocus
                    className="px-2 py-0.5 text-xs bg-white dark:bg-slate-800 border border-indigo-400 rounded-md text-slate-900 dark:text-slate-100 w-28 focus:outline-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddNewStore();
                      } else if (e.key === 'Escape') {
                        setIsAddingStore(false);
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddNewStore}
                    className="p-1 bg-indigo-600 text-white rounded-md text-xs hover:bg-indigo-700 cursor-pointer"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddingStore(false)}
                    className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            <div className="relative">
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="es. Valeggio, Sirmione, Desenzano..."
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none pr-8"
              />
              {location && (
                <button
                  type="button"
                  onClick={() => setLocation('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                  title="Cancella inserimento"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Note Aggiuntive
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="es. Sostituzione collega, Reparto A, Cambio turno..."
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Buttons */}
          <div className="pt-2 flex items-center justify-between">
            {initialShift && onDelete ? (
              <button
                type="button"
                onClick={() => {
                  onDelete(initialShift.id);
                  onClose();
                }}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Elimina</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Annulla
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Salva Turno</span>
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
};
