"use client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatFetchedDateTime } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const EditVisitPage = ({ params }: { params: Promise<{ id: string }> }) => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<PatientVisit>();
  const [patientVisit, setPatientVisit] = useState<PatientVisit>();
  const [startDateTimeValue, setStartDateTimeValue] = useState("");

  const fetchVisit = async () => {
    const { id } = await params;

    try {
      const response = await fetch(`/api/visits/${id}`);

      if (response.status === 404) {
        throw new Error("Visit not found");
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch visit");
      }

      const data = await response.json();
      setPatientVisit(data);
      setFormData(data);
    } catch (err) {
      console.error("Error: ", err);
      toast.error("Failed to load visit");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVisit();
  }, []);

  useEffect(() => {
    if (patientVisit) {
      setStartDateTimeValue(formatFetchedDateTime(patientVisit.startDateTime));
    }
  }, [patientVisit]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value } as PatientVisit));
  };

  const handleSelectChange = (id: string, value: string) => {
    setFormData((prev) => ({ ...prev, [id]: value } as PatientVisit));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/visits/${patientVisit?.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to update visit");
      }

      toast.success("Visit updated");
      router.push(`/visits/${data.id}`);
    } catch (error) {
      console.error("Error: ", error);
      toast.error("Failed to update visit");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold my-2">Visit Information</h1>
      </div>

      <Card className="mb-8">
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <p>Loading visit...</p>
            </div>
          ) : (
            <form className="space-y-12" onSubmit={handleSubmit}>
              <div className="grid md:grid-cols-2 gap-8">
                <div className="grid gap-3">
                  <Label htmlFor="patient">
                    Patient<span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="patient"
                    placeholder=""
                    value={
                      formData?.patient
                        ? `${formData.patient.firstName} ${formData.patient.middleName} ${formData.patient.lastName}`
                        : ""
                    }
                    onChange={handleChange}
                    disabled
                  />
                </div>

                <div className="grid gap-3">
                  <Label htmlFor="examiner">Examiner</Label>
                  <Input
                    id="examiner"
                    placeholder=""
                    value={
                      formData?.provider
                        ? `${formData.provider.firstName} ${formData.provider.lastName}`
                        : ""
                    }
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <div className="grid gap-3">
                  <Label htmlFor="startDateTime">
                    Check In<span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="startDateTime"
                    type="datetime-local"
                    required
                    value={startDateTimeValue}
                    onChange={handleChange}
                  />
                </div>

                <div className="grid gap-3">
                  <Label htmlFor="visitType">
                    Visit Type<span className="text-red-500">*</span>
                  </Label>
                  <Select
                    required
                    value={patientVisit?.visitType}
                    onValueChange={(value) =>
                      handleSelectChange("visitType", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CLINIC">Clinic</SelectItem>
                      <SelectItem value="EMERGENCY">Emergency</SelectItem>
                      <SelectItem value="FOLLOWUP">Follow-up</SelectItem>
                      <SelectItem value="IMAGING">Imaging</SelectItem>
                      <SelectItem value="LAB">Lab</SelectItem>
                      <SelectItem value="PHARMACY">Pharmacy</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-10">
                <div className="grid gap-3">
                  <Label htmlFor="reason">Reason for Visit</Label>
                  <Textarea
                    id="reason"
                    placeholder=""
                    value={formData?.reason || ""}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="mt-4 mr-2"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Updating..." : "Update Visit"}
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

export default EditVisitPage;
