import { useState, useEffect, useMemo, useRef, type DragEvent, type ReactNode } from "react";
import QRCode from "qrcode";
import logoImg from "../imports/cancer-care-logo-high-res-PNG-1.png";
import {
  LayoutDashboard, Calendar, Users, FilePlus, FileText,
  LayoutTemplate, CreditCard, BarChart2, Microscope,
  BookOpen, Settings, LogOut, Menu, Bell, ChevronDown,
  Search, Plus, Filter, Download, Printer, Eye, EyeOff, Edit,
  Trash2, MoreVertical, ChevronLeft, ChevronRight,
  HelpCircle,
  Clock, CheckCircle, XCircle, AlertCircle,
  User, Activity, Pill, Stethoscope, Heart, Star,
  Copy, Share2, QrCode, MessageCircle,
  TrendingUp, TrendingDown,
  Upload, RefreshCw, ArrowRight, Camera,
  Play, Pause, Zap, ClipboardList, Mic, ExternalLink, X,
  Target, Check, Lock, Sun, Moon, Calculator, Bot, GripVertical, Save,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";

type View =
  | "dashboard"
  | "appointments"
  | "patients"
  | "patient-summary"
  | "create-prescription"
  | "prescription-history"
  | "templates"
  | "billing"
  | "reports"
  | "research"
  | "guidelines"
  | "tutorial";

// Data models and empty initial state
type Patient = {
  id: string;
  name: string;
  mobile: string;
  age: number;
  gender: string;
  bloodGroup: string;
  lastVisit: string | null;
  totalVisits: number;
  previousReports: string;
  previousReportFiles: string;
  familyHistory?: string;
  diseaseCode?: string;
  diagnosis?: string;
};

type PatientReportFile = {
  id: number;
  patientId: string;
  name: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
};

type Appointment = {
  id: string;
  patientId?: string;
  patient: string;
  mobile: string;
  age: number;
  gender: string;
  date?: string;
  time: string;
  serial: number;
  status: string;
  type?: string;
  duration?: number;
  notes?: string;
};

type PrescriptionSummary = {
  id: string;
  patientId?: string;
  patient: string;
  date: string;
  diagnosis: string;
  medicines: number;
  status: string;
  medicineItems?: Medicine[];
  clinicalData?: Record<string, string>;
  advice?: string;
  investigation?: string;
  followUpDate?: string | null;
  referredTo?: string;
  specialNotes?: string;
  doctor?: string;
  doctorDetails?: string;
  clinic?: string;
  phone?: string;
  followUp?: FollowUpData;
};

type PrescriptionDigitalCopy = {
  id?: string;
  patient?: string;
  patientId?: string;
  date?: string;
  doctor?: string;
  doctorDetails?: string;
  clinic?: string;
  phone?: string;
  diagnosis?: string;
  clinicalData?: Record<string, string>;
  medicines?: MedicineEntry[];
  advice?: string;
  investigations?: string[];
  followUp?: FollowUpData;
  followUpDate?: string | null;
  referredTo?: string;
  specialNotes?: string;
  status?: string;
};

type BillingRow = {
  id: string;
  patientId?: string;
  patient: string;
  date: string;
  amount: number;
  discount: number;
  paid: number;
  due: number;
  method: string;
  status: string;
  serviceType?: string;
  notes?: string;
};

type Medicine = {
  name: string;
  generic: string;
  dosage: string;
  meal: string;
  duration: string;
  instructions?: string;
};

type CommonMedicine = {
  sku?: string;
  brand: string;
  generic: string;
  company?: string;
  form: string;
  strength: string;
};

type ReportListItem = {
  label: string;
  count: string;
  pct: number;
};

type ReportsData = {
  totals: {
    patients: number;
    prescriptions: number;
    appointments: number;
    revenue: number;
  };
  patientTrends: Array<{ month: string; new: number; returning: number }>;
  prescriptionVolume: Array<{ month: string; prescriptions: number }>;
  commonDiagnoses: ReportListItem[];
  topMedicines: ReportListItem[];
};

const EMPTY_REPORTS: ReportsData = {
  totals: { patients: 0, prescriptions: 0, appointments: 0, revenue: 0 },
  patientTrends: [],
  prescriptionVolume: [],
  commonDiagnoses: [],
  topMedicines: [],
};

type ResearchProject = {
  id: number;
  title: string;
  description: string;
  currentStep: number;
  status: string;
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
};

type CustomGuideline = {
  id: string;
  title: string;
  url: string;
  cancerType: string;
  note?: string;
};

type AppSettings = {
  toggles?: Record<string, boolean>;
  printScale?: number;
  prescriptionOrder?: string[];
  researchThreshold?: number;
  dismissedResearchAlerts?: Record<string, number>;
  guidelines?: CustomGuideline[];
};

const DEFAULT_RESEARCH_THRESHOLD = 20;

const EMPTY_PATIENTS: Patient[] = [];
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost/oncology-api";
const PUBLIC_APP_URL = (import.meta.env.VITE_PUBLIC_APP_URL as string | undefined)?.replace(/\/$/, "");

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error ?? "API request failed");
  }

  return data as T;
}

const patientsApi = {
  list: () => apiRequest<Patient[]>("/patients.php"),
  create: (patient: PatientForm) => apiRequest<Patient>("/patients.php", {
    method: "POST",
    body: JSON.stringify(patient),
  }),
  update: (id: string, patient: PatientForm) => apiRequest<Patient>("/patients.php", {
    method: "PUT",
    body: JSON.stringify({ id, ...patient }),
  }),
  remove: (id: string) => apiRequest<{ success: boolean }>(`/patients.php?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  }),
};

const appointmentsApi = {
  list: () => apiRequest<Appointment[]>("/appointments.php"),
  create: (appointment: any) => apiRequest<Appointment>("/appointments.php", {
    method: "POST",
    body: JSON.stringify(appointment),
  }),
  update: (id: string, appointment: Partial<Appointment>) => apiRequest<Appointment>("/appointments.php", {
    method: "PUT",
    body: JSON.stringify({ id, ...appointment }),
  }),
  remove: (id: string) => apiRequest<{ success: boolean }>(`/appointments.php?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  }),
};

const invoicesApi = {
  list: () => apiRequest<BillingRow[]>("/invoices.php"),
  create: (invoice: any) => apiRequest<BillingRow>("/invoices.php", {
    method: "POST",
    body: JSON.stringify(invoice),
  }),
  remove: (id: string) => apiRequest<{ success: boolean }>(`/invoices.php?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  }),
};

const templatesApi = {
  list: () => apiRequest<PrescriptionTemplate[]>("/templates.php"),
  create: (template: PrescriptionTemplate) => apiRequest<PrescriptionTemplate>("/templates.php", {
    method: "POST",
    body: JSON.stringify(template),
  }),
  update: (template: PrescriptionTemplate & { incrementUsed?: boolean }) => apiRequest<PrescriptionTemplate>("/templates.php", {
    method: "PUT",
    body: JSON.stringify(template),
  }),
  remove: (id: number) => apiRequest<{ success: boolean }>(`/templates.php?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  }),
};

const prescriptionsApi = {
  list: () => apiRequest<PrescriptionSummary[]>("/prescriptions.php"),
  get: (id: string) => apiRequest<PrescriptionSummary>(`/prescriptions.php?id=${encodeURIComponent(id)}`),
  create: (prescription: any) => apiRequest<PrescriptionSummary>("/prescriptions.php", {
    method: "POST",
    body: JSON.stringify(prescription),
  }),
  remove: (id: string) => apiRequest<{ success: boolean }>(`/prescriptions.php?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  }),
};

const profileApi = {
  get: () => apiRequest<DoctorProfile>("/profile.php"),
  save: (profile: DoctorProfile) => apiRequest<DoctorProfile>("/profile.php", {
    method: "PUT",
    body: JSON.stringify(profile),
  }),
};

const reportsApi = {
  get: (period: string) => apiRequest<ReportsData>(`/reports.php?period=${encodeURIComponent(period)}`),
};

const researchApi = {
  list: () => apiRequest<ResearchProject[]>("/research.php"),
  create: (project: Omit<ResearchProject, "id">) => apiRequest<ResearchProject>("/research.php", {
    method: "POST",
    body: JSON.stringify(project),
  }),
  update: (project: ResearchProject) => apiRequest<ResearchProject>("/research.php", {
    method: "PUT",
    body: JSON.stringify(project),
  }),
  remove: (id: number) => apiRequest<{ success: boolean }>(`/research.php?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  }),
};

const settingsApi = {
  get: () => apiRequest<AppSettings>("/settings.php"),
  save: (settings: AppSettings) => apiRequest<AppSettings>("/settings.php", {
    method: "PUT",
    body: JSON.stringify(settings),
  }),
};

const medicinesApi = {
  list: (query = "") => apiRequest<CommonMedicine[]>(`/medicines.php?limit=100&q=${encodeURIComponent(query)}`),
};

const reportFilesApi = {
  list: (patientId: string) => apiRequest<PatientReportFile[]>(`/reports_files.php?patient=${encodeURIComponent(patientId)}`),
  // Multipart upload: let the browser set the Content-Type boundary.
  upload: async (patientId: string, file: File) => {
    const body = new FormData();
    body.append("patientId", patientId);
    body.append("file", file);
    const response = await fetch(`${API_BASE_URL}/reports_files.php`, { method: "POST", body });
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.error ?? "Upload failed");
    return data as PatientReportFile;
  },
  fileUrl: (id: number, download = false) => `${API_BASE_URL}/reports_files.php?id=${id}${download ? "&download=1" : ""}`,
  remove: (id: number) => apiRequest<{ success: boolean }>(`/reports_files.php?id=${id}`, {
    method: "DELETE",
  }),
};

const summariesApi = {
  get: (patientId: string) => apiRequest<{ data: PatientSummaryData | null; updatedAt: string | null }>(`/summaries.php?patient=${encodeURIComponent(patientId)}`),
  save: (patientId: string, data: PatientSummaryData) => apiRequest<{ data: PatientSummaryData; updatedAt: string }>("/summaries.php", {
    method: "PUT",
    body: JSON.stringify({ patientId, data }),
  }),
};

// Published sources behind the clinical terms used in the app (verified Oct 2026).
const CLINICAL_SOURCES = {
  recist: { title: "Eisenhauer EA et al. Revised RECIST guideline (version 1.1). Eur J Cancer 2009", url: "https://doi.org/10.1016/j.ejca.2008.10.026" },
  oligo: { title: "Guckenberger M et al. Characterisation and classification of oligometastatic disease: ESTRO/EORTC consensus. Lancet Oncol 2020", url: "https://doi.org/10.1016/S1470-2045(19)30718-1" },
  oligoReview: { title: "Uhl L et al. What is oligoprogression? A narrative review. Ann Palliat Med 2026", url: "https://apm.amegroups.org/article/view/160276/html" },
  omd: { title: "Lievens Y et al. Defining oligometastatic disease: ESTRO-ASTRO consensus. Radiother Oncol 2020", url: "https://doi.org/10.1016/j.radonc.2020.04.003" },
  dpr: { title: "Xie X, Li X, Yao W. Depth of response as a predictor of long-term outcomes for solid tumors. Transl Cancer Res 2021", url: "https://tcr.amegroups.org/article/view/49368/html" },
  ttbr: { title: "The timing of best tumor response and patterns of disease progression in NSCLC treated with EGFR TKI. Int J Radiat Oncol Biol Phys 2019", url: "https://doi.org/10.1016/j.ijrobp.2019.06.2445" },
  bor: { title: "Best response according to RECIST during first-line EGFR-TKI treatment predicts survival. Clin Lung Cancer 2018", url: "https://doi.org/10.1016/j.cllc.2018.01.005" },
  dor: { title: "Soria JC et al. Osimertinib in untreated EGFR-mutated advanced NSCLC (FLAURA). N Engl J Med 2018", url: "https://doi.org/10.1056/NEJMoa1713137" },
  famhx: { title: "NCI PDQ: Cancer Genetics Risk Assessment and Counseling (Health Professional Version)", url: "https://www.cancer.gov/publications/pdq/information-summaries/genetics/risk-assessment-hp-pdq" },
  icd10: { title: "WHO ICD-10 Version 2019, Chapter II Neoplasms (C00-D48)", url: "https://icd.who.int/browse10/2019/en#/C00-D48" },
  nccn: { title: "NCCN Guidelines: Treatment by Cancer Type", url: "https://www.nccn.org/guidelines/category_1" },
  nccnSupportive: { title: "NCCN Guidelines: Supportive Care", url: "https://www.nccn.org/guidelines/category_3" },
  esmo: { title: "ESMO Clinical Practice Guidelines", url: "https://www.esmo.org/guidelines" },
  asco: { title: "ASCO Guidelines", url: "https://www.asco.org/practice-patients/guidelines" },
  eviq: { title: "eviQ Cancer Treatments Online, Cancer Institute NSW", url: "https://www.eviq.org.au/" },
} as const;

type ClinicalSourceId = keyof typeof CLINICAL_SOURCES;

function SourceLink({ ids }: { ids: ClinicalSourceId[] }) {
  return (
    <span className="inline-flex items-center gap-0.5 align-middle">
      {ids.map((id, index) => (
        <a
          key={id}
          href={CLINICAL_SOURCES[id].url}
          target="_blank"
          rel="noopener noreferrer"
          title={`Source: ${CLINICAL_SOURCES[id].title}`}
          onClick={e => e.stopPropagation()}
          className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-50 px-1 text-[9px] font-bold text-blue-600 hover:bg-blue-100"
        >
          {ids.length > 1 ? index + 1 : "i"}
        </a>
      ))}
    </span>
  );
}

// Family history is stored on the prescription as JSON rows.
type FamilyHistoryRow = {
  relation: string;
  side: string;
  condition: string;
  ageAtDiagnosis: string;
  deceased: boolean;
};

const parseFamilyHistory = (value?: string): FamilyHistoryRow[] | null => {
  if (!value?.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const formatFamilyHistory = (value?: string) => {
  const rows = parseFamilyHistory(value);
  if (rows === null) return value ?? "";
  return rows.map(row => {
    const who = [row.relation, row.side && row.side !== "N/A" ? `(${row.side.toLowerCase()})` : ""].filter(Boolean).join(" ");
    const age = row.ageAtDiagnosis?.trim() ?? "";
    const ageText = age ? `dx ${/^\d+$/.test(age) ? `${age}y` : age}` : "";
    const detail = [row.condition, ageText, row.deceased ? "deceased" : ""].filter(Boolean).join(", ");
    return [who, detail].filter(Boolean).join(" - ");
  }).join("\n");
};

// Patient Summary, saved per patient.
type TkiCustomPoint = { label: string; value: string };

type PatientSummaryData = {
  diagnosis: string;
  icd10: string;
  stage: string;
  ecog: string;
  cycle: string;
  allergies: string;
  regimen: string;
  toxicity: string;
  response: string;
  followUp: string;
  oligo: {
    lesionCount: string;
    sites: string;
    detectedOn: string;
    systemicTherapy: string;
    continueSystemic: string;
    localTherapy: string;
    notes: string;
  };
  tki: {
    enabled: boolean;
    drug: string;
    startDate: string;
    bestResponse: string;
    bestResponseDate: string;
    baselineSum: string;
    nadirSum: string;
    depthOfResponse: string;
    timeToBestResponse: string;
    durationOfResponse: string;
    customPoints: TkiCustomPoint[];
  };
};

const EMPTY_SUMMARY: PatientSummaryData = {
  diagnosis: "", icd10: "", stage: "", ecog: "", cycle: "", allergies: "",
  regimen: "", toxicity: "", response: "", followUp: "",
  oligo: { lesionCount: "", sites: "", detectedOn: "", systemicTherapy: "", continueSystemic: "", localTherapy: "", notes: "" },
  tki: {
    enabled: false, drug: "", startDate: "", bestResponse: "", bestResponseDate: "",
    baselineSum: "", nadirSum: "", depthOfResponse: "", timeToBestResponse: "", durationOfResponse: "", customPoints: [],
  },
};

// Older or partial saved summaries are merged onto the empty shape.
const normaliseSummary = (data?: Partial<PatientSummaryData> | null): PatientSummaryData => ({
  ...EMPTY_SUMMARY,
  ...(data ?? {}),
  oligo: { ...EMPTY_SUMMARY.oligo, ...(data?.oligo ?? {}) },
  tki: { ...EMPTY_SUMMARY.tki, ...(data?.tki ?? {}), customPoints: data?.tki?.customPoints ?? [] },
});

const EMPTY_APPOINTMENTS: Appointment[] = [];

const EMPTY_PRESCRIPTIONS: PrescriptionSummary[] = [];

const EMPTY_BILLING: BillingRow[] = [];
type PrescriptionTemplate = {
  id?: number;
  name: string;
  desc: string;
  tags: string[];
  isDefault: boolean;
  used: number;
  sections: string[];
};

const DEFAULT_TEMPLATE_SECTIONS = [
  "Chief Complaint", "History", "Family History", "On Examination", "Diagnosis",
  "Treatment Plan", "Referred By", "Rx / Medicines", "Advice",
  "Investigation", "Follow Up", "Referral", "Special Notes",
];

const EMPTY_TEMPLATES: PrescriptionTemplate[] = [];

const INITIAL_MEDICINES: Medicine[] = [];
// Clinical shortcut suggestions per section
const CLINICAL_SUGGESTIONS: Record<string, string[]> = {
  "Chief Complaint": [
    "Headache", "Fever", "Chest pain", "Shortness of breath", "Abdominal pain",
    "Nausea and vomiting", "Fatigue", "Dizziness", "Back pain", "Joint pain",
    "Cough", "Weight loss", "Palpitations", "Leg swelling", "Loss of appetite",
  ],
  "History": [
    "No significant past medical history", "History of hypertension",
    "History of type 2 diabetes mellitus", "History of COPD",
    "Previous myocardial infarction", "History of peptic ulcer disease",
    "Allergic to penicillin", "Non-smoker, non-alcoholic",
    "Family history of ischaemic heart disease",
  ],
  "On Examination": [
    "General condition: fair, conscious and oriented",
    "No pallor, no icterus, no cyanosis", "No clubbing, no koilonychia",
    "No pedal oedema", "Pulse regular, normal volume",
    "Blood pressure within normal limits", "Chest clear to auscultation",
    "Abdomen soft and non-tender", "Heart sounds normal, no murmur",
    "CNS: no focal deficit",
  ],
  "Diagnosis": [
    "Essential Hypertension (I10)", "Type 2 Diabetes Mellitus (E11)",
    "COPD (J44)", "Acute Gastroenteritis (A09)", "Peptic Ulcer Disease (K27)",
    "Migraine without aura (G43.0)", "Osteoarthritis (M19)",
    "Generalised Anxiety Disorder (F41.1)", "Iron Deficiency Anaemia (D50)",
    "Hypothyroidism (E03)", "Asthma (J45)", "Urinary Tract Infection (N39.0)",
  ],
  "Treatment Plan": [
    "Conservative management with lifestyle modification",
    "Pharmacological management initiated",
    "Refer to specialist for further evaluation",
    "Follow up in 2 weeks with repeat investigations",
    "Monitor vitals and blood sugar regularly",
    "Low-sodium, low-fat diet recommended",
    "Regular aerobic exercise 30 min/day advised",
    "Adequate hydration and rest advised",
  ],
  "Referred By": [
    "Self referred", "General Physician", "Emergency Department",
    "Dr. Kamal Hossain - GP", "Dr. Sara Ahmed - Cardiologist",
    "Dr. Reza Islam - Neurologist", "Dr. Mitu Roy - Gynaecologist",
    "Online appointment", "Walk-in patient",
  ],
};

// Treatment drawer data
const COMMON_MEDICINES: CommonMedicine[] = [];

const ADVICE_SUGGESTIONS = [
  "Reduce salt intake (< 5g/day)",
  "Regular aerobic exercise 30 min/day",
  "Monitor blood pressure twice daily",
  "Monitor fasting blood sugar daily",
  "Avoid spicy and oily food",
  "Drink 8-10 glasses of water daily",
  "Follow a diabetic diet plan",
  "Avoid smoking and alcohol completely",
  "Take medications regularly without missing any dose",
  "Sleep 7-8 hours per night",
  "Reduce mental stress and anxiety",
  "Follow up immediately if symptoms worsen",
  "Avoid heavy physical exertion for 2 weeks",
  "Keep wound dry and clean",
];

const INVESTIGATION_SUGGESTIONS = [
  "CBC (Complete Blood Count)",
  "Fasting Blood Sugar (FBS)",
  "HbA1c",
  "Lipid Profile (Total Cholesterol, TG, HDL, LDL)",
  "Serum Creatinine",
  "Serum Electrolytes (Na+, K+)",
  "Urine R/E + C/S",
  "ECG (12-lead)",
  "Chest X-ray (PA view)",
  "Echocardiography",
  "USG of Whole Abdomen",
  "Thyroid Function Test (TSH, FT3, FT4)",
  "Liver Function Test (LFT)",
  "PT, aPTT & INR",
  "2D Echo + Colour Doppler",
  "CT Scan of Chest (HRCT)",
  "MRI of Brain (with contrast)",
  "Tumor Markers (CEA, CA-125, AFP, PSA)",
  "Bone Marrow Biopsy",
];

const REFERRAL_DESTINATIONS = [
  "Cardiologist",
  "Endocrinologist",
  "Pulmonologist",
  "Neurologist",
  "Gastroenterologist",
  "Nephrologist",
  "Specialty",
  "Orthopaedic Surgeon",
  "Gynaecologist",
  "Dermatologist",
  "Ophthalmologist",
  "ENT Specialist",
  "Psychiatrist",
  "Physiotherapist",
  "National Cancer Institute, Dhaka",
  "BIRDEM General Hospital",
  "National Heart Foundation Hospital",
];

// Shared components
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Completed: "bg-green-50 text-green-700 border-green-200",
    Confirmed: "bg-blue-50 text-blue-700 border-blue-200",
    Waiting: "bg-amber-50 text-amber-700 border-amber-200",
    "In Progress": "bg-cyan-50 text-cyan-700 border-cyan-200",
    Cancelled: "bg-red-50 text-red-700 border-red-200",
    "No Show": "bg-gray-50 text-gray-500 border-gray-200",
    Final: "bg-green-50 text-green-700 border-green-200",
    Draft: "bg-amber-50 text-amber-700 border-amber-200",
    Paid: "bg-green-50 text-green-700 border-green-200",
    Partial: "bg-amber-50 text-amber-700 border-amber-200",
    Unpaid: "bg-red-50 text-red-700 border-red-200",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status] ?? "bg-gray-50 text-gray-500 border-gray-200"}`}>
      {status}
    </span>
  );
}

function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function Av({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const initials = name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
  const palette = [
    "bg-blue-100 text-blue-700", "bg-cyan-100 text-cyan-700",
    "bg-green-100 text-green-700", "bg-purple-100 text-purple-700",
    "bg-rose-100 text-rose-700", "bg-amber-100 text-amber-700",
  ];
  const color = palette[name.charCodeAt(0) % palette.length];
  const sz = { sm: "w-7 h-7 text-xs", md: "w-8 h-8 text-sm", lg: "w-10 h-10 text-base" }[size];
  return (
    <div className={`${sz} ${color} rounded-full flex items-center justify-center font-semibold flex-shrink-0`}>
      {initials}
    </div>
  );
}

function printPrescription() {
  const cleanup = () => document.body.classList.remove("printing-prescription");
  document.body.classList.add("printing-prescription");
  window.addEventListener("afterprint", cleanup, { once: true });
  window.print();
}

const encodeDigitalCopy = (payload: PrescriptionDigitalCopy) => {
  const json = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const decodeDigitalCopy = (value: string): PrescriptionDigitalCopy | null => {
  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - normalized.length % 4) % 4), "=");
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch (error) {
    console.error(error);
    return null;
  }
};

const digitalCopyUrl = (payload: PrescriptionDigitalCopy) => {
  const base = PUBLIC_APP_URL || `${window.location.origin}${window.location.pathname}`;
  if (payload.id && payload.id !== "Draft") {
    return `${base}?rxid=${encodeURIComponent(payload.id)}`;
  }
  return `${base}?rxcopy=${encodeDigitalCopy(payload)}`;
};

const prescriptionSummaryToDigitalCopy = (rx: PrescriptionSummary): PrescriptionDigitalCopy => ({
  id: rx.id,
  patient: rx.patient,
  patientId: rx.patientId,
  date: rx.date,
  doctor: rx.doctor,
  doctorDetails: rx.doctorDetails,
  clinic: rx.clinic,
  phone: rx.phone,
  diagnosis: rx.diagnosis,
  clinicalData: rx.clinicalData,
  medicines: (rx.medicineItems ?? []).map(med => ({
    name: med.name,
    generic: med.generic,
    dosage: med.dosage,
    meal: med.meal,
    duration: med.duration,
  })),
  advice: rx.advice,
  investigations: rx.investigation ? rx.investigation.split("\n").filter(Boolean) : [],
  followUpDate: rx.followUpDate,
  followUp: rx.followUp,
  referredTo: rx.referredTo,
  specialNotes: rx.specialNotes,
  status: rx.status,
});

function PrescriptionQrCode({ payload, size = 80 }: { payload: PrescriptionDigitalCopy; size?: number }) {
  const [src, setSrc] = useState("");
  const [error, setError] = useState(false);
  const isSavedPrescription = Boolean(payload.id && payload.id !== "Draft");
  const url = useMemo(() => isSavedPrescription ? digitalCopyUrl(payload) : "", [isSavedPrescription, payload]);

  useEffect(() => {
    if (!isSavedPrescription) {
      setSrc("");
      setError(false);
      return;
    }
    let cancelled = false;
    setError(false);
    QRCode.toDataURL(url, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: Math.max(320, size * 4),
      color: { dark: "#000000", light: "#FFFFFF" },
    })
      .then(dataUrl => {
        if (!cancelled) setSrc(dataUrl);
      })
      .catch(error => {
        console.error(error);
        if (!cancelled) {
          setSrc("");
          setError(true);
        }
      });
    return () => { cancelled = true; };
  }, [isSavedPrescription, url, size]);

  if (!isSavedPrescription) {
    return (
      <div className="flex flex-col items-center" title="Save the prescription to create a shareable QR code">
        <span className="flex items-center justify-center border border-dashed border-gray-300 bg-gray-50 text-gray-300" style={{ width: size, height: size }}>
          <QrCode className="h-1/2 w-1/2" />
        </span>
        <span className="mt-1 max-w-28 text-center text-[9px] font-medium leading-tight text-gray-500">Save draft to enable QR</span>
      </div>
    );
  }

  return (
    <button type="button" onClick={() => navigator.clipboard?.writeText(url)} className="flex flex-col items-center" title={`Copy digital prescription link: ${url}`}>
      <span className="flex items-center justify-center border border-gray-300 bg-white" style={{ width: size, height: size }}>
        {src ? <img src={src} alt={`QR code for prescription ${payload.id}`} className="block h-full w-full" style={{ imageRendering: "pixelated" }} /> : <QrCode className={`h-3/4 w-3/4 ${error ? "text-red-300" : "text-gray-300"}`} />}
      </span>
      <span className={`mt-1 text-[9px] font-medium ${error ? "text-red-500" : "text-gray-500"}`}>{error ? "QR unavailable" : "Scan for digital copy"}</span>
    </button>
  );
}

function StatCard({ title, value, change, icon: Icon, iconClass, trend, accent }: {
  title: string; value: string; change: string; icon: any; iconClass: string; trend: "up" | "down" | "neutral"; accent?: string;
}) {
  return (
    <div className="premium-card rounded-2xl p-5 relative overflow-hidden transition-all duration-200">
      {/* Accent bar */}
      <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style={{ background: accent || "linear-gradient(90deg,#0EA5E9,#10B981)" }} />

      <div className="flex items-start justify-between mb-4">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${iconClass}`} style={{ boxShadow: "0 8px 18px rgba(31,49,69,0.10)" }}>
          <Icon className="w-5 h-5" />
        </div>
        <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg ${
          trend === "up" ? "text-emerald-700 bg-emerald-50" : trend === "down" ? "text-red-600 bg-red-50" : "text-slate-500 bg-slate-100"
        }`}>
          {trend === "up" && <TrendingUp className="w-3 h-3" />}
          {trend === "down" && <TrendingDown className="w-3 h-3" />}
          {change}
        </span>
      </div>
      <p className="text-2xl font-bold mb-0.5 text-slate-950" style={{ fontFamily: "var(--font-display)" }}>{value}</p>
      <p className="text-sm text-slate-500">{title}</p>
    </div>
  );
}

// Toast
function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-[60] flex items-center gap-3 bg-white text-blue-800 px-4 py-3 rounded-xl shadow-xl ring-1 ring-blue-100 animate-in fade-in slide-in-from-bottom-2">
      <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="ml-1 text-blue-300 hover:text-blue-700 transition-colors">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// TreatmentDrawer
function FloatingAiAssistant({ onCreatePrescription }: { onCreatePrescription: () => void }) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [draft, setDraft] = useState("");

  const quickPrompts = [
    "Summarize today clinic priorities",
    "Draft patient counselling advice",
    "Create oncology follow-up checklist",
  ];

  const generateDraft = (text = prompt) => {
    const request = text.trim() || "Draft patient counselling advice";
    setPrompt(request);
    setDraft([
      `AI draft: ${request}`,
      "",
      "- Review the diagnosis, treatment plan, and next visit schedule.",
      "- Confirm current medicines, allergies, and recent report findings.",
      "- Explain warning signs clearly and advise urgent review if they appear.",
      "- Clinician review is required before using this text in patient records.",
    ].join("\n"));
  };

  return (
    <div className="fixed bottom-5 right-3 z-[70] sm:bottom-6 sm:right-6">
      {open && (
        <div className="absolute bottom-20 right-0 w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-blue-100 bg-gradient-to-r from-blue-50 to-cyan-50 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="relative h-10 w-10 rounded-2xl bg-gradient-to-br from-blue-600 via-cyan-500 to-emerald-400 p-0.5 shadow-lg shadow-blue-500/25">
                <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-white">
                  <Bot className="h-5 w-5 text-blue-600" />
                </div>
                <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">AI Assistant</p>
                <p className="text-xs text-gray-500">Clinical drafting helper</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-gray-500 hover:bg-red-50 hover:text-red-600">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-4 p-4">
            <div className="grid gap-2">
              {quickPrompts.map(item => (
                <button
                  key={item}
                  onClick={() => generateDraft(item)}
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-left text-xs font-medium text-gray-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="Ask for a draft, summary, or checklist..."
                rows={3}
                className="w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <button
                onClick={() => generateDraft()}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                <Zap className="h-4 w-4" />Generate Draft
              </button>
            </div>

            <textarea
              value={draft}
              onChange={e => setDraft(e.target.value)}
              placeholder="AI draft will appear here..."
              rows={7}
              className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs leading-relaxed text-gray-700 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />

            <button
              onClick={() => { onCreatePrescription(); setOpen(false); }}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
            >
              <FilePlus className="h-4 w-4" />Open Prescription Assistant
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 via-cyan-500 to-emerald-400 text-white shadow-2xl shadow-blue-500/30 ring-4 ring-white/80 transition-transform hover:scale-105"
        aria-label="Open AI Assistant"
        title="AI Assistant"
      >
        <span className="absolute inset-0 rounded-full bg-white/15 opacity-0 transition-opacity group-hover:opacity-100" />
        <Bot className="relative h-7 w-7" />
        <span className="absolute -left-1 top-2 h-3 w-3 rounded-full border-2 border-white bg-emerald-400" />
        <span className="absolute -bottom-7 right-0 hidden whitespace-nowrap rounded-full bg-slate-900 px-3 py-1 text-[11px] font-bold text-white shadow-lg sm:block">
          AI Assistant
        </span>
      </button>
    </div>
  );
}

type MedicineEntry = { name: string; generic: string; dosage: string; meal: string; duration: string; instructions?: string };
type FollowUpData = { interval: string; specificDate: string; note: string };

function TreatmentDrawer({
  section, medicines, advice, investigations, followUp, referredTo, specialNotes,
  onAddMedicine, onSaveAdvice, onSaveInvestigations, onSaveFollowUp, onSaveReferredTo, onSaveSpecialNotes, onClose,
}: {
  section: string;
  medicines: MedicineEntry[];
  advice: string;
  investigations: string[];
  followUp: FollowUpData;
  referredTo: string;
  specialNotes: string;
  onAddMedicine: (m: MedicineEntry) => void;
  onSaveAdvice: (v: string) => void;
  onSaveInvestigations: (v: string[]) => void;
  onSaveFollowUp: (v: FollowUpData) => void;
  onSaveReferredTo: (v: string) => void;
  onSaveSpecialNotes: (v: string) => void;
  onClose: () => void;
}) {
  const iconMap: Record<string, any> = {
    "Rx Items": Pill, "Advice": Heart, "Investigation": Microscope,
    "Follow Up": Calendar, "Referred To": ExternalLink, "Special Notes": Mic,
    "Calculate": Calculator, "AI Assistant": Bot,
  };
  const SectionIcon = iconMap[section] ?? Pill;

  // Rx Items state
  const [medQuery, setMedQuery] = useState("");
  const [expandedMed, setExpandedMed] = useState<string | null>(null);
  const [medicineOptions, setMedicineOptions] = useState<CommonMedicine[]>([]);
  const [medicinesLoading, setMedicinesLoading] = useState(false);
  const [cfg, setCfg] = useState({ morning: "1", noon: "0", evening: "1", meal: "After", duration: "7", unit: "days", instruction: "" });
  const [customMedName, setCustomMedName] = useState("");
  const [customMedGeneric, setCustomMedGeneric] = useState("");
  const [showCustomMedicine, setShowCustomMedicine] = useState(false);
  const [interactionCheckEnabled, setInteractionCheckEnabled] = useState(true);
  const [interactionAlert, setInteractionAlert] = useState("");
  const [pendingMedicine, setPendingMedicine] = useState<{ medicine: MedicineEntry; custom: boolean } | null>(null);

  // Advice state
  const [advQuery, setAdvQuery] = useState("");
  const [selAdvice, setSelAdvice] = useState<string[]>(
    advice ? advice.replace(/^- /gm, "").split("\n").filter(Boolean) : []
  );
  const [customAdv, setCustomAdv] = useState("");

  // Investigation state
  const [invQuery, setInvQuery] = useState("");
  const [selInvs, setSelInvs] = useState<string[]>([...investigations]);
  const [customInv, setCustomInv] = useState("");

  // Follow Up state
  const [fuInterval, setFuInterval] = useState(followUp.interval || "");
  const [fuDate, setFuDate] = useState(followUp.specificDate || "");
  const [fuNote, setFuNote] = useState(followUp.note || "");

  // Referred To state
  const [refQuery, setRefQuery] = useState("");
  const [refDest, setRefDest] = useState(referredTo || "");
  const [refDoctor, setRefDoctor] = useState("");
  const [urgency, setUrgency] = useState("Routine");

  // Special Notes state
  const [notes, setNotes] = useState(specialNotes || "");

  // Calculate state
  const [calc, setCalc] = useState({
    heightCm: "",
    weightKg: "",
    sex: "Male",
    observed: "",
    referenceMean: "",
    standardDeviation: "",
  });

  const heightCm = Number(calc.heightCm);
  const weightKg = Number(calc.weightKg);
  const heightM = heightCm / 100;
  const bmi = heightM > 0 && weightKg > 0 ? weightKg / (heightM * heightM) : null;
  const bsa = heightCm > 0 && weightKg > 0 ? Math.sqrt((heightCm * weightKg) / 3600) : null;
  const heightInches = heightCm / 2.54;
  const ibwBase = calc.sex === "Male" ? 50 : 45.5;
  const ibw = heightInches >= 60 ? ibwBase + 2.3 * (heightInches - 60) : null;
  const observed = Number(calc.observed);
  const referenceMean = Number(calc.referenceMean);
  const standardDeviation = Number(calc.standardDeviation);
  const zScore = standardDeviation > 0 && calc.observed !== "" && calc.referenceMean !== ""
    ? (observed - referenceMean) / standardDeviation
    : null;
  const setCalcField = (key: keyof typeof calc, value: string) => {
    setCalc(prev => ({ ...prev, [key]: value }));
  };

  // AI Assistant state
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [aiTarget, setAiTarget] = useState<"Advice" | "Special Notes">("Special Notes");

  const aiQuickPrompts = [
    "Draft patient-friendly advice for this visit",
    "Create a concise oncology follow-up checklist",
    "Write medication counselling points",
    "Prepare red-flag symptoms and when to return",
  ];

  useEffect(() => {
    if (section !== "Rx Items") return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setMedicinesLoading(true);
      medicinesApi.list(medQuery.trim())
        .then((items) => {
          if (!cancelled) setMedicineOptions(items);
        })
        .catch((error) => {
          console.error(error);
          if (!cancelled) setMedicineOptions([]);
        })
        .finally(() => {
          if (!cancelled) setMedicinesLoading(false);
        });
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [section, medQuery]);

  const generateAiResponse = (prompt = aiPrompt) => {
    const text = prompt.trim() || "Draft patient-friendly advice for this visit";
    const response = [
      `AI draft: ${text}`,
      "",
      "- Review diagnosis, treatment plan, and medicine schedule with the patient.",
      "- Confirm allergies, current medicines, pregnancy status when relevant, and prior adverse reactions.",
      "- Advise the patient to return urgently for fever, breathing difficulty, uncontrolled vomiting, bleeding, severe weakness, or new confusion.",
      "- Bring previous reports, medicine list, and treatment documents at the next follow-up.",
      "- This draft should be reviewed and edited by the clinician before finalising the prescription.",
    ].join("\n");
    setAiPrompt(text);
    setAiResponse(response);
  };

  const applyAiResponse = () => {
    if (!aiResponse.trim()) return;
    if (aiTarget === "Advice") onSaveAdvice(aiResponse);
    if (aiTarget === "Special Notes") onSaveSpecialNotes(aiResponse);
    onClose();
  };

  const calculationSummary = () => [
    "Clinical Calculations:",
    `BMI: ${bmi === null ? "Not calculated" : `${bmi.toFixed(1)} kg/m2`}`,
    `BSA: ${bsa === null ? "Not calculated" : `${bsa.toFixed(2)} m2`}`,
    `IBW: ${ibw === null ? "Not calculated" : `${ibw.toFixed(1)} kg`}`,
    `Z-score: ${zScore === null ? "Not calculated" : zScore.toFixed(2)}`,
  ].join("\n");

  const addCalculationToPrescription = () => {
    const existing = specialNotes.trim();
    onSaveSpecialNotes(existing ? `${existing}\n\n${calculationSummary()}` : calculationSummary());
    onClose();
  };

  const doseOpts = ["0", "0.5", "1", "1.5", "2"];

  const activeIngredients = (generic: string) => generic
    .toLowerCase()
    .split(/\s*\+\s*|\s*\/\s*/)
    .map(part => part
      .replace(/\b\d+(?:\.\d+)?\s*(?:mg|mcg|g|kg|ml|l|iu|unit|units|%)\b.*$/i, "")
      .replace(/\b(?:bp|usp|ip)\b/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim())
    .filter(ingredient => ingredient.length > 2 && ingredient !== "custom medicine");

  const duplicateMedicineWarning = (candidate: MedicineEntry) => {
    const sameBrand = medicines.find(existing => existing.name.trim().toLowerCase() === candidate.name.trim().toLowerCase());
    if (sameBrand) return `${candidate.name} is already included in this prescription.`;

    const candidateIngredients = activeIngredients(candidate.generic);
    const overlap = medicines.find(existing => {
      const existingIngredients = activeIngredients(existing.generic);
      return candidateIngredients.some(ingredient => existingIngredients.includes(ingredient));
    });
    if (!overlap) return "";

    const shared = candidateIngredients.find(ingredient => activeIngredients(overlap.generic).includes(ingredient));
    return `Potential duplicate therapy: ${candidate.name} and ${overlap.name} contain the same active ingredient${shared ? ` (${shared})` : ""}.`;
  };

  const resetMedicineForm = (custom: boolean) => {
    if (custom) {
      setCustomMedName("");
      setCustomMedGeneric("");
      setMedQuery("");
    }
    setExpandedMed(null);
    setCfg({ morning: "1", noon: "0", evening: "1", meal: "After", duration: "7", unit: "days", instruction: "" });
  };

  const commitMedicine = (medicine: MedicineEntry, custom: boolean) => {
    onAddMedicine(medicine);
    resetMedicineForm(custom);
    setInteractionAlert("");
    setPendingMedicine(null);
  };

  const checkAndAddMedicine = (medicine: MedicineEntry, custom = false) => {
    const warning = interactionCheckEnabled ? duplicateMedicineWarning(medicine) : "";
    if (warning) {
      setInteractionAlert(warning);
      setPendingMedicine({ medicine, custom });
      return;
    }
    commitMedicine(medicine, custom);
  };

  const addMed = (med: typeof COMMON_MEDICINES[0]) => {
    checkAndAddMedicine({
      name: med.brand, generic: med.generic,
      dosage: `${cfg.morning}+${cfg.noon}+${cfg.evening}`,
      meal: `${cfg.meal} meal`,
      duration: `${cfg.duration} ${cfg.unit}`,
      instructions: cfg.instruction,
    });
  };

  const addCustomMed = () => {
    const name = customMedName.trim() || medQuery.trim();
    if (!name) return;
    checkAndAddMedicine({
      name,
      generic: customMedGeneric.trim() || "Custom medicine",
      dosage: `${cfg.morning}+${cfg.noon}+${cfg.evening}`,
      meal: `${cfg.meal} meal`,
      duration: `${cfg.duration} ${cfg.unit}`,
      instructions: cfg.instruction,
    }, true);
  };

  const handleSave = () => {
    if (section === "Advice") onSaveAdvice(selAdvice.map(a => `- ${a}`).join("\n"));
    if (section === "Investigation") onSaveInvestigations(selInvs);
    if (section === "Follow Up") onSaveFollowUp({ interval: fuInterval, specificDate: fuDate, note: fuNote });
    if (section === "Referred To") onSaveReferredTo([refDest, refDoctor ? `Dr. ${refDoctor}` : "", urgency !== "Routine" ? `(${urgency})` : ""].filter(Boolean).join("  -  "));
    if (section === "Special Notes") onSaveSpecialNotes(notes);
    onClose();
  };

  const filteredMeds = medicineOptions;
  const filteredAdv = ADVICE_SUGGESTIONS.filter(a => a.toLowerCase().includes(advQuery.toLowerCase()));
  const filteredInvs = INVESTIGATION_SUGGESTIONS.filter(i => i.toLowerCase().includes(invQuery.toLowerCase()));
  const filteredRefs = REFERRAL_DESTINATIONS.filter(r => r.toLowerCase().includes(refQuery.toLowerCase()));

  const toggleAdv = (item: string) => setSelAdvice(p => p.includes(item) ? p.filter(x => x !== item) : [...p, item]);
  const toggleInv = (item: string) => setSelInvs(p => p.includes(item) ? p.filter(x => x !== item) : [...p, item]);

  return (
    <div className="fixed inset-0 z-[90] flex">
      <div className="flex-1 bg-black/10" onClick={section === "Rx Items" ? onClose : undefined} />
      <div className="w-full sm:w-96 bg-white shadow-2xl flex flex-col h-full border-l border-gray-200">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
            <SectionIcon className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-900">{section}</h3>
            <p className="text-xs text-gray-400">
              {section === "Rx Items" ? "Search and add medicines" :
               section === "Advice" ? "Patient advice and instructions" :
               section === "Investigation" ? "Diagnostic investigations" :
               section === "Follow Up" ? "Set follow-up schedule" :
               section === "Referred To" ? "Referral destination" :
               section === "Calculate" ? "BMI, BSA, IBW, and Z-score" :
               section === "AI Assistant" ? "Draft clinical text and counselling notes" : "Special clinical notes"}
            </p>
          </div>
          <button onClick={onClose} className="w-7 h-7 bg-red-100 hover:bg-red-200 text-red-600 rounded-full flex items-center justify-center transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className={`flex-1 min-h-0 ${section === "Rx Items" ? "overflow-hidden" : "overflow-y-auto"}`}>
          {/* RX ITEMS */}
          {section === "Rx Items" && (
            <div className="h-full min-h-0 flex flex-col gap-3 p-4 sm:p-5">
              <div className="flex-shrink-0 rounded-lg border border-blue-100 bg-blue-50/70 p-3">
                <label className="flex cursor-pointer items-center justify-between gap-3">
                  <span className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-blue-600" />
                    <span>
                      <span className="block text-xs font-semibold text-slate-800">Drug interaction check</span>
                      <span className="block text-[10px] text-slate-500">Alert for duplicate brands or active ingredients</span>
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    checked={interactionCheckEnabled}
                    onChange={e => {
                      setInteractionCheckEnabled(e.target.checked);
                      setInteractionAlert("");
                      setPendingMedicine(null);
                    }}
                    className="h-4 w-4 rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                  />
                </label>
              </div>
              {interactionAlert && pendingMedicine && (
                <div role="alert" className="flex-shrink-0 rounded-lg border border-amber-300 bg-amber-50 p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-amber-900">Potential duplicate medicine</p>
                      <p className="mt-1 text-[11px] leading-relaxed text-amber-800">{interactionAlert}</p>
                      <p className="mt-1 text-[10px] text-amber-700">Review clinically before continuing. This check does not replace a full interaction database.</p>
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => { setInteractionAlert(""); setPendingMedicine(null); }}
                          className="rounded-md border border-amber-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-amber-800 hover:bg-amber-100"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => commitMedicine(pendingMedicine.medicine, pendingMedicine.custom)}
                          className="rounded-md bg-amber-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-amber-700"
                        >
                          Add anyway
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div className="relative flex-shrink-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={medQuery} onChange={e => setMedQuery(e.target.value)} placeholder="Search brand or generic name..." className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
              </div>
              <div className="flex-shrink-0 bg-gray-50 rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowCustomMedicine(open => !open)}
                  className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-gray-100"
                  aria-expanded={showCustomMedicine}
                >
                  <span className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    <Plus className="h-3.5 w-3.5 text-blue-600" />Custom Medicine
                  </span>
                  <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${showCustomMedicine ? "rotate-180" : ""}`} />
                </button>
                {showCustomMedicine && <div className="border-t border-gray-200 p-3 space-y-3">
                  <div className="flex items-center justify-end">
                    {medQuery.trim() && (
                      <button onClick={() => setCustomMedName(medQuery.trim())} className="text-[10px] font-semibold text-blue-600 hover:text-blue-700">
                        Use search text
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                  <input
                    value={customMedName}
                    onChange={e => setCustomMedName(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") addCustomMed(); }}
                    placeholder="Medicine name..."
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                  />
                  <input
                    value={customMedGeneric}
                    onChange={e => setCustomMedGeneric(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") addCustomMed(); }}
                    placeholder="Generic / note (optional)"
                    className="w-full text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                  />
                  </div>
                <div className="grid grid-cols-3 gap-2">
                  {[["morning", "Morning"], ["noon", "Noon"], ["evening", "Evening"]].map(([key, label]) => (
                    <div key={key}>
                      <p className="text-[9px] font-semibold text-gray-500 mb-1 text-center">{label}</p>
                      <div className="flex flex-wrap gap-0.5 justify-center">
                        {doseOpts.map(opt => (
                          <button key={opt} onClick={() => setCfg(c => ({ ...c, [key]: opt }))} className={`w-7 h-7 rounded text-[10px] font-semibold transition-colors ${(cfg as any)[key] === opt ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"}`}>{opt}</button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {["Before", "After"].map(m => (
                    <button key={m} onClick={() => setCfg(c => ({ ...c, meal: m }))} className={`py-1.5 text-xs font-medium rounded-lg border transition-colors ${cfg.meal === m ? "bg-blue-600 text-white border-blue-600" : "border-gray-200 text-gray-600 bg-white hover:border-gray-300"}`}>{m} meal</button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input type="number" value={cfg.duration} onChange={e => setCfg(c => ({ ...c, duration: e.target.value }))} className="w-16 text-sm border border-gray-200 rounded-lg px-2 py-1.5 text-center focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white" />
                  <select value={cfg.unit} onChange={e => setCfg(c => ({ ...c, unit: e.target.value }))} className="flex-1 text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none">
                    <option>days</option><option>weeks</option><option>months</option>
                  </select>
                </div>
                <button
                  onClick={addCustomMed}
                  disabled={!customMedName.trim() && !medQuery.trim()}
                  className="w-full py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:hover:bg-blue-600 flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />Add Custom Medicine
                </button>
                </div>}
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto pr-1 space-y-4">
              {!medQuery && medicines.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Currently in Rx</p>
                  <div className="space-y-1">
                    {medicines.map((m, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-lg border border-green-100">
                        <span className="text-[10px] font-bold text-green-600 w-4">{i + 1}.</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-green-800 truncate">{m.name}</p>
                          <p className="text-[9px] text-green-600">{m.dosage}  -  {m.meal}  -  {m.duration}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">{medQuery ? "Results" : "Common Medicines"}</p>
                {medicinesLoading && <p className="text-xs text-gray-400 text-center py-3">Loading medicines...</p>}
                <div className="space-y-1">
                  {filteredMeds.map(med => (
                    <div key={med.brand}>
                      <button onClick={() => setExpandedMed(expandedMed === med.brand ? null : med.brand)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all border ${expandedMed === med.brand ? "bg-blue-50 border-blue-200" : "border-transparent hover:bg-gray-50 hover:border-gray-200"}`}>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-900">{med.brand}</p>
                          <p className="text-[10px] text-gray-400">{med.generic}  -  {med.form}</p>
                        </div>
                        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 flex-shrink-0 transition-transform ${expandedMed === med.brand ? "rotate-180" : ""}`} />
                      </button>
                      {expandedMed === med.brand && (
                        <div className="mx-2 mb-2 p-3 bg-blue-50/70 rounded-lg border border-blue-100 space-y-3">
                          {/* Dosage M+A+E */}
                          <div className="grid grid-cols-3 gap-2">
                            {[["morning", "Morning"], ["noon", "Noon"], ["evening", "Evening"]].map(([key, label]) => (
                              <div key={key}>
                                <p className="text-[9px] font-semibold text-gray-500 mb-1 text-center">{label}</p>
                                <div className="flex flex-wrap gap-0.5 justify-center">
                                  {doseOpts.map(opt => (
                                    <button key={opt} onClick={() => setCfg(c => ({ ...c, [key]: opt }))} className={`w-7 h-7 rounded text-[10px] font-semibold transition-colors ${(cfg as any)[key] === opt ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"}`}>{opt}</button>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="text-center">
                            <span className="text-xs font-mono font-bold text-blue-700 bg-blue-100 px-3 py-1 rounded-full">{cfg.morning}+{cfg.noon}+{cfg.evening}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {["Before", "After"].map(m => (
                              <button key={m} onClick={() => setCfg(c => ({ ...c, meal: m }))} className={`py-1.5 text-xs font-medium rounded-lg border transition-colors ${cfg.meal === m ? "bg-blue-600 text-white border-blue-600" : "border-gray-200 text-gray-600 bg-white hover:border-gray-300"}`}>{m} meal</button>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <input type="number" value={cfg.duration} onChange={e => setCfg(c => ({ ...c, duration: e.target.value }))} className="w-16 text-sm border border-gray-200 rounded-lg px-2 py-1.5 text-center focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white" />
                            <select value={cfg.unit} onChange={e => setCfg(c => ({ ...c, unit: e.target.value }))} className="flex-1 text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none">
                              <option>days</option><option>weeks</option><option>months</option>
                            </select>
                          </div>
                          <input value={cfg.instruction} onChange={e => setCfg(c => ({ ...c, instruction: e.target.value }))} placeholder="Special instruction (optional)" className="w-full text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                          <button onClick={() => addMed(med)} className="w-full py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-1.5">
                            <Plus className="w-3.5 h-3.5" />Add to Prescription
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                  {filteredMeds.length === 0 && <p className="text-xs text-gray-400 text-center py-6">No medicines found for "{medQuery}"</p>}
                </div>
              </div>
              </div>
            </div>
          )}

          {/* ADVICE */}
          {section === "Advice" && (
            <div className="p-5 space-y-4">
              <div className="sticky top-0 z-20 bg-white pb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={advQuery} onChange={e => setAdvQuery(e.target.value)} placeholder="Search advice..." className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
              </div>
              <div className="space-y-1">
                {filteredAdv.map(item => (
                  <button key={item} onClick={() => toggleAdv(item)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs text-left transition-all border ${selAdvice.includes(item) ? "bg-blue-50 text-blue-700 border-blue-200" : "text-gray-700 hover:bg-gray-50 border-transparent hover:border-gray-200"}`}>
                    <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${selAdvice.includes(item) ? "bg-blue-600 border-blue-600" : "border-gray-300"}`}>
                      {selAdvice.includes(item) && <Check className="w-3 h-3 text-white" />}
                    </div>
                    {item}
                  </button>
                ))}
              </div>
              {selAdvice.length > 0 && (
                <div className="pt-3 border-t border-gray-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Selected ({selAdvice.length})</p>
                  <div className="space-y-1">
                    {selAdvice.map((a, i) => (
                      <div key={i} className="flex items-start gap-2 px-3 py-1.5 bg-blue-50 rounded-lg border border-blue-100">
                        <span className="text-xs text-blue-700 flex-1">- {a}</span>
                        <button onClick={() => toggleAdv(a)} className="text-blue-300 hover:text-red-500 transition-colors flex-shrink-0"><XCircle className="w-3.5 h-3.5" /></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="sticky bottom-0 z-20 -mx-5 -mb-5 border-t border-gray-100 bg-white px-5 py-4 shadow-[0_-12px_24px_rgba(15,23,42,0.06)]">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Custom Advice</p>
                <div className="flex gap-2">
                  <input value={customAdv} onChange={e => setCustomAdv(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && customAdv.trim()) { setSelAdvice(p => [...p, customAdv.trim()]); setCustomAdv(""); } }} placeholder="Type and press Enter..." className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                  <button onClick={() => { if (customAdv.trim()) { setSelAdvice(p => [...p, customAdv.trim()]); setCustomAdv(""); } }} className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg border border-blue-200 transition-colors"><Plus className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          )}

          {/* INVESTIGATION */}
          {section === "Investigation" && (
            <div className="p-5 space-y-4">
              <div className="sticky top-0 z-20 bg-white pb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={invQuery} onChange={e => setInvQuery(e.target.value)} placeholder="Search investigations..." className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
              </div>
              {!invQuery && (
                <div className="flex flex-wrap gap-1.5">
                  {["CBC", "FBS", "HbA1c", "ECG", "Lipid Profile"].map(t => (
                    <button key={t} onClick={() => { const full = INVESTIGATION_SUGGESTIONS.find(i => i.startsWith(t)); if (full && !selInvs.includes(full)) setSelInvs(p => [...p, full]); }} className="px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200 hover:border-blue-300 hover:text-blue-600 transition-colors">{t}</button>
                  ))}
                </div>
              )}
              <div className="space-y-1">
                {filteredInvs.map(item => (
                  <button key={item} onClick={() => toggleInv(item)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs text-left transition-all border ${selInvs.includes(item) ? "bg-blue-50 text-blue-700 border-blue-200" : "text-gray-700 hover:bg-gray-50 border-transparent hover:border-gray-200"}`}>
                    <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${selInvs.includes(item) ? "bg-blue-600 border-blue-600" : "border-gray-300"}`}>
                      {selInvs.includes(item) && <Check className="w-3 h-3 text-white" />}
                    </div>
                    {item}
                  </button>
                ))}
              </div>
              {selInvs.length > 0 && (
                <div className="pt-3 border-t border-gray-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Selected ({selInvs.length})</p>
                  <div className="space-y-1">
                    {selInvs.map((inv, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-lg border border-blue-100">
                        <span className="text-xs font-medium text-blue-800 flex-1">{i + 1}. {inv}</span>
                        <button onClick={() => toggleInv(inv)} className="text-blue-300 hover:text-red-500 transition-colors flex-shrink-0"><XCircle className="w-3.5 h-3.5" /></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="sticky bottom-0 z-20 -mx-5 -mb-5 flex gap-2 border-t border-gray-100 bg-white px-5 py-4 shadow-[0_-12px_24px_rgba(15,23,42,0.06)]">
                <input value={customInv} onChange={e => setCustomInv(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && customInv.trim()) { setSelInvs(p => [...p, customInv.trim()]); setCustomInv(""); } }} placeholder="Add custom investigation..." className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                <button onClick={() => { if (customInv.trim()) { setSelInvs(p => [...p, customInv.trim()]); setCustomInv(""); } }} className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg border border-blue-200 transition-colors"><Plus className="w-4 h-4" /></button>
              </div>
            </div>
          )}

          {/* FOLLOW UP */}
          {section === "Follow Up" && (
            <div className="p-5 space-y-4">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Quick Intervals</p>
                <div className="grid grid-cols-2 gap-2">
                  {["1 week", "2 weeks", "1 month", "3 months", "6 months", "As needed"].map(iv => (
                    <button key={iv} onClick={() => setFuInterval(iv)} className={`py-2.5 text-xs font-medium rounded-lg border transition-colors ${fuInterval === iv ? "bg-blue-600 text-white border-blue-600" : "text-gray-600 border-gray-200 hover:border-blue-300 hover:bg-blue-50"}`}>{iv}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">Specific Date (optional)</label>
                <input type="date" value={fuDate} onChange={e => setFuDate(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">Instructions</label>
                <textarea value={fuNote} onChange={e => setFuNote(e.target.value)} placeholder="e.g. Bring blood reports, fasting required..." rows={3} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none focus:border-blue-400" />
              </div>
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                <p className="text-[9px] font-bold text-blue-400 uppercase tracking-wider mb-1">Preview</p>
                <p className="text-sm font-semibold text-blue-900">After <span className="text-blue-600">{fuInterval}</span></p>
                {fuDate && <p className="text-xs text-blue-600 mt-0.5">{new Date(fuDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>}
                {fuNote && <p className="text-xs text-blue-700 mt-1 italic">{fuNote}</p>}
              </div>
            </div>
          )}

          {/* REFERRED TO */}
          {section === "Referred To" && (
            <div className="p-5 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={refQuery} onChange={e => setRefQuery(e.target.value)} placeholder="Search specialty or hospital..." className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
              </div>
              <div className="space-y-1 max-h-44 overflow-y-auto">
                {filteredRefs.map(ref => (
                  <button key={ref} onClick={() => setRefDest(ref)} className={`w-full text-left px-3 py-2.5 rounded-lg text-xs transition-all border ${refDest === ref ? "bg-blue-50 text-blue-700 border-blue-200 font-semibold" : "text-gray-700 hover:bg-gray-50 border-transparent hover:border-gray-200"}`}>{ref}</button>
                ))}
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">Destination / Specialty</label>
                <input value={refDest} onChange={e => setRefDest(e.target.value)} placeholder="e.g. Cardiologist, NICVD..." className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">Doctor Name (optional)</label>
                <input value={refDoctor} onChange={e => setRefDoctor(e.target.value)} placeholder="e.g. Dr. Rahim Uddin" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">Urgency</label>
                <div className="grid grid-cols-3 gap-2">
                  {["Routine", "Urgent", "Emergency"].map(u => (
                    <button key={u} onClick={() => setUrgency(u)} className={`py-2 text-xs font-medium rounded-lg border transition-colors ${urgency === u ? (u === "Emergency" ? "bg-red-500 text-white border-red-500" : u === "Urgent" ? "bg-amber-500 text-white border-amber-500" : "bg-blue-600 text-white border-blue-600") : "text-gray-600 border-gray-200 hover:border-gray-300"}`}>{u}</button>
                  ))}
                </div>
              </div>
              {refDest && (
                <div className="bg-blue-50 rounded-xl p-3.5 border border-blue-100">
                  <p className="text-[9px] font-bold text-blue-400 uppercase tracking-wider mb-1">Referral Preview</p>
                  <p className="text-sm font-semibold text-blue-900">{refDest}</p>
                  {refDoctor && <p className="text-xs text-blue-600">Attn: Dr. {refDoctor}</p>}
                  {urgency !== "Routine" && <p className={`text-xs font-semibold mt-1 ${urgency === "Emergency" ? "text-red-600" : "text-amber-600"}`}>{urgency}</p>}
                </div>
              )}
            </div>
          )}

          {/* SPECIAL NOTES */}
          {section === "Special Notes" && (
            <div className="p-5 space-y-4">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Quick Templates</p>
                <div className="space-y-1">
                  {[
                    "Patient counselled regarding diagnosis and prognosis",
                    "Informed consent obtained for procedure",
                    "Patient is not fit for surgery at present",
                    "Immunocompromised - avoid live vaccines",
                    "Patient advised to avoid pregnancy for 6 months",
                  ].map(t => (
                    <button key={t} onClick={() => setNotes(p => p ? `${p}\n${t}` : t)} className="w-full text-left px-3 py-2 rounded-lg text-xs text-gray-700 hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-all">{t}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">Notes</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Special clinical notes, patient-specific instructions..." rows={8} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none focus:border-blue-400" />
                <p className="text-[10px] text-gray-400 mt-1">{notes.length} characters</p>
              </div>
            </div>
          )}

          {section === "Calculate" && (
            <div className="p-5 space-y-5">
              <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Activity className="w-4 h-4 text-blue-600" />
                  <p className="text-xs font-bold text-blue-900">Anthropometry</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Height</label>
                    <div className="relative">
                      <input type="number" min="0" value={calc.heightCm} onChange={e => setCalcField("heightCm", e.target.value)} placeholder="cm" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 pr-9 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">cm</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Weight</label>
                    <div className="relative">
                      <input type="number" min="0" value={calc.weightKg} onChange={e => setCalcField("weightKg", e.target.value)} placeholder="kg" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 pr-9 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">kg</span>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Sex for IBW</label>
                    <div className="grid grid-cols-2 gap-2">
                      {["Male", "Female"].map(sex => (
                        <button key={sex} onClick={() => setCalcField("sex", sex)} className={`py-2 text-xs font-semibold rounded-lg border transition-colors ${calc.sex === sex ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"}`}>
                          {sex}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "BMI", value: bmi === null ? "--" : bmi.toFixed(1), unit: "kg/m2" },
                  { label: "BSA", value: bsa === null ? "--" : bsa.toFixed(2), unit: "m2" },
                  { label: "IBW", value: ibw === null ? "--" : ibw.toFixed(1), unit: "kg" },
                ].map(item => (
                  <div key={item.label} className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{item.label}</p>
                    <p className="mt-1 text-lg font-bold text-gray-900">{item.value}</p>
                    <p className="text-[10px] text-gray-400">{item.unit}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm space-y-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  <p className="text-xs font-bold text-gray-900">Z-Score</p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Observed</label>
                    <input type="number" value={calc.observed} onChange={e => setCalcField("observed", e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Mean</label>
                    <input type="number" value={calc.referenceMean} onChange={e => setCalcField("referenceMean", e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">SD</label>
                    <input type="number" min="0" value={calc.standardDeviation} onChange={e => setCalcField("standardDeviation", e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                  </div>
                </div>
                <div className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Result</p>
                    <p className="text-xs text-gray-500">(Observed - Mean) / SD</p>
                  </div>
                  <p className="text-xl font-bold text-blue-700">{zScore === null ? "--" : zScore.toFixed(2)}</p>
                </div>
              </div>

              <p className="text-[10px] leading-relaxed text-gray-400">
                BSA uses the Mosteller formula. IBW uses the Devine adult formula and appears for height 152.4 cm or above. Z-score requires the appropriate reference mean and SD for the selected clinical parameter.
              </p>
              <button
                onClick={addCalculationToPrescription}
                className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
              >
                Add Calculation to Prescription
              </button>
            </div>
          )}

          {section === "AI Assistant" && (
            <div className="p-5 space-y-5">
              <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Bot className="w-4 h-4 text-blue-600" />
                  <p className="text-xs font-bold text-blue-900">AI Assistant</p>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {aiQuickPrompts.map(prompt => (
                    <button
                      key={prompt}
                      onClick={() => generateAiResponse(prompt)}
                      className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium bg-white text-gray-700 border border-blue-100 hover:border-blue-300 hover:text-blue-700 transition-colors"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Ask Assistant</label>
                <textarea
                  value={aiPrompt}
                  onChange={e => setAiPrompt(e.target.value)}
                  placeholder="Example: Draft post-chemo counselling advice with red flags..."
                  rows={4}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none focus:border-blue-400"
                />
                <button
                  onClick={() => generateAiResponse()}
                  className="w-full py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <Zap className="w-4 h-4" />Generate Draft
                </button>
              </div>

              <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-gray-900">Draft Output</p>
                  <div className="flex gap-1">
                    {["Special Notes", "Advice"].map(target => (
                      <button
                        key={target}
                        onClick={() => setAiTarget(target as "Advice" | "Special Notes")}
                        className={`px-2.5 py-1 rounded-md text-[10px] font-semibold border transition-colors ${aiTarget === target ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"}`}
                      >
                        {target}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  value={aiResponse}
                  onChange={e => setAiResponse(e.target.value)}
                  placeholder="Generated draft will appear here..."
                  rows={9}
                  className="w-full text-xs leading-relaxed border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none focus:border-blue-400"
                />
                <p className="text-[10px] text-gray-400">
                  Review every AI draft before applying it to the prescription.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 flex gap-2 flex-shrink-0 bg-gray-50/50">
          <button onClick={onClose} className="flex-1 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-white transition-colors">Cancel</button>
          {section === "Rx Items" ? (
            <button onClick={onClose} className="flex-1 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors font-medium">Done</button>
          ) : section === "Calculate" ? (
            <button onClick={addCalculationToPrescription} className="flex-1 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors font-medium">Add to Prescription</button>
          ) : section === "AI Assistant" ? (
            <button onClick={applyAiResponse} disabled={!aiResponse.trim()} className="flex-1 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors font-medium">Apply to {aiTarget}</button>
          ) : (
            <button onClick={handleSave} className="flex-1 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors font-medium">Apply</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ClinicalDrawer
function ClinicalDrawer({
  section, currentValue, onSave, onClose,
}: {
  section: string; currentValue: string; onSave: (val: string) => void; onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>(
    currentValue ? currentValue.split("\n").filter(Boolean) : []
  );
  const [custom, setCustom] = useState("");

  const suggestions = CLINICAL_SUGGESTIONS[section] ?? [];
  const filtered = query
    ? suggestions.filter((s) => s.toLowerCase().includes(query.toLowerCase()))
    : suggestions;
  const recent = suggestions.slice(0, 4);

  const toggle = (item: string) =>
    setSelected((prev) =>
      prev.includes(item) ? prev.filter((p) => p !== item) : [...prev, item]
    );

  const addCustom = () => {
    if (custom.trim() && !selected.includes(custom.trim())) {
      setSelected((prev) => [...prev, custom.trim()]);
      setCustom("");
    }
  };

  const iconMap: Record<string, any> = {
    "Chief Complaint": ClipboardList,
    "History": FileText,
    "On Examination": Stethoscope,
    "Diagnosis": Target,
    "Treatment Plan": Activity,
    "Referred By": User,
  };
  const SectionIcon = iconMap[section] ?? ClipboardList;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/10" onClick={onClose} />
      <div className="w-full sm:w-96 bg-white shadow-2xl flex flex-col h-full border-l border-gray-200">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
            <SectionIcon className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-900">{section}</h3>
            <p className="text-xs text-gray-400">Select suggestions or type custom entries</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 bg-red-100 hover:bg-red-200 text-red-600 rounded-full flex items-center justify-center transition-colors flex-shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-gray-100 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${section.toLowerCase()}...`}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Recently used */}
          {!query && (
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Recently Used</p>
              <div className="flex flex-wrap gap-1.5">
                {recent.map((item) => (
                  <button
                    key={item}
                    onClick={() => toggle(item)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all border ${
                      selected.includes(item)
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-gray-50 text-gray-700 border-gray-200 hover:border-blue-300 hover:text-blue-600"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Suggestions list */}
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
              {query ? "Search Results" : "All Suggestions"}
            </p>
            <div className="space-y-1">
              {filtered.map((item) => (
                <button
                  key={item}
                  onClick={() => toggle(item)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all text-left ${
                    selected.includes(item)
                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                      : "text-gray-700 hover:bg-gray-50 border border-transparent hover:border-gray-200"
                  }`}
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                    selected.includes(item) ? "bg-blue-600 border-blue-600" : "border-gray-300"
                  }`}>
                    {selected.includes(item) && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span className="leading-snug">{item}</span>
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-6">No suggestions found for "{query}"</p>
              )}
            </div>
          </div>

          {/* Selected items */}
          {selected.length > 0 && (
            <div className="pt-3 border-t border-gray-100">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                Selected ({selected.length})
              </p>
              <div className="space-y-1">
                {selected.map((item, i) => (
                  <div key={i} className="flex items-start gap-2 px-3 py-2 bg-blue-50 rounded-lg border border-blue-100">
                    <span className="text-xs text-blue-700 flex-1 leading-snug">{item}</span>
                    <button onClick={() => toggle(item)} className="text-blue-300 hover:text-red-500 transition-colors flex-shrink-0 mt-0.5">
                      <XCircle className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Custom entry */}
          <div className="sticky bottom-0 z-20 -mx-5 -mb-5 border-t border-gray-100 bg-white px-5 py-4 shadow-[0_-12px_24px_rgba(15,23,42,0.06)]">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Custom Entry</p>
            <div className="flex gap-2">
              <input
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCustom()}
                placeholder="Type and press Enter or +"
                className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              />
              <button
                onClick={addCustom}
                className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors border border-blue-200"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 flex gap-2 flex-shrink-0 bg-gray-50/50">
          <button onClick={onClose} className="flex-1 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-white transition-colors">
            Cancel
          </button>
          <button
            onClick={() => { onSave(selected.join("\n")); onClose(); }}
            className="flex-1 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Apply {selected.length > 0 && `(${selected.length})`}
          </button>
        </div>
      </div>
    </div>
  );
}

const FAMILY_RELATIONS = ["Mother", "Father", "Sister", "Brother", "Daughter", "Son", "Grandmother", "Grandfather", "Aunt", "Uncle", "Niece", "Nephew", "Cousin", "Other"];
const FAMILY_CONDITIONS = [
  "Breast cancer", "Ovarian cancer", "Colorectal cancer", "Endometrial cancer", "Prostate cancer",
  "Pancreatic cancer", "Lung cancer", "Gastric cancer", "Melanoma", "Leukaemia / Lymphoma",
  "Diabetes", "Hypertension", "Ischaemic heart disease",
];
const EMPTY_FAMILY_ROW: FamilyHistoryRow = { relation: "", side: "N/A", condition: "", ageAtDiagnosis: "", deceased: false };

function FamilyHistoryDrawer({ currentValue, patientNote, onSave, onClose }: {
  currentValue: string; patientNote?: string; onSave: (val: string) => void; onClose: () => void;
}) {
  const parsed = parseFamilyHistory(currentValue);
  const [rows, setRows] = useState<FamilyHistoryRow[]>(() => {
    if (parsed === null) return [{ ...EMPTY_FAMILY_ROW, condition: currentValue }];
    return parsed.length ? parsed : [{ ...EMPTY_FAMILY_ROW }];
  });
  const [noHistory, setNoHistory] = useState(false);
  const inputCls = "w-full text-sm border border-gray-200 rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400";

  const update = (index: number, patch: Partial<FamilyHistoryRow>) =>
    setRows(prev => prev.map((row, i) => i === index ? { ...row, ...patch } : row));

  const apply = () => {
    if (noHistory) {
      onSave(JSON.stringify([{ ...EMPTY_FAMILY_ROW, relation: "No significant family history" }]));
    } else {
      const filled = rows.filter(row => row.relation.trim() || row.condition.trim());
      onSave(filled.length ? JSON.stringify(filled) : "");
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/10" onClick={onClose} />
      <div className="w-full sm:w-[28rem] bg-white shadow-2xl flex flex-col h-full border-l border-gray-200">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">Family History <SourceLink ids={["famhx"]} /></h3>
            <p className="text-xs text-gray-400">One row per affected relative (maternal and paternal sides)</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 bg-red-100 hover:bg-red-200 text-red-600 rounded-full flex items-center justify-center transition-colors flex-shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {patientNote?.trim() && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">From patient record</p>
              <p className="mt-0.5 text-xs text-amber-900 whitespace-pre-line">{patientNote}</p>
            </div>
          )}

          <label className="flex items-center gap-2 text-xs text-gray-700">
            <input type="checkbox" checked={noHistory} onChange={e => setNoHistory(e.target.checked)} className="accent-blue-600" />
            No significant family history
          </label>

          {!noHistory && rows.map((row, index) => (
            <div key={index} className="rounded-xl border border-gray-200 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Relative {index + 1}</p>
                <button onClick={() => setRows(prev => prev.filter((_, i) => i !== index))} className="text-gray-300 hover:text-red-500" aria-label="Remove relative">
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select value={row.relation} onChange={e => update(index, { relation: e.target.value })} className={inputCls}>
                  <option value="">Relation</option>
                  {FAMILY_RELATIONS.map(item => <option key={item}>{item}</option>)}
                </select>
                <select value={row.side} onChange={e => update(index, { side: e.target.value })} className={inputCls}>
                  <option>N/A</option><option>Maternal</option><option>Paternal</option>
                </select>
              </div>
              <input
                list="family-conditions"
                value={row.condition}
                onChange={e => update(index, { condition: e.target.value })}
                placeholder="Cancer / disease (primary site)"
                className={inputCls}
              />
              <div className="grid grid-cols-2 gap-2 items-center">
                <input
                  type="text"
                  value={row.ageAtDiagnosis}
                  onChange={e => update(index, { ageAtDiagnosis: e.target.value })}
                  placeholder="Age at diagnosis"
                  className={inputCls}
                />
                <label className="flex items-center gap-2 text-xs text-gray-700">
                  <input type="checkbox" checked={row.deceased} onChange={e => update(index, { deceased: e.target.checked })} className="accent-blue-600" />
                  Deceased
                </label>
              </div>
            </div>
          ))}
          <datalist id="family-conditions">
            {FAMILY_CONDITIONS.map(item => <option key={item} value={item} />)}
          </datalist>

          {!noHistory && (
            <button onClick={() => setRows(prev => [...prev, { ...EMPTY_FAMILY_ROW }])} className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-blue-600 border border-dashed border-blue-300 rounded-lg hover:bg-blue-50">
              <Plus className="w-3.5 h-3.5" />Add relative
            </button>
          )}
        </div>

        <div className="px-5 py-4 border-t border-gray-100 flex gap-2 flex-shrink-0 bg-gray-50/50">
          <button onClick={onClose} className="flex-1 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-white transition-colors">Cancel</button>
          <button onClick={apply} className="flex-1 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors font-medium">Apply</button>
        </div>
      </div>
    </div>
  );
}

// AddPatientModal
type PatientForm = {
  name: string; mobile: string; altMobile: string; gender: string;
  dob: string; bloodGroup: string; marital: string; occupation: string;
  nid: string; address: string; district: string; area: string;
  email: string; height: string; weight: string;
  emergencyName: string; emergencyRel: string; emergencyPhone: string;
  allergies: string; chronic: string; surgeries: string;
  currentMeds: string; familyHistory: string; pregnancy: string;
  smoking: string; previousReports: string; previousReportFiles: string; notes: string;
};

const EMPTY_PATIENT_FORM: PatientForm = {
  name: "", mobile: "", altMobile: "", gender: "", dob: "", bloodGroup: "",
  marital: "", occupation: "", nid: "", address: "", district: "", area: "",
  email: "", height: "", weight: "",
  emergencyName: "", emergencyRel: "", emergencyPhone: "",
  allergies: "", chronic: "", surgeries: "", currentMeds: "",
  familyHistory: "", pregnancy: "", smoking: "", previousReports: "", previousReportFiles: "", notes: "",
};

function PatientFormField({
  label, required, error, children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-gray-600 block mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

const REPORT_FILE_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const REPORT_FILE_MAX_BYTES = 20 * 1024 * 1024;

function AddPatientModal({ onClose, onSave, initialPatient }: { onClose: () => void; onSave: (p: PatientForm, reportFiles: File[]) => void; initialPatient?: typeof EMPTY_PATIENTS[0] | null }) {
  const [tab, setTab] = useState<"basic" | "additional" | "emergency" | "medical">("basic");
  const [form, setForm] = useState<PatientForm>(() => initialPatient ? {
    ...EMPTY_PATIENT_FORM,
    name: initialPatient.name,
    mobile: initialPatient.mobile,
    gender: initialPatient.gender,
    bloodGroup: initialPatient.bloodGroup,
    previousReports: initialPatient.previousReports,
    previousReportFiles: initialPatient.previousReportFiles,
    familyHistory: initialPatient.familyHistory ?? "",
  } : EMPTY_PATIENT_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof PatientForm, string>>>({});
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState("");

  const set = (k: keyof PatientForm, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  // Files are uploaded after the patient is saved (new patients have no ID yet).
  const handleReportFiles = (files: FileList | null) => {
    if (!files?.length) return;
    const accepted: File[] = [];
    const rejected: string[] = [];
    Array.from(files).forEach(file => {
      if (REPORT_FILE_TYPES.includes(file.type) && file.size <= REPORT_FILE_MAX_BYTES) accepted.push(file);
      else rejected.push(file.name);
    });
    setPendingFiles(prev => [...prev, ...accepted]);
    setFileError(rejected.length ? `Not added (only PDF, JPG, PNG, WEBP up to 20 MB): ${rejected.join(", ")}` : "");
  };

  const validate = () => {
    const e: Partial<Record<keyof PatientForm, string>> = {};
    if (!form.name.trim()) e.name = "Patient name is required";
    if (!form.mobile.trim()) e.mobile = "Mobile number is required";
    if (!form.gender) e.gender = "Gender is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = (andPrescribe = false) => {
    if (!validate()) { setTab("basic"); return; }
    onSave(form, pendingFiles);
    onClose();
  };

  const tabs = [
    { id: "basic", label: "Basic Information" },
    { id: "additional", label: "Additional" },
    { id: "emergency", label: "Emergency Contact" },
    { id: "medical", label: "Medical History" },
  ] as const;

  const inputCls = (err?: string) =>
    `w-full text-sm border rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${err ? "border-red-400 focus:border-red-400" : "border-gray-200 focus:border-blue-400"}`;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="bg-white rounded-t-2xl shadow-2xl w-full max-h-[94vh] flex flex-col sm:max-w-2xl sm:rounded-2xl sm:max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100 flex-shrink-0 sm:px-6">
          <div>
            <h2 className="text-base font-semibold text-gray-900">{initialPatient ? "Edit Patient" : "Add New Patient"}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{initialPatient ? "Update existing patient information" : "Fill in details to register the patient"}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 bg-red-100 hover:bg-red-200 text-red-600 rounded-full flex items-center justify-center transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto border-b border-gray-100 px-4 flex-shrink-0 sm:px-6">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
                tab === t.id ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {tab === "basic" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="col-span-2">
                <PatientFormField label="Patient Name" required error={errors.name}>
                  <input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Patient name" className={inputCls(errors.name)} />
                </PatientFormField>
              </div>
              <PatientFormField label="Mobile Number" required error={errors.mobile}>
                <input value={form.mobile} onChange={(e) => set("mobile", e.target.value)} placeholder="+880 1711-123456" className={inputCls(errors.mobile)} />
              </PatientFormField>
              <PatientFormField label="Alternative Mobile">
                <input value={form.altMobile} onChange={(e) => set("altMobile", e.target.value)} placeholder="+880 1811-000000" className={inputCls()} />
              </PatientFormField>
              <PatientFormField label="Gender" required error={errors.gender}>
                <select value={form.gender} onChange={(e) => set("gender", e.target.value)} className={inputCls(errors.gender)}>
                  <option value="">Select gender</option>
                  <option>Male</option><option>Female</option><option>Other</option>
                </select>
              </PatientFormField>
              <PatientFormField label="Date of Birth">
                <input type="date" value={form.dob} onChange={(e) => set("dob", e.target.value)} className={inputCls()} />
              </PatientFormField>
              <PatientFormField label="Blood Group">
                <select value={form.bloodGroup} onChange={(e) => set("bloodGroup", e.target.value)} className={inputCls()}>
                  <option value="">Select blood group</option>
                  {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((g) => <option key={g}>{g}</option>)}
                </select>
              </PatientFormField>
              <PatientFormField label="Marital Status">
                <select value={form.marital} onChange={(e) => set("marital", e.target.value)} className={inputCls()}>
                  <option value="">Select status</option>
                  <option>Single</option><option>Married</option><option>Divorced</option><option>Widowed</option>
                </select>
              </PatientFormField>
              <PatientFormField label="Occupation">
                <input value={form.occupation} onChange={(e) => set("occupation", e.target.value)} placeholder="e.g. Engineer" className={inputCls()} />
              </PatientFormField>
              <PatientFormField label="National ID">
                <input value={form.nid} onChange={(e) => set("nid", e.target.value)} placeholder="NID / Passport number" className={inputCls()} />
              </PatientFormField>
              <div className="col-span-2">
                <PatientFormField label="Address">
                  <textarea value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="House no., road, area..." rows={2} className={`${inputCls()} resize-none`} />
                </PatientFormField>
              </div>
              <PatientFormField label="District">
                <select value={form.district} onChange={(e) => set("district", e.target.value)} className={inputCls()}>
                  <option value="">Select district</option>
                  {["Dhaka", "Chittagong", "Sylhet", "Rajshahi", "Khulna", "Barisal", "Rangpur", "Mymensingh"].map((d) => <option key={d}>{d}</option>)}
                </select>
              </PatientFormField>
              <PatientFormField label="Area / Thana">
                <input value={form.area} onChange={(e) => set("area", e.target.value)} placeholder="e.g. Gulshan, Mirpur" className={inputCls()} />
              </PatientFormField>
            </div>
          )}

          {tab === "additional" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="col-span-2">
                <PatientFormField label="Email Address">
                  <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="patient@email.com" className={inputCls()} />
                </PatientFormField>
              </div>
              <PatientFormField label="Height (cm)">
                <input type="number" value={form.height} onChange={(e) => set("height", e.target.value)} placeholder="e.g. 168" className={inputCls()} />
              </PatientFormField>
              <PatientFormField label="Weight (kg)">
                <input type="number" value={form.weight} onChange={(e) => set("weight", e.target.value)} placeholder="e.g. 72" className={inputCls()} />
              </PatientFormField>
            </div>
          )}

          {tab === "emergency" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="col-span-2">
                <PatientFormField label="Contact Name" required>
                  <input value={form.emergencyName} onChange={(e) => set("emergencyName", e.target.value)} placeholder="Full name" className={inputCls()} />
                </PatientFormField>
              </div>
              <PatientFormField label="Relationship">
                <select value={form.emergencyRel} onChange={(e) => set("emergencyRel", e.target.value)} className={inputCls()}>
                  <option value="">Select relationship</option>
                  <option>Spouse</option><option>Parent</option><option>Sibling</option><option>Child</option><option>Other</option>
                </select>
              </PatientFormField>
              <PatientFormField label="Phone Number" required>
                <input value={form.emergencyPhone} onChange={(e) => set("emergencyPhone", e.target.value)} placeholder="Phone number" className={inputCls()} />
              </PatientFormField>
            </div>
          )}

          {tab === "medical" && (
            <div className="space-y-4">
              {([
                { k: "allergies", label: "Allergies", ph: "e.g. Penicillin, Aspirin, Shellfish..." },
                { k: "chronic", label: "Chronic Diseases", ph: "List chronic diseases..." },
                { k: "surgeries", label: "Previous Surgeries", ph: "e.g. Appendectomy 2018, CABG 2022..." },
                { k: "currentMeds", label: "Current Medications", ph: "List ongoing medications..." },
                { k: "familyHistory", label: "Family History", ph: "Relevant family history..." },
                { k: "notes", label: "Special Notes", ph: "Any additional clinical notes..." },
              ] as const).map((f) => (
                <PatientFormField key={f.k} label={f.label}>
                  <textarea
                    value={form[f.k]}
                    onChange={(e) => set(f.k, e.target.value)}
                    placeholder={f.ph}
                    rows={2}
                    className={`${inputCls()} resize-none`}
                  />
                </PatientFormField>
              ))}
              <PatientFormField label="Previous Medical Reports">
                <textarea
                  value={form.previousReports}
                  onChange={(e) => set("previousReports", e.target.value)}
                  placeholder="Summarize previous diagnosis, biopsy, imaging, lab reports, discharge summaries..."
                  rows={3}
                  className={`${inputCls()} resize-none`}
                />
              </PatientFormField>

              <PatientFormField label="Upload Previous Report Files">
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-blue-200 bg-blue-50/60 px-4 py-5 text-center hover:bg-blue-50">
                  <Upload className="mb-2 h-5 w-5 text-blue-600" />
                  <span className="text-sm font-semibold text-blue-700">Choose report files</span>
                  <span className="mt-1 text-xs text-gray-500">PDF or image (JPG, PNG, WEBP), up to 20 MB each. Uploaded when you save.</span>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    onChange={(e) => { handleReportFiles(e.target.files); e.target.value = ""; }}
                    className="hidden"
                  />
                </label>
                {fileError && <p className="mt-1.5 text-xs text-red-600">{fileError}</p>}
                {pendingFiles.length > 0 && (
                  <div className="mt-2 space-y-1 rounded-lg border border-blue-100 bg-blue-50/50 p-3">
                    {pendingFiles.map((file, index) => (
                      <div key={`${file.name}-${index}`} className="flex items-center gap-2 text-xs text-gray-700">
                        <Upload className="h-3.5 w-3.5 text-blue-600" />
                        <span className="min-w-0 flex-1 truncate">{file.name}</span>
                        <span className="text-gray-400">{(file.size / 1024 / 1024).toFixed(1)} MB</span>
                        <button
                          type="button"
                          onClick={() => setPendingFiles(prev => prev.filter((_, i) => i !== index))}
                          className="text-gray-400 hover:text-red-500"
                          aria-label={`Remove ${file.name}`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {form.previousReportFiles && (
                  <div className="mt-2 space-y-1 rounded-lg border border-gray-100 bg-gray-50 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Earlier file names (not stored)</p>
                    {form.previousReportFiles.split("\n").filter(Boolean).map((file, index) => (
                      <div key={`${file}-${index}`} className="flex items-center gap-2 text-xs text-gray-700">
                        <FileText className="h-3.5 w-3.5 text-blue-600" />
                        <span className="min-w-0 flex-1 truncate">{file}</span>
                        <button
                          type="button"
                          onClick={() => set("previousReportFiles", form.previousReportFiles.split("\n").filter((_, i) => i !== index).join("\n"))}
                          className="text-gray-400 hover:text-red-500"
                          aria-label={`Remove ${file}`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </PatientFormField>

              <div className="grid gap-4 sm:grid-cols-2">
                <PatientFormField label="Pregnancy Status">
                  <select value={form.pregnancy} onChange={(e) => set("pregnancy", e.target.value)} className={inputCls()}>
                    <option value="">Select</option>
                    <option>Not Applicable</option><option>Not Pregnant</option>
                    <option>Pregnant</option><option>Postpartum</option>
                  </select>
                </PatientFormField>
                <PatientFormField label="Smoking Status">
                  <select value={form.smoking} onChange={(e) => set("smoking", e.target.value)} className={inputCls()}>
                    <option value="">Select</option>
                    <option>Non-Smoker</option><option>Ex-Smoker</option><option>Smoker</option>
                  </select>
                </PatientFormField>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-3 px-4 py-4 border-t border-gray-100 bg-gray-50/40 flex-shrink-0 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors">
            Cancel
          </button>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button onClick={() => handleSave()} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors font-medium">
              {initialPatient ? "Update Patient" : "Save Patient"}
            </button>
            {!initialPatient && <button onClick={() => handleSave(true)} className="px-4 py-2 text-sm text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors font-medium">
              Save &amp; Prescribe
            </button>}
          </div>
        </div>
      </div>
    </div>
  );
}

// CreateTemplateModal
const ALL_SECTIONS = DEFAULT_TEMPLATE_SECTIONS;

function CreateTemplateModal({ onClose, onSave }: { onClose: () => void; onSave: (t: any) => void }) {
  const [name, setName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [desc, setDesc] = useState("");
  const [sections, setSections] = useState(ALL_SECTIONS.slice(0, 7));
  const [isDefault, setIsDefault] = useState(false);
  const [error, setError] = useState("");

  const toggleSection = (s: string) =>
    setSections((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);

  const handleSave = () => {
    if (!name.trim()) { setError("Template name is required"); return; }
    onSave({ name, specialty, desc, sections, isDefault, used: 0 });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Create Template</h2>
            <p className="text-xs text-gray-500 mt-0.5">Save a reusable prescription layout</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 bg-red-100 hover:bg-red-200 text-red-600 rounded-full flex items-center justify-center transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1.5">
              Template Name <span className="text-red-500">*</span>
            </label>
            <input
              value={name}
              onChange={(e) => { setName(e.target.value); setError(""); }}
              placeholder="e.g. Cardiology Consultation"
              className={`w-full text-sm border rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${error ? "border-red-400" : "border-gray-200 focus:border-blue-400"}`}
            />
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1.5">Specialty</label>
            <select value={specialty} onChange={(e) => setSpecialty(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
              <option value="">Select specialty</option>
              {["General Physician", "Internal Medicine", "Cardiology", "Oncology", "Orthopaedic", "Paediatric", "Gynaecology", "Neurology", "Dermatology", "Custom"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1.5">Description</label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Describe this template's purpose and use case..."
              rows={3}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none focus:border-blue-400"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Prescription Sections</label>
            <p className="text-xs text-gray-400 mb-3">Choose which sections to include in this template</p>
            <div className="grid grid-cols-2 gap-1.5">
              {ALL_SECTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => toggleSection(s)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium text-left transition-all border ${
                    sections.includes(s)
                      ? "bg-blue-50 text-blue-700 border-blue-200"
                      : "text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                    sections.includes(s) ? "bg-blue-600 border-blue-600" : "border-gray-300"
                  }`}>
                    {sections.includes(s) && <Check className="w-2.5 h-2.5 text-white" />}
                  </div>
                  {s}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2">{sections.length} of {ALL_SECTIONS.length} sections selected</p>
          </div>

          <div className="pt-2 border-t border-gray-100">
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                onClick={() => setIsDefault(!isDefault)}
                className={`w-10 h-5 rounded-full relative transition-colors flex items-center px-0.5 flex-shrink-0 ${isDefault ? "bg-blue-600" : "bg-gray-300"}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${isDefault ? "translate-x-5" : "translate-x-0"}`} />
              </div>
              <span className="text-sm text-gray-700">Set as my default template for new prescriptions</span>
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50/40 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors">Cancel</button>
          <button onClick={handleSave} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors font-medium">Create Template</button>
        </div>
      </div>
    </div>
  );
}

// NewInvoiceModal
const DEFAULT_SERVICE_FEES: Record<string, string> = {
  Consultation: "1500",
  "Follow-up": "800",
};

function NewInvoiceModal({
  patients, onClose, onSave,
}: { patients: typeof EMPTY_PATIENTS; onClose: () => void; onSave: (inv: any) => void }) {
  const [patientId, setPatientId] = useState("");
  const [serviceType, setServiceType] = useState("Consultation");
  const [amount, setAmount] = useState("1500");
  const [discount, setDiscount] = useState("");
  const [method, setMethod] = useState("Cash");
  const [status, setStatus] = useState("Paid");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const total = (parseFloat(amount) || 0) - (parseFloat(discount) || 0);
  const paid = status === "Paid" ? total : status === "Partial" ? total / 2 : 0;
  const due = total - paid;

  const selectedPatient = patients.find((p) => p.id === patientId);

  const selectServiceType = (nextServiceType: string) => {
    setServiceType(nextServiceType);
    const serviceFee = DEFAULT_SERVICE_FEES[nextServiceType];
    if (serviceFee !== undefined) setAmount(serviceFee);
  };

  const handleSave = () => {
    if (!patientId) { setError("Please select a patient"); return; }
    if (!amount || isNaN(parseFloat(amount))) { setError("Please enter a valid amount"); return; }
    onSave({
      patientId,
      patient: selectedPatient?.name ?? "",
      date: new Date().toISOString().split("T")[0],
      amount: parseFloat(amount), discount: parseFloat(discount) || 0,
      paid, due, method, status, serviceType, notes,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900">New Invoice</h2>
            <p className="text-xs text-gray-500 mt-0.5">Create a billing record</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 bg-red-100 hover:bg-red-200 text-red-600 rounded-full flex items-center justify-center transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1.5">Patient <span className="text-red-500">*</span></label>
            <select value={patientId} onChange={(e) => { setPatientId(e.target.value); setError(""); }} className={`w-full text-sm border rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${!patientId && error ? "border-red-400" : "border-gray-200 focus:border-blue-400"}`}>
              <option value="">Select patient...</option>
              {patients.map((p) => <option key={p.id} value={p.id}>{p.name}  -  {p.id}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1.5">Service Type</label>
            <div className="grid grid-cols-4 gap-1.5">
              {["Consultation", "Follow-up", "Procedure", "Other"].map((s) => (
                <button type="button" key={s} onClick={() => selectServiceType(s)} aria-pressed={serviceType === s} className={`py-2 text-xs font-medium rounded-lg border transition-colors ${serviceType === s ? "bg-blue-600 text-white border-blue-600" : "text-gray-600 border-gray-200 hover:border-blue-300"}`}>{s}</button>
              ))}
            </div>
            {serviceType === "Follow-up" && <p className="mt-1.5 text-[11px] text-blue-600">Follow-up fee applied automatically: BDT 800</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1.5">Amount (BDT) <span className="text-red-500">*</span></label>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1.5">Discount (BDT)</label>
              <input type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="0" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
            </div>
          </div>

          {/* Total preview */}
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-100">
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>Subtotal</span><span>BDT {(parseFloat(amount) || 0).toLocaleString()}</span>
            </div>
            {discount && (
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>Discount</span><span className="text-green-600">-BDT {(parseFloat(discount) || 0).toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold border-t border-blue-200 pt-1.5 mt-1.5">
              <span className="text-sm text-gray-700">Total</span>
              <span className="text-lg text-gray-900">BDT {total.toLocaleString()}</span>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1.5">Payment Method</label>
            <div className="flex gap-1.5 flex-wrap">
              {["Cash", "bKash", "Nagad", "Card", "Bank Transfer"].map((m) => (
                <button key={m} onClick={() => setMethod(m)} className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${method === m ? "bg-blue-600 text-white border-blue-600" : "text-gray-600 border-gray-200 hover:border-blue-300"}`}>{m}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1.5">Payment Status</label>
            <div className="grid grid-cols-3 gap-1.5">
              {["Paid", "Partial", "Unpaid"].map((s) => (
                <button key={s} onClick={() => setStatus(s)} className={`py-2 text-xs font-medium rounded-lg border transition-colors ${
                  status === s
                    ? s === "Paid" ? "bg-green-600 text-white border-green-600"
                      : s === "Partial" ? "bg-amber-500 text-white border-amber-500"
                      : "bg-red-500 text-white border-red-500"
                    : "text-gray-600 border-gray-200 hover:border-gray-300"
                }`}>{s}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1.5">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional billing notes..." rows={2} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-none" />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50/40 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors">Cancel</button>
          <button onClick={handleSave} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors font-medium">Create Invoice</button>
        </div>
      </div>
    </div>
  );
}

// AddAppointmentModal
function AddAppointmentModal({
  patients, defaultDate, onClose, onSave,
}: { patients: typeof EMPTY_PATIENTS; defaultDate?: string; onClose: () => void; onSave: (a: any) => void }) {
  const [patientId, setPatientId] = useState("");
  const [apptType, setApptType] = useState("Consultation");
  const [date, setDate] = useState(defaultDate ?? formatDateKey(new Date()));
  const [time, setTime] = useState("09:00");
  const [duration, setDuration] = useState("30");
  const [apptStatus, setApptStatus] = useState("Confirmed");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const selectedPatient = patients.find((p) => p.id === patientId);

  const handleSave = () => {
    if (!patientId) { setError("Please select a patient"); return; }
    if (!date || !time) { setError("Please select date and time"); return; }
    const [h, m] = time.split(":");
    const hour = parseInt(h);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    const displayTime = `${String(displayHour).padStart(2, "0")}:${m} ${ampm}`;
    onSave({
      patientId,
      patient: selectedPatient?.name ?? "",
      mobile: selectedPatient?.mobile ?? "",
      age: selectedPatient?.age ?? 0,
      gender: selectedPatient?.gender ?? "",
      date,
      rawTime: time,
      time: displayTime,
      status: apptStatus,
      type: apptType,
      duration: parseInt(duration, 10),
      notes,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Add Appointment</h2>
            <p className="text-xs text-gray-500 mt-0.5">Schedule a new patient visit</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 bg-red-100 hover:bg-red-200 text-red-600 rounded-full flex items-center justify-center transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1.5">Patient <span className="text-red-500">*</span></label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <select value={patientId} onChange={(e) => { setPatientId(e.target.value); setError(""); }} className={`w-full pl-9 text-sm border rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${!patientId && error ? "border-red-400" : "border-gray-200 focus:border-blue-400"}`}>
                <option value="">Search and select patient...</option>
                {patients.map((p) => <option key={p.id} value={p.id}>{p.name}  -  {p.id}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1.5">Appointment Type</label>
            <div className="grid grid-cols-4 gap-1.5">
              {["Consultation", "Follow-up", "Emergency", "Procedure"].map((t) => (
                <button key={t} onClick={() => setApptType(t)} className={`py-2 text-xs font-medium rounded-lg border transition-colors ${apptType === t ? "bg-blue-600 text-white border-blue-600" : "text-gray-600 border-gray-200 hover:border-blue-300"}`}>{t}</button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1.5">Date <span className="text-red-500">*</span></label>
              <input type="date" value={date} onChange={(e) => { setDate(e.target.value); setError(""); }} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1.5">Time <span className="text-red-500">*</span></label>
              <input type="time" value={time} onChange={(e) => { setTime(e.target.value); setError(""); }} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1.5">Duration</label>
            <div className="grid grid-cols-4 gap-1.5">
              {[["15", "15 min"], ["30", "30 min"], ["45", "45 min"], ["60", "60 min"]].map(([val, label]) => (
                <button key={val} onClick={() => setDuration(val)} className={`py-2 text-xs font-medium rounded-lg border transition-colors ${duration === val ? "bg-blue-600 text-white border-blue-600" : "text-gray-600 border-gray-200 hover:border-blue-300"}`}>{label}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1.5">Initial Status</label>
            <div className="grid grid-cols-3 gap-1.5">
              {["Confirmed", "Waiting", "Pending"].map((s) => (
                <button key={s} onClick={() => setApptStatus(s)} className={`py-2 text-xs font-medium rounded-lg border transition-colors ${apptStatus === s ? "bg-blue-600 text-white border-blue-600" : "text-gray-600 border-gray-200 hover:border-gray-300"}`}>{s}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1.5">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Reason for visit, special instructions..." rows={3} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-none" />
          </div>

          {/* Summary card */}
          {selectedPatient && (
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
              <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-1.5">Appointment Summary</p>
              <div className="flex items-center gap-2.5 mb-2">
                <Av name={selectedPatient.name} size="sm" />
                <div>
                  <p className="text-sm font-semibold text-blue-900">{selectedPatient.name}</p>
                  <p className="text-xs text-blue-600">{selectedPatient.id}  -  {selectedPatient.age}y  -  {selectedPatient.gender}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs text-blue-700">
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{date}</span>
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{time}</span>
                <span>{duration} min  -  {apptType}</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50/40 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors">Cancel</button>
          <button onClick={handleSave} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors font-medium">Book Appointment</button>
        </div>
      </div>
    </div>
  );
}

// DASHBOARD
function DashboardView({
  nav, onAddPatient, profile, appointments, patients, prescriptions, billing,
}: {
  nav: (v: View) => void;
  onAddPatient: () => void;
  profile: DoctorProfile;
  appointments: Appointment[];
  patients: Patient[];
  prescriptions: PrescriptionSummary[];
  billing: BillingRow[];
}) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const statusColor: Record<string, string> = {
    Completed: "#10B981", "In Progress": "#0EA5E9", Waiting: "#F59E0B", Confirmed: "#2563EB", Cancelled: "#EF4444",
  };
  const statusDot: Record<string, string> = {
    Completed: "bg-emerald-400", "In Progress": "bg-cyan-400", Waiting: "bg-amber-400", Confirmed: "bg-blue-500", Cancelled: "bg-red-400",
  };

  const doctorGreeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";
  const todayKey = formatDateKey(new Date());
  const monthKey = todayKey.slice(0, 7);
  const todayAppointments = appointments.filter(apt => apt.date === todayKey);
  const completedToday = todayAppointments.filter(apt => apt.status === "Completed").length;
  const pendingToday = todayAppointments.filter(apt => !["Completed", "Cancelled"].includes(apt.status)).length;
  const completionRate = todayAppointments.length ? Math.round((completedToday / todayAppointments.length) * 100) : 0;
  const monthlyPrescriptions = prescriptions.filter(rx => (rx.date ?? "").startsWith(monthKey)).length;
  const followUpsDue = prescriptions.filter(rx => rx.followUpDate && rx.followUpDate <= todayKey).length;
  const monthRevenue = billing
    .filter(inv => (inv.date ?? "").startsWith(monthKey))
    .reduce((sum, inv) => sum + Number(inv.paid || 0), 0);
  const clinicPulseStatus = pendingToday > 0 ? "Active" : todayAppointments.length > 0 ? "Complete" : "Quiet";
  const formatBdt = (value: number) => `BDT ${value.toLocaleString()}`;
  const malePatients = patients.filter(patient => patient.gender?.toLowerCase().startsWith("m")).length;
  const femalePatients = patients.filter(patient => patient.gender?.toLowerCase().startsWith("f")).length;
  const genderData = [
    { name: "Male", value: patients.length ? Math.round((malePatients / patients.length) * 100) : 0, color: "#2563EB" },
    { name: "Female", value: patients.length ? Math.round((femalePatients / patients.length) * 100) : 0, color: "#0EA5E9" },
    { name: "Other", value: patients.length ? Math.max(0, 100 - Math.round((malePatients / patients.length) * 100) - Math.round((femalePatients / patients.length) * 100)) : 0, color: "#10B981" },
  ].filter(item => item.value > 0 || (patients.length === 0 && item.name !== "Other"));
  const lastSixMonths = Array.from({ length: 6 }, (_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - index), 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    return { key, label: date.toLocaleDateString("en-US", { month: "short" }) };
  });
  const patientStats = lastSixMonths.map(month => ({
    month: month.label,
    new: patients.filter(patient => (patient.lastVisit ?? "").startsWith(month.key)).length,
    returning: patients.filter(patient => (patient.lastVisit ?? "").startsWith(month.key) && patient.totalVisits > 1).length,
  }));
  const monthlyRxData = lastSixMonths.map(month => ({
    month: month.label,
    prescriptions: prescriptions.filter(rx => (rx.date ?? "").startsWith(month.key)).length,
  }));
  const recentPrescriptions: Array<{ patient: string; id: string; diagnosis: string; cycle: string; date: string; status: string }> = [];
  const nextAppointments: Array<{ time: string; patient: string; type: string; tone: string }> = [];
  const dashboardMetrics = [
    { label: "Today's Patients", sub: "Scheduled consultations", value: todayAppointments.length.toString(), tag: "Today", icon: Calendar, color: "#2563EB", tagClass: "bg-slate-100 text-slate-600", trend: `${pendingToday} pending` },
    { label: "Patients Seen", sub: "Consultations completed", value: completedToday.toString(), tag: `${completionRate}%`, icon: ClipboardList, color: "#06B64B", tagClass: "bg-emerald-50 text-emerald-700", trend: "from appointments" },
    { label: "Patients Remaining", sub: "Awaiting consultation", value: pendingToday.toString(), tag: "Pending", icon: Clock, color: "#F28A00", tagClass: "bg-orange-50 text-orange-700", trend: todayAppointments.length ? "today" : "No schedule" },
  ];
  const carePipeline: Array<{ label: string; value: number; color: string }> = [
    { label: "Confirmed", value: todayAppointments.length ? Math.round((todayAppointments.filter(a => a.status === "Confirmed").length / todayAppointments.length) * 100) : 0, color: "#2563EB" },
    { label: "Waiting", value: todayAppointments.length ? Math.round((todayAppointments.filter(a => a.status === "Waiting").length / todayAppointments.length) * 100) : 0, color: "#F59E0B" },
    { label: "In Progress", value: todayAppointments.length ? Math.round((todayAppointments.filter(a => a.status === "In Progress").length / todayAppointments.length) * 100) : 0, color: "#0EA5E9" },
    { label: "Completed", value: completionRate, color: "#10B981" },
  ];
  const downloadPrescription = (rx: typeof recentPrescriptions[number]) => {
    const content = [
      "Renata Cancer Care",
      `Prescription: ${rx.id}`,
      `Patient: ${rx.patient}`,
      `Diagnosis: ${rx.diagnosis}`,
      `Cycle: ${rx.cycle}`,
      `Date: ${rx.date}`,
      `Status: ${rx.status}`,
    ].join("\n");
    downloadTextFile(`${rx.id}.txt`, content);
  };

  return (
    <div className="dashboard-view mx-auto w-full max-w-[1280px] px-4 py-5 sm:px-5 sm:py-7 lg:px-8 space-y-5 sm:space-y-7">
      <section className="premium-hero relative z-0 overflow-hidden rounded-[24px] px-5 py-6 text-blue-800 sm:px-8 sm:py-8">
        <div className="absolute inset-0 opacity-70" style={{ background: "radial-gradient(circle at 82% 18%, rgba(191,219,254,0.64), transparent 16rem)" }} />
        <div className="relative grid gap-6 lg:grid-cols-[1fr_360px] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/80 px-3 py-1 text-xs font-bold text-blue-700 backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Live oncology command center
            </div>
            <h1 className="mt-5 max-w-3xl text-[2rem] font-bold leading-tight sm:text-4xl" style={{ fontFamily: "var(--font-display)" }}>
              {doctorGreeting}, {profile.name}
            </h1>
            <p className="mt-3 flex items-center gap-2 text-base font-medium text-blue-700">
              <Stethoscope className="w-4 h-4 text-cyan-600" />
              {profile.specialty}
            </p>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">
              Prioritize high-risk patients, review active prescriptions, and move consultations forward from a single polished clinical workspace.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button onClick={() => nav("create-prescription")} className="premium-action inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700">
                <FilePlus className="h-4 w-4" /> New Prescription
              </button>
              <button onClick={onAddPatient} className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-white/80 px-4 py-2.5 text-sm font-bold text-blue-700 backdrop-blur hover:bg-blue-50">
                <Users className="h-4 w-4" /> Add Patient
              </button>
              <button onClick={() => nav("appointments")} className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-white/80 px-4 py-2.5 text-sm font-bold text-blue-700 backdrop-blur hover:bg-blue-50">
                <Calendar className="h-4 w-4" /> View Schedule
              </button>
            </div>
          </div>
          <div className="rounded-2xl border border-blue-200 bg-white/80 p-5 backdrop-blur-xl shadow-[0_18px_48px_rgba(37,99,235,0.10)]">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-blue-800">Clinic Pulse</p>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">{clinicPulseStatus}</span>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {[
                ["Today", todayAppointments.length.toString()],
                ["Finalized", `${completionRate}%`],
                ["Due follow-up", followUpsDue.toString()],
                ["Revenue", formatBdt(monthRevenue)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-blue-50/80 p-3 ring-1 ring-blue-100">
                  <p className="text-[11px] font-medium text-blue-600">{label}</p>
                  <p className="mt-1 text-2xl font-bold text-blue-800">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
        {dashboardMetrics.map((metric) => (
          <div key={metric.label} className="premium-card min-h-[150px] sm:min-h-[180px] rounded-[18px] p-5 sm:p-6">
            <div className="flex items-start justify-between">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-[14px] flex items-center justify-center text-white shadow-lg" style={{ background: metric.color }}>
                <metric.icon className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${metric.tagClass}`}>{metric.tag}</span>
            </div>
            <p className="mt-4 sm:mt-5 text-3xl sm:text-4xl font-bold text-slate-950 leading-none" style={{ fontFamily: "var(--font-display)" }}>{metric.value}</p>
            <p className="mt-3 text-sm font-bold text-slate-800">{metric.label}</p>
            <div className="mt-1 flex items-center justify-between gap-3">
              <p className="text-sm text-slate-500">{metric.sub}</p>
              <span className="text-xs font-bold text-slate-400">{metric.trend}</span>
            </div>
          </div>
        ))}
      </section>

      <section className="premium-surface rounded-[20px] p-5 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-950" style={{ fontFamily: "var(--font-display)" }}>Care Journey Health</h2>
            <p className="text-sm text-slate-500">Real-time flow across today&apos;s oncology pipeline</p>
          </div>
          <button onClick={() => nav("reports")} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700">
            Open Analytics <ArrowRight className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-4">
          {carePipeline.map((stage) => (
            <div key={stage.label} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-slate-800">{stage.label}</p>
                <p className="text-sm font-bold" style={{ color: stage.color }}>{stage.value}%</p>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                <div className="h-full rounded-full" style={{ width: `${stage.value}%`, background: stage.color }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="premium-surface rounded-[20px] overflow-hidden">
        <div className="flex items-center justify-between gap-4 px-4 py-5 sm:px-6 sm:py-6">
          <h2 className="text-lg sm:text-xl font-bold text-slate-950" style={{ fontFamily: "var(--font-display)" }}>Recent Prescriptions</h2>
          <button onClick={() => nav("prescription-history")} className="flex items-center gap-1 text-sm font-bold text-[#004E89] hover:text-blue-700">
            View All <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left">
            <thead className="bg-slate-50 border-y border-slate-200">
              <tr>
                {["Patient", "Diagnosis", "Cycle", "Date", "Status", "Actions"].map((head) => (
                  <th key={head} className="px-6 py-4 text-xs font-bold uppercase tracking-wide text-slate-700">{head}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentPrescriptions.map((rx) => (
                <tr key={rx.id} className="premium-table-row">
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-[#004E89]">{rx.patient}</p>
                    <p className="text-xs text-slate-500">{rx.id}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-950">{rx.diagnosis}</td>
                  <td className="px-6 py-4">
                    <span className="rounded-md bg-blue-50 px-2 py-1 text-sm text-[#004E89]">{rx.cycle}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-700">{rx.date}</td>
                  <td className="px-6 py-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${rx.status === "Finalized" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                      {rx.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4 text-slate-500">
                      <button type="button" onClick={() => nav("prescription-history")} className="hover:text-[#004E89]" title="View"><Eye className="w-4 h-4" /></button>
                      <button type="button" onClick={() => downloadPrescription(rx)} className="hover:text-[#004E89]" title="Download"><Download className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="premium-surface rounded-[20px] overflow-hidden">
        <div className="px-4 py-5 sm:px-6 sm:py-6 border-b border-slate-200">
          <h2 className="text-lg sm:text-xl font-bold text-slate-950" style={{ fontFamily: "var(--font-display)" }}>Next Appointments</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 p-4 sm:p-6">
          {nextAppointments.map((apt) => (
            <button
              key={apt.time}
              onClick={() => apt.patient === "New Patient" ? onAddPatient() : nav("appointments")}
              className={`flex items-center gap-3 sm:gap-4 rounded-xl border p-4 sm:p-5 text-left transition-all hover:-translate-y-0.5 ${
                apt.tone === "amber"
                  ? "bg-amber-50/60 border-amber-300 hover:bg-amber-50"
                  : "bg-blue-50/70 border-blue-200 hover:bg-blue-50"
              }`}
            >
              <span className={`w-11 h-11 sm:w-12 sm:h-12 rounded-[14px] flex items-center justify-center text-white shadow-md ${apt.tone === "amber" ? "bg-[#F28A00]" : "bg-[#2563EB]"}`}>
                <Clock className="w-5 h-5 sm:w-6 sm:h-6" />
              </span>
              <span>
                <span className={`block text-lg font-bold ${apt.tone === "amber" ? "text-amber-950" : "text-blue-900"}`}>{apt.time}</span>
                <span className={`block text-sm font-bold ${apt.tone === "amber" ? "text-orange-800" : "text-blue-800"}`}>{apt.patient}</span>
                <span className={`block text-xs ${apt.tone === "amber" ? "text-orange-700" : "text-blue-700"}`}>{apt.type}</span>
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 space-y-5">

      {/* Welcome Hero */}
      <div className="relative overflow-hidden rounded-2xl p-7 text-blue-800" style={{ background: "linear-gradient(135deg,#FFFFFF 0%,#EFF6FF 55%,#DBEAFE 100%)" }}>
        {/* Decorative glows */}
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10 pointer-events-none" style={{ background: "radial-gradient(circle,#60A5FA,transparent)", transform: "translate(30%,-30%)" }} />
        <div className="absolute bottom-0 left-1/3 w-48 h-48 rounded-full opacity-5 pointer-events-none" style={{ background: "radial-gradient(circle,#38BDF8,transparent)", transform: "translateY(40%)" }} />

        <div className="relative flex items-center justify-between">
          <div>
            <p className="text-blue-300 text-sm font-medium mb-1">{greeting} </p>
            <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}>
              {profile.name || "Doctor"}
            </h1>
            <p className="text-blue-300 text-sm">{[profile.qualifications, profile.specialty, profile.clinic].filter(Boolean).join("  -  ")}</p>
            <p className="text-blue-400 text-xs mt-1">
              {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>

          {/* Mini stats strip */}
          <div className="hidden lg:flex items-center gap-px rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>
            {[
              { label: "Today", value: todayAppointments.length.toString(), sub: "appointments" },
              { label: "Completed", value: completedToday.toString(), sub: "seen today" },
              { label: "Pending", value: pendingToday.toString(), sub: "waiting" },
              { label: "This month", value: monthlyPrescriptions.toString(), sub: "prescriptions" },
            ].map((s, i) => (
              <div key={s.label} className="px-6 py-4 text-center" style={{ borderLeft: i > 0 ? "1px solid rgba(255,255,255,0.1)" : "none" }}>
                <p className="text-xl font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>{s.value}</p>
                <p className="text-[10px] text-blue-300 font-medium uppercase tracking-wide">{s.label}</p>
                <p className="text-[10px] text-blue-400">{s.sub}</p>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-2">
            <button onClick={onAddPatient} className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl transition-all" style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff" }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.22)") }
              onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.15)")}
            >
              <Plus className="w-4 h-4" />Add Patient
            </button>
            <button onClick={() => nav("create-prescription")} className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl transition-all text-white" style={{ background: "linear-gradient(135deg,#2563EB,#1D4ED8)", boxShadow: "0 4px 14px rgba(37,99,235,0.5)" }}>
              <FilePlus className="w-4 h-4" />Prescribe
            </button>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Patients" value={patients.length.toLocaleString()} change="Database" icon={Users} iconClass="bg-blue-50 text-blue-600" trend="neutral" accent="linear-gradient(90deg,#2563EB,#3B82F6)" />
        <StatCard title="Prescriptions" value={prescriptions.length.toLocaleString()} change={`${monthlyPrescriptions} this month`} icon={FileText} iconClass="bg-cyan-50 text-cyan-600" trend="neutral" accent="linear-gradient(90deg,#0EA5E9,#38BDF8)" />
        <StatCard title="Today's Appointments" value={todayAppointments.length.toString()} change={`${pendingToday} remaining`} icon={Calendar} iconClass="bg-emerald-50 text-emerald-600" trend="neutral" accent="linear-gradient(90deg,#10B981,#34D399)" />
        <StatCard title="Pending Patients" value={pendingToday.toString()} change="today" icon={Clock} iconClass="bg-amber-50 text-amber-600" trend="neutral" accent="linear-gradient(90deg,#F59E0B,#FBBF24)" />
      </div>

      {/* Charts + Gender + Actions row */}
      <div className="grid grid-cols-12 gap-4">

        {/* Patient trend chart - 7 cols */}
        <div className="col-span-7 rounded-2xl p-5" style={{ background: "#fff", border: "1px solid #DDE3ED", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
          <div className="flex items-start justify-between mb-5">
            <div>
              <h3 className="text-sm font-bold text-gray-900" style={{ fontFamily: "var(--font-display)" }}>Patient Growth</h3>
              <p className="text-xs text-gray-400 mt-0.5">New vs returning patients over time</p>
            </div>
            <div className="flex items-center gap-1 p-0.5 rounded-xl" style={{ background: "#F1F5F9" }}>
              {["6M", "1Y"].map(t => (
                <button key={t} className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${t === "6M" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>{t}</button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={195}>
            <AreaChart data={patientStats} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="dash-new" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563EB" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="dash-ret" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0EA5E9" stopOpacity={0.12} />
                  <stop offset="100%" stopColor="#0EA5E9" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94A3B8", fontFamily: "Inter" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94A3B8", fontFamily: "Inter" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 12, border: "1px solid #E2E8F0", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", background: "#fff" }}
                cursor={{ stroke: "#E2E8F0", strokeWidth: 1 }}
              />
              <Area type="monotone" dataKey="new" stroke="#2563EB" strokeWidth={2.5} fill="url(#dash-new)" name="New Patients" dot={false} activeDot={{ r: 4, fill: "#2563EB", stroke: "#fff", strokeWidth: 2 }} />
              <Area type="monotone" dataKey="returning" stroke="#0EA5E9" strokeWidth={2.5} fill="url(#dash-ret)" name="Returning" dot={false} activeDot={{ r: 4, fill: "#0EA5E9", stroke: "#fff", strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-5 mt-3 pt-3" style={{ borderTop: "1px solid #F1F5F9" }}>
            {[{ color: "#2563EB", label: "New Patients", val: "+68" }, { color: "#0EA5E9", label: "Returning", val: "+108" }].map(l => (
              <div key={l.label} className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: l.color }} />
                <span className="text-xs text-gray-500">{l.label}</span>
                <span className="text-xs font-bold text-gray-900 ml-1">{l.val} this month</span>
              </div>
            ))}
          </div>
        </div>

        {/* Gender donut + Monthly Rx stacked - 3 cols */}
        <div className="col-span-3 flex flex-col gap-4">
          {/* Gender donut */}
          <div className="flex-1 rounded-2xl p-5" style={{ background: "#fff", border: "1px solid #DDE3ED", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
            <h3 className="text-sm font-bold text-gray-900 mb-0.5" style={{ fontFamily: "var(--font-display)" }}>Gender Split</h3>
            <p className="text-xs text-gray-400 mb-2">All-time patient base</p>
            <ResponsiveContainer width="100%" height={120}>
              <PieChart>
                <Pie data={genderData} cx="50%" cy="50%" innerRadius={36} outerRadius={54} paddingAngle={4} dataKey="value" strokeWidth={0}>
                  {genderData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip formatter={v => [`${v}%`, ""]} contentStyle={{ fontSize: 11, borderRadius: 10, border: "1px solid #E2E8F0" }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 mt-2">
              {genderData.map(g => (
                <div key={g.name} className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs text-gray-500">
                    <span className="w-2 h-2 rounded-full" style={{ background: g.color }} />
                    {g.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-1.5 rounded-full" style={{ width: `${g.value}%`, background: g.color }} />
                    </div>
                    <span className="text-xs font-bold text-gray-800 w-7 text-right">{g.value}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Monthly Rx mini bar */}
          <div className="rounded-2xl p-5" style={{ background: "#fff", border: "1px solid #DDE3ED", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
            <h3 className="text-sm font-bold text-gray-900 mb-0.5" style={{ fontFamily: "var(--font-display)" }}>Rx Volume</h3>
            <p className="text-xs text-gray-400 mb-3">Monthly prescriptions</p>
            <ResponsiveContainer width="100%" height={90}>
              <BarChart data={monthlyRxData} barSize={18} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                <XAxis dataKey="month" tick={{ fontSize: 9, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 10, border: "1px solid #E2E8F0" }} />
                <Bar dataKey="prescriptions" radius={[3, 3, 0, 0]} name="Prescriptions">
                  {monthlyRxData.map((_, i) => (
                    <Cell key={i} fill={i === monthlyRxData.length - 1 ? "#2563EB" : "#DBEAFE"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-gray-400">{lastSixMonths.at(-1)?.label} {new Date().getFullYear()}</span>
              <span className="text-sm font-bold text-blue-600">{monthlyPrescriptions} Rx</span>
            </div>
          </div>
        </div>

        {/* Quick actions - 2 cols */}
        <div className="col-span-2 rounded-2xl p-4 flex flex-col gap-2" style={{ background: "#fff", border: "1px solid #DDE3ED", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
          <h3 className="text-xs font-bold text-gray-900 mb-2 px-1" style={{ fontFamily: "var(--font-display)" }}>Quick Actions</h3>
          {[
            { label: "Add Patient", icon: Users, grad: "linear-gradient(135deg,#2563EB,#3B82F6)", action: onAddPatient },
            { label: "Prescribe", icon: FilePlus, grad: "linear-gradient(135deg,#10B981,#34D399)", action: () => nav("create-prescription") },
            { label: "Appointment", icon: Calendar, grad: "linear-gradient(135deg,#F59E0B,#FBBF24)", action: () => nav("appointments") },
            { label: "Reports", icon: BarChart2, grad: "linear-gradient(135deg,#8B5CF6,#A78BFA)", action: () => nav("reports") },
            { label: "Billing", icon: CreditCard, grad: "linear-gradient(135deg,#0EA5E9,#38BDF8)", action: () => nav("billing") },
          ].map(a => (
            <button key={a.label} onClick={a.action}
              className="flex flex-col items-center gap-2 py-3 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: "#F8FAFC", border: "1px solid #F1F5F9" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#F1F5F9")}
              onMouseLeave={e => (e.currentTarget.style.background = "#F8FAFC")}
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white" style={{ background: a.grad, boxShadow: "0 3px 10px rgba(0,0,0,0.18)" }}>
                <a.icon className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-semibold text-gray-600 text-center leading-tight">{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Today's Appointments */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "#fff", border: "1px solid #DDE3ED", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid #F1F5F9" }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#EFF6FF,#DBEAFE)" }}>
              <Calendar className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900" style={{ fontFamily: "var(--font-display)" }}>Today's Appointments</h3>
              <p className="text-xs text-gray-400">{new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}  -  {appointments.length} scheduled</p>
            </div>
            {/* Progress pills */}
            <div className="hidden lg:flex items-center gap-2 ml-4">
              {[
                { label: "Done", count: 2, color: "bg-emerald-50 text-emerald-700" },
                { label: "Active", count: 1, color: "bg-cyan-50 text-cyan-700" },
                { label: "Waiting", count: 2, color: "bg-amber-50 text-amber-700" },
                { label: "Upcoming", count: 3, color: "bg-blue-50 text-blue-700" },
              ].map(p => (
                <span key={p.label} className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full ${p.color}`}>{p.count} {p.label}</span>
              ))}
            </div>
          </div>
          <button onClick={() => nav("appointments")} className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors px-3 py-1.5 rounded-lg hover:bg-blue-50">
            View All <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Appointment cards */}
        <div className="divide-y" style={{ borderColor: "#F8FAFC" }}>
          {appointments.map((apt) => (
            <div key={apt.id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-slate-50/70 transition-colors group">
              {/* Serial */}
              <div className="w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0" style={{ background: "#F1F5F9", color: "#475569" }}>
                {apt.serial}
              </div>

              {/* Status line */}
              <div className="w-1 h-10 rounded-full flex-shrink-0" style={{ background: statusColor[apt.status] ?? "#E2E8F0", opacity: 0.6 }} />

              {/* Avatar + name */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Av name={apt.patient} size="md" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{apt.patient}</p>
                  <p className="text-xs text-gray-400 truncate">{apt.mobile}  -  {apt.age}y  -  {apt.gender}</p>
                </div>
              </div>

              {/* Time */}
              <div className="hidden sm:flex items-center gap-1.5 text-sm text-gray-600 flex-shrink-0 w-28">
                <Clock className="w-3.5 h-3.5 text-gray-400" />
                <span className="font-medium">{apt.time}</span>
              </div>

              {/* Status badge */}
              <div className="flex-shrink-0 w-28 flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDot[apt.status] ?? "bg-gray-300"} ${apt.status === "In Progress" ? "animate-pulse" : ""}`} />
                <StatusBadge status={apt.status} />
              </div>

              {/* Actions - appear on hover */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                <button onClick={() => nav("create-prescription")} title="Prescribe"
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-white rounded-lg transition-all"
                  style={{ background: "linear-gradient(135deg,#2563EB,#1D4ED8)" }}>
                  <FilePlus className="w-3 h-3" />Rx
                </button>
                <button className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
                  <Eye className="w-3.5 h-3.5" />
                </button>
                <button className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
                  <MoreVertical className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// PATIENT PROFILE MODAL
function PatientReportsPanel({ patientId }: { patientId: string }) {
  const [files, setFiles] = useState<PatientReportFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    reportFilesApi.list(patientId)
      .then(list => { if (!cancelled) setFiles(list); })
      .catch(err => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [patientId]);

  const upload = async (list: FileList | null) => {
    if (!list?.length) return;
    setUploading(true);
    setError("");
    const errors: string[] = [];
    for (const file of Array.from(list)) {
      if (!REPORT_FILE_TYPES.includes(file.type) || file.size > REPORT_FILE_MAX_BYTES) {
        errors.push(`${file.name}: only PDF, JPG, PNG, WEBP up to 20 MB`);
        continue;
      }
      try {
        const saved = await reportFilesApi.upload(patientId, file);
        setFiles(prev => [saved, ...prev]);
      } catch (err) {
        errors.push(`${file.name}: ${(err as Error).message}`);
      }
    }
    setError(errors.join("; "));
    setUploading(false);
  };

  const remove = async (file: PatientReportFile) => {
    if (!window.confirm(`Delete "${file.name}"? This cannot be undone.`)) return;
    try {
      await reportFilesApi.remove(file.id);
      setFiles(prev => prev.filter(item => item.id !== file.id));
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Upload className="h-4 w-4 text-blue-600" />
        <p className="flex-1 text-sm font-semibold text-gray-900">Report Files</p>
        <label className={`cursor-pointer rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 ${uploading ? "pointer-events-none opacity-60" : ""}`}>
          {uploading ? "Uploading..." : "Upload"}
          <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden" onChange={e => { upload(e.target.files); e.target.value = ""; }} />
        </label>
      </div>
      {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
      {loading ? (
        <p className="text-xs text-gray-400">Loading reports...</p>
      ) : files.length === 0 ? (
        <p className="text-xs text-gray-400">No report files uploaded yet</p>
      ) : (
        <div className="space-y-1.5">
          {files.map(file => (
            <div key={file.id} className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-700">
              <FileText className="h-3.5 w-3.5 flex-shrink-0 text-blue-600" />
              <span className="min-w-0 flex-1 truncate" title={file.name}>{file.name}</span>
              <span className="hidden text-gray-400 sm:inline">{file.uploadedAt.slice(0, 10)}  -  {(file.size / 1024 / 1024).toFixed(1)} MB</span>
              <a href={reportFilesApi.fileUrl(file.id)} target="_blank" rel="noopener noreferrer" className="rounded p-1 text-blue-600 hover:bg-blue-100" title="View"><Eye className="h-3.5 w-3.5" /></a>
              <a href={reportFilesApi.fileUrl(file.id, true)} className="rounded p-1 text-gray-500 hover:bg-gray-200" title="Download"><Download className="h-3.5 w-3.5" /></a>
              <button onClick={() => remove(file)} className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600" title="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PatientProfileModal({ patient, prescriptions, onEdit, onPrescribe, onClose }: {
  patient: typeof EMPTY_PATIENTS[0];
  prescriptions: typeof EMPTY_PRESCRIPTIONS;
  onEdit: () => void;
  onPrescribe: () => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"overview" | "prescriptions" | "appointments">("overview");
  const [viewingRx, setViewingRx] = useState<typeof EMPTY_PRESCRIPTIONS[0] | null>(null);
  const rxList = prescriptions.filter(rx => rx.patient === patient.name);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-t-2xl shadow-2xl w-full max-h-[92vh] flex flex-col sm:max-w-2xl sm:rounded-2xl sm:max-h-[90vh]">

        {/* Header */}
        <div className="flex flex-col gap-4 px-4 py-4 border-b border-gray-100 flex-shrink-0 sm:flex-row sm:items-start sm:px-6 sm:py-5">
          <Av name={patient.name} size="lg" />
          <div className="flex-1 min-w-0">
            <h2 className="truncate text-lg font-bold text-gray-900">{patient.name}</h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{patient.id}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${patient.gender === "Male" ? "bg-blue-50 text-blue-700" : "bg-pink-50 text-pink-700"}`}>{patient.gender}</span>
              <span className="text-xs font-bold px-2 py-0.5 bg-red-50 text-red-700 rounded">{patient.bloodGroup}</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">{patient.mobile}  -  {patient.age} years old</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={onEdit} className="flex flex-1 items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors sm:flex-none sm:py-1.5">
              <Edit className="w-3.5 h-3.5" />Edit
            </button>
            <button onClick={onPrescribe} className="flex flex-1 items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors sm:flex-none sm:py-1.5">
              <FilePlus className="w-3.5 h-3.5" />Prescribe
            </button>
            <button onClick={onClose} className="w-8 h-8 bg-red-100 hover:bg-red-200 text-red-600 rounded-full flex items-center justify-center transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 border-b border-gray-100 flex-shrink-0 sm:grid-cols-4">
          {[
            { label: "Total Visits", value: String(patient.totalVisits) },
            { label: "Last Visit", value: patient.lastVisit },
            { label: "Prescriptions", value: String(rxList.length) },
            { label: "Status", value: "Active" },
          ].map(s => (
            <div key={s.label} className="px-3 py-3 text-center border-r border-b border-gray-100 even:border-r-0 last:border-r-0 sm:border-b-0 sm:even:border-r sm:px-6 sm:py-3.5">
              <p className="text-base font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto border-b border-gray-100 px-4 flex-shrink-0 sm:px-6">
          {[["overview", "Overview"], ["prescriptions", "Prescriptions"], ["appointments", "Appointments"]].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id as any)} className={`px-4 py-3 text-xs font-semibold border-b-2 transition-colors ${tab === id ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>{label}</button>
          ))}
        </div>

        {/* Tab body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {tab === "overview" && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { label: "Patient ID", value: patient.id },
                  { label: "Full Name", value: patient.name },
                  { label: "Mobile Number", value: patient.mobile },
                  { label: "Age", value: `${patient.age} years` },
                  { label: "Gender", value: patient.gender },
                  { label: "Blood Group", value: patient.bloodGroup },
                  { label: "Last Visit", value: patient.lastVisit },
                  { label: "Total Visits", value: `${patient.totalVisits} visits` },
                ].map(f => (
                  <div key={f.label} className="bg-gray-50 rounded-xl p-3.5">
                    <p className="text-xs text-gray-500 mb-0.5">{f.label}</p>
                    <p className="text-sm font-semibold text-gray-900">{f.value}</p>
                  </div>
                ))}
              </div>
              {(patient.previousReports || patient.previousReportFiles) && (
                <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-600" />
                    <p className="text-sm font-semibold text-blue-900">Previous Medical Reports</p>
                  </div>
                  {patient.previousReports && (
                    <p className="whitespace-pre-line text-sm leading-relaxed text-gray-700">{patient.previousReports}</p>
                  )}
                  {patient.previousReportFiles && (
                    <div className="mt-3 space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700/70">Earlier file names (not stored)</p>
                      {patient.previousReportFiles.split("\n").filter(Boolean).map((file, index) => (
                        <div key={`${file}-${index}`} className="flex items-center gap-2 rounded-lg bg-white/80 px-3 py-2 text-xs text-gray-700">
                          <FileText className="h-3.5 w-3.5 text-blue-600" />
                          <span className="min-w-0 flex-1 truncate">{file}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {patient.familyHistory && (
                <div className="rounded-xl border border-gray-200 p-4">
                  <p className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-gray-900">Family History <SourceLink ids={["famhx"]} /></p>
                  <p className="whitespace-pre-line text-sm text-gray-700">{patient.familyHistory}</p>
                </div>
              )}
              <PatientReportsPanel patientId={patient.id} />
            </div>
          )}

          {tab === "prescriptions" && (
            <div className="space-y-2">
              {rxList.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-sm font-medium text-gray-500">No prescriptions yet</p>
                  <button onClick={onPrescribe} className="mt-3 flex items-center gap-1.5 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors mx-auto">
                    <FilePlus className="w-4 h-4" />Create First Prescription
                  </button>
                </div>
              ) : rxList.map(rx => (
                <div key={rx.id} className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/20 transition-all group">
                  <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono text-gray-400">{rx.id}</p>
                    <p className="text-sm font-semibold text-gray-900">{rx.diagnosis}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{rx.date}  -  {rx.medicines} medicines</p>
                  </div>
                  <StatusBadge status={rx.status} />
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setViewingRx(rx)}
                      className="p-1.5 hover:bg-blue-100 rounded-md text-blue-600 transition-colors"
                      title="View prescription"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => { setViewingRx(rx); setTimeout(printPrescription, 300); }} className="p-1.5 hover:bg-gray-200 rounded-md text-gray-500 transition-colors" title="Print"><Printer className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "appointments" && (
            <div className="text-center py-12">
              <Calendar className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-500">No appointments recorded</p>
              <p className="text-xs text-gray-400 mt-1">Appointments booked by this patient will appear here</p>
            </div>
          )}
        </div>

        {viewingRx && <PrescriptionViewModal rx={viewingRx} onClose={() => setViewingRx(null)} />}
      </div>
    </div>
  );
}

// PATIENTS
function PatientsView({ nav, patients, prescriptions, onAddPatient, onEditPatient, onPrescribePatient, onDeletePatient, showToast }: {
  nav: (v: View) => void;
  patients: typeof EMPTY_PATIENTS;
  prescriptions: typeof EMPTY_PRESCRIPTIONS;
  onAddPatient: () => void;
  onEditPatient: (patient: typeof EMPTY_PATIENTS[0]) => void;
  onPrescribePatient: (patientId: string) => void;
  onDeletePatient: (id: string) => void;
  showToast: (msg: string) => void;
}) {
  const PAGE_SIZE = 8;

  // Search & filter state
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filterGender, setFilterGender] = useState<string[]>([]);
  const [filterBG, setFilterBG] = useState<string[]>([]);
  const [filterDisease, setFilterDisease] = useState<string[]>([]);
  const diseaseGroups = useMemo(() => buildDiseaseGroups(patients), [patients]);

  // Sort state
  const [sortBy, setSortBy] = useState("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Pagination
  const [page, setPage] = useState(1);

  // Modals
  const [viewingPatient, setViewingPatient] = useState<typeof EMPTY_PATIENTS[0] | null>(null);
  const [archiveId, setArchiveId] = useState<string | null>(null);

  // Row dropdown
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!openMenu) return;
    const h = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenu(null); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [openMenu]);

  // Derived data
  const filtered = patients.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !q || p.name.toLowerCase().includes(q) || p.mobile.includes(search) || p.id.toLowerCase().includes(q)
      || diseaseLabelOf(p).toLowerCase().includes(q);
    const matchGender = filterGender.length === 0 || filterGender.includes(p.gender);
    const matchBG = filterBG.length === 0 || filterBG.includes(p.bloodGroup);
    const matchDisease = filterDisease.length === 0 || filterDisease.includes(diseaseKeyOf(p));
    return matchSearch && matchGender && matchBG && matchDisease;
  });

  const sorted = [...filtered].sort((a, b) => {
    const value = (p: Patient) => sortBy === "disease" ? diseaseLabelOf(p) : (p as any)[sortBy];
    const av = value(a); const bv = value(b);
    const d = sortDir === "asc" ? 1 : -1;
    return typeof av === "number" ? (av - bv) * d : String(av).localeCompare(String(bv)) * d;
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paged = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const activeFilters = filterGender.length + filterBG.length + filterDisease.length;

  const handleSort = (col: string) => {
    if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("asc"); }
    setPage(1);
  };

  const SortIndicator = ({ col }: { col: string }) =>
    sortBy === col
      ? <span className="text-blue-600">{sortDir === "asc" ? "  up" : "  down"}</span>
      : <span className="text-gray-300 opacity-60">  sort</span>;

  const toggleGender = (g: string) => { setFilterGender(p => p.includes(g) ? p.filter(x => x !== g) : [...p, g]); setPage(1); };
  const toggleBG = (bg: string) => { setFilterBG(p => p.includes(bg) ? p.filter(x => x !== bg) : [...p, bg]); setPage(1); };
  const toggleDisease = (key: string) => { setFilterDisease(p => p.includes(key) ? p.filter(x => x !== key) : [...p, key]); setPage(1); };
  const clearFilters = () => { setFilterGender([]); setFilterBG([]); setFilterDisease([]); setPage(1); };

  const exportCSV = () => {
    const hdr = ["Patient ID", "Name", "Mobile", "Age", "Gender", "Blood Group", "Last Visit", "Total Visits"];
    const rows = filtered.map(p => [p.id, `"${p.name}"`, p.mobile, p.age, p.gender, p.bloodGroup, p.lastVisit, p.totalVisits]);
    const csv = [hdr, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "patients.csv"; a.click();
    URL.revokeObjectURL(url);
    showToast(`${filtered.length} patients exported to CSV`);
  };

  return (
    <div className="p-6 space-y-5">

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">My Patients</h1>
            <p className="text-sm text-gray-500 mt-0.5">{patients.length} patients registered</p>
          </div>
          <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-200">{filtered.length}</span>
        </div>
        <button onClick={onAddPatient} className="flex w-full items-center justify-center gap-2 px-4 py-2.5 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm sm:w-auto sm:py-2">
          <Plus className="w-4 h-4" />Add New Patient
        </button>
      </div>

      {/* Search + toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:flex-1 sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name, mobile, or patient ID..."
            className="w-full pl-9 pr-9 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white"
          />
          {search && (
            <button onClick={() => { setSearch(""); setPage(1); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="relative flex gap-2 sm:block">
          <button
            onClick={() => setShowFilters(f => !f)}
            className={`flex flex-1 items-center justify-center gap-2 px-3 py-2.5 text-sm border rounded-lg transition-colors sm:flex-none ${showFilters || activeFilters > 0 ? "bg-blue-50 border-blue-300 text-blue-700" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"}`}
          >
            <Filter className="w-4 h-4" />Filter
            {activeFilters > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-blue-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center">{activeFilters}</span>
            )}
          </button>
          <button onClick={exportCSV} className="flex flex-1 items-center justify-center gap-2 px-3 py-2.5 text-sm text-gray-600 border border-gray-200 bg-white rounded-lg hover:bg-gray-50 transition-colors sm:hidden">
            <Download className="w-4 h-4" />Export
          </button>
        </div>

        <button onClick={exportCSV} className="hidden items-center gap-2 px-3 py-2.5 text-sm text-gray-600 border border-gray-200 bg-white rounded-lg hover:bg-gray-50 transition-colors sm:flex">
          <Download className="w-4 h-4" />Export
        </button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-900">Filter Patients</p>
            {activeFilters > 0 && (
              <button onClick={clearFilters} className="text-xs text-red-500 hover:text-red-600 font-medium transition-colors">
                Clear all filters
              </button>
            )}
          </div>
          <div className="grid gap-5 sm:grid-cols-2 sm:gap-6">
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Gender</p>
              <div className="flex gap-2 flex-wrap">
                {["Male", "Female", "Other"].map(g => (
                  <button key={g} onClick={() => toggleGender(g)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${filterGender.includes(g) ? "bg-blue-600 text-white border-blue-600" : "text-gray-600 border-gray-200 hover:border-blue-300 hover:bg-blue-50"}`}>
                    {g}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Blood Group</p>
              <div className="flex gap-1.5 flex-wrap">
                {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(bg => (
                  <button key={bg} onClick={() => toggleBG(bg)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-colors ${filterBG.includes(bg) ? "bg-red-600 text-white border-red-600" : "text-gray-600 border-gray-200 hover:border-red-300 hover:bg-red-50"}`}>
                    {bg}
                  </button>
                ))}
              </div>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Disease</p>
              {diseaseGroups.length === 0 ? (
                <p className="text-xs text-gray-400">No diagnoses recorded yet. Set an ICD-10 code in Patient Summary or add a diagnosis in a prescription.</p>
              ) : (
                <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
                  {diseaseGroups.map(group => (
                    <button key={group.key} onClick={() => toggleDisease(group.key)}
                      title={group.key.startsWith("icd:") ? "Grouped by ICD-10 code" : "Grouped by prescription diagnosis"}
                      className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors ${filterDisease.includes(group.key) ? "bg-purple-600 text-white border-purple-600" : "text-gray-600 border-gray-200 hover:border-purple-300 hover:bg-purple-50"}`}>
                      {group.label} <span className="opacity-70">({group.count})</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          {activeFilters > 0 && (
            <p className="text-xs text-blue-600 mt-3">{filtered.length} patient{filtered.length !== 1 ? "s" : ""} match the selected filters</p>
          )}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {filtered.length > 0 && (
          <div className="divide-y divide-gray-100 md:hidden">
            {paged.map(p => (
              <div key={p.id} className="p-4">
                <div className="flex items-start gap-3">
                  <Av name={p.name} size="md" />
                  <div className="min-w-0 flex-1">
                    <button onClick={() => setViewingPatient(p)} className="block max-w-full truncate text-left text-sm font-semibold text-gray-900 hover:text-blue-600 transition-colors">{p.name}</button>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{p.id}</span>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${p.gender === "Male" ? "bg-blue-50 text-blue-700" : "bg-pink-50 text-pink-700"}`}>{p.gender}</span>
                      <span className="text-[11px] font-bold px-2 py-0.5 bg-red-50 text-red-700 rounded">{p.bloodGroup}</span>
                    </div>
                  </div>
                  <div className="relative flex-shrink-0" ref={openMenu === p.id ? menuRef : undefined}>
                    <button
                      onClick={() => setOpenMenu(openMenu === p.id ? null : p.id)}
                      className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
                      aria-label={`Open actions for ${p.name}`}
                    ><MoreVertical className="w-4 h-4" /></button>

                    {openMenu === p.id && (
                      <div className="absolute right-0 top-full mt-1 min-w-44 bg-white rounded-xl border border-gray-200 shadow-xl py-1.5 z-40">
                        <button onClick={() => { setViewingPatient(p); setOpenMenu(null); }} className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">
                          <Eye className="w-4 h-4 text-gray-400" />View Profile
                        </button>
                        <button onClick={() => { onPrescribePatient(p.id); setOpenMenu(null); }} className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">
                          <FilePlus className="w-4 h-4 text-gray-400" />Prescribe Now
                        </button>
                        <button onClick={() => { onEditPatient(p); setOpenMenu(null); }} className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">
                          <Edit className="w-4 h-4 text-gray-400" />Edit Patient
                        </button>
                        <div className="my-1 border-t border-gray-100" />
                        <button onClick={() => { setArchiveId(p.id); setOpenMenu(null); }} className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-red-600 hover:bg-red-50 text-left">
                          <Trash2 className="w-4 h-4" />Archive Patient
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-gray-50 p-2.5">
                    <p className="text-gray-500">Mobile</p>
                    <p className="mt-0.5 font-medium text-gray-900 break-words">{p.mobile}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-2.5">
                    <p className="text-gray-500">Age</p>
                    <p className="mt-0.5 font-medium text-gray-900">{p.age} years</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-2.5">
                    <p className="text-gray-500">Last Visit</p>
                    <p className="mt-0.5 font-medium text-gray-900">{p.lastVisit}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-2.5">
                    <p className="text-gray-500">Visits</p>
                    <p className="mt-0.5 font-medium text-gray-900">{p.totalVisits}</p>
                  </div>
                  {diseaseLabelOf(p) && (
                    <div className="col-span-2 rounded-lg bg-purple-50 p-2.5">
                      <p className="text-purple-600">Disease</p>
                      <p className="mt-0.5 font-medium text-gray-900 break-words">{diseaseLabelOf(p)}</p>
                    </div>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setViewingPatient(p)}
                    className="px-3 py-2 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
                  >History</button>
                  <button
                    onClick={() => onPrescribePatient(p.id)}
                    className="px-3 py-2 text-xs font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 transition-colors"
                  >Prescribe</button>
                </div>
              </div>
            ))}
          </div>
        )}

        <table className="hidden w-full text-sm md:table">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/60">
              {[
                { key: "id", label: "Patient ID" },
                { key: "name", label: "Patient Name" },
                { key: "mobile", label: "Mobile" },
                { key: "age", label: "Age" },
                { key: "gender", label: "Gender" },
                { key: "bloodGroup", label: "Blood Group" },
                { key: "disease", label: "Disease" },
                { key: "lastVisit", label: "Last Visit" },
                { key: "totalVisits", label: "Visits" },
              ].map(col => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className="text-left text-xs font-medium text-gray-500 px-5 py-3.5 cursor-pointer hover:text-gray-700 select-none whitespace-nowrap"
                >
                  {col.label}<SortIndicator col={col.key} />
                </th>
              ))}
              <th className="text-left text-xs font-medium text-gray-500 px-5 py-3.5">Action</th>
            </tr>
          </thead>
          <tbody>
            {paged.map(p => (
              <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                <td className="px-5 py-3.5">
                  <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{p.id}</span>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <Av name={p.name} size="sm" />
                    <button onClick={() => setViewingPatient(p)} className="font-medium text-gray-900 hover:text-blue-600 transition-colors text-left">{p.name}</button>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-gray-600 text-sm">{p.mobile}</td>
                <td className="px-5 py-3.5 text-gray-600 text-sm">{p.age}y</td>
                <td className="px-5 py-3.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.gender === "Male" ? "bg-blue-50 text-blue-700" : "bg-pink-50 text-pink-700"}`}>{p.gender}</span>
                </td>
                <td className="px-5 py-3.5">
                  <span className="text-xs font-bold px-2 py-0.5 bg-red-50 text-red-700 rounded">{p.bloodGroup}</span>
                </td>
                <td className="px-5 py-3.5 text-xs text-gray-600 max-w-[12rem] truncate" title={diseaseLabelOf(p)}>{diseaseLabelOf(p) || "-"}</td>
                <td className="px-5 py-3.5 text-xs text-gray-500">{p.lastVisit}</td>
                <td className="px-5 py-3.5 text-sm font-medium text-gray-700">{p.totalVisits}</td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => { setViewingPatient(p); }}
                      className="px-2.5 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-200 transition-colors"
                    >History</button>
                    <button
                      onClick={() => onPrescribePatient(p.id)}
                      className="px-2.5 py-1 text-xs font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded-md border border-green-200 transition-colors"
                    >Prescribe</button>

                    {/* Row dropdown */}
                    <div className="relative" ref={openMenu === p.id ? menuRef : undefined}>
                      <button
                        onClick={() => setOpenMenu(openMenu === p.id ? null : p.id)}
                        className="p-1.5 hover:bg-gray-100 rounded-md text-gray-500 transition-colors"
                      ><MoreVertical className="w-3.5 h-3.5" /></button>

                      {openMenu === p.id && (
                        <div className="absolute right-0 top-full mt-1 min-w-44 bg-white rounded-xl border border-gray-200 shadow-xl py-1.5 z-40">
                          <button onClick={() => { setViewingPatient(p); setOpenMenu(null); }} className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">
                            <Eye className="w-4 h-4 text-gray-400" />View Profile
                          </button>
                          <button onClick={() => { onPrescribePatient(p.id); setOpenMenu(null); }} className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">
                            <FilePlus className="w-4 h-4 text-gray-400" />Prescribe Now
                          </button>
                          <button onClick={() => { onEditPatient(p); setOpenMenu(null); }} className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">
                            <Edit className="w-4 h-4 text-gray-400" />Edit Patient
                          </button>
                          <div className="my-1 border-t border-gray-100" />
                          <button onClick={() => { setArchiveId(p.id); setOpenMenu(null); }} className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-red-600 hover:bg-red-50 text-left">
                            <Trash2 className="w-4 h-4" />Archive Patient
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
              <Search className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-900">No patients found</p>
            <p className="text-xs text-gray-500 mt-1">
              {activeFilters > 0 ? "Try adjusting or clearing your filters" : "Try a different search term"}
            </p>
            {(search || activeFilters > 0) && (
              <button
                onClick={() => { setSearch(""); clearFilters(); }}
                className="mt-3 text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >Reset search &amp; filters</button>
            )}
          </div>
        )}

        {/* Pagination */}
        <div className="flex flex-col gap-3 px-4 py-3.5 border-t border-gray-100 bg-gray-50/40 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p className="text-xs text-gray-500">
            {sorted.length === 0
              ? "No results"
              : `Showing ${(page - 1) * PAGE_SIZE + 1}-${Math.min(page * PAGE_SIZE, sorted.length)} of ${sorted.length} patients`}
          </p>
          <div className="flex items-center justify-between gap-1 sm:justify-start">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 disabled:opacity-40 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
              .map((n, idx, arr) => (
                <span key={n} className="flex items-center">
                  {idx > 0 && arr[idx - 1] !== n - 1 && <span className="px-1 text-xs text-gray-400">...</span>}
                  <button
                    onClick={() => setPage(n)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${n === page ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}
                  >{n}</button>
                </span>
              ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 disabled:opacity-40 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Archive confirmation */}
      {archiveId && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-5 h-5 text-red-500" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 text-center mb-2">Archive Patient?</h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              <strong>{patients.find(p => p.id === archiveId)?.name}</strong> will be removed from the active patients list. This action can be undone from the archive.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setArchiveId(null)} className="flex-1 px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors font-medium">Cancel</button>
              <button
                onClick={() => {
                  const name = patients.find(p => p.id === archiveId)?.name;
                  onDeletePatient(archiveId);
                  showToast(`${name} archived successfully`);
                  setArchiveId(null);
                }}
                className="flex-1 px-4 py-2 text-sm text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors font-medium"
              >Archive</button>
            </div>
          </div>
        </div>
      )}

      {/* Patient profile modal */}
      {viewingPatient && (
        <PatientProfileModal
          patient={viewingPatient}
          prescriptions={prescriptions}
          onEdit={() => { const patient = viewingPatient; setViewingPatient(null); onEditPatient(patient); }}
          onPrescribe={() => { setViewingPatient(null); onPrescribePatient(viewingPatient.id); }}
          onClose={() => setViewingPatient(null)}
        />
      )}
    </div>
  );
}

// CREATE PRESCRIPTION
function PrescriptionPatientStartModal({
  patients, onSelect, onCreate, onCancel,
}: {
  patients: typeof EMPTY_PATIENTS;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onCancel: () => void;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const filtered = patients.filter((p) =>
    !q || [p.name, p.mobile, p.id].some((v) => v.toLowerCase().includes(q))
  );

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="premium-modal rounded-2xl w-full max-w-xl overflow-hidden">
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Start Prescription</h2>
            <p className="text-xs text-gray-500 mt-0.5">Search an existing patient or create a new patient first.</p>
          </div>
          <button onClick={onCancel} className="w-8 h-8 bg-red-100 hover:bg-red-200 text-red-600 rounded-full flex items-center justify-center transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
              placeholder="Search by patient name, mobile, or ID"
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          </div>

          <div className="max-h-72 overflow-y-auto border border-gray-100 rounded-xl divide-y divide-gray-100">
            {filtered.length > 0 ? filtered.map((p) => (
              <button
                key={p.id}
                onClick={() => onSelect(p.id)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-blue-50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Av name={p.name} size="sm" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{p.name}</p>
                    <p className="text-xs text-gray-500 truncate">{p.id} - {p.mobile}</p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-blue-600 flex-shrink-0">Select</span>
              </button>
            )) : (
              <div className="px-4 py-8 text-center">
                <p className="text-sm font-medium text-gray-900">No patient found</p>
                <p className="text-xs text-gray-500 mt-1">Create a new patient to continue.</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100">
          <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-white transition-colors">
            Cancel
          </button>
          <button onClick={onCreate} className="inline-flex items-center gap-2 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors font-semibold">
            <Plus className="w-4 h-4" />Create New Patient
          </button>
        </div>
      </div>
    </div>
  );
}

function CreatePrescriptionView({ nav, patients, initialPatientId, onCreatePatient, onFinalise, showToast, profile, template }: {
  nav: (v: View) => void;
  patients: typeof EMPTY_PATIENTS;
  initialPatientId?: string;
  onCreatePatient: () => void;
  onFinalise: (rx: any) => void;
  showToast: (msg: string) => void;
  profile: DoctorProfile;
  template?: PrescriptionTemplate | null;
}) {
  const [medicines, setMedicines] = useState<MedicineEntry[]>([]);
  const [openDrawer, setOpenDrawer] = useState<string | null>(null);
  const [openTreatmentDrawer, setOpenTreatmentDrawer] = useState<string | null>(null);
  const [savedPrescriptionId, setSavedPrescriptionId] = useState<string | null>(null);
  const [advice, setAdvice] = useState("");
  const [investigations, setInvestigations] = useState<string[]>([]);
  const [followUp, setFollowUp] = useState<FollowUpData>({ interval: "", specificDate: "", note: "" });
  const [referredTo, setReferredTo] = useState("");
  const [specialNotes, setSpecialNotes] = useState("");

  // New state
  const [selectedPatientId, setSelectedPatientId] = useState(initialPatientId ?? "");
  const [editingMedIdx, setEditingMedIdx] = useState<number | null>(null);
  const [editMedForm, setEditMedForm] = useState<MedicineEntry | null>(null);
  const [showPatientStart, setShowPatientStart] = useState(!initialPatientId);
  const [showPreview, setShowPreview] = useState(false);
  const [showFinaliseConfirm, setShowFinaliseConfirm] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [clinicalData, setClinicalData] = useState<Record<string, string>>({
    "Chief Complaint": "",
    "History": "",
    "Family History": "",
    "On Examination": "",
    "Diagnosis": "",
    "Treatment Plan": "",
    "Referred By": "",
  });

  const selectedPatient = patients.find(p => p.id === selectedPatientId);
  const doctorDetails = [profile.qualifications, profile.specialty].filter(Boolean).join("  -  ");
  const clinicAddress = [profile.clinic, profile.address].filter(Boolean).join(", ");
  const prescriptionQrPayload = useMemo<PrescriptionDigitalCopy>(() => ({
    id: savedPrescriptionId ?? "Draft",
    patient: selectedPatient?.name ?? "",
    patientId: selectedPatient?.id ?? selectedPatientId,
    date: new Date().toISOString().split("T")[0],
    doctor: profile.name,
    doctorDetails,
    clinic: clinicAddress || profile.clinic,
    phone: profile.phone,
    diagnosis: clinicalData["Diagnosis"],
    clinicalData,
    medicines,
    advice,
    investigations,
    followUp,
    referredTo,
    specialNotes,
    status: "Draft",
  }), [advice, clinicalData, clinicAddress, doctorDetails, followUp, investigations, medicines, profile.clinic, profile.name, profile.phone, referredTo, savedPrescriptionId, selectedPatient, selectedPatientId, specialNotes]);

  useEffect(() => {
    if (initialPatientId) {
      setSelectedPatientId(initialPatientId);
      setShowPatientStart(false);
    }
  }, [initialPatientId]);

  useEffect(() => {
    setSavedPrescriptionId(null);
  }, [selectedPatientId]);

  useEffect(() => {
    if (!showPreview) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowPreview(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showPreview]);

  const buildPrescriptionPayload = (status: "Draft" | "Final") => ({
    patientId: selectedPatientId,
    date: new Date().toISOString().split("T")[0],
    diagnosis: clinicalData["Diagnosis"],
    clinicalData,
    medicines,
    advice,
    investigations,
    followUp,
    referredTo,
    specialNotes,
    status,
  });

  const handleSaveDraft = async () => {
    if (!selectedPatientId) {
      showToast("Please select a patient before saving");
      return;
    }
    try {
      const savedRx = await prescriptionsApi.create(buildPrescriptionPayload("Draft"));
      onFinalise(savedRx);
      setSavedPrescriptionId(savedRx.id);
      setDraftSaved(true);
      showToast("Draft saved successfully");
      setTimeout(() => setDraftSaved(false), 3000);
    } catch (error) {
      console.error(error);
      showToast("Could not save prescription draft");
    }
  };

  const handleFinalise = async () => {
    if (!selectedPatientId) {
      showToast("Please select a patient before finalising");
      return;
    }
    try {
      const newRx = await prescriptionsApi.create(buildPrescriptionPayload("Final"));
      onFinalise(newRx);
      showToast(`Prescription ${newRx.id} finalised for ${newRx.patient}`);
      setShowFinaliseConfirm(false);
      nav("prescription-history");
    } catch (error) {
      console.error(error);
      showToast("Could not finalise prescription");
    }
  };

  const startEditMed = (idx: number) => {
    setEditingMedIdx(idx);
    setEditMedForm({ ...medicines[idx] });
  };

  const saveEditMed = () => {
    if (editingMedIdx === null || !editMedForm) return;
    setMedicines(prev => prev.map((m, i) => i === editingMedIdx ? editMedForm : m));
    setEditingMedIdx(null);
    setEditMedForm(null);
  };

  const setSectionData = (section: string, value: string) =>
    setClinicalData((prev) => ({ ...prev, [section]: value }));

  const templateSections = (template?.sections?.length ? template.sections : DEFAULT_TEMPLATE_SECTIONS).filter(section => section !== "Calculate");
  const isTemplateSectionVisible = (label: string) => {
    const aliases: Record<string, string> = {
      "Rx Items": "Rx / Medicines",
      "Referred To": "Referral",
    };
    // Templates saved before Family History existed still show it alongside History.
    if (label === "Family History" && templateSections.includes("History")) return true;
    return templateSections.includes(label) || templateSections.includes(aliases[label]);
  };

  const leftShortcuts = [
    { label: "Chief Complaint", icon: ClipboardList },
    { label: "History", icon: FileText },
    { label: "Family History", icon: Users },
    { label: "On Examination", icon: Stethoscope },
    { label: "Diagnosis", icon: Target },
    { label: "Treatment Plan", icon: Activity },
    { label: "Referred By", icon: User },
  ].filter(s => isTemplateSectionVisible(s.label));

  const rightShortcuts = [
    { label: "AI Assistant", icon: Bot },
    { label: "Calculate", icon: Calculator },
    { label: "Rx Items", icon: Pill },
    { label: "Advice", icon: Heart },
    { label: "Investigation", icon: Microscope },
    { label: "Follow Up", icon: Calendar },
    { label: "Referred To", icon: ExternalLink },
    { label: "Special Notes", icon: Mic },
  ].filter(s => ["AI Assistant", "Calculate"].includes(s.label) || isTemplateSectionVisible(s.label));

  return (
    <div className="h-full flex flex-col">
      {/* Sticky header */}
      <div className="bg-white px-3 py-3 flex flex-col gap-3 flex-shrink-0 sm:px-5 lg:flex-row lg:items-center lg:justify-between" style={{ borderBottom: "1px solid #DDE3ED", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
        <div className="flex flex-wrap items-center gap-2 min-w-0 sm:gap-4">
          <div>
            <h1 className="text-sm font-bold text-gray-900" style={{ fontFamily: "var(--font-display)" }}>Create Prescription</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {selectedPatient ? `${selectedPatient.name}  -  ${selectedPatient.id}` : "No patient selected"}  -  {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            </p>
          </div>
          {template && (
            <span className="hidden md:inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
              <LayoutTemplate className="w-3.5 h-3.5" />
              {template.name}
            </span>
          )}
          <button
            onClick={() => setShowPatientStart(true)}
            className="inline-flex items-center gap-1.5 text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-gray-700"
          >
            <Search className="w-3.5 h-3.5 text-gray-400" />
            {selectedPatient ? "Change patient" : "Select patient"}
          </button>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:flex-shrink-0 lg:overflow-visible lg:pb-0">
          <button
            onClick={handleSaveDraft}
            className={`flex flex-shrink-0 items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded-lg transition-all ${draftSaved ? "border-green-400 text-green-600 bg-green-50" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
          >
            <FileText className="w-3.5 h-3.5" />{draftSaved ? "Saved!" : "Save Draft"}
          </button>
          <button
            onClick={() => setShowPreview(true)}
            className="flex flex-shrink-0 items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />Preview
          </button>
          <button
            onClick={() => { setShowPreview(true); setTimeout(printPrescription, 400); }}
            className="flex flex-shrink-0 items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />Print
          </button>
          <button
            onClick={() => setShowFinaliseConfirm(true)}
            className="flex flex-shrink-0 items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white rounded-lg transition-all"
            style={{ background: "linear-gradient(135deg,#2563EB,#1D4ED8)", boxShadow: "0 2px 8px rgba(37,99,235,0.3)" }}
          >
            <CheckCircle className="w-3.5 h-3.5" />Finalise
          </button>
        </div>
      </div>

      <div className="flex-1 flex min-h-0 flex-col overflow-hidden lg:flex-row">
        {/* Left shortcuts */}
        <div className="flex flex-shrink-0 gap-2 overflow-x-auto border-b border-gray-200 bg-gray-50 p-2 lg:block lg:w-40 lg:space-y-0.5 lg:overflow-y-auto lg:border-b-0 lg:border-r lg:p-3">
          <p className="hidden text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2 mb-2 lg:block">Clinical</p>
          {leftShortcuts.map((s) => {
            const hasData = clinicalData[s.label]?.trim();
            return (
              <button
                key={s.label}
                onClick={() => setOpenDrawer(s.label)}
                className={`flex flex-shrink-0 items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition-all text-left group relative lg:w-full ${
                  openDrawer === s.label
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-gray-600 hover:bg-white hover:text-gray-900 hover:shadow-sm"
                }`}
              >
                <s.icon className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate flex-1">{s.label}</span>
                {hasData && (
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${openDrawer === s.label ? "bg-blue-200" : "bg-green-500"}`} />
                )}
              </button>
            );
          })}
        </div>

        {/* A4 Prescription canvas */}
        <div className="flex-1 overflow-auto bg-gray-200 p-3 sm:p-5">
          <div className="premium-prescription-paper min-w-[680px] max-w-2xl mx-auto" style={{ minHeight: "1056px" }}>
            {/* Rx Header */}
            <div className="px-8 py-5 border-b-2 border-blue-600">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Stethoscope className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-blue-600 tracking-widest uppercase">{profile.prescriptionTitle}</p>
                      <p className="text-[9px] text-gray-400">{profile.prescriptionSubtitle}</p>
                    </div>
                  </div>
                  <h2 className="text-base font-bold text-gray-900">{profile.name}</h2>
                  <p className="text-xs text-gray-600">{doctorDetails}</p>
                  <p className="text-[10px] text-gray-500">BMDC Reg. No: {profile.regNo}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{clinicAddress}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <PrescriptionQrCode payload={prescriptionQrPayload} size={112} />
                </div>
              </div>
            </div>

            {/* Patient info bar */}
            <div className="px-8 py-2.5 bg-blue-50 border-b border-blue-100">
              <div className="grid grid-cols-6 gap-2 text-xs">
                {[
                  { label: "Name", value: selectedPatient?.name ?? "-" },
                  { label: "Age/Sex", value: selectedPatient ? `${selectedPatient.age}y / ${selectedPatient.gender}` : "-" },
                  { label: "Visit #", value: String((selectedPatient?.totalVisits ?? 0) + 1) },
                  { label: "Patient ID", value: selectedPatient?.id ?? "-" },
                  { label: "Ref By", value: clinicalData["Referred By"] },
                  { label: "Date", value: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) },
                ].map((f) => (
                  <div key={f.label}>
                    <p className="text-[9px] text-gray-400 uppercase tracking-wide">{f.label}</p>
                    <p className="font-semibold text-gray-900 text-xs">{f.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Two-column body */}
            <div className="flex divide-x divide-gray-200" style={{ minHeight: "820px" }}>
              {/* Left column */}
              <div className="w-5/12 px-6 py-4 space-y-4">
                {/* Chief Complaint */}
                <div>
                  <button
                    onClick={() => setOpenDrawer("Chief Complaint")}
                    className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 pb-1 border-b border-gray-100 w-full text-left hover:text-blue-600 hover:border-blue-200 transition-colors group flex items-center justify-between"
                  >
                    Chief Complaint
                    <span className="text-[8px] text-gray-300 group-hover:text-blue-400 normal-case tracking-normal font-normal">click to edit</span>
                  </button>
                  {clinicalData["Chief Complaint"] ? (
                    <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-line">{clinicalData["Chief Complaint"]}</p>
                  ) : (
                    <p className="text-xs text-gray-300 italic">Click to add chief complaint...</p>
                  )}
                </div>

                {/* History */}
                {clinicalData["History"] && (
                  <div>
                    <button onClick={() => setOpenDrawer("History")} className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 pb-1 border-b border-gray-100 w-full text-left hover:text-blue-600 transition-colors">
                      History
                    </button>
                    <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-line">{clinicalData["History"]}</p>
                  </div>
                )}

                {/* Family History */}
                {clinicalData["Family History"] && (
                  <div>
                    <button onClick={() => setOpenDrawer("Family History")} className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 pb-1 border-b border-gray-100 w-full text-left hover:text-blue-600 transition-colors">
                      Family History
                    </button>
                    <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-line">{formatFamilyHistory(clinicalData["Family History"])}</p>
                  </div>
                )}

                {/* On Examination */}
                <div>
                  <button
                    onClick={() => setOpenDrawer("On Examination")}
                    className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 pb-1 border-b border-gray-100 w-full text-left hover:text-blue-600 hover:border-blue-200 transition-colors group flex items-center justify-between"
                  >
                    On Examination
                    <span className="text-[8px] text-gray-300 group-hover:text-blue-400 normal-case tracking-normal font-normal">click to edit</span>
                  </button>
                  {clinicalData["On Examination"] ? (
                    <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-line">{clinicalData["On Examination"]}</p>
                  ) : (
                    <p className="text-xs text-gray-300 italic">Click to add examination findings...</p>
                  )}
                </div>

                {/* Diagnosis */}
                <div>
                  <button
                    onClick={() => setOpenDrawer("Diagnosis")}
                    className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 pb-1 border-b border-gray-100 w-full text-left hover:text-blue-600 hover:border-blue-200 transition-colors group flex items-center justify-between"
                  >
                    Diagnosis
                    <span className="text-[8px] text-gray-300 group-hover:text-blue-400 normal-case tracking-normal font-normal">click to edit</span>
                  </button>
                  {clinicalData["Diagnosis"] ? (
                    <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-line">{clinicalData["Diagnosis"]}</p>
                  ) : (
                    <p className="text-xs text-gray-300 italic">Click to add diagnosis...</p>
                  )}
                </div>

                {/* Treatment Plan */}
                {clinicalData["Treatment Plan"] && (
                  <div>
                    <button onClick={() => setOpenDrawer("Treatment Plan")} className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 pb-1 border-b border-gray-100 w-full text-left hover:text-blue-600 transition-colors">
                      Treatment Plan
                    </button>
                    <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-line">{clinicalData["Treatment Plan"]}</p>
                  </div>
                )}
              </div>

              {/* Right column */}
              <div className="flex-1 px-6 py-4 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-4xl font-serif text-blue-600 leading-none font-bold">Rx</span>
                  <span className="text-[10px] text-gray-400 font-medium">MEDICINES PRESCRIBED</span>
                </div>

                <div className="space-y-2">
                  {medicines.map((med, idx) => (
                    <div key={idx}>
                      {editingMedIdx === idx && editMedForm ? (
                        /* Inline edit form */
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-2">
                          <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wide">Editing Medicine {idx + 1}</p>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="col-span-2">
                              <label className="text-[10px] font-semibold text-gray-500 block mb-0.5">Brand Name</label>
                              <input value={editMedForm.name} onChange={e => setEditMedForm(f => f ? { ...f, name: e.target.value } : f)}
                                className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white" />
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold text-gray-500 block mb-0.5">Dosage (M+A+E)</label>
                              <input value={editMedForm.dosage} onChange={e => setEditMedForm(f => f ? { ...f, dosage: e.target.value } : f)}
                                placeholder="1+0+1" className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white" />
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold text-gray-500 block mb-0.5">Meal</label>
                              <select value={editMedForm.meal} onChange={e => setEditMedForm(f => f ? { ...f, meal: e.target.value } : f)}
                                className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none bg-white">
                                <option>Before meal</option><option>After meal</option><option>With meal</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold text-gray-500 block mb-0.5">Duration</label>
                              <input value={editMedForm.duration} onChange={e => setEditMedForm(f => f ? { ...f, duration: e.target.value } : f)}
                                placeholder="7 days" className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white" />
                            </div>
                          </div>
                          <div className="flex gap-2 pt-1">
                            <button onClick={() => { setEditingMedIdx(null); setEditMedForm(null); }}
                              className="flex-1 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-white transition-colors">Cancel</button>
                            <button onClick={saveEditMed}
                              className="flex-1 py-1.5 text-xs text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors font-semibold">Save</button>
                          </div>
                        </div>
                      ) : (
                        /* Normal medicine row */
                        <div className="group flex items-start gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
                          <span className="text-[10px] font-bold text-blue-600 mt-0.5 w-4 text-right flex-shrink-0">{idx + 1}.</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-900">{med.name}</p>
                            <p className="text-[10px] text-gray-400 italic">{med.generic}</p>
                            <p className="text-xs text-gray-700 mt-0.5">{med.dosage}  -  {med.meal}  -  {med.duration}</p>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                            <button onClick={() => startEditMed(idx)} title="Edit" className="p-0.5 hover:bg-blue-100 rounded text-gray-400 hover:text-blue-600"><Edit className="w-3 h-3" /></button>
                            <button onClick={() => setMedicines(medicines.filter((_, i) => i !== idx))} title="Remove" className="p-0.5 hover:bg-red-50 rounded text-gray-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setOpenTreatmentDrawer("Rx Items")}
                  className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Medicine
                </button>

                {/* Advice */}
                <div className="pt-3 border-t border-gray-100">
                  <button onClick={() => setOpenTreatmentDrawer("Advice")} className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 w-full text-left hover:text-blue-600 transition-colors flex items-center justify-between group">
                    Advice
                    <span className="text-[8px] text-gray-300 group-hover:text-blue-400 normal-case tracking-normal font-normal">click to edit</span>
                  </button>
                  {advice.trim() ? (
                    <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-line">{advice}</p>
                  ) : (
                    <p className="text-xs text-gray-300 italic">Click to add advice...</p>
                  )}
                </div>

                {/* Investigations */}
                {investigations.length > 0 && (
                  <div className="pt-3 border-t border-gray-100">
                    <button onClick={() => setOpenTreatmentDrawer("Investigation")} className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 w-full text-left hover:text-blue-600 transition-colors">Investigation</button>
                    <ol className="space-y-0.5">
                      {investigations.map((inv, i) => (
                        <li key={i} className="text-xs text-gray-700">{i + 1}. {inv}</li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* Follow Up */}
                {followUp.interval && (
                  <div className="pt-3 border-t border-gray-100">
                    <button onClick={() => setOpenTreatmentDrawer("Follow Up")} className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 w-full text-left hover:text-blue-600 transition-colors flex items-center justify-between group">
                      Follow Up
                      <span className="text-[8px] text-gray-300 group-hover:text-blue-400 normal-case tracking-normal font-normal">click to edit</span>
                    </button>
                    <p className="text-xs text-gray-700">
                      After <strong>{followUp.interval}</strong> for review
                      {followUp.specificDate && ` - ${new Date(followUp.specificDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`}
                    </p>
                    {followUp.note && <p className="text-xs text-gray-500 italic mt-0.5">{followUp.note}</p>}
                  </div>
                )}

                {/* Referred To */}
                {referredTo && (
                  <div className="pt-3 border-t border-gray-100">
                    <button onClick={() => setOpenTreatmentDrawer("Referred To")} className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 w-full text-left hover:text-blue-600 transition-colors">Referred To</button>
                    <p className="text-xs text-gray-700">{referredTo}</p>
                  </div>
                )}

                {/* Special Notes */}
                {specialNotes && (
                  <div className="pt-3 border-t border-gray-100">
                    <button onClick={() => setOpenTreatmentDrawer("Special Notes")} className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 w-full text-left hover:text-blue-600 transition-colors">Special Notes</button>
                    <p className="text-xs text-gray-700 whitespace-pre-line">{specialNotes}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-8 py-4 border-t border-gray-200 flex justify-between items-end">
              <div>
                <p className="text-[9px] text-gray-400">Phone: {profile.phone}  -  Emergency: 10655</p>
                {(profile.clinic || profile.address) && <p className="text-[9px] text-gray-400">{[profile.clinic, profile.address].filter(Boolean).join(", ")}</p>}
              </div>
              <div className="text-right">
                <div className="w-28 border-t border-gray-400 pt-1">
                  <p className="text-[9px] text-gray-500">{profile.name}</p>
                  <p className="text-[9px] text-gray-400">Signature &amp; Seal</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right shortcuts */}
        <div className="flex flex-shrink-0 gap-2 overflow-x-auto border-t border-gray-200 bg-gray-50 p-2 lg:block lg:w-40 lg:space-y-0.5 lg:overflow-y-auto lg:border-l lg:border-t-0 lg:p-3">
          <p className="hidden text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2 mb-2 lg:block">Treatment</p>
          {rightShortcuts.map((s) => {
            const hasData =
              (s.label === "Rx Items" && medicines.length > 0) ||
              (s.label === "Advice" && advice.trim()) ||
              (s.label === "Investigation" && investigations.length > 0) ||
              (s.label === "Follow Up" && followUp.interval) ||
              (s.label === "Referred To" && referredTo.trim()) ||
              (s.label === "Special Notes" && specialNotes.trim());
            return (
              <button
                key={s.label}
                onClick={() => setOpenTreatmentDrawer(s.label)}
                className={`flex flex-shrink-0 items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition-all text-left lg:w-full ${
                  openTreatmentDrawer === s.label
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-gray-600 hover:bg-white hover:text-gray-900 hover:shadow-sm"
                }`}
              >
                <s.icon className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate flex-1">{s.label}</span>
                {hasData && (
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${openTreatmentDrawer === s.label ? "bg-blue-200" : "bg-green-500"}`} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Clinical drawer */}
      {openDrawer === "Family History" && (
        <FamilyHistoryDrawer
          currentValue={clinicalData["Family History"] ?? ""}
          patientNote={selectedPatient?.familyHistory}
          onSave={(val) => setSectionData("Family History", val)}
          onClose={() => setOpenDrawer(null)}
        />
      )}
      {openDrawer && openDrawer !== "Family History" && (
        <ClinicalDrawer
          section={openDrawer}
          currentValue={clinicalData[openDrawer] ?? ""}
          onSave={(val) => setSectionData(openDrawer, val)}
          onClose={() => setOpenDrawer(null)}
        />
      )}

      {/* Treatment drawer */}
      {openTreatmentDrawer && (
        <TreatmentDrawer
          section={openTreatmentDrawer}
          medicines={medicines}
          advice={advice}
          investigations={investigations}
          followUp={followUp}
          referredTo={referredTo}
          specialNotes={specialNotes}
          onAddMedicine={(m) => setMedicines((prev) => [...prev, m])}
          onSaveAdvice={setAdvice}
          onSaveInvestigations={setInvestigations}
          onSaveFollowUp={setFollowUp}
          onSaveReferredTo={setReferredTo}
          onSaveSpecialNotes={setSpecialNotes}
          onClose={() => setOpenTreatmentDrawer(null)}
        />
      )}

      {/* Preview / Print modal */}
      {showPatientStart && (
        <PrescriptionPatientStartModal
          patients={patients}
          onSelect={(id) => { setSelectedPatientId(id); setShowPatientStart(false); }}
          onCreate={onCreatePatient}
          onCancel={() => {
            if (selectedPatientId) setShowPatientStart(false);
            else nav("dashboard");
          }}
        />
      )}

      {showPreview && (
        <div className="fixed inset-0 bg-black/50 z-50 flex flex-col backdrop-blur-sm">
          <div className="bg-white flex flex-col gap-3 px-4 py-3 flex-shrink-0 sm:flex-row sm:items-center sm:justify-between sm:px-6" style={{ borderBottom: "1px solid #DDE3ED", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <div>
              <h2 className="text-sm font-bold text-gray-900" style={{ fontFamily: "var(--font-display)" }}>Prescription Preview</h2>
              <p className="text-xs text-gray-400">{selectedPatient?.name}  -  {new Date().toLocaleDateString("en-GB")}</p>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              <button onClick={() => setShowPreview(false)} className="flex flex-shrink-0 items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <ChevronLeft className="w-3.5 h-3.5" />Back to Edit
              </button>
              <button onClick={printPrescription} className="flex flex-shrink-0 items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors">
                <Printer className="w-3.5 h-3.5" />Print
              </button>
              <button onClick={() => { setShowFinaliseConfirm(true); setShowPreview(false); }} className="flex flex-shrink-0 items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white rounded-lg" style={{ background: "linear-gradient(135deg,#2563EB,#1D4ED8)" }}>
                <CheckCircle className="w-3.5 h-3.5" />Finalise
              </button>
              <button aria-label="Close preview" title="Close preview" onClick={() => setShowPreview(false)} className="w-8 h-8 bg-red-100 hover:bg-red-200 text-red-600 rounded-full flex items-center justify-center transition-colors ml-2">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-3 bg-gray-200 sm:p-8">
            <div className="print-prescription premium-prescription-paper min-w-[680px] max-w-2xl mx-auto" style={{ minHeight: "1056px" }}>
              {/* Header */}
              <div className="px-10 py-6 border-b-2 border-blue-600">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
                        <Stethoscope className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-blue-600 tracking-widest uppercase">{profile.prescriptionTitle}</p>
                        <p className="text-[9px] text-gray-400">{profile.prescriptionSubtitle}</p>
                      </div>
                    </div>
                    <h2 className="text-lg font-bold text-gray-900">{profile.name}</h2>
                    <p className="text-xs text-gray-600">{doctorDetails}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">{clinicAddress}</p>
                  </div>
                  <div className="flex-shrink-0">
                    <PrescriptionQrCode payload={prescriptionQrPayload} size={112} />
                  </div>
                </div>
              </div>
              {/* Patient bar */}
              <div className="px-10 py-3 bg-blue-50 border-b border-blue-100">
                <div className="grid grid-cols-6 gap-2 text-xs">
                  {[
                    { label: "Name", value: selectedPatient?.name ?? "-" },
                    { label: "Age/Sex", value: selectedPatient ? `${selectedPatient.age}y / ${selectedPatient.gender}` : "-" },
                    { label: "Blood Group", value: selectedPatient?.bloodGroup ?? "-" },
                    { label: "Patient ID", value: selectedPatient?.id ?? "-" },
                    { label: "Ref By", value: clinicalData["Referred By"] },
                    { label: "Date", value: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) },
                  ].map(f => (
                    <div key={f.label}><p className="text-[9px] text-gray-400 uppercase tracking-wide">{f.label}</p><p className="font-semibold text-gray-900 truncate">{f.value}</p></div>
                  ))}
                </div>
              </div>
              {/* Two-column body */}
              <div className="flex divide-x divide-gray-200" style={{ minHeight: "780px" }}>
                <div className="w-5/12 px-8 py-5 space-y-5">
                  {[
                    { key: "Chief Complaint", show: true },
                    { key: "History", show: !!clinicalData["History"] },
                    { key: "Family History", show: !!clinicalData["Family History"] },
                    { key: "On Examination", show: true },
                    { key: "Diagnosis", show: true },
                    { key: "Treatment Plan", show: !!clinicalData["Treatment Plan"] },
                  ].filter(s => s.show && clinicalData[s.key]).map(s => (
                    <div key={s.key}>
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 pb-1 border-b border-gray-100">{s.key}</p>
                      <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-line">{s.key === "Family History" ? formatFamilyHistory(clinicalData[s.key]) : clinicalData[s.key]}</p>
                    </div>
                  ))}
                </div>
                <div className="flex-1 px-8 py-5 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-4xl font-serif text-blue-600 font-bold leading-none">Rx</span>
                    <span className="text-[10px] text-gray-400 font-medium">MEDICINES PRESCRIBED</span>
                  </div>
                  <div className="space-y-3">
                    {medicines.map((med, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-[10px] font-bold text-blue-600 mt-0.5 w-4 text-right flex-shrink-0">{i + 1}.</span>
                        <div><p className="text-xs font-semibold text-gray-900">{med.name}</p><p className="text-[10px] text-gray-400 italic">{med.generic}</p><p className="text-xs text-gray-700">{med.dosage}  -  {med.meal}  -  {med.duration}</p></div>
                      </div>
                    ))}
                  </div>
                  {advice.trim() && <div className="pt-3 border-t border-gray-100"><p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Advice</p><p className="text-xs text-gray-700 leading-relaxed whitespace-pre-line">{advice}</p></div>}
                  {investigations.length > 0 && <div className="pt-3 border-t border-gray-100"><p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Investigation</p><ol className="space-y-0.5">{investigations.map((inv, i) => <li key={i} className="text-xs text-gray-700">{i + 1}. {inv}</li>)}</ol></div>}
                  {followUp.interval && <div className="pt-3 border-t border-gray-100"><p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Follow Up</p><p className="text-xs text-gray-700">After <strong>{followUp.interval}</strong> for review{followUp.note && ` - ${followUp.note}`}</p></div>}
                  {referredTo && <div className="pt-3 border-t border-gray-100"><p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Referred To</p><p className="text-xs text-gray-700">{referredTo}</p></div>}
                  {specialNotes && <div className="pt-3 border-t border-gray-100"><p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Special Notes</p><p className="text-xs text-gray-700 whitespace-pre-line">{specialNotes}</p></div>}
                </div>
              </div>
              <div className="px-10 py-4 border-t border-gray-200 flex justify-between items-end">
                <p className="text-[9px] text-gray-400">Phone: {profile.phone}  -  {profile.clinic}</p>
                <div className="w-28 border-t border-gray-400 pt-1 text-right"><p className="text-[9px] text-gray-500">{profile.name}</p><p className="text-[9px] text-gray-400">Signature &amp; Seal</p></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Finalise confirmation */}
      {showFinaliseConfirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" style={{ border: "1px solid #DDE3ED" }}>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "linear-gradient(135deg,#EFF6FF,#DBEAFE)" }}>
              <CheckCircle className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-base font-bold text-gray-900 text-center mb-2" style={{ fontFamily: "var(--font-display)" }}>Finalise Prescription?</h3>
            <p className="text-sm text-gray-500 text-center mb-1">
              This prescription for <strong>{selectedPatient?.name}</strong> will be marked as <strong>Final</strong> and saved to history.
            </p>
            <p className="text-xs text-amber-600 text-center mb-6 bg-amber-50 rounded-lg py-2 px-3">Once finalised, changes can no longer be made.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowFinaliseConfirm(false)} className="flex-1 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors font-medium">Cancel</button>
              <button onClick={handleFinalise} className="flex-1 py-2.5 text-sm text-white rounded-xl font-semibold transition-all" style={{ background: "linear-gradient(135deg,#2563EB,#1D4ED8)", boxShadow: "0 4px 12px rgba(37,99,235,0.3)" }}>
                Finalise
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// APPOINTMENTS
const formatDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseDateKey = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
};

const timeToMinutes = (value: string) => {
  const match = value.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return 0;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3]?.toUpperCase();
  if (meridiem === "PM" && hours < 12) hours += 12;
  if (meridiem === "AM" && hours === 12) hours = 0;
  return hours * 60 + minutes;
};

function AppointmentsView({
  appointments, onAddAppointment, onUpdateStatus, showToast,
}: {
  appointments: typeof EMPTY_APPOINTMENTS;
  onAddAppointment: (date?: string) => void;
  onUpdateStatus: (id: string, status: string) => void;
  showToast: (msg: string) => void;
}) {
  const today = new Date();
  const todayKey = formatDateKey(today);
  const [currentMonth, setCurrentMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState(today.getDate());
  const [smsEnabled, setSmsEnabled] = useState(true);
  const defaultSchedule = {
    from: formatDateKey(new Date(today.getFullYear(), today.getMonth(), 1)),
    until: formatDateKey(new Date(today.getFullYear(), today.getMonth() + 1, 0)),
    start: "09:00",
    end: "17:00",
    duration: "30",
    maxPerDay: "20",
  };
  const [schedule, setSchedule] = useState(defaultSchedule);
  const [offDayIndexes, setOffDayIndexes] = useState<number[]>([5]);
  const statusOptions = ["Confirmed", "Waiting", "In Progress", "Completed", "Cancelled"];

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  const selectedDateKey = formatDateKey(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), selectedDay));
  const monthAppointments = useMemo(
    () => appointments.filter(apt => {
      const date = parseDateKey(apt.date);
      return date.getFullYear() === currentMonth.getFullYear() && date.getMonth() === currentMonth.getMonth();
    }),
    [appointments, currentMonth]
  );
  const appointmentCounts = useMemo(() => {
    return monthAppointments.reduce<Record<number, number>>((counts, apt) => {
      const day = parseDateKey(apt.date).getDate();
      counts[day] = (counts[day] ?? 0) + 1;
      return counts;
    }, {});
  }, [monthAppointments]);
  const selectedAppointments = useMemo(
    () => appointments
      .filter(apt => apt.date === selectedDateKey)
      .slice()
      .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time)),
    [appointments, selectedDateKey]
  );
  const selectedDateLabel = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), selectedDay)
    .toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "long", year: "numeric" });
  const isOutsideSchedule = (key: string) => key < schedule.from || key > schedule.until;
  const isOffDay = (day: number) => offDayIndexes.includes(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day).getDay());
  const updateSchedule = (key: keyof typeof schedule, value: string) => setSchedule(prev => ({ ...prev, [key]: value }));
  const goToMonth = (offset: number) => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
    setSelectedDay(1);
  };
  const goToToday = () => {
    const now = new Date();
    setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDay(now.getDate());
  };
  const shareQr = () => {
    const bookingUrl = `${window.location.origin}/appointments?doctor=arfin-sultana`;
    navigator.clipboard?.writeText(bookingUrl);
    showToast("Appointment booking link copied");
  };

  useEffect(() => {
    setSelectedDay(day => Math.min(day, daysInMonth));
  }, [daysInMonth]);

  return (
    <div className="p-4 space-y-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Appointment Management</h1>
          <p className="text-sm text-gray-500">Manage your schedule and availability</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button onClick={shareQr} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 border border-gray-200 bg-white rounded-lg hover:bg-gray-50 transition-colors"><QrCode className="w-4 h-4" />Share QR</button>
          <button onClick={() => onAddAppointment(selectedDateKey)} className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"><Plus className="w-4 h-4" />Add Appointment</button>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        {/* Settings panel */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-900">Schedule Settings</h3>
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <div>
              <p className="text-sm font-medium text-gray-700">Appointment SMS</p>
              <p className="text-xs text-gray-400">Patient reminders</p>
            </div>
            <button onClick={() => setSmsEnabled(!smsEnabled)} className={`w-10 h-5 rounded-full relative transition-colors flex items-center px-0.5 flex-shrink-0 ${smsEnabled ? "bg-blue-600" : "bg-gray-300"}`}>
              <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${smsEnabled ? "translate-x-5" : "translate-x-0"}`} />
            </button>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Available From</label>
              <input type="date" value={schedule.from} onChange={e => updateSchedule("from", e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Available Until</label>
              <input type="date" value={schedule.until} onChange={e => updateSchedule("until", e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1.5">Off Days</label>
              <div className="flex flex-wrap gap-1">
                {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                  <button
                    key={i}
                    onClick={() => setOffDayIndexes(prev => prev.includes(i) ? prev.filter(day => day !== i) : [...prev, i])}
                    className={`w-7 h-7 rounded-md text-xs font-semibold transition-colors ${offDayIndexes.includes(i) ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Start</label>
                <input type="time" value={schedule.start} onChange={e => updateSchedule("start", e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">End</label>
                <input type="time" value={schedule.end} onChange={e => updateSchedule("end", e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Duration</label>
                <select value={schedule.duration} onChange={e => updateSchedule("duration", e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-2 py-2 focus:outline-none">
                  <option value="15">15 min</option><option value="20">20 min</option>
                  <option value="30">30 min</option><option value="45">45 min</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Max/Day</label>
                <input type="number" value={schedule.maxPerDay} onChange={e => updateSchedule("maxPerDay", e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-2 py-2 focus:outline-none" />
              </div>
            </div>
          </div>
          <div className="flex gap-2 pt-2 border-t border-gray-100">
            <button onClick={() => { setSchedule(defaultSchedule); setOffDayIndexes([5]); showToast("Schedule changes reset"); }} className="flex-1 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
            <button onClick={() => showToast("Schedule settings saved")} className="flex-1 px-3 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">Save</button>
          </div>
        </div>

        {/* Calendar */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-5 xl:col-span-2">
          <div className="flex flex-col gap-3 mb-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <button onClick={() => goToMonth(-1)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"><ChevronLeft className="w-4 h-4 text-gray-600" /></button>
              <h3 className="text-base font-semibold text-gray-900 sm:min-w-40 text-center">{monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}</h3>
              <button onClick={() => goToMonth(1)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"><ChevronRight className="w-4 h-4 text-gray-600" /></button>
            </div>
            <button onClick={goToToday} className="px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors">Today</button>
          </div>
          <div className="grid grid-cols-7 mb-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="text-center text-xs font-semibold text-gray-500 py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateKey = formatDateKey(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day));
              const isToday = dateKey === todayKey;
              const isOff = isOffDay(day);
              const isUnavailable = isOff || isOutsideSchedule(dateKey);
              const count = appointmentCounts[day] ?? 0;
              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={`aspect-square rounded-xl flex flex-col items-center justify-center text-xs font-medium transition-all ${
                    selectedDay === day
                      ? "bg-blue-600 text-white shadow-sm"
                      : isToday
                        ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
                        : isUnavailable
                          ? "bg-gray-100 text-gray-400 hover:bg-gray-200"
                          : "hover:bg-blue-50 hover:text-blue-700 text-gray-700"
                  }`}
                  title={`${dateKey}${isUnavailable ? " unavailable" : ""}${count ? ` - ${count} appointment${count > 1 ? "s" : ""}` : ""}`}
                >
                  <span>{day}</span>
                  {count > 0 ? <span className={`text-[9px] font-bold mt-0.5 ${selectedDay === day ? "text-blue-200" : "text-blue-500"}`}>{count}</span> : null}
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-gray-100">
            <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-3.5 h-3.5 rounded-md bg-blue-50 border border-blue-200 inline-block" />Today</span>
            <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-3.5 h-3.5 rounded-md bg-gray-100 border border-gray-200 inline-block" />Off Day</span>
            <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="text-[10px] font-bold text-blue-500">8</span> Appointment count</span>
          </div>
          <div className="mt-5 pt-5 border-t border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-900">
                {selectedDateLabel} - {selectedAppointments.length} Appointment{selectedAppointments.length === 1 ? "" : "s"}
              </h4>
              <button onClick={() => onAddAppointment(selectedDateKey)} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
              {selectedAppointments.map((apt) => (
                <div key={apt.id} className="flex items-center gap-2.5 p-2.5 rounded-lg border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all">
                  <Av name={apt.patient} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 truncate">{apt.patient}</p>
                    <p className="text-[10px] text-gray-400">{apt.time} - Serial {apt.serial}</p>
                  </div>
                  <select
                    value={apt.status}
                    onChange={(e) => onUpdateStatus(apt.id, e.target.value)}
                    className="w-28 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-[11px] font-semibold text-gray-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    aria-label={`Update status for ${apt.patient}`}
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
              ))}
              {selectedAppointments.length === 0 && (
                <div className="col-span-full rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center">
                  <Calendar className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                  <p className="text-sm font-medium text-gray-600">No appointments on this date</p>
                  <p className="mt-1 text-xs text-gray-400">Use Add Appointment to book a patient for {selectedDateLabel}.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// PRESCRIPTION HISTORY
// PRESCRIPTION VIEW MODAL
function PrescriptionViewModal({ rx, onClose }: {
  rx: typeof EMPTY_PRESCRIPTIONS[0]; onClose: () => void;
}) {
  const meds = rx.medicineItems ?? [];
  const qrPayload = useMemo<PrescriptionDigitalCopy>(() => prescriptionSummaryToDigitalCopy({ ...rx, medicineItems: meds }), [meds, rx]);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[95vh] flex flex-col">

        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-sm font-bold text-gray-900">{rx.id}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-gray-500">{rx.patient}  -  {rx.date}</span>
                <StatusBadge status={rx.status} />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={printPrescription} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <Printer className="w-3.5 h-3.5" />Print
            </button>
            <button onClick={() => { navigator.clipboard?.writeText(rx.id); }} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <Share2 className="w-3.5 h-3.5" />Share
            </button>
            <button onClick={onClose} className="w-8 h-8 bg-red-100 hover:bg-red-200 text-red-600 rounded-full flex items-center justify-center transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* A4 preview */}
        <div className="flex-1 overflow-y-auto p-5 bg-gray-200">
          <div className="print-prescription bg-white shadow-md max-w-2xl mx-auto" style={{ minHeight: "800px" }}>

            {/* Rx header */}
            <div className="px-8 py-5 border-b-2 border-blue-600">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Stethoscope className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-blue-600 tracking-widest uppercase">Oncology Prescription</p>
                      <p className="text-[9px] text-gray-400">Smart Prescription &amp; Patient Management</p>
                    </div>
                  </div>
                  <h2 className="text-base font-bold text-gray-900">Prescription Record</h2>
                  <p className="text-xs text-gray-600">Saved from database</p>
                  <p className="text-[10px] text-gray-500">Prescription ID: {rx.id}</p>
                </div>
                <div className="flex-shrink-0">
                  <PrescriptionQrCode payload={qrPayload} size={112} />
                </div>
              </div>
            </div>

            {/* Patient info bar */}
            <div className="px-8 py-2.5 bg-blue-50 border-b border-blue-100">
              <div className="grid grid-cols-6 gap-2 text-xs">
                {[
                  { label: "Patient", value: rx.patient },
                  { label: "Rx ID", value: rx.id },
                  { label: "Date", value: rx.date },
                  { label: "Status", value: rx.status },
                  { label: "Visit #", value: "-" },
                  { label: "Ref By", value: rx.clinicalData?.["Referred By"] || "-" },
                ].map(f => (
                  <div key={f.label}>
                    <p className="text-[9px] text-gray-400 uppercase tracking-wide">{f.label}</p>
                    <p className="font-semibold text-gray-900 text-xs truncate">{f.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Two-column body */}
            <div className="flex divide-x divide-gray-200" style={{ minHeight: "600px" }}>

              {/* Left */}
              <div className="w-5/12 px-6 py-4 space-y-4">
                <div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 pb-1 border-b border-gray-100">Diagnosis</p>
                  <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-line">{rx.diagnosis}</p>
                </div>
                {rx.clinicalData?.["On Examination"] && (
                  <div>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 pb-1 border-b border-gray-100">On Examination</p>
                    <p className="text-xs text-gray-700 whitespace-pre-line">{rx.clinicalData["On Examination"]}</p>
                  </div>
                )}
                {rx.clinicalData?.["Chief Complaint"] && (
                  <div>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 pb-1 border-b border-gray-100">Chief Complaint</p>
                    <p className="text-xs text-gray-700 whitespace-pre-line">{rx.clinicalData["Chief Complaint"]}</p>
                  </div>
                )}
                {rx.clinicalData?.["Family History"] && (
                  <div>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 pb-1 border-b border-gray-100">Family History</p>
                    <p className="text-xs text-gray-700 whitespace-pre-line">{formatFamilyHistory(rx.clinicalData["Family History"])}</p>
                  </div>
                )}
              </div>

              {/* Right */}
              <div className="flex-1 px-6 py-4 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-3xl font-serif text-blue-600 font-bold leading-none">Rx</span>
                  <span className="text-[10px] text-gray-400 font-medium">MEDICINES PRESCRIBED</span>
                </div>
                <div className="space-y-3">
                  {meds.map((med, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="text-[10px] font-bold text-blue-600 mt-0.5 w-4 text-right flex-shrink-0">{idx + 1}.</span>
                      <div>
                        <p className="text-xs font-semibold text-gray-900">{med.name}</p>
                        <p className="text-[10px] text-gray-400 italic">{med.generic}</p>
                        <p className="text-xs text-gray-700 mt-0.5">{med.dosage}  -  {med.meal}  -  {med.duration}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {rx.advice && (
                  <div className="pt-3 border-t border-gray-100">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Advice</p>
                    <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-line">{rx.advice}</p>
                  </div>
                )}
                {rx.followUpDate && (
                  <div className="pt-3 border-t border-gray-100">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Follow Up</p>
                    <p className="text-xs text-gray-700">{rx.followUpDate}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-8 py-4 border-t border-gray-200 flex justify-between items-end">
              <p className="text-[9px] text-gray-400">Digital prescription record</p>
              <div className="text-right">
                <div className="w-28 border-t border-gray-400 pt-1">
                  <p className="text-[9px] text-gray-500">{rx.id}</p>
                  <p className="text-[9px] text-gray-400">Signature &amp; Seal</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// PRESCRIPTION HISTORY
function PrescriptionHistoryView({ prescriptions, onUpdate, showToast }: {
  prescriptions: typeof EMPTY_PRESCRIPTIONS;
  onUpdate: (p: typeof EMPTY_PRESCRIPTIONS) => void;
  showToast: (msg: string) => void;
}) {
  const PAGE_SIZE = 8;
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [sortBy, setSortBy] = useState("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [viewingRx, setViewingRx] = useState<typeof EMPTY_PRESCRIPTIONS[0] | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openMenu) return;
    const h = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenu(null); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [openMenu]);

  // Derived
  const filtered = prescriptions.filter(rx => {
    const q = search.toLowerCase();
    const matchSearch = !q || rx.patient.toLowerCase().includes(q) || rx.id.toLowerCase().includes(q) || rx.diagnosis.toLowerCase().includes(q);
    const matchStatus = filterStatus === "All" || rx.status === filterStatus;
    const matchFrom = !dateFrom || rx.date >= dateFrom;
    const matchTo = !dateTo || rx.date <= dateTo;
    return matchSearch && matchStatus && matchFrom && matchTo;
  });

  const sorted = [...filtered].sort((a, b) => {
    const av = String((a as any)[sortBy]); const bv = String((b as any)[sortBy]);
    const d = sortDir === "asc" ? 1 : -1;
    return av.localeCompare(bv) * d;
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paged = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const activeFilters = [filterStatus !== "All", !!dateFrom, !!dateTo].filter(Boolean).length;

  // Handlers
  const handleSort = (col: string) => {
    if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("desc"); }
    setPage(1);
  };

  const clearAll = () => { setSearch(""); setDateFrom(""); setDateTo(""); setFilterStatus("All"); setPage(1); };

  const duplicate = async (rx: typeof EMPTY_PRESCRIPTIONS[0]) => {
    if (!rx.patientId) {
      showToast("Could not duplicate prescription without patient ID");
      return;
    }
    try {
      const newRx = await prescriptionsApi.create({
        patientId: rx.patientId,
        date: new Date().toISOString().split("T")[0],
        diagnosis: rx.diagnosis,
        clinicalData: rx.clinicalData ?? { Diagnosis: rx.diagnosis },
        medicines: rx.medicineItems ?? [],
        advice: rx.advice ?? "",
        investigation: rx.investigation ?? "",
        referredTo: rx.referredTo ?? "",
        specialNotes: rx.specialNotes ?? "",
        status: "Draft",
      });
      onUpdate([newRx, ...prescriptions]);
      showToast(`Duplicated as ${newRx.id} (Draft)`);
    } catch (error) {
      console.error(error);
      showToast("Could not duplicate prescription");
    }
  };

  const deletePrescription = async (id: string) => {
    try {
      await prescriptionsApi.remove(id);
      onUpdate(prescriptions.filter(rx => rx.id !== id));
      showToast("Prescription deleted");
      setDeleteId(null);
    } catch (error) {
      console.error(error);
      showToast("Could not delete prescription");
    }
  };

  const exportCSV = () => {
    const hdr = ["Rx ID", "Patient", "Date", "Diagnosis", "Medicines", "Status"];
    const rows = filtered.map(rx => [rx.id, `"${rx.patient}"`, rx.date, `"${rx.diagnosis}"`, rx.medicines, rx.status]);
    const csv = [hdr, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "prescription-history.csv"; a.click();
    URL.revokeObjectURL(url);
    showToast(`${filtered.length} prescriptions exported`);
  };

  const SortIndicator = ({ col }: { col: string }) =>
    sortBy === col ? <span className="text-blue-600">{sortDir === "asc" ? "  up" : "  down"}</span> : <span className="text-gray-300 opacity-60">  sort</span>;

  // Render
  return (
    <div className="p-6 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Prescription History</h1>
          <p className="text-sm text-gray-500">All prescriptions issued by you  -  {prescriptions.length} total</p>
        </div>
        <button onClick={exportCSV} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 border border-gray-200 bg-white rounded-lg hover:bg-gray-50 transition-colors">
          <Download className="w-4 h-4" />Export CSV
        </button>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-52">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search patient, Rx ID, or diagnosis..."
              className="w-full pl-9 pr-9 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
            {search && (
              <button onClick={() => { setSearch(""); setPage(1); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Date range */}
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-medium text-gray-500 whitespace-nowrap">From</label>
            <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-medium text-gray-500 whitespace-nowrap">To</label>
            <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
          </div>

          {/* Status */}
          <select
            value={filterStatus}
            onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          >
            <option value="All">All Status</option>
            <option value="Final">Final</option>
            <option value="Draft">Draft</option>
          </select>

          {(activeFilters > 0 || search) && (
            <button onClick={clearAll} className="text-xs text-red-500 hover:text-red-600 font-medium whitespace-nowrap transition-colors">
              Clear all
            </button>
          )}
        </div>

        {(activeFilters > 0 || search) && (
          <p className="text-xs text-blue-600">
            {filtered.length} prescription{filtered.length !== 1 ? "s" : ""} match your filters
          </p>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/60">
              {[
                { key: "id", label: "Rx ID" },
                { key: "patient", label: "Patient" },
                { key: "date", label: "Date" },
                { key: "diagnosis", label: "Diagnosis" },
                { key: "medicines", label: "Medicines" },
                { key: "status", label: "Status" },
              ].map(col => (
                <th key={col.key} onClick={() => handleSort(col.key)}
                  className="text-left text-xs font-medium text-gray-500 px-5 py-3.5 cursor-pointer hover:text-gray-700 select-none whitespace-nowrap">
                  {col.label}<SortIndicator col={col.key} />
                </th>
              ))}
              <th className="text-left text-xs font-medium text-gray-500 px-5 py-3.5">Action</th>
            </tr>
          </thead>
          <tbody>
            {paged.map(rx => (
              <tr key={rx.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors group">
                <td className="px-5 py-3.5">
                  <button onClick={() => setViewingRx(rx)} className="text-xs font-mono text-blue-600 hover:text-blue-700 bg-blue-50 px-2 py-0.5 rounded transition-colors">
                    {rx.id}
                  </button>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <Av name={rx.patient} size="sm" />
                    <span className="font-medium text-gray-900">{rx.patient}</span>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-xs text-gray-500">{rx.date}</td>
                <td className="px-5 py-3.5 text-xs text-gray-700 max-w-44">
                  <span className="truncate block">{rx.diagnosis}</span>
                </td>
                <td className="px-5 py-3.5">
                  <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full font-medium border border-blue-200">
                    {rx.medicines} items
                  </span>
                </td>
                <td className="px-5 py-3.5"><StatusBadge status={rx.status} /></td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-1">
                    {/* View */}
                    <button onClick={() => setViewingRx(rx)} title="View prescription"
                      className="p-1.5 hover:bg-blue-50 rounded-md text-blue-600 transition-colors">
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    {/* Print */}
                    <button onClick={() => { setViewingRx(rx); setTimeout(printPrescription, 300); }} title="Print"
                      className="p-1.5 hover:bg-gray-100 rounded-md text-gray-500 transition-colors">
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                    {/* Duplicate */}
                    <button onClick={() => duplicate(rx)} title="Duplicate as draft"
                      className="p-1.5 hover:bg-gray-100 rounded-md text-gray-500 transition-colors">
                      <Copy className="w-3.5 h-3.5" />
                    </button>

                    {/* More menu */}
                    <div className="relative" ref={openMenu === rx.id ? menuRef : undefined}>
                      <button onClick={() => setOpenMenu(openMenu === rx.id ? null : rx.id)}
                        className="p-1.5 hover:bg-gray-100 rounded-md text-gray-500 transition-colors">
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>
                      {openMenu === rx.id && (
                        <div className="absolute right-0 top-full mt-1 min-w-48 bg-white rounded-xl border border-gray-200 shadow-xl py-1.5 z-40">
                          <button onClick={() => { setViewingRx(rx); setOpenMenu(null); }}
                            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">
                            <Eye className="w-4 h-4 text-gray-400" />View Prescription
                          </button>
                          <button onClick={() => { duplicate(rx); setOpenMenu(null); }}
                            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">
                            <Copy className="w-4 h-4 text-gray-400" />Duplicate as Draft
                          </button>
                          <button onClick={() => { setViewingRx(rx); setOpenMenu(null); setTimeout(printPrescription, 300); }}
                            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">
                            <Printer className="w-4 h-4 text-gray-400" />Print
                          </button>
                          <button onClick={() => { navigator.clipboard?.writeText(`Prescription ${rx.id} - ${rx.patient} - ${rx.date}`); showToast("Rx details copied to clipboard"); setOpenMenu(null); }}
                            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">
                            <Share2 className="w-4 h-4 text-gray-400" />Copy &amp; Share
                          </button>
                          <div className="my-1 border-t border-gray-100" />
                          <button onClick={() => { setDeleteId(rx.id); setOpenMenu(null); }}
                            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-red-600 hover:bg-red-50 text-left">
                            <Trash2 className="w-4 h-4" />Delete Permanently
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
              <FileText className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-900">No prescriptions found</p>
            <p className="text-xs text-gray-500 mt-1">
              {activeFilters > 0 || search ? "Try adjusting your search or filters" : "Create your first prescription to get started"}
            </p>
            {(activeFilters > 0 || search) && (
              <button onClick={clearAll} className="mt-3 text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors">
                Reset all filters
              </button>
            )}
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100 bg-gray-50/40">
          <p className="text-xs text-gray-500">
            {sorted.length === 0
              ? "No results"
              : `Showing ${(page - 1) * PAGE_SIZE + 1}-${Math.min(page * PAGE_SIZE, sorted.length)} of ${sorted.length} prescriptions`}
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 disabled:opacity-40 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
              .map((n, idx, arr) => (
                <span key={n} className="flex items-center">
                  {idx > 0 && arr[idx - 1] !== n - 1 && <span className="px-1 text-xs text-gray-400">...</span>}
                  <button onClick={() => setPage(n)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${n === page ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}>
                    {n}
                  </button>
                </span>
              ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 disabled:opacity-40 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Delete confirmation */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-5 h-5 text-red-500" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 text-center mb-2">Delete Prescription?</h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              <strong>{deleteId}</strong> will be permanently removed. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors font-medium">Cancel</button>
              <button onClick={() => deletePrescription(deleteId)} className="flex-1 px-4 py-2 text-sm text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors font-medium">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Prescription view modal */}
      {viewingRx && <PrescriptionViewModal rx={viewingRx} onClose={() => setViewingRx(null)} />}
    </div>
  );
}

// BILLING
function BillingView({ billing, onNewInvoice, showToast }: { billing: typeof EMPTY_BILLING; onNewInvoice: () => void; showToast: (msg: string) => void }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All Status");
  const filtered = billing.filter(inv => {
    const matchesQuery = `${inv.id} ${inv.patient} ${inv.method}`.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = status === "All Status" || inv.status === status;
    return matchesQuery && matchesStatus;
  });
  const totalRevenue = billing.reduce((sum, inv) => sum + Number(inv.amount || 0), 0);
  const totalCollected = billing.reduce((sum, inv) => sum + Number(inv.paid || 0), 0);
  const totalOutstanding = billing.reduce((sum, inv) => sum + Number(inv.due || 0), 0);
  const unpaidCount = billing.filter(inv => Number(inv.due || 0) > 0 || inv.status === "Unpaid" || inv.status === "Partial").length;
  const collectionRate = totalRevenue > 0 ? Math.round((totalCollected / totalRevenue) * 100) : 0;
  const formatBdt = (value: number) => `BDT ${value.toLocaleString()}`;
  const invoiceText = (inv: typeof billing[number]) => [
    "Renata Cancer Care",
    `Invoice: ${inv.id}`,
    `Patient: ${inv.patient}`,
    `Date: ${inv.date}`,
    `Amount: ${inv.amount}`,
    `Discount: ${inv.discount}`,
    `Paid: ${inv.paid}`,
    `Due: ${inv.due}`,
    `Method: ${inv.method}`,
    `Status: ${inv.status}`,
  ].join("\n");
  const exportInvoices = () => {
    const rows = filtered.map(inv => [inv.id, inv.patient, inv.date, inv.amount, inv.discount, inv.paid, inv.due, inv.method, inv.status].join(","));
    downloadTextFile("billing-export.csv", ["Invoice ID,Patient,Date,Amount,Discount,Paid,Due,Method,Status", ...rows].join("\n"));
    showToast(`${filtered.length} invoices exported`);
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Billing Management</h1>
          <p className="text-sm text-gray-500">Track consultations and payments</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportInvoices} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 border border-gray-200 bg-white rounded-lg hover:bg-gray-50 transition-colors"><Download className="w-4 h-4" />Export</button>
          <button onClick={onNewInvoice} className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"><Plus className="w-4 h-4" />New Invoice</button>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Total Revenue", value: formatBdt(totalRevenue), sub: `${billing.length} invoice${billing.length === 1 ? "" : "s"}`, color: "text-gray-900" },
          { label: "Total Collected", value: formatBdt(totalCollected), sub: `${collectionRate}% collection rate`, color: "text-gray-900" },
          { label: "Outstanding", value: formatBdt(totalOutstanding), sub: `${unpaidCount} unpaid invoice${unpaidCount === 1 ? "" : "s"}`, color: totalOutstanding > 0 ? "text-red-600" : "text-gray-900" },
        ].map((c) => (
          <div key={c.label} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <p className="text-xs text-gray-500 mb-1">{c.label}</p>
            <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
            <p className="text-xs text-gray-400 mt-1">{c.sub}</p>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex flex-col gap-3 p-4 border-b border-gray-100 sm:flex-row sm:items-center">
          <div className="relative w-full sm:flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search patient..." className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          </div>
          <select value={status} onChange={e => setStatus(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none">
            <option>All Status</option><option>Paid</option><option>Partial</option><option>Unpaid</option>
          </select>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/60">
              {["Invoice ID", "Patient", "Date", "Amount", "Discount", "Paid", "Due", "Method", "Status", "Action"].map((h) => (
                <th key={h} className="text-left text-xs font-medium text-gray-500 px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((inv) => (
              <tr key={inv.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-3 text-xs font-mono text-gray-600">{inv.id}</td>
                <td className="px-4 py-3"><div className="flex items-center gap-2"><Av name={inv.patient} size="sm" /><span className="text-sm font-medium text-gray-900">{inv.patient}</span></div></td>
                <td className="px-4 py-3 text-xs text-gray-500">{inv.date}</td>
                <td className="px-4 py-3 text-sm font-semibold text-gray-900">BDT {inv.amount.toLocaleString()}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{inv.discount ? `BDT ${inv.discount}` : "-"}</td>
                <td className="px-4 py-3 text-sm font-semibold text-green-600">BDT {inv.paid.toLocaleString()}</td>
                <td className="px-4 py-3 text-sm font-semibold text-red-600">{inv.due ? `BDT ${inv.due}` : "-"}</td>
                <td className="px-4 py-3 text-xs text-gray-600">{inv.method}</td>
                <td className="px-4 py-3"><StatusBadge status={inv.status} /></td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button onClick={() => { downloadTextFile(`${inv.id}.txt`, invoiceText(inv)); showToast(`${inv.id} downloaded`); }} className="p-1.5 hover:bg-blue-50 rounded-md text-blue-600 transition-colors" title="Download invoice"><Eye className="w-3.5 h-3.5" /></button>
                    <button onClick={() => window.print()} className="p-1.5 hover:bg-gray-100 rounded-md text-gray-500 transition-colors" title="Print invoice"><Printer className="w-3.5 h-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// REPORTS
function ReportsView() {
  const [period, setPeriod] = useState("month");
  const [reports, setReports] = useState<ReportsData>(EMPTY_REPORTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    reportsApi.get(period)
      .then((data) => {
        if (!cancelled) setReports(data);
      })
      .catch((error) => {
        console.error(error);
        if (!cancelled) setReports(EMPTY_REPORTS);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [period]);

  const exportReport = () => {
    const patientRows = reports.patientTrends.map(row => [row.month, row.new, row.returning].join(","));
    const rxRows = reports.prescriptionVolume.map(row => [row.month, row.prescriptions].join(","));
    downloadTextFile(`reports-${period}.csv`, [
      "Metric,Value",
      `Total Patients,${reports.totals.patients}`,
      `Prescriptions,${reports.totals.prescriptions}`,
      `Appointments,${reports.totals.appointments}`,
      `Revenue,${reports.totals.revenue}`,
      "",
      "Month,New Patients,Returning Patients",
      ...patientRows,
      "",
      "Month,Prescriptions",
      ...rxRows,
    ].join("\n"));
  };

  const reportCards = [
    { title: "Total Patients", value: reports.totals.patients.toLocaleString(), icon: Users, iconClass: "bg-blue-50 text-blue-600" },
    { title: "Prescriptions", value: reports.totals.prescriptions.toLocaleString(), icon: FileText, iconClass: "bg-cyan-50 text-cyan-600" },
    { title: "Appointments", value: reports.totals.appointments.toLocaleString(), icon: Calendar, iconClass: "bg-green-50 text-green-600" },
    { title: "Revenue", value: `BDT ${reports.totals.revenue.toLocaleString()}`, icon: CreditCard, iconClass: "bg-purple-50 text-purple-600" },
  ];
  const insightCards = [
    { title: "Common Diagnoses", color: "#2563EB", items: reports.commonDiagnoses },
    { title: "Top Prescribed Medicines", color: "#0EA5E9", items: reports.topMedicines },
  ];

  return (
    <div className="p-4 space-y-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Reports &amp; Analytics</h1>
          <p className="text-sm text-gray-500">Live practice analytics from the database</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            {[["today", "Today"], ["week", "Week"], ["month", "Month"]].map(([v, l]) => (
              <button key={v} onClick={() => setPeriod(v)} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${period === v ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>{l}</button>
            ))}
          </div>
          <button onClick={exportReport} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 border border-gray-200 bg-white rounded-lg hover:bg-gray-50 transition-colors"><Download className="w-4 h-4" />Export</button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {reportCards.map(card => (
          <StatCard key={card.title} title={card.title} value={loading ? "..." : card.value} change="Live DB" icon={card.icon} iconClass={card.iconClass} />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Patient Trends</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={reports.patientTrends} margin={{ left: -20 }}>
              <defs>
                <linearGradient id="rpt-new" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563EB" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Area type="monotone" dataKey="new" stroke="#2563EB" strokeWidth={2} fill="url(#rpt-new)" name="New Patients" />
              <Area type="monotone" dataKey="returning" stroke="#0EA5E9" strokeWidth={2} fill="none" name="Returning Patients" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Prescription Volume</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={reports.prescriptionVolume} margin={{ left: -20 }} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Bar dataKey="prescriptions" fill="#2563EB" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {insightCards.map((card) => (
          <div key={card.title} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">{card.title}</h3>
            <div className="space-y-3">
              {card.items.length === 0 && <p className="text-xs text-gray-400">No database records yet</p>}
              {card.items.map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between text-xs mb-1"><span className="font-medium text-gray-700">{item.label}</span><span className="text-gray-500">{item.count}</span></div>
                  <div className="h-1.5 bg-gray-100 rounded-full">
                    <div className="h-1.5 rounded-full" style={{ width: `${item.pct}%`, background: card.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
const ICD10_CATEGORIES = [
  { code: "A00-B99", description: "Certain infectious and parasitic diseases" },
  { code: "C00-D49", description: "Neoplasms" },
  { code: "D50-D89", description: "Diseases of the blood and blood-forming organs and certain disorders involving the immune mechanism" },
  { code: "E00-E89", description: "Endocrine, nutritional and metabolic diseases" },
  { code: "F01-F99", description: "Mental, Behavioral and Neurodevelopmental disorders" },
  { code: "G00-G99", description: "Diseases of the nervous system" },
  { code: "H00-H59", description: "Diseases of the eye and adnexa" },
  { code: "H60-H95", description: "Diseases of the ear and mastoid process" },
  { code: "I00-I99", description: "Diseases of the circulatory system" },
  { code: "J00-J99", description: "Diseases of the respiratory system" },
  { code: "K00-K95", description: "Diseases of the digestive system" },
  { code: "L00-L99", description: "Diseases of the skin and subcutaneous tissue" },
  { code: "M00-M99", description: "Diseases of the musculoskeletal system and connective tissue" },
  { code: "N00-N99", description: "Diseases of the genitourinary system" },
  { code: "O00-O9A", description: "Pregnancy, childbirth and the puerperium" },
  { code: "P00-P96", description: "Certain conditions originating in the perinatal period" },
  { code: "Q00-QA0", description: "Congenital malformations, deformations, chromosomal abnormalities, and genetic disorders" },
  { code: "R00-R99", description: "Symptoms, signs and abnormal clinical and laboratory findings, not elsewhere classified" },
  { code: "S00-T88", description: "Injury, poisoning and certain other consequences of external causes" },
  { code: "U00-U85", description: "Codes for special purposes" },
  { code: "V00-Y99", description: "External causes of morbidity" },
  { code: "Z00-Z99", description: "Factors influencing health status and contact with health services" },
] as const;

// Common cancer sites, 3-character WHO ICD-10 (2019) codes with official labels.
const ONCOLOGY_ICD10 = [
  { code: "C01", description: "Malignant neoplasm of base of tongue" },
  { code: "C02", description: "Malignant neoplasm of other and unspecified parts of tongue" },
  { code: "C06", description: "Malignant neoplasm of other and unspecified parts of mouth" },
  { code: "C09", description: "Malignant neoplasm of tonsil" },
  { code: "C10", description: "Malignant neoplasm of oropharynx" },
  { code: "C11", description: "Malignant neoplasm of nasopharynx" },
  { code: "C15", description: "Malignant neoplasm of oesophagus" },
  { code: "C16", description: "Malignant neoplasm of stomach" },
  { code: "C18", description: "Malignant neoplasm of colon" },
  { code: "C19", description: "Malignant neoplasm of rectosigmoid junction" },
  { code: "C20", description: "Malignant neoplasm of rectum" },
  { code: "C22", description: "Malignant neoplasm of liver and intrahepatic bile ducts" },
  { code: "C23", description: "Malignant neoplasm of gallbladder" },
  { code: "C25", description: "Malignant neoplasm of pancreas" },
  { code: "C32", description: "Malignant neoplasm of larynx" },
  { code: "C34", description: "Malignant neoplasm of bronchus and lung" },
  { code: "C40", description: "Malignant neoplasm of bone and articular cartilage of limbs" },
  { code: "C41", description: "Malignant neoplasm of bone and articular cartilage of other and unspecified sites" },
  { code: "C43", description: "Malignant melanoma of skin" },
  { code: "C45", description: "Mesothelioma" },
  { code: "C49", description: "Malignant neoplasm of other connective and soft tissue" },
  { code: "C50", description: "Malignant neoplasm of breast" },
  { code: "C51", description: "Malignant neoplasm of vulva" },
  { code: "C53", description: "Malignant neoplasm of cervix uteri" },
  { code: "C54", description: "Malignant neoplasm of corpus uteri" },
  { code: "C56", description: "Malignant neoplasm of ovary" },
  { code: "C61", description: "Malignant neoplasm of prostate" },
  { code: "C62", description: "Malignant neoplasm of testis" },
  { code: "C64", description: "Malignant neoplasm of kidney, except renal pelvis" },
  { code: "C67", description: "Malignant neoplasm of bladder" },
  { code: "C71", description: "Malignant neoplasm of brain" },
  { code: "C73", description: "Malignant neoplasm of thyroid gland" },
  { code: "C77", description: "Secondary and unspecified malignant neoplasm of lymph nodes" },
  { code: "C78", description: "Secondary malignant neoplasm of respiratory and digestive organs" },
  { code: "C79", description: "Secondary malignant neoplasm of other and unspecified sites" },
  { code: "C80", description: "Malignant neoplasm, without specification of site" },
  { code: "C81", description: "Hodgkin lymphoma" },
  { code: "C83", description: "Non-follicular lymphoma" },
  { code: "C85", description: "Other and unspecified types of non-Hodgkin lymphoma" },
  { code: "C90", description: "Multiple myeloma and malignant plasma cell neoplasms" },
  { code: "C91", description: "Lymphoid leukaemia" },
  { code: "C92", description: "Myeloid leukaemia" },
] as const;

const icd10Label = (code: string) => {
  const match = [...ONCOLOGY_ICD10, ...ICD10_CATEGORIES].find(item => item.code === code);
  return match ? `${match.code} ${match.description}` : code;
};

// Disease grouping for the patient filter and research alerts: the ICD-10 code
// from the saved Patient Summary, else the latest prescription diagnosis text.
type DiseaseGroup = { key: string; label: string; count: number };

const diseaseKeyOf = (patient: Patient) => {
  if (patient.diseaseCode) return `icd:${patient.diseaseCode}`;
  const text = (patient.diagnosis ?? "").split(" - ")[0].trim().replace(/\s+/g, " ").toLowerCase();
  return text ? `dx:${text}` : "";
};

const diseaseLabelOf = (patient: Patient) => {
  if (patient.diseaseCode) return icd10Label(patient.diseaseCode);
  return (patient.diagnosis ?? "").split(" - ")[0].trim().replace(/\s+/g, " ");
};

const buildDiseaseGroups = (patients: Patient[]): DiseaseGroup[] => {
  const groups = new Map<string, DiseaseGroup>();
  patients.forEach(patient => {
    const key = diseaseKeyOf(patient);
    if (!key) return;
    const group = groups.get(key) ?? { key, label: diseaseLabelOf(patient), count: 0 };
    group.count += 1;
    groups.set(key, group);
  });
  return [...groups.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
};

const RESPONSE_OPTIONS: { value: string; definition: string; sources: ClinicalSourceId[] }[] = [
  { value: "Complete response", definition: "CR: disappearance of all target lesions; pathological lymph nodes reduced to <10 mm short axis.", sources: ["recist"] },
  { value: "Partial response", definition: "PR: at least 30% decrease in the sum of diameters of target lesions, compared with baseline.", sources: ["recist"] },
  { value: "Stable disease", definition: "SD: neither enough shrinkage for PR nor enough increase for PD, compared with the smallest sum on study (nadir).", sources: ["recist"] },
  { value: "Progressive disease", definition: "PD: at least 20% increase in the sum of diameters (and at least 5 mm absolute) from the nadir, or new lesions.", sources: ["recist"] },
  { value: "Oligoprogression", definition: "A limited number of growing or new metastatic lesions while on active systemic therapy, with the remaining disease controlled. Up to 5 progressing lesions is the common working limit.", sources: ["oligo", "oligoReview"] },
  { value: "Not evaluable", definition: "NE: response could not be assessed (e.g. missing or inadequate imaging).", sources: ["recist"] },
  { value: "Under review", definition: "Assessment pending.", sources: [] },
];

const LOCAL_THERAPY_OPTIONS = ["SBRT / stereotactic radiotherapy", "Conventional radiotherapy", "Surgery / metastasectomy", "Thermal ablation (RFA / MWA)", "Other"];

const weeksBetween = (from: string, to: string) => {
  const start = new Date(from).getTime();
  const end = new Date(to).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return "";
  return ((end - start) / (7 * 24 * 60 * 60 * 1000)).toFixed(1);
};

const depthOfResponsePct = (baseline: string, nadir: string) => {
  const base = parseFloat(baseline);
  const low = parseFloat(nadir);
  if (!(base > 0) || Number.isNaN(low) || low < 0) return "";
  return (((base - low) / base) * 100).toFixed(1);
};

// TEMPLATES
function PatientSummaryView({ patients, prescriptions, showToast, onSummarySaved }: {
  patients: typeof EMPTY_PATIENTS;
  prescriptions: typeof EMPTY_PRESCRIPTIONS;
  showToast: (msg: string) => void;
  onSummarySaved: (patientId: string, data: PatientSummaryData) => void;
}) {
  const [patientId, setPatientId] = useState("");
  const [loadedPatientId, setLoadedPatientId] = useState("");
  const [summary, setSummary] = useState<PatientSummaryData>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const selectedPatient = patients.find(p => p.id === patientId);
  const loadedPatient = patients.find(p => p.id === loadedPatientId);
  const inputCls = "w-full rounded-lg border border-slate-200 bg-slate-100/80 px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/15";
  const labelCls = "mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-900";
  type TopField = Exclude<keyof PatientSummaryData, "oligo" | "tki">;
  const setField = (key: TopField, value: string) => setSummary(prev => ({ ...prev, [key]: value }));
  const setOligo = (key: keyof PatientSummaryData["oligo"], value: string) => setSummary(prev => ({ ...prev, oligo: { ...prev.oligo, [key]: value } }));
  const setTki = <K extends keyof PatientSummaryData["tki"]>(key: K, value: PatientSummaryData["tki"][K]) =>
    setSummary(prev => ({ ...prev, tki: { ...prev.tki, [key]: value } }));
  const responseInfo = RESPONSE_OPTIONS.find(option => option.value === summary.response);
  const lesionCount = parseInt(summary.oligo.lesionCount, 10);
  const calculatedDpr = depthOfResponsePct(summary.tki.baselineSum, summary.tki.nadirSum);
  const calculatedTtbr = summary.tki.startDate && summary.tki.bestResponseDate ? weeksBetween(summary.tki.startDate, summary.tki.bestResponseDate) : "";

  const loadPatientData = async () => {
    if (!selectedPatient) {
      showToast("Please choose a patient first");
      return;
    }
    setLoading(true);
    try {
      const saved = await summariesApi.get(selectedPatient.id);
      const patientRx = prescriptions.find(rx => rx.patientId === selectedPatient.id || rx.patient === selectedPatient.name);
      const data = normaliseSummary(saved.data);
      // Only empty fields are pre-filled from the latest prescription.
      if (!data.diagnosis && patientRx?.diagnosis) data.diagnosis = patientRx.diagnosis;
      setSummary(data);
      setLastSaved(saved.updatedAt);
      setLoadedPatientId(selectedPatient.id);
      showToast(saved.data ? `Loaded saved summary for ${selectedPatient.name}` : `No saved summary yet for ${selectedPatient.name}`);
    } catch (error) {
      console.error(error);
      showToast("Could not load patient summary");
    } finally {
      setLoading(false);
    }
  };

  const saveSummary = async () => {
    if (!loadedPatient) {
      showToast("Load a patient before saving");
      return;
    }
    setSaving(true);
    try {
      const result = await summariesApi.save(loadedPatient.id, summary);
      setLastSaved(result.updatedAt);
      onSummarySaved(loadedPatient.id, result.data);
      showToast(`Summary saved for ${loadedPatient.name}`);
    } catch (error) {
      console.error(error);
      showToast("Could not save patient summary");
    } finally {
      setSaving(false);
    }
  };

  const summaryText = () => [
    "Patient Summary",
    loadedPatient ? `Patient: ${loadedPatient.name} (${loadedPatient.id})` : "Patient: Not loaded",
    loadedPatient ? `Age/Sex: ${loadedPatient.age}y / ${loadedPatient.gender}` : "",
    "",
    "Clinical Summary",
    `Primary Diagnosis: ${summary.diagnosis}`,
    `ICD-10 Code: ${summary.icd10 ? icd10Label(summary.icd10) : ""}`,
    `Stage: ${summary.stage}`,
    `ECOG Status: ${summary.ecog}`,
    `Cycle Number: ${summary.cycle}`,
    `Known Allergies: ${summary.allergies}`,
    "",
    "Treatment Summary",
    `Current Regimen: ${summary.regimen}`,
    `Side Effects / Toxicity: ${summary.toxicity}`,
    `Treatment Response: ${summary.response}`,
    ...(summary.response === "Oligoprogression" ? [
      `  Progressing lesions: ${summary.oligo.lesionCount}`,
      `  Sites: ${summary.oligo.sites}`,
      `  Detected on: ${summary.oligo.detectedOn}`,
      `  Systemic therapy at progression: ${summary.oligo.systemicTherapy}`,
      `  Continue systemic therapy: ${summary.oligo.continueSystemic}`,
      `  Local therapy: ${summary.oligo.localTherapy}`,
      `  Notes: ${summary.oligo.notes}`,
    ] : []),
    `Follow-up Plan: ${summary.followUp}`,
    ...(summary.tki.enabled ? [
      "",
      "TKI Response",
      `TKI: ${summary.tki.drug} (started ${summary.tki.startDate})`,
      `Best overall response: ${summary.tki.bestResponse}${summary.tki.bestResponseDate ? ` on ${summary.tki.bestResponseDate}` : ""}`,
      `Maximum tumor response (depth of response): ${summary.tki.depthOfResponse ? `${summary.tki.depthOfResponse}%` : ""}`,
      `Time to best response: ${summary.tki.timeToBestResponse ? `${summary.tki.timeToBestResponse} weeks` : ""}`,
      `Duration of response: ${summary.tki.durationOfResponse}`,
      ...summary.tki.customPoints.filter(point => point.label || point.value).map(point => `${point.label}: ${point.value}`),
    ] : []),
    "",
    "Sources",
    ...(["recist", "oligo", "dpr", "ttbr", "dor"] as ClinicalSourceId[]).map(id => `- ${CLINICAL_SOURCES[id].title}. ${CLINICAL_SOURCES[id].url}`),
  ].filter(line => line !== null && line !== undefined).join("\n");

  const exportSummary = (format: string) => {
    const safeName = loadedPatient?.name.replace(/\s+/g, "-").toLowerCase() || "patient-summary";
    const ext = format === "Excel" ? "csv" : format.toLowerCase();
    downloadTextFile(`${safeName}-${format.toLowerCase()}.${ext}`, summaryText());
    showToast(`Patient summary exported as ${format}`);
  };

  const activeTreatment = prescriptions.filter(rx => rx.status === "Draft").length || 2;
  const followUps = patients.filter(p => p.totalVisits < 6).length;
  const completed = prescriptions.filter(rx => rx.status === "Final").length;

  return (
    <div className="mx-auto w-full max-w-[1180px] px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-950" style={{ fontFamily: "var(--font-display)" }}>Patient Summary</h1>
          <p className="mt-2 text-sm text-slate-500">Quick summary mode for doctors who prefer condensed records</p>
        </div>
        {loadedPatient && (
          <div className="flex items-center gap-3">
            {lastSaved && <span className="text-xs text-slate-400">Last saved {lastSaved}</span>}
            <button onClick={saveSummary} disabled={saving} className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60">
              <Save className="h-4 w-4" />{saving ? "Saving..." : "Save Summary"}
            </button>
          </div>
        )}
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <label className={labelCls}>Select Patient</label>
        <div className="grid gap-3 md:grid-cols-[1fr_22rem]">
          <select value={patientId} onChange={e => setPatientId(e.target.value)} className={inputCls}>
            <option value="">Choose a patient</option>
            {patients.map(patient => <option key={patient.id} value={patient.id}>{patient.name} - {patient.id}</option>)}
          </select>
          <button onClick={loadPatientData} disabled={loading} className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60">
            {loading ? "Loading..." : "Load Patient Data"}
          </button>
        </div>
        {loadedPatient && (
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
            <span className="rounded-full bg-blue-50 px-3 py-1 font-semibold text-blue-700">{loadedPatient.age}y / {loadedPatient.gender}</span>
            <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold">{loadedPatient.mobile}</span>
            <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold">Blood {loadedPatient.bloodGroup}</span>
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-800">Clinical Summary</h2>
          <div className="mt-8 space-y-4">
            <div>
              <label className={labelCls}>Primary Diagnosis</label>
              <input value={summary.diagnosis} onChange={e => setField("diagnosis", e.target.value)} placeholder="e.g., Non-Small Cell Lung Cancer" className={inputCls} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={labelCls}>ICD-10 Code <SourceLink ids={["icd10"]} /></label>
                <select value={summary.icd10} onChange={e => setField("icd10", e.target.value)} className={inputCls}>
                  <option value="">Select ICD-10 code</option>
                  <optgroup label="Cancer sites (WHO ICD-10)">
                    {ONCOLOGY_ICD10.map(item => <option key={item.code} value={item.code}>{item.code} — {item.description}</option>)}
                  </optgroup>
                  <optgroup label="ICD-10 chapters">
                    {ICD10_CATEGORIES.map(category => (
                      <option key={category.code} value={category.code}>
                        {category.code} — {category.description}
                      </option>
                    ))}
                  </optgroup>
                </select>
                <p className="mt-1 text-[11px] text-slate-400">Used to group patients by disease for filtering and research alerts.</p>
              </div>
              <div>
                <label className={labelCls}>Stage</label>
                <select value={summary.stage} onChange={e => setField("stage", e.target.value)} className={inputCls}>
                  <option value="">Select</option><option>Stage I</option><option>Stage II</option><option>Stage III</option><option>Stage IV</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>ECOG Status</label>
                <select value={summary.ecog} onChange={e => setField("ecog", e.target.value)} className={inputCls}>
                  <option value="">Select</option><option>0</option><option>1</option><option>2</option><option>3</option><option>4</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Cycle Number</label>
                <input value={summary.cycle} onChange={e => setField("cycle", e.target.value)} placeholder="e.g., Cycle 3/6" className={inputCls} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Known Allergies</label>
              <input value={summary.allergies} onChange={e => setField("allergies", e.target.value)} placeholder="List any allergies" className={inputCls} />
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-800">Treatment Summary</h2>
          <div className="mt-8 space-y-4">
            <div>
              <label className={labelCls}>Current Regimen</label>
              <input value={summary.regimen} onChange={e => setField("regimen", e.target.value)} placeholder="e.g., Cisplatin + Pemetrexed" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Side Effects / Toxicity</label>
              <textarea value={summary.toxicity} onChange={e => setField("toxicity", e.target.value)} placeholder="Note any side effects or toxicity..." rows={3} className={`${inputCls} resize-none`} />
            </div>
            <div>
              <label className={labelCls}>Treatment Response <SourceLink ids={["recist"]} /></label>
              <select value={summary.response} onChange={e => setField("response", e.target.value)} className={inputCls}>
                <option value="">Select response</option>
                {RESPONSE_OPTIONS.map(option => <option key={option.value} value={option.value} title={option.definition}>{option.value}</option>)}
              </select>
              {responseInfo && (
                <p className="mt-1.5 flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-500">
                  <span className="flex-1">{responseInfo.definition}</span>
                  {responseInfo.sources.length > 0 && <SourceLink ids={responseInfo.sources} />}
                </p>
              )}
            </div>
            <div>
              <label className={labelCls}>Follow-up Plan</label>
              <textarea value={summary.followUp} onChange={e => setField("followUp", e.target.value)} placeholder="Next steps and follow-up schedule..." rows={3} className={`${inputCls} resize-none`} />
            </div>
          </div>
        </section>
      </div>

      {summary.response === "Oligoprogression" && (
        <section className="rounded-xl border border-amber-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-slate-800">Oligoprogression Details</h2>
            <SourceLink ids={["oligo", "oligoReview", "omd"]} />
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Limited progression on active systemic therapy while other disease stays controlled. Usually managed with local therapy
            (e.g. SBRT) to the progressing sites while continuing the same systemic treatment.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className={labelCls}>Number of progressing lesions</label>
              <input type="number" min={1} value={summary.oligo.lesionCount} onChange={e => setOligo("lesionCount", e.target.value)} placeholder="1-5" className={inputCls} />
              {lesionCount > 5 && <p className="mt-1 text-[11px] font-semibold text-amber-700">More than 5 lesions is usually classed as widespread progression, not oligoprogression.</p>}
            </div>
            <div>
              <label className={labelCls}>Date detected</label>
              <input type="date" value={summary.oligo.detectedOn} onChange={e => setOligo("detectedOn", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Continue current systemic therapy?</label>
              <select value={summary.oligo.continueSystemic} onChange={e => setOligo("continueSystemic", e.target.value)} className={inputCls}>
                <option value="">Select</option><option>Yes</option><option>No - switch therapy</option>
              </select>
            </div>
            <div className="sm:col-span-2 lg:col-span-1">
              <label className={labelCls}>Progressing sites</label>
              <input value={summary.oligo.sites} onChange={e => setOligo("sites", e.target.value)} placeholder="e.g., Right adrenal, L3 vertebra" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Systemic therapy at progression</label>
              <input value={summary.oligo.systemicTherapy} onChange={e => setOligo("systemicTherapy", e.target.value)} placeholder="e.g., Osimertinib 80 mg" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Local therapy</label>
              <select value={summary.oligo.localTherapy} onChange={e => setOligo("localTherapy", e.target.value)} className={inputCls}>
                <option value="">Select</option>
                {LOCAL_THERAPY_OPTIONS.map(option => <option key={option}>{option}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className={labelCls}>Notes</label>
              <textarea value={summary.oligo.notes} onChange={e => setOligo("notes", e.target.value)} rows={2} className={`${inputCls} resize-none`} />
            </div>
          </div>
        </section>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <label className="flex items-center gap-3">
          <input type="checkbox" checked={summary.tki.enabled} onChange={e => setTki("enabled", e.target.checked)} className="h-4 w-4 accent-blue-600" />
          <span className="text-base font-semibold text-slate-800">On TKI therapy (tyrosine kinase inhibitor)</span>
        </label>
        {summary.tki.enabled && (
          <div className="mt-6 space-y-5">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className={labelCls}>TKI drug</label>
                <input value={summary.tki.drug} onChange={e => setTki("drug", e.target.value)} placeholder="e.g., Osimertinib, Gefitinib, Imatinib" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>TKI start date</label>
                <input type="date" value={summary.tki.startDate} onChange={e => setTki("startDate", e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Best overall response <SourceLink ids={["bor", "recist"]} /></label>
                <select value={summary.tki.bestResponse} onChange={e => setTki("bestResponse", e.target.value)} className={inputCls}>
                  <option value="">Select</option>
                  {RESPONSE_OPTIONS.filter(option => ["Complete response", "Partial response", "Stable disease", "Progressive disease", "Not evaluable"].includes(option.value))
                    .map(option => <option key={option.value}>{option.value}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Date of best response</label>
                <input type="date" value={summary.tki.bestResponseDate} onChange={e => setTki("bestResponseDate", e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Time to best response (weeks) <SourceLink ids={["ttbr"]} /></label>
                <div className="flex gap-2">
                  <input value={summary.tki.timeToBestResponse} onChange={e => setTki("timeToBestResponse", e.target.value)} placeholder="weeks" className={inputCls} />
                  {calculatedTtbr && (
                    <button onClick={() => setTki("timeToBestResponse", calculatedTtbr)} className="whitespace-nowrap rounded-lg border border-blue-200 px-2 text-xs font-semibold text-blue-600 hover:bg-blue-50" title="From start date to best response date">
                      Use {calculatedTtbr}
                    </button>
                  )}
                </div>
              </div>
              <div>
                <label className={labelCls}>Duration of response <SourceLink ids={["dor"]} /></label>
                <input value={summary.tki.durationOfResponse} onChange={e => setTki("durationOfResponse", e.target.value)} placeholder="e.g., 14 months (first response to progression)" className={inputCls} />
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className={labelCls}>Maximum tumor response (depth of response) <SourceLink ids={["dpr", "recist"]} /></p>
              <p className="mb-3 text-[11px] text-slate-500">Maximum % shrinkage of the sum of target-lesion diameters from baseline: (baseline − nadir) ÷ baseline × 100.</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <input type="number" min={0} value={summary.tki.baselineSum} onChange={e => setTki("baselineSum", e.target.value)} placeholder="Baseline sum (mm)" className={inputCls} />
                <input type="number" min={0} value={summary.tki.nadirSum} onChange={e => setTki("nadirSum", e.target.value)} placeholder="Nadir / smallest sum (mm)" className={inputCls} />
                <div className="flex gap-2">
                  <input value={summary.tki.depthOfResponse} onChange={e => setTki("depthOfResponse", e.target.value)} placeholder="Shrinkage %" className={inputCls} />
                  {calculatedDpr && (
                    <button onClick={() => setTki("depthOfResponse", calculatedDpr)} className="whitespace-nowrap rounded-lg border border-blue-200 px-2 text-xs font-semibold text-blue-600 hover:bg-blue-50">
                      Use {calculatedDpr}%
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div>
              <p className={labelCls}>Additional points</p>
              <div className="space-y-2">
                {summary.tki.customPoints.map((point, index) => (
                  <div key={index} className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
                    <input
                      value={point.label}
                      onChange={e => setTki("customPoints", summary.tki.customPoints.map((item, i) => i === index ? { ...item, label: e.target.value } : item))}
                      placeholder="Point (e.g., Resistance mutation)"
                      className={inputCls}
                    />
                    <input
                      value={point.value}
                      onChange={e => setTki("customPoints", summary.tki.customPoints.map((item, i) => i === index ? { ...item, value: e.target.value } : item))}
                      placeholder="Value (e.g., T790M detected on liquid biopsy)"
                      className={inputCls}
                    />
                    <button onClick={() => setTki("customPoints", summary.tki.customPoints.filter((_, i) => i !== index))} className="rounded-lg px-3 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="Remove point">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              <button onClick={() => setTki("customPoints", [...summary.tki.customPoints, { label: "", value: "" }])} className="mt-2 flex items-center gap-1.5 rounded-lg border border-dashed border-blue-300 px-3 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50">
                <Plus className="h-3.5 w-3.5" />Add more
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-800">Export Summary</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { label: "Export PDF", format: "PDF", icon: FileText, color: "text-red-500" },
            { label: "Export Word", format: "Word", icon: FileText, color: "text-blue-600" },
            { label: "Export Excel", format: "Excel", icon: BarChart2, color: "text-emerald-600" },
            { label: "Export CSV", format: "CSV", icon: Download, color: "text-orange-500" },
            { label: "Export SPSS", format: "SPSS", icon: Microscope, color: "text-purple-600" },
          ].map(item => (
            <button key={item.format} onClick={() => exportSummary(item.format)} className="flex h-24 flex-col items-center justify-center gap-3 rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-900 hover:border-blue-200 hover:bg-blue-50">
              <item.icon className={`h-4 w-4 ${item.color}`} />
              {item.label}
            </button>
          ))}
        </div>
        <div className="mt-8 flex items-center gap-4 rounded-lg border border-blue-200 bg-blue-50 px-5 py-4">
          <BookOpen className="h-5 w-5 text-blue-600" />
          <div>
            <p className="text-sm font-semibold text-blue-800">Thesis &amp; Research Mode</p>
            <p className="mt-1 text-xs text-blue-700">Export patient data in academic formats ready for thesis compilation and research publications</p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Total Cases", patients.length],
          ["Active Treatment", activeTreatment],
          ["Follow-ups", followUps],
          ["Completed", completed],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
            <p className="text-sm font-medium text-slate-500">{label}</p>
            <p className="mt-8 text-lg font-semibold text-slate-950">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function TemplatesView({ nav, templates, onCreateTemplate, onUpdateTemplates, showToast, onUseTemplate }: {
  nav: (v: View) => void;
  templates: PrescriptionTemplate[];
  onCreateTemplate: () => void;
  onUpdateTemplates: (t: PrescriptionTemplate[]) => void;
  showToast: (msg: string) => void;
  onUseTemplate: (template: PrescriptionTemplate) => void;
}) {
  const [search, setSearch] = useState("");
  const [editingTemplate, setEditingTemplate] = useState<PrescriptionTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<PrescriptionTemplate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openMenu) return;
    const h = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenu(null); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [openMenu]);

  const filtered = templates.filter(t =>
    !search ||
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.desc.toLowerCase().includes(search.toLowerCase()) ||
    t.tags.some(tag => tag.toLowerCase().includes(search.toLowerCase()))
  );

  const setDefault = async (name: string) => {
    const target = templates.find(t => t.name === name);
    if (!target?.id) return;
    try {
      const savedTemplate = await templatesApi.update({ ...target, isDefault: true });
      onUpdateTemplates(templates.map(t => ({ ...t, isDefault: t.id === savedTemplate.id })));
      showToast(`"${name}" set as default template`);
      setOpenMenu(null);
    } catch (error) {
      console.error(error);
      showToast("Could not update default template");
    }
  };

  const copyTemplate = async (t: PrescriptionTemplate) => {
    const copy = { ...t, name: `${t.name} (Copy)`, isDefault: false, used: 0 };
    delete copy.id;
    try {
      const savedTemplate = await templatesApi.create(copy);
      onUpdateTemplates([...templates, savedTemplate]);
      showToast(`"${t.name}" duplicated`);
    } catch (error) {
      console.error(error);
      showToast("Could not duplicate template");
    }
  };

  const deleteTemplate = async (name: string) => {
    const target = templates.find(t => t.name === name);
    if (!target?.id) return;
    try {
      await templatesApi.remove(target.id);
      onUpdateTemplates(templates.filter(t => t.id !== target.id));
      showToast(`Template deleted`);
      setDeleteTarget(null);
    } catch (error) {
      console.error(error);
      showToast("Could not delete template");
    }
  };

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900" style={{ fontFamily: "var(--font-display)" }}>Prescription Templates</h1>
          <p className="text-sm text-gray-500">Manage and reuse prescription layouts  -  {templates.length} templates</p>
        </div>
        <button onClick={onCreateTemplate} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-xl transition-all hover:opacity-90" style={{ background: "linear-gradient(135deg,#2563EB,#1D4ED8)", boxShadow: "0 2px 8px rgba(37,99,235,0.28)" }}>
          <Plus className="w-4 h-4" />Create Template
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, description or tag..."
          className="w-full pl-9 pr-9 py-2.5 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white transition-all"
          style={{ border: "1px solid #DDE3ED" }}
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
            <LayoutTemplate className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-sm font-semibold text-gray-700">No templates found</p>
          <p className="text-xs text-gray-400 mt-1">Try a different search term or create a new template</p>
          <button onClick={() => setSearch("")} className="mt-3 text-xs text-blue-600 hover:text-blue-700 font-medium">Clear search</button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {filtered.map((t) => (
            <div key={t.name}
              className={`bg-white rounded-2xl p-5 transition-all hover:-translate-y-0.5 ${t.isDefault ? "ring-2 ring-blue-500/30" : ""}`}
              style={{ border: t.isDefault ? "1px solid #BFDBFE" : "1px solid #DDE3ED", boxShadow: "0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)" }}
            >
              {/* Top */}
              <div className="flex items-start justify-between mb-4">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#EFF6FF,#DBEAFE)" }}>
                  <LayoutTemplate className="w-5 h-5 text-blue-600" />
                </div>
                {t.isDefault && (
                  <span className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold rounded-full" style={{ background: "linear-gradient(135deg,#2563EB,#1D4ED8)", color: "#fff" }}>
                    <Star className="w-2.5 h-2.5" />Default
                  </span>
                )}
              </div>

              <h3 className="font-bold text-gray-900 text-sm mb-1" style={{ fontFamily: "var(--font-display)" }}>{t.name}</h3>
              <p className="text-xs text-gray-500 mb-3 leading-relaxed line-clamp-2">{t.desc}</p>
              <div className="flex flex-wrap gap-1 mb-4">
                {t.tags.map(tag => <span key={tag} className="px-2 py-0.5 text-[10px] font-semibold rounded-lg" style={{ background: "#F1F5F9", color: "#475569" }}>{tag}</span>)}
              </div>
              <div className="mb-4 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Sections</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-600 line-clamp-2">{t.sections.join(", ")}</p>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-3" style={{ borderTop: "1px solid #F1F5F9" }}>
                <span className="text-[10px] text-gray-400">Used {t.used} times</span>
                <div className="flex items-center gap-1">
                  {/* Use */}
                  <button onClick={() => onUseTemplate(t)} title="Use this template"
                    className="p-1.5 rounded-lg text-blue-500 transition-colors hover:bg-blue-50">
                    <FilePlus className="w-3.5 h-3.5" />
                  </button>
                  {/* Preview */}
                  <button onClick={() => setPreviewTemplate(t)} title="Preview template"
                    className="p-1.5 rounded-lg text-emerald-600 transition-colors hover:bg-emerald-50">
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  {/* Edit */}
                  <button onClick={() => setEditingTemplate(t)} title="Edit template"
                    className="p-1.5 rounded-lg text-gray-500 transition-colors hover:bg-gray-100">
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  {/* Copy */}
                  <button onClick={() => copyTemplate(t)} title="Duplicate template"
                    className="p-1.5 rounded-lg text-gray-500 transition-colors hover:bg-gray-100">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  {/* More */}
                  <div className="relative" ref={openMenu === t.name ? menuRef : undefined}>
                    <button onClick={() => setOpenMenu(openMenu === t.name ? null : t.name)}
                      className="p-1.5 rounded-lg text-gray-500 transition-colors hover:bg-gray-100">
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>
                    {openMenu === t.name && (
                      <div className="absolute right-0 top-full mt-1 min-w-44 bg-white rounded-xl border border-gray-200 shadow-xl py-1.5 z-40">
                        <button onClick={() => setDefault(t.name)} disabled={t.isDefault}
                          className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-left transition-colors ${t.isDefault ? "text-gray-300 cursor-not-allowed" : "text-gray-700 hover:bg-gray-50"}`}>
                          <Star className="w-4 h-4 text-gray-400" />Set as Default
                        </button>
                        <button onClick={() => { copyTemplate(t); setOpenMenu(null); }}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">
                          <Copy className="w-4 h-4 text-gray-400" />Duplicate
                        </button>
                        <button onClick={() => { setEditingTemplate(t); setOpenMenu(null); }}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">
                          <Edit className="w-4 h-4 text-gray-400" />Edit
                        </button>
                        <button onClick={() => { setPreviewTemplate(t); setOpenMenu(null); }}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">
                          <Eye className="w-4 h-4 text-gray-400" />Preview
                        </button>
                        <div className="my-1 border-t border-gray-100" />
                        <button onClick={() => { setDeleteTarget(t.name); setOpenMenu(null); }}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-red-600 hover:bg-red-50 text-left">
                          <Trash2 className="w-4 h-4" />Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit template modal - reuse CreateTemplateModal pre-filled */}
      {editingTemplate && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && setEditingTemplate(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col" style={{ border: "1px solid #DDE3ED" }}>
            <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderBottom: "1px solid #F1F5F9" }}>
              <div><h2 className="text-base font-bold text-gray-900" style={{ fontFamily: "var(--font-display)" }}>Edit Template</h2><p className="text-xs text-gray-400">{editingTemplate.name}</p></div>
              <button onClick={() => setEditingTemplate(null)} className="w-8 h-8 bg-red-100 hover:bg-red-200 text-red-600 rounded-full flex items-center justify-center transition-colors"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1.5">Template Name</label>
                <input
                  defaultValue={editingTemplate.name}
                  id="edit-tpl-name"
                  className="w-full text-sm border border-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1.5">Description</label>
                <textarea
                  defaultValue={editingTemplate.desc}
                  id="edit-tpl-desc"
                  rows={3}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none focus:border-blue-400"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1.5">Tags (comma-separated)</label>
                <input
                  defaultValue={editingTemplate.tags.join(", ")}
                  id="edit-tpl-tags"
                  className="w-full text-sm border border-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1.5">Sections (comma-separated)</label>
                <textarea
                  defaultValue={editingTemplate.sections.join(", ")}
                  id="edit-tpl-sections"
                  rows={3}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none focus:border-blue-400"
                />
                <p className="mt-1 text-xs text-gray-400">Available: {ALL_SECTIONS.join(", ")}</p>
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 flex-shrink-0" style={{ borderTop: "1px solid #F1F5F9" }}>
              <button onClick={() => setEditingTemplate(null)} className="flex-1 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 font-medium">Cancel</button>
              <button
                onClick={async () => {
                  const nameEl = document.getElementById("edit-tpl-name") as HTMLInputElement;
                  const descEl = document.getElementById("edit-tpl-desc") as HTMLTextAreaElement;
                  const tagsEl = document.getElementById("edit-tpl-tags") as HTMLInputElement;
                  const sectionsEl = document.getElementById("edit-tpl-sections") as HTMLTextAreaElement;
                  const updatedName = nameEl?.value.trim() || editingTemplate.name;
                  const updatedDesc = descEl?.value.trim() || editingTemplate.desc;
                  const updatedTags = tagsEl?.value.split(",").map(t => t.trim()).filter(Boolean) || editingTemplate.tags;
                  const updatedSections = (sectionsEl?.value.split(",").map(s => s.trim()).filter(Boolean) || editingTemplate.sections).filter(section => section !== "Calculate");
                  try {
                    const savedTemplate = await templatesApi.update({ ...editingTemplate, name: updatedName, desc: updatedDesc, tags: updatedTags, sections: updatedSections });
                    onUpdateTemplates(templates.map(t => t.id === savedTemplate.id ? savedTemplate : t));
                    showToast(`Template "${updatedName}" updated`);
                    setEditingTemplate(null);
                  } catch (error) {
                    console.error(error);
                    showToast("Could not update template");
                  }
                }}
                className="flex-1 py-2.5 text-sm text-white rounded-xl font-semibold"
                style={{ background: "linear-gradient(135deg,#2563EB,#1D4ED8)" }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview template modal */}
      {previewTemplate && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && setPreviewTemplate(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col" style={{ border: "1px solid #DDE3ED" }}>
            <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderBottom: "1px solid #F1F5F9" }}>
              <div>
                <h2 className="text-base font-bold text-gray-900" style={{ fontFamily: "var(--font-display)" }}>{previewTemplate.name}</h2>
                <p className="text-xs text-gray-500 mt-0.5">{previewTemplate.desc}</p>
              </div>
              <button onClick={() => setPreviewTemplate(null)} className="w-8 h-8 bg-red-100 hover:bg-red-200 text-red-600 rounded-full flex items-center justify-center transition-colors"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto grid grid-cols-[18rem_1fr] bg-slate-100">
              <aside className="bg-white p-5 border-r border-slate-200 space-y-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Tags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {previewTemplate.tags.map(tag => <span key={tag} className="px-2 py-1 rounded-lg bg-slate-100 text-[10px] font-bold text-slate-600">{tag}</span>)}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Included Sections</p>
                  <div className="space-y-1.5">
                    {previewTemplate.sections.map(section => (
                      <div key={section} className="flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-2.5 py-2 text-xs font-medium text-blue-800">
                        <Check className="w-3.5 h-3.5 text-blue-600" />
                        {section}
                      </div>
                    ))}
                  </div>
                </div>
              </aside>
              <div className="p-6">
                <div className="mx-auto max-w-xl bg-white shadow-lg ring-1 ring-slate-200" style={{ minHeight: 720 }}>
                  <div className="border-b-2 border-blue-600 px-8 py-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center"><Stethoscope className="w-4 h-4 text-white" /></div>
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600">Template Preview</p>
                            <p className="text-[9px] text-slate-400">{previewTemplate.name}</p>
                          </div>
                        </div>
                        <p className="text-sm font-bold text-slate-900">Doctor and clinic header</p>
                        <p className="text-[10px] text-slate-500">Patient, date, and visit information appear below</p>
                      </div>
                      <QrCode className="w-12 h-12 text-slate-300" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 border-b border-blue-100 bg-blue-50 px-8 py-3">
                    {["Patient", "Age/Sex", "Date"].map(label => (
                      <div key={label}>
                        <p className="text-[9px] uppercase tracking-wide text-slate-400">{label}</p>
                        <p className="text-xs font-semibold text-slate-800">Sample</p>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-[42%_1fr] divide-x divide-slate-200" style={{ minHeight: 500 }}>
                    <div className="space-y-4 px-6 py-5">
                      {previewTemplate.sections.filter(section => !["Rx / Medicines", "Advice", "Investigation", "Follow Up", "Referral"].includes(section)).map(section => (
                        <div key={section}>
                          <p className="mb-1.5 border-b border-slate-100 pb-1 text-[9px] font-bold uppercase tracking-widest text-slate-400">{section}</p>
                          <p className="text-xs italic text-slate-300">Template field</p>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-4 px-6 py-5">
                      {previewTemplate.sections.filter(section => ["Rx / Medicines", "Advice", "Investigation", "Follow Up", "Referral"].includes(section)).map(section => (
                        <div key={section}>
                          <p className="mb-1.5 border-b border-slate-100 pb-1 text-[9px] font-bold uppercase tracking-widest text-slate-400">{section}</p>
                          <p className="text-xs italic text-slate-300">Template field</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-end justify-between border-t border-slate-200 px-8 py-4">
                    <p className="text-[9px] text-slate-400">Footer and clinic contact information</p>
                    <div className="w-28 border-t border-slate-400 pt-1 text-right text-[9px] text-slate-500">Signature &amp; Seal</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 flex-shrink-0 bg-white" style={{ borderTop: "1px solid #F1F5F9" }}>
              <button onClick={() => setPreviewTemplate(null)} className="flex-1 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 font-medium">Close</button>
              <button onClick={() => { onUseTemplate(previewTemplate); setPreviewTemplate(null); }} className="flex-1 py-2.5 text-sm text-white rounded-xl font-semibold" style={{ background: "linear-gradient(135deg,#2563EB,#1D4ED8)" }}>
                Use Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" style={{ border: "1px solid #DDE3ED" }}>
            <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4"><Trash2 className="w-5 h-5 text-red-500" /></div>
            <h3 className="text-base font-bold text-gray-900 text-center mb-2">Delete Template?</h3>
            <p className="text-sm text-gray-500 text-center mb-6"><strong>"{deleteTarget}"</strong> will be permanently removed.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 font-medium">Cancel</button>
              <button onClick={() => deleteTemplate(deleteTarget)} className="flex-1 py-2.5 text-sm text-white bg-red-500 hover:bg-red-600 rounded-xl font-semibold">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// RESEARCH
// GUIDELINES
// Links only: guideline content belongs to the publishers. eviQ links go to the
// protocol list for each site; NCCN/ESMO/ASCO link to their guideline indexes.
const EVIQ = "https://www.eviq.org.au";
const GUIDELINE_TOPICS: { type: string; covers: string; eviq: string; supportive?: boolean }[] = [
  { type: "Breast", covers: "Early and metastatic breast cancer", eviq: `${EVIQ}/medical-oncology/breast` },
  { type: "Lung / Respiratory", covers: "NSCLC, SCLC, mesothelioma", eviq: `${EVIQ}/medical-oncology/respiratory` },
  { type: "Colorectal", covers: "Colon, rectum, anal", eviq: `${EVIQ}/medical-oncology/colorectal` },
  { type: "Upper Gastrointestinal", covers: "Oesophagus, stomach, pancreas, liver, biliary", eviq: `${EVIQ}/medical-oncology/upper-gastrointestinal` },
  { type: "Head and Neck", covers: "Oral cavity, pharynx, larynx, nasopharynx, thyroid", eviq: `${EVIQ}/medical-oncology/head-and-neck` },
  { type: "Gynaecological", covers: "Cervix, ovary, endometrium, vulva", eviq: `${EVIQ}/medical-oncology/gynaecological` },
  { type: "Urogenital", covers: "Prostate, bladder, kidney, testis", eviq: `${EVIQ}/medical-oncology/urogenital` },
  { type: "Neurological", covers: "Brain and CNS tumours", eviq: `${EVIQ}/medical-oncology/neurological` },
  { type: "Sarcoma", covers: "Bone and soft tissue sarcoma", eviq: `${EVIQ}/medical-oncology/sarcoma` },
  { type: "Skin / Melanoma", covers: "Melanoma and non-melanoma skin cancers", eviq: `${EVIQ}/medical-oncology/skin` },
  { type: "Lymphoma", covers: "Hodgkin and non-Hodgkin lymphoma", eviq: `${EVIQ}/haematology/lymphoma` },
  { type: "Multiple Myeloma", covers: "Myeloma and plasma cell disorders", eviq: `${EVIQ}/haematology/multiple-myeloma` },
  { type: "Leukaemia & other haematology", covers: "Acute and chronic leukaemias", eviq: `${EVIQ}/haematology` },
  { type: "Radiation Oncology", covers: "Radiotherapy protocols by site", eviq: `${EVIQ}/radiation-oncology` },
  { type: "Cancer Genetics", covers: "Hereditary cancer testing and risk management", eviq: `${EVIQ}/cancer-genetics` },
  { type: "Supportive Care", covers: "Side effects, toxicity, oncological emergencies", eviq: `${EVIQ}/clinical-resources/side-effect-and-toxicity-management`, supportive: true },
];

function GuidelinesView({ customGuidelines, onSaveGuidelines, showToast }: {
  customGuidelines: CustomGuideline[];
  onSaveGuidelines: (guidelines: CustomGuideline[]) => Promise<void>;
  showToast: (msg: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", url: "", cancerType: GUIDELINE_TOPICS[0].type, note: "" });
  const [saving, setSaving] = useState(false);
  const q = query.trim().toLowerCase();
  const matches = (text: string) => !q || text.toLowerCase().includes(q);
  const topics = GUIDELINE_TOPICS.filter(topic =>
    matches(`${topic.type} ${topic.covers}`) ||
    customGuidelines.some(item => item.cancerType === topic.type && matches(`${item.title} ${item.note ?? ""}`))
  );
  const inputCls = "w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400";

  const addGuideline = async () => {
    if (!form.title.trim()) { showToast("Please enter a guideline title"); return; }
    if (!/^https?:\/\/\S+\.\S+/.test(form.url.trim())) { showToast("Please enter a valid link starting with http:// or https://"); return; }
    setSaving(true);
    try {
      await onSaveGuidelines([...customGuidelines, {
        id: `${Date.now()}`,
        title: form.title.trim(),
        url: form.url.trim(),
        cancerType: form.cancerType,
        note: form.note.trim(),
      }]);
      setForm(f => ({ ...f, title: "", url: "", note: "" }));
      setShowForm(false);
      showToast("Guideline saved");
    } catch (error) {
      console.error(error);
      showToast("Could not save guideline");
    } finally {
      setSaving(false);
    }
  };

  const removeGuideline = async (id: string) => {
    try {
      await onSaveGuidelines(customGuidelines.filter(item => item.id !== id));
      showToast("Guideline removed");
    } catch (error) {
      console.error(error);
      showToast("Could not remove guideline");
    }
  };

  const orgLinks = (supportive?: boolean): { label: string; id: ClinicalSourceId }[] => [
    { label: "NCCN", id: supportive ? "nccnSupportive" : "nccn" },
    { label: "ESMO", id: "esmo" },
    { label: "ASCO", id: "asco" },
  ];

  return (
    <div className="mx-auto w-full max-w-[1180px] px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-950" style={{ fontFamily: "var(--font-display)" }}>Guidelines</h1>
          <p className="mt-2 text-sm text-slate-500">Treatment protocols and clinical practice guidelines by cancer type</p>
        </div>
        <button onClick={() => setShowForm(v => !v)} className="flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700">
          <Plus className="h-4 w-4" />Add my guideline
        </button>
      </div>

      {showForm && (
        <section className="rounded-xl border border-blue-200 bg-white p-5 shadow-sm space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Title (e.g., Hospital breast cancer pathway 2026)" className={inputCls} />
            <input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://..." className={inputCls} />
            <select value={form.cancerType} onChange={e => setForm(f => ({ ...f, cancerType: e.target.value }))} className={inputCls}>
              {GUIDELINE_TOPICS.map(topic => <option key={topic.type}>{topic.type}</option>)}
            </select>
            <input value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="Note (optional)" className={inputCls} />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
            <button onClick={addGuideline} disabled={saving} className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60">{saving ? "Saving..." : "Save"}</button>
          </div>
        </section>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search cancer type or guideline..." className={`${inputCls} pl-9 py-2.5`} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {topics.map(topic => {
          const custom = customGuidelines.filter(item => item.cancerType === topic.type);
          return (
            <section key={topic.type} className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-bold text-slate-900">{topic.type}</h2>
              <p className="mt-0.5 text-xs text-slate-500">{topic.covers}</p>
              <a href={topic.eviq} target="_blank" rel="noopener noreferrer" className="mt-4 flex items-center justify-between rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100">
                eviQ treatment protocols <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <div className="mt-2 flex gap-2">
                {orgLinks(topic.supportive).map(link => (
                  <a
                    key={link.label}
                    href={CLINICAL_SOURCES[link.id].url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={CLINICAL_SOURCES[link.id].title}
                    className="flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-center text-xs font-semibold text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
              {custom.length > 0 && (
                <div className="mt-4 space-y-1.5 border-t border-slate-100 pt-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">My guidelines</p>
                  {custom.map(item => (
                    <div key={item.id} className="flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2">
                      <div className="min-w-0 flex-1">
                        <a href={item.url} target="_blank" rel="noopener noreferrer" className="block truncate text-xs font-semibold text-blue-700 hover:underline">{item.title}</a>
                        {item.note && <p className="mt-0.5 text-[11px] text-slate-500">{item.note}</p>}
                      </div>
                      <button onClick={() => removeGuideline(item.id)} className="text-slate-300 hover:text-red-500" aria-label={`Remove ${item.title}`}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        })}
        {topics.length === 0 && <p className="text-sm text-slate-400">No guidelines match "{query}"</p>}
      </div>

      <p className="text-xs text-slate-400">
        Sources: <a className="underline hover:text-blue-600" href={CLINICAL_SOURCES.eviq.url} target="_blank" rel="noopener noreferrer">eviQ (Cancer Institute NSW)</a>,{" "}
        <a className="underline hover:text-blue-600" href={CLINICAL_SOURCES.nccn.url} target="_blank" rel="noopener noreferrer">NCCN</a>,{" "}
        <a className="underline hover:text-blue-600" href={CLINICAL_SOURCES.esmo.url} target="_blank" rel="noopener noreferrer">ESMO</a>,{" "}
        <a className="underline hover:text-blue-600" href={CLINICAL_SOURCES.asco.url} target="_blank" rel="noopener noreferrer">ASCO</a>.
        Guideline content belongs to the publishers; some sites require free registration. Always check the current version before use.
      </p>
    </div>
  );
}

function ResearchView({ showToast, draft }: { showToast: (msg: string) => void; draft?: { title: string; description: string } | null }) {
  const [step, setStep] = useState(0);
  const [project, setProject] = useState(() => draft ?? { title: "", description: "" });

  useEffect(() => {
    if (draft) setProject(draft);
  }, [draft]);
  const [projects, setProjects] = useState<ResearchProject[]>([]);
  const [saving, setSaving] = useState(false);
  const steps = ["Project Name", "Event Schedule", "Investigator Roles", "Questionnaire", "Milestones", "Notifications", "Tasks", "Collaborators", "Dashboard"];

  useEffect(() => {
    let cancelled = false;
    researchApi.list()
      .then((items) => { if (!cancelled) setProjects(items); })
      .catch((error) => { console.error(error); showToast("Could not load research projects"); });
    return () => { cancelled = true; };
  }, []);

  const finishProject = async () => {
    const title = project.title.trim();
    if (!title) {
      showToast("Please enter a research project title");
      setStep(0);
      return;
    }
    setSaving(true);
    try {
      const saved = await researchApi.create({
        title,
        description: project.description,
        currentStep: step,
        status: step === steps.length - 1 ? "Complete" : "Draft",
        metadata: { steps },
      });
      setProjects(prev => [saved, ...prev]);
      setProject({ title: "", description: "" });
      setStep(0);
      showToast(`${saved.title} saved to database`);
    } catch (error) {
      console.error(error);
      showToast("Could not save research project");
    } finally {
      setSaving(false);
    }
  };

  const deleteProject = async (id: number) => {
    try {
      await researchApi.remove(id);
      setProjects(prev => prev.filter(item => item.id !== id));
      showToast("Research project deleted");
    } catch (error) {
      console.error(error);
      showToast("Could not delete research project");
    }
  };

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Research Projects</h1>
        <p className="text-sm text-gray-500">Create and manage clinical research initiatives from the database</p>
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-semibold text-gray-900">New Research Project</h3>
            <span className="text-xs text-gray-500">Step {step + 1} of {steps.length}</span>
          </div>
          <div className="flex items-center gap-0.5 mb-8 overflow-x-auto pb-2">
            {steps.map((s, i) => (
              <div key={s} className="flex items-center">
                <button onClick={() => i <= step && setStep(i)} className="flex flex-col items-center gap-1">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors flex-shrink-0 ${i < step ? "bg-green-500 text-white" : i === step ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500"}`}>
                    {i < step ? <CheckCircle className="w-3.5 h-3.5" /> : i + 1}
                  </div>
                  <span className={`text-[9px] font-medium text-center leading-tight max-w-12 ${i === step ? "text-blue-600" : "text-gray-400"}`}>{s}</span>
                </button>
                {i < steps.length - 1 && <div className={`h-0.5 w-6 flex-shrink-0 mx-1 mb-4 ${i < step ? "bg-green-400" : "bg-gray-200"}`} />}
              </div>
            ))}
          </div>
          {step === 0 && (
            <div className="space-y-4 max-w-lg">
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1.5">Project Title <span className="text-red-500">*</span></label>
                <input value={project.title} onChange={e => setProject(p => ({ ...p, title: e.target.value }))} placeholder="Research project title" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1.5">Description</label>
                <textarea value={project.description} onChange={e => setProject(p => ({ ...p, description: e.target.value }))} placeholder="Describe the objectives and scope..." rows={4} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none focus:border-blue-400" />
              </div>
            </div>
          )}
          {step > 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-3">
                <Microscope className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-sm font-medium text-gray-900">{steps[step]}</p>
              <p className="text-xs text-gray-400 mt-1 max-w-xs">This step is tracked as part of the saved research project workflow.</p>
            </div>
          )}
          <div className="flex items-center justify-between mt-8 pt-5 border-t border-gray-100">
            <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} className="flex items-center gap-1.5 px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-40">
              <ChevronLeft className="w-4 h-4" />Previous
            </button>
            <button disabled={saving} onClick={() => step === steps.length - 1 ? finishProject() : setStep(Math.min(steps.length - 1, step + 1))} className="flex items-center gap-1.5 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60">
              {saving ? "Saving..." : step === steps.length - 1 ? "Finish" : "Next"}<ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-900">Saved Projects</h3>
          <div className="mt-4 space-y-3">
            {projects.length === 0 && <p className="text-xs text-gray-400">No research projects saved yet</p>}
            {projects.map(item => (
              <div key={item.id} className="rounded-lg border border-gray-100 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{item.title}</p>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.description || "No description"}</p>
                    <p className="text-[11px] text-gray-400 mt-2">{item.status} · Step {item.currentStep + 1}</p>
                  </div>
                  <button onClick={() => deleteProject(item.id)} className="p-1.5 rounded-md text-red-500 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
// TUTORIAL
function TutorialView({ nav, showToast }: { nav: (v: View) => void; showToast: (msg: string) => void }) {
  const [playing, setPlaying] = useState(false);
  const openSupport = () => {
    window.location.href = "mailto:support@renatacancercare.com?subject=Renata%20Cancer%20Care%20Tutorial%20Support";
  };
  const shareTutorial = () => {
    const url = `${window.location.origin}/tutorial`;
    navigator.clipboard?.writeText(url);
    showToast("Tutorial link copied");
  };
  const startGuide = (title: string) => {
    const guideRoutes: Record<string, View> = {
      "Step-by-Step Guide": "create-prescription",
      "Quick Start": "dashboard",
      "Best Practices": "reports",
    };
    showToast(`${title} opened`);
    nav(guideRoutes[title] ?? "dashboard");
  };
  return (
    <div className="p-6 space-y-6">
      <button onClick={() => nav("dashboard")} className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"><ChevronLeft className="w-4 h-4" />Back to Dashboard</button>
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Tutorial &amp; Help</h1>
        <p className="text-sm text-gray-500">Learn to use Oncology Prescription efficiently</p>
      </div>
      <div className="rounded-2xl overflow-hidden flex items-center justify-center relative shadow-xl bg-gradient-to-br from-blue-50 via-white to-emerald-50 ring-1 ring-blue-100" style={{ aspectRatio: "16/6" }}>
        <div className="absolute inset-0 bg-gradient-to-t from-blue-100/70 to-transparent" />
        <button onClick={() => { setPlaying(p => !p); showToast(playing ? "Tutorial paused" : "Tutorial started"); }} className="relative z-10 w-16 h-16 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-blue-50 transition-colors border border-blue-200 shadow-lg">
          {playing ? <Pause className="w-7 h-7 text-blue-600" /> : <Play className="w-7 h-7 text-blue-600 ml-1" />}
        </button>
        <div className="absolute bottom-5 left-6 right-6 flex items-end justify-between z-10">
          <div>
            <p className="text-blue-800 text-sm font-semibold">Getting Started with Oncology Prescription</p>
            <p className="text-blue-500 text-xs mt-0.5">Complete walkthrough</p>
          </div>
          <button onClick={shareTutorial} className="px-3 py-1.5 text-xs text-blue-700 border border-blue-200 bg-white/70 rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-1.5"><Share2 className="w-3 h-3" />Share</button>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[
          { title: "Step-by-Step Guide", icon: ClipboardList, color: "bg-blue-50 text-blue-600", btn: "bg-blue-600 hover:bg-blue-700", desc: "Follow our guide to set up your profile, add patients, and create your first prescription." },
          { title: "Quick Start", icon: Zap, color: "bg-green-50 text-green-600", btn: "bg-green-600 hover:bg-green-700", desc: "Get up and running in under 5 minutes with our condensed quick-start walkthrough." },
          { title: "Best Practices", icon: Star, color: "bg-amber-50 text-amber-600", btn: "bg-amber-500 hover:bg-amber-600", desc: "Learn medical documentation best practices and optimise your daily workflow." },
        ].map((c) => (
          <div key={c.title} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${c.color}`}><c.icon className="w-5 h-5" /></div>
            <h3 className="font-semibold text-gray-900 text-sm mb-2">{c.title}</h3>
            <p className="text-xs text-gray-500 leading-relaxed mb-4">{c.desc}</p>
            <button onClick={() => startGuide(c.title)} className={`text-xs font-semibold px-3 py-1.5 text-white rounded-lg transition-colors ${c.btn}`}>Get Started</button>
          </div>
        ))}
      </div>
      <div className="bg-blue-600 rounded-2xl p-6 flex items-center justify-between">
        <div>
          <h3 className="text-white font-semibold text-base mb-1">Need personal support?</h3>
          <p className="text-blue-200 text-sm">Our team is available 24/7 to help you get the most out of the platform.</p>
        </div>
        <button onClick={openSupport} className="flex items-center gap-2 px-4 py-2.5 bg-white text-blue-600 text-sm font-semibold rounded-xl hover:bg-blue-50 transition-colors flex-shrink-0"><MessageCircle className="w-4 h-4" />Contact Support</button>
      </div>
      <button onClick={() => nav("dashboard")} className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 border border-gray-200 bg-white rounded-lg hover:bg-gray-50 transition-colors">
        <LayoutDashboard className="w-4 h-4" />Return to Dashboard
      </button>
    </div>
  );
}

// SETTINGS MODAL
function SettingsModal({ onClose, showToast, onSaved }: { onClose: () => void; showToast: (msg: string) => void; onSaved: (settings: AppSettings) => void }) {
  const [researchThreshold, setResearchThreshold] = useState(DEFAULT_RESEARCH_THRESHOLD);
  const [customThreshold, setCustomThreshold] = useState(false);
  const [activeTab, setActiveTab] = useState("page-settings");
  const [activeSub, setActiveSub] = useState("header");
  const [toggles, setToggles] = useState<Record<string, boolean>>({
    logo: true, doctorInfo: true, barcode: true, rxBarcode: false,
    divider: true, showSignature: true, showGeneric: true, showBrand: true, showDuration: true,
    showMeal: true, showAdvice: true, showFollowUp: true, bangla: false,
    autoSerial: true, autoPatientId: true, billing: true,
    sideClinical: true, sideTreatment: true, sideVoice: true, sideTemplates: true,
    sideHistory: false, sideCalculator: true, printHeader: true, printFooter: true,
    printWatermark: false, printMargins: true, printQr: true, printBackground: false,
  });
  const [printScale, setPrintScale] = useState(100);
  const [prescriptionOrder, setPrescriptionOrder] = useState([
    "Patient Information", "Chief Complaint", "History", "On Examination",
    "Diagnosis", "Medicines", "Advice", "Investigations", "Follow Up", "Signature",
  ]);
  const [draggedOrderIdx, setDraggedOrderIdx] = useState<number | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  useEffect(() => {
    let cancelled = false;
    settingsApi.get()
      .then((settings) => {
        if (cancelled) return;
        if (settings.toggles) setToggles(prev => ({ ...prev, ...settings.toggles }));
        if (typeof settings.printScale === "number") setPrintScale(settings.printScale);
        if (Array.isArray(settings.prescriptionOrder) && settings.prescriptionOrder.length > 0) {
          setPrescriptionOrder(settings.prescriptionOrder);
        }
        if (typeof settings.researchThreshold === "number") {
          setResearchThreshold(settings.researchThreshold);
          setCustomThreshold(![20, 25, 30].includes(settings.researchThreshold));
        }
      })
      .catch((error) => {
        console.error(error);
        showToast("Could not load saved settings");
      });
    return () => { cancelled = true; };
  }, []);
  const saveSettings = async () => {
    if (!(researchThreshold >= 2)) {
      showToast("Research alert threshold must be at least 2 patients");
      setActiveTab("research-alerts");
      return;
    }
    setSavingSettings(true);
    try {
      // Merge with the stored settings so other keys (guidelines, dismissed alerts) are kept.
      const stored = await settingsApi.get().catch(() => ({} as AppSettings));
      const saved = await settingsApi.save({ ...stored, toggles, printScale, prescriptionOrder, researchThreshold });
      onSaved(saved);
      showToast("Settings saved to database");
      onClose();
    } catch (error) {
      console.error(error);
      showToast("Could not save settings");
    } finally {
      setSavingSettings(false);
    }
  };
  const toggle = (k: string) => setToggles((t) => ({ ...t, [k]: !t[k] }));
  const moveSection = (idx: number, dir: -1 | 1) => {
    setPrescriptionOrder((items) => {
      const nextIdx = idx + dir;
      if (nextIdx < 0 || nextIdx >= items.length) return items;
      const next = [...items];
      [next[idx], next[nextIdx]] = [next[nextIdx], next[idx]];
      return next;
    });
  };
  const dragSection = (fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx) return;
    setPrescriptionOrder((items) => {
      const next = [...items];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  };
  const handleOrderDragStart = (e: DragEvent<HTMLDivElement>, idx: number) => {
    setDraggedOrderIdx(idx);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(idx));
  };
  const handleOrderDrop = (e: DragEvent<HTMLDivElement>, idx: number) => {
    e.preventDefault();
    const fromIdx = Number(e.dataTransfer.getData("text/plain"));
    if (Number.isInteger(fromIdx)) dragSection(fromIdx, idx);
    setDraggedOrderIdx(null);
  };
  const tabs = ["Page Settings", "Side Buttons", "Print Settings", "Prescription Settings", "Billing Settings", "Prescription Order", "Research Alerts"];
  const ToggleRow = ({ k, label, desc }: { k: string; label: string; desc?: string }) => (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-gray-100">
      <div>
        <p className="text-sm font-medium text-gray-700">{label}</p>
        {desc && <p className="text-xs text-gray-400">{desc}</p>}
      </div>
      <button onClick={() => toggle(k)} className={`w-10 h-5 rounded-full relative transition-colors flex items-center px-0.5 flex-shrink-0 ${toggles[k] ? "bg-blue-600" : "bg-gray-300"}`}>
        <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${toggles[k] ? "translate-x-5" : "translate-x-0"}`} />
      </button>
    </div>
  );
  const pagePreview = (
    <div className="rounded-2xl border border-gray-200 bg-gray-100/70 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-700">Live Preview</p>
        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-gray-500 ring-1 ring-gray-200">{activeSub}</span>
      </div>
      <div className="mx-auto bg-white shadow-lg ring-1 ring-gray-200" style={{ width: 280, minHeight: 396 }}>
        <div className={`px-5 py-4 border-b-2 transition-colors ${activeSub === "header" ? "border-blue-600 bg-blue-50/40" : "border-blue-500"}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-2">
                {toggles.logo && (
                  <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
                    <Stethoscope className="w-4 h-4 text-white" />
                  </div>
                )}
                <div>
                  <p className="text-[9px] font-bold text-blue-600 uppercase tracking-wide">Oncology Prescription</p>
                  <p className="text-[8px] text-gray-400">Smart Prescription & Patient Management</p>
                </div>
              </div>
              {toggles.doctorInfo && (
                <>
                  <p className="text-[11px] font-bold text-gray-900">Doctor information</p>
                  <p className="text-[8px] text-gray-500">Qualifications</p>
                  <p className="text-[8px] text-gray-400">Clinic details</p>
                </>
              )}
            </div>
            {(toggles.barcode || toggles.rxBarcode) && (
              <div className="w-11 h-11 rounded border border-gray-200 bg-gray-50 flex items-center justify-center flex-shrink-0">
                <QrCode className="w-8 h-8 text-gray-300" />
              </div>
            )}
          </div>
        </div>

        <div className="px-5 py-2 bg-blue-50 border-b border-blue-100">
          <div className="grid grid-cols-3 gap-2">
            {["Name", "Age/Sex", "Patient ID"].map((label) => (
              <div key={label}>
                <p className="text-[7px] uppercase text-gray-400">{label}</p>
                <p className="text-[8px] font-semibold text-gray-800">{label === "Name" ? "Patient Name" : label === "Age/Sex" ? "--" : "Patient ID"}</p>
              </div>
            ))}
          </div>
        </div>

        <div className={`grid ${toggles.divider ? "grid-cols-[42%_1fr] divide-x divide-gray-200" : "grid-cols-[42%_1fr]"} ${activeSub === "body" ? "bg-sky-50/20" : ""}`} style={{ minHeight: 230 }}>
          <div className="p-4 space-y-3">
            {["Chief Complaint", "Diagnosis"].map((section) => (
              <div key={section}>
                <p className="text-[7px] font-bold uppercase tracking-wide text-gray-400 border-b border-gray-100 pb-1">{section}</p>
                <div className="mt-1.5 space-y-1">
                  <div className="h-1.5 w-20 rounded bg-gray-200" />
                  <div className="h-1.5 w-14 rounded bg-gray-100" />
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-1">
              <span className="text-lg font-serif font-bold text-blue-600">Rx</span>
              <span className="text-[7px] font-medium uppercase text-gray-400">Medicines</span>
            </div>
            {[1, 2, 3].map((n) => (
              <div key={n} className="flex gap-2">
                <span className="text-[8px] font-bold text-blue-600">{n}.</span>
                <div className="flex-1 space-y-1">
                  <div className="h-1.5 w-24 rounded bg-gray-300" />
                  <div className="h-1.5 w-16 rounded bg-gray-100" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={`px-5 py-3 border-t border-gray-200 flex items-end justify-between ${activeSub === "footer" || activeSub === "signature" ? "bg-emerald-50/35" : ""}`}>
          <div>
            {activeSub === "footer" && <p className="text-[7px] text-gray-400">Clinic contact</p>}
            <p className="text-[7px] text-gray-400">Footer information</p>
          </div>
          {toggles.showSignature && (
            <div className={`${activeSub === "signature" ? "ring-2 ring-emerald-200 rounded px-1" : ""}`}>
              <div className="w-16 border-t border-gray-400 pt-1 text-right">
                <p className="text-[7px] text-gray-500">Signature</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
  const settingsPreviewFrame = (title: string, children: ReactNode) => (
    <div className="rounded-2xl border border-gray-200 bg-gray-100/70 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-700">{title}</p>
        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-gray-500 ring-1 ring-gray-200">Preview</span>
      </div>
      {children}
    </div>
  );
  const sideButtonsPanel = (
    <div className="grid min-h-full gap-6 xl:grid-cols-[minmax(0,1fr)_330px]">
      <div className="space-y-5">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Side Button Visibility</h3>
          <p className="text-xs text-gray-400 mt-1">Choose which shortcut groups appear beside the prescription editor.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { k: "sideClinical", label: "Clinical Shortcuts", icon: ClipboardList, desc: "Complaint, history, diagnosis" },
            { k: "sideTreatment", label: "Treatment Tools", icon: Pill, desc: "Medicines, advice, follow-up" },
            { k: "sideVoice", label: "Voice Notes", icon: Mic, desc: "Dictation and quick notes" },
            { k: "sideTemplates", label: "Templates", icon: LayoutTemplate, desc: "Common prescription templates" },
            { k: "sideHistory", label: "Patient History", icon: FileText, desc: "Past visits and prescriptions" },
            { k: "sideCalculator", label: "Dose Calculator", icon: Activity, desc: "Clinical dose helpers" },
          ].map((item) => (
            <button
              key={item.k}
              onClick={() => toggle(item.k)}
              className={`rounded-xl border p-4 text-left transition-all ${toggles[item.k] ? "border-blue-200 bg-blue-50/70 shadow-sm" : "border-gray-200 bg-white hover:bg-gray-50"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${toggles[item.k] ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500"}`}>
                  <item.icon className="w-4 h-4" />
                </div>
                {toggles[item.k] ? <Eye className="w-4 h-4 text-blue-600" /> : <EyeOff className="w-4 h-4 text-gray-400" />}
              </div>
              <p className="mt-3 text-sm font-semibold text-gray-900">{item.label}</p>
              <p className="mt-1 text-xs text-gray-500">{item.desc}</p>
            </button>
          ))}
        </div>
      </div>
      <div className="xl:sticky xl:top-0 self-start">
        {settingsPreviewFrame("Editor Sidebars", (
          <div className="rounded-xl bg-white p-4 ring-1 ring-gray-200 shadow-sm">
            <div className="grid grid-cols-[44px_1fr_44px] gap-3">
              <div className="space-y-2">
                {["sideClinical", "sideVoice", "sideHistory"].filter(k => toggles[k]).map((k) => (
                  <div key={k} className="h-9 rounded-lg bg-blue-50 ring-1 ring-blue-100 flex items-center justify-center">
                    {k === "sideClinical" ? <ClipboardList className="w-4 h-4 text-blue-600" /> : k === "sideVoice" ? <Mic className="w-4 h-4 text-blue-600" /> : <FileText className="w-4 h-4 text-blue-600" />}
                  </div>
                ))}
              </div>
              <div className="min-h-64 rounded-lg bg-gray-50 p-3 ring-1 ring-gray-100">
                <div className="h-8 rounded bg-white ring-1 ring-gray-100" />
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="h-40 rounded bg-white ring-1 ring-gray-100" />
                  <div className="h-40 rounded bg-white ring-1 ring-gray-100" />
                </div>
              </div>
              <div className="space-y-2">
                {["sideTreatment", "sideTemplates", "sideCalculator"].filter(k => toggles[k]).map((k) => (
                  <div key={k} className="h-9 rounded-lg bg-emerald-50 ring-1 ring-emerald-100 flex items-center justify-center">
                    {k === "sideTreatment" ? <Pill className="w-4 h-4 text-emerald-600" /> : k === "sideTemplates" ? <LayoutTemplate className="w-4 h-4 text-emerald-600" /> : <Activity className="w-4 h-4 text-emerald-600" />}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
  const printSettingsPanel = (
    <div className="grid min-h-full gap-6 xl:grid-cols-[minmax(0,1fr)_330px]">
      <div className="space-y-5">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Print Layout Settings</h3>
          <p className="text-xs text-gray-400 mt-1">Tune paper output for clinic stationery and printer behavior.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1.5">Paper Size</label>
            <select className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none">
              <option>A4 Portrait</option><option>A5 Portrait</option><option>Letter Portrait</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1.5">Print Density</label>
            <select className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none">
              <option>Comfortable</option><option>Compact</option><option>Expanded</option>
            </select>
          </div>
        </div>
        <div className="space-y-1">
          {[
            { k: "printHeader", label: "Print Header", desc: "Clinic name, doctor info, and prescription title" },
            { k: "printFooter", label: "Print Footer", desc: "Phone, website, and signature footer" },
            { k: "printMargins", label: "Safe Print Margins", desc: "Keep content away from printer clipping areas" },
            { k: "printQr", label: "Print QR Codes", desc: "Include patient and prescription QR references" },
            { k: "printWatermark", label: "Clinic Watermark", desc: "Light logo watermark behind prescription body" },
            { k: "printBackground", label: "Print Background Colors", desc: "Use shaded patient bars and section backgrounds" },
          ].map((item) => <ToggleRow key={item.k} {...item} />)}
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-gray-700">Print Scale</label>
            <span className="text-xs font-semibold text-gray-500">{printScale}%</span>
          </div>
          <input value={printScale} onChange={(e) => setPrintScale(Number(e.target.value))} type="range" min={85} max={110} className="mt-3 w-full accent-blue-600" />
        </div>
      </div>
      <div className="xl:sticky xl:top-0 self-start">
        {settingsPreviewFrame("Print Output", (
          <div className="mx-auto bg-white shadow-lg ring-1 ring-gray-200 transition-transform" style={{ width: 230, minHeight: 325, transform: `scale(${printScale / 100})`, transformOrigin: "top center" }}>
            {toggles.printHeader && <div className="h-14 border-b-2 border-blue-500 p-3"><div className="h-2 w-28 rounded bg-blue-200" /><div className="mt-2 h-1.5 w-20 rounded bg-gray-200" /></div>}
            <div className={`${toggles.printBackground ? "bg-blue-50" : "bg-white"} h-8 border-b border-gray-100 px-3 py-2`}>
              <div className="h-1.5 w-36 rounded bg-gray-200" />
            </div>
            <div className={`relative grid grid-cols-[42%_1fr] ${toggles.printMargins ? "m-4" : "m-1"} gap-3`}>
              {toggles.printWatermark && <div className="absolute inset-0 flex items-center justify-center text-blue-50"><Stethoscope className="w-24 h-24" /></div>}
              <div className="relative space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-8 rounded bg-gray-100" />)}</div>
              <div className="relative space-y-2">{[1, 2, 3, 4].map(i => <div key={i} className="h-6 rounded bg-gray-100" />)}</div>
            </div>
            {toggles.printQr && <div className="absolute right-12 top-10 h-8 w-8 rounded border border-gray-200 bg-gray-50 flex items-center justify-center"><QrCode className="w-5 h-5 text-gray-300" /></div>}
            {toggles.printFooter && <div className="mt-4 h-10 border-t border-gray-200 p-3"><div className="h-1.5 w-28 rounded bg-gray-200" /></div>}
          </div>
        ))}
      </div>
    </div>
  );
  const prescriptionOrderPanel = (
    <div className="grid min-h-full gap-6 xl:grid-cols-[minmax(0,1fr)_330px]">
      <div className="space-y-5">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Prescription Section Order</h3>
          <p className="text-xs text-gray-400 mt-1">Drag sections by the handle, or use the arrow buttons, to match your printed prescription workflow.</p>
        </div>
        <div className="space-y-2">
          {prescriptionOrder.map((section, idx) => (
            <div
              key={section}
              draggable
              onDragStart={(e) => handleOrderDragStart(e, idx)}
              onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
              onDrop={(e) => handleOrderDrop(e, idx)}
              onDragEnd={() => setDraggedOrderIdx(null)}
              className={`flex cursor-grab items-center gap-3 rounded-xl border bg-white p-3 shadow-sm transition-all active:cursor-grabbing ${
                draggedOrderIdx === idx ? "border-blue-300 bg-blue-50/60 opacity-70" : "border-gray-200 hover:border-blue-200 hover:shadow-md"
              }`}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-400" title="Drag to reorder">
                <GripVertical className="h-4 w-4" />
              </div>
              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">{idx + 1}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">{section}</p>
                <p className="text-xs text-gray-400">{idx < 2 ? "Header area" : idx > prescriptionOrder.length - 3 ? "Closing area" : "Body section"}</p>
              </div>
              <div className="flex items-center gap-1">
                <button disabled={idx === 0} onClick={() => moveSection(idx, -1)} className="w-8 h-8 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-35 disabled:hover:bg-white flex items-center justify-center">
                  <ChevronLeft className="w-4 h-4 rotate-90" />
                </button>
                <button disabled={idx === prescriptionOrder.length - 1} onClick={() => moveSection(idx, 1)} className="w-8 h-8 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-35 disabled:hover:bg-white flex items-center justify-center">
                  <ChevronRight className="w-4 h-4 rotate-90" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="xl:sticky xl:top-0 self-start">
        {settingsPreviewFrame("Section Flow", (
          <div className="rounded-xl bg-white p-4 ring-1 ring-gray-200 shadow-sm">
            <div className="space-y-2">
              {prescriptionOrder.map((section, idx) => (
                <div key={section} className={`flex items-center gap-2 rounded-lg px-3 py-2 ${section === "Medicines" ? "bg-blue-50 ring-1 ring-blue-100" : "bg-gray-50"}`}>
                  <span className="w-5 text-[10px] font-bold text-gray-400">{idx + 1}</span>
                  <div className="flex-1">
                    <p className={`text-xs font-semibold ${section === "Medicines" ? "text-blue-700" : "text-gray-700"}`}>{section}</p>
                  </div>
                  {section === "Medicines" && <Pill className="w-3.5 h-3.5 text-blue-600" />}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="premium-modal rounded-t-2xl shadow-2xl w-full h-[94vh] flex flex-col overflow-hidden sm:rounded-2xl sm:w-[min(64rem,calc(100vw-2rem))] sm:h-[min(44rem,calc(100vh-2rem))]">
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100 flex-shrink-0 sm:px-6">
          <h2 className="text-base font-semibold text-gray-900">Settings</h2>
          <button onClick={onClose} className="w-8 h-8 bg-red-100 hover:bg-red-200 text-red-600 rounded-full flex items-center justify-center transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex flex-1 min-h-0 flex-col overflow-hidden sm:flex-row">
          <div className="flex flex-shrink-0 gap-2 overflow-x-auto bg-gray-50 border-b border-gray-100 p-3 sm:block sm:w-44 sm:space-y-0.5 sm:overflow-y-auto sm:border-b-0 sm:border-r">
            {tabs.map((tab) => {
              const id = tab.toLowerCase().replace(/ /g, "-");
              return (
                <button key={tab} onClick={() => setActiveTab(id)} className={`flex-shrink-0 whitespace-nowrap text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors sm:w-full ${activeTab === id ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}>{tab}</button>
              );
            })}
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-5 sm:p-6">
            {activeTab === "page-settings" && (
              <div className="grid min-h-full gap-6 xl:grid-cols-[minmax(0,1fr)_330px]">
                <div className="space-y-5">
                  <div className="flex max-w-full gap-1 overflow-x-auto bg-gray-100 rounded-lg p-1 sm:w-fit">
                    {["header", "body", "signature", "footer"].map((sub) => (
                      <button key={sub} onClick={() => setActiveSub(sub)} className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors ${activeSub === sub ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>{sub}</button>
                    ))}
                  </div>
                  {activeSub === "header" && (
                    <div className="space-y-1">
                      {[
                        { k: "logo", label: "Show Clinic Logo", desc: "Display your clinic logo in the header" },
                        { k: "doctorInfo", label: "Show Doctor Information", desc: "Doctor name, qualifications, and registration" },
                        { k: "barcode", label: "Show Patient Barcode", desc: "Include patient ID barcode" },
                        { k: "rxBarcode", label: "Show Prescription Barcode", desc: "Include prescription ID barcode" },
                      ].map((item) => <ToggleRow key={item.k} {...item} />)}
                      <div className="pt-3 space-y-3">
                        <div>
                          <label className="text-xs font-semibold text-gray-600 block mb-1.5">Upload Logo</label>
                          <div className="border-2 border-dashed border-gray-200 rounded-xl p-5 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-colors">
                            <Upload className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                            <p className="text-xs text-gray-500">Click to upload or drag and drop</p>
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-600 block mb-1.5">Clinic Address</label>
                          <textarea rows={2} defaultValue="" placeholder="Use profile address" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none" />
                        </div>
                      </div>
                    </div>
                  )}
                  {activeSub === "body" && (
                    <div className="space-y-4">
                      {[{ label: "Section Title Font Size", defaultVal: 14 }, { label: "Content Font Size", defaultVal: 12 }].map((s) => (
                        <div key={s.label} className="space-y-1.5">
                          <div className="flex justify-between"><label className="text-xs font-medium text-gray-600">{s.label}</label><span className="text-xs text-gray-500">{s.defaultVal}px</span></div>
                          <input type="range" min={10} max={20} defaultValue={s.defaultVal} className="w-full accent-blue-600" />
                        </div>
                      ))}
                      <ToggleRow k="divider" label="Vertical Divider" desc="Show line between left and right columns" />
                    </div>
                  )}
                  {activeSub === "signature" && (
                    <div className="space-y-3">
                      <ToggleRow k="showSignature" label="Show Doctor Signature Area" desc="Reserve space for signature and seal" />
                      <div>
                        <label className="text-xs font-semibold text-gray-600 block mb-1.5">Signature Label</label>
                        <input defaultValue="" placeholder="Use profile name" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                      </div>
                    </div>
                  )}
                  {activeSub === "footer" && (
                    <div className="space-y-3">
                      <ToggleRow k="showFollowUp" label="Show Footer Contact" desc="Display clinic phone and website in footer" />
                      <div>
                        <label className="text-xs font-semibold text-gray-600 block mb-1.5">Footer Note</label>
                        <textarea rows={3} defaultValue="" placeholder="Use profile phone and clinic contact" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none" />
                      </div>
                    </div>
                  )}
                </div>
                <div className="xl:sticky xl:top-0 self-start">{pagePreview}</div>
              </div>
            )}
            {activeTab === "prescription-settings" && (
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Prescription Display Settings</h3>
                {[
                  { k: "showGeneric", label: "Show Generic Name" },
                  { k: "showBrand", label: "Show Brand Name" },
                  { k: "showDuration", label: "Show Duration" },
                  { k: "showMeal", label: "Show Meal Instructions" },
                  { k: "showAdvice", label: "Show Advice Section" },
                  { k: "showFollowUp", label: "Show Follow-up Date" },
                  { k: "bangla", label: "Bangla Instruction Support" },
                  { k: "autoSerial", label: "Automatic Serial Numbering" },
                  { k: "autoPatientId", label: "Automatic Patient ID" },
                ].map((item) => (
                  <div key={item.k} className="flex items-center justify-between py-2.5 border-b border-gray-100">
                    <p className="text-sm text-gray-700">{item.label}</p>
                    <button onClick={() => toggle(item.k)} className={`w-10 h-5 rounded-full relative transition-colors flex items-center px-0.5 flex-shrink-0 ${toggles[item.k] ? "bg-blue-600" : "bg-gray-300"}`}>
                      <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${toggles[item.k] ? "translate-x-5" : "translate-x-0"}`} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {activeTab === "billing-settings" && (
              <div className="space-y-5">
                <h3 className="text-sm font-semibold text-gray-900">Billing Configuration</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><label className="text-xs font-semibold text-gray-600 block mb-1.5">Consultation Fee</label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">BDT</span><input type="number" defaultValue="1500" className="w-full pl-7 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20" /></div></div>
                  <div><label className="text-xs font-semibold text-gray-600 block mb-1.5">Follow-up Fee</label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">BDT</span><input type="number" defaultValue="800" className="w-full pl-7 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20" /></div></div>
                  <div><label className="text-xs font-semibold text-gray-600 block mb-1.5">Currency</label><select className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none"><option>BDT (BDT)</option><option>USD ($)</option></select></div>
                  <div><label className="text-xs font-semibold text-gray-600 block mb-1.5">Tax %</label><input type="number" defaultValue="0" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none" /></div>
                </div>
              </div>
            )}
            {activeTab === "side-buttons" && sideButtonsPanel}
            {activeTab === "print-settings" && printSettingsPanel}
            {activeTab === "prescription-order" && prescriptionOrderPanel}
            {activeTab === "research-alerts" && (
              <div className="max-w-xl space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Research data alert</h3>
                  <p className="mt-1 text-xs text-gray-500">
                    You get a notification when this many patients share the same disease (ICD-10 code from the Patient Summary,
                    or the latest prescription diagnosis), suggesting the group could be used for a research project.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[20, 25, 30].map(value => (
                    <button
                      key={value}
                      onClick={() => { setResearchThreshold(value); setCustomThreshold(false); }}
                      className={`rounded-lg border px-4 py-2 text-sm font-semibold ${!customThreshold && researchThreshold === value ? "border-blue-600 bg-blue-600 text-white" : "border-gray-200 text-gray-700 hover:bg-gray-50"}`}
                    >
                      {value} patients{value === DEFAULT_RESEARCH_THRESHOLD ? " (default)" : ""}
                    </button>
                  ))}
                  <button
                    onClick={() => setCustomThreshold(true)}
                    className={`rounded-lg border px-4 py-2 text-sm font-semibold ${customThreshold ? "border-blue-600 bg-blue-600 text-white" : "border-gray-200 text-gray-700 hover:bg-gray-50"}`}
                  >
                    Custom
                  </button>
                </div>
                {customThreshold && (
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-600">Custom threshold (patients)</label>
                    <input
                      type="number"
                      min={2}
                      value={Number.isNaN(researchThreshold) ? "" : researchThreshold}
                      onChange={e => setResearchThreshold(parseInt(e.target.value, 10))}
                      className="w-40 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                )}
                <p className="text-xs text-gray-500">Current: alert at <span className="font-semibold text-gray-900">{Number.isNaN(researchThreshold) ? "-" : researchThreshold}</span> patients per disease. After you dismiss an alert, it returns when the group grows by another {Number.isNaN(researchThreshold) ? "-" : researchThreshold}.</p>
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-2 px-4 py-4 border-t border-gray-100 bg-gray-50/40 flex-shrink-0 sm:flex-row sm:items-center sm:justify-end sm:px-6">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors">Cancel</button>
          <button onClick={saveSettings} disabled={savingSettings} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60">{savingSettings ? "Saving..." : "Save Changes"}</button>
        </div>
      </div>
    </div>
  );
}

// SIDEBAR
const NAV_ITEMS: { id: View; label: string; icon: any }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "appointments", label: "Appointments", icon: Calendar },
  { id: "patients", label: "Patients", icon: Users },
  { id: "create-prescription", label: "Create Prescription", icon: FilePlus },
  { id: "prescription-history", label: "Rx History", icon: FileText },
  { id: "templates", label: "Templates", icon: LayoutTemplate },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "reports", label: "Reports", icon: BarChart2 },
  { id: "research", label: "Research", icon: Microscope },
  { id: "guidelines", label: "Guidelines", icon: BookOpen },
  { id: "tutorial", label: "Tutorial", icon: BookOpen },
];

function Sidebar({ current, onNav, collapsed, onSettings, onLogout }: {
  current: View; onNav: (v: View) => void; collapsed: boolean; onSettings: () => void; onLogout: () => void;
}) {
  const groupedItems = [
    {
      title: "Quick Actions",
      items: [
        { id: "dashboard" as View, label: "Dashboard", icon: LayoutDashboard },
        { id: "appointments" as View, label: "Book Appointment", icon: Calendar },
        { id: "patients" as View, label: "Patient Info", icon: User },
      ],
    },
    {
      title: "Prescription",
      items: [
        { id: "create-prescription" as View, label: "New Prescription Flow", icon: FilePlus },
        { id: "patient-summary" as View, label: "Patient Summary", icon: ClipboardList },
        { id: "prescription-history" as View, label: "Prescription Intake", icon: ClipboardList },
        { id: "patients" as View, label: "Add New Patient", icon: Users },
      ],
    },
    {
      title: "Clinical Tools",
      items: [
        { id: "reports" as View, label: "Reports & Analytics", icon: Microscope },
        { id: "research" as View, label: "Research Projects", icon: Pill },
        { id: "guidelines" as View, label: "Guidelines", icon: BookOpen },
        { id: "billing" as View, label: "Billing Management", icon: Upload },
        { id: "templates" as View, label: "Prescription Templates", icon: LayoutTemplate },
      ],
    },
  ];

  if (collapsed) {
    return (
      <aside className="hidden lg:flex w-16 flex-shrink-0 flex-col h-full bg-white/88 backdrop-blur-2xl border-r border-slate-200/80 shadow-[4px_0_28px_rgba(31,49,69,0.06)]">
        <div className="h-16 flex items-center justify-center border-b border-slate-200/80">
          <img src={logoImg} alt="Renata Cancer Care" className="h-9 w-9 object-contain" />
        </div>
        <nav className="flex-1 py-4 px-2 space-y-2 overflow-y-auto">
          {groupedItems.flatMap(group => group.items).map((item) => {
            const active = current === item.id;
            return (
              <button
                key={`${item.id}-${item.label}`}
                onClick={() => onNav(item.id)}
                title={item.label}
                className={`premium-icon-button w-full h-11 rounded-xl flex items-center justify-center transition-all ${active ? "bg-gradient-to-br from-sky-50 to-emerald-50 text-[#005f8f] shadow-sm ring-1 ring-sky-200" : "text-slate-600 hover:bg-slate-100"}`}
              >
                <item.icon className="w-5 h-5" />
              </button>
            );
          })}
        </nav>
      </aside>
    );
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-40 w-[min(18rem,88vw)] flex flex-col bg-white/92 backdrop-blur-2xl border-r border-slate-200/80 shadow-2xl lg:relative lg:z-auto lg:w-64 lg:flex-shrink-0 lg:h-full lg:shadow-[4px_0_30px_rgba(31,49,69,0.07)]">
      <div className="h-16 flex items-center px-8 border-b border-slate-200/80 bg-gradient-to-r from-white to-sky-50/60">
        <img src={logoImg} alt="Renata Cancer Care" className="h-11 w-auto object-contain" />
      </div>

      <nav className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
        {groupedItems.map((group) => (
          <section key={group.title}>
            <p className="mb-4 text-xs font-bold uppercase tracking-wide text-slate-500">{group.title}</p>
            <div className="space-y-2">
              {group.items.map((item) => {
                const active = current === item.id && item.label !== "Add New Patient";
                return (
                  <button
                    key={`${item.id}-${item.label}`}
                    onClick={() => item.label === "Add New Patient" ? onNav("patients") : onNav(item.id)}
                    className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                      active
                        ? "bg-gradient-to-r from-sky-50 to-emerald-50 text-[#005f8f] shadow-sm ring-1 ring-sky-200"
                        : "text-slate-800 hover:bg-slate-100 hover:translate-x-0.5"
                    }`}
                  >
                    <item.icon className={`w-5 h-5 flex-shrink-0 ${active ? "text-[#004E89]" : "text-slate-600"}`} />
                    <span className="text-left leading-tight">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </nav>

    </aside>
  );

  return (
    <aside className={`${collapsed ? "w-16" : "w-60"} flex-shrink-0 flex flex-col h-full transition-all duration-300 overflow-hidden`} style={{ background: "#EFF6FF" }}>

      {/* Logo area */}
      <div className={`flex items-center gap-3 px-4 py-5 flex-shrink-0 ${collapsed ? "justify-center" : ""}`} style={{ borderBottom: "1px solid #1E2D45" }}>
        {collapsed ? (
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg,#2563EB,#0EA5E9)" }}>
            <Stethoscope className="w-4 h-4 text-white" />
          </div>
        ) : (
          <img src={logoImg} alt="Renata Cancer Care" className="h-9 w-auto object-contain brightness-0 invert" />
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
        <p className={`text-[10px] font-semibold uppercase tracking-widest mb-3 px-2 ${collapsed ? "hidden" : "block"}`} style={{ color: "#475569" }}>
          Navigation
        </p>
        {NAV_ITEMS.map((item) => {
          const active = current === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNav(item.id)}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${collapsed ? "justify-center" : ""} ${
                active
                  ? "text-white shadow-lg"
                  : "hover:text-white"
              }`}
              style={active
                ? { background: "linear-gradient(135deg,#2563EB,#1D4ED8)", boxShadow: "0 4px 12px rgba(37,99,235,0.35)" }
                : { color: "#94A3B8", background: "transparent" }
              }
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "#1E2D45"; }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span className="truncate flex-1 text-left">{item.label}</span>}
              {!collapsed && item.id === "create-prescription" && (
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#38BDF8" }} />
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-4 space-y-0.5 flex-shrink-0" style={{ borderTop: "1px solid #1E2D45", paddingTop: "12px" }}>
        <button
          onClick={onSettings}
          title={collapsed ? "Settings" : undefined}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${collapsed ? "justify-center" : ""}`}
          style={{ color: "#94A3B8" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#1E2D45"; (e.currentTarget as HTMLElement).style.color = "#E2E8F0"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "#94A3B8"; }}
        >
          <Settings className="w-4 h-4 flex-shrink-0" />
          {!collapsed && "Settings"}
        </button>
        <button
          onClick={onLogout}
          title={collapsed ? "Logout" : undefined}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${collapsed ? "justify-center" : ""}`}
          style={{ color: "#F87171" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.1)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && "Logout"}
        </button>
        {!collapsed && (
          <button
            className="w-full flex items-center justify-center gap-2 mt-2 py-2.5 px-3 text-xs font-semibold rounded-xl transition-all duration-150"
            style={{ background: "linear-gradient(135deg,#0EA5E9,#2563EB)", color: "#fff" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "0.9"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
          >
            <MessageCircle className="w-3.5 h-3.5" />Support
          </button>
        )}
      </div>
    </aside>
  );
}

// EDIT PROFILE MODAL
type DoctorProfile = {
  name: string;
  specialty: string;
  qualifications: string;
  regNo: string;
  phone: string;
  clinic: string;
  address: string;
  prescriptionTitle: string;
  prescriptionSubtitle: string;
  avatarUrl?: string;
};

function EditProfileModal({ profile, onSave, onClose }: {
  profile: DoctorProfile;
  onSave: (p: DoctorProfile) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({ ...profile });
  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }));
  const handlePhotoChange = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => set("avatarUrl", String(reader.result));
    reader.readAsDataURL(file);
  };
  const inp = "w-full px-3.5 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-slate-50 focus:bg-white";

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]" style={{ border: "1px solid #DDE3ED" }}>
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderBottom: "1px solid #F1F5F9" }}>
          <div>
            <h2 className="text-base font-bold text-gray-900" style={{ fontFamily: "var(--font-display)" }}>Edit Profile</h2>
            <p className="text-xs text-gray-500 mt-0.5">Update your professional information</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 bg-red-100 hover:bg-red-200 text-red-600 rounded-full flex items-center justify-center transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Avatar preview */}
          <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-100">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-bold flex-shrink-0 overflow-hidden" style={{ background: "linear-gradient(135deg,#2563EB,#0EA5E9)" }}>
              {form.avatarUrl ? (
                <img src={form.avatarUrl} alt={form.name || "Profile photo"} className="h-full w-full object-cover" />
              ) : (
                form.name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-gray-900">{form.name || "Doctor Name"}</p>
              <p className="text-xs text-gray-500">{form.qualifications}  -  {form.specialty}</p>
              <p className="text-xs text-gray-400 mt-0.5">Reg. No: {form.regNo}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-[#004E89] shadow-sm ring-1 ring-blue-100 hover:bg-blue-50">
                  <Camera className="h-3.5 w-3.5" />
                  Add Photo
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => handlePhotoChange(e.target.files?.[0])}
                  />
                </label>
                {form.avatarUrl && (
                  <button
                    type="button"
                    onClick={() => set("avatarUrl", "")}
                    className="rounded-lg px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-semibold text-gray-600 block mb-1.5">Full Name <span className="text-red-500">*</span></label>
              <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Doctor Name" className={inp} style={{ borderColor: "#DDE3ED" }} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1.5">Specialty</label>
              <select value={form.specialty} onChange={e => set("specialty", e.target.value)} className={inp} style={{ borderColor: "#DDE3ED" }}>
                {["Specialty", "General Physician", "Cardiologist", "Endocrinologist", "Neurologist", "Pulmonologist", "Gastroenterologist", "Orthopaedic Surgeon"].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1.5">Qualifications</label>
              <input value={form.qualifications} onChange={e => set("qualifications", e.target.value)} placeholder="Qualifications" className={inp} style={{ borderColor: "#DDE3ED" }} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1.5">BMDC Reg. No.</label>
              <input value={form.regNo} onChange={e => set("regNo", e.target.value)} placeholder="Registration number" className={inp} style={{ borderColor: "#DDE3ED" }} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1.5">Phone</label>
              <input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="Phone number" className={inp} style={{ borderColor: "#DDE3ED" }} />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-gray-600 block mb-1.5">Clinic / Hospital</label>
              <input value={form.clinic} onChange={e => set("clinic", e.target.value)} placeholder="Clinic or hospital" className={inp} style={{ borderColor: "#DDE3ED" }} />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-gray-600 block mb-1.5">Chamber Address</label>
              <textarea value={form.address} onChange={e => set("address", e.target.value)} rows={2} placeholder="Clinic address" className={`${inp} resize-none`} style={{ borderColor: "#DDE3ED" }} />
            </div>
            <div className="col-span-2 pt-2 border-t border-slate-100">
              <label className="text-xs font-semibold text-gray-600 block mb-1.5">Prescription Header</label>
              <input value={form.prescriptionTitle} onChange={e => set("prescriptionTitle", e.target.value)} placeholder="Oncology Prescription" className={inp} style={{ borderColor: "#DDE3ED" }} />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-gray-600 block mb-1.5">Prescription Subtitle</label>
              <input value={form.prescriptionSubtitle} onChange={e => set("prescriptionSubtitle", e.target.value)} placeholder="Smart Prescription & Patient Management" className={inp} style={{ borderColor: "#DDE3ED" }} />
            </div>
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 flex-shrink-0" style={{ borderTop: "1px solid #F1F5F9" }}>
          <button onClick={onClose} className="flex-1 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors font-medium">Cancel</button>
          <button onClick={() => { onSave(form); onClose(); }}
            className="flex-1 py-2.5 text-sm text-white rounded-xl font-semibold transition-all"
            style={{ background: "linear-gradient(135deg,#2563EB,#1D4ED8)", boxShadow: "0 4px 12px rgba(37,99,235,0.3)" }}>
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

// TOP NAV
const DEFAULT_PROFILE = {
  name: "",
  specialty: "",
  qualifications: "",
  regNo: "",
  phone: "",
  clinic: "",
  address: "",
  prescriptionTitle: "",
  prescriptionSubtitle: "",
  avatarUrl: "",
} satisfies DoctorProfile;

function TopNav({ onMenuClick, current, darkMode, onToggleTheme, onSettings, onLogout, profile, onProfileSave, researchAlerts, researchThreshold, onOpenResearchAlert, onDismissResearchAlerts }: {
  onMenuClick: () => void; current: View; darkMode: boolean; onToggleTheme: () => void; onSettings: () => void; onLogout: () => void; profile: DoctorProfile; onProfileSave: (profile: DoctorProfile) => void;
  researchAlerts: DiseaseGroup[]; researchThreshold: number;
  onOpenResearchAlert: (group: DiseaseGroup) => void; onDismissResearchAlerts: (groups: DiseaseGroup[]) => void;
}) {
  const [showProfile, setShowProfile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showProfile) return;
    const h = (e: MouseEvent) => { if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfile(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showProfile]);

  useEffect(() => {
    if (!showNotifications) return;
    const h = (e: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(e.target as Node)) setShowNotifications(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showNotifications]);

  const initials = profile.name.replace("Dr. ", "").split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();

  return (
    <>
      <header className="relative z-[80] h-16 bg-white/86 backdrop-blur-2xl flex items-center justify-between px-3 sm:px-6 flex-shrink-0 border-b border-slate-200/80 shadow-[0_8px_28px_rgba(31,49,69,0.06)]">
        <div className="flex items-center gap-2">
          <button onClick={onMenuClick} className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800">
            <Menu className="w-5 h-5" />
          </button>
          <img src={logoImg} alt="Renata Cancer Care" className="h-9 w-auto object-contain lg:hidden" />
        </div>
        <div className="hidden lg:flex items-center gap-3 ml-3">
          <div className="relative w-72 xl:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              placeholder="Search patients, prescriptions..."
              className="w-full rounded-xl border border-slate-200 bg-white/80 py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400"
            />
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Clinic live
          </span>
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-5">
          <button
            type="button"
            onClick={onToggleTheme}
            className="premium-icon-button inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white/80 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            title={darkMode ? "Switch to light theme" : "Switch to dark theme"}
            aria-label={darkMode ? "Switch to light theme" : "Switch to dark theme"}
          >
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <div ref={notificationRef} className="relative">
            <button
              type="button"
              onClick={() => setShowNotifications(v => !v)}
              className={`relative p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 ${showNotifications ? "bg-slate-100 text-slate-900" : ""}`}
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {researchAlerts.length > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
                  {researchAlerts.length}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-[min(22rem,calc(100vw-1.5rem))] rounded-xl bg-white z-[100] shadow-xl ring-1 ring-slate-200 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                  <p className="text-sm font-bold text-slate-950">Notifications</p>
                  <span className="rounded-full px-2 py-0.5 text-xs font-bold bg-slate-100 text-slate-500">
                    {researchAlerts.length ? `${researchAlerts.length} new` : "Read"}
                  </span>
                </div>
                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {researchAlerts.length === 0 && (
                    <p className="px-4 py-6 text-center text-xs text-slate-400">
                      No new notifications. You will be alerted when {researchThreshold} patients share a disease.
                    </p>
                  )}
                  {researchAlerts.map((group) => (
                    <div key={group.key} className="flex gap-3 px-4 py-3 hover:bg-slate-50">
                      <button
                        type="button"
                        onClick={() => { onOpenResearchAlert(group); setShowNotifications(false); }}
                        className="flex min-w-0 flex-1 gap-3 text-left"
                      >
                        <span className="mt-0.5 h-9 w-9 flex-shrink-0 rounded-lg flex items-center justify-center bg-purple-50 text-purple-600">
                          <Microscope className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-bold text-slate-900">{group.count} patients: {group.label}</span>
                          <span className="block mt-0.5 text-xs text-slate-600 leading-relaxed">
                            This group has reached your research threshold ({researchThreshold}). Open to start a research project.
                          </span>
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onDismissResearchAlerts([group])}
                        className="h-6 w-6 flex-shrink-0 rounded-full text-slate-300 hover:bg-slate-100 hover:text-slate-600 flex items-center justify-center"
                        title="Dismiss"
                        aria-label={`Dismiss alert for ${group.label}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                {researchAlerts.length > 0 && (
                  <button
                    type="button"
                    onClick={() => { onDismissResearchAlerts(researchAlerts); setShowNotifications(false); }}
                    className="w-full px-4 py-3 text-sm font-bold text-[#004E89] hover:bg-blue-50"
                  >
                    Mark all as read
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="hidden sm:block h-9 w-px bg-slate-200" />

          <div ref={profileRef} className="relative">
            <button
              onClick={() => setShowProfile(p => !p)}
              className="flex items-center gap-2 sm:gap-3 rounded-xl px-1.5 sm:px-2 py-1.5 hover:bg-slate-100"
            >
              <div className="w-10 h-10 rounded-full bg-slate-100 ring-1 ring-slate-200 flex items-center justify-center overflow-hidden">
                {profile.avatarUrl ? (
                  <img src={profile.avatarUrl} alt={profile.name} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xs font-bold text-[#004E89]">{initials}</span>
                )}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-bold leading-tight text-slate-950">{profile.name}</p>
                <p className="mt-1 text-xs leading-tight text-[#004E89]">{profile.specialty}</p>
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${showProfile ? "rotate-180" : ""}`} />
            </button>

            {showProfile && (
              <div className="absolute right-0 top-full mt-2 w-64 rounded-xl bg-white p-2 z-[100] shadow-xl ring-1 ring-slate-200">
                <div className="px-3 py-3">
                  <p className="text-sm font-bold text-slate-950">{profile.name}</p>
                  <p className="mt-1 text-xs text-slate-500">{profile.qualifications}</p>
                </div>
                <button onClick={() => { setShowEditProfile(true); setShowProfile(false); }} className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                  <User className="w-4 h-4 text-slate-500" />Edit Profile
                </button>
                <button onClick={() => { onSettings(); setShowProfile(false); }} className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                  <Settings className="w-4 h-4 text-slate-500" />Settings
                </button>
                <div className="my-1 border-t border-slate-100" />
                <button onClick={() => { setShowProfile(false); onLogout(); }} className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                  <LogOut className="w-4 h-4" />Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {showEditProfile && (
        <EditProfileModal
          profile={profile}
          onSave={onProfileSave}
          onClose={() => setShowEditProfile(false)}
        />
      )}
    </>
  );

  const labels: Partial<Record<View, string>> = {
    dashboard: "Main Dashboard", appointments: "Appointments", patients: "My Patients",
    "create-prescription": "Create Prescription", "prescription-history": "Prescription History",
    "patient-summary": "Patient Summary",
    templates: "Templates", billing: "Billing", reports: "Reports & Analytics",
    research: "Research Projects", guidelines: "Guidelines", tutorial: "Tutorial",
  };

  return (
    <>
      <header className="h-14 bg-white flex items-center px-5 gap-4 flex-shrink-0" style={{ borderBottom: "1px solid #DDE3ED", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
        <button onClick={onMenuClick} className="p-2 rounded-xl transition-colors text-slate-500 hover:bg-slate-100 hover:text-slate-700">
          <Menu className="w-[18px] h-[18px]" />
        </button>

        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <span className="text-sm font-semibold text-slate-800 truncate" style={{ fontFamily: "var(--font-display)" }}>{labels[current]}</span>
          <span className="text-slate-300 hidden sm:block"> - </span>
          <span className="text-xs text-slate-400 truncate hidden sm:block">{profile.clinic}, Dhaka</span>
        </div>

        {/* Trial badge */}
        <span className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full" style={{ background: "linear-gradient(135deg,#FEF9C3,#FEF3C7)", color: "#92400E", border: "1px solid #FDE68A" }}>
          <Zap className="w-3 h-3" />Trial - 14 days left
        </span>

        <div className="flex items-center gap-1.5">
          {/* Upgrade */}
          <button className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white rounded-xl transition-all hover:opacity-90" style={{ background: "linear-gradient(135deg,#2563EB,#1D4ED8)", boxShadow: "0 2px 8px rgba(37,99,235,0.30)" }}>
            Upgrade
          </button>

          {/* Bell */}
          <button className="relative p-2 rounded-xl transition-colors text-slate-500 hover:bg-slate-100 hover:text-slate-700">
            <Bell className="w-[18px] h-[18px]" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
          </button>

          {/* Profile avatar + dropdown */}
          <div ref={profileRef} className="relative">
            <button
              onClick={() => setShowProfile(p => !p)}
              className={`flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl transition-colors ${showProfile ? "bg-slate-100" : "hover:bg-slate-100"}`}
            >
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-white text-xs font-bold overflow-hidden" style={{ background: "linear-gradient(135deg,#2563EB,#0EA5E9)" }}>
                {profile.avatarUrl ? (
                  <img src={profile.avatarUrl} alt={profile.name} className="h-full w-full object-cover" />
                ) : (
                  initials
                )}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-xs font-semibold text-slate-900 leading-none">{profile.name}</p>
                <p className="text-[10px] text-slate-400 leading-none mt-0.5">{profile.specialty}</p>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 hidden md:block transition-transform ${showProfile ? "rotate-180" : ""}`} />
            </button>

            {showProfile && (
              <div className="absolute right-0 top-full mt-2 w-68 rounded-2xl overflow-hidden z-50" style={{ width: "260px", background: "#fff", border: "1px solid #DDE3ED", boxShadow: "0 20px 60px rgba(0,0,0,0.15), 0 4px 16px rgba(0,0,0,0.08)" }}>
                {/* Doctor header */}
                <div className="p-4" style={{ background: "linear-gradient(135deg,#EFF6FF,#F0F9FF)", borderBottom: "1px solid #DBEAFE" }}>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-base flex-shrink-0 overflow-hidden" style={{ background: "linear-gradient(135deg,#2563EB,#0EA5E9)" }}>
                      {profile.avatarUrl ? (
                        <img src={profile.avatarUrl} alt={profile.name} className="h-full w-full object-cover" />
                      ) : (
                        initials
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">{profile.name}</p>
                      <p className="text-xs text-gray-500 truncate">{profile.qualifications}</p>
                      <p className="text-xs text-gray-400 truncate">{profile.specialty}  -  Reg {profile.regNo}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-green-500 rounded-full" />
                    <span className="text-xs text-green-700 font-medium">Online  -  {profile.clinic}</span>
                  </div>
                </div>

                {/* Menu */}
                <div className="p-2">
                  {[
                    { icon: User, label: "Edit Profile", action: () => { setShowEditProfile(true); setShowProfile(false); } },
                    { icon: Settings, label: "Settings", action: () => { onSettings(); setShowProfile(false); } },
                    { icon: HelpCircle, label: "Help & Support", action: () => setShowProfile(false) },
                  ].map(item => (
                    <button key={item.label} onClick={item.action}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left">
                      <item.icon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      {item.label}
                    </button>
                  ))}
                  <div className="my-1.5 border-t border-gray-100" />
                  <button onClick={() => { setShowProfile(false); onLogout(); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-600 hover:bg-red-50 transition-colors text-left">
                    <LogOut className="w-4 h-4 flex-shrink-0" />Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {showEditProfile && (
        <EditProfileModal
          profile={profile}
          onSave={onProfileSave}
          onClose={() => setShowEditProfile(false)}
        />
      )}
    </>
  );
}

// LOGIN PAGE
function LoginPage({ onLogin, onForgot }: {
  onLogin: (identifier: string) => void;
  onForgot: () => void;
}) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) { setError("Please enter your email or mobile number"); return; }
    if (password.length < 4) { setError("Password must be at least 4 characters"); return; }
    setError("");
    setLoading(true);
    setTimeout(() => { setLoading(false); onLogin(identifier); }, 1200);
  };
  const showSignupInfo = () => {
    setError("Account creation is handled by clinic administrators in this demo.");
  };
  const downloadPolicy = (name: "Terms of Service" | "Privacy Policy") => {
    downloadTextFile(`${name.toLowerCase().replaceAll(" ", "-")}.txt`, [
      `Renata Cancer Care - ${name}`,
      "This demo policy explains how clinical accounts, patient records, and prescription workflows are managed securely.",
      "Contact support@renatacancercare.com for full policy documents.",
    ].join("\n"));
  };

  const inputCls = "w-full px-4 py-3 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-slate-50 focus:bg-white";

  return (
    <div className="min-h-screen flex" style={{ background: "#EEF2F7" }}>

      {/* Left branding panel */}
      <div className="hidden lg:flex flex-col justify-between w-[46%] p-12 text-blue-800 relative overflow-hidden" style={{ background: "linear-gradient(145deg,#FFFFFF 0%,#EFF6FF 58%,#ECFDF5 100%)" }}>

        {/* Decorative circles */}
        <div className="absolute top-[-8%] right-[-8%] w-72 h-72 rounded-full opacity-30" style={{ background: "radial-gradient(circle,#BFDBFE,transparent)" }} />
        <div className="absolute bottom-[-12%] left-[-8%] w-80 h-80 rounded-full opacity-30" style={{ background: "radial-gradient(circle,#BAE6FD,transparent)" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full opacity-30" style={{ background: "radial-gradient(circle,#DCFCE7,transparent)" }} />

        <div className="relative">
          <div className="mb-12">
            <img src={logoImg} alt="Renata Cancer Care" className="h-14 w-auto object-contain" />
          </div>
          <h1 className="text-4xl font-bold leading-tight mb-4" style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}>
            Smart Prescription<br />&amp; Patient Care
          </h1>
          <p className="text-blue-600 text-sm leading-relaxed max-w-xs">
            A complete digital platform for oncologists, clinics, and hospitals - prescriptions, patients, and appointments in one place.
          </p>
        </div>

        <div className="relative space-y-3">
          {[
            { icon: FilePlus, label: "Digital prescriptions with print & share" },
            { icon: Users, label: "Secure patient records management" },
            { icon: Calendar, label: "Appointment scheduling & reminders" },
            { icon: BarChart2, label: "Analytics & practice reports" },
          ].map(f => (
            <div key={f.label} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-white/80 border border-blue-100">
                <f.icon className="w-4 h-4" style={{ color: "#2563EB" }} />
              </div>
              <p className="text-sm text-slate-600">{f.label}</p>
            </div>
          ))}
        </div>

        <div className="relative">
          <div className="flex items-center gap-10 mb-5 pt-6 border-t border-blue-100">
            {[["1,200+", "Doctors"], ["45,000+", "Patients"], ["2.8M+", "Prescriptions"]].map(([n, l]) => (
              <div key={l}>
                <p className="text-xl font-bold" style={{ fontFamily: "var(--font-display)" }}>{n}</p>
                <p className="text-xs" style={{ color: "#64748B" }}>{l}</p>
              </div>
            ))}
          </div>
          <p className="text-xs" style={{ color: "#475569" }}>&copy; 2026 Renata Cancer Care. All rights reserved.</p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="lg:hidden mb-8">
            <img src={logoImg} alt="Renata Cancer Care" className="h-12 w-auto object-contain" />
          </div>

          {/* Card */}
          <div className="rounded-2xl p-8" style={{ background: "#ffffff", border: "1px solid #DDE3ED", boxShadow: "0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)" }}>
            <div className="mb-7">
              <h2 className="text-2xl font-bold mb-1" style={{ color: "#1D4ED8", fontFamily: "var(--font-display)" }}>Welcome back</h2>
              <p className="text-sm" style={{ color: "#64748B" }}>Sign in to your account to continue</p>
            </div>

            {error && (
              <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl mb-5" style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}>
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold block mb-1.5" style={{ color: "#475569" }}>Email or Mobile Number</label>
                <input type="text" value={identifier} onChange={e => { setIdentifier(e.target.value); setError(""); }}
                  placeholder="doctor@hospital.com or Phone number"
                  className={inputCls} style={{ borderColor: "#DDE3ED", color: "#1E40AF" }} />
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1.5" style={{ color: "#475569" }}>Password</label>
                <div className="relative">
                  <input type={showPw ? "text" : "password"} value={password}
                    onChange={e => { setPassword(e.target.value); setError(""); }}
                    placeholder="Enter your password"
                    className={`${inputCls} pr-11`} style={{ borderColor: "#DDE3ED", color: "#1E40AF" }} />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 transition-colors" style={{ color: "#94A3B8" }}>
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between py-0.5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <div onClick={() => setRemember(!remember)}
                    className="w-4 h-4 rounded border-2 flex items-center justify-center transition-colors cursor-pointer"
                    style={{ background: remember ? "#1D4ED8" : "transparent", borderColor: remember ? "#1D4ED8" : "#CBD5E1" }}>
                    {remember && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span className="text-sm select-none" style={{ color: "#475569" }}>Remember me</span>
                </label>
                <button type="button" onClick={onForgot} className="text-sm font-semibold transition-colors" style={{ color: "#1D4ED8" }}>
                  Forgot password?
                </button>
              </div>

              <button type="submit" disabled={loading}
                className="w-full py-3 text-sm font-bold text-white rounded-xl transition-all disabled:opacity-60 flex items-center justify-center gap-2 mt-1"
                style={{ background: "linear-gradient(135deg,#2563EB,#1D4ED8)", boxShadow: "0 4px 14px rgba(37,99,235,0.35)" }}
                onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.boxShadow = "0 6px 20px rgba(37,99,235,0.45)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 14px rgba(37,99,235,0.35)"; }}
              >
                {loading ? <><RefreshCw className="w-4 h-4 animate-spin" />Signing in...</> : "Sign In"}
              </button>
            </form>

            <div className="mt-6 pt-6 text-center" style={{ borderTop: "1px solid #F1F5F9" }}>
              <p className="text-sm" style={{ color: "#64748B" }}>
                {"Don't have an account? "}
                <button type="button" onClick={showSignupInfo} className="font-semibold transition-colors" style={{ color: "#1D4ED8" }}>Create account</button>
              </p>
            </div>
          </div>

          <p className="text-center text-xs mt-5" style={{ color: "#94A3B8" }}>
            By signing in you agree to our{" "}
            <button type="button" onClick={() => downloadPolicy("Terms of Service")} className="hover:underline" style={{ color: "#2563EB" }}>Terms of Service</button>
            {" "}and{" "}
            <button type="button" onClick={() => downloadPolicy("Privacy Policy")} className="hover:underline" style={{ color: "#2563EB" }}>Privacy Policy</button>
          </p>
        </div>
      </div>
    </div>
  );
}

// FORGOT PASSWORD PAGE
function ForgotPasswordPage({ onBack }: { onBack: () => void }) {
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) return;
    setLoading(true);
    setTimeout(() => { setLoading(false); setSent(true); }, 1200);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "#EEF2F7" }}>
      <div className="w-full max-w-md">
        <div className="rounded-2xl p-8" style={{ background: "#ffffff", border: "1px solid #DDE3ED", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
          {!sent ? (
            <>
              <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Lock className="w-7 h-7 text-blue-600" />
              </div>
              <div className="text-center mb-7">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Forgot Password?</h2>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Enter your email or mobile number and we will send you a password reset link.
                </p>
              </div>
              <form onSubmit={handleSend} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1.5">
                    Email or Mobile Number
                  </label>
                  <input
                    type="text"
                    value={identifier}
                    onChange={e => setIdentifier(e.target.value)}
                    placeholder="doctor@hospital.com or Phone number"
                    className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-gray-50 focus:bg-white transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !identifier.trim()}
                  className="w-full py-3 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {loading ? <><RefreshCw className="w-4 h-4 animate-spin" />Sending...</> : "Send Reset Link"}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-7 h-7 text-green-600" />
              </div>
              <div className="text-center mb-7">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Check Your Inbox</h2>
                <p className="text-sm text-gray-500 leading-relaxed">
                  We have sent a password reset link to{" "}
                  <span className="font-semibold text-gray-800">{identifier}</span>.
                  Please check your email or SMS.
                </p>
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center mb-4">
                <p className="text-xs text-blue-600">
                  Did not receive it? Check your spam folder or try again in a few minutes.
                </p>
              </div>
            </>
          )}
          <button
            onClick={onBack}
            className="w-full mt-2 py-2.5 text-sm text-gray-500 hover:text-gray-700 transition-colors flex items-center justify-center gap-1.5"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Sign In
          </button>
        </div>
      </div>
    </div>
  );
}

// OTP VERIFICATION PAGE
function OTPPage({ identifier, onVerify, onBack }: {
  identifier: string;
  onVerify: () => void;
  onBack: () => void;
}) {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (countdown <= 0) { setCanResend(true); return; }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...otp];
    next[index] = value.slice(-1);
    setOtp(next);
    setError("");
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace") {
      if (otp[index]) {
        const next = [...otp]; next[index] = ""; setOtp(next);
      } else if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const next = ["", "", "", "", "", ""];
    digits.split("").forEach((d, i) => { next[i] = d; });
    setOtp(next);
    const focusIdx = Math.min(digits.length, 5);
    inputRefs.current[focusIdx]?.focus();
  };

  const handleResend = () => {
    setOtp(["", "", "", "", "", ""]);
    setCountdown(60);
    setCanResend(false);
    setError("");
    setTimeout(() => inputRefs.current[0]?.focus(), 50);
  };

  const handleVerify = () => {
    const code = otp.join("");
    if (code.length < 6) { setError("Please enter the complete 6-digit code"); return; }
    setError("");
    setLoading(true);
    setTimeout(() => { setLoading(false); onVerify(); }, 1200);
  };

  const masked = identifier.includes("@")
    ? identifier.replace(/^(.{2}).+(@.+)$/, "$1---$2")
    : identifier.replace(/^(\+?\d{3})\d+(\d{4})$/, "$1 ---- $2");

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "#EEF2F7" }}>
      <div className="w-full max-w-md">
        <div className="rounded-2xl p-8" style={{ background: "#ffffff", border: "1px solid #DDE3ED", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <img
              src={logoImg}
              alt="Renata Cancer Care"
              className="h-14 w-auto object-contain"
            />
          </div>

          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Verify Your Identity</h2>
            <p className="text-sm text-gray-500">
              We sent a 6-digit code to
            </p>
            <p className="text-sm font-semibold text-gray-800 mt-0.5">{masked}</p>
          </div>

          {error && (
            <div className="flex items-center gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl mb-5">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* 6 digit boxes */}
          <div className="flex gap-2.5 justify-center mb-6" onPaste={handlePaste}>
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={el => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={e => handleChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                className={`w-12 h-14 text-center text-xl font-bold border-2 rounded-xl focus:outline-none transition-all ${
                  digit
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-200 text-gray-900 focus:border-blue-400 focus:bg-blue-50/30"
                }`}
              />
            ))}
          </div>

          {/* Countdown / resend */}
          <p className="text-center text-sm text-gray-500 mb-6">
            {canResend ? (
              <>
                {"Didn't receive the code? "}
                <button
                  onClick={handleResend}
                  className="text-blue-600 hover:text-blue-700 font-semibold transition-colors"
                >
                  Resend OTP
                </button>
              </>
            ) : (
              <>
                {"Resend code in "}
                <span className="font-semibold text-gray-800 tabular-nums">
                  0:{countdown.toString().padStart(2, "0")}
                </span>
              </>
            )}
          </p>

          <button
            onClick={handleVerify}
            disabled={loading || otp.join("").length < 6}
            className="w-full py-3 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading
              ? <><RefreshCw className="w-4 h-4 animate-spin" />Verifying...</>
              : "Verify & Sign In"}
          </button>

          <button
            onClick={onBack}
            className="w-full mt-3 py-2.5 text-sm text-gray-500 hover:text-gray-700 transition-colors flex items-center justify-center gap-1.5"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Sign In
          </button>
        </div>

        {/* Security note */}
        <p className="text-center text-xs text-gray-400 mt-5 flex items-center justify-center gap-1.5">
          <Lock className="w-3 h-3" />
          Secured with 256-bit encryption
        </p>
      </div>
    </div>
  );
}

function PrescriptionDigitalCopyPage({ payload: initialPayload, rxId }: { payload: PrescriptionDigitalCopy | null; rxId?: string | null }) {
  const [payload, setPayload] = useState<PrescriptionDigitalCopy | null>(initialPayload);
  const [loading, setLoading] = useState(!!rxId && !initialPayload);

  useEffect(() => {
    if (!rxId || initialPayload) return;
    let cancelled = false;
    setLoading(true);
    prescriptionsApi.get(rxId)
      .then(rx => {
        if (!cancelled) setPayload(prescriptionSummaryToDigitalCopy(rx));
      })
      .catch(error => {
        console.error(error);
        if (!cancelled) setPayload(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [initialPayload, rxId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 p-6 flex items-center justify-center">
        <div className="w-full max-w-md rounded-2xl border border-blue-100 bg-white p-6 text-center shadow-sm">
          <RefreshCw className="mx-auto mb-3 h-8 w-8 animate-spin text-blue-600" />
          <h1 className="text-lg font-bold text-gray-900">Loading prescription</h1>
          <p className="mt-2 text-sm text-gray-500">Opening digital copy...</p>
        </div>
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="min-h-screen bg-slate-100 p-6 flex items-center justify-center">
        <div className="w-full max-w-md rounded-2xl border border-red-100 bg-white p-6 text-center shadow-sm">
          <AlertCircle className="mx-auto mb-3 h-10 w-10 text-red-500" />
          <h1 className="text-lg font-bold text-gray-900">Prescription link is invalid</h1>
          <p className="mt-2 text-sm text-gray-500">Please scan the QR code from the printed prescription again.</p>
        </div>
      </div>
    );
  }

  const clinical = payload.clinicalData ?? {};
  const investigations = payload.investigations ?? [];
  const medicines = payload.medicines ?? [];

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-8">
      <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-slate-200">
        <div className="border-b-2 border-blue-600 px-6 py-5 sm:px-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600">Digital Prescription Copy</p>
              <h1 className="mt-2 text-xl font-bold text-gray-900">{payload.doctor || "Doctor"}</h1>
              <p className="text-sm text-gray-600">{payload.doctorDetails}</p>
              <p className="mt-1 text-xs text-gray-500">{payload.clinic}</p>
              {payload.phone && <p className="text-xs text-gray-500">Phone: {payload.phone}</p>}
            </div>
            <StatusBadge status={payload.status || "Digital"} />
          </div>
        </div>

        <div className="grid gap-3 bg-blue-50 px-6 py-4 text-sm sm:grid-cols-4 sm:px-8">
          <div><p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Patient</p><p className="font-semibold text-gray-900">{payload.patient || "-"}</p></div>
          <div><p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Patient ID</p><p className="font-semibold text-gray-900">{payload.patientId || "-"}</p></div>
          <div><p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Date</p><p className="font-semibold text-gray-900">{payload.date || "-"}</p></div>
          <div><p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Rx ID</p><p className="font-semibold text-gray-900">{payload.id || "Draft"}</p></div>
        </div>

        <div className="grid gap-0 sm:grid-cols-[0.9fr_1.3fr] sm:divide-x sm:divide-gray-200">
          <div className="space-y-5 px-6 py-6 sm:px-8">
            {["Chief Complaint", "History", "Family History", "On Examination", "Diagnosis", "Treatment Plan", "Referred By"].map(key => {
              const value = key === "Diagnosis" ? (clinical[key] || payload.diagnosis)
                : key === "Family History" ? formatFamilyHistory(clinical[key])
                : clinical[key];
              if (!value) return null;
              return (
                <div key={key}>
                  <p className="mb-1.5 border-b border-gray-100 pb-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">{key}</p>
                  <p className="whitespace-pre-line text-sm leading-relaxed text-gray-700">{value}</p>
                </div>
              );
            })}
          </div>

          <div className="space-y-5 px-6 py-6 sm:px-8">
            <div>
              <div className="mb-3 flex items-center gap-2">
                <span className="text-3xl font-bold text-blue-600">Rx</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Medicines Prescribed</span>
              </div>
              <div className="space-y-3">
                {medicines.map((med, index) => (
                  <div key={`${med.name}-${index}`} className="flex gap-2">
                    <span className="w-5 text-right text-xs font-bold text-blue-600">{index + 1}.</span>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{med.name}</p>
                      {med.generic && <p className="text-xs italic text-gray-400">{med.generic}</p>}
                      <p className="text-sm text-gray-700">{[med.dosage, med.meal, med.duration].filter(Boolean).join(" - ")}</p>
                      {med.instructions && <p className="mt-0.5 text-xs text-gray-500">{med.instructions}</p>}
                    </div>
                  </div>
                ))}
                {medicines.length === 0 && <p className="text-sm text-gray-400">No medicines listed.</p>}
              </div>
            </div>

            {payload.advice && <div className="border-t border-gray-100 pt-4"><p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">Advice</p><p className="whitespace-pre-line text-sm text-gray-700">{payload.advice}</p></div>}
            {investigations.length > 0 && <div className="border-t border-gray-100 pt-4"><p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">Investigations</p><ol className="list-decimal space-y-1 pl-4 text-sm text-gray-700">{investigations.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ol></div>}
            {(payload.followUp?.interval || payload.followUpDate) && <div className="border-t border-gray-100 pt-4"><p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">Follow Up</p><p className="text-sm text-gray-700">{payload.followUp?.interval || payload.followUpDate}{payload.followUp?.note ? ` - ${payload.followUp.note}` : ""}</p></div>}
            {payload.referredTo && <div className="border-t border-gray-100 pt-4"><p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">Referred To</p><p className="text-sm text-gray-700">{payload.referredTo}</p></div>}
            {payload.specialNotes && <div className="border-t border-gray-100 pt-4"><p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">Special Notes</p><p className="whitespace-pre-line text-sm text-gray-700">{payload.specialNotes}</p></div>}
          </div>
        </div>
      </div>
    </div>
  );
}

// MAIN APP
export default function App() {
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    const digitalCopyParam = params.get("rxcopy");
    const digitalPrescriptionId = params.get("rxid");
    if (digitalCopyParam || digitalPrescriptionId) {
      return (
        <PrescriptionDigitalCopyPage
          payload={digitalCopyParam ? decodeDigitalCopy(digitalCopyParam) : null}
          rxId={digitalPrescriptionId}
        />
      );
    }
  }

  // Auth flow
  type AuthState = "login" | "otp" | "forgot" | "app";
  const [authState, setAuthState] = useState<AuthState>("app");
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("oncology-theme") === "dark";
  });

  // Main app state - always declared (rules of hooks)
  const [view, setView] = useState<View>("dashboard");
  const viewHistory = useRef<View[]>([]);
  const [collapsed, setCollapsed] = useState(() => typeof window !== "undefined" ? window.innerWidth < 1440 : false);
  const [showSettings, setShowSettings] = useState(false);
  const [patients, setPatients] = useState(EMPTY_PATIENTS);
  const [appointments, setAppointments] = useState(EMPTY_APPOINTMENTS);
  const [billing, setBilling] = useState(EMPTY_BILLING);
  const [templates, setTemplates] = useState(EMPTY_TEMPLATES);
  const [activeTemplate, setActiveTemplate] = useState<PrescriptionTemplate | null>(EMPTY_TEMPLATES.find(t => t.isDefault) ?? null);
  const [prescriptions, setPrescriptions] = useState(EMPTY_PRESCRIPTIONS);
  const [profile, setProfile] = useState<DoctorProfile>(DEFAULT_PROFILE);
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [editingPatient, setEditingPatient] = useState<typeof EMPTY_PATIENTS[0] | null>(null);
  const [showAddPatientForPrescription, setShowAddPatientForPrescription] = useState(false);
  const [prescriptionPatientId, setPrescriptionPatientId] = useState("");
  const [showAddAppointment, setShowAddAppointment] = useState(false);
  const [newAppointmentDate, setNewAppointmentDate] = useState(formatDateKey(new Date()));
  const [showNewInvoice, setShowNewInvoice] = useState(false);
  const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [appSettings, setAppSettings] = useState<AppSettings>({});
  const [researchDraft, setResearchDraft] = useState<{ title: string; description: string } | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Settings are one JSON record; always merge so no key is lost.
  const saveSettingsPatch = async (patch: Partial<AppSettings>) => {
    const stored = await settingsApi.get().catch(() => appSettings);
    const saved = await settingsApi.save({ ...stored, ...patch });
    setAppSettings(saved);
  };

  const researchThreshold = appSettings.researchThreshold ?? DEFAULT_RESEARCH_THRESHOLD;
  // An alert shows at the threshold; once dismissed it returns only when the
  // group crosses the next multiple of the threshold (e.g. 20, then 40).
  const researchAlerts = useMemo(() => {
    const dismissed = appSettings.dismissedResearchAlerts ?? {};
    return buildDiseaseGroups(patients).filter(group =>
      group.count >= researchThreshold &&
      Math.floor(group.count / researchThreshold) > Math.floor((dismissed[group.key] ?? 0) / researchThreshold)
    );
  }, [patients, appSettings.dismissedResearchAlerts, researchThreshold]);

  const dismissResearchAlerts = (groups: DiseaseGroup[]) => {
    const dismissed = { ...(appSettings.dismissedResearchAlerts ?? {}) };
    groups.forEach(group => { dismissed[group.key] = group.count; });
    saveSettingsPatch({ dismissedResearchAlerts: dismissed }).catch(error => {
      console.error(error);
      showToast("Could not update notifications");
    });
  };

  const openResearchAlert = (group: DiseaseGroup) => {
    setResearchDraft({
      title: `${group.label} cohort study`,
      description: `${group.count} patients with ${group.label} recorded in the clinic database.`,
    });
    dismissResearchAlerts([group]);
    goToView("research");
  };

  const handleSummarySaved = (patientId: string, data: PatientSummaryData) => {
    setPatients(prev => prev.map(patient => patient.id === patientId
      ? { ...patient, diseaseCode: data.icd10, diagnosis: data.diagnosis || patient.diagnosis }
      : patient));
  };

  const goToView = (next: View, preservePrescriptionPatient = false) => {
    if (next === view) return;
    viewHistory.current.push(view);
    if (!preservePrescriptionPatient) setPrescriptionPatientId("");
    setView(next);
  };

  const goBack = () => {
    const previous = viewHistory.current.pop() ?? "dashboard";
    setPrescriptionPatientId("");
    setView(previous);
  };

  useEffect(() => {
    const handleResize = () => setCollapsed(window.innerWidth < 1440);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    window.localStorage.setItem("oncology-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      patientsApi.list(),
      appointmentsApi.list(),
      invoicesApi.list(),
      templatesApi.list(),
      prescriptionsApi.list(),
      profileApi.get(),
    ])
      .then(([loadedPatients, loadedAppointments, loadedInvoices, loadedTemplates, loadedPrescriptions, loadedProfile]) => {
        if (cancelled) return;
        setPatients(loadedPatients);
        setAppointments(loadedAppointments);
        setBilling(loadedInvoices);
        setTemplates(loadedTemplates);
        setActiveTemplate(loadedTemplates.find(t => t.isDefault) ?? null);
        setPrescriptions(loadedPrescriptions);
        setProfile({ ...DEFAULT_PROFILE, ...loadedProfile });
      })
      .catch((error) => {
        console.error(error);
        if (!cancelled) showToast("Could not connect to backend database.");
      });

    settingsApi.get()
      .then(settings => { if (!cancelled) setAppSettings(settings ?? {}); })
      .catch(error => console.error(error));

    return () => {
      cancelled = true;
    };
  }, []);

  // Render auth pages before the main shell
  if (authState === "login") {
    return (
      <LoginPage
        onLogin={(id) => { setLoginIdentifier(id); setAuthState("otp"); }}
        onForgot={() => setAuthState("forgot")}
      />
    );
  }
  if (authState === "forgot") {
    return <ForgotPasswordPage onBack={() => setAuthState("login")} />;
  }
  if (authState === "otp") {
    return (
      <OTPPage
        identifier={loginIdentifier}
        onVerify={() => setAuthState("app")}
        onBack={() => setAuthState("login")}
      />
    );
  }

  const uploadReportFiles = async (patientId: string, files: File[]) => {
    if (!files.length) return;
    const results = await Promise.allSettled(files.map(file => reportFilesApi.upload(patientId, file)));
    const failed = results.filter(result => result.status === "rejected").length;
    showToast(failed
      ? `${files.length - failed} of ${files.length} report files uploaded`
      : `${files.length} report file${files.length > 1 ? "s" : ""} uploaded`);
  };

  const handleSavePatient = async (p: PatientForm, reportFiles: File[] = []) => {
    if (editingPatient) {
      try {
        const updatedPatient = await patientsApi.update(editingPatient.id, p);
        setPatients((prev) => prev.map(patient => patient.id === editingPatient.id ? updatedPatient : patient));
        showToast(`Patient "${p.name}" updated successfully`);
        setEditingPatient(null);
        await uploadReportFiles(updatedPatient.id, reportFiles);
      } catch (error) {
        console.error(error);
        showToast("Could not update patient in database");
      }
      return;
    }

    try {
      const newPatient = await patientsApi.create(p);
      setPatients((prev) => [...prev, newPatient]);
      if (showAddPatientForPrescription) {
        setPrescriptionPatientId(newPatient.id);
        goToView("create-prescription", true);
      }
      setShowAddPatientForPrescription(false);
      showToast(`Patient "${p.name}" registered successfully`);
      await uploadReportFiles(newPatient.id, reportFiles);
    } catch (error) {
      console.error(error);
      showToast("Could not register patient in database");
    }
    return;

    const newId = `PT-${String(patients.length + 1).padStart(3, "0")}`;
    const dob = p.dob ? new Date(p.dob) : null;
    const age = dob ? Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : 0;
    setPatients((prev) => [...prev, {
      id: newId, name: p.name, mobile: p.mobile, age,
      gender: p.gender, bloodGroup: p.bloodGroup || "-",
      lastVisit: new Date().toISOString().split("T")[0], totalVisits: 0,
      previousReports: p.previousReports,
      previousReportFiles: p.previousReportFiles,
    }]);
    if (showAddPatientForPrescription) {
      setPrescriptionPatientId(newId);
      goToView("create-prescription", true);
    }
    setShowAddPatientForPrescription(false);
    showToast(`Patient "${p.name}" registered successfully`);
  };

  const handleDeletePatient = async (id: string) => {
    try {
      await patientsApi.remove(id);
      setPatients(prev => prev.filter(p => p.id !== id));
      showToast("Patient archived successfully");
    } catch (error) {
      console.error(error);
      showToast("Could not archive patient in database");
    }
  };

  const openAddPatient = () => {
    setEditingPatient(null);
    setShowAddPatientForPrescription(false);
    setShowAddPatient(true);
  };

  const openEditPatient = (patient: typeof EMPTY_PATIENTS[0]) => {
    setEditingPatient(patient);
    setShowAddPatientForPrescription(false);
    setShowAddPatient(true);
  };

  const openAddPatientForPrescription = () => {
    setEditingPatient(null);
    setShowAddPatientForPrescription(true);
    setShowAddPatient(true);
  };

  const openPrescriptionForPatient = (patientId: string) => {
    setPrescriptionPatientId(patientId);
    goToView("create-prescription", true);
  };

  const openAddAppointment = (date?: string) => {
    setNewAppointmentDate(date ?? formatDateKey(new Date()));
    setShowAddAppointment(true);
  };

  const useTemplate = async (template: PrescriptionTemplate) => {
    const updatedTemplate = template.id ? await templatesApi.update({ ...template, incrementUsed: true }).catch(() => null) : null;
    const nextTemplate = updatedTemplate ?? { ...template, used: template.used + 1 };
    setActiveTemplate(nextTemplate);
    setTemplates(prev => prev.map(t => t.id === nextTemplate.id || t.name === nextTemplate.name ? nextTemplate : t));
    goToView("create-prescription");
    showToast(`Using "${template.name}" template`);
  };

  const handleSaveAppointment = async (a: any) => {
    try {
      const savedAppointment = await appointmentsApi.create(a);
      setAppointments((prev) => [...prev, savedAppointment]);
      showToast(`Appointment booked for "${savedAppointment.patient}"`);
    } catch (error) {
      console.error(error);
      showToast("Could not book appointment in database");
    }
  };

  const handleSaveInvoice = async (inv: any) => {
    try {
      const savedInvoice = await invoicesApi.create(inv);
      setBilling((prev) => [...prev, savedInvoice]);
      showToast(`Invoice ${savedInvoice.id} created successfully`);
    } catch (error) {
      console.error(error);
      showToast("Could not create invoice in database");
    }
  };

  const handleSaveTemplate = async (t: any) => {
    const nextTemplate: PrescriptionTemplate = {
      name: t.name,
      desc: t.desc || "Custom prescription template.",
      tags: t.specialty ? [t.specialty] : ["Custom"],
      isDefault: t.isDefault,
      used: 0,
      sections: (t.sections?.length ? t.sections : DEFAULT_TEMPLATE_SECTIONS).filter((section: string) => section !== "Calculate"),
    };
    try {
      const savedTemplate = await templatesApi.create(nextTemplate);
      setTemplates((prev) => [
        ...(savedTemplate.isDefault ? prev.map(template => ({ ...template, isDefault: false })) : prev),
        savedTemplate,
      ]);
      if (savedTemplate.isDefault) setActiveTemplate(savedTemplate);
      showToast(`Template "${t.name}" created successfully`);
    } catch (error) {
      console.error(error);
      showToast("Could not create template in database");
    }
  };

  const handleSaveProfile = async (nextProfile: DoctorProfile) => {
    try {
      const savedProfile = await profileApi.save(nextProfile);
      setProfile({ ...DEFAULT_PROFILE, ...savedProfile });
      showToast("Profile saved successfully");
    } catch (error) {
      console.error(error);
      showToast("Could not save profile in database");
    }
  };

  const renderView = () => {
    switch (view) {
      case "dashboard": return <DashboardView nav={goToView} onAddPatient={openAddPatient} profile={profile} appointments={appointments} patients={patients} prescriptions={prescriptions} billing={billing} />;
      case "patients": return <PatientsView nav={goToView} patients={patients} prescriptions={prescriptions} onAddPatient={openAddPatient} onEditPatient={openEditPatient} onPrescribePatient={openPrescriptionForPatient} onDeletePatient={handleDeletePatient} showToast={showToast} />;
      case "patient-summary": return <PatientSummaryView patients={patients} prescriptions={prescriptions} showToast={showToast} onSummarySaved={handleSummarySaved} />;
      case "create-prescription": return <CreatePrescriptionView nav={goToView} patients={patients} initialPatientId={prescriptionPatientId} onCreatePatient={openAddPatientForPrescription} onFinalise={rx => {
        setPrescriptions(prev => [rx, ...prev]);
        // Keep the disease grouping current when no ICD-10 code is set yet.
        if (rx.diagnosis) setPatients(prev => prev.map(p => p.id === rx.patientId ? { ...p, diagnosis: p.diseaseCode ? p.diagnosis : rx.diagnosis } : p));
      }} showToast={showToast} profile={profile} template={activeTemplate} />;
      case "appointments": return (
        <AppointmentsView
          appointments={appointments}
          onAddAppointment={openAddAppointment}
          onUpdateStatus={async (id, status) => {
            try {
              const updatedAppointment = await appointmentsApi.update(id, { status });
              setAppointments(prev => prev.map(apt => apt.id === id ? updatedAppointment : apt));
              showToast(`Appointment status updated to ${status}`);
            } catch (error) {
              console.error(error);
              showToast("Could not update appointment status");
            }
          }}
          showToast={showToast}
        />
      );
      case "prescription-history": return <PrescriptionHistoryView prescriptions={prescriptions} onUpdate={setPrescriptions} showToast={showToast} />;
      case "billing": return <BillingView billing={billing} onNewInvoice={() => setShowNewInvoice(true)} showToast={showToast} />;
      case "reports": return <ReportsView />;
      case "templates": return <TemplatesView nav={goToView} templates={templates} onCreateTemplate={() => setShowCreateTemplate(true)} onUpdateTemplates={setTemplates} showToast={showToast} onUseTemplate={useTemplate} />;
      case "research": return <ResearchView showToast={showToast} draft={researchDraft} />;
      case "guidelines": return <GuidelinesView customGuidelines={appSettings.guidelines ?? []} onSaveGuidelines={guidelines => saveSettingsPatch({ guidelines })} showToast={showToast} />;
      case "tutorial": return <TutorialView nav={goToView} showToast={showToast} />;
      default: return <DashboardView nav={goToView} onAddPatient={openAddPatient} profile={profile} appointments={appointments} patients={patients} prescriptions={prescriptions} billing={billing} />;
    }
  };

  return (
    <div className="premium-shell h-screen flex flex-col overflow-hidden">
      <TopNav
        onMenuClick={() => setCollapsed(!collapsed)}
        current={view}
        darkMode={darkMode}
        onToggleTheme={() => setDarkMode((v) => !v)}
        onSettings={() => setShowSettings(true)}
        onLogout={() => setAuthState("login")}
        profile={profile}
        onProfileSave={handleSaveProfile}
        researchAlerts={researchAlerts}
        researchThreshold={researchThreshold}
        onOpenResearchAlert={openResearchAlert}
        onDismissResearchAlerts={dismissResearchAlerts}
      />
      <div className="flex flex-1 overflow-hidden">
        {!collapsed && (
          <button
            aria-label="Close navigation"
            className="fixed inset-0 z-30 bg-blue-100/55 backdrop-blur-sm lg:hidden"
            onClick={() => setCollapsed(true)}
          />
        )}
        <Sidebar
          current={view}
          onNav={(next) => {
            goToView(next);
            if (window.innerWidth < 1024) setCollapsed(true);
          }}
          collapsed={collapsed}
          onSettings={() => setShowSettings(true)}
          onLogout={() => setAuthState("login")}
        />
        <main className={`min-w-0 flex-1 overflow-y-auto ${view === "create-prescription" ? "overflow-hidden flex flex-col" : ""}`}>
          <div className="sticky top-0 z-20 flex shrink-0 items-center border-b border-slate-200 bg-white/95 px-4 py-2 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/95 sm:px-6">
            <button
              type="button"
              onClick={goBack}
              disabled={viewHistory.current.length === 0 && view === "dashboard"}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              aria-label="Go back to the previous page"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>
          </div>
          <div className={view === "create-prescription" ? "min-h-0 flex-1 overflow-hidden flex flex-col" : ""}>
            {renderView()}
          </div>
        </main>
      </div>

      {/* Modals */}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} showToast={showToast} onSaved={setAppSettings} />}
      {showAddPatient && <AddPatientModal initialPatient={editingPatient} onClose={() => { setShowAddPatient(false); setShowAddPatientForPrescription(false); setEditingPatient(null); }} onSave={handleSavePatient} />}
      {showAddAppointment && <AddAppointmentModal patients={patients} defaultDate={newAppointmentDate} onClose={() => setShowAddAppointment(false)} onSave={handleSaveAppointment} />}
      {showNewInvoice && <NewInvoiceModal patients={patients} onClose={() => setShowNewInvoice(false)} onSave={handleSaveInvoice} />}
      {showCreateTemplate && <CreateTemplateModal onClose={() => setShowCreateTemplate(false)} onSave={handleSaveTemplate} />}
      <FloatingAiAssistant onCreatePrescription={() => goToView("create-prescription")} />

      {/* Toast */}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
