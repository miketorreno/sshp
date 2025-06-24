interface Patient {
  id: string;
  firstName: string;
  middleName: string;
  lastName: string;
  dateOfBirth: Datetime;
  gender: string;
  bloodType: string | null;
  placeOfBirth: string | null;
  occupation: string | null;
  phone: string;
  email: string;
  address: string | null;
  country: string | null;
  patientStatus: string | null;
  guardian: string | null;
  referredBy: string | null;
  referredDate: Datetime | null;
  patientType: string;
  createdAt: Datetime;
  updatedAt: Datetime | null;
  deletedAt: Datetime | null;
}

interface User {
  id: string;
  name: string;
  email: string;
  emailVerified: Datetime | null;
  image: string | null;
  password: string | null;
  role: string;
  createdAt: Datetime;
  updatedAt: Datetime | null;
  deletedAt: Datetime | null;
}
