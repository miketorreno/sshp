import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";

const PatientsPage = () => {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Patients</h1>
        <Link href="/patients/add">
          <Button>
            <Plus />
            Add Patient
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Link href="/patients/all">
          <Card className="hover:bg-muted/50 transition-colors">
            <CardHeader>
              <CardTitle>All Patients</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                View and manage all patients in the system
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/patients/outpatients">
          <Card className="hover:bg-muted/50 transition-colors">
            <CardHeader>
              <CardTitle>Outpatients</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Manage patients receiving outpatient care
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/patients/admitted">
          <Card className="hover:bg-muted/50 transition-colors">
            <CardHeader>
              <CardTitle>Admitted Patients</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                View and manage currently admitted patients
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
};

export default PatientsPage;
