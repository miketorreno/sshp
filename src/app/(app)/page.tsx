"use client";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CalendarDays, Stethoscope, Users } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { useState } from "react";
import { Bar, BarChart } from "recharts";
// import { ChartContainer, ChartTooltipContent } from "@/components/ui/charts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const Home = () => {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const chartConfig = {
    desktop: {
      label: "Desktop",
      color: "#2563eb",
    },
    mobile: {
      label: "Mobile",
      color: "#60a5fa",
    },
  } satisfies ChartConfig;
  const chartData = [
    { month: "January", desktop: 186, mobile: 80 },
    { month: "February", desktop: 305, mobile: 200 },
    { month: "March", desktop: 237, mobile: 120 },
    { month: "April", desktop: 73, mobile: 190 },
    { month: "May", desktop: 209, mobile: 130 },
    { month: "June", desktop: 214, mobile: 140 },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-emerald-400 my-2">Dashboard</h2>
        <div className="flex items-center gap-2"></div>
      </div>

      <div className="grid md:grid-cols-4 gap-8 mb-8">
        <Card className="">
          <CardHeader>
            <CardDescription>Total Visits</CardDescription>
            <CardTitle className="text-xl font-semibold">836</CardTitle>
            <CardAction>
              <Users className="h-6 w-6 text-emerald-400" />
            </CardAction>
          </CardHeader>
          <CardFooter className="items-start text-sm">
            {/* <div className="text-green-600 font-semibold">In the norm</div> */}
          </CardFooter>
        </Card>

        <Card className="">
          <CardHeader>
            <CardDescription>Appointments</CardDescription>
            <CardTitle className="text-xl font-semibold">218</CardTitle>
            <CardAction>
              <CalendarDays className="h-6 w-6 text-emerald-400" />
            </CardAction>
          </CardHeader>
          <CardFooter className="items-start text-sm">
            {/* <div className="text-green-600 font-semibold">In the norm</div> */}
          </CardFooter>
        </Card>

        <Card className="">
          <CardHeader>
            <CardDescription>Patients</CardDescription>
            <CardTitle className="text-xl font-semibold">1287</CardTitle>
            <CardAction>
              <Users className="h-6 w-6 text-emerald-400" />
            </CardAction>
          </CardHeader>
          <CardFooter className="items-start text-sm">
            {/* <div className="text-green-600 font-semibold">In the norm</div> */}
          </CardFooter>
        </Card>

        <Card className="">
          <CardHeader>
            <CardDescription>Doctors</CardDescription>
            <CardTitle className="text-xl font-semibold">
              142
              {/* <span className="text-muted-foreground text-sm ml-2">BPM</span> */}
            </CardTitle>
            <CardAction>
              <Stethoscope className="h-6 w-6 text-emerald-400" />
            </CardAction>
          </CardHeader>
          <CardFooter className="items-start text-sm">
            {/* <div className="text-red-600 font-semibold">Above the norm</div> */}
          </CardFooter>
        </Card>
      </div>

      <div className="flex gap-8 mb-8">
        <div className="flex-4/5">
          <ChartContainer config={chartConfig}>
            <BarChart accessibilityLayer data={chartData}>
              <Bar dataKey="desktop" fill="var(--color-desktop)" radius={4} />
              <Bar dataKey="mobile" fill="var(--color-mobile)" radius={4} />
            </BarChart>
            {/* <BarChart data={chartData}>
              <Bar dataKey="value" />
              <ChartTooltip content={<ChartTooltipContent />} />
            </BarChart> */}
          </ChartContainer>
        </div>
        <div className="flex-1/5">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            className="rounded-lg border"
            buttonVariant={"default"}
          />
        </div>
      </div>

      <div className="flex gap-8">
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-emerald-400 mb-4">
            Tasks....
          </h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Assigned To</TableHead>
                <TableHead>Due date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Oliver Harris</TableCell>
                <TableCell>Feb 22nd, 2025</TableCell>
                <TableCell>In progress</TableCell>
                <TableCell className="text-right"></TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Tammy Naec</TableCell>
                <TableCell>Mar 2nd, 2025</TableCell>
                <TableCell>Not started</TableCell>
                <TableCell className="text-right"></TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Ethan Bennett</TableCell>
                <TableCell>Apr 3rd, 2025</TableCell>
                <TableCell>Done</TableCell>
                <TableCell className="text-right"></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-emerald-400 mb-4">
            Upcoming Appointments
          </h2>
          <div className="flex mx-4 mb-4">
            <div className="">
              <p className="text-lg">Mark M.</p>
              <small className="text-sm leading-none font-medium text-muted-foreground">
                Follow-up
              </small>
            </div>
            <div className="ml-auto">20:30 am</div>
          </div>
          <div className="flex mx-4 mb-4">
            <div className="">
              <p className="text-lg">Mike K.</p>
              <small className="text-sm leading-none font-medium text-muted-foreground">
                Consultation
              </small>
            </div>
            <div className="ml-auto">20:30 am</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
