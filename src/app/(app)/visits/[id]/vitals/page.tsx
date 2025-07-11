"use client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

const AddVitalsPage = ({ params }: { params: Promise<{ id: string }> }) => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<PatientVisit>();
  const [patientVisit, setPatientVisit] = useState<PatientVisit>();

  const fetchVisit = async () => {
    const { id } = await params;

    try {
      const res = await fetch(`/api/visits/${id}`);

      if (res.status === 404) {
        throw new Error("Visit not found");
      }

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to fetch visit");
      }

      const data = await res.json();
      setPatientVisit(data);
      setFormData(data);
    } catch (err) {
      console.error("Error: ", err);
      toast.error("Error while fetching visit");
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
      const res = await fetch(`/api/visits/${patientVisit?.id}/vitals`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          patient: { id: patientVisit?.patient.id },
          visit: { id: patientVisit?.id },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error while adding vitals");
      }

      toast.success("Vitals added");
      router.push(`/visits/${patientVisit?.id}`);
    } catch (err) {
      console.error("Error: ", err);
      toast.error("Error while adding vitals");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold my-2">Add Vitals</h1>
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

              <div className="grid md:grid-cols-4 gap-10">
                <div className="grid gap-3">
                  <Label htmlFor="height">Height (kg)</Label>
                  <Input
                    type="number"
                    id="height"
                    placeholder=""
                    onChange={handleChange}
                  />
                </div>

                <div className="grid gap-3">
                  <Label htmlFor="weight">Weight (cm)</Label>
                  <Input
                    type="number"
                    id="weight"
                    placeholder=""
                    onChange={handleChange}
                  />
                </div>

                <div className="grid gap-3">
                  <Label htmlFor="systolicBP">
                    Systolic<span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    id="systolicBP"
                    placeholder=""
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="grid gap-3">
                  <Label htmlFor="diastolicBP">
                    Diastolic<span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    id="diastolicBP"
                    placeholder=""
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-10">
                <div className="grid gap-3">
                  <Label htmlFor="temperatureCelsius">
                    Temperature (°C)<span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    id="temperatureCelsius"
                    placeholder=""
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="grid gap-3">
                  <Label htmlFor="heartRate">
                    Heart Rate<span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    id="heartRate"
                    placeholder=""
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="grid gap-3">
                  <Label htmlFor="respiratoryRate">
                    Respiratory Rate<span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    id="respiratoryRate"
                    placeholder=""
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-10">
                <div className="grid gap-3">
                  <Label htmlFor="oxygenSaturation">
                    Oxygen Saturation<span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    id="oxygenSaturation"
                    placeholder=""
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="grid gap-3">
                  <Label htmlFor="glucose">
                    Glucose<span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    id="glucose"
                    placeholder=""
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="grid gap-3">
                  <Label htmlFor="cholesterol">
                    Cholesterol<span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    id="cholesterol"
                    placeholder=""
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
                {isSubmitting ? "Adding..." : "Add Vitals"}
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

export default AddVitalsPage;
