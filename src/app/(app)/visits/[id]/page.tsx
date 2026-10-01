"use client";
import { useClinicTimeZone } from "@/components/clinic-time-zone-provider";
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
import { formatClinicDateTime } from "@/lib/clinic-time";
import { LogOut, MoreHorizontal, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useTransition } from "react";
import { toast } from "sonner";
import Image from "next/image";
import { useQueryClient } from "@tanstack/react-query";
import { checkoutVisit } from "@/app/actions/visit-actions";
import { deleteVitals } from "@/app/actions/vitals-actions";
import {
  deleteImagingOrder,
  deleteLabOrder,
  deleteMedicationOrder,
} from "@/app/actions/order-actions";
import { invalidateVisitWrites, useVisitDetail } from "@/client/visits/queries";
import type { VisitDetailDto } from "@/server/visits/dto";
import {
  formatMeasurement,
  VITALS_MEASUREMENTS,
} from "@/server/visits/vitals-measurements";

/** The kinds of order a visit holds, and the name each is reported under. */
const ORDER_KINDS = {
  lab: { archive: deleteLabOrder, label: "Lab" },
  imaging: { archive: deleteImagingOrder, label: "Imaging" },
  medication: { archive: deleteMedicationOrder, label: "Medication" },
} as const;

type OrderKind = keyof typeof ORDER_KINDS;

/**
 * A section of the visit that is drawn but cannot be written yet: notes,
 * procedures, charges and reports have no read model and no command behind them.
 *
 * The action stays visible and disabled, with the reason next to it. It used to
 * be a link to the page that registers a patient, so "Add Note" opened a form
 * about a person rather than a note — a dead end that looked like a working
 * button. A disabled button that says why is the honest version of the same
 * affordance, and it names the work that is missing.
 */
const UnavailableSection = ({
  action,
  noun,
}: {
  action: string;
  noun: string;
}) => (
  <div className="mb-4">
    <Button type="button" size="sm" disabled>
      <Plus />
      {action}
    </Button>
    <p className="mt-2 text-sm text-muted-foreground">
      {noun} are not recorded yet.
    </p>
  </div>
);

/**
 * One visit and the records recorded during it. The visit is read through the
 * canonical detail read, so this page sees the same visit as every other screen,
 * and a checkout, a vitals removal or an archived order re-reads it rather than
 * reloading the page.
 */
const VisitPage = ({ params }: { params: Promise<{ id: string }> }) => {
  // The clinic's zone, read from the server-rendered tree: a client component
  // cannot read `process.env`, so it is handed down. See ADR 0004.
  const zone = useClinicTimeZone();

  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = use(params);
  const { data: visit, isPending, isError } = useVisitDetail(id);
  const [isCheckingOut, startCheckingOut] = useTransition();
  const [isArchivingVitals, startArchivingVitals] = useTransition();
  const [isArchivingOrder, startArchivingOrder] = useTransition();

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

  // "Delete" on an order means the order leaves this visit's clinical reads, so
  // it reports the archive and the visit is re-read rather than reloaded.
  const archiveOrder = (visitId: string, kind: OrderKind, orderId: string) => {
    if (!confirm("Are you sure you want to delete this order?")) return;

    startArchivingOrder(async () => {
      const result = await ORDER_KINDS[kind].archive(visitId, orderId);

      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }

      await invalidateVisitWrites(queryClient, visitId);
      toast.success(`${ORDER_KINDS[kind].label} order deleted`);
    });
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
                          formatClinicDateTime(visit.startDateTime, zone)}
                      </p>
                    </div>
                    {visit.endDateTime && (
                      <div className="my-3">
                        <p className="text-muted-foreground text-sm leading-6">
                          Checked Out
                        </p>
                        <p className="font-semibold text-sm leading-6">
                          {formatClinicDateTime(visit.endDateTime, zone)}
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
                              {formatClinicDateTime(labOrder.orderedAt, zone)}
                            </TableCell>
                            <TableCell>{labOrder.labType}</TableCell>
                            <TableCell>Lab</TableCell>
                            <TableCell>{labOrder.orderStatus}</TableCell>
                            <TableCell>
                              {labOrder.completedAt &&
                                formatClinicDateTime(labOrder.completedAt, zone)}
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
                                  <DropdownMenuItem disabled>
                                    Edit
                                    <span className="ml-2 text-xs text-muted-foreground">
                                      lab orders cannot be edited yet
                                    </span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-red-600"
                                    disabled={isArchivingOrder}
                                    onClick={() =>
                                      archiveOrder(visit.id, "lab", labOrder.id)
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
                              {formatClinicDateTime(imagingOrder.orderedAt, zone)}
                            </TableCell>
                            <TableCell>{imagingOrder.imagingType}</TableCell>
                            <TableCell>Imaging</TableCell>
                            <TableCell>{imagingOrder.orderStatus}</TableCell>
                            <TableCell>
                              {imagingOrder.completedAt &&
                                formatClinicDateTime(imagingOrder.completedAt, zone)}
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
                                  <DropdownMenuItem disabled>
                                    Edit
                                    <span className="ml-2 text-xs text-muted-foreground">
                                      imaging orders cannot be edited yet
                                    </span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-red-600"
                                    disabled={isArchivingOrder}
                                    onClick={() =>
                                      archiveOrder(
                                        visit.id,
                                        "imaging",
                                        imagingOrder.id,
                                      )
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
                              {formatClinicDateTime(medOrder.orderedAt, zone)}
                            </TableCell>
                            <TableCell>{medOrder.medication}</TableCell>
                            <TableCell>Medication</TableCell>
                            <TableCell>{medOrder.orderStatus}</TableCell>
                            <TableCell>
                              {medOrder.completedAt &&
                                formatClinicDateTime(medOrder.completedAt, zone)}
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
                                  <DropdownMenuItem disabled>
                                    Edit
                                    <span className="ml-2 text-xs text-muted-foreground">
                                      medication orders cannot be edited yet
                                    </span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-red-600"
                                    disabled={isArchivingOrder}
                                    onClick={() =>
                                      archiveOrder(
                                        visit.id,
                                        "medication",
                                        medOrder.id,
                                      )
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
                        {/* The headers come from the measurement catalogue, so
                            the unit a reading is shown in is the unit the
                            recording form asked for. */}
                        {VITALS_MEASUREMENTS.map((measurement) => (
                          <TableHead key={measurement.field}>
                            {measurement.label}
                          </TableHead>
                        ))}
                        <TableHead>Taken By</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visit.vitals &&
                        visit.vitals.map((vital) => (
                          <TableRow key={vital.id}>
                            <TableCell>
                              {formatClinicDateTime(vital.recordedAt, zone)}
                            </TableCell>
                            {/* Reading the cells from the same catalogue as the
                                headers is what keeps a column's value from
                                drifting under the wrong unit. */}
                            {VITALS_MEASUREMENTS.map((measurement) => (
                              <TableCell key={measurement.field}>
                                {formatMeasurement(vital[measurement.field])}
                              </TableCell>
                            ))}
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
                    <UnavailableSection action="Add Note" noun="Notes" />
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
                </TabsContent>

                <TabsContent value="procedures">
                  {!visit.endDateTime && (
                    <UnavailableSection
                      action="Add Procedure"
                      noun="Procedures"
                    />
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
                </TabsContent>

                <TabsContent value="charges">
                  {!visit.endDateTime && (
                    <UnavailableSection action="Add Item" noun="Charges" />
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
                </TabsContent>

                <TabsContent value="reports">
                  <UnavailableSection action="OPD Report" noun="Reports" />

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
