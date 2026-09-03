import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import ResetPassword from "./pages/ResetPassword";
import AdminReports from "./pages/AdminReports";
import MediaDocuments from "@/pages/MediaDocuments";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/DashboardLayout";
import Settings from "./pages/Settings";
import Messages from "./pages/Messages";
// Pages
import VerifyOtp from "./pages/VerifyOtp";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import SetPassword from "./pages/SetPassword";

// Admin
import Index from "./pages/Index";
import Clubs from "./pages/Clubs";
import Events from "./pages/Events";
import Reports from "./pages/faculty/FacultyReports";
import TrashPage from "@/pages/TrashPage";

// Student
import StudentEvents from "./pages/student/StudentEvents";
import StudentClubs from "./pages/student/StudentClubs";
import StudentMyRegistrations from "./pages/student/StudentMyRegistrations";
import StudentProfile from "./pages/student/StudentProfile";
import StudentNotifications from "./pages/student/StudentNotifications";

// Faculty
import FacultyDashboard from "./pages/faculty/FacultyDashboard";
import FacultyEvents from "./pages/faculty/FacultyEvents";
import FacultyMembers from "./pages/faculty/FacultyMembers";
import FacultyFeedback from "./pages/faculty/FacultyFeedback";
import FacultyAttendance from "./pages/faculty/FacultyAttendance";
import FacultyAnalytics from "./pages/faculty/FacultyAnalytics";
import FacultyAssignment from "@/pages/FacultyAssignment";

const queryClient = new QueryClient();

/* ================= ROLE ROUTE ================= */
const RoleRoute = ({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles: string[];
}) => {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  if (!allowedRoles.includes(user.role)) {
    if (user.role === "admin") return <Navigate to="/admin" replace />;
    if (user.role === "faculty") return <Navigate to="/faculty" replace />;
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

/* ================= LOGIN ROUTE ================= */
const LoginRoute = () => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;

  if (user) {
    let target = "/login";

    if (user.role === "admin") target = "/admin";
    else if (user.role === "faculty") target = "/faculty";
    else target = "/login";

    if (location.pathname !== target) {
      return <Navigate to={target} replace />;
    }
  }

  return <Login />;
};

/* ================= APP ================= */
const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
<Route path="/reset-password" element={<ResetPassword />} />
              {/* AUTH */}
              <Route path="/login" element={<LoginRoute />} />
              <Route path="/verify-otp" element={<VerifyOtp />} />
              <Route path="/set-password/:token" element={<SetPassword />} />

              {/* ROOT */}
              <Route path="/" element={<LoginRoute />} />
<Route path="/messages" element={<Messages />} />

<Route path="/faculty/events/:eventId/attendance" element={<FacultyAttendance />} />
              {/* ================= ADMIN ================= */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute>
                    <RoleRoute allowedRoles={["admin"]}>
                      <DashboardLayout>
                        <Index />
                      </DashboardLayout>
                    </RoleRoute>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/settings"
                element={
                  <ProtectedRoute>
                    <RoleRoute allowedRoles={["admin"]}>
                      <DashboardLayout>
                        <Settings />
                      </DashboardLayout>
                    </RoleRoute>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/media"
                element={
                  <ProtectedRoute>
                    <RoleRoute allowedRoles={["admin"]}>
                      <DashboardLayout>
                        <MediaDocuments />
                      </DashboardLayout>
                    </RoleRoute>
                  </ProtectedRoute>
                }
              />

<Route
  path="/admin/trash"
  element={
    <ProtectedRoute>
      <RoleRoute allowedRoles={["admin"]}>
        <DashboardLayout>
          <TrashPage />
        </DashboardLayout>
      </RoleRoute>
    </ProtectedRoute>
  }
/>

              <Route
                path="/admin/clubs"
                element={
                  <ProtectedRoute>
                    <RoleRoute allowedRoles={["admin"]}>
                      <DashboardLayout>
                        <Clubs />
                      </DashboardLayout>
                    </RoleRoute>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/events"
                element={
                  <ProtectedRoute>
                    <RoleRoute allowedRoles={["admin"]}>
                      <DashboardLayout>
                        <Events />
                      </DashboardLayout>
                    </RoleRoute>
                  </ProtectedRoute>
                }
              />

<Route
  path="/admin/reports"
  element={
    <ProtectedRoute>
      <RoleRoute allowedRoles={["admin"]}>
        <DashboardLayout>
          <AdminReports />
        </DashboardLayout>
      </RoleRoute>
    </ProtectedRoute>
  }
/>
              

              <Route
                path="/admin/faculty-assignment"
                element={
                  <ProtectedRoute>
                    <RoleRoute allowedRoles={["admin"]}>
                      <DashboardLayout>
                        <FacultyAssignment />
                      </DashboardLayout>
                    </RoleRoute>
                  </ProtectedRoute>
                }
              />

              {/* ================= FACULTY ================= */}
              <Route
                path="/faculty"
                element={
                  <ProtectedRoute>
                    <RoleRoute allowedRoles={["faculty"]}>
                      <DashboardLayout>
                        <FacultyDashboard />
                      </DashboardLayout>
                    </RoleRoute>
                  </ProtectedRoute>
                }
              />

<Route
  path="/faculty/reports"
  element={
    <ProtectedRoute>
      <RoleRoute allowedRoles={["faculty"]}>
        <DashboardLayout>
          <Reports />
        </DashboardLayout>
      </RoleRoute>
    </ProtectedRoute>
  }
/>

              <Route
                path="/faculty/events"
                element={
                  <ProtectedRoute>
                    <RoleRoute allowedRoles={["faculty"]}>
                      <DashboardLayout>
                        <FacultyEvents />
                      </DashboardLayout>
                    </RoleRoute>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/faculty/members"
                element={
                  <ProtectedRoute>
                    <RoleRoute allowedRoles={["faculty"]}>
                      <DashboardLayout>
                        <FacultyMembers />
                      </DashboardLayout>
                    </RoleRoute>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/faculty/feedback"
                element={
                  <ProtectedRoute>
                    <RoleRoute allowedRoles={["faculty"]}>
                      <DashboardLayout>
                        <FacultyFeedback />
                      </DashboardLayout>
                    </RoleRoute>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/faculty/attendance"
                element={
                  <ProtectedRoute>
                    <RoleRoute allowedRoles={["faculty"]}>
                      <DashboardLayout>
                        <FacultyAttendance />
                      </DashboardLayout>
                    </RoleRoute>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/faculty/analytics"
                element={
                  <ProtectedRoute>
                    <RoleRoute allowedRoles={["faculty"]}>
                      <DashboardLayout>
                        <FacultyAnalytics />
                      </DashboardLayout>
                    </RoleRoute>
                  </ProtectedRoute>
                }
              />

              {/* ================= STUDENT ================= */}
              <Route
                path="/student"
                element={
                  <ProtectedRoute>
                    <RoleRoute allowedRoles={["student"]}>
                      <DashboardLayout>
                        <StudentEvents />
                      </DashboardLayout>
                    </RoleRoute>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/student/events"
                element={
                  <ProtectedRoute>
                    <RoleRoute allowedRoles={["student"]}>
                      <DashboardLayout>
                        <StudentEvents />
                      </DashboardLayout>
                    </RoleRoute>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/student/clubs"
                element={
                  <ProtectedRoute>
                    <RoleRoute allowedRoles={["student"]}>
                      <DashboardLayout>
                        <StudentClubs />
                      </DashboardLayout>
                    </RoleRoute>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/student/registrations"
                element={
                  <ProtectedRoute>
                    <RoleRoute allowedRoles={["student"]}>
                      <DashboardLayout>
                        <StudentMyRegistrations />
                      </DashboardLayout>
                    </RoleRoute>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/student/profile"
                element={
                  <ProtectedRoute>
                    <RoleRoute allowedRoles={["student"]}>
                      <DashboardLayout>
                        <StudentProfile />
                      </DashboardLayout>
                    </RoleRoute>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/student/notifications"
                element={
                  <ProtectedRoute>
                    <RoleRoute allowedRoles={["student"]}>
                      <DashboardLayout>
                        <StudentNotifications />
                      </DashboardLayout>
                    </RoleRoute>
                  </ProtectedRoute>
                }
              />

              {/* 404 */}
              <Route path="*" element={<NotFound />} />

            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;