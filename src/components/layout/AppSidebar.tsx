import {
  Search, Briefcase, AlertTriangle, FileText, Settings,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
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
  SidebarFooter,
} from '@/components/ui/sidebar';
import { SidebarTrigger } from '@/components/ui/sidebar';

export function AppSidebar() {
  const { t } = useTranslation();

  const navItems = [
    { title: t('nav.screen'), url: '/screen', icon: Search },
    { title: t('nav.cases'), url: '/cases', icon: Briefcase },
    { title: t('nav.alerts'), url: '/alerts', icon: AlertTriangle },
    { title: t('nav.reports'), url: '/reports', icon: FileText },
    { title: t('nav.admin'), url: '/admin', icon: Settings },
  ];

  return (
    <Sidebar collapsible="icon">
      <div className="h-14 flex items-center px-4 border-b border-sidebar-border gap-2">
        <SidebarTrigger />
        <span className="font-bold text-sidebar-primary text-lg group-data-[collapsible=icon]:hidden">
          AML Screening
        </span>
      </div>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t('nav.navigation')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.url}>
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
      <SidebarFooter />
    </Sidebar>
  );
}
