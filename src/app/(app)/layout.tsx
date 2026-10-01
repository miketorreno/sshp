import { AppSidebar } from "@/components/app-sidebar";
import Header from "@/components/header";
import QueryProvider from "@/components/QueryProvider";
import { ClinicTimeZoneProvider } from "@/components/clinic-time-zone-provider";
import { clinicTimeZone } from "@/lib/clinic-time";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getSession, type SessionUser } from "@/lib/session";
import { redirect } from "next/navigation";

const AppLayout = async ({ children }: { children: React.ReactNode }) => {
  const session = await getSession();

  if (!session) redirect("/login");

  const { name, email, image }: SessionUser = session.user;

  /*
   * Read here, where the server can see the environment, and handed down: a
   * client component cannot read `process.env`, so without this every staff-facing
   * screen would render moments in UTC while the server resolved the clinic's real
   * zone — the same record read as two different times. See ADR 0004.
   */
  const clinicZone = clinicTimeZone();

  return (
    <SidebarProvider>
      <AppSidebar user={{ name, email, image }} />
      <SidebarInset>
        <Header />
        {/*
         * The read cache is scoped to the session entitled to it, which is why it
         * is mounted here and not in the root layout: signing out unmounts it, so
         * the next clinician to use this terminal reads nothing from the last
         * one's cache. Keyed on the session id for the same reason, since a
         * replaced session is a new identity rather than a re-render.
         */}
        <QueryProvider key={session.session.id}>
          <ClinicTimeZoneProvider zone={clinicZone}>
            <div className="p-6 min-h-10/12">{children}</div>
          </ClinicTimeZoneProvider>
        </QueryProvider>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default AppLayout;
