import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createPatient } from "@/app/actions/patient-actions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const AddPatientPage = () => {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold my-2">Add Patient</h1>
      </div>

      <Card>
        <CardContent>
          <form action={createPatient} className="space-y-12">
            <div className="grid md:grid-cols-3 gap-8">
              <div className="grid gap-3">
                <Label htmlFor="firstName">
                  First Name<span className="text-red-500">*</span>
                </Label>
                <Input
                  id="firstName"
                  name="firstName"
                  placeholder=""
                  type="text"
                  required
                />
              </div>

              <div className="grid gap-3">
                <Label htmlFor="middleName">
                  Middle Name<span className="text-red-500">*</span>
                </Label>
                <Input
                  id="middleName"
                  name="middleName"
                  placeholder=""
                  type="text"
                  required
                />
              </div>

              <div className="grid gap-3">
                <Label htmlFor="lastName">
                  Last Name<span className="text-red-500">*</span>
                </Label>
                <Input
                  id="lastName"
                  name="lastName"
                  placeholder=""
                  type="text"
                  required
                />
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="grid gap-3">
                <Label htmlFor="dateOfBirth">
                  Date of Birth<span className="text-red-500">*</span>
                </Label>
                <Input
                  id="dateOfBirth"
                  name="dateOfBirth"
                  type="date"
                  required
                />
              </div>

              <div className="grid gap-3">
                <Label htmlFor="gender">
                  Gender<span className="text-red-500">*</span>
                </Label>
                <Select name="gender" required>
                  <SelectTrigger>
                    <SelectValue placeholder="" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-3">
                <Label htmlFor="bloodGroup">Blood Type</Label>
                <Select name="bloodGroup" required>
                  <SelectTrigger>
                    <SelectValue placeholder="" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A+">A+</SelectItem>
                    <SelectItem value="A-">A-</SelectItem>
                    <SelectItem value="B+">B+</SelectItem>
                    <SelectItem value="B-">B-</SelectItem>
                    <SelectItem value="AB+">AB+</SelectItem>
                    <SelectItem value="AB-">AB-</SelectItem>
                    <SelectItem value="O+">O+</SelectItem>
                    <SelectItem value="O-">O-</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-10">
              <div className="grid gap-3">
                <Label htmlFor="placeOfBirth">Place of Birth</Label>
                <Textarea
                  id="placeOfBirth"
                  name="placeOfBirth"
                  placeholder=""
                />
              </div>

              <div className="grid gap-3">
                <Label htmlFor="occupation">Occupation</Label>
                <Textarea id="occupation" name="occupation" placeholder="" />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-10">
              <div className="grid gap-3">
                <Label htmlFor="phone">
                  Phone<span className="text-red-500">*</span>
                </Label>
                <Input id="phone" name="phone" type="tel" placeholder="" />
              </div>

              <div className="grid gap-3">
                <Label htmlFor="email">
                  Email<span className="text-red-500">*</span>
                </Label>
                <Input id="email" name="email" type="email" placeholder="" />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-10">
              <div className="grid gap-3">
                <Label htmlFor="address">Address</Label>
                <Textarea id="address" name="address" placeholder="" />
              </div>

              <div className="grid gap-3">
                <Label htmlFor="country">Country</Label>
                <Textarea id="country" name="country" placeholder="" />
              </div>
            </div>

            <hr />

            <div className="grid md:grid-cols-2 gap-10">
              <div className="grid gap-3">
                <Label htmlFor="guardian">Guardian</Label>
                <Input
                  id="guardian"
                  name="guardian"
                  type="text"
                  placeholder=""
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-10">
              <div className="grid gap-3">
                <Label htmlFor="referredBy">Referred By</Label>
                <Input
                  id="referredBy"
                  name="referredBy"
                  type="text"
                  placeholder=""
                />
              </div>

              <div className="grid gap-3">
                <Label htmlFor="referredDate">Referred Date</Label>
                <Input
                  id="referredDate"
                  name="referredDate"
                  type="date"
                  placeholder=""
                />
              </div>
            </div>

            <Button type="submit" className="mt-4">
              Add Patient
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AddPatientPage;
