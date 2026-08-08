import React, { useState } from 'react';
import { 
  FileUp, 
  Sparkles, 
  Check, 
  X, 
  AlertCircle, 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  Clock, 
  FileText,
  Trash2,
  Edit2,
  HelpCircle
} from 'lucide-react';
import { Shift, ExtractedShiftCandidate, ShiftCategory } from '../types';
import { 
  calculateShiftDuration, 
  calculateOvertime, 
  getShiftNameAndCodeByTime, 
  getShiftDisplayCodeAndName, 
  formatDateToIso,
  getSavedStores,
  addSavedStore,
  deleteSavedStore,
  isNightShift,
  roundClockIn,
  roundClockOut,
  sanitizeShift
} from '../utils/shiftUtils';

interface AIExtractorModalProps {
  selectedMonth: string;
  onShiftsExtracted: (shifts: Shift[], replaceMode: 'dates' | 'month' | 'none') => void;
  onClose: () => void;
}

export const AIExtractorModal: React.FC<AIExtractorModalProps> = ({
  selectedMonth,
  onShiftsExtracted,
  onClose,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [userNotes, setUserNotes] = useState('');
  const [referenceMonth, setReferenceMonth] = useState(selectedMonth);
  const [employeeName, setEmployeeName] = useState(() => localStorage.getItem('tl_user_surname') || '');
  const [defaultLocation, setDefaultLocation] = useState(() => localStorage.getItem('tl_default_location') || '');
  const [savedStores, setSavedStores] = useState<string[]>(() => getSavedStores());
  const [referenceMondayDate, setReferenceMondayDate] = useState(() => {
    // Default to current week's Monday
    const now = new Date();
    const currDay = now.getDay(); // 0 is Sunday
    const distanceToMonday = currDay === 0 ? -6 : 1 - currDay;
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + distanceToMonday, 12, 0, 0);
    return formatDateToIso(monday);
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Extracted candidates stage
  const [candidates, setCandidates] = useState<ExtractedShiftCandidate[]>([]);
  const [summaryNote, setSummaryNote] = useState<string>('');
  const [replaceMode, setReplaceMode] = useState<'dates' | 'month' | 'none'>('dates');
  const [step, setStep] = useState<'upload' | 'review'>('upload');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (selectedFile.size > 25 * 1024 * 1024) {
      setErrorMsg('Il file selezionato è troppo grande (max 25MB).');
      return;
    }

    setFile(selectedFile);
    setErrorMsg(null);

    // Generate thumbnail/preview if image or PDF
    if (selectedFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => setFilePreview(reader.result as string);
      reader.readAsDataURL(selectedFile);
    } else {
      setFilePreview(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      setFile(droppedFile);
      if (droppedFile.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => setFilePreview(reader.result as string);
        reader.readAsDataURL(droppedFile);
      } else {
        setFilePreview(null);
      }
    }
  };

  const handleProcessWithAI = async () => {
    if (!file) {
      setErrorMsg('Per favore, seleziona una foto o un file PDF del tuo orario.');
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);

    try {
      // Convert file to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const customKey = localStorage.getItem('tl_custom_gemini_key') || '';
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (customKey) {
        headers['x-gemini-api-key'] = customKey;
      }

      if (employeeName) {
        localStorage.setItem('tl_user_surname', employeeName);
      }
      if (defaultLocation) {
        localStorage.setItem('tl_default_location', defaultLocation);
      }

      // Determine accurate MIME type
      let resolvedMime = file.type;
      if (!resolvedMime || resolvedMime === 'application/octet-stream') {
        const lowerName = file.name.toLowerCase();
        if (lowerName.endsWith('.pdf')) resolvedMime = 'application/pdf';
        else if (lowerName.endsWith('.png')) resolvedMime = 'image/png';
        else if (lowerName.endsWith('.webp')) resolvedMime = 'image/webp';
        else resolvedMime = 'image/jpeg';
      }

      const response = await fetch('/api/extract-shifts', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          fileBase64: base64,
          mimeType: resolvedMime,
          userNotes,
          referenceYearMonth: referenceMonth,
          referenceMondayDate,
          employeeName,
          customApiKey: customKey || undefined,
        }),
      });

      let data: any;
      try {
        data = await response.json();
      } catch (parseErr) {
        throw new Error(`Risposta del server non valida (${response.status} ${response.statusText}). Verifica la dimensione del file.`);
      }

      if (!response.ok || !data.success) {
        throw new Error(data.error || `Errore durante l'estrazione dei turni (${response.status}).`);
      }

      const sanitizedCandidates = (data.shifts || []).map((c: ExtractedShiftCandidate) => {
        let startTime = c.startTime ? roundClockIn(c.startTime) : '08:00';
        let endTime = c.endTime ? roundClockOut(c.endTime) : '16:00';
        let breakMins = c.breakMinutes ?? 0;
        let type = c.type || '';

        if (type.toLowerCase().includes('spezzato') || breakMins >= 120) {
          if (!type || type.toLowerCase().includes('lavoro') || type.toLowerCase().includes('turno')) {
            type = 'SP - Spezzato';
          }
        }

        return {
          ...c,
          startTime,
          endTime,
          breakMinutes: breakMins,
          type,
        };
      });

      setCandidates(sanitizedCandidates);
      setSummaryNote(data.summaryNote || 'Turni analizzati con successo con l\'IA!');
      if (data.monthDetected) {
        setReferenceMonth(data.monthDetected);
      }
      setStep('review');
    } catch (err: any) {
      console.error('AI Error:', err);
      setErrorMsg(err.message || 'Si è verificato un errore durante l\'analisi AI del file.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCandidateChange = (index: number, field: keyof ExtractedShiftCandidate, val: any) => {
    setCandidates((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: val };
      return updated;
    });
  };

  const handleRemoveCandidate = (index: number) => {
    setCandidates((prev) => prev.filter((_, i) => i !== index));
  };

  const handleConfirmExtraction = () => {
    const finalShifts: Shift[] = candidates.map((c, i) => {
      const breakMins = c.breakMinutes ?? 0;
      const worked = calculateShiftDuration(c.startTime, c.endTime, breakMins);
      const overtime = calculateOvertime(worked, c.category, 8);

      const auto = getShiftDisplayCodeAndName({
        type: c.type,
        category: (c.category as ShiftCategory) || 'work',
        startTime: c.startTime || '08:00',
        endTime: c.endTime || '16:00',
        breakMinutes: breakMins,
      });

      const rawType = (c.type || '').trim();
      const isGeneric = !rawType || /^(lavoro|turno|work|lavoro ordinario|turno normale|ordinario)$/i.test(rawType);
      const finalShiftType = !isGeneric ? rawType : auto.name;

      const rawShift: Shift = {
        id: `extracted-${Date.now()}-${i}`,
        date: c.date,
        type: finalShiftType,
        category: (c.category as ShiftCategory) || 'work',
        startTime: c.startTime || '08:00',
        endTime: c.endTime || '16:00',
        breakMinutes: breakMins,
        workedHours: worked,
        overtimeHours: overtime,
        isNight: isNightShift(c.startTime || '08:00', c.endTime || '16:00'),
        isHoliday: false,
        location: c.location || defaultLocation || undefined,
        notes: c.notes || 'Estratto con AI da foto/PDF',
      };

      return sanitizeShift(rawShift);
    });

    onShiftsExtracted(finalShifts, replaceMode);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden my-8">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/30 border border-indigo-400/40 flex items-center justify-center text-indigo-200">
              <Sparkles className="w-5 h-5 text-indigo-300 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Estrattore Turni AI</h2>
              <p className="text-xs text-indigo-200">
                Analizza foto del tabellone o PDF degli orari e inserisci automaticamente i turni
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6">
          {errorMsg && (
            <div className="mb-5 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-rose-900 dark:text-rose-100">Errore Estrazione</p>
                <p>{errorMsg}</p>
              </div>
            </div>
          )}

          {step === 'upload' ? (
            <div className="space-y-5">
              
              {/* Dropzone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
                  file
                    ? 'border-indigo-400 bg-indigo-50/40 dark:bg-indigo-950/30'
                    : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400 bg-slate-50/50 dark:bg-slate-800/50'
                }`}
              >
                <input
                  type="file"
                  id="scheduleFile"
                  accept="image/png, image/jpeg, image/webp, application/pdf"
                  className="hidden"
                  onChange={handleFileChange}
                />
                
                {file ? (
                  <div className="space-y-3">
                    <div className="inline-flex p-3 rounded-2xl bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                      <FileText className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{file.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {(file.size / 1024 / 1024).toFixed(2)} MB • {file.type || 'Documento'}
                      </p>
                    </div>

                    {filePreview && (
                      <div className="max-h-48 mx-auto overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 max-w-xs shadow-xs">
                        <img
                          src={filePreview}
                          alt="Anteprima"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-center gap-3 pt-2">
                      <label
                        htmlFor="scheduleFile"
                        className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 cursor-pointer underline"
                      >
                        Cambia file
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setFile(null);
                          setFilePreview(null);
                        }}
                        className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-300 cursor-pointer"
                      >
                        Rimuovi
                      </button>
                    </div>
                  </div>
                ) : (
                  <label htmlFor="scheduleFile" className="cursor-pointer block py-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300 mx-auto flex items-center justify-center mb-3 shadow-xs">
                      <FileUp className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                      Trascina qui la foto o il PDF con i tuoi turni
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Sviluppato per fogli turni, orari di lavoro, PDF, cartelloni o foto di orari
                    </p>
                    <span className="inline-block mt-3 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold shadow-xs hover:bg-indigo-700 transition-colors">
                      Sfoglia file dal dispositivo
                    </span>
                  </label>
                )}
              </div>

              {/* Parameters Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Cognome / Dipendente (Opzionale)
                  </label>
                  <input
                    type="text"
                    value={employeeName}
                    onChange={(e) => setEmployeeName(e.target.value)}
                    placeholder="Inserisci il cognome..."
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                    Se la tabella contiene più righe/persone, l'IA estrarrà solo questa riga.
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                      Negozio / Sede Predefinita (es. Valeggio, Sirmione)
                    </label>
                    {defaultLocation && (
                      <button
                        type="button"
                        onClick={() => setDefaultLocation('')}
                        className="text-[10px] text-rose-600 dark:text-rose-400 hover:underline font-bold flex items-center gap-0.5 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                        <span>Svuota</span>
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-1.5 items-center">
                    {savedStores.map((storeName) => (
                      <div
                        key={storeName}
                        className={`inline-flex items-center rounded text-[10px] font-bold border transition-all ${
                          defaultLocation.toLowerCase() === storeName.toLowerCase()
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setDefaultLocation(storeName)}
                          className="px-2 py-0.5 cursor-pointer"
                        >
                          {storeName}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const updated = deleteSavedStore(storeName);
                            setSavedStores(updated);
                            if (defaultLocation.toLowerCase() === storeName.toLowerCase()) {
                              setDefaultLocation('');
                            }
                          }}
                          className="px-1 py-0.5 opacity-60 hover:opacity-100 hover:text-rose-500 cursor-pointer"
                          title={`Rimuovi ${storeName}`}
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <input
                    type="text"
                    value={defaultLocation}
                    onChange={(e) => setDefaultLocation(e.target.value)}
                    placeholder="es. Valeggio, Sirmione..."
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Data del Lunedì (Inizio Settimana)
                  </label>
                  <input
                    type="date"
                    value={referenceMondayDate}
                    onChange={(e) => setReferenceMondayDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                    Garantisce che i turni vengano collocati nella settimana e mese esatti.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Mese di Riferimento
                  </label>
                  <input
                    type="month"
                    value={referenceMonth}
                    onChange={(e) => setReferenceMonth(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                    Anno/Mese target nel calendario.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Note Aggiuntive per l'IA
                  </label>
                  <input
                    type="text"
                    value={userNotes}
                    onChange={(e) => setUserNotes(e.target.value)}
                    placeholder="Es: 'Turno M equivale a 06:30-12:30'"
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                    Istruzioni speciali personalizzate.
                  </p>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Annulla
                </button>
                <button
                  type="button"
                  onClick={handleProcessWithAI}
                  disabled={!file || isProcessing}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white shadow-md transition-all ${
                    !file || isProcessing
                      ? 'bg-slate-400 dark:bg-slate-700 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20 cursor-pointer'
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Analisi AI in corso...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Estrai Turni con AI</span>
                    </>
                  )}
                </button>
              </div>

            </div>
          ) : (
            /* Review Step */
            <div className="space-y-4">
              
              <div className="bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-indigo-950 dark:text-indigo-100">Analisi AI Completata!</h4>
                  <p className="text-xs text-indigo-800 dark:text-indigo-200">{summaryNote}</p>
                  <p className="text-[11px] text-indigo-600 dark:text-indigo-400 mt-1">
                    Trovati <span className="font-bold">{candidates.length}</span> turni/eventi.
                    Puoi modificare qualsiasi orario prima di inserirlo.
                  </p>
                </div>
              </div>

              {/* Action Mode Toggle */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 shrink-0">Azione Calendario:</span>
                <div className="flex flex-wrap gap-3">
                  <label className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="radio"
                      name="mode"
                      checked={replaceMode === 'dates'}
                      onChange={() => setReplaceMode('dates')}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="font-medium">Sostituisci solo nelle date caricate <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">(Consigliato)</span></span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="radio"
                      name="mode"
                      checked={replaceMode === 'none'}
                      onChange={() => setReplaceMode('none')}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Aggiungi ai turni esistenti</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="radio"
                      name="mode"
                      checked={replaceMode === 'month'}
                      onChange={() => setReplaceMode('month')}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-slate-500 dark:text-slate-400">Sostituisci intero mese</span>
                  </label>
                </div>
              </div>

              {/* Table Preview */}
              <div className="max-h-80 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 sticky top-0 font-semibold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-2.5">Data</th>
                      <th className="p-2.5">Turno</th>
                      <th className="p-2.5">Categoria</th>
                      <th className="p-2.5">Negozio</th>
                      <th className="p-2.5">Inizio</th>
                      <th className="p-2.5">Fine</th>
                      <th className="p-2.5">Pausa</th>
                      <th className="p-2.5 text-right">Azione</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {candidates.map((c, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/80 transition-colors">
                        <td className="p-2 font-medium text-slate-900 dark:text-slate-100">
                          <input
                            type="date"
                            value={c.date}
                            onChange={(e) => handleCandidateChange(idx, 'date', e.target.value)}
                            className="px-2 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-md"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={c.type}
                            onChange={(e) => handleCandidateChange(idx, 'type', e.target.value)}
                            className="px-2 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-md w-24"
                          />
                        </td>
                        <td className="p-2">
                          <select
                            value={c.category}
                            onChange={(e) => handleCandidateChange(idx, 'category', e.target.value)}
                            className="px-2 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-md capitalize"
                          >
                            <option value="work">Turno Normale</option>
                            <option value="ferie">Ferie</option>
                            <option value="permesso">Permesso</option>
                            <option value="congedo">Congedo</option>
                            <option value="riposo">Riposo</option>
                            <option value="straordinario">Straordinario</option>
                            <option value="malattia">Malattia</option>
                          </select>
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={c.location || ''}
                            placeholder="es. Valeggio"
                            onChange={(e) => handleCandidateChange(idx, 'location', e.target.value)}
                            className="px-2 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-md w-24"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="time"
                            value={c.startTime}
                            onChange={(e) => handleCandidateChange(idx, 'startTime', e.target.value)}
                            className="px-2 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-md"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="time"
                            value={c.endTime}
                            onChange={(e) => handleCandidateChange(idx, 'endTime', e.target.value)}
                            className="px-2 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-md"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            value={c.breakMinutes ?? 0}
                            onChange={(e) => handleCandidateChange(idx, 'breakMinutes', parseInt(e.target.value) || 0)}
                            className="px-2 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-md w-14"
                          />
                        </td>
                        <td className="p-2 text-right">
                          <button
                            onClick={() => handleRemoveCandidate(idx)}
                            className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                            title="Rimuovi questo turno dall'elenco"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setStep('upload')}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  ← Ricarica un altro file
                </button>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Annulla
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmExtraction}
                    disabled={candidates.length === 0}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Conferma e Salva ({candidates.length} Turni)</span>
                  </button>
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
};
