/** Shared school management constants — aligned with web AdminManagement.tsx */

export type SchoolDetailsForm = {
  doorNo: string;
  street: string;
  area: string;
  city: string;
  district: string;
  medium: string;
  classesFrom: string;
  classesTo: string;
  totalStrength: string;
  schoolType: string;
};

export type SchoolAdmin = {
  id: string;
  _id?: string;
  schoolId?: string;
  name: string;
  email: string;
  board?: string;
  curriculumBoard?: string;
  isAsliPrepExclusive?: boolean;
  state?: string;
  place?: string;
  schoolName?: string;
  schoolLogo?: string;
  phone?: string;
  pin?: string;
  contactPerson?: string;
  secondaryContactPerson?: string;
  secondaryContactPhone?: string;
  schoolDetails?: SchoolDetailsForm;
  permissions: string[];
  teacherPermissions: string[];
  studentPermissions: string[];
  vidyaEnabledForTeachers?: boolean;
  vidyaEnabledForStudents?: boolean;
  studentBillingEnabled?: boolean;
  studentPaymentMode?: 'online' | 'offline' | 'both';
  studentAnnualPriceInr?: number;
  studentTrialDays?: number;
  status: string;
  joinDate: string;
  stats?: {
    students?: number;
    teachers?: number;
  };
};

export const CURRICULUM_BOARD_OPTIONS = [
  { value: 'CBSE', label: 'CBSE' },
  { value: 'SSC', label: 'SSC / State Board' },
  { value: 'STATE', label: 'State Board' },
  { value: 'ICSE', label: 'ICSE' },
  { value: 'IB', label: 'IB' },
  { value: 'CAMBRIDGE', label: 'Cambridge' },
] as const;

export const STATE_OPTIONS = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
  'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
  'Uttarakhand', 'West Bengal', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Puducherry',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Lakshadweep',
];

export const SCHOOL_PORTAL_MODULE_GROUPS: {
  category: string;
  modules: { id: string; title: string }[];
}[] = [
  {
    category: 'Core',
    modules: [
      { id: 'User Management', title: 'User management' },
      { id: 'Content Management', title: 'Content management' },
      { id: 'Analytics', title: 'Analytics' },
    ],
  },
  {
    category: 'Teaching & learning',
    modules: [
      { id: 'Exam Management', title: 'Exam management' },
      { id: 'Learning Paths', title: 'Learning paths' },
      { id: 'School Calendar', title: 'School calendar' },
      { id: 'Vidya AI', title: 'Vidya AI' },
      { id: 'Edu OTT', title: 'Edu OTT & video' },
    ],
  },
  {
    category: 'Account & billing',
    modules: [
      { id: 'Subscriptions', title: 'Subscriptions' },
      { id: 'Settings', title: 'Settings' },
    ],
  },
];

export const SCHOOL_PORTAL_FEATURE_IDS = SCHOOL_PORTAL_MODULE_GROUPS.flatMap((g) =>
  g.modules.map((m) => m.id)
);

export const TEACHER_PORTAL_MODULE_GROUPS: {
  category: string;
  modules: { id: string; title: string }[];
}[] = [
  {
    category: 'Teaching',
    modules: [
      { id: 'Dashboard', title: 'Dashboard' },
      { id: 'My Classes', title: 'My classes' },
      { id: 'My Students', title: 'My students' },
      { id: 'Learning Paths', title: 'Learning paths' },
      { id: 'Edu OTT', title: 'Edu OTT & video' },
      { id: 'Vidya AI', title: 'Vidya AI' },
      { id: 'Calendar', title: 'Calendar' },
      { id: 'Offline Results', title: 'Offline results' },
      { id: 'Settings', title: 'Settings' },
      { id: 'Reports', title: 'Reports' },
    ],
  },
];

export const STUDENT_PORTAL_MODULE_GROUPS: {
  category: string;
  modules: { id: string; title: string }[];
}[] = [
  {
    category: 'Learning',
    modules: [
      { id: 'Dashboard', title: 'Dashboard' },
      { id: 'Learning Paths', title: 'Learning paths' },
      { id: 'Edu OTT', title: 'Edu OTT' },
      { id: 'Exams', title: 'Exams' },
      { id: 'Quiz', title: 'Quiz' },
      { id: 'Offline Results', title: 'Offline results' },
      { id: 'Timetable', title: 'Timetable' },
      { id: 'Vidya AI', title: 'Vidya AI' },
      { id: 'Profile', title: 'Profile' },
    ],
  },
];

export const TEACHER_PORTAL_FEATURE_IDS = TEACHER_PORTAL_MODULE_GROUPS.flatMap((g) =>
  g.modules.map((m) => m.id)
);

export const STUDENT_PORTAL_FEATURE_IDS = STUDENT_PORTAL_MODULE_GROUPS.flatMap((g) =>
  g.modules.map((m) => m.id)
);

export function emptySchoolDetails(): SchoolDetailsForm {
  return {
    doorNo: '',
    street: '',
    area: '',
    city: '',
    district: '',
    medium: '',
    classesFrom: '6',
    classesTo: '10',
    totalStrength: '',
    schoolType: '',
  };
}

export function sanitizePhoneInput(value: string) {
  return value.replace(/\D/g, '').slice(0, 10);
}

export function isValidOptionalPhone(phone: string) {
  const digits = sanitizePhoneInput(phone);
  return digits.length === 0 || digits.length === 10;
}

export function sanitizePincodeInput(value: string) {
  return String(value || '').replace(/\D/g, '').slice(0, 6);
}

/** Empty OR exactly 6 digits; rejects longer values without truncating-to-valid. */
export function isValidOptionalIndianPincode(raw: string) {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return true;
  if (!/^\d+$/.test(trimmed)) return false;
  if (trimmed.length !== 6) return false;
  return /^[1-9]\d{5}$/.test(trimmed);
}

export function isValidSchoolPlaceName(raw: string, min = 2, max = 120) {
  const s = String(raw || '').trim();
  if (s.length < min || s.length > max) return false;
  if (!/[A-Za-z\u0900-\u097F]/.test(s)) return false;
  return /^[A-Za-z0-9\u0900-\u097F\s.'&\-()/]+$/.test(s);
}

export function isValidOptionalAddressLine(raw: string, max = 120) {
  const s = String(raw || '').trim();
  if (!s) return true;
  if (s.length > max) return false;
  if (!/[A-Za-z0-9\u0900-\u097F]/.test(s)) return false;
  return /^[A-Za-z0-9\u0900-\u097F\s.'&\-()/#]+$/.test(s);
}

export function schoolAddressFieldError(fields: {
  schoolName?: string;
  city?: string;
  district?: string;
  pin?: string;
  doorNo?: string;
  street?: string;
  area?: string;
}): string | null {
  if (!isValidSchoolPlaceName(fields.schoolName || '', 2, 200)) {
    return 'School name must include letters (symbols-only names are not allowed).';
  }
  if (!isValidSchoolPlaceName(fields.city || '', 2, 100)) {
    return 'City must include letters.';
  }
  if (!isValidSchoolPlaceName(fields.district || '', 2, 100)) {
    return 'District must include letters.';
  }
  if (
    !isValidOptionalAddressLine(fields.doorNo || '') ||
    !isValidOptionalAddressLine(fields.street || '') ||
    !isValidOptionalAddressLine(fields.area || '')
  ) {
    return 'Door No, Street, and Area may only use letters, numbers, and common punctuation.';
  }
  if (!isValidOptionalIndianPincode(fields.pin || '')) {
    return 'Pincode must be exactly 6 digits (e.g. 500001), or left empty.';
  }
  return null;
}

export function isUnlimitedPortalAccess(perms: string[] | undefined): boolean {
  return isUnlimitedPortalAccessFor(perms, SCHOOL_PORTAL_FEATURE_IDS);
}

export function isUnlimitedTeacherPortalAccess(perms: string[] | undefined): boolean {
  return isUnlimitedPortalAccessFor(perms, TEACHER_PORTAL_FEATURE_IDS);
}

export function isUnlimitedStudentPortalAccess(perms: string[] | undefined): boolean {
  return isUnlimitedPortalAccessFor(perms, STUDENT_PORTAL_FEATURE_IDS);
}

function isUnlimitedPortalAccessFor(perms: string[] | undefined, allIds: readonly string[]): boolean {
  if (!perms || perms.length === 0) return true;
  const set = new Set(perms);
  return allIds.every((f) => set.has(f));
}

export function resolvePortalPermissions(mode: 'unlimited' | 'limited', selected: string[]): string[] {
  return resolvePortalPermissionsFor(mode, selected, SCHOOL_PORTAL_FEATURE_IDS);
}

export function resolveTeacherPortalPermissions(mode: 'unlimited' | 'limited', selected: string[]): string[] {
  return resolvePortalPermissionsFor(mode, selected, TEACHER_PORTAL_FEATURE_IDS);
}

export function resolveStudentPortalPermissions(mode: 'unlimited' | 'limited', selected: string[]): string[] {
  return resolvePortalPermissionsFor(mode, selected, STUDENT_PORTAL_FEATURE_IDS);
}

function resolvePortalPermissionsFor(
  mode: 'unlimited' | 'limited',
  selected: string[],
  allIds: readonly string[]
): string[] {
  if (mode === 'unlimited') return [...allIds];
  return allIds.filter((f) => selected.includes(f));
}

export function curriculumDisplayLabel(code?: string): string {
  const u = (code || '').toUpperCase();
  const labels: Record<string, string> = {
    CBSE: 'CBSE',
    STATE: 'State Board',
    SSC: 'SSC',
    ICSE: 'ICSE',
    IB: 'IB',
    CAMBRIDGE: 'Cambridge',
  };
  return labels[u] || code || '';
}

function isCurriculumBoardCode(b?: string): boolean {
  const u = String(b || '').toUpperCase().trim();
  return CURRICULUM_BOARD_OPTIONS.some((o) => o.value === u);
}

export function normalizeCurriculumBoard(b?: string): string {
  if (String(b || '').toUpperCase() === 'ASLI_EXCLUSIVE_SCHOOLS' || !isCurriculumBoardCode(b)) {
    return 'CBSE';
  }
  return String(b).toUpperCase().trim();
}

export function mapAdminFromApi(admin: any): SchoolAdmin {
  const sd = admin?.schoolDetails || {};
  return {
    ...admin,
    id: admin.id || admin._id,
    permissions: Array.isArray(admin.permissions) ? admin.permissions : [],
    teacherPermissions: Array.isArray(admin.teacherPermissions) ? admin.teacherPermissions : [],
    studentPermissions: Array.isArray(admin.studentPermissions) ? admin.studentPermissions : [],
    vidyaEnabledForTeachers: admin.vidyaEnabledForTeachers !== false,
    vidyaEnabledForStudents: admin.vidyaEnabledForStudents !== false,
    state: admin?.state || sd?.state || admin?.place || '',
    schoolDetails: {
      ...emptySchoolDetails(),
      doorNo: sd.doorNo || '',
      street: sd.street || '',
      area: sd.area || '',
      city: sd.city || '',
      district: sd.district || '',
      medium: sd.medium || '',
      classesFrom: sd.classesFrom || '6',
      classesTo: sd.classesTo || '10',
      totalStrength: sd.totalStrength || '',
      schoolType: sd.schoolType || '',
    },
  };
}

export type SchoolFormState = {
  name: string;
  email: string;
  password: string;
  board: string;
  isAsliPrepExclusive: boolean;
  state: string;
  schoolName: string;
  schoolLogo: string;
  phone: string;
  pin: string;
  contactPerson: string;
  secondaryContactPerson: string;
  secondaryContactPhone: string;
  schoolDetails: SchoolDetailsForm;
  accessMode: 'unlimited' | 'limited';
  limitedFeatures: string[];
  vidyaEnabledForTeachers: boolean;
  vidyaEnabledForStudents: boolean;
  isActive: boolean;
  studentBillingEnabled: boolean;
  studentPaymentMode: 'online' | 'offline' | 'both';
  studentAnnualPriceInr: string;
  studentTrialDays: string;
};

export function emptySchoolForm(): SchoolFormState {
  return {
    name: '',
    email: '',
    password: '',
    board: 'CBSE',
    isAsliPrepExclusive: false,
    state: '',
    schoolName: '',
    schoolLogo: '',
    phone: '',
    pin: '',
    contactPerson: '',
    secondaryContactPerson: '',
    secondaryContactPhone: '',
    schoolDetails: emptySchoolDetails(),
    accessMode: 'unlimited',
    limitedFeatures: [...SCHOOL_PORTAL_FEATURE_IDS],
    vidyaEnabledForTeachers: true,
    vidyaEnabledForStudents: true,
    isActive: true,
    studentBillingEnabled: false,
    studentPaymentMode: 'offline',
    studentAnnualPriceInr: '0',
    studentTrialDays: '15',
  };
}

export function schoolFormFromAdmin(admin: SchoolAdmin): SchoolFormState {
  const sd = admin.schoolDetails || emptySchoolDetails();
  const perms = admin.permissions || [];
  const unlimited = isUnlimitedPortalAccess(perms);
  const rawCurriculum =
    admin.curriculumBoard ||
    (isCurriculumBoardCode(admin.board) ? String(admin.board).toUpperCase().trim() : '');
  const exclusive =
    admin.isAsliPrepExclusive === true ||
    String(admin.board || '').toUpperCase() === 'ASLI_EXCLUSIVE_SCHOOLS';

  return {
    name: admin.name || '',
    email: admin.email || '',
    password: '',
    board: normalizeCurriculumBoard(rawCurriculum),
    isAsliPrepExclusive: exclusive,
    state: admin.state || '',
    schoolName: admin.schoolName || '',
    schoolLogo: admin.schoolLogo || '',
    phone: sanitizePhoneInput(admin.phone || ''),
    pin: admin.pin || '',
    contactPerson: admin.contactPerson || '',
    secondaryContactPerson: admin.secondaryContactPerson || '',
    secondaryContactPhone: sanitizePhoneInput(admin.secondaryContactPhone || ''),
    schoolDetails: { ...emptySchoolDetails(), ...sd },
    accessMode: unlimited ? 'unlimited' : 'limited',
    limitedFeatures: unlimited
      ? [...SCHOOL_PORTAL_FEATURE_IDS]
      : SCHOOL_PORTAL_FEATURE_IDS.filter((f) => perms.includes(f)),
    vidyaEnabledForTeachers: admin.vidyaEnabledForTeachers !== false,
    vidyaEnabledForStudents: admin.vidyaEnabledForStudents !== false,
    isActive: admin.status === 'active' || admin.status === 'Active',
    studentBillingEnabled: Boolean(admin.studentBillingEnabled),
    studentPaymentMode: admin.studentPaymentMode || 'offline',
    studentAnnualPriceInr: String(admin.studentAnnualPriceInr || 0),
    studentTrialDays: String(admin.studentTrialDays || 15),
  };
}

export function buildCreatePayload(form: SchoolFormState) {
  return {
    name: form.name,
    email: form.email,
    password: form.password,
    board: form.board,
    isAsliPrepExclusive: form.isAsliPrepExclusive,
    state: form.state,
    schoolName: form.schoolName,
    schoolLogo: form.schoolLogo,
    contactPerson: form.contactPerson.trim(),
    phone: sanitizePhoneInput(form.phone),
    secondaryContactPerson: form.secondaryContactPerson.trim(),
    secondaryContactPhone: sanitizePhoneInput(form.secondaryContactPhone),
    pin: sanitizePincodeInput(form.pin),
    permissions: resolvePortalPermissions(form.accessMode, form.limitedFeatures),
    vidyaEnabledForTeachers: form.vidyaEnabledForTeachers,
    vidyaEnabledForStudents: form.vidyaEnabledForStudents,
    studentBillingEnabled: form.studentBillingEnabled,
    studentPaymentMode: form.studentPaymentMode,
    studentAnnualPriceInr: Math.max(0, Number(form.studentAnnualPriceInr) || 0),
    studentTrialDays: Math.min(365, Math.max(1, Number(form.studentTrialDays) || 15)),
    schoolDetails: { ...form.schoolDetails, state: form.state },
  };
}

export function buildUpdatePayload(form: SchoolFormState) {
  return {
    name: form.name,
    email: form.email,
    board: form.board,
    isAsliPrepExclusive: form.isAsliPrepExclusive,
    state: form.state,
    schoolName: form.schoolName,
    schoolLogo: form.schoolLogo,
    contactPerson: form.contactPerson.trim(),
    phone: sanitizePhoneInput(form.phone),
    secondaryContactPerson: form.secondaryContactPerson.trim(),
    secondaryContactPhone: sanitizePhoneInput(form.secondaryContactPhone),
    pin: sanitizePincodeInput(form.pin),
    isActive: form.isActive,
    permissions: resolvePortalPermissions(form.accessMode, form.limitedFeatures),
    vidyaEnabledForTeachers: form.vidyaEnabledForTeachers,
    vidyaEnabledForStudents: form.vidyaEnabledForStudents,
    studentBillingEnabled: form.studentBillingEnabled,
    studentPaymentMode: form.studentPaymentMode,
    studentAnnualPriceInr: Math.max(0, Number(form.studentAnnualPriceInr) || 0),
    studentTrialDays: Math.min(365, Math.max(1, Number(form.studentTrialDays) || 15)),
    schoolDetails: { ...form.schoolDetails, state: form.state },
  };
}
