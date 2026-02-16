import { ReactNode } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { 
  SidebarProvider, 
  SidebarTrigger, 
  Sidebar, 
  SidebarContent, 
  SidebarHeader, 
  SidebarMenu, 
  SidebarMenuItem,
  SidebarMenuButton
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  LayoutDashboard, 
  GraduationCap, 
  Wallet, 
  LogOut,
  User,
  BookOpen
} from 'lucide-react';
import { cn } from '@/lib/utils';

const teacherNavItems = [
  { title: 'My Dashboard', url: '/teacher', icon: LayoutDashboard },
  { title: 'Lesson History', url: '/teacher/mark-lesson', icon: BookOpen },
  { title: 'My Students', url: '/teacher/students', icon: GraduationCap },
  { title: 'My Payroll', url: '/teacher/payroll', icon: Wallet },
];

interface TeacherLayoutProps {
  children: ReactNode;
}

export function TeacherLayout({ children }: TeacherLayoutProps) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <Sidebar className="border-r border-sidebar-border">
          <SidebarHeader className="p-4 border-b border-sidebar-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="font-display font-semibold text-sidebar-foreground">Academy</h2>
                <Badge className="bg-emerald-600 text-white text-xs">TEACHER</Badge>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent className="p-2">
            <SidebarMenu>
              {teacherNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url}
                      end={item.url === '/teacher'}
                      className={({ isActive }) => cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                        isActive 
                          ? "bg-emerald-600/20 text-emerald-400" 
                          : "text-sidebar-foreground hover:bg-sidebar-accent"
                      )}
                    >
                      <item.icon className="w-5 h-5" />
                      {item.title}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
          <div className="mt-auto p-4 border-t border-sidebar-border">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-emerald-600/20 flex items-center justify-center">
                <User className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{profile?.full_name || 'Teacher'}</p>
                <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              className="w-full justify-start text-muted-foreground hover:text-foreground"
              onClick={handleSignOut}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </Sidebar>
        <main className="flex-1 flex flex-col">
          <header className="h-16 border-b border-border flex items-center px-6 bg-emerald-600/5 backdrop-blur-sm sticky top-0 z-10">
            <SidebarTrigger className="mr-4" />
            <div className="flex-1" />
            <Badge variant="outline" className="border-emerald-600 text-emerald-400">
              Teacher View
            </Badge>
          </header>
          <div className="flex-1 p-6 overflow-auto">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
