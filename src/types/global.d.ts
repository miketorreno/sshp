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
  patientStatus: string | null;
  patientType: string;
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
  patient: {
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
    patientStatus: string | null;
    patientType: string | null;
    createdAt: Datetime;
    updatedAt: Datetime;
    deletedAt: Datetime | null;
  };
  provider: {
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
  };
}
