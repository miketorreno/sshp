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
import { use, useTransition } from "react";
import { toast } from "sonner";
import Image from "next/image";
import { useQueryClient } from "@tanstack/react-query";
import { checkoutVisit } from "@/app/actions/visit-actions";
import { deleteVitals } from "@/app/actions/vitals-actions";
import { invalidateVisitWrites, useVisitDetail } from "@/client/visits/queries";
import type { VisitDetailDto } from "@/server/visits/dto";

/**
 * One visit and the records recorded during it. The visit is read through the
 * canonical detail read, so this page sees the same visit as every other screen,
 * and a checkout or a vitals removal re-reads it rather than reloading the page.
 */
const VisitPage = ({ params }: { params: Promise<{ id: string }> }) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = use(params);
  const { data: visit, isPending, isError } = useVisitDetail(id);
  const [isCheckingOut, startCheckingOut] = useTransition();
  const [isArchivingVitals, startArchivingVitals] = useTransition();

  // A checkout ends the visit where the clinician is looking, so it reports
  // instead of navigating, and the visit is re-read to show the new end.
  const checkout = (visit: VisitDetailDto) => {
    if (
      !confirm(
        `Checkout ${visit.patient.firstName} ${visit.patient.middleName}?`,
      )
    )
      return;

    startCheckingOut(async () => {
      const result = await checkoutVisit(visit.id);

      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }

      await invalidateVisitWrites(queryClient, visit.id);
      toast.success("Patient checked out");
    });
  };

  // Orders are written by the orders surface, so this page still reports what it
  // knows about them; their own migration is separate.
  const deleteOrder = async (id: string, type: string) => {
    if (!confirm("Are you sure you want to delete this order?")) return;

    try {
      const res = await fetch(`/api/orders/${type}/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete order");

      toast.success(
        `${type.charAt(0).toUpperCase() + type.slice(1)} order deleted`,
      );
    } catch {
      toast.error("Error while deleting order");
    }
  };

  const archiveVitals = (visit: VisitDetailDto, vitalsId: string) => {
    if (!confirm("Are you sure you want to delete these vitals?")) return;

    startArchivingVitals(async () => {
      const result = await deleteVitals(visit.id, vitalsId);

      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }

      await invalidateVisitWrites(queryClient, visit.id);
      toast.success("Vitals deleted");
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold my-2">Visit Info</h1>
      </div>

      <Card className="mb-8">
        <CardContent>
          {isPending ? (
            <div className="flex justify-center items-center h-40">
              <p>Loading visit...</p>
            </div>
          ) : isError ? (
            <div className="flex justify-center items-center h-40">
              <p className="text-red-600">Failed to load visit</p>
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
                    <Link href={`/patients/${visit.patient.id}`}>
                      <h4 className="text-xl font-semibold">
                        {visit.patient.firstName} {visit.patient.middleName}{" "}
                        {visit.patient.lastName}
                      </h4>
                    </Link>
                  </div>
                  {!visit.endDateTime && (
                    <Link href={`/visits/${visit.id}/edit`}>
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
                      {visit.provider ? (
                        <h4 className="text-xl font-semibold">
                          {visit.provider.name}
                        </h4>
                      ) : null}
                    </div>
                    <div className="my-3">
                      <p className="text-muted-foreground text-sm leading-6">
                        Checked In
                      </p>
                      <p className="font-semibold text-sm leading-6">
                        {visit.startDateTime &&
                          formatDateTime(visit.startDateTime)}
                      </p>
                    </div>
                    {visit.endDateTime && (
                      <div className="my-3">
                        <p className="text-muted-foreground text-sm leading-6">
                          Checked Out
                        </p>
                        <p className="font-semibold text-sm leading-6">
                          {formatDateTime(visit.endDateTime)}
                        </p>
                      </div>
                    )}
                    <div className="my-3">
                      <p className="text-muted-foreground text-sm leading-6">
                        Visit Status
                      </p>
                      <p className="font-semibold text-sm leading-6">
                        {visit.endDateTime ? "Checked Out" : "Checked In"}
                      </p>
                    </div>
                    <div className="my-3">
                      <p className="text-muted-foreground text-sm leading-6">
                        Visit Type
                      </p>
                      <p className="font-semibold text-sm leading-6">
                        {visit.visitType}
                      </p>
                    </div>
                    <div className="my-3">
                      <p className="text-muted-foreground text-sm leading-6">
                        Reason
                      </p>
                      <p className="font-semibold text-sm leading-6">
                        {visit.reason}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

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
                    {!visit.endDateTime && (
                      <DropdownMenuTrigger asChild className="mb-4">
                        <Button size={"sm"}>
                          <Plus /> Add Order
                        </Button>
                      </DropdownMenuTrigger>
                    )}
                    <DropdownMenuContent>
                      <DropdownMenuItem>
                        <Link href={`/visits/${visit.id}/request/lab`}>
                          Lab
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Link href={`/visits/${visit.id}/request/imaging`}>
                          Imaging
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Link href={`/visits/${visit.id}/request/medication`}>
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
                      {visit.labOrders &&
                        visit.labOrders.map((labOrder) => (
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
                            <TableCell>{labOrder.orderedBy?.name}</TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    className="h-8 w-8 p-0"
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() =>
                                      router.push(
                                        `/orders/lab/${labOrder.id}/edit`,
                                      )
                                    }
                                  >
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-red-600"
                                    onClick={() =>
                                      deleteOrder(labOrder.id, "lab")
                                    }
                                  >
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      {visit.imagingOrders &&
                        visit.imagingOrders.map((imagingOrder) => (
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
                            <TableCell>
                              {imagingOrder.orderedBy?.name}
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    className="h-8 w-8 p-0"
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() =>
                                      router.push(
                                        `/orders/imaging/${imagingOrder.id}/edit`,
                                      )
                                    }
                                  >
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-red-600"
                                    onClick={() =>
                                      deleteOrder(imagingOrder.id, "imaging")
                                    }
                                  >
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      {visit.medOrders &&
                        visit.medOrders.map((medOrder) => (
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
                            <TableCell>{medOrder.orderedBy?.name}</TableCell>
                            <TableCell>{medOrder.notes}</TableCell>
                            <TableCell></TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    className="h-8 w-8 p-0"
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() =>
                                      router.push(
                                        `/orders/imaging/${medOrder.id}/edit`,
                                      )
                                    }
                                  >
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-red-600"
                                    onClick={() =>
                                      deleteOrder(medOrder.id, "medication")
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
                </TabsContent>

                <TabsContent value="vitals">
                  {!visit.endDateTime && (
                    <Link href={`/visits/${visit.id}/vitals`}>
                      <Button type="button" size={"sm"} className="mb-4">
                        <Plus />
                        Add Vitals
                      </Button>
                    </Link>
                  )}

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Taken At</TableHead>
                        <TableHead>Height</TableHead>
                        <TableHead>Weight</TableHead>
                        <TableHead>Temperature</TableHead>
                        <TableHead>SBP</TableHead>
                        <TableHead>DBP</TableHead>
                        <TableHead>Pulse</TableHead>
                        <TableHead>Respiratory</TableHead>
                        <TableHead>Oxygen</TableHead>
                        <TableHead>Glucose</TableHead>
                        <TableHead>Cholesterol</TableHead>
                        <TableHead>Taken By</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visit.vitals &&
                        visit.vitals.map((vital) => (
                          <TableRow key={vital.id}>
                            <TableCell>
                              {formatDateTime(vital.recordedAt)}
                            </TableCell>
                            <TableCell>{vital.height}</TableCell>
                            <TableCell>{vital.weight}</TableCell>
                            <TableCell>{vital.temperatureCelsius}</TableCell>
                            <TableCell>{vital.systolicBP}</TableCell>
                            <TableCell>{vital.diastolicBP}</TableCell>
                            <TableCell>{vital.heartRate}</TableCell>
                            <TableCell>{vital.respiratoryRate}</TableCell>
                            <TableCell>{vital.oxygenSaturation}</TableCell>
                            <TableCell>{vital.glucose}</TableCell>
                            <TableCell>{vital.cholesterol}</TableCell>
                            <TableCell>{vital.recordedBy?.name}</TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    className="h-8 w-8 p-0"
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    className="text-red-600"
                                    disabled={isArchivingVitals}
                                    onClick={() =>
                                      archiveVitals(visit, vital.id)
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
                </TabsContent>

                <TabsContent value="notes">
                  {!visit.endDateTime && (
                    <Link href="/patients/add">
                      <Button type="button" size={"sm"} className="mb-4">
                        <Plus />
                        Add Note
                      </Button>
                    </Link>
                  )}

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
                  {!visit.endDateTime && (
                    <Link href="/patients/add">
                      <Button type="button" size={"sm"} className="mb-4">
                        <Plus />
                        Add Procedure
                      </Button>
                    </Link>
                  )}

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
                  {!visit.endDateTime && (
                    <Link href="/patients/add">
                      <Button type="button" size={"sm"} className="mb-4">
                        <Plus />
                        Add Item
                      </Button>
                    </Link>
                  )}

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

              <div className="mt-32 flex flex-row-reverse gap-2">
                <Button type="button" onClick={() => router.back()} size={"sm"}>
                  Back
                </Button>
                {!visit.endDateTime && (
                  <Button
                    type="button"
                    size={"sm"}
                    disabled={isCheckingOut}
                    onClick={() => checkout(visit)}
                  >
                    <LogOut />
                    {isCheckingOut ? "Checking out..." : "Checkout"}
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VisitPage;
