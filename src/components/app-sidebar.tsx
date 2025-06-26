"use client";
import {
  AudioWaveform,
  CalendarDays,
  Command,
  GalleryVerticalEnd,
  Store,
  User,
} from "lucide-react";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
// import { NavProjects } from "@/components/nav-projects";
// import { TeamSwitcher } from "@/components/team-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";

const data = {
  user: {
    name: "Admin",
    email: "admin@sshp.com",
    avatar: "/avatars/shadcn.jpg",
  },
  teams: [
    {
      name: "Acme Inc",
      logo: GalleryVerticalEnd,
      plan: "Enterprise",
    },
    {
      name: "Acme Corp.",
      logo: AudioWaveform,
      plan: "Startup",
    },
    {
      name: "Evil Corp.",
      logo: Command,
      plan: "Free",
    },
  ],
  navMain: [
    {
      title: "Patients",
      url: "/patients",
      icon: User,
      isActive: true,
      items: [
        {
          title: "Add Patient",
          url: "/patients/add",
        },
        {
          title: "All Patients",
          url: "/patients/all",
        },
        {
          title: "Outpatients",
          url: "/patients/outpatients",
        },
        {
          title: "Admitted",
          url: "/patients/admitted",
        },
        {
          title: "Reports",
          url: "/patients/reports",
        },
      ],
    },
    {
      title: "Scheduling",
      url: "#",
      icon: CalendarDays,
      isActive: true,
      items: [
        {
          title: "Add Appointment",
          url: "/appointments/add",
        },
        {
          title: "All Appointments",
          url: "/appointments/all",
        },
        {
          title: "Appointments Calendar",
          url: "/appointments/calendar",
        },
        {
          title: "Reports",
          url: "/appointments/reports",
        },
      ],
    },
    {
      title: "Inventory",
      url: "#",
      icon: Store,
      isActive: true,
      items: [
        {
          title: "Add Item",
          url: "/inventory/items/add",
        },
        {
          title: "All Items",
          url: "/inventory/items",
        },
        {
          title: "Add Request",
          url: "/inventory/requests/add",
        },
        {
          title: "All Requests",
          url: "/inventory/requests",
        },
        {
          title: "Received",
          url: "/inventory/received",
        },
        {
          title: "Reports",
          url: "/inventory/reports",
        },
      ],
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        {/* <TeamSwitcher teams={data.teams} /> */}
        {/* <div className="items-center gap-2">SS</div> */}
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
