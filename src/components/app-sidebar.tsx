"use client";
import {
  // AudioWaveform,
  CalendarDays,
  // Command,
  Fullscreen,
  // GalleryVerticalEnd,
  Microscope,
  Pill,
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
  // teams: [
  //   {
  //     name: "Acme Inc",
  //     logo: GalleryVerticalEnd,
  //     plan: "Enterprise",
  //   },
  //   {
  //     name: "Acme Corp.",
  //     logo: AudioWaveform,
  //     plan: "Startup",
  //   },
  //   {
  //     name: "Evil Corp.",
  //     logo: Command,
  //     plan: "Free",
  //   },
  // ],
  navMain: [
    {
      title: "Patients",
      url: "/patients",
      icon: User,
      isActive: false,
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
          title: "Report",
          url: "/patients/reports",
        },
      ],
    },
    {
      title: "Appointments",
      url: "#",
      icon: CalendarDays,
      isActive: false,
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
          title: "Report",
          url: "/appointments/reports",
        },
      ],
    },
    {
      title: "Laboratory",
      url: "/lab",
      icon: Microscope,
      isActive: false,
      items: [
        {
          title: "Requests",
          url: "/lab/requests",
        },
        {
          title: "Completed",
          url: "/lab/completed",
        },
      ],
    },
    {
      title: "Medication",
      url: "/medication",
      icon: Pill,
      isActive: false,
      items: [
        {
          title: "Requests",
          url: "/medication/requests",
        },
        {
          title: "Completed",
          url: "/medication/completed",
        },
      ],
    },
    {
      title: "Imaging",
      url: "/imaging",
      icon: Fullscreen,
      isActive: false,
      items: [
        {
          title: "Requests",
          url: "/imaging/requests",
        },
        {
          title: "Completed",
          url: "/imaging/completed",
        },
      ],
    },
    {
      title: "Inventory",
      url: "#",
      icon: Store,
      isActive: false,
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
          title: "Report",
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
        {/* <div className="items-center gap-2">SSHP</div> */}
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
