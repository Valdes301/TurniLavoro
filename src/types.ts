export type ShiftCategory = 
  | 'work'
  | 'ferie'
  | 'permesso'
  | 'congedo'
  | 'riposo'
  | 'straordinario'
  | 'malattia'
  | 'altro';

export type WeeklyDeficitCoverage = 
  | 'recupero_straordinari'
  | 'ferie'
  | 'permesso'
  | 'congedo'
  | 'malattia'
  | 'debito';

export interface DeficitCoverageSplit {
  recupero_straordinari: number;
  ferie: number;
  permesso: number;
  congedo: number;
  malattia: number;
  debito: number;
}

export interface WeekSummary {
  weekIndex: number;
  weekLabel: string;
  startDate: string; // YYYY-MM-DD (Monday)
  endDate: string; // YYYY-MM-DD (Sunday)
  workedHours: number;
  overtimeHours: number; // Gross overtime hours
  netOvertimeHours: number; // Net overtime after subtracting recupero_straordinari used
  ferieDays: number;
  permessoHours: number;
  weeklyGoal: number; // base weekly goal (e.g. 38)
  holidayCount: number; // number of national holidays in week
  holidayHoursReduction: number; // holidayCount * 6.5
  effectiveWeeklyGoal: number; // weeklyGoal - holidayHoursReduction (e.g. 31.5h for 1 holiday)
  deficitHours: number; // Math.max(0, effectiveWeeklyGoal - workedHours)
  deficitCoverage: WeeklyDeficitCoverage; // Primary or legacy single coverage
  deficitSplit: DeficitCoverageSplit; // Detailed breakdown of deficit coverage in hours
  deficitCoverageLabel: string;
  percentGoal: number;
  isCurrentWeek: boolean;
  shifts: Shift[];
}

export interface Shift {
  id: string;
  date: string; // YYYY-MM-DD
  type: string; // e.g. "Mattina", "Pomeriggio", "Notte", "Ferie", "Riposo", etc.
  category: ShiftCategory;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  breakMinutes: number;
  workedHours: number; // total calculated or set
  overtimeHours: number; // overtime portion
  isNight: boolean;
  isHoliday: boolean;
  location?: string;
  notes?: string;
  color?: string;
}

export interface ShiftPreset {
  id: string;
  name: string;
  code: string; // e.g., "M", "P", "N", "F", "R"
  category: ShiftCategory;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  color: string;
}

export interface ContractSettings {
  weeklyHoursGoal: number; // e.g. 38 or 40
  dailyStandardHours: number; // e.g. 8
  monthlyHoursGoal: number; // e.g. 160
  overtimeThresholdDaily: number; // e.g. 8
  hourlyRate: number; // base hourly rate (€/h)
  overtimeMultiplier: number; // e.g. 1.25 for +25% day overtime
  overtimeNightMultiplier?: number; // e.g. 1.40 for +40% night overtime
  sundayHolidayMultiplier?: number; // e.g. 1.30 for +30% Sunday/Holiday extra pay
  nightShiftMultiplier?: number; // e.g. 1.20 for +20% ordinary night shift
  estimatedTaxRatePct?: number; // e.g. 23 (%) IRPEF
  estimatedInpsRatePct?: number; // e.g. 9.19 (%) INPS
  nightStart: string; // "22:00"
  nightEnd: string; // "06:00"
}

export interface VacationSettings {
  annualAccruedDays: number; // Ferie spettanti all'anno (es. 26)
  initialCarriedOverDays: number; // Ferie residue anni precedenti
  rolHoursTotal: number; // Permessi ROL / Ex-Festività spettanti in ore
  rolHoursCarriedOver: number; // Permessi ROL residui anni precedenti
  congedoParentaleMaxDays?: number; // Limite di legge (default 180 giorni = 6 mesi per genitore)
  congedoParentalePayRatePct?: number; // Percentuale di retribuzione (default 30%)
  congedoParentaleDaysUsedPreviously?: number; // Giorni già usufruiti in precedenza
  congedoParentaleChildAgeYears?: number; // Età del bambino (default < 12 anni)
}

export interface ExtractedShiftCandidate {
  date: string; // YYYY-MM-DD
  type: string;
  category: ShiftCategory;
  startTime: string;
  endTime: string;
  breakMinutes?: number;
  location?: string;
  notes?: string;
}

export interface ParseResult {
  success: boolean;
  monthDetected?: string; // YYYY-MM
  shifts: ExtractedShiftCandidate[];
  summaryNote?: string;
  error?: string;
}

export interface DiskStorageStats {
  dbFilePath: string;
  dbFileSize: number;
  dbFileSizeFormatted: string;
  dataFolderSize: number;
  dataFolderSizeFormatted: string;
  totalShifts: number;
  totalPresets: number;
  hasContract: boolean;
  hasVacation: boolean;
  lastUpdated: string;
  memoryUsage: {
    rss: number;
    rssFormatted: string;
    heapUsed: number;
    heapUsedFormatted: string;
    heapTotal: number;
    heapTotalFormatted: string;
  };
  diskInfo: {
    totalBytes?: number;
    totalFormatted: string;
    freeBytes?: number;
    freeFormatted: string;
    usedBytes?: number;
    usedFormatted: string;
    usedPercentage: number;
  };
}

export type ViewMode = 'calendar' | 'table' | 'upload' | 'stats' | 'ferie' | 'payslip' | 'reports' | 'settings' | 'docker';

export interface PayslipItemExplanation {
  codeOrName: string;
  category: 'competenze' | 'trattenute' | 'riepilogo' | 'tassazione' | 'altro';
  amount?: number;
  quantity?: number;
  plainItalianMeaning: string;
  howItIsCalculated: string;
  isTaxable: boolean;
  userAdvice: string;
}

export interface SavedPayslipRecord {
  id: string; // e.g. "2026-06"
  monthIso: string; // YYYY-MM
  grossAmount: number;
  netAmount: number;
  workedHours: number;
  overtimeHours: number;
  ferieDays: number;
  permessiHours: number;
  congedoHours?: number;
  hourlyRate?: number;
  irpefTax?: number;
  inpsDeduction?: number;
  tfrAccrued?: number;
  ferieResidueDays?: number;
  permessiResiduiHours?: number;
  generalSummary?: string;
  analysisResult?: PayslipAnalysisResult;
  savedAt: string;
}

export interface PayslipAnalysisResult {
  monthYear?: string;
  grossAmount?: number;
  netAmount?: number;
  totalWorkedHoursReported?: number;
  overtimeHoursReported?: number;
  nightHoursReported?: number;
  holidayHoursReported?: number;
  items: PayslipItemExplanation[];
  discrepanciesWithAppShifts?: {
    field: string;
    appValue: number;
    payslipValue: number;
    difference: number;
    note: string;
  }[];
  generalSummary: string;
}

