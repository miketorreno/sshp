"use client";
import { useClinicTimeZone } from "@/components/clinic-time-zone-provider";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter } from "next/navigation";
import { use, useActionState, useEffect, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { toDateInputValue } from "@/lib/clinic-time";
import { updatePatient } from "@/app/actions/patient-actions";
import { usePatientDetail } from "@/client/patients/queries";
import type { PatientDetailDto } from "@/server/patients/dto";


type PatientActionState = Awaited<ReturnType<typeof updatePatient>> | null;

const EditPatientPage = ({ params }: { params: Promise<{ id: string }> }) => {
  // The clinic's zone, read from the server-rendered tree: a client component
  // cannot read `process.env`, so it is handed down. See ADR 0004.
  const zone = useClinicTimeZone();

  const router = useRouter();
  const { id } = use(params);
  const [formData, setFormData] = useState<PatientDetailDto | null>(null);

  const { isPending, isError, data } = usePatientDetail(id);
  const [result, submit, isSubmitting] = useActionState(
    async (
      _previous: PatientActionState,
      formData: FormData
    ) => updatePatient(formData),
    null
  );

  useEffect(() => {
    if (data) {
      setFormData(data);
    }
  }, [data]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev!,
      [name]: value,
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev!,
      [name]: value,
    }));
  };

  if (isPending || !formData) {
    return (
      <div className="flex justify-center items-center h-40">
        <p>Loading patient...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex justify-center items-center h-40">
        <p className="text-red-600">Error loading patient</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold my-2">Edit Patient</h1>
      </div>

      <Card className="mb-8">
        <CardContent>
          <form action={submit} className="space-y-12">
            <input type="hidden" name="id" value={id} />
            <div className="grid md:grid-cols-3 gap-8">
              <div className="grid gap-3">
                <Label htmlFor="firstName">
                  First Name<span className="text-red-500">*</span>
                </Label>
                <Input
                  id="firstName"
                  name="firstName"
                  required
                  value={formData.firstName}
                  onChange={handleChange}
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="middleName">
                  Middle Name<span className="text-red-500">*</span>
                </Label>
                <Input
                  id="middleName"
                  name="middleName"
                  required
                  value={formData.middleName}
                  onChange={handleChange}
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="lastName">
                  Last Name<span className="text-red-500">*</span>
                </Label>
                <Input
                  id="lastName"
                  name="lastName"
                  required
                  value={formData.lastName}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="grid gap-3">
                <Label htmlFor="dateOfBirth">
                  Date of Birth<span className="text-red-500">*</span>
                </Label>
                <Input
                  id="dateOfBirth"
                  name="dateOfBirth"
                  type="date"
                  required
                  value={toDateInputValue(formData.dateOfBirth, zone)}
                  onChange={handleChange}
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="gender">
                  Gender<span className="text-red-500">*</span>
                </Label>
                <Select
                  name="gender"
                  required
                  value={formData.gender}
                  onValueChange={(value) => handleSelectChange("gender", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-3">
                <Label htmlFor="bloodGroup">Blood Type</Label>
                <Select
                  name="bloodGroup"
                  required
                  value={formData.bloodGroup ?? ""}
                  onValueChange={(value) =>
                    handleSelectChange("bloodGroup", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A+">A+</SelectItem>
                    <SelectItem value="A-">A-</SelectItem>
                    <SelectItem value="B+">B+</SelectItem>
                    <SelectItem value="B-">B-</SelectItem>
                    <SelectItem value="AB+">AB+</SelectItem>
                    <SelectItem value="AB-">AB-</SelectItem>
                    <SelectItem value="O+">O+</SelectItem>
                    <SelectItem value="O-">O-</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-10">
              <div className="grid gap-3">
                <Label htmlFor="placeOfBirth">Place of Birth</Label>
                <Textarea
                  id="placeOfBirth"
                  name="placeOfBirth"
                  value={formData.placeOfBirth ?? ""}
                  onChange={handleChange}
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="occupation">Occupation</Label>
                <Textarea
                  id="occupation"
                  name="occupation"
                  value={formData.occupation ?? ""}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-10">
              <div className="grid gap-3">
                <Label htmlFor="phone">
                  Phone<span className="text-red-500">*</span>
                </Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone ?? ""}
                  onChange={handleChange}
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="email">
                  Email<span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email ?? ""}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-10">
              <div className="grid gap-3">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  name="address"
                  value={formData.address ?? ""}
                  onChange={handleChange}
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="country">Country</Label>
                <Textarea
                  id="country"
                  name="country"
                  value={formData.country ?? ""}
                  onChange={handleChange}
                />
              </div>
            </div>

            <hr />

            <div className="grid md:grid-cols-2 gap-10">
              <div className="grid gap-3">
                <Label htmlFor="guardian">Guardian</Label>
                <Input
                  id="guardian"
                  name="guardian"
                  type="text"
                  value={formData.guardian ?? ""}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-10">
              <div className="grid gap-3">
                <Label htmlFor="referredBy">Referred By</Label>
                <Input
                  id="referredBy"
                  name="referredBy"
                  type="text"
                  value={formData.referredBy ?? ""}
                  onChange={handleChange}
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="referredDate">Referred Date</Label>
                <Input
                  id="referredDate"
                  name="referredDate"
                  type="date"
                  value={toDateInputValue(formData.referredDate, zone)}
                  onChange={handleChange}
                />
              </div>
            </div>

            {result && !result.ok && (
              <p className="text-red-600">{result.error.message}</p>
            )}

            <Button type="submit" className="mt-4 mr-2" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Update Patient"}
            </Button>
            <Button type="button" onClick={() => router.back()}>
              Back
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default EditPatientPage;
