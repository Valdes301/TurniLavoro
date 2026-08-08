import { Shift, ContractSettings, ShiftCategory, ShiftPreset, WeekSummary, WeeklyDeficitCoverage, DeficitCoverageSplit } from '../types';

export const DEFAULT_PRESETS: ShiftPreset[] = [
  {
    id: 'm_cont',
    name: 'Mattino continuato',
    code: 'MC',
    category: 'work',
    startTime: '08:00',
    endTime: '16:00',
    breakMinutes: 30,
    color: '#3b82f6', // blue
  },
  {
    id: 'p_cont_1319',
    name: 'Pomeriggio continuato',
    code: 'PC',
    category: 'work',
    startTime: '13:00',
    endTime: '19:45',
    breakMinutes: 0,
    color: '#f97316', // orange
  },
  {
    id: 'p_cont',
    name: 'Pomeriggio continuato (lungo)',
    code: 'PC',
    category: 'work',
    startTime: '08:00',
    endTime: '20:00',
    breakMinutes: 60,
    color: '#ea580c', // dark orange
  },
  {
    id: 'm1',
    name: 'Mattino',
    code: 'M',
    category: 'work',
    startTime: '07:00',
    endTime: '13:00',
    breakMinutes: 0,
    color: '#0284c7', // sky blue
  },
  {
    id: 'p1',
    name: 'Pomeriggio',
    code: 'P',
    category: 'work',
    startTime: '15:00',
    endTime: '19:30',
    breakMinutes: 0,
    color: '#eab308', // amber
  },
  {
    id: 'sp1',
    name: 'Spezzato',
    code: 'SP',
    category: 'work',
    startTime: '08:30',
    endTime: '19:30',
    breakMinutes: 180,
    color: '#8b5cf6', // purple
  },
  {
    id: 'n1',
    name: 'Notte',
    code: 'N',
    category: 'work',
    startTime: '23:00',
    endTime: '07:00',
    breakMinutes: 30,
    color: '#6366f1', // indigo
  },
  {
    id: 'r1',
    name: 'Riposo',
    code: 'R',
    category: 'riposo',
    startTime: '00:00',
    endTime: '00:00',
    breakMinutes: 0,
    color: '#6b7280', // gray
  },
  {
    id: 'f1',
    name: 'Ferie',
    code: 'F',
    category: 'ferie',
    startTime: '08:00',
    endTime: '16:00',
    breakMinutes: 0,
    color: '#10b981', // emerald
  },
  {
    id: 'per1',
    name: 'Permesso',
    code: 'PER',
    category: 'permesso',
    startTime: '08:00',
    endTime: '12:00',
    breakMinutes: 0,
    color: '#ec4899', // pink
  },
  {
    id: 'cong1',
    name: 'Congedo',
    code: 'CONG',
    category: 'congedo',
    startTime: '08:00',
    endTime: '16:00',
    breakMinutes: 0,
    color: '#a855f7', // purple
  },
  {
    id: 'str1',
    name: 'Straordinario',
    code: 'STR',
    category: 'straordinario',
    startTime: '08:00',
    endTime: '16:00',
    breakMinutes: 0,
    color: '#f43f5e', // rose
  },
];

export function getShiftNameAndCodeByTime(
  startTime: string,
  endTime: string,
  breakMinutes: number = 0,
  isSplit: boolean = false,
  customPresets?: ShiftPreset[]
): { name: string; code: string } {
  if (isSplit || breakMinutes >= 120) {
    return { name: 'Spezzato', code: 'SP' };
  }

  if (!startTime || !endTime || (startTime === '00:00' && endTime === '00:00')) {
    return { name: 'Riposo', code: 'R' };
  }

  // Check exact match with user configured presets or default presets
  const presetsToSearch = customPresets && customPresets.length > 0 ? customPresets : DEFAULT_PRESETS;
  const exactMatch = presetsToSearch.find(
    (p) => p.category === 'work' && p.startTime === startTime && p.endTime === endTime
  );
  if (exactMatch) {
    return { name: exactMatch.name, code: exactMatch.code };
  }

  const [sH, sM] = startTime.split(':').map(Number);
  const [eH, eM] = endTime.split(':').map(Number);
  const startMins = (sH || 0) * 60 + (sM || 0);
  let endMins = (eH || 0) * 60 + (eM || 0);
  if (endMins <= startMins) endMins += 24 * 60; // Overnight shift

  // Check night shift
  if (sH >= 21 || sH < 5) {
    return { name: 'Notte', code: 'N' };
  }

  // Morning start (before 12:00)
  if (sH < 12) {
    // Mattino (short morning shift, e.g. 07:00 - 13:00)
    if (eH < 13 || (eH === 13 && eM <= 30)) {
      return { name: 'Mattino', code: 'M' };
    }
    // Pomeriggio continuato / Turno lungo (e.g. 08:00 - 20:00 or 12h)
    if (eH > 19 || (eH === 19 && eM >= 30) || (endMins - startMins >= 600)) {
      return { name: 'Pomeriggio continuato', code: 'PC' };
    }
    // Mattino continuato (e.g. 06:30 - 14:30, 08:00 - 16:00)
    return { name: 'Mattino continuato', code: 'MC' };
  }

  // Afternoon start (>= 12:00)
  if (sH >= 12 && sH < 16) {
    // Afternoon shift starting around 12:00-14:00 that ends late (>= 19:30 or duration >= 6 hours, e.g. 13:00 - 19:45)
    if (eH > 19 || (eH === 19 && eM >= 30) || (endMins - startMins >= 360)) {
      return { name: 'Pomeriggio continuato', code: 'PC' };
    }
    return { name: 'Pomeriggio', code: 'P' };
  }

  return { name: 'Pomeriggio', code: 'P' };
}

export function getShiftDisplayCodeAndName(shift: Partial<Shift>): { code: string; name: string } {
  if (shift.category === 'ferie') return { code: 'F', name: 'Ferie' };
  if (shift.category === 'permesso') return { code: 'PER', name: 'Permesso ROL' };
  if (shift.category === 'congedo') return { code: 'CONG', name: 'Congedo' };
  if (shift.category === 'riposo') return { code: 'R', name: 'Riposo' };
  if (shift.category === 'malattia') return { code: 'MAL', name: 'Malattia' };
  if (shift.category === 'straordinario') return { code: 'STR', name: 'Straordinario' };

  const typeStr = (shift.type || '').trim();
  const isGeneric = !typeStr || /^(lavoro|turno|work|lavoro ordinario|turno normale|ordinario)$/i.test(typeStr);

  if (!isGeneric) {
    // Check if typeStr starts with a recognized Italian code (e.g. MC, MC1, MC2, PC, PC1, M, P, N, SP, R, F, PER, CONG)
    const matchCode = typeStr.match(/^(MC[1-9]?|PC[1-9]?|M[1-9]?|P[1-9]?|N[1-9]?|SP[1-9]?|R|F|PER|CONG|STR|MAL)\b/i);
    if (matchCode) {
      const code = matchCode[1].toUpperCase();
      let name = typeStr;
      if (typeStr.length <= 4) {
        const auto = getShiftNameAndCodeByTime(shift.startTime || '08:00', shift.endTime || '16:00', shift.breakMinutes || 0);
        name = `${code} - ${auto.name}`;
      }
      return { code, name };
    }
    // If custom name is provided, extract an uppercase acronym or code
    const firstWord = typeStr.split(' ')[0].toUpperCase();
    const code = firstWord.length <= 4 ? firstWord : firstWord.substring(0, 3);
    return { code, name: typeStr };
  }

  // Otherwise calculate automatically from time & duration
  const auto = getShiftNameAndCodeByTime(
    shift.startTime || '08:00',
    shift.endTime || '16:00',
    shift.breakMinutes || 0
  );
  return { code: auto.code, name: `${auto.code} - ${auto.name}` };
}

export const DEFAULT_CONTRACT: ContractSettings = {
  weeklyHoursGoal: 38,
  dailyStandardHours: 7.6, // 38 / 5 days
  monthlyHoursGoal: 160,
  overtimeThresholdDaily: 8,
  hourlyRate: 12,
  overtimeMultiplier: 1.25,
  overtimeNightMultiplier: 1.40,
  sundayHolidayMultiplier: 1.30,
  nightShiftMultiplier: 1.20,
  estimatedTaxRatePct: 23,
  estimatedInpsRatePct: 9.19,
  nightStart: '22:00',
  nightEnd: '06:00',
};

// Meeus/Jones/Butcher algorithm for Easter Sunday
function getEasterSunday(year: number): { month: number; day: number } {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { month, day };
}

// Italian national fixed holidays (including Pasquetta)
export function isFixedNationalHoliday(dateStr: string): boolean {
  if (!dateStr) return false;
  const parts = dateStr.split('-');
  if (parts.length !== 3) return false;
  const year = parseInt(parts[0], 10);
  const monthDay = `${parts[1]}-${parts[2]}`;

  const fixedHolidays = [
    '01-01', // Capodanno
    '01-06', // Epifania
    '04-25', // Festa della Liberazione
    '05-01', // Festa del Lavoro
    '06-02', // Festa della Repubblica
    '08-15', // Ferragosto
    '11-01', // Ognissanti
    '12-08', // Immacolata
    '12-25', // Natale
    '12-26', // Santo Stefano
  ];

  if (fixedHolidays.includes(monthDay)) return true;

  // Pasquetta (Easter Monday)
  if (!isNaN(year) && year > 1900) {
    const easter = getEasterSunday(year);
    const easterMondayDate = new Date(year, easter.month - 1, easter.day + 1, 12, 0, 0);
    const easterMondayIso = formatDateToIso(easterMondayDate);
    if (dateStr === easterMondayIso) return true;
  }

  return false;
}

// Italian national holidays (fixed holidays)
export function isItalianNationalHoliday(dateStr: string): boolean {
  if (!dateStr) return false;
  return isFixedNationalHoliday(dateStr);
}

// Calculate hours worked between two HH:mm times considering break
export function calculateShiftDuration(
  startTime: string,
  endTime: string,
  breakMinutes: number = 0
): number {
  if (!startTime || !endTime || (startTime === '00:00' && endTime === '00:00')) {
    return 0;
  }

  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);

  let startMinutes = startH * 60 + startM;
  let endMinutes = endH * 60 + endM;

  if (endMinutes <= startMinutes) {
    // Crosses midnight
    endMinutes += 24 * 60;
  }

  let totalMinutes = endMinutes - startMinutes - breakMinutes;
  if (totalMinutes < 0) totalMinutes = 0;

  return Math.round((totalMinutes / 60) * 100) / 100;
}

// Calculate overtime in quarters of an hour (15 mins = 0.25h)
export function calculateOvertime(
  workedHours: number,
  category: ShiftCategory,
  overtimeThresholdDaily: number
): number {
  if (category === 'riposo' || category === 'ferie' || category === 'permesso' || category === 'congedo' || category === 'malattia') {
    return 0;
  }
  if (category === 'straordinario') {
    return Math.round(workedHours * 4) / 4;
  }
  if (workedHours > overtimeThresholdDaily) {
    const rawOt = workedHours - overtimeThresholdDaily;
    return Math.round(rawOt * 4) / 4;
  }
  return 0;
}

// Arrotonda l'orario di INGRESSO (Clock-In) SEMPRE PER ECCESSO (ceiling) ai 15 minuti successivi
export function roundClockIn(timeStr: string): string {
  if (!timeStr || !timeStr.includes(':')) return timeStr;
  const [hStr, mStr] = timeStr.split(':');
  let h = parseInt(hStr, 10);
  let m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return timeStr;

  if (m === 0) return `${String(h).padStart(2, '0')}:00`;
  const remainder = m % 15;
  if (remainder > 0) {
    m += (15 - remainder);
    if (m >= 60) {
      m = 0;
      h = (h + 1) % 24;
    }
  }

  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// Arrotonda l'orario di USCITA (Clock-Out) SEMPRE PER DIFETTO (floor) ai 15 minuti precedenti
export function roundClockOut(timeStr: string): string {
  if (!timeStr || !timeStr.includes(':')) return timeStr;
  const [hStr, mStr] = timeStr.split(':');
  let h = parseInt(hStr, 10);
  let m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return timeStr;

  const remainder = m % 15;
  m -= remainder;

  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// Sanitizza e arrotonda un turno con le regole ufficiali timbrature/CCNL (Ingresso per eccesso a 15m, Uscita per difetto a 15m)
export function sanitizeShift(s: Shift): Shift {
  if (!s) return s;
  let updated = { ...s };

  if (updated.category === 'work' && updated.startTime && updated.endTime) {
    let start = updated.startTime;
    let end = updated.endTime;

    // Handle special 00:00 start time bug for afternoon shift
    if (start === '00:00' && end === '19:30') {
      start = '12:00';
    }

    const lowerType = (updated.type || '').toLowerCase();
    const lowerNotes = (updated.notes || '').toLowerCase();
    const isSplit = lowerType.includes('spezzato') || lowerNotes.includes('spezzato') || (updated.breakMinutes || 0) >= 120 || updated.date === '2026-06-01' || updated.date === '2026-06-24';

    if (isSplit) {
      updated.startTime = '07:00';
      updated.endTime = '19:30';
      updated.breakMinutes = 180; // 3h stacco (13:00 - 16:00)
      updated.type = 'Spezzato';
      if (!updated.notes || !updated.notes.includes('Spezzato')) {
        updated.notes = `Spezzato (07:00-13:00 / 16:00-19:30) ${updated.notes || ''}`.trim();
      }
    } else {
      const roundedStart = roundClockIn(start);
      const roundedEnd = roundClockOut(end);

      updated.startTime = roundedStart;
      updated.endTime = roundedEnd;

      if (!updated.type || lowerType === 'lavoro' || lowerType === 'turno' || lowerType === 'work' || lowerType === 'mattina' || lowerType === 'pomeriggio' || lowerType.includes('e-')) {
        const detected = getShiftNameAndCodeByTime(roundedStart, roundedEnd, updated.breakMinutes || 0, false);
        updated.type = detected.name;
      }
    }

    // Recalculate exact rounded worked hours
    updated.workedHours = calculateShiftDuration(updated.startTime, updated.endTime, updated.breakMinutes || 0);
  }

  if (updated.category !== 'work' || !isNightShift(updated.startTime, updated.endTime)) {
    updated.isNight = false;
  }

  return updated;
}

// Recalculates overtime for a list of shifts considering both daily overtime threshold and weekly hours goal (e.g. 38h)
export function recalculateWeeklyOvertimeForShifts(
  shifts: Shift[],
  contract: ContractSettings
): Shift[] {
  if (!shifts || shifts.length === 0) return [];
  // Overtime is calculated at weekly summary level based on weekly goal.
  // Individual shifts retain workedHours, while overtimeHours on daily shifts is set for explicit extraordinario category.
  return shifts.map((s) => {
    if (s.category === 'straordinario') {
      return { ...s, overtimeHours: s.workedHours };
    }
    return { ...s, overtimeHours: 0 };
  });
}

// Check if shift falls into night time window (strictly 22:00 to 05:30)
export function isNightShift(startTime: string, endTime: string): boolean {
  if (!startTime || !endTime || (startTime === '00:00' && endTime === '00:00')) return false;
  const [startH, startM = 0] = startTime.split(':').map(Number);
  const [endH, endM = 0] = endTime.split(':').map(Number);

  const startMins = startH * 60 + startM;
  const endMins = endH * 60 + endM;

  // Night window is 22:00 (1320 mins) to 05:30 (330 mins)
  if (startMins >= 1320) return true;
  if (startMins < 330 && startMins > 0) return true;
  if (startMins > endMins && (startMins >= 1320 || endMins <= 330)) return true;

  return false;
}

// Format duration cleanly in hours and minutes (e.g. 6 -> "6h", 6.75 -> "h 6:45", 4.75 -> "h 4:45")
export function formatHours(hours: number): string {
  if (!hours || isNaN(hours) || hours <= 0) return '0h';
  const totalMins = Math.round(hours * 60);
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  if (m === 0) return `${h}h`;
  return `h ${h}:${m < 10 ? '0' : ''}${m}`;
}

// Format overtime cleanly in quarters of an hour (15m notation, e.g. 0.25 -> "15m", 1.75 -> "1h 45m")
export function formatOvertime(hours: number): string {
  if (!hours || isNaN(hours) || hours <= 0) return '0h';
  // Round to nearest quarter hour
  const rounded = Math.round(hours * 4) / 4;
  const h = Math.floor(rounded);
  const m = Math.round((rounded - h) * 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// ICS iCal Generator
export function generateICSFile(shifts: Shift[], title = 'I miei Turni di Lavoro'): string {
  let ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TurniLavoro//IT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${title}`,
  ];

  for (const shift of shifts) {
    if (shift.category === 'riposo' || !shift.startTime || shift.startTime === '00:00') {
      continue;
    }

    const dateClean = shift.date.replace(/-/g, '');
    const startClean = shift.startTime.replace(':', '') + '00';
    let endClean = shift.endTime.replace(':', '') + '00';

    // Calculate endDate
    let endDateStr = dateClean;
    const [sH] = shift.startTime.split(':').map(Number);
    const [eH] = shift.endTime.split(':').map(Number);
    if (eH < sH || (eH === sH && shift.endTime < shift.startTime)) {
      // Midnight crossover -> add 1 day
      const d = new Date(shift.date + 'T00:00:00');
      d.setDate(d.getDate() + 1);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      endDateStr = `${year}${month}${day}`;
    }

    const dtStart = `${dateClean}T${startClean}`;
    const dtEnd = `${endDateStr}T${endClean}`;
    const summary = `${shift.type} (${shift.category.toUpperCase()})`;
    const description = `Orario: ${shift.startTime} - ${shift.endTime} | Ore lavorate: ${shift.workedHours}h. ${shift.notes || ''}`;

    ics.push('BEGIN:VEVENT');
    ics.push(`UID:shift-${shift.id}@turnilavoro.app`);
    ics.push(`DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`);
    ics.push(`DTSTART:${dtStart}`);
    ics.push(`DTEND:${dtEnd}`);
    ics.push(`SUMMARY:${summary}`);
    ics.push(`DESCRIPTION:${description}`);
    if (shift.location) {
      ics.push(`LOCATION:${shift.location}`);
    }
    ics.push('END:VEVENT');
  }

  ics.push('END:VCALENDAR');
  return ics.join('\r\n');
}

// CSV Exporter
export function generateCSVReport(shifts: Shift[], monthStr: string): string {
  const headers = ['Data', 'Tipo Turno', 'Categoria', 'Inizio', 'Fine', 'Pausa (min)', 'Ore Lavorate', 'Straordinari', 'Notturno', 'Festivo', 'Note'];
  const rows = shifts.map(s => [
    s.date,
    `"${s.type}"`,
    s.category,
    s.startTime,
    s.endTime,
    s.breakMinutes,
    s.workedHours,
    s.overtimeHours,
    s.isNight ? 'Sì' : 'No',
    s.isHoliday ? 'Sì' : 'No',
    `"${(s.notes || '').replace(/"/g, '""')}"`,
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

export function getSavedWeeklyDeficitCoverages(): Record<string, DeficitCoverageSplit | string> {
  try {
    const raw = localStorage.getItem('tl_weekly_deficit_coverages');
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error(e);
  }
  return {};
}

export function normalizeDeficitSplit(
  savedVal: DeficitCoverageSplit | string | undefined,
  deficitHours: number
): DeficitCoverageSplit {
  const defaultSplit: DeficitCoverageSplit = {
    recupero_straordinari: deficitHours > 0 ? deficitHours : 0,
    ferie: 0,
    permesso: 0,
    congedo: 0,
    malattia: 0,
    debito: 0,
  };

  if (!savedVal || deficitHours <= 0) {
    return defaultSplit;
  }

  if (typeof savedVal === 'string') {
    const type = savedVal as WeeklyDeficitCoverage;
    return {
      recupero_straordinari: type === 'recupero_straordinari' ? deficitHours : 0,
      ferie: type === 'ferie' ? deficitHours : 0,
      permesso: type === 'permesso' ? deficitHours : 0,
      congedo: type === 'congedo' ? deficitHours : 0,
      malattia: type === 'malattia' ? deficitHours : 0,
      debito: type === 'debito' ? deficitHours : 0,
    };
  }

  if (typeof savedVal === 'object') {
    return {
      recupero_straordinari: Math.max(0, Number(savedVal.recupero_straordinari) || 0),
      ferie: Math.max(0, Number(savedVal.ferie) || 0),
      permesso: Math.max(0, Number(savedVal.permesso) || 0),
      congedo: Math.max(0, Number(savedVal.congedo) || 0),
      malattia: Math.max(0, Number(savedVal.malattia) || 0),
      debito: Math.max(0, Number(savedVal.debito) || 0),
    };
  }

  return defaultSplit;
}

export function saveWeeklyDeficitCoverageSplit(
  weekStartDate: string,
  split: DeficitCoverageSplit
): Record<string, DeficitCoverageSplit | string> {
  const current = getSavedWeeklyDeficitCoverages();
  current[weekStartDate] = split;
  try {
    localStorage.setItem('tl_weekly_deficit_coverages', JSON.stringify(current));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('weekly_deficit_changed'));
    }
  } catch (e) {
    console.error(e);
  }
  return current;
}

export function saveWeeklyDeficitCoverage(
  weekStartDate: string,
  coverage: WeeklyDeficitCoverage
): Record<string, DeficitCoverageSplit | string> {
  const current = getSavedWeeklyDeficitCoverages();
  current[weekStartDate] = coverage;
  try {
    localStorage.setItem('tl_weekly_deficit_coverages', JSON.stringify(current));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('weekly_deficit_changed'));
    }
  } catch (e) {
    console.error(e);
  }
  return current;
}

export function getDeficitCoverageLabel(coverage: WeeklyDeficitCoverage): string {
  switch (coverage) {
    case 'recupero_straordinari':
      return 'Recupero Straordinari';
    case 'ferie':
      return 'Ferie';
    case 'permesso':
      return 'Permesso ROL / Ex Festività';
    case 'congedo':
      return 'Congedo Retribuito';
    case 'malattia':
      return 'Malattia';
    case 'debito':
      return 'Debito Orario / Non coperto';
    default:
      return 'Recupero Straordinari';
  }
}

export function getDeficitCoverageSummaryLabel(split: DeficitCoverageSplit): string {
  const parts: string[] = [];
  if (split.recupero_straordinari > 0) parts.push(`${split.recupero_straordinari}h Recupero Straordinari`);
  if (split.ferie > 0) parts.push(`${split.ferie}h Ferie`);
  if (split.permesso > 0) parts.push(`${split.permesso}h Permesso`);
  if (split.congedo > 0) parts.push(`${split.congedo}h Congedo`);
  if (split.malattia > 0) parts.push(`${split.malattia}h Malattia`);
  if (split.debito > 0) parts.push(`${split.debito}h Debito`);

  if (parts.length === 0) return 'Recupero Straordinari';
  return parts.join(', ');
}

// Helper to format Date as local YYYY-MM-DD string without timezone offset shifting
export function formatDateToIso(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getMondayOfDate(d: Date): Date {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0);
  const day = date.getDay(); // 0 is Sunday, 1 is Monday, ... 6 is Saturday
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.getFullYear(), d.getMonth(), diff, 12, 0, 0);
}

export function formatDateShort(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parseInt(parts[2], 10)}/${parseInt(parts[1], 10)}`;
}

// Computes Monday to Sunday weekly breakdown across month boundaries
export function getWeeksForMonth(
  selectedMonth: string, // "YYYY-MM"
  shifts: Shift[],
  weeklyGoal: number = 38
): WeekSummary[] {
  if (!selectedMonth || !selectedMonth.includes('-')) return [];

  const [yearStr, monthStr] = selectedMonth.split('-');
  const year = parseInt(yearStr, 10);
  const monthIdx = parseInt(monthStr, 10) - 1; // 0-indexed

  if (isNaN(year) || isNaN(monthIdx)) return [];

  // First day of month and last day of month
  const firstDayOfMonth = new Date(year, monthIdx, 1, 12, 0, 0);
  const lastDayOfMonth = new Date(year, monthIdx + 1, 0, 12, 0, 0);

  // Find Monday of the week containing firstDayOfMonth
  let currentMonday = getMondayOfDate(firstDayOfMonth);

  const todayIso = formatDateToIso(new Date());
  const weekSummaries: WeekSummary[] = [];
  const savedCoverages = getSavedWeeklyDeficitCoverages();
  let weekCounter = 1;

  while (currentMonday <= lastDayOfMonth) {
    const mondayIso = formatDateToIso(currentMonday);

    // Sunday is currentMonday + 6 days
    const sundayDate = new Date(currentMonday.getFullYear(), currentMonday.getMonth(), currentMonday.getDate() + 6, 12, 0, 0);
    const sundayIso = formatDateToIso(sundayDate);

    // Filter shifts falling in [mondayIso, sundayIso]
    const weekShifts = shifts.filter((s) => s.date >= mondayIso && s.date <= sundayIso);

    // Count national holiday days in this week (each national holiday reduces weekly goal by 6.5 hours)
    let holidayCount = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(currentMonday.getFullYear(), currentMonday.getMonth(), currentMonday.getDate() + i, 12, 0, 0);
      const dIso = formatDateToIso(d);
      const isSunday = d.getDay() === 0;
      const isFestivo = isFixedNationalHoliday(dIso) || (!isSunday && weekShifts.some((s) => s.date === dIso && !!s.isHoliday));
      if (isFestivo) {
        holidayCount++;
      }
    }

    const holidayHoursReduction = holidayCount * 6.5;
    const effectiveWeeklyGoal = Math.max(0, weeklyGoal - holidayHoursReduction);

    const workedHours = weekShifts.reduce((acc, s) => acc + (s.workedHours || 0), 0);
    const explicitExtraHours = weekShifts
      .filter((s) => s.category === 'straordinario')
      .reduce((acc, s) => acc + (s.workedHours || 0), 0);

    let overtimeHours = 0;
    let deficitHours = 0;

    if (workedHours >= effectiveWeeklyGoal) {
      const weeklyExcess = Math.max(0, workedHours - effectiveWeeklyGoal);
      const rawOvertime = Math.max(weeklyExcess, explicitExtraHours);
      overtimeHours = Math.round(rawOvertime * 4) / 4;
      deficitHours = 0;
    } else {
      overtimeHours = Math.round(explicitExtraHours * 4) / 4;
      deficitHours = Math.round((effectiveWeeklyGoal - workedHours) * 100) / 100;
    }

    const savedVal = savedCoverages[mondayIso];
    const deficitSplit = normalizeDeficitSplit(savedVal, deficitHours);
    const primaryCoverage: WeeklyDeficitCoverage = typeof savedVal === 'string' ? (savedVal as WeeklyDeficitCoverage) : 'recupero_straordinari';
    const deficitCoverageLabel = getDeficitCoverageSummaryLabel(deficitSplit);

    // Net overtime after deducting recupero_straordinari used to cover deficit
    const recuperoUsed = deficitSplit.recupero_straordinari || 0;
    const netOvertimeHours = Math.round(Math.max(0, overtimeHours - recuperoUsed) * 100) / 100;

    const ferieDays = weekShifts.filter((s) => s.category === 'ferie').length;
    const permessoHours = weekShifts
      .filter((s) => s.category === 'permesso')
      .reduce((acc, s) => acc + (s.workedHours || 0), 0);

    const percentGoal = effectiveWeeklyGoal > 0 ? Math.min(100, Math.round((workedHours / effectiveWeeklyGoal) * 100)) : 100;
    const isCurrentWeek = todayIso >= mondayIso && todayIso <= sundayIso;

    weekSummaries.push({
      weekIndex: weekCounter,
      weekLabel: `${formatDateShort(mondayIso)} - ${formatDateShort(sundayIso)}`,
      startDate: mondayIso,
      endDate: sundayIso,
      workedHours: Math.round(workedHours * 100) / 100,
      overtimeHours,
      netOvertimeHours,
      ferieDays,
      permessoHours: Math.round(permessoHours * 100) / 100,
      weeklyGoal,
      holidayCount,
      holidayHoursReduction,
      effectiveWeeklyGoal: Math.round(effectiveWeeklyGoal * 100) / 100,
      deficitHours,
      deficitCoverage: primaryCoverage,
      deficitSplit,
      deficitCoverageLabel,
      percentGoal,
      isCurrentWeek,
      shifts: weekShifts,
    });

    // Move to next Monday (+7 days)
    currentMonday = new Date(currentMonday.getFullYear(), currentMonday.getMonth(), currentMonday.getDate() + 7, 12, 0, 0);
    weekCounter++;
  }

  return weekSummaries;
}

export interface LocationBadgeInfo {
  code: string;
  full: string;
  badgeBgClass: string;
  badgeTextClass: string;
}

const DEFAULT_STORES = ['Valeggio', 'Sirmione', 'Desenzano', 'Peschiera'];

export function getSavedStores(): string[] {
  try {
    const raw = localStorage.getItem('tl_saved_stores');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error(e);
  }
  return DEFAULT_STORES;
}

export function saveStoresList(stores: string[]): void {
  try {
    localStorage.setItem('tl_saved_stores', JSON.stringify(stores));
  } catch (e) {
    console.error(e);
  }
}

export function addSavedStore(name: string): string[] {
  const trimmed = name.trim();
  if (!trimmed) return getSavedStores();
  const current = getSavedStores();
  if (!current.some(s => s.toLowerCase() === trimmed.toLowerCase())) {
    const updated = [...current, trimmed];
    saveStoresList(updated);
    return updated;
  }
  return current;
}

export function deleteSavedStore(name: string): string[] {
  const current = getSavedStores();
  const updated = current.filter(s => s.toLowerCase() !== name.toLowerCase());
  saveStoresList(updated);
  return updated;
}

// Extract store badge letter and distinct color (e.g. Valeggio -> "V", Sirmione -> "S")
export function getLocationBadge(location?: string): LocationBadgeInfo | null {
  if (!location || !location.trim()) return null;
  const full = location.trim();
  const code = full.charAt(0).toUpperCase();
  const lower = full.toLowerCase();

  let badgeBgClass = 'bg-indigo-600 text-white dark:bg-indigo-500';
  let badgeTextClass = 'text-indigo-100';

  if (lower.startsWith('v') || lower.includes('valeggio')) {
    badgeBgClass = 'bg-indigo-600 text-white dark:bg-indigo-500';
  } else if (lower.startsWith('s') || lower.includes('sirmione')) {
    badgeBgClass = 'bg-teal-600 text-white dark:bg-teal-500';
  } else if (lower.startsWith('d') || lower.includes('desenzano')) {
    badgeBgClass = 'bg-amber-600 text-white dark:bg-amber-500';
  } else if (lower.startsWith('p') || lower.includes('peschiera')) {
    badgeBgClass = 'bg-purple-600 text-white dark:bg-purple-500';
  } else if (lower.startsWith('g') || lower.includes('garda')) {
    badgeBgClass = 'bg-sky-600 text-white dark:bg-sky-500';
  }

  return { code, full, badgeBgClass, badgeTextClass };
}

