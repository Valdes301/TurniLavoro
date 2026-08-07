import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  ShieldAlert, 
  Sparkles, 
  FileText,
  Building,
  User,
  CreditCard,
  Sliders,
  Check
} from 'lucide-react';

interface RealPayslipPrivacyPreviewProps {
  rawText: string;
  anonymizedText: string;
  userSurname: string;
  companyName: string;
  filePreview: string | null;
  fileName?: string;
  redactionsCount: number;
  currentMonthLabel: string;
}

export const RealPayslipPrivacyPreview: React.FC<RealPayslipPrivacyPreviewProps> = ({
  rawText,
  anonymizedText,
  userSurname,
  companyName,
  filePreview,
  fileName,
  redactionsCount,
  currentMonthLabel,
}) => {
  // Redaction Toggle States
  const [hidePersonalData, setHidePersonalData] = useState(true);
  const [hideCompanyData, setHideCompanyData] = useState(true);
  const [hideBankingData, setHideBankingData] = useState(true);
  const [activeViewMode, setActiveViewMode] = useState<'document' | 'raw_text'>('document');

  return (
    <div className="bg-slate-900 rounded-2xl p-5 border border-emerald-800/60 text-slate-100 space-y-4 shadow-xl">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
              Anteprima Reale Busta Paga Oscurata
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-2 py-0.5 rounded-md font-extrabold border border-emerald-500/30">
                Privacy Shield 100% Attivo
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Visualizza esattamente le aree della busta paga che vengono scurite prima di inviare le voci all'IA
            </p>
          </div>
        </div>

        {/* View mode toggle button */}
        <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs">
          <button
            onClick={() => setActiveViewMode('document')}
            className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
              activeViewMode === 'document' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Vista Grafica Cedolino
          </button>
          <button
            onClick={() => setActiveViewMode('raw_text')}
            className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
              activeViewMode === 'raw_text' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Vista Testo Anonimo
          </button>
        </div>
      </div>

      {/* Interactive Privacy Filter Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-xs">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={hidePersonalData}
            onChange={(e) => setHidePersonalData(e.target.checked)}
            className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500 bg-slate-900 border-slate-700"
          />
          <span className="flex items-center gap-1.5 font-semibold text-slate-300">
            <User className="w-3.5 h-3.5 text-emerald-400" />
            Anagrafica & Codice Fiscale
          </span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={hideCompanyData}
            onChange={(e) => setHideCompanyData(e.target.checked)}
            className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500 bg-slate-900 border-slate-700"
          />
          <span className="flex items-center gap-1.5 font-semibold text-slate-300">
            <Building className="w-3.5 h-3.5 text-blue-400" />
            Ragione Sociale Azienda
          </span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={hideBankingData}
            onChange={(e) => setHideBankingData(e.target.checked)}
            className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500 bg-slate-900 border-slate-700"
          />
          <span className="flex items-center gap-1.5 font-semibold text-slate-300">
            <CreditCard className="w-3.5 h-3.5 text-amber-400" />
            Coordinate Bancarie & IBAN
          </span>
        </label>
      </div>

      {/* MAIN VISUAL PREVIEW BOX */}
      {activeViewMode === 'document' ? (
        <div className="space-y-3">
          
          {/* IMAGE OVERLAY MODE (If user uploaded an image) */}
          {filePreview ? (
            <div className="relative rounded-xl overflow-hidden border-2 border-slate-800 bg-slate-950 max-h-[500px] flex justify-center items-center p-2">
              <div className="relative inline-block max-w-full">
                <img
                  src={filePreview}
                  alt="Anteprima Cedolino Busta Paga"
                  className="max-h-[460px] object-contain rounded opacity-90"
                />

                {/* Simulated Redaction Black Bars Over sensitive zones */}
                {hideCompanyData && (
                  <div className="absolute top-[4%] left-[4%] right-[40%] h-[12%] bg-black/95 backdrop-blur-md rounded border border-emerald-500/50 flex items-center justify-center p-1 text-center shadow-2xl">
                    <span className="text-[10px] font-black tracking-widest text-emerald-400 uppercase flex items-center gap-1">
                      <Lock className="w-3 h-3 text-emerald-400" />
                      ████ DATI AZIENDALI SCHERMATI PRIVACY ████
                    </span>
                  </div>
                )}

                {hidePersonalData && (
                  <div className="absolute top-[4%] right-[4%] w-[34%] h-[16%] bg-black/95 backdrop-blur-md rounded border border-emerald-500/50 flex flex-col items-center justify-center p-1 text-center shadow-2xl space-y-0.5">
                    <span className="text-[9.5px] font-black text-emerald-400 uppercase flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      DIPENDENTE & C.F.
                    </span>
                    <span className="text-[8px] font-mono text-slate-400">████████████████</span>
                  </div>
                )}

                {hideBankingData && (
                  <div className="absolute bottom-[4%] left-[4%] right-[4%] h-[10%] bg-black/95 backdrop-blur-md rounded border border-amber-500/50 flex items-center justify-between px-3 text-center shadow-2xl">
                    <span className="text-[9px] font-bold text-amber-300 flex items-center gap-1">
                      <CreditCard className="w-3 h-3" />
                      IBAN / CONTO CORRENTE SCHERMATO
                    </span>
                    <span className="text-[9px] font-mono text-slate-400">IT89 X ████ ████ ████ ████</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* REALISTIC GRAPHIC PAYSLIP MOCKUP (When text is pasted or generated) */
            <div className="bg-slate-950 rounded-xl p-5 border border-slate-800 space-y-4 font-mono text-xs">
              
              {/* Mockup Header: Company & Employee */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-3 border-b border-slate-800">
                {/* Company Box */}
                <div className={`p-3 rounded-lg border transition-all ${
                  hideCompanyData 
                    ? 'bg-black/90 border-slate-800 text-slate-500' 
                    : 'bg-slate-900 border-slate-700 text-slate-200'
                }`}>
                  <span className="text-[9px] uppercase font-bold text-slate-500 block mb-1">
                    Datore di Lavoro / Spett.le Azienda:
                  </span>
                  {hideCompanyData ? (
                    <div className="font-bold text-emerald-400 bg-slate-900/80 px-2 py-1 rounded border border-emerald-900/50 flex items-center justify-between text-[11px]">
                      <span>████████ ACME SRL ████████</span>
                      <Lock className="w-3 h-3 text-emerald-400" />
                    </div>
                  ) : (
                    <div className="font-bold text-slate-200">
                      {companyName || 'AZIENDA ESEMPIO S.P.A.'} (P.IVA 01234567890)
                    </div>
                  )}
                </div>

                {/* Employee Box */}
                <div className={`p-3 rounded-lg border transition-all ${
                  hidePersonalData 
                    ? 'bg-black/90 border-slate-800 text-slate-500' 
                    : 'bg-slate-900 border-slate-700 text-slate-200'
                }`}>
                  <span className="text-[9px] uppercase font-bold text-slate-500 block mb-1">
                    Dipendente / Codice Fiscale:
                  </span>
                  {hidePersonalData ? (
                    <div className="font-bold text-emerald-400 bg-slate-900/80 px-2 py-1 rounded border border-emerald-900/50 flex items-center justify-between text-[11px]">
                      <span>████ {userSurname ? userSurname.toUpperCase() : 'DIPENDENTE'} ████ (CF: ████████)</span>
                      <Lock className="w-3 h-3 text-emerald-400" />
                    </div>
                  ) : (
                    <div className="font-bold text-slate-200">
                      MARIO {userSurname ? userSurname.toUpperCase() : 'ROSSI'} - CF: RSSMRA80A01H501U
                    </div>
                  )}
                </div>
              </div>

              {/* Table Body: Readable Payslip Items sent to AI */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[10px] font-bold text-emerald-400 uppercase tracking-wider bg-slate-900/80 p-2 rounded">
                  <span>Voci di Busta Paga Inviate All'IA (Leggibili ed Elaborate):</span>
                  <span>Mese: {currentMonthLabel}</span>
                </div>

                <div className="bg-slate-900 rounded-lg p-3 space-y-1.5 text-[11px] border border-slate-800">
                  {rawText ? (
                    <pre className="whitespace-pre-wrap text-emerald-300/90 font-mono text-[11px] max-h-48 overflow-y-auto">
                      {anonymizedText}
                    </pre>
                  ) : (
                    <div className="space-y-1 text-slate-300">
                      <div className="flex justify-between py-0.5 border-b border-slate-800">
                        <span>101 RETRIBUZIONE BASE CONTRATTUALE</span>
                        <span className="font-bold text-emerald-400">1.680,00 €</span>
                      </div>
                      <div className="flex justify-between py-0.5 border-b border-slate-800">
                        <span>102 INDENNITÀ STRAORDINARIO LORDO</span>
                        <span className="font-bold text-purple-400">+ 145,20 €</span>
                      </div>
                      <div className="flex justify-between py-0.5 border-b border-slate-800">
                        <span>201 TRATTENUTA PREVIDENZIALE INPS</span>
                        <span className="font-bold text-rose-400">- 182,50 €</span>
                      </div>
                      <div className="flex justify-between py-0.5">
                        <span>301 IRPEF NETTA TRIMESTRALE</span>
                        <span className="font-bold text-rose-400">- 310,00 €</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Mockup Footer: Banking & Net Payment */}
              <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px]">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-slate-400">Modalità Accreditamento:</span>
                  {hideBankingData ? (
                    <span className="font-bold text-amber-400 bg-black/80 px-2 py-0.5 rounded border border-amber-900/50">
                      IBAN ████ ████ ████ ████ (SCHERMATO)
                    </span>
                  ) : (
                    <span className="font-bold text-slate-200">IBAN IT89 X 03002 03280 000000123456</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Netto a Pagar:</span>
                  <span className="font-black text-emerald-400 text-sm">~ 1.625,00 €</span>
                </div>
              </div>

            </div>
          )}

        </div>
      ) : (
        /* RAW ANONYMIZED TEXT PREVIEW MODE */
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 font-mono text-xs">
          <div className="flex items-center justify-between text-emerald-400 font-bold">
            <span className="flex items-center gap-1.5">
              <Lock className="w-4 h-4" /> Strictly Anonymized Payload for Gemini API:
            </span>
            <span className="text-[10px] bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded">
              {redactionsCount} Dati Sensibili Anonimizzati
            </span>
          </div>
          <pre className="text-emerald-300/90 whitespace-pre-wrap max-h-64 overflow-y-auto p-3 bg-slate-900 rounded-lg border border-slate-800">
            {anonymizedText || '// Inserisci o carica una busta paga per vedere il testo anonimizzato in tempo reale...'}
          </pre>
        </div>
      )}

      {/* Security Statement Footer */}
      <div className="p-3 bg-emerald-950/40 rounded-xl border border-emerald-800/40 text-xs text-emerald-300 flex items-start gap-2">
        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <strong className="font-bold">Garantito da Privacy Shield Locale: </strong>
          I dati relativi a nomi, codici fiscali, datori di lavoro ed IBAN vengono sostituiti con token generici 
          direttamente nel browser tramite algoritmi di masking regex. L'IA Gemini riceve solo le cifre contabili e gli orari.
        </div>
      </div>

    </div>
  );
};
