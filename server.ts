import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const appFilename = typeof __filename !== 'undefined' 
  ? __filename 
  : (import.meta && import.meta.url ? fileURLToPath(import.meta.url) : process.cwd());
const appDirname = typeof __dirname !== 'undefined' 
  ? __dirname 
  : path.dirname(appFilename);

// Local DB Path
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE_PATH = path.join(DATA_DIR, 'database.json');

function ensureDbExists() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE_PATH)) {
      const initialDb = {
        version: 1,
        updatedAt: new Date().toISOString(),
        shifts: null,
        contract: null,
        vacation: null,
        presets: null,
      };
      fs.writeFileSync(DB_FILE_PATH, JSON.stringify(initialDb, null, 2), 'utf8');
    }
  } catch (err) {
    console.error('Error ensuring database file exists:', err);
  }
}

function readDbData() {
  ensureDbExists();
  try {
    const raw = fs.readFileSync(DB_FILE_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading database file:', err);
    return null;
  }
}

function writeDbData(newData: any) {
  ensureDbExists();
  try {
    const current = readDbData() || {};
    const updated = {
      ...current,
      ...newData,
      updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(updated, null, 2), 'utf8');
    return updated;
  } catch (err) {
    console.error('Error writing database file:', err);
    throw err;
  }
}

function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function getFolderSize(dirPath: string): number {
  let size = 0;
  if (!fs.existsSync(dirPath)) return 0;
  try {
    const files = fs.readdirSync(dirPath);
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stats = fs.statSync(filePath);
      if (stats.isDirectory()) {
        size += getFolderSize(filePath);
      } else {
        size += stats.size;
      }
    }
  } catch (err) {
    console.error('Error calculating folder size:', err);
  }
  return size;
}

function getStorageDetails() {
  ensureDbExists();
  let dbSize = 0;
  try {
    const stat = fs.statSync(DB_FILE_PATH);
    dbSize = stat.size;
  } catch (e) {}

  const dbData = readDbData() || {};
  const shiftsCount = Array.isArray(dbData.shifts) ? dbData.shifts.length : 0;
  const presetsCount = Array.isArray(dbData.presets) ? dbData.presets.length : 0;
  const dataFolderSize = getFolderSize(DATA_DIR);

  const mem = process.memoryUsage();

  let diskInfo: any = null;
  try {
    if (typeof (fs as any).statfsSync === 'function') {
      const fsStats = (fs as any).statfsSync(DATA_DIR);
      const total = fsStats.blocks * fsStats.bsize;
      const free = fsStats.bfree * fsStats.bsize;
      const available = fsStats.bavail * fsStats.bsize;
      const used = total - free;
      const usedPercentage = total > 0 ? Math.round((used / total) * 100) : 0;
      diskInfo = {
        totalBytes: total,
        totalFormatted: formatBytes(total),
        freeBytes: available,
        freeFormatted: formatBytes(available),
        usedBytes: used,
        usedFormatted: formatBytes(used),
        usedPercentage,
      };
    }
  } catch (err) {
    console.warn('Could not retrieve fs.statfsSync stats:', err);
  }

  return {
    dbFilePath: DB_FILE_PATH,
    dbFileSize: dbSize,
    dbFileSizeFormatted: formatBytes(dbSize),
    dataFolderSize,
    dataFolderSizeFormatted: formatBytes(dataFolderSize),
    totalShifts: shiftsCount,
    totalPresets: presetsCount,
    hasContract: !!dbData.contract,
    hasVacation: !!dbData.vacation,
    lastUpdated: dbData.updatedAt || new Date().toISOString(),
    memoryUsage: {
      rss: mem.rss,
      rssFormatted: formatBytes(mem.rss),
      heapUsed: mem.heapUsed,
      heapUsedFormatted: formatBytes(mem.heapUsed),
      heapTotal: mem.heapTotal,
      heapTotalFormatted: formatBytes(mem.heapTotal),
    },
    diskInfo: diskInfo || {
      totalFormatted: 'Illimitato / Container',
      freeFormatted: 'Sufficiente',
      usedFormatted: formatBytes(dataFolderSize),
      usedPercentage: Math.min(100, Math.max(1, Math.round((dataFolderSize / (100 * 1024 * 1024)) * 100))),
    },
  };
}

async function startServer() {
  ensureDbExists();
  const app = express();
  const PORT = 3000;

  // Increase payload limit for PDF/Image base64 uploads
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Initialize Gemini Client
  const getGeminiClient = (customApiKey?: string) => {
    const apiKey = customApiKey || process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.trim() === '' || apiKey.includes('inserisci_la_tua_chiave') || apiKey.includes('****')) {
      throw new Error('Chiave API Gemini non configurata. Inseriscila nel file docker-compose.yml (GEMINI_API_KEY) oppure nella schermata Impostazioni dell\'app.');
    }
    return new GoogleGenAI({
      apiKey: apiKey.trim(),
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  };

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Local Database endpoints
  app.get('/api/database', (_req, res) => {
    try {
      const data = readDbData();
      res.json({ success: true, dbFilePath: DB_FILE_PATH, data });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/database', (req, res) => {
    try {
      const { shifts, contract, vacation, presets } = req.body;
      const payloadToUpdate: any = {};
      if (shifts !== undefined) payloadToUpdate.shifts = shifts;
      if (contract !== undefined) payloadToUpdate.contract = contract;
      if (vacation !== undefined) payloadToUpdate.vacation = vacation;
      if (presets !== undefined) payloadToUpdate.presets = presets;

      const updatedDb = writeDbData(payloadToUpdate);
      res.json({ success: true, dbFilePath: DB_FILE_PATH, data: updatedDb });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/database/restore', (req, res) => {
    try {
      const { data } = req.body;
      if (!data) {
        return res.status(400).json({ success: false, error: 'Dati mancanti per il ripristino' });
      }
      const updatedDb = writeDbData(data);
      res.json({ success: true, dbFilePath: DB_FILE_PATH, data: updatedDb });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Disk Storage Stats and Management
  app.get('/api/storage', (_req, res) => {
    try {
      const stats = getStorageDetails();
      res.json({ success: true, stats });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/storage/compact', (_req, res) => {
    try {
      const beforeStats = getStorageDetails();
      const currentData = readDbData() || {};

      // Clean up shifts by removing null/undefined properties
      let cleanedShifts = currentData.shifts;
      if (Array.isArray(cleanedShifts)) {
        cleanedShifts = cleanedShifts.map((shift: any) => {
          const s: any = { ...shift };
          Object.keys(s).forEach((key) => {
            if (s[key] === undefined || s[key] === null || s[key] === '') {
              delete s[key];
            }
          });
          return s;
        });
      }

      const compactedData = {
        ...currentData,
        shifts: cleanedShifts,
        compactedAt: new Date().toISOString(),
      };

      // Write with unformatted or clean spacing to reduce size
      fs.writeFileSync(DB_FILE_PATH, JSON.stringify(compactedData), 'utf8');

      const afterStats = getStorageDetails();
      const bytesSaved = Math.max(0, beforeStats.dbFileSize - afterStats.dbFileSize);

      res.json({
        success: true,
        message: `Database compattato con successo! Risparmiati ${formatBytes(bytesSaved)}.`,
        beforeSize: beforeStats.dbFileSizeFormatted,
        afterSize: afterStats.dbFileSizeFormatted,
        bytesSaved,
        stats: afterStats,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/storage/clean', (req, res) => {
    try {
      const { beforeYear, removeEmptyShifts, resetToDefaults } = req.body;
      const currentData = readDbData() || {};
      let shifts = Array.isArray(currentData.shifts) ? currentData.shifts : [];
      let removedCount = 0;

      if (resetToDefaults) {
        // Soft reset database file
        const resetData = {
          version: 1,
          updatedAt: new Date().toISOString(),
          shifts: [],
          contract: currentData.contract || null,
          vacation: currentData.vacation || null,
          presets: currentData.presets || null,
        };
        writeDbData(resetData);
        const stats = getStorageDetails();
        return res.json({
          success: true,
          message: 'Tutti i turni sono stati archiviati e il database è stato azzerato.',
          stats,
        });
      }

      if (beforeYear && typeof beforeYear === 'number') {
        const initialLen = shifts.length;
        shifts = shifts.filter((s: any) => {
          if (!s.date) return false;
          const shiftYear = parseInt(s.date.split('-')[0], 10);
          return shiftYear >= beforeYear;
        });
        removedCount += initialLen - shifts.length;
      }

      if (removeEmptyShifts) {
        const initialLen = shifts.length;
        shifts = shifts.filter((s: any) => {
          if (!s.date) return false;
          // Keep if category or hours or type exists
          return !!(s.type || s.category || s.workedHours > 0);
        });
        removedCount += initialLen - shifts.length;
      }

      const updatedDb = writeDbData({ ...currentData, shifts });
      const stats = getStorageDetails();

      res.json({
        success: true,
        message: `Pulizia completata! Rimosse ${removedCount} voci non necessarie/archiviate.`,
        removedCount,
        stats,
        data: updatedDb,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Config status
  app.get('/api/config', (_req, res) => {
    const envKey = process.env.GEMINI_API_KEY;
    const isEnvConfigured = !!(envKey && envKey.trim().length > 0 && !envKey.includes('inserisci_la_tua_chiave') && !envKey.includes('****'));
    res.json({
      isEnvConfigured,
      hasApiKey: isEnvConfigured,
    });
  });

  // Test API Key connection
  app.post('/api/test-key', async (req, res) => {
    try {
      const headerKey = req.headers['x-gemini-api-key'] as string | undefined;
      const customKey = req.body?.customApiKey || headerKey;
      const ai = getGeminiClient(customKey);

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: 'Rispondi semplicemente OK in una sola parola per confermare il funzionamento della chiave.',
      });

      res.json({
        success: true,
        message: 'Connessione con le API Gemini completata con successo!',
        response: response.text?.trim() || 'OK',
      });
    } catch (err: any) {
      console.error('Errore test chiave Gemini:', err);
      res.status(400).json({
        success: false,
        error: err?.message || 'Chiave API non valida o non funzionante.',
      });
    }
  });

  // Helper for processing Base64 and MIME types robustly
  function processBase64AndMime(rawBase64: string, rawMimeType?: string) {
    let cleanBase64 = rawBase64 || '';
    if (cleanBase64.includes(';base64,')) {
      cleanBase64 = cleanBase64.split(';base64,').pop() || '';
    } else {
      cleanBase64 = cleanBase64.replace(/^data:.*?;base64,/, '');
    }

    let mime = (rawMimeType || '').toLowerCase().trim();

    // Auto-detect or normalize mime type
    if (!mime || mime === 'application/octet-stream' || mime === 'octet-stream') {
      if (cleanBase64.startsWith('JVBERi0')) mime = 'application/pdf';
      else if (cleanBase64.startsWith('iVBORw0KGgo')) mime = 'image/png';
      else if (cleanBase64.startsWith('/9j/')) mime = 'image/jpeg';
      else if (cleanBase64.startsWith('UklGR')) mime = 'image/webp';
      else mime = 'image/jpeg';
    } else if (mime === 'pdf' || mime.endsWith('/pdf')) {
      mime = 'application/pdf';
    } else if (mime === 'png' || mime.endsWith('/png')) {
      mime = 'image/png';
    } else if (mime === 'jpg' || mime === 'jpeg' || mime.endsWith('/jpeg') || mime.endsWith('/jpg')) {
      mime = 'image/jpeg';
    }

    return { cleanBase64, mimeType: mime };
  }

  // Safe JSON parser stripping markdown fences
  function safeParseJson(rawText?: string) {
    if (!rawText) return {};
    let cleaned = rawText.trim();
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/, '').trim();
    try {
      return JSON.parse(cleaned);
    } catch (e) {
      const startIdx = cleaned.indexOf('{');
      const endIdx = cleaned.lastIndexOf('}');
      if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        try {
          return JSON.parse(cleaned.substring(startIdx, endIdx + 1));
        } catch (innerErr) {
          console.error('Failed fallback JSON parse:', innerErr);
        }
      }
      throw new Error('La risposta dell\'IA non è in formato JSON valido.');
    }
  }

  // Extract shifts from PDF or photo/image
  app.post('/api/extract-shifts', async (req, res) => {
    try {
      const { fileBase64, mimeType, userNotes, referenceYearMonth, referenceMondayDate, employeeName, customApiKey } = req.body;
      const headerKey = req.headers['x-gemini-api-key'] as string | undefined;

      if (!fileBase64) {
        return res.status(400).json({
          success: false,
          error: 'File base64 obbligatorio.',
        });
      }

      const { cleanBase64, mimeType: finalMimeType } = processBase64AndMime(fileBase64, mimeType);

      const activeKey = customApiKey || headerKey;
      const ai = getGeminiClient(activeKey);

      const systemInstruction = `
Sei un assistente specializzato nell'analisi e digitalizzazione di prospetti, orari di lavoro aziendali e turnari italiani (PDF, foto, screenshot, immagini di tabelle turni).

IL TUO COMPITO:
Estrarre i turni di lavoro per la persona/dipendente richiesta, collocandoli nelle date corrette (formato ISO YYYY-MM-DD).

COME DETERMINARE LE DATE PRECISE DEI TURNI (RIGOROSA GERARCHIA):
1. PRIORITÀ ASSOLUTA ALLE DATE NEL DOCUMENTO/IMMAGINE:
   - Se nelle colonne della tabella o nell'intestazione della foto/PDF sono leggibili le date esplicite con giorno/mese/anno (es. "lun 06/07/2026", "mar 07/07/2026", "06/07/2026", "Turni: 06/07/2026", "27/07/2026"):
     DEVI TASSATIVAMENTE USARE QUELLE DATE PER OGNI SINGOLO GIORNO (convertite in YYYY-MM-DD, es. "2026-07-06", "2026-07-07", "2026-07-08"...)!
   - Ignora la data di riferimento inserita a mano se il documento/foto contiene già le date chiare giorno per giorno!
2. SE NEL FOGLIO/FOTO NON CI SONO DATE ESPRESSE (es. ci sono solo i nomi dei giorni "LUN, MAR..." senza numeri o solo "Week 31"):
   - Usa la "Data del Lunedì di Riferimento" fornita dall'utente (${referenceMondayDate || 'Non fornita, usa il Lunedì del mese ' + (referenceYearMonth || 'corrente')}).
   - Assegna LUN = Lunedì di Riferimento, MAR = Martedì (+1gg), MER = Mercoledì (+2gg), GIO = Giovedì (+3gg), VEN = Venerdì (+4gg), SAB = Sabato (+5gg), DOM = Domenica (+6gg).

SELEZIONE DEL DIPENDENTE/PERSONA:
- Se l'utente ha specificato un Cognome/Nome (${employeeName ? `"${employeeName}"` : 'NON specificato'}), CERCA RIGOROSAMENTE LA RIGA CORRISPONDENTE a quel cognome/nome nella tabella!
- Se l'utente NON ha specificato un cognome, estrai i turni per il PRIMO dipendente visibile nella tabella ed indica chiaramente il cognome estratto nel campo "summaryNote".

REGOLE PER GLI ORARI, PAUSE E CATEGORIE:
- Orari visibili "Dalle - Alle" (es. 06:30 12:15): inserisci startTime "06:30" e endTime "12:15".
- STACCHI E PAUSE BREVI (es. 15 MINUTI): Se nello stesso giorno il dipendente ha due o più sotto-orari separati da uno stacco breve (es. 15 o 30 minuti, ad esempio 06:30-10:15 e 10:30-13:00):
  * NON creare due turni separati nè considerare le pause come orario di lavoro!
  * UNISCI i sotto-orari in un UNICO TURNO continuo con inizio dal primo blocco (es. startTime: "06:30") e fine all'ultimo blocco (es. endTime: "13:00").
  * Somma i minuti di stacco/pausa (es. 15 minuti tra le 10:15 e le 10:30) ed inserisci il totale nel campo breakMinutes (es. breakMinutes: 15). In questo modo la pausa non retribuita viene scalata dalle ore effettive e dal totale delle 38 ore settimanali.
- REGOLE PER NOME E SIGLA TURNO (campo type):
  * Cerca se nel documento sono usati codici o sigle (es. MC, MC1, MC2, PC, PC1, PC2, M, P, N, SP, R, F, PER, CONG).
  * Se nel documento c'è una sigla (es. "MC"), imposta type = "MC - Mattino continuato" o la sigla trovata.
  * Se sono presenti orari, assegna la sigla e nome preciso:
    - Inizio mattina (es. 06:30, 08:00) e fine pomeriggio/16:00 -> "MC - Mattino continuato" (sigla MC)
    - Inizio mattina/mezzogiorno/primo pomeriggio (es. 12:00, 13:00, 08:00-20:00, 13:00-19:45) e fine sera (dalle 19:30 in poi o durata >= 6.5 ore) -> "PC - Pomeriggio continuato" (sigla PC)
    - Inizio mattina e fine prima delle 13:30 -> "M - Mattino" (sigla M)
    - Inizio pomeriggio avanzato (es. 15:00) e durata breve/standard (es. 15:00-19:30) -> "P - Pomeriggio" (sigla P)
    - Inizio sera/notte (es. 22:00 o 23:00) -> "N - Notte" (sigla N)
    - Turno spezzato -> "SP - Spezzato" (sigla SP)
  * MAI restituire solo "Lavoro" o "Turno" generico!
- Se per un giorno non ci sono orari o c'è una casella vuota / simbolo di riposo: imposta category "riposo", startTime "00:00", endTime "00:00", type "R - Riposo".
- REGOLE PER IL NEGOZIO / SEDE DI LAVORO (campo location):
  * Cerca se nel documento o nelle note dell'utente viene menzionato il negozio o la sede di lavoro (es. "Valeggio", "Sirmione", "Desenzano", "Peschiera", "Garda", "Negozio V", "Negozio S", "Sede Valeggio", ecc.).
  * Se nel documento o intestazione c'è il nome del negozio/punto vendita (es. "Valeggio" o "Sirmione"), valorizza il campo location con il nome del negozio (es. "Valeggio" o "Sirmione").
- Fai attenzione a diciture come Ferie, Permesso, ROL, Malattia, Festivo.
`;

      const promptText = `
Analizza l'immagine/PDF fornita ed estrai i turni.
${employeeName ? `Dipendente da estrarre: ${employeeName}` : 'Estrai i turni per il dipendente oppure per il primo nell\'elenco se non specificato.'}
${referenceMondayDate ? `Data del Lunedì di questa settimana: ${referenceMondayDate}` : ''}
${referenceYearMonth ? `Mese/Anno di riferimento desiderato: ${referenceYearMonth}` : ''}
Note o istruzioni aggiuntive dall'utente: ${userNotes || 'Nessuna.'}
`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: finalMimeType,
                data: cleanBase64,
              },
            },
            {
              text: promptText,
            },
          ],
        },
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              monthDetected: {
                type: Type.STRING,
                description: 'Anno e mese rilevato nel formato YYYY-MM (es. 2026-07)',
              },
              summaryNote: {
                type: Type.STRING,
                description: 'Sintesi dell\'estrazione (es. Estratti 6 turni per BASSI relativi alla settimana 27/07/2026 - 02/08/2026)',
              },
              shifts: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    date: {
                      type: Type.STRING,
                      description: 'Data del turno nel formato ISO YYYY-MM-DD',
                    },
                    type: {
                      type: Type.STRING,
                      description: 'Nome o tipo del turno (es. Mattina, Pomeriggio, Spezzato, Riposo, Ferie)',
                    },
                    category: {
                      type: Type.STRING,
                      description: 'Una tra: work, ferie, permesso, riposo, straordinario, malattia, altro',
                    },
                    startTime: {
                      type: Type.STRING,
                      description: 'Orario inizio HH:mm (es. 06:30). Usare 00:00 per riposo/ferie.',
                    },
                    endTime: {
                      type: Type.STRING,
                      description: 'Orario fine HH:mm (es. 12:15). Usare 00:00 per riposo/ferie.',
                    },
                    breakMinutes: {
                      type: Type.NUMBER,
                      description: 'Minuti di pausa stimate o indicati',
                    },
                    location: {
                      type: Type.STRING,
                      description: 'Nome del negozio o sede (es. Valeggio, Sirmione)',
                    },
                    notes: {
                      type: Type.STRING,
                      description: 'Note aggiuntive (es. Dipendente BASSI - Turno mattina)',
                    },
                  },
                  required: ['date', 'type', 'category', 'startTime', 'endTime'],
                },
              },
            },
            required: ['shifts'],
          },
        },
      });

      const responseText = response.text || '{}';
      const parsedData = safeParseJson(responseText);

      return res.json({
        success: true,
        monthDetected: parsedData.monthDetected || referenceYearMonth,
        summaryNote: parsedData.summaryNote || 'Turni estratti con successo!',
        shifts: parsedData.shifts || [],
      });
    } catch (err: any) {
      console.error('Errore durante l\'estrazione AI dei turni:', err);
      return res.status(500).json({
        success: false,
        error: err?.message || 'Si è verificato un errore durante l\'elaborazione del file.',
      });
    }
  });

  // Analyze Payslip (Busta Paga) with Privacy Safeguards
  app.post('/api/analyze-payslip', async (req, res) => {
    try {
      const { textContent, fileBase64, mimeType, customApiKey, appTotalsForMonth } = req.body;
      const headerKey = req.headers['x-gemini-api-key'] as string | undefined;
      const activeKey = customApiKey || headerKey;
      const ai = getGeminiClient(activeKey);

      const systemInstruction = `
Sei un esperto consulente del lavoro italiano specializzato nell'analisi e spiegazione semplice delle buste paga (cedolini paga) per dipendenti (CCNL Commercio, Sanità, Industria, Metalmeccanico, Enti Locali, ecc.).

IL TUO OBIETTIVO:
1. Spiegare ogni singola voce della busta paga fornita in ITALIANO SEMPLICE E ACCESSIBILE, eliminando la burocrazia ed il gergo oscuro.
2. Identificare gli importi principali: Lordo in Busta, Netto a Pagare, Trattenute INPS, IRPEF, eventuale TFR accantonato.
3. Se sono fornite le ore registrate dall'app per quel mese (${JSON.stringify(appTotalsForMonth || {})}), confrontare i totali delle ore (ore ordinarie, straordinari, notturni, festivi) e segnalare eventuali discrepanze.
4. RASSICURAZIONE SULLA PRIVACY: Il testo fornito è già stato anonimizzato dal browser. Concentrati unicamente sui numeri e sulle voci di contratto.

CATEGORIE VOCI:
- competenze: somme aggiunte al lordo (stipendio base, scatti, straordinari, indennità turno, festivi, superminimo)
- trattenute: somme sottratte dal lordo (INPS IVS, trattenute sindacali, acconti, addizionali)
- tassazione: IRPEF, detrazioni lavoro dipendente, conguagli
- riepilogo: imponibile fiscale, imponibile previdenziale, TFR
- altro: note generali o contatori ore/ferie

Restituisci la risposta rigorosamente in JSON secondo lo schema specificato.
`;

      const parts: any[] = [];

      if (fileBase64) {
        const { cleanBase64, mimeType: finalMimeType } = processBase64AndMime(fileBase64, mimeType);
        parts.push({
          inlineData: {
            mimeType: finalMimeType,
            data: cleanBase64,
          },
        });
      }

      let promptText = `Analizza questo cedolino / voce di busta paga anonimizzato e spiegamelo voce per voce.`;
      if (textContent) {
        promptText += `\n\nTESTO BUSTA PAGA ANONIMIZZATO:\n${textContent}`;
      }
      if (appTotalsForMonth) {
        promptText += `\n\nRIEPILOGO ORE REGISTRATE NELL'APP PER IL CONFRONTO:
- Mese Cedolino Busta Paga: ${appTotalsForMonth.currentMonthLabel || 'Mese Corrente'}
- Ore Ordinarie Lavorate Mese Corrente (App): ${appTotalsForMonth.workedHours || 0}h
- Ore Straordinarie Attese in Busta (${appTotalsForMonth.overtimeReferenceMonthLabel || 'Mese Corrente'}): ${appTotalsForMonth.overtimeHours || 0}h
- Ore Notturne Attese (${appTotalsForMonth.overtimeReferenceMonthLabel || 'Mese Corrente'}): ${appTotalsForMonth.nightHours || 0}h
- Turni Festivi Attesi (${appTotalsForMonth.overtimeReferenceMonthLabel || 'Mese Corrente'}): ${appTotalsForMonth.holidayHours || 0}h
- Regola Aziendale Pagamento Straordinari: ${appTotalsForMonth.overtimeLagNote || 'Pagamento nello stesso mese'}`;
      }

      parts.push({ text: promptText });

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: { parts },
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              monthYear: { type: Type.STRING, description: 'Mese e anno della busta se rilevato (es. Luglio 2026)' },
              grossAmount: { type: Type.NUMBER, description: 'Totale retribuzione lorda o imponibile' },
              netAmount: { type: Type.NUMBER, description: 'Totale netto a pagare al dipendente' },
              totalWorkedHoursReported: { type: Type.NUMBER, description: 'Ore retribuite orarie in busta' },
              overtimeHoursReported: { type: Type.NUMBER, description: 'Ore straordinarie in busta' },
              nightHoursReported: { type: Type.NUMBER, description: 'Ore o indennità notturne' },
              holidayHoursReported: { type: Type.NUMBER, description: 'Ore o indennità festive' },
              generalSummary: { type: Type.STRING, description: 'Sintesi generale e giudizio complessivo sulla busta paga' },
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    codeOrName: { type: Type.STRING, description: 'Nome della voce o codice in busta (es. 102 - Indennità Turno)' },
                    category: { type: Type.STRING, description: 'competenze, trattenute, tassazione, riepilogo, o altro' },
                    amount: { type: Type.NUMBER, description: 'Importo in Euro se visibile' },
                    quantity: { type: Type.NUMBER, description: 'Ore o quantità se visibile' },
                    plainItalianMeaning: { type: Type.STRING, description: 'Spiegazione chiara ed in italiano semplice di cosa significa questa voce' },
                    howItIsCalculated: { type: Type.STRING, description: 'Come viene calcolato questo importo secondo le regole della busta paga' },
                    isTaxable: { type: Type.BOOLEAN, description: 'True se la voce concorre al reddito tassabile IRPEF' },
                    userAdvice: { type: Type.STRING, description: 'Consiglio pratico per il dipendente su cosa controllare' },
                  },
                  required: ['codeOrName', 'category', 'plainItalianMeaning', 'howItIsCalculated'],
                },
              },
            },
            required: ['generalSummary', 'items'],
          },
        },
      });

      const parsedData = safeParseJson(response.text);

      return res.json({
        success: true,
        data: parsedData,
      });
    } catch (err: any) {
      console.error('Errore durante l\'analisi della busta paga:', err);
      return res.status(500).json({
        success: false,
        error: err?.message || 'Impossibile analizzare la busta paga con l\'IA.',
      });
    }
  });

  // Vite middleware in development
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[TurniLavoro] Server attivo su http://0.0.0.0:${PORT}`);
  });
}

startServer();
