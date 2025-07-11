"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
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
import { LogOut, MoreHorizontal, Plus } from "lucide-react";
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

  const handleDelete = async (id: string, type: string) => {
    if (confirm("Are you sure you want to delete this order?")) {
      try {
        const response = await fetch(`/api/orders/${type}/${id}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          throw new Error("Failed to delete order");
        }

        toast.success(
          `${type.charAt(0).toUpperCase() + type.slice(1)} order deleted`
        );
      } catch (error) {
        console.error("Error deleting order:", error);
        toast.error("Failed to delete order");
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
                  {!patientVisit?.endDateTime && (
                    <Link href={`/visits/${patientVisit?.id}/edit`}>
                      <Button type="button" size={"sm"}>
                        Edit Visit
                      </Button>
                    </Link>
                  )}
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
                {!patientVisit?.endDateTime && (
                  <DropdownMenuTrigger asChild className="mb-4">
                    <Button size={"sm"}>
                      <Plus /> Add Order
                    </Button>
                  </DropdownMenuTrigger>
                )}
                <DropdownMenuContent>
                  <DropdownMenuItem>
                    <Link href={`/visits/${patientVisit?.id}/request/lab`}>
                      Lab
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Link href={`/visits/${patientVisit?.id}/request/imaging`}>
                      Imaging
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Link
                      href={`/visits/${patientVisit?.id}/request/medication`}
                    >
                      Medication
                    </Link>
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
                    <TableHead>Processed At</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Requested By</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {patientVisit?.labOrders &&
                    patientVisit?.labOrders.map((labOrder) => (
                      <TableRow key={labOrder.id}>
                        <TableCell>
                          {formatDateTime(labOrder.orderedAt)}
                        </TableCell>
                        <TableCell>{labOrder.labType}</TableCell>
                        <TableCell>Lab</TableCell>
                        <TableCell>{labOrder.orderStatus}</TableCell>
                        <TableCell>
                          {labOrder.completedAt &&
                            formatDateTime(labOrder.completedAt)}
                        </TableCell>
                        <TableCell>{labOrder.result}</TableCell>
                        <TableCell>{labOrder.notes}</TableCell>
                        <TableCell></TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() =>
                                  router.push(`/orders/lab/${labOrder.id}/edit`)
                                }
                              >
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => handleDelete(labOrder.id, "lab")}
                              >
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  {patientVisit?.imagingOrders &&
                    patientVisit?.imagingOrders.map((imagingOrder) => (
                      <TableRow key={imagingOrder.id}>
                        <TableCell>
                          {formatDateTime(imagingOrder.orderedAt)}
                        </TableCell>
                        <TableCell>{imagingOrder.imagingType}</TableCell>
                        <TableCell>Imaging</TableCell>
                        <TableCell>{imagingOrder.orderStatus}</TableCell>
                        <TableCell>
                          {imagingOrder.completedAt &&
                            formatDateTime(imagingOrder.completedAt)}
                        </TableCell>
                        <TableCell>{imagingOrder.result}</TableCell>
                        <TableCell>{imagingOrder.notes}</TableCell>
                        <TableCell></TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() =>
                                  router.push(
                                    `/orders/imaging/${imagingOrder.id}/edit`
                                  )
                                }
                              >
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() =>
                                  handleDelete(imagingOrder.id, "imaging")
                                }
                              >
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  {patientVisit?.medOrders &&
                    patientVisit?.medOrders.map((medOrder) => (
                      <TableRow key={medOrder.id}>
                        <TableCell>
                          {formatDateTime(medOrder.orderedAt)}
                        </TableCell>
                        <TableCell>Medicine</TableCell>
                        <TableCell>Medication</TableCell>
                        <TableCell>{medOrder.orderStatus}</TableCell>
                        <TableCell>
                          {medOrder.completedAt &&
                            formatDateTime(medOrder.completedAt)}
                        </TableCell>
                        <TableCell></TableCell>
                        <TableCell>{medOrder.notes}</TableCell>
                        <TableCell></TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() =>
                                  router.push(
                                    `/orders/imaging/${medOrder.id}/edit`
                                  )
                                }
                              >
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() =>
                                  handleDelete(medOrder.id, "medication")
                                }
                              >
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
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
