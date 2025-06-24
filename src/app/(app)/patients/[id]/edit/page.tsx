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

const EditPatientPage = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold my-2">Edit Patient</h1>
      </div>

      <Card>
        <CardContent>
          <form className="space-y-12">
            <div className="grid md:grid-cols-3 gap-8">
              <div className="grid gap-3">
                <Label htmlFor="firstName">
                  First Name<span className="text-red-500">*</span>
                </Label>
                <Input id="firstName" placeholder="" required />
              </div>

              <div className="grid gap-3">
                <Label htmlFor="middleName">
                  Middle Name<span className="text-red-500">*</span>
                </Label>
                <Input id="middleName" placeholder="" required />
              </div>

              <div className="grid gap-3">
                <Label htmlFor="lastName">
                  Last Name<span className="text-red-500">*</span>
                </Label>
                <Input id="lastName" placeholder="" required />
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="grid gap-3">
                <Label htmlFor="dateOfBirth">
                  Date of Birth<span className="text-red-500">*</span>
                </Label>
                <Input id="dateOfBirth" type="date" required />
              </div>

              <div className="grid gap-3">
                <Label htmlFor="gender">
                  Gender<span className="text-red-500">*</span>
                </Label>
                <Select required>
                  <SelectTrigger>
                    <SelectValue placeholder="" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-3">
                <Label htmlFor="bloodType">Blood Type</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="a+">A+</SelectItem>
                    <SelectItem value="a-">A-</SelectItem>
                    <SelectItem value="b+">B+</SelectItem>
                    <SelectItem value="b-">B-</SelectItem>
                    <SelectItem value="ab+">AB+</SelectItem>
                    <SelectItem value="ab-">AB-</SelectItem>
                    <SelectItem value="o+">O+</SelectItem>
                    <SelectItem value="o-">O-</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-10">
              <div className="grid gap-3">
                <Label htmlFor="placeOfBirth">Place of Birth</Label>
                <Textarea id="placeOfBirth" placeholder="" />
              </div>

              <div className="grid gap-3">
                <Label htmlFor="occupation">Occupation</Label>
                <Textarea id="occupation" placeholder="" />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-10">
              <div className="grid gap-3">
                <Label htmlFor="phone">
                  Phone<span className="text-red-500">*</span>
                </Label>
                <Input id="phone" type="tel" placeholder="" />
              </div>

              <div className="grid gap-3">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="" />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-10">
              <div className="grid gap-3">
                <Label htmlFor="address">Address</Label>
                <Textarea id="address" placeholder="" />
              </div>

              <div className="grid gap-3">
                <Label htmlFor="country">Country</Label>
                <Textarea id="country" placeholder="" />
              </div>
            </div>

            <hr />

            {/* <div className="grid md:grid-cols-2 gap-10">
              <div className="grid gap-3">
                <Label htmlFor="height">Height</Label>
                <Input
                  id="height"
                  type="number"
                  placeholder=""
                />
              </div>

              <div className="grid gap-3">
                <Label htmlFor="weight">Weight</Label>
                <Input
                  id="weight"
                  type="number"
                  placeholder=""
                />
              </div>
            </div> */}

            <div className="grid md:grid-cols-2 gap-10">
              <div className="grid gap-3">
                <Label htmlFor="status">Patient Status</Label>
                <Input id="status" type="text" placeholder="" />
              </div>

              <div className="grid gap-3">
                <Label htmlFor="guardian">Guardian</Label>
                <Input id="guardian" type="text" placeholder="" />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-10">
              <div className="grid gap-3">
                <Label htmlFor="referredBy">Referred By</Label>
                <Input id="referredBy" type="text" placeholder="" />
              </div>

              <div className="grid gap-3">
                <Label htmlFor="referredDate">Referred Date</Label>
                <Input id="referredDate" type="date" placeholder="" />
              </div>
            </div>

            <Button type="submit" className="mt-4" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Edit Patient"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default EditPatientPage;
