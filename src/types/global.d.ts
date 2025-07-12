interface User {
  id: string;
  email: string;
  password: string | null;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  avatar: string | null;
  createdAt: Datetime;
  updatedAt: Datetime;
  deletedAt: Datetime | null;
}
interface Patient {
  id: string;
  patientCode: string;
  firstName: string;
  middleName: string;
  lastName: string;
  dateOfBirth: Datetime;
  gender: string;
  bloodGroup: string | null;
  placeOfBirth: string | null;
  occupation: string | null;
  phone: string | null;
  email: string;
  address: string | null;
  country: string | null;
  guardian: string | null;
  referredBy: string | null;
  referredDate: Datetime | null;
  patientType: string | null;
  createdAt: Datetime;
  updatedAt: Datetime;
  deletedAt: Datetime | null;
}

interface Visit {
  id: string;
  patientId: string;
  providerId: string | null;
  visitType: string;
  reason: string | null;
  startDateTime: Datetime;
  endDateTime: Datetime | null;
  createdAt: Datetime;
  updatedAt: Datetime;
  deletedAt: Datetime | null;
}

interface PatientVisit {
  id: string;
  patientId: string;
  providerId: string | null;
  visitType: string;
  reason: string | null;
  startDateTime: Datetime;
  endDateTime: Datetime | null;
  createdAt: Datetime;
  updatedAt: Datetime;
  deletedAt: Datetime | null;
  patient: Patient;
  provider: User;
  imagingOrders: ImagingOrder[];
  labOrders: LabOrder[];
  medOrders: MedicationOrder[];
  vitals: Vitals[];
  clinicalNotes: ClinicalNote[];
  diagnoses: Diagnosis[];
  procedures: Procedure[];
}

interface Appointment {
  id: string;
  patientId: string;
  providerId: string | null;
  appointmentId: string | null;
  startDateTime: Datetime;
  endDateTime: Datetime;
  appointmentType: string;
  appointmentStatus: string;
  reason: string | null;
  createdAt: Datetime;
  updatedAt: Datetime;
  deletedAt: Datetime | null;
}

interface PatientAppointment {
  id: string;
  patientId: string;
  providerId: string | null;
  appointmentId: string | null;
  startDateTime: Datetime;
  endDateTime: Datetime;
  appointmentType: string;
  appointmentStatus: string;
  reason: string | null;
  createdAt: Datetime;
  updatedAt: Datetime;
  deletedAt: Datetime | null;
  patient: Patient;
  provider: User;
}

interface ImagingOrder {
  id: string;
  visitId: string;
  orderedById: string | null;
  orderedAt: Datetime;
  completedAt: Datetime | null;
  orderStatus: string;
  imagingType: string;
  notes: string | null;
  result: string | null;
  createdAt: Datetime;
  updatedAt: Datetime;
  deletedAt: Datetime | null;
}

interface LabOrder {
  id: string;
  visitId: string;
  orderedById: string | null;
  orderedAt: Datetime;
  completedAt: Datetime | null;
  orderStatus: string;
  labType: string;
  notes: string | null;
  result: string | null;
  createdAt: Datetime;
  updatedAt: Datetime;
  deletedAt: Datetime | null;
}

interface MedicationOrder {
  id: string;
  visitId: string;
  orderedById: string | null;
  medicationId: string | null;
  orderedAt: Datetime;
  completedAt: Datetime | null;
  orderStatus: string;
  dosage: string;
  frequency: string;
  route: string;
  notes: string | null;
  createdAt: Datetime;
  updatedAt: Datetime;
  deletedAt: Datetime | null;
}

interface Vitals {
  id: string;
  visitId: string;
  recordedById: string | null;
  recordedAt: Datetime;
  height: int | null;
  weight: int | null;
  systolicBP: int | null;
  diastolicBP: int | null;
  heartRate: int | null;
  temperatureCelsius: float | null;
  respiratoryRate: int | null;
  oxygenSaturation: float | null;
  glucose: int | null;
  cholesterol: int | null;
  createdAt: Datetime;
  updatedAt: Datetime;
  deletedAt: Datetime | null;
}
