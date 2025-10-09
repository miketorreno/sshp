"use server";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import z from "zod";

const PatientSchema = z.object({
  firstName: z.string().min(2),
  middleName: z.string().min(2),
  lastName: z.string().min(2),
  dateOfBirth: z.string().min(1),
  gender: z.enum(["Male", "Female", "Other"]),
  bloodGroup: z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]),
  placeOfBirth: z.string().optional(),
  occupation: z.string().optional(),
  phone: z.string().optional(),
  email: z.email(),
  address: z.string().optional(),
  country: z.string().optional(),
  guardian: z.string().optional(),
  referredBy: z.string().optional(),
  referredDate: z.string().optional(),
});

export type SearchPatientResponse = {
  patients?: Patient[];
  error?: string;
};

export async function createPatient(formData: FormData): Promise<void> {
  const raw = {
    firstName: formData.get("firstName") as string,
    middleName: formData.get("middleName") as string,
    lastName: formData.get("lastName") as string,
    dateOfBirth: formData.get("dateOfBirth") as string,
    gender: formData.get("gender") as string,
    bloodGroup: formData.get("bloodGroup") as string,
    placeOfBirth: formData.get("placeOfBirth") as string,
    occupation: formData.get("occupation") as string,
    phone: formData.get("phone") as string,
    email: formData.get("email") as string,
    address: formData.get("address") as string,
    country: formData.get("country") as string,
    guardian: formData.get("guardian") as string,
    referredBy: formData.get("referredBy") as string,
    referredDate: formData.get("referredDate") as string,
  };

  const patient = PatientSchema.safeParse(raw);

  if (!patient.success) {
    throw new Error(patient.error.message);
  }

  const newPatient = await prisma.patient.create({
    data: {
      ...patient.data,
      dateOfBirth: new Date(patient.data.dateOfBirth),
      referredDate: patient.data.referredDate
        ? new Date(patient.data.referredDate)
        : undefined,
    },
  });

  revalidatePath("/patients/all");
  redirect(`/patients/${newPatient.id}`);
}

export async function updatePatient(formData: FormData): Promise<void> {
  const patientId = formData.get("id") as string;
  const raw = {
    firstName: formData.get("firstName") as string,
    middleName: formData.get("middleName") as string,
    lastName: formData.get("lastName") as string,
    dateOfBirth: formData.get("dateOfBirth") as string,
    gender: formData.get("gender") as string,
    bloodGroup: formData.get("bloodGroup") as string,
    placeOfBirth: formData.get("placeOfBirth") as string,
    occupation: formData.get("occupation") as string,
    phone: formData.get("phone") as string,
    email: formData.get("email") as string,
    address: formData.get("address") as string,
    country: formData.get("country") as string,
    guardian: formData.get("guardian") as string,
    referredBy: formData.get("referredBy") as string,
    referredDate: formData.get("referredDate") as string,
  };

  const patient = PatientSchema.safeParse(raw);

  if (!patient.success) {
    throw new Error(patient.error.message);
  }

  const updatedPatient = await prisma.patient.update({
    where: { id: patientId },
    data: {
      ...patient.data,
      dateOfBirth: new Date(patient.data.dateOfBirth),
      referredDate: patient.data.referredDate
        ? new Date(patient.data.referredDate)
        : undefined,
    },
  });

  revalidatePath("/patients/all");
  redirect(`/patients/${updatedPatient.id}`);
}

export async function getPatient(patientId: string) {
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
  });

  if (!patient) {
    return { error: "Patient not found" };
  }

  return patient;
}

export async function deletePatient(patientId: string) {
  const existingPatient = await prisma.patient.findUnique({
    where: { id: patientId },
  });

  if (!existingPatient) {
    return { error: "Patient not found" };
  }

  await prisma.patient.delete({
    where: { id: patientId },
  });

  revalidatePath("/patients/all");
  redirect("/patients/all");
}

/**
 * @param query The search string provided by the patient.
 * @returns A promise that resolves to a SearchPatientResponse object.
 */
export async function searchPatients(
  query: string
): Promise<SearchPatientResponse> {
  if (!query) {
    return { patients: [] };
  }

  try {
    const patients = await prisma.patient.findMany({
      where: {
        email: {
          contains: query,
          mode: "insensitive",
        },
      },
      take: 10,
    });

    return { patients };
  } catch (err) {
    console.error("Database search failed:", err);
    return { error: "Failed to search for patients. Please try again." };
  }
}
