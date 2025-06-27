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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDateTime } from "@/lib/utils";
import { LogOut, Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const VisitPage = ({ params }: { params: Promise<{ id: string }> }) => {
  const [loading, setLoading] = useState(true);
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

  return (
    <div className="flex flex-col gap-4">
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
                  <div className="my-4">
                    <span className="text-muted-foreground">Name</span>
                    <h4 className="text-xl font-semibold">
                      {patientVisit?.patient.firstName}{" "}
                      {patientVisit?.patient.middleName}{" "}
                      {patientVisit?.patient.lastName}
                    </h4>
                  </div>

                  <div className="my-4">
                    <span className="text-muted-foreground">Examiner</span>
                    {patientVisit?.provider &&
                      patientVisit?.provider.role === "DOCTOR" && (
                        <h4 className="text-xl font-semibold">
                          {patientVisit.provider.firstName}{" "}
                          {patientVisit.provider.lastName}
                        </h4>
                      )}
                  </div>
                </div>

                <div className="col-span-2">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
                        {patientVisit?.endDateTime ? "Completed" : "Checked In"}
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
                        Reason for Visit
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
            <TabsList>
              <TabsTrigger value="orders">Orders</TabsTrigger>
              <TabsTrigger value="vitals">Vitals</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
              <TabsTrigger value="procedures">Procedures</TabsTrigger>
              <TabsTrigger value="charges">Charges</TabsTrigger>
              <TabsTrigger value="reports">Reports</TabsTrigger>
            </TabsList>
            <hr />
            <TabsContent value="orders">
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

              <div className="mt-20 flex flex-row-reverse gap-2">
                <Link href="/patients/add">
                  <Button size={"sm"}>
                    <Plus />
                    Medication
                  </Button>
                </Link>
                <Link href="/patients/add">
                  <Button size={"sm"}>
                    <Plus />
                    Imaging
                  </Button>
                </Link>
                <Link href="/patients/add">
                  <Button size={"sm"}>
                    <Plus />
                    Lab
                  </Button>
                </Link>
              </div>
            </TabsContent>

            <TabsContent value="vitals">
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

              <div className="mt-20 flex flex-row-reverse gap-2">
                <Link href="/patients/add">
                  <Button size={"sm"}>
                    <Plus />
                    Vitals
                  </Button>
                </Link>
              </div>
            </TabsContent>

            <TabsContent value="notes">
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

              <div className="mt-20 flex flex-row-reverse gap-2">
                <Link href="/patients/add">
                  <Button size={"sm"}>
                    <Plus />
                    Note
                  </Button>
                </Link>
              </div>
            </TabsContent>

            <TabsContent value="procedures">
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

              <div className="mt-20 flex flex-row-reverse gap-2">
                <Link href="/patients/add">
                  <Button size={"sm"}>
                    <Plus />
                    Procedure
                  </Button>
                </Link>
              </div>
            </TabsContent>

            <TabsContent value="charges">
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

              <div className="mt-20 flex flex-row-reverse gap-2">
                <Link href="/patients/add">
                  <Button size={"sm"}>
                    <Plus />
                    Item
                  </Button>
                </Link>
              </div>
            </TabsContent>

            <TabsContent value="reports">
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

              <div className="mt-20 flex flex-row-reverse gap-2">
                <Link href="/patients/add">
                  <Button size={"sm"}>
                    <Plus />
                    OPD Report
                  </Button>
                </Link>
              </div>
            </TabsContent>
          </Tabs>

          <div className="mt-20 flex flex-row-reverse gap-2">
            <Link href="/patients/add">
              <Button size={"sm"}>Back</Button>
            </Link>
            <Link href="/patients/add">
              <Button size={"sm"}>Update</Button>
            </Link>
            <Link href="/patients/add">
              <Button size={"sm"}>
                <LogOut />
                Checkout
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VisitPage;
