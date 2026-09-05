import { Button } from "@/components/ui/button";
import { FileText, Megaphone } from "lucide-react";
import MetricsCards from "@/components/dashboard/MetricsCards";
import ClubStatus from "@/components/dashboard/ClubStatus";
import QuickStats from "@/components/dashboard/QuickStats";
import EventsChart from "@/components/dashboard/EventsChart";
import EventsTable from "@/components/dashboard/EventsTable";
import ComplaintsFeed from "@/components/dashboard/ComplaintsFeed";
import DayFlowCalendar from "@/components/dashboard/DayFlowCalendar";

const Index = () => {
  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Overview of all club activities</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <FileText className="h-4 w-4" /> Generate Report
          </Button>
          <Button size="sm" className="gap-2 bg-gradient-primary border-0 hover:opacity-90">
            <Megaphone className="h-4 w-4" /> Send Announcement
          </Button>
        </div>
      </div>

      <MetricsCards />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ClubStatus />
        <QuickStats />
      </div>

      <EventsChart />
      <DayFlowCalendar />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <EventsTable />
        </div>
        <ComplaintsFeed />
      </div>
    </div>
  );
};

export default Index;
