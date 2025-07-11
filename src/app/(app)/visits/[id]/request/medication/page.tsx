"use client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const AddMedicationRequest = ({
  params,
}: {
  params: Promise<{ id: string }>;
}) => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<PatientVisit>();
  const [patientVisit, setPatientVisit] = useState<PatientVisit>();

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

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value } as PatientVisit));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch(
        `/api/visits/${patientVisit?.id}/request/medication`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...formData,
            patient: { id: patientVisit?.patient.id },
            visit: { id: patientVisit?.id },
          }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to create medication request");
      }

      toast.success("Medication request created");
      router.push(`/visits/${patientVisit?.id}`);
    } catch (err) {
      console.error("Error: ", err);
      toast.error("Failed to create medication request");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold my-2">Medication Request</h1>
      </div>

      <Card className="mb-8">
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <p>Loading...</p>
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
                    disabled
                  />
                </div>

                <div className="grid gap-3">
                  <Label htmlFor="visit">
                    Visit<span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="visit"
                    placeholder=""
                    value={`${formatDateTime(formData?.startDateTime)} - ${
                      formData?.visitType
                    }`}
                    onChange={handleChange}
                    disabled
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <div className="grid gap-3">
                  <Label htmlFor="medication">
                    Medication<span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="medication"
                    placeholder=""
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="grid gap-3">
                  <Label htmlFor="prescription">
                    Prescription <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="prescription"
                    placeholder=""
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-10">
                <div className="grid gap-3">
                  <Label htmlFor="dosage">
                    Dosage<span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="dosage"
                    placeholder="500mg"
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="grid gap-3">
                  <Label htmlFor="frequency">
                    Frequency<span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="frequency"
                    placeholder="Twice a day"
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="grid gap-3">
                  <Label htmlFor="route">
                    Route<span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="route"
                    placeholder="Oral"
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="mt-4 mr-2"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Adding..." : "Add Request"}
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

export default AddMedicationRequest;
