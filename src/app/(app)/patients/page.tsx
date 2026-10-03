import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { PERMISSIONS, can, type Permission } from "@/server/access";
import { redirect } from "next/navigation";

/**
 * The front desk's landing page: registration, and the three lists a clinician
 * starts a day from.
 *
 * A server component, so it asks the matrix itself rather than through the
 * permissions context — the same answer, read where the session is, with no trip
 * through the client tree. A card is here because a role may use the page it
 * leads to.
 */
const PatientsPage = async () => {
  const session = await getSession();

  if (!session) redirect("/login");

  const may = (permission: Permission) =>
    session.user.isActive === true && can(session.user.role, permission);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Patients</h1>
        {may(PERMISSIONS.PATIENTS_WRITE) && (
          <Link href="/patients/add">
            <Button type="button">
              <Plus />
              Add Patient
            </Button>
          </Link>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {may(PERMISSIONS.PATIENTS_READ) && (
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
        )}

        {may(PERMISSIONS.VISITS_READ) && (
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
        )}

        {may(PERMISSIONS.PATIENTS_READ) && (
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
        )}
      </div>
    </div>
  );
};

export default PatientsPage;