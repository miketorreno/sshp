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
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const AddPatientPage = () => {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    dateOfBirth: "",
    gender: "",
    bloodType: "",
    placeOfBirth: "",
    occupation: "",
    phone: "",
    email: "",
    address: "",
    country: "",
    patientStatus: "",
    guardian: "",
    referredBy: "",
    referredDate: "",
    patientType: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (id: string, value: string) => {
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/patients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to add patient");
      }

      toast.success("Patient added successfully");
      router.push(`/patients/${data.id}`);
    } catch (error) {
      console.error("Error: ", error);
      toast.error("Failed to add patient");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold my-2">New Patient</h1>
      </div>

      <Card>
        <CardContent>
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
                  placeholder=""
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
                  placeholder=""
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
                  type="date"
                  required
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                />
              </div>

              <div className="grid gap-3">
                <Label htmlFor="gender">
                  Gender<span className="text-red-500">*</span>
                </Label>
                <Select
                  required
                  onValueChange={(value) => handleSelectChange("gender", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-3">
                <Label htmlFor="bloodType">Blood Type</Label>
                <Select
                  required
                  onValueChange={(value) =>
                    handleSelectChange("bloodType", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="a+">A+</SelectItem>
                    <SelectItem value="a-">A-</SelectItem>
                    <SelectItem value="b+">B+</SelectItem>
                    <SelectItem value="b-">B-</SelectItem>
                    <SelectItem value="ab+">AB+</SelectItem>
                    <SelectItem value="ab-">AB-</SelectItem>
                    <SelectItem value="o+">O+</SelectItem>
                    <SelectItem value="o-">O-</SelectItem>
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
                  value={formData.placeOfBirth}
                  onChange={handleChange}
                />
              </div>

              <div className="grid gap-3">
                <Label htmlFor="occupation">Occupation</Label>
                <Textarea
                  id="occupation"
                  placeholder=""
                  value={formData.occupation}
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
                  value={formData.phone}
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
                  placeholder=""
                  value={formData.address}
                  onChange={handleChange}
                />
              </div>

              <div className="grid gap-3">
                <Label htmlFor="country">Country</Label>
                <Textarea
                  id="country"
                  placeholder=""
                  value={formData.country}
                  onChange={handleChange}
                />
              </div>
            </div>

            <hr />

            {/* <div className="grid md:grid-cols-2 gap-10">
              <div className="grid gap-3">
                <Label htmlFor="height">Height</Label>
                <Input
                  id="height"
                  type="number"
                  placeholder=""
                />
              </div>

              <div className="grid gap-3">
                <Label htmlFor="weight">Weight</Label>
                <Input
                  id="weight"
                  type="number"
                  placeholder=""
                />
              </div>
            </div> */}

            <div className="grid md:grid-cols-2 gap-10">
              <div className="grid gap-3">
                <Label htmlFor="status">Patient Status</Label>
                <Input
                  id="status"
                  type="text"
                  placeholder=""
                  value={formData.patientStatus}
                  onChange={handleChange}
                />
              </div>

              <div className="grid gap-3">
                <Label htmlFor="guardian">Guardian</Label>
                <Input
                  id="guardian"
                  type="text"
                  placeholder=""
                  value={formData.guardian}
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
                  value={formData.referredBy}
                  onChange={handleChange}
                />
              </div>

              <div className="grid gap-3">
                <Label htmlFor="referredDate">Referred Date</Label>
                <Input
                  id="referredDate"
                  type="date"
                  placeholder=""
                  value={formData.referredDate}
                  onChange={handleChange}
                />
              </div>
            </div>

            <Button type="submit" className="mt-4" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add Patient"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AddPatientPage;
