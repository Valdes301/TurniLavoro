import React, { useState } from 'react';
import { 
  Server, 
  Copy, 
  Check, 
  Terminal, 
  HardDrive, 
  Key, 
  Cpu, 
  ExternalLink, 
  Info, 
  ShieldCheck, 
  RefreshCw,
  FolderTree,
  Zap
} from 'lucide-react';

export const DockerGuideView: React.FC = () => {
  const [copiedCompose, setCopiedCompose] = useState(false);
  const [copiedOneLiner, setCopiedOneLiner] = useState(false);
  const [copiedKeyEnv, setCopiedKeyEnv] = useState(false);

  const dockerComposeCode = `services:
  turnilavoro:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: turnilavoro
    restart: unless-stopped
    image: turnilavoro:v1.0
    ports:
      - "2008:3000"
    labels:
      - "com.centurylinklabs.watchtower.enable=false"
    environment:
      - GEMINI_API_KEY=la_tua_chiave_api_qui
      - NODE_ENV=production
      - PORT=3000
    volumes:
      - ./data:/app/data`;

  const oneLinerSetupCode = `mkdir -p /appdata/turnilavoro/data && cd /appdata/turnilavoro
cat << 'EOF' > docker-compose.yml
${dockerComposeCode}
EOF
docker compose up -d --build`;

  const copyToClipboard = (text: string, setCopiedState: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setCopiedState(true);
    setTimeout(() => setCopiedState(false), 2500);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-500/30">
              <Cpu className="w-3.5 h-3.5 text-indigo-400" />
              <span>Ottimizzato per Raspberry Pi 3/4/5 & Linux ARM64 / x86_64</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Guida Installazione Docker & Docker Compose
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Esegui TurniLavoro sul tuo server casalingo o Raspberry Pi in pochi secondi con persistenza dei dati automatica e supporto all'Intelligenza Artificiale Gemini.
            </p>
          </div>

          <a
            href="#yaml-section"
            className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl text-xs transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-2 shrink-0"
          >
            <Server className="w-4 h-4" />
            <span>Vai al Codice YAML</span>
          </a>
        </div>
      </div>

      {/* Feature Highlights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <HardDrive className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-sm">Persistenza Dati Garantita</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            I turni e i contratti vengono salvati in un file JSON locale montato in un volume Docker (`./data/database.json`), al sicuro da riavvii o aggiornamenti.
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Key className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-sm">IA Gemini Flessibile</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Puoi passare la chiave API tramite la variabile d'ambiente `GEMINI_API_KEY` nel file YAML oppure inserirla al volo nella sezione Impostazioni dell'app.
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Zap className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-sm">Consumi Minimi di Memoria</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Il container utilizza Node.js 20 Alpine in modalità produzione, occupando meno di 80MB di RAM, perfetto per Raspberry Pi 3, 4 o 5.
          </p>
        </div>
      </div>

      {/* YAML Section */}
      <div id="yaml-section" className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Terminal className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-base text-slate-900">
                1. Il File `docker-compose.yml`
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Crea questo file nella directory principale del tuo progetto su Raspberry Pi.
            </p>
          </div>

          <button
            onClick={() => copyToClipboard(dockerComposeCode, setCopiedCompose)}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs ${
              copiedCompose
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-900 text-white hover:bg-slate-800'
            }`}
          >
            {copiedCompose ? (
              <>
                <Check className="w-4 h-4 text-white" />
                <span>Copiato negli Appunti!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copia Codice YAML</span>
              </>
            )}
          </button>
        </div>

        {/* Code Block Container */}
        <div className="relative rounded-2xl bg-slate-950 p-4 sm:p-6 text-slate-100 font-mono text-xs overflow-x-auto border border-slate-800 shadow-inner">
          <pre className="leading-relaxed">
            <code>{dockerComposeCode}</code>
          </pre>
        </div>

        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
          <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold block">Nota importante sulla chiave API Gemini:</span>
            <p className="leading-relaxed">
              La chiave API di Google Gemini è totalmente <strong>gratuita</strong> e ti permette di estrarre i turni caricando foto o PDF dei tuoi orari di lavoro. Puoi generare la chiave in pochi secondi su <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="underline font-bold text-amber-950 hover:text-black inline-flex items-center gap-0.5">Google AI Studio <ExternalLink className="w-3 h-3" /></a>.
            </p>
          </div>
        </div>
      </div>

      {/* Step by Step Setup Guide */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-8">
        <h3 className="font-bold text-base text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
          <FolderTree className="w-5 h-5 text-blue-600" />
          <span>2. Procedura di Installazione Passo dopo Passo</span>
        </h3>

        <div className="space-y-6">
          {/* Step 1 */}
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
              1
            </div>
            <div className="space-y-2 flex-1">
              <h4 className="font-bold text-slate-900 text-sm">
                Installa Docker e Docker Compose sul Raspberry Pi
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Se non hai ancora installato Docker sul tuo sistema Linux o Raspberry Pi OS, esegui il comando ufficiale di installazione rapida:
              </p>
              <div className="bg-slate-900 text-slate-100 p-3 rounded-xl font-mono text-xs flex items-center justify-between overflow-x-auto">
                <code>curl -sSL https://get.docker.com | sh</code>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
              2
            </div>
            <div className="space-y-2 flex-1">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-900 text-sm">
                  Crea la cartella ed il file di configurazione (Scrittura Veloce)
                </h4>
                <button
                  onClick={() => copyToClipboard(oneLinerSetupCode, setCopiedOneLiner)}
                  className="text-xs text-indigo-600 font-semibold hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                >
                  {copiedOneLiner ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedOneLiner ? 'Copiato!' : 'Copia Comando Completo'}</span>
                </button>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Esegui questo comando nel terminale del Raspberry Pi per creare la cartella <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">turni-lavoro</code>, generare il file <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">docker-compose.yml</code> e avviare l'applicazione:
              </p>
              <div className="bg-slate-950 text-slate-100 p-4 rounded-xl font-mono text-xs overflow-x-auto border border-slate-800">
                <pre>{oneLinerSetupCode}</pre>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
              3
            </div>
            <div className="space-y-2 flex-1">
              <h4 className="font-bold text-slate-900 text-sm">
                Accedi all'Applicazione dal Browser
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Una volta completato l'avvio, apri il browser da qualsiasi dispositivo connesso alla tua rete locale (smartphone, tablet o PC) all'indirizzo:
              </p>
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 font-mono text-xs font-bold inline-block">
                http://&lt;IP-DEL-TUO-RASPBERRY&gt;:2008
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Useful Commands Table */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-4">
        <h3 className="font-bold text-base text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
          <Zap className="w-5 h-5 text-indigo-600" />
          <span>3. Estrazione Turni da PDF o Foto senza Data Completa</span>
        </h3>

        <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
          <p>
            Se il tuo prospetto orari (PDF o foto) contiene una tabella con più dipendenti (es. <em>ALBIERO, BASSI, DE STEFANI...</em>) o mostra solo i giorni della settimana (es. <em>Week 31, 27 28 29 30 31 1 2</em>):
          </p>
          <ul className="list-disc pl-5 space-y-1.5 font-medium text-slate-800">
            <li>
              <strong>Cognome / Dipendente:</strong> Inserisci il tuo cognome (es. <code className="bg-slate-100 px-1 py-0.5 rounded">BASSI</code>). L'IA estrarrà esclusivamente la tua riga dalla tabella.
            </li>
            <li>
              <strong>Data del Lunedì (Inizio Settimana):</strong> Imposta la data del Lunedì (es. <code className="bg-slate-100 px-1 py-0.5 rounded">2026-07-27</code>). L'IA assegnerà automaticamente ciascun turno al rispettivo giorno (Lunedì 27/07, Martedì 28/07... Domenica 02/08).
            </li>
            <li>
              <strong>Turni Doppi / Spezzati:</strong> L'IA rileva automaticamente due o più fasce orarie nello stesso giorno (es. 06:30-10:15 e 10:30-13:00) aggiungendo i turni corrispondenti.
            </li>
          </ul>
        </div>
      </div>

      {/* Useful Commands Table */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-4">
        <h3 className="font-bold text-base text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
          <Terminal className="w-5 h-5 text-slate-700" />
          <span>4. Comandi Gestione Container Docker</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1">
            <span className="font-bold text-slate-900 block">Avvio in background</span>
            <code className="bg-slate-200 px-2 py-1 rounded text-[11px] font-mono text-slate-800 block">
              docker compose up -d
            </code>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1">
            <span className="font-bold text-slate-900 block">Visualizza i log in tempo reale</span>
            <code className="bg-slate-200 px-2 py-1 rounded text-[11px] font-mono text-slate-800 block">
              docker compose logs -f
            </code>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1">
            <span className="font-bold text-slate-900 block">Riavvia il container</span>
            <code className="bg-slate-200 px-2 py-1 rounded text-[11px] font-mono text-slate-800 block">
              docker compose restart
            </code>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1">
            <span className="font-bold text-slate-900 block">Aggiorna codice da GitHub</span>
            <code className="bg-slate-200 px-2 py-1 rounded text-[11px] font-mono text-slate-800 block">
              docker compose build --no-cache && docker compose up -d
            </code>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1">
            <span className="font-bold text-slate-900 block">Ricostruisci e ricrea container</span>
            <code className="bg-slate-200 px-2 py-1 rounded text-[11px] font-mono text-slate-800 block">
              docker compose up -d --build --force-recreate
            </code>
          </div>
        </div>
      </div>

    </div>
  );
};
