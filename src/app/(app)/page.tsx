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

const Home = () => {
  const [date, setDate] = useState<Date | undefined>(new Date());

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-emerald-400 my-2">Dashboard</h1>
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
        <div className="flex-4/5"></div>
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
    </div>
  );
};

export default Home;
