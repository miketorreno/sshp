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
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { formatFetchedDate } from "@/lib/utils";

const EditPatientPage = ({ params }: { params: Promise<{ id: string }> }) => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState<Patient>();
  const [formData, setFormData] = useState<Patient>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dateOfBirthValue, setDateOfBirthValue] = useState("");
  const [referredDateValue, setReferredDateValue] = useState("");

  const fetchPatient = async () => {
    const { id } = await params;

    try {
      const response = await fetch(`/api/patients/${id}`);

      if (response.status === 404) {
        throw new Error("Patient not found");
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch patient");
      }

      const data = await response.json();
      setPatient(data);
      setFormData(data);
    } catch (err) {
      console.error("Error: ", err);
      toast.error("Failed to load patient");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatient();
  }, []);

  useEffect(() => {
    if (patient) {
      setDateOfBirthValue(formatFetchedDate(patient.dateOfBirth));
      setReferredDateValue(
        patient.referredDate ? formatFetchedDate(patient.referredDate) : ""
      );
    }
  }, [patient]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { id, value } = e.target;

    if (id === "dateOfBirth") {
      setDateOfBirthValue(value);
    } else if (id === "referredDate") {
      setReferredDateValue(value);
    }

    setFormData((prev) => ({ ...prev, [id]: value } as Patient));
  };

  const handleSelectChange = (id: string, value: string) => {
    setFormData((prev) => ({ ...prev, [id]: value } as Patient));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/patients/${patient?.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to update patient");
      }

      toast.success("Patient updated");
      router.push(`/patients/${data.id}`);
    } catch (err) {
      console.error("Error: ", err);
      toast.error("Failed to update patient");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold my-2">Edit Patient</h1>
      </div>

      <Card className="mb-8">
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <p>Loading patient...</p>
            </div>
          ) : (
            <form className="space-y-12" onSubmit={handleSubmit}>
              <div className="grid md:grid-cols-3 gap-8">
                <div className="grid gap-3">
                  <Label htmlFor="firstName">
                    First Name<span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="firstName"
                    placeholder=""
                    required
                    value={formData?.firstName}
                    onChange={handleChange}
                  />
                </div>

                <div className="grid gap-3">
                  <Label htmlFor="middleName">
                    Middle Name<span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="middleName"
                    placeholder=""
                    required
                    value={formData?.middleName}
                    onChange={handleChange}
                  />
                </div>

                <div className="grid gap-3">
                  <Label htmlFor="lastName">
                    Last Name<span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="lastName"
                    placeholder=""
                    required
                    value={formData?.lastName}
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
                    type="date"
                    required
                    value={dateOfBirthValue}
                    onChange={handleChange}
                  />
                </div>

                <div className="grid gap-3">
                  <Label htmlFor="gender">
                    Gender<span className="text-red-500">*</span>
                  </Label>
                  <Select
                    required
                    value={patient?.gender}
                    onValueChange={(value) =>
                      handleSelectChange("gender", value)
                    }
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
                    required
                    value={patient?.bloodGroup ?? ""}
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
                    placeholder=""
                    value={formData?.placeOfBirth ?? ""}
                    onChange={handleChange}
                  />
                </div>

                <div className="grid gap-3">
                  <Label htmlFor="occupation">Occupation</Label>
                  <Textarea
                    id="occupation"
                    placeholder=""
                    value={formData?.occupation ?? ""}
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
                    type="tel"
                    placeholder=""
                    value={formData?.phone ?? ""}
                    onChange={handleChange}
                  />
                </div>

                <div className="grid gap-3">
                  <Label htmlFor="email">
                    Email<span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder=""
                    value={formData?.email}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-10">
                <div className="grid gap-3">
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    placeholder=""
                    value={formData?.address ?? ""}
                    onChange={handleChange}
                  />
                </div>

                <div className="grid gap-3">
                  <Label htmlFor="country">Country</Label>
                  <Textarea
                    id="country"
                    placeholder=""
                    value={formData?.country ?? ""}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <hr />

              <div className="grid md:grid-cols-2 gap-10">
                {/* <div className="grid gap-3">
                  <Label htmlFor="status">Patient Status</Label>
                  <Input
                    id="status"
                    type="text"
                    placeholder=""
                    value={formData?.patientStatus ?? ""}
                    onChange={handleChange}
                  />
                </div> */}

                <div className="grid gap-3">
                  <Label htmlFor="guardian">Guardian</Label>
                  <Input
                    id="guardian"
                    type="text"
                    placeholder=""
                    value={formData?.guardian ?? ""}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-10">
                <div className="grid gap-3">
                  <Label htmlFor="referredBy">Referred By</Label>
                  <Input
                    id="referredBy"
                    type="text"
                    placeholder=""
                    value={formData?.referredBy ?? ""}
                    onChange={handleChange}
                  />
                </div>

                <div className="grid gap-3">
                  <Label htmlFor="referredDate">Referred Date</Label>
                  <Input
                    id="referredDate"
                    type="date"
                    placeholder=""
                    value={referredDateValue}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="mt-4 mr-2"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Updating..." : "Update Patient"}
              </Button>
              <Button type="button" onClick={() => router.back()}>
                Back
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EditPatientPage;
