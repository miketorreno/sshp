"use client";
import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { navigationFor } from "@/components/navigation";
import { usePermissions } from "@/components/permissions-provider";
import type { SessionUser } from "@/lib/session";
// import { NavProjects } from "@/components/nav-projects";
// import { TeamSwitcher } from "@/components/team-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";

export function AppSidebar({
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user: SessionUser
}) {
  /**
   * The navigation this clinician may use, asked of the matrix the server handed
   * down. Filtered here rather than in the layout so a screen under this sidebar
   * asks the same question about its own controls.
   */
  const { can } = usePermissions();

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <div className="items-center gap-2">
          {/* <Link href="/">SSHP</Link> */}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navigationFor(can)} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}