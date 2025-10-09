"use client";
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
import { use, useEffect, useState } from "react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { formatFetchedDate } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { updatePatient } from "@/app/actions/patient-actions";

async function fetchPatient(id: string) {
  const response = await fetch(`/api/patients/${id}`).then((res) => res.json());
  return response;
}

type PatientFormData = {
  id?: string;
  firstName: string;
  middleName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  bloodGroup: string;
  placeOfBirth?: string;
  occupation?: string;
  phone?: string;
  email?: string;
  address?: string;
  country?: string;
  guardian?: string;
  referredBy?: string;
  referredDate?: string;
};

const EditPatientPage = ({ params }: { params: Promise<{ id: string }> }) => {
  const router = useRouter();
  const { id } = use(params);
  const [formData, setFormData] = useState<PatientFormData | null>(null);

  const { isPending, error, data } = useQuery({
    queryKey: ["patient", id],
    queryFn: () => fetchPatient(id),
  });

  useEffect(() => {
    if (data) {
      setFormData(data);
    }
  }, [data]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev: PatientFormData | null) => ({
      ...prev!,
      [name]: value,
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev: PatientFormData | null) => ({
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

  if (error) {
    toast.error("Failed to load patient");

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
          <form action={updatePatient} className="space-y-12">
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
                  value={formatFetchedDate(formData.dateOfBirth)}
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
                  value={formData.bloodGroup}
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
                  value={formData.email}
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
                  value={formatFetchedDate(formData.referredDate ?? "")}
                  onChange={handleChange}
                />
              </div>
            </div>

            <Button type="submit" className="mt-4 mr-2">
              Update Patient
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
