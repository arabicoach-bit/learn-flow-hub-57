import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

// Auth pages
import Auth from "./pages/Auth";
import Unauthorized from "./pages/Unauthorized";

// Admin pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import Students from "./pages/Students";
import StudentDetail from "./pages/StudentDetail";
import Leads from "./pages/Leads";
import Teachers from "./pages/Teachers";
import TeacherDetail from "./pages/TeacherDetail";
import ClassDetail from "./pages/ClassDetail";
import Payments from "./pages/Payments";
import Lessons from "./pages/Lessons";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Notifications from "./pages/Notifications";

// Teacher pages
import TeacherDashboard from "./pages/teacher/TeacherDashboard";
import TeacherMarkLesson from "./pages/teacher/TeacherMarkLesson";
import TeacherStudents from "./pages/teacher/TeacherStudents";
import TeacherPayroll from "./pages/teacher/TeacherPayroll";
import TeacherSchedule from "./pages/teacher/TeacherSchedule";

import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Root redirect based on role
function RootRedirect() {
  const { user, role, loading } = useAuth();
  
  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (role === 'admin') return <Navigate to="/admin" replace />;
  if (role === 'teacher') return <Navigate to="/teacher" replace />;
  return <Navigate to="/auth" replace />;
}

const AppRoutes = () => (
  <Routes>
    {/* Public routes */}
    <Route path="/auth" element={<Auth />} />
    <Route path="/unauthorized" element={<Unauthorized />} />
    
    {/* Root redirect */}
    <Route path="/" element={<RootRedirect />} />
    
    {/* Admin routes */}
    <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
    <Route path="/admin/students" element={<ProtectedRoute allowedRoles={['admin']}><Students /></ProtectedRoute>} />
    <Route path="/admin/students/:id" element={<ProtectedRoute allowedRoles={['admin']}><StudentDetail /></ProtectedRoute>} />
    <Route path="/admin/leads" element={<ProtectedRoute allowedRoles={['admin']}><Leads /></ProtectedRoute>} />
    <Route path="/admin/teachers" element={<ProtectedRoute allowedRoles={['admin']}><Teachers /></ProtectedRoute>} />
    <Route path="/admin/teachers/:id" element={<ProtectedRoute allowedRoles={['admin']}><TeacherDetail /></ProtectedRoute>} />
    <Route path="/admin/payments" element={<ProtectedRoute allowedRoles={['admin']}><Payments /></ProtectedRoute>} />
    <Route path="/admin/lessons" element={<ProtectedRoute allowedRoles={['admin']}><Lessons /></ProtectedRoute>} />
    <Route path="/admin/reports" element={<ProtectedRoute allowedRoles={['admin']}><Reports /></ProtectedRoute>} />
    <Route path="/admin/settings" element={<ProtectedRoute allowedRoles={['admin']}><Settings /></ProtectedRoute>} />
    <Route path="/admin/classes/:id" element={<ProtectedRoute allowedRoles={['admin']}><ClassDetail /></ProtectedRoute>} />
    <Route path="/admin/notifications" element={<ProtectedRoute allowedRoles={['admin']}><Notifications /></ProtectedRoute>} />
    
    {/* Teacher routes */}
    <Route path="/teacher" element={<ProtectedRoute allowedRoles={['teacher']}><TeacherDashboard /></ProtectedRoute>} />
    <Route path="/teacher/mark-lesson" element={<ProtectedRoute allowedRoles={['teacher']}><TeacherMarkLesson /></ProtectedRoute>} />
    <Route path="/teacher/students" element={<ProtectedRoute allowedRoles={['teacher']}><TeacherStudents /></ProtectedRoute>} />
    <Route path="/teacher/payroll" element={<ProtectedRoute allowedRoles={['teacher']}><TeacherPayroll /></ProtectedRoute>} />
    <Route path="/teacher/schedule" element={<ProtectedRoute allowedRoles={['teacher']}><TeacherSchedule /></ProtectedRoute>} />
    
    {/* Fallback */}
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
