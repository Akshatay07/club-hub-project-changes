import {
  LayoutDashboard,
  Users,
  CalendarDays,
  FileText,
  Settings,
  GraduationCap,
  Sun,
  Moon,
  ClipboardList,
  MessageSquare,
  Bell,
  BarChart3,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { Trash2 } from "lucide-react";


const adminNav = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Clubs", url: "/admin/clubs", icon: Users },
  { title: "Events", url: "/admin/events", icon: CalendarDays },
  { title: "Faculty", url: "/admin/faculty-assignment", icon: GraduationCap }, // ✅ FIXED
    { title: "Messages", url: "/messages", icon: MessageSquare }, 
  { title: "Trash", url: "/admin/trash", icon: Trash2 },
  { title: "Settings", url: "/admin/settings", icon: Settings },
{
  title: "Reports",
  url: "/admin/reports",
  icon: FileText,
},
];

const studentNav = [
  { title: "Events", url: "/student/events", icon: CalendarDays },
  { title: "Clubs", url: "/student/clubs", icon: Users },
  { title: "My Registrations", url: "/student/registrations", icon: ClipboardList },
  { title: "Notifications", url: "/student/notifications", icon: Bell },
    { title: "Messages", url: "/messages", icon: MessageSquare },
  { title: "Profile", url: "/student/profile", icon: GraduationCap },
];

const facultyNav = [
  { title: "Dashboard", url: "/faculty", icon: LayoutDashboard },
  { title: "Events", url: "/faculty/events", icon: CalendarDays },
  { title: "Attendance", url: "/faculty/attendance", icon: ClipboardList },
  { title: "Analytics", url: "/faculty/analytics", icon: BarChart3 },
  { title: "Members", url: "/faculty/members", icon: Users },
  { title: "Feedback", url: "/faculty/feedback", icon: MessageSquare },
    { title: "Messages", url: "/messages", icon: MessageSquare },
  { title: "Reports", url: "/faculty/reports", icon: FileText },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { user, logout } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();

  const toggleTheme = () => setTheme(resolvedTheme === "dark" ? "light" : "dark");

  const role = user?.role ?? "admin";
  const navItems = role === "student" ? studentNav : role === "faculty" ? facultyNav : adminNav;
  const panelLabel = role === "student" ? "Student Portal" : role === "faculty" ? "Faculty Panel" : "Admin Panel";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-3 py-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-gradient-primary shrink-0">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-sidebar-foreground truncate">College Clubs</p>
              <p className="text-xs text-sidebar-foreground/60 truncate">{panelLabel}</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location.pathname.startsWith(item.url)}>
                    <NavLink
                      to={item.url}
                      end
                      className="hover:bg-sidebar-accent/50"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3 space-y-2">
        <Button
          variant="ghost"
          size={collapsed ? "icon" : "sm"}
          className={`text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 ${collapsed ? "h-8 w-8 mx-auto" : "w-full justify-start gap-2"}`}
          onClick={toggleTheme}
        >
          {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {!collapsed && (resolvedTheme === "dark" ? "Light Mode" : "Dark Mode")}
        </Button>

        {!collapsed && user && (
          <div className="flex items-center justify-between">
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{user.name}</p>
              <p className="text-xs text-sidebar-foreground/60 truncate">{user.email}</p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-sidebar-foreground/60 hover:text-sidebar-foreground" onClick={logout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}
        {collapsed && (
          <Button variant="ghost" size="icon" className="h-8 w-8 mx-auto text-sidebar-foreground/60" onClick={logout}>
            <LogOut className="h-4 w-4" />
          </Button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
