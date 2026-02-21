import {
  Search, Briefcase, AlertTriangle, FileText, Settings,
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';

const navItems = [
  { title: 'Screen', url: '/screen', icon: Search },
  { title: 'Cases', url: '/cases', icon: Briefcase },
  { title: 'Alerts', url: '/alerts', icon: AlertTriangle },
  { title: 'Reports', url: '/reports', icon: FileText },
  { title: 'Admin', url: '/admin', icon: Settings },
];

export function AppSidebar() {
  return (
    <Sidebar collapsible="icon">
      <div className="h-14 flex items-center px-4 border-b border-sidebar-border">
        <span className="font-bold text-sidebar-primary text-lg group-data-[collapsible=icon]:hidden">
          World-Check One
        </span>
      </div>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      className="hover:bg-sidebar-accent/50"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
