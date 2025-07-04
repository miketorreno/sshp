"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDateTime } from "@/lib/utils";
import { LogOut, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import Image from "next/image";

const VisitPage = ({ params }: { params: Promise<{ id: string }> }) => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    } catch (error) {
      console.error("Error: ", error);
      toast.error("Failed to load visit");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVisit();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    if (
      confirm(
        `Checkout ${patientVisit?.patient.firstName} ${patientVisit?.patient.middleName}?`
      )
    ) {
      e.preventDefault();
      setIsSubmitting(true);

      try {
        const response = await fetch(
          `/api/visits/checkout/${patientVisit?.id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Failed to checkout patient");
        }

        toast.success("Patient checked out");
        window.location.reload();
      } catch (err) {
        console.error("Error: ", err);
        toast.error("Failed to checkout patient");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold my-2">Visit Info</h1>
      </div>

      <Card className="mb-8">
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <p>Loading visit...</p>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Image
                    src="https://placehold.co/100x100/png"
                    width={100}
                    height={100}
                    alt="profile"
                    className="rounded-full"
                  />
                  <div className="my-4">
                    {/* <span className="text-muted-foreground">Name</span> */}
                    <Link href={`/patients/${patientVisit?.patient.id}`}>
                      <h4 className="text-xl font-semibold">
                        {patientVisit?.patient.firstName}{" "}
                        {patientVisit?.patient.middleName}{" "}
                        {patientVisit?.patient.lastName}
                      </h4>
                    </Link>
                  </div>
                  <Link href={`/visits/${patientVisit?.id}/edit`}>
                    <Button type="button" size={"sm"}>
                      Edit Visit
                    </Button>
                  </Link>
                </div>

                <div className="col-span-2">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="my-3">
                      <span className="text-muted-foreground">Examiner</span>
                      {patientVisit?.provider &&
                        patientVisit?.provider.role === "DOCTOR" && (
                          <h4 className="text-xl font-semibold">
                            {patientVisit.provider.firstName}{" "}
                            {patientVisit.provider.lastName}
                          </h4>
                        )}
                    </div>
                    <div className="my-3">
                      <p className="text-muted-foreground text-sm leading-6">
                        Checked In
                      </p>
                      <p className="font-semibold text-sm leading-6">
                        {patientVisit?.startDateTime &&
                          formatDateTime(patientVisit.startDateTime)}
                      </p>
                    </div>
                    {patientVisit?.endDateTime && (
                      <div className="my-3">
                        <p className="text-muted-foreground text-sm leading-6">
                          Checked Out
                        </p>
                        <p className="font-semibold text-sm leading-6">
                          {formatDateTime(patientVisit.endDateTime)}
                        </p>
                      </div>
                    )}
                    <div className="my-3">
                      <p className="text-muted-foreground text-sm leading-6">
                        Visit Status
                      </p>
                      <p className="font-semibold text-sm leading-6">
                        {patientVisit?.endDateTime
                          ? "Checked Out"
                          : "Checked In"}
                      </p>
                    </div>
                    <div className="my-3">
                      <p className="text-muted-foreground text-sm leading-6">
                        Visit Type
                      </p>
                      <p className="font-semibold text-sm leading-6">
                        {patientVisit?.visitType}
                      </p>
                    </div>
                    <div className="my-3">
                      <p className="text-muted-foreground text-sm leading-6">
                        Reason
                      </p>
                      <p className="font-semibold text-sm leading-6">
                        {patientVisit?.reason}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <Tabs defaultValue="orders" className="mt-12">
            <TabsList className="w-full my-12">
              <TabsTrigger value="orders">Orders</TabsTrigger>
              <TabsTrigger value="vitals">Vitals</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
              <TabsTrigger value="procedures">Procedures</TabsTrigger>
              <TabsTrigger value="charges">Charges</TabsTrigger>
              <TabsTrigger value="reports">Reports</TabsTrigger>
            </TabsList>
            <TabsContent value="orders">
              <DropdownMenu>
                <DropdownMenuTrigger asChild className="mb-4">
                  <Button size={"sm"}>
                    <Plus /> Add Order
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem>
                    <Link href="/patients/add">Lab</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Link href="/patients/add">Imaging</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Link href="/patients/add">Medication</Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Requested At</TableHead>
                    <TableHead>Order Name</TableHead>
                    <TableHead>Order Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date Processed</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Requested By</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody></TableBody>
              </Table>

              {/* <div className="mt-20 flex flex-row-reverse gap-2">
                <Link href="/patients/add">
                  <Button type="button" size={"sm"}>
                    <Plus />
                    Medication
                  </Button>
                </Link>
                <Link href="/patients/add">
                  <Button type="button" size={"sm"}>
                    <Plus />
                    Imaging
                  </Button>
                </Link>
                <Link href="/patients/add">
                  <Button type="button" size={"sm"}>
                    <Plus />
                    Lab
                  </Button>
                </Link>
              </div> */}
            </TabsContent>

            <TabsContent value="vitals">
              <Link href="/patients/add">
                <Button type="button" size={"sm"} className="mb-4">
                  <Plus />
                  Add Vitals
                </Button>
              </Link>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Taken At</TableHead>
                    <TableHead>Temperature</TableHead>
                    <TableHead>Weight</TableHead>
                    <TableHead>Height</TableHead>
                    <TableHead>SBP</TableHead>
                    <TableHead>DBP</TableHead>
                    <TableHead>Heart Rate</TableHead>
                    <TableHead>Respiratory Rate</TableHead>
                    <TableHead>Taken By</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody></TableBody>
              </Table>

              {/* <div className="mt-20 flex flex-row-reverse gap-2">
                <Link href="/patients/add">
                  <Button type="button" size={"sm"}>
                    <Plus />
                    Vitals
                  </Button>
                </Link>
              </div> */}
            </TabsContent>

            <TabsContent value="notes">
              <Link href="/patients/add">
                <Button type="button" size={"sm"} className="mb-4">
                  <Plus />
                  Add Note
                </Button>
              </Link>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Written At</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead>Written By</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody></TableBody>
              </Table>

              {/* <div className="mt-20 flex flex-row-reverse gap-2">
                <Link href="/patients/add">
                  <Button type="button" size={"sm"}>
                    <Plus />
                    Note
                  </Button>
                </Link>
              </div> */}
            </TabsContent>

            <TabsContent value="procedures">
              <Link href="/patients/add">
                <Button type="button" size={"sm"} className="mb-4">
                  <Plus />
                  Add Procedure
                </Button>
              </Link>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Procedure</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody></TableBody>
              </Table>

              {/* <div className="mt-20 flex flex-row-reverse gap-2">
                <Link href="/patients/add">
                  <Button type="button" size={"sm"}>
                    <Plus />
                    Procedure
                  </Button>
                </Link>
              </div> */}
            </TabsContent>

            <TabsContent value="charges">
              <Link href="/patients/add">
                <Button type="button" size={"sm"} className="mb-4">
                  <Plus />
                  Add Item
                </Button>
              </Link>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody></TableBody>
              </Table>

              {/* <div className="mt-20 flex flex-row-reverse gap-2">
                <Link href="/patients/add">
                  <Button type="button" size={"sm"}>
                    <Plus />
                    Item
                  </Button>
                </Link>
              </div> */}
            </TabsContent>

            <TabsContent value="reports">
              <Link href="/patients/add">
                <Button type="button" size={"sm"} className="mb-4">
                  <Plus />
                  OPD Report
                </Button>
              </Link>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Report Type</TableHead>
                    <TableHead>Written By</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody></TableBody>
              </Table>

              {/* <div className="mt-20 flex flex-row-reverse gap-2">
                <Link href="/patients/add">
                  <Button type="button" size={"sm"}>
                    <Plus />
                    OPD Report
                  </Button>
                </Link>
              </div> */}
            </TabsContent>
          </Tabs>

          <form className="space-y-12" onSubmit={handleSubmit}>
            <div className="mt-32 flex flex-row-reverse gap-2">
              <Button type="button" onClick={() => router.back()} size={"sm"}>
                Back
              </Button>
              {!patientVisit?.endDateTime && (
                <Button type="submit" size={"sm"} disabled={isSubmitting}>
                  <LogOut />
                  {isSubmitting ? "Checking out..." : "Checkout"}
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default VisitPage;
