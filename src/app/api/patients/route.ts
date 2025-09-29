"use server";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import z from "zod";

const PatientSchema = z.object({
  firstName: z.string().min(2),
  middleName: z.string().min(2),
  lastName: z.string().min(2),
  dateOfBirth: z.date(),
  gender: z.string(),
  bloodGroup: z.string().optional(),
  placeOfBirth: z.string().optional(),
  occupation: z.string().optional(),
  phone: z.string().optional(),
  email: z.email(),
  address: z.string().optional(),
  country: z.string().optional(),
  guardian: z.string().optional(),
  maritalStatus: z.string().optional(),
  referredBy: z.string().optional(),
  referredDate: z.date().optional(),
  patientType: z.string().optional(),
});

export const GET = async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("limit") || "10");

    const patients = await prisma.patient.findMany({
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!patients) {
      return NextResponse.json({ msg: "No patients found" });
    }

    return NextResponse.json(patients);
  } catch (error) {
    console.error("Error fetching patients: ", error);
    return NextResponse.json({ error: "Failed to fetch patients" });
  }
};

export const POST = async (request: NextRequest) => {
  try {
    const body = await request.json();
    const data = {
      ...body,
      dateOfBirth: new Date(body.dateOfBirth),
      referredDate: body.referredDate ? new Date(body.referredDate) : null,
    };

    // const parsed = PatientInputSchema.safeParse(data);
    const parsed = PatientSchema.safeParse(data);
    if (!parsed.success) throw new Error(parsed.error.message);

    const patient = await prisma.patient.create({
      data: { ...data },
    });

    if (!patient) {
      return NextResponse.json({ error: "Failed to create patient" });
    }

    return NextResponse.json(patient, { status: 201 });
  } catch (error) {
    console.error("Error creating patient:", error);
    return NextResponse.json({
      error: "Failed to create patient",
      status: 500,
    });
  }
};
