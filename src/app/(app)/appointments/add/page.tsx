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
import { PatientCombobox } from "@/components/patient-combobox";

const AddAppointmentPage = () => {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [formData, setFormData] = useState({
    patient: selectedPatient?.id,
    examiner: "",
    startDateTime: "",
    endDateTime: "",
    appointmentType: "",
    appointmentStatus: "SCHEDULED",
    reason: "",
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

  const handleComboChange = (id: string, value: Patient | null) => {
    setFormData((prev) => ({ ...prev, [id]: value?.id || "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to add appointment");
      }

      toast.success("Appointment added");
      router.push(`/appointments/all`);
    } catch (error) {
      console.error("Error: ", error);
      toast.error("Failed to add appointment");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold my-2">Add Appointment</h1>
      </div>

      <Card>
        <CardContent>
          <form className="space-y-12" onSubmit={handleSubmit}>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="grid gap-3">
                <PatientCombobox
                  defaultValue={selectedPatient}
                  onSelectChange={(value) =>
                    value && handleComboChange("patient", value)
                  }
                />
              </div>

              <div className="grid gap-3">
                <Label htmlFor="examiner">Examiner</Label>
                <Input
                  id="examiner"
                  placeholder=""
                  value={formData.examiner}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="grid gap-3">
                <Label htmlFor="startDateTime">
                  Start Date<span className="text-red-500">*</span>
                </Label>
                <Input
                  id="startDateTime"
                  type="datetime-local"
                  required
                  value={formData.startDateTime}
                  onChange={handleChange}
                />
              </div>

              <div className="grid gap-3">
                <Label htmlFor="endDateTime">
                  End Date<span className="text-red-500">*</span>
                </Label>
                <Input
                  id="endDateTime"
                  type="datetime-local"
                  required
                  value={formData.endDateTime}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="grid gap-3">
                <Label htmlFor="appointmentType">
                  Type<span className="text-red-500">*</span>
                </Label>
                <Select
                  required
                  onValueChange={(value) =>
                    handleSelectChange("appointmentType", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMISSION">Admission</SelectItem>
                    <SelectItem value="CLINIC">Clinic</SelectItem>
                    <SelectItem value="EMERGENCY">Emergency</SelectItem>
                    <SelectItem value="FOLLOWUP">Follow-up</SelectItem>
                    <SelectItem value="IMAGING">Imaging</SelectItem>
                    <SelectItem value="LAB">Lab</SelectItem>
                    <SelectItem value="PHARMACY">Pharmacy</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-3">
                <Label htmlFor="appointmentStatus">Status</Label>
                <Select
                  defaultValue={formData.appointmentStatus}
                  onValueChange={(value) =>
                    handleSelectChange("appointmentStatus", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ATTENDED">Attended</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    <SelectItem value="MISSED">Missed</SelectItem>
                    <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-10">
              <div className="grid gap-3">
                <Label htmlFor="reason">Reason</Label>
                <Textarea
                  id="reason"
                  placeholder=""
                  value={formData.reason}
                  onChange={handleChange}
                />
              </div>
            </div>

            <Button type="submit" className="mt-4" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add Appointment"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AddAppointmentPage;
