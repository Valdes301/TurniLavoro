export interface GlossaryItem {
  key: string;
  name: string;
  category: 'competenze' | 'trattenute' | 'tassazione' | 'diritti';
  definition: string;
  howItWorks: string;
  example: string;
  isTaxable: boolean;
}

// Client-side privacy shield regexes & sanitizers
export function anonymizePayslipText(
  rawText: string,
  userSurname?: string,
  companyName?: string
): { anonymizedText: string; redactionsCount: number } {
  if (!rawText) return { anonymizedText: '', redactionsCount: 0 };

  let text = rawText;
  let redactionsCount = 0;

  // 1. Redact Italian Codice Fiscale (16 chars alphanumeric)
  const cfRegex = /[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]/gi;
  text = text.replace(cfRegex, () => {
    redactionsCount++;
    return '[CODICE_FISCALE_ANONIMIZZATO]';
  });

  // 2. Redact IBAN (IT... or international format)
  const ibanRegex = /[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}/gi;
  text = text.replace(ibanRegex, () => {
    redactionsCount++;
    return '[IBAN_ANONIMIZZATO]';
  });

  // 3. Redact Email addresses
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  text = text.replace(emailRegex, () => {
    redactionsCount++;
    return '[EMAIL_ANONIMIZZATA]';
  });

  // 4. Redact Phone / Cell numbers (+39..., 3xx-xxxxxxx, Tel: ...)
  const phoneRegex = /(?:(?:\+39|0039)[\s\.-]?)?(?:3[0-9]{2}|0[0-9]{1,4})[\s\.-]?[0-9]{6,8}/g;
  text = text.replace(phoneRegex, () => {
    redactionsCount++;
    return '[TELEFONO_ANONIMIZZATO]';
  });

  // 5. Redact P.IVA / Partita IVA (11 digits)
  const pivaRegex = /(?:P\.?\s*IVA|Partita\s*IVA|C\.?\s*F\.?\s*\/\s*P\.?\s*IVA)\s*[:=]?\s*[0-9]{11}/gi;
  text = text.replace(pivaRegex, () => {
    redactionsCount++;
    return '[PARTITA_IVA_ANONIMIZZATA]';
  });

  // 6. Redact Specific Surname if provided by user
  if (userSurname && userSurname.trim().length > 1) {
    const escapedSurname = userSurname.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const surnameRegex = new RegExp(escapedSurname, 'gi');
    text = text.replace(surnameRegex, () => {
      redactionsCount++;
      return '[COGNOME_DIPENDENTE_ANONIMO]';
    });
  }

  // 7. Redact Specific Company Name if provided by user
  if (companyName && companyName.trim().length > 1) {
    const escapedCompany = companyName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const compRegex = new RegExp(escapedCompany, 'gi');
    text = text.replace(compRegex, () => {
      redactionsCount++;
      return '[AZIENDA_ANONIMA]';
    });
  }

  // 8. Redact Explicit Name & Surname Labeled fields
  const employeeLabelRegex = /(?:Cognome\s*(?:e|&|\/)\s*Nome|Nome\s*(?:e|&|\/)\s*Cognome|Dipendente|Lavoratore|Spett\.le|Intestatario|Spett\.mo)\s*[:=]?\s*([A-ZÀ-Úa-zà-ú']+(?:\s+[A-ZÀ-Úa-zà-ú']+){1,3})/gi;
  text = text.replace(employeeLabelRegex, (match, p1) => {
    redactionsCount++;
    return match.replace(p1, '[NOME_DIPENDENTE_ANONIMO]');
  });

  // 9. Redact Birth data (Nato a Roma il 15/05/1990)
  const birthRegex = /(?:Nato\s*a|Nata\s*a|Luogo\s+(?:e\s+data\s+)?di\s+Nascita|Data\s+di\s+Nascita)\s*[:=]?\s*[^,\n\r]+(?:\s*(?:il|del)?\s*[0-9]{1,2}[\/\.-][0-9]{1,2}[\/\.-][0-9]{2,4})?/gi;
  text = text.replace(birthRegex, () => {
    redactionsCount++;
    return '[NASCITA_ANONIMIZZATA]';
  });

  // 10. Redact Addresses (Via Roma 12, CAP 00100 Roma)
  const addressPatterns = [
    /(?:Via|Viale|Piazza|Corso|Largo|Vicolo|Strada|Frazione)\s+[A-ZÀ-Úa-zà-ú0-9\s,\.'\/-]{4,40}(?:\s*,?\s*n?\.?\s*\d+)?/gi,
    /\b[0-9]{5}\b\s+[A-ZÀ-Úa-zà-ú'\s]{3,25}(?:\s*\([A-Z]{2}\))?/g,
  ];

  addressPatterns.forEach((regex) => {
    text = text.replace(regex, () => {
      redactionsCount++;
      return '[INDIRIZZO_ANONIMIZZATO]';
    });
  });

  // 11. Redact Identifiers: Matricola, Badge, Posizione INPS, INAIL, Datore di Lavoro
  const IDPatterns = [
    { regex: /(?:Matricola|Badge|Cod\.?\s*Dip(?:endente)?|N°?\s*Dipendente|ID\s*Dipendente)\s*[:=]?\s*[A-Z0-9\/-]+/gi, replacement: 'Matricola: [N°_MATRICOLA_ANONIMO]' },
    { regex: /(?:Posizione\s*INPS|Codice\s*Azienda|Posizione\s*INAIL|PAT\s*INAIL)\s*[:=]?\s*[A-Z0-9\/-]+/gi, replacement: 'INPS/INAIL: [CODICE_ANONIMO]' },
    { regex: /(?:Azienda|Datore\s+di\s+lavoro|Ditta|Ragione\s+Sociale)\s*[:=]?\s*[A-Z0-9À-Úa-zà-ú\s,\.&'-]{3,35}/gi, replacement: 'Azienda: [AZIENDA_ANONIMA]' },
  ];

  IDPatterns.forEach(({ regex, replacement }) => {
    text = text.replace(regex, () => {
      redactionsCount++;
      return replacement;
    });
  });

  return { anonymizedText: text, redactionsCount };
}

// Complete Offline Italian Payslip Glossary
export const PAYSLIP_GLOSSARY_IT: GlossaryItem[] = [
  {
    key: 'irpef',
    name: 'IRPEF (Imposta sul Reddito delle Persone Fisiche)',
    category: 'tassazione',
    definition: 'È l’imposta progressiva sul reddito del lavoro dipendente versata allo Stato.',
    howItWorks: 'Si calcola a scaglioni sull’Imponibile Fiscale (dopo aver sottratto i contributi INPS dal lordo). Inizialmente viene calcolata l’IRPEF lorda, da cui si sottraggono poi le detrazioni per lavoro dipendente o familiari a carico.',
    example: 'Imponibile 1.800€ -> IRPEF lorda al 23% (fino a 28k/anno) = 414€. Sottratte le detrazioni lavoro, l’IRPEF netta diminuisce.',
    isTaxable: false,
  },
  {
    key: 'inps',
    name: 'Contributi IVS / INPS (Previdenza)',
    category: 'trattenute',
    definition: 'Quota trattenuta in busta paga per finanziare la pensione (IVS) e la disoccupazione/maternità.',
    howItWorks: 'A carico del lavoratore dipendente c’è di solito il 9,19% (o 9,49%) dell’Imponibile Previdenziale Lordo. Il restante ~23-30% è versato direttamente dal datore di lavoro.',
    example: 'Su un lordo di 2.000€, la trattenuta INPS dipendente è circa 183,80€.',
    isTaxable: false,
  },
  {
    key: 'tfr',
    name: 'TFR (Trattamento di Fine Rapporto)',
    category: 'diritti',
    definition: 'La "liquidazione" spettante a fine rapporto o accantonata nel fondo pensione.',
    howItWorks: 'Ogni mese il datore di lavoro accantona una quota pari a circa la retribuzione utile divisa per 13,5 (circa il 6,91% del lordo). Può rimanere in azienda o essere destinato a un Fondo Pensione integrativo.',
    example: 'Stipendio lordo 1.800€ -> Quota accantonata TFR del mese ≈ 125€.',
    isTaxable: false,
  },
  {
    key: 'indennita_notturna',
    name: 'Indennità Turno Notturno',
    category: 'competenze',
    definition: 'Maggiorazione retributiva riconosciuta per le ore lavorate nella fascia notturna (es. 22:00 - 06:00).',
    howItWorks: 'Viene calcolata come percentuale di maggiorazione sulla paga oraria base prevista dal CCNL (es. +15%, +25%, +30% o +50% se festivo notturno).',
    example: 'Paga base 12€/h. Maggiorazione Notturna +25% = 3€ extra all’ora per 8 ore notturne = 24€ extra.',
    isTaxable: true,
  },
  {
    key: 'indennita_festiva',
    name: 'Festività Lavorata / Domenicale',
    category: 'competenze',
    definition: 'Retribuzione o maggiorazione spettante per il lavoro svolto di domenica o in giorni festivi nazionali.',
    howItWorks: 'Prevede sia il compenso delle ore lavorate sia una percentuale di maggiorazione straordinario festivo prevista dal contratto collettivo.',
    example: 'Lavoro l’8 Dicembre o la Domenica di Pasqua: le ore sono pagate con maggiorazione festiva dal +30% al +50%.',
    isTaxable: true,
  },
  {
    key: 'rol_ex_festivita',
    name: 'ROL (Riduzione Orario di Lavoro) & Ex Festività',
    category: 'diritti',
    definition: 'Ore di permesso retribuito maturate ogni mese per compensare l’orario contrattuale o le festività soppresse.',
    howItWorks: 'Maturano ogni mese (es. 4-7 ore al mese). Vengono fruite a ore. Se non fruite entro la scadenza contrattuale (es. 12-24 mesi), vengono liquidate in denaro.',
    example: 'Maturatione mensile 5,33 ore. Se a fine anno non usate, vengono pagate con la normale retribuzione oraria.',
    isTaxable: true,
  },
  {
    key: 'ferie_godute_maturate',
    name: 'Ferie Maturate / Godute / Residue',
    category: 'diritti',
    definition: 'Il monte giorni/ore di riposo retribuito spettante per legge e da CCNL.',
    howItWorks: 'Di norma spettano 4 settimane all’anno (es. 20-26 giorni o 160-200 ore). Ogni mese maturano circa 2,16 giorni o 13,33 ore.',
    example: 'Ferie residue = (Residuo anno precedente + Maturato anno in corso) - Godute.',
    isTaxable: false,
  },
  {
    key: 'detrazioni_lavoro',
    name: 'Detrazioni per Lavoro Dipendente',
    category: 'competenze',
    definition: 'Sconto d’imposta fiscale applicato direttamente all’IRPEF per ridurre le tasse sulle buste paga medie/basse.',
    howItWorks: 'Dipende dal reddito lordo annuo presunto. Viene rapportata ai giorni di detrazione del mese (es. 30 o 31 giorni). Riduce l’IRPEF da versare.',
    example: 'IRPEF calcolata 350€ - Detrazione Lavoro 120€ = IRPEF effettiva trattenuta 230€.',
    isTaxable: false,
  },
  {
    key: 'conguaglio_irpef',
    name: 'Conguaglio Fiscale Fine Anno / Fine Rapporto',
    category: 'tassazione',
    definition: 'Ricalcolo definitivo di IRPEF e detrazioni eseguito di norma nella busta paga di Dicembre.',
    howItWorks: 'Il datore di lavoro confronta le imposte trattenute provvisoriamente durante l’anno con il reddito totale annuo effettivo. Può generare un credito (rimborso) o un debito (trattenuta).',
    example: 'Se hai pagato più IRPEF del dovuto durante l’anno, a Dicembre trovi una voce a credito (somma aggiunta al netto).',
    isTaxable: false,
  },
  {
    key: 'superminimo',
    name: 'Superminimo (Individuale o Assorbibile)',
    category: 'competenze',
    definition: 'Una somma integrativa negoziata nel contratto individuale in aggiunta alla paga base del CCNL.',
    howItWorks: 'Se è "assorbibile", quando aumenta la paga base per rinnovo CCNL, il superminimo si riduce di pari importo; se "non assorbibile", rimane fisso.',
    example: 'Paga base CCNL 1.500€ + Superminimo 200€ = Retribuzione lorda 1.700€.',
    isTaxable: true,
  },
  {
    key: 'addizionali',
    name: 'Addizionale Regionale e Comunale IRPEF',
    category: 'trattenute',
    definition: 'Imposte locali applicate sul reddito imponibile a favore della Regione e del Comune di residenza.',
    howItWorks: 'Vengono trattenute a rate (di solito in 9 o 11 rate mensili) sulla base del saldo dell’anno precedente e dell’acconto per l’anno in corso.',
    example: 'Trattenuta mensile Addizionale Regionale: ~15-25€ in base all’aliquota della tua regione.',
    isTaxable: false,
  },
  {
    key: 'trattenuta_sindacale',
    name: 'Trattenuta Sindacale / Quote Associazioni',
    category: 'trattenute',
    definition: 'Contributo volontario trattenuto per l’iscrizione a un sindacato (CGIL, CISL, UIL, ecc.).',
    howItWorks: 'Di norma è una percentuale (circa l’1%) sulla paga base o sull’imponibile previdenziale.',
    example: 'Su 1.600€ di paga base -> Trattenuta 16€/mese.',
    isTaxable: false,
  },
  {
    key: 'assegno_unico',
    name: 'Assegno Unico / ANF',
    category: 'competenze',
    definition: 'Sostegno economico per i figli a carico.',
    howItWorks: 'Dal 2022 l’Assegno Unico viene erogato direttamente dall’INPS sul conto corrente e di norma non passa più in busta paga, salvo casi specifici o arretrati ANF vecchi.',
    example: 'Erogato il 15-20 di ogni mese tramite bonifico diretto INPS.',
    isTaxable: false,
  },
];
