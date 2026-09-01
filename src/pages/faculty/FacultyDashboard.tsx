import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, Users, ClipboardList, MessageSquare } from "lucide-react";
import { useFacultyClub, useFacultyStats } from "@/hooks/use-dashboard-api";
import { Skeleton } from "@/components/ui/skeleton";
import FacultyBudget from "@/components/dashboard/FacultyBudget";
import EventsTable from "@/components/dashboard/EventsTable";

const FacultyDashboard = () => {
  const { data: club, isLoading: clubLoading } = useFacultyClub();
  const { data: stats, isLoading: statsLoading } = useFacultyStats();

  const isLoading = clubLoading || statsLoading;

  // ✅ HANDLE NO CLUB ASSIGNED
  if (!clubLoading && !club) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6 text-center">
            No Club Assigned
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 bg-background min-h-screen space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-foreground">
          Faculty Dashboard
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage club activities, events and reports.
        </p>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="shadow-card border border-border bg-card">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm">Total Events</p>
              <h2 className="text-3xl font-bold text-card-foreground">
                {stats?.totalEvents ?? 0}
              </h2>
            </div>
            <CalendarDays className="h-10 w-10 text-blue-500" />
          </CardContent>
        </Card>

        <Card className="shadow-card border border-border bg-card">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm">Pending Events</p>
              <h2 className="text-3xl font-bold text-card-foreground">
                {stats?.pendingEvents ?? 0}
              </h2>
            </div>
            <ClipboardList className="h-10 w-10 text-orange-500" />
          </CardContent>
        </Card>

        <Card className="shadow-card border border-border bg-card">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm">Registrations</p>
              <h2 className="text-3xl font-bold text-card-foreground">
                {stats?.totalRegistrations ?? 0}
              </h2>
            </div>
            <Users className="h-10 w-10 text-green-500" />
          </CardContent>
        </Card>

        <Card className="shadow-card border border-border bg-card">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm">Feedback</p>
              <h2 className="text-3xl font-bold text-card-foreground">
                {stats?.feedbackCount ?? 0}
              </h2>
            </div>
            <MessageSquare className="h-10 w-10 text-purple-500" />
          </CardContent>
        </Card>
      </div>

      {/* CLUB DETAILS */}
      {club && (
        <Card className="shadow-card border border-border bg-card">
          <CardContent className="p-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold text-card-foreground">
                  {club.name}
                </h2>
                <p className="text-muted-foreground mt-2">
                  Faculty Club Overview
                </p>
              </div>

              <div className="flex gap-3">
                <span className="px-4 py-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-full text-sm font-semibold">
                  Active
                </span>
                <span className="px-4 py-1.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 rounded-full text-sm font-semibold">
                  Club
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* BUDGET */}
      {club && (
        <Card className="shadow-card border border-border bg-card">
          <CardContent className="p-6">
            <FacultyBudget
              clubName={club.name}
              allocated={club.budgetAllocated ?? 0}
              used={club.budgetUsed ?? 0}
            />
          </CardContent>
        </Card>
      )}

      {/* EVENTS */}
      <Card className="shadow-card border border-border bg-card">
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold mb-4 text-card-foreground">
            Recent Events
          </h2>
          <EventsTable facultyView />
        </CardContent>
      </Card>
    </div>
  );
};

export default FacultyDashboard;