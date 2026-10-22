import React, { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  CalendarDays,
  Clock,
  MapPin,
  TrendingUp,
  Users,
  CheckCircle,
  BarChart3,
  Filter,
  FileText,
  FileSpreadsheet,
  Printer,
  Sparkles,
  Search,
  ExternalLink,
  DollarSign,
  Award,
  Layers,
  Building2,
  ChevronRight,
  Eye,
  RefreshCw,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  Info,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  useFacultyEvents,
  useFacultyRegistrations,
  useFacultyStats,
  useFacultyClub,
} from "@/hooks/use-dashboard-api";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { EventDetailModal } from "@/components/faculty/EventDetailModal";
import { AnnualReportDocumentModal } from "@/components/faculty/AnnualReportDocumentModal";

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

const tooltipStyle = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  fontSize: 12,
};

const MONTHS = [
  { value: 1, label: "January", short: "Jan" },
  { value: 2, label: "February", short: "Feb" },
  { value: 3, label: "March", short: "Mar" },
  { value: 4, label: "April", short: "Apr" },
  { value: 5, label: "May", short: "May" },
  { value: 6, label: "June", short: "Jun" },
  { value: 7, label: "July", short: "Jul" },
  { value: 8, label: "August", short: "Aug" },
  { value: 9, label: "September", short: "Sep" },
  { value: 10, label: "October", short: "Oct" },
  { value: 11, label: "November", short: "Nov" },
  { value: 12, label: "December", short: "Dec" },
];

const MONTH_NAMES = [
  "",
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// Helper to robustly extract year, month, and day from event.date
function parseDateParts(dateStr?: string) {
  if (!dateStr) return null;
  const clean = String(dateStr).trim();
  const m = clean.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m) {
    const y = parseInt(m[1], 10);
    const mo = parseInt(m[2], 10);
    const d = parseInt(m[3], 10);
    return { year: y, month: mo, day: d, dateStr: clean };
  }
  const parsed = new Date(clean);
  if (!isNaN(parsed.getTime())) {
    return {
      year: parsed.getFullYear(),
      month: parsed.getMonth() + 1,
      day: parsed.getDate(),
      dateStr: clean,
    };
  }
  return null;
}

const FacultyAnalytics = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Queries
  const { data: rawEvents, isLoading: eventsLoading, isError: eventsError } = useFacultyEvents();
  const { data: myClub, isLoading: clubLoading } = useFacultyClub();
  const { data: rawRegistrations, isLoading: regsLoading } = useFacultyRegistrations();
  const { data: stats, isLoading: statsLoading } = useFacultyStats();

  // Ensure arrays are guaranteed safe
  const events: any[] = useMemo(() => {
    if (Array.isArray(rawEvents)) return rawEvents;
    if (Array.isArray(rawEvents?.events)) return rawEvents.events;
    return [];
  }, [rawEvents]);

  const registrations: any[] = useMemo(() => {
    if (Array.isArray(rawRegistrations)) return rawRegistrations;
    if (Array.isArray(rawRegistrations?.registrations)) return rawRegistrations.registrations;
    return [];
  }, [rawRegistrations]);

  const isLoading = eventsLoading || regsLoading || statsLoading || clubLoading;

  // Available Years Calculation (Safe)
  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>();
    const currentYear = new Date().getFullYear() || 2026;
    yearsSet.add(currentYear);
    yearsSet.add(currentYear - 1);
    yearsSet.add(currentYear + 1);

    if (Array.isArray(events)) {
      events.forEach((e: any) => {
        const parts = parseDateParts(e?.date);
        if (parts?.year) {
          yearsSet.add(parts.year);
        }
      });
    }

    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [events]);

  // Filters State
  const defaultYear = availableYears.includes(2026) ? 2026 : availableYears[0] || 2026;
  const [selectedYear, setSelectedYear] = useState<number>(defaultYear);
  const [startMonth, setStartMonth] = useState<number>(1); // Jan
  const [endMonth, setEndMonth] = useState<number>(12); // Dec
  const [isAllTime, setIsAllTime] = useState<boolean>(false);
  const [statusFilter, setStatusFilter] = useState<string>("all"); // "all" | "approved" | "reports"
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modals state
  const [selectedEventForModal, setSelectedEventForModal] = useState<any | null>(null);
  const [isEventDetailOpen, setIsEventDetailOpen] = useState<boolean>(false);
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState<boolean>(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState<string>("report");

  // Period label
  const periodLabel = useMemo(() => {
    if (isAllTime) return "All Time (Complete History)";
    const startName = MONTH_NAMES[startMonth] || "Jan";
    const endName = MONTH_NAMES[endMonth] || "Dec";
    const yr = selectedYear || 2026;

    if (startMonth <= endMonth) {
      if (startMonth === 1 && endMonth === 12) {
        return `Calendar Year ${yr} (Jan – Dec)`;
      }
      return `${startName} ${yr} – ${endName} ${yr}`;
    } else {
      return `Academic Year ${yr}–${String(yr + 1).slice(-2)} (${startName} ${yr} – ${endName} ${yr + 1})`;
    }
  }, [isAllTime, selectedYear, startMonth, endMonth]);

  // Filtered Events (Safe)
  const filteredEvents = useMemo(() => {
    if (!Array.isArray(events)) return [];

    return events.filter((e: any) => {
      if (!e) return false;

      // 1. Date Range Filter
      if (!isAllTime) {
        const parts = parseDateParts(e?.date);
        if (!parts) return false;
        const { year: eYear, month: eMonth } = parts;

        if (startMonth <= endMonth) {
          // Intra-year
          if (eYear !== selectedYear || eMonth < startMonth || eMonth > endMonth) {
            return false;
          }
        } else {
          // Cross-year academic period (e.g. June 2025 - May 2026)
          const inStartYear = eYear === selectedYear && eMonth >= startMonth;
          const inNextYear = eYear === selectedYear + 1 && eMonth <= endMonth;
          if (!inStartYear && !inNextYear) {
            return false;
          }
        }
      }

      // 2. Status Filter
      if (statusFilter === "approved") {
        if (e.status !== "approved") return false;
      } else if (statusFilter === "reports") {
        if (!e.reportApproved && !e.reportSubmitted) return false;
      }

      // 3. Search Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = (e.name || "").toLowerCase().includes(q);
        const matchesType = (e.type || "").toLowerCase().includes(q);
        const matchesVenue = (e.venue || e.location || "").toLowerCase().includes(q);
        const matchesSpeaker = (e.resourcePerson1?.name || "").toLowerCase().includes(q);
        const matchesSdg = (e.alignedSDG || "").toLowerCase().includes(q);
        if (!matchesName && !matchesType && !matchesVenue && !matchesSpeaker && !matchesSdg) {
          return false;
        }
      }

      return true;
    });
  }, [events, isAllTime, selectedYear, startMonth, endMonth, statusFilter, searchQuery]);

  // Aggregate Calculations for Filtered Period (Safe)
  const periodStats = useMemo(() => {
    const list = Array.isArray(filteredEvents) ? filteredEvents : [];
    const totalEventsCount = list.length;
    const totalAttendees = list.reduce(
      (sum, e) => sum + (e?.attendanceCount || 0),
      0
    );
    const totalRegistered = list.reduce(
      (sum, e) => sum + (e?.registeredCount || 0),
      0
    );
    const totalFacultyParticipants = list.reduce((sum, e) => {
      const f = e?.facultyParticipants || {};
      return sum + (f?.internal || 0) + (f?.external || 0);
    }, 0);
    const totalStudents = list.reduce((sum, e) => {
      const s = e?.studentParticipants || {};
      return sum + (s?.internal || 0) + (s?.external || 0);
    }, 0) || totalAttendees;

    const totalExpenditure = list.reduce((sum, e) => {
      const val = Number(e?.totalExpenditure || e?.budgetSpent || e?.budgetApproved || 0);
      return sum + (isNaN(val) ? 0 : val);
    }, 0);

    const overallRate = totalRegistered
      ? Math.round((totalAttendees / totalRegistered) * 100)
      : 0;

    const reportsApprovedCount = list.filter((e) => e?.reportApproved).length;
    const reportsSubmittedCount = list.filter(
      (e) => e?.reportApproved || e?.reportSubmitted
    ).length;

    // Category breakdown
    const categoryCounts: Record<string, number> = {};
    list.forEach((e) => {
      const cat = e?.type || "General";
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    return {
      totalEventsCount,
      totalAttendees,
      totalRegistered,
      totalFacultyParticipants,
      totalStudents,
      totalExpenditure,
      overallRate,
      reportsApprovedCount,
      reportsSubmittedCount,
      complianceRate: totalEventsCount
        ? Math.round((reportsSubmittedCount / totalEventsCount) * 100)
        : 0,
      categoryCounts,
    };
  }, [filteredEvents]);

  // Chart Data Calculations (Safe)
  const eventAttendance = useMemo(() => {
    const list = Array.isArray(filteredEvents) ? filteredEvents : [];
    const regList = Array.isArray(registrations) ? registrations : [];

    return list.slice(0, 10).map((e: any) => {
      const eventRegs = regList.filter(
        (r: any) => r?.event?._id === e?._id || r?.eventId === e?._id
      );
      const attended = eventRegs.filter(
        (r: any) => r?.status === "attended"
      ).length || e?.attendanceCount || 0;
      const regCount = eventRegs.length || e?.registeredCount || 0;

      return {
        name: e?.name?.length > 14 ? e.name.slice(0, 14) + "…" : e?.name ?? "—",
        fullName: e?.name || "",
        registered: regCount,
        attended,
        rate: regCount ? Math.round((attended / regCount) * 100) : 0,
      };
    });
  }, [filteredEvents, registrations]);

  const statusCounts = useMemo(() => {
    const regList = Array.isArray(registrations) ? registrations : [];
    return regList.reduce((acc: any, r: any) => {
      const key = r?.status ?? "unknown";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [registrations]);

  const statusPie = useMemo(() => {
    return Object.entries(statusCounts).map(([name, value]) => ({
      name,
      value,
    }));
  }, [statusCounts]);

  const monthlyTrend = useMemo(() => {
    const evList = Array.isArray(events) ? events : [];
    const regList = Array.isArray(registrations) ? registrations : [];

    return evList
      .reduce((acc: any[], e: any) => {
        if (!e?.date) return acc;
        const month = String(e.date).slice(0, 7);
        const eventRegs = regList.filter(
          (r: any) => r?.event?._id === e?._id || r?.eventId === e?._id
        );
        const attended = eventRegs.filter(
          (r: any) => r?.status === "attended"
        ).length || e?.attendanceCount || 0;
        const regCount = eventRegs.length || e?.registeredCount || 0;

        const existing = acc.find((m) => m.month === month);
        if (existing) {
          existing.registrations += regCount;
          existing.attended += attended;
        } else {
          acc.push({
            month,
            registrations: regCount,
            attended,
          });
        }
        return acc;
      }, [])
      .sort((a: any, b: any) => a.month.localeCompare(b.month))
      .map((m: any) => {
        let displayMonth = m.month;
        try {
          const d = new Date(m.month + "-01");
          if (!isNaN(d.getTime())) {
            displayMonth = d.toLocaleDateString("en", {
              month: "short",
              year: "2-digit",
            });
          }
        } catch {
          // fallback
        }
        return {
          ...m,
          month: displayMonth,
          rate: m.registrations
            ? Math.round((m.attended / m.registrations) * 100)
            : 0,
        };
      });
  }, [events, registrations]);

  // CSV Export Handler
  const handleExportCsv = () => {
    const currentClubName = myClub?.name || "Club";
    const headers = [
      "Sl No",
      "Event Name",
      "Date",
      "Time",
      "Nature / Type",
      "Venue",
      "Resource Person",
      "Organization",
      "Participants Attended",
      "Participants Registered",
      "Turnout Rate (%)",
      "Aligned SDG",
      "Expenditure (INR)",
      "Status",
      "24-Point Report Status",
    ];

    const rows = filteredEvents.map((e: any, idx: number) => {
      const exp = e?.totalExpenditure || e?.budgetSpent || e?.budgetApproved || 0;
      const att = e?.attendanceCount || 0;
      const reg = e?.registeredCount || 0;
      const rate = reg ? Math.round((att / reg) * 100) : 0;
      const speaker = e?.resourcePerson1?.name || "";
      const org = e?.resourcePerson1?.organization || "";
      const repStatus = e?.reportApproved
        ? "Approved"
        : e?.reportSubmitted
        ? "Submitted"
        : "Draft";

      return [
        idx + 1,
        `"${(e?.name || "").replace(/"/g, '""')}"`,
        `"${e?.date || ""}"`,
        `"${e?.time || ""}"`,
        `"${e?.type || ""}"`,
        `"${(e?.venue || e?.location || "").replace(/"/g, '""')}"`,
        `"${speaker.replace(/"/g, '""')}"`,
        `"${org.replace(/"/g, '""')}"`,
        att,
        reg,
        `"${rate}%"`,
        `"${e?.alignedSDG || ""}"`,
        exp,
        `"${e?.status || ""}"`,
        `"${repStatus}"`,
      ];
    });

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [
        `# Annual Activity Report - ${currentClubName} (${periodLabel})`,
        headers.join(","),
        ...rows.map((r) => r.join(",")),
      ].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Annual_Report_${currentClubName.replace(/\s+/g, "_")}_${periodLabel.replace(
        /[^a-zA-Z0-9]/g,
        "_"
      )}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clubName = myClub?.name || "Assigned Club";
  const departmentName = user?.department || myClub?.department || "Computer Science / BCA";

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Faculty Analytics & Reports
            </h1>
            <Badge className="bg-primary/10 text-primary border-primary/20">
              <Building2 className="w-3.5 h-3.5 mr-1" />
              {clubName}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground flex flex-wrap items-center gap-2">
            <span>Faculty Coordinator: <strong className="text-foreground">{user?.name || "Faculty"}</strong></span>
            <span>•</span>
            <span>Department: <strong className="text-foreground">{departmentName}</strong></span>
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="gap-1.5 text-xs h-9"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Export CSV
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => setIsDocumentModalOpen(true)}
            className="gap-1.5 text-xs h-9 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm font-semibold"
          >
            <FileText className="w-4 h-4" />
            Annual Cell Report
          </Button>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <TabsList className="bg-muted/70 p-1">
            <TabsTrigger value="report" className="gap-2 text-xs sm:text-sm">
              <Calendar className="w-4 h-4 text-primary" />
              Annual / Period Activity Report
            </TabsTrigger>
            <TabsTrigger value="charts" className="gap-2 text-xs sm:text-sm">
              <BarChart3 className="w-4 h-4 text-primary" />
              Visual Trends & Charts
            </TabsTrigger>
          </TabsList>

          <span className="text-xs text-muted-foreground">
            {filteredEvents.length} event{filteredEvents.length === 1 ? "" : "s"} conducted in selected duration
          </span>
        </div>

        {/* TAB 1: ANNUAL ACTIVITY REPORT */}
        <TabsContent value="report" className="space-y-6 m-0">
          {/* Filter Card */}
          <Card className="shadow-card border-border/80 bg-card/60 backdrop-blur">
            <CardHeader className="pb-3 border-b border-border/50">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                    <Filter className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold text-foreground">
                      Period & Annual Report Filters
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">
                      Choose Year, Start Month, and End Month to filter events conducted for {clubName}
                    </CardDescription>
                  </div>
                </div>

                {/* Reset Filters button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsAllTime(false);
                    setSelectedYear(defaultYear);
                    setStartMonth(1);
                    setEndMonth(12);
                    setStatusFilter("all");
                    setSearchQuery("");
                  }}
                  className="h-8 text-xs text-muted-foreground hover:text-foreground"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1" />
                  Reset Filters
                </Button>
              </div>
            </CardHeader>

            <CardContent className="pt-4 space-y-4">
              {/* Dropdown Filters Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* 1. Year Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <CalendarDays className="w-3.5 h-3.5 text-primary" />
                    Select Year
                  </label>
                  <Select
                    value={String(selectedYear || defaultYear)}
                    onValueChange={(val) => {
                      setSelectedYear(parseInt(val, 10));
                      setIsAllTime(false);
                    }}
                  >
                    <SelectTrigger className="h-9 text-xs bg-background">
                      <SelectValue placeholder="Select Year" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableYears.map((yr) => (
                        <SelectItem key={yr} value={String(yr)}>
                          Year {yr}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 2. Start Month */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    Start Month
                  </label>
                  <Select
                    value={String(startMonth)}
                    onValueChange={(val) => {
                      setStartMonth(parseInt(val, 10));
                      setIsAllTime(false);
                    }}
                  >
                    <SelectTrigger className="h-9 text-xs bg-background">
                      <SelectValue placeholder="Start Month" />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((m) => (
                        <SelectItem key={m.value} value={String(m.value)}>
                          {m.label} ({String(m.value).padStart(2, "0")})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 3. End Month */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    End Month
                  </label>
                  <Select
                    value={String(endMonth)}
                    onValueChange={(val) => {
                      setEndMonth(parseInt(val, 10));
                      setIsAllTime(false);
                    }}
                  >
                    <SelectTrigger className="h-9 text-xs bg-background">
                      <SelectValue placeholder="End Month" />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((m) => (
                        <SelectItem key={m.value} value={String(m.value)}>
                          {m.label} ({String(m.value).padStart(2, "0")})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 4. Event Status Filter */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                    Conducted / Status
                  </label>
                  <Select
                    value={statusFilter}
                    onValueChange={setStatusFilter}
                  >
                    <SelectTrigger className="h-9 text-xs bg-background">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Events in Period</SelectItem>
                      <SelectItem value="approved">Approved / Conducted Only</SelectItem>
                      <SelectItem value="reports">With Filed 24-Point Report</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Active Filter Period Pill & Live Search */}
              <div className="pt-2 border-t border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs">
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 font-semibold">
                    Active Period
                  </Badge>
                  <span className="font-semibold text-foreground">
                    {periodLabel}
                  </span>
                  <span className="text-muted-foreground">
                    • {filteredEvents.length} event{filteredEvents.length === 1 ? "" : "s"} match
                  </span>
                </div>

                {/* Search Bar */}
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                  <Input
                    placeholder="Search event, guest, venue..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 pl-8 text-xs bg-background"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-2 text-xs text-muted-foreground hover:text-foreground"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Single Summary KPI Card: Total Events Conducted */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="shadow-card border-border/80 bg-gradient-to-br from-card to-card/50">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                    Total Events Conducted
                  </span>
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <Calendar className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-foreground">
                    {periodStats.totalEventsCount}
                  </span>
                  <span className="text-xs text-muted-foreground">in selected period</span>
                </div>
                <span className="text-[11px] text-muted-foreground mt-1 block">
                  {periodStats.reportsSubmittedCount} documented report{periodStats.reportsSubmittedCount === 1 ? "" : "s"} filed
                </span>
              </CardContent>
            </Card>
          </div>

          {/* Conducted Events Table Card */}
          <Card className="shadow-card border-border">
            <CardHeader className="pb-3 border-b border-border">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    Conducted Club Events ({filteredEvents.length})
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Events organized by {clubName} during {periodLabel}
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsDocumentModalOpen(true)}
                    className="gap-1.5 text-xs h-8 font-medium"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Annual Cell Report
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full rounded-lg" />
                  ))}
                </div>
              ) : filteredEvents.length === 0 ? (
                <div className="py-16 px-4 text-center space-y-3">
                  <div className="p-3 w-12 h-12 rounded-full bg-muted mx-auto flex items-center justify-center text-muted-foreground">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-foreground">
                    No Events Found for Selected Period
                  </h3>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto">
                    No events were recorded for {clubName} between{" "}
                    <strong>{periodLabel}</strong>. Adjust the year or month filters above, or view all time.
                  </p>
                  <div className="flex justify-center gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsAllTime(true)}
                      className="text-xs"
                    >
                      View All Events
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => navigate("/faculty/events")}
                      className="text-xs"
                    >
                      Create or Schedule Event
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-muted/50 text-muted-foreground font-semibold border-b border-border">
                      <tr>
                        <th className="py-3.5 px-3 w-[4%] text-center">#</th>
                        <th className="py-3.5 px-4 w-[16%] min-w-[130px]">Date & Time</th>
                        <th className="py-3.5 px-4 w-[34%] min-w-[200px]">Event Title & Nature</th>
                        <th className="py-3.5 px-4 w-[20%] min-w-[150px]">Venue</th>
                        <th className="py-3.5 px-4 w-[10%] text-right whitespace-nowrap">Expenditure</th>
                        <th className="py-3.5 px-4 w-[11%] text-center whitespace-nowrap">Report Status</th>
                        <th className="py-3.5 px-4 w-[11%] text-center whitespace-nowrap">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredEvents.map((event: any, idx: number) => {
                        const rawExp =
                          event?.totalExpenditure ?? event?.budgetSpent ?? event?.budgetApproved ?? 0;
                        const expenditure = Number.isFinite(Number(rawExp)) ? Number(rawExp) : 0;

                        return (
                          <tr
                            key={event?._id || idx}
                            className="hover:bg-muted/30 transition-colors group"
                          >
                            {/* Sl. No */}
                            <td className="py-3.5 px-3 text-center font-medium text-muted-foreground">
                              {idx + 1}
                            </td>

                            {/* Date & Time */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <div className="font-semibold text-foreground flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-primary opacity-80" />
                                {event?.date || "Date TBA"}
                              </div>
                              <div className="text-[11px] text-muted-foreground pl-5">
                                {event?.time} {event?.endTime ? `– ${event.endTime}` : ""}
                              </div>
                            </td>

                            {/* Event Title & Nature */}
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-foreground text-sm group-hover:text-primary transition-colors">
                                {event?.name}
                              </div>
                              {event?.type && (
                                <div className="mt-1">
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-normal">
                                    {event.type}
                                  </Badge>
                                </div>
                              )}
                            </td>

                            {/* Venue */}
                            <td className="py-3.5 px-4">
                              <span className="flex items-center gap-1.5 text-foreground">
                                <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                <span className="truncate max-w-[220px]">
                                  {event?.venue || event?.location || "Campus"}
                                </span>
                              </span>
                            </td>

                            {/* Expenditure */}
                            <td className="py-3.5 px-4 text-right font-medium text-foreground whitespace-nowrap">
                              ₹{expenditure.toLocaleString("en-IN")}
                            </td>

                            {/* Report Status */}
                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                              {event?.reportApproved ? (
                                <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-semibold">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Approved
                                </Badge>
                              ) : event?.reportSubmitted ? (
                                <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30 text-[10px] font-semibold">
                                  <Clock className="w-3 h-3 mr-1" />
                                  Submitted
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-muted-foreground text-[10px]">
                                  Draft
                                </Badge>
                              )}
                            </td>

                            {/* Actions */}
                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedEventForModal(event);
                                    setIsEventDetailOpen(true);
                                  }}
                                  className="h-7 px-2.5 text-xs text-primary hover:bg-primary/10"
                                  title="View full event details"
                                >
                                  <Eye className="w-3.5 h-3.5 mr-1" />
                                  Details
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => navigate(`/faculty/reports?eventId=${event?._id}`)}
                                  className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                  title="Open 24-point Institutional Report"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Category & Distribution Cards Row removed as requested */}
        </TabsContent>

        {/* TAB 2: VISUAL TRENDS & CHARTS */}
        <TabsContent value="charts" className="space-y-6 m-0">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="shadow-card">
              <CardContent className="pt-5 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total Registrations</p>
                  <p className="text-2xl font-bold text-foreground">
                    {registrations.length}
                  </p>
                </div>
                <Users className="h-7 w-7 text-[hsl(var(--chart-1))] opacity-80" />
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardContent className="pt-5 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total Attended</p>
                  <p className="text-2xl font-bold text-foreground">
                    {registrations.filter((r: any) => r?.status === "attended").length}
                  </p>
                </div>
                <CheckCircle className="h-7 w-7 text-[hsl(var(--chart-3))] opacity-80" />
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardContent className="pt-5 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Overall Attendance Rate</p>
                  <p className="text-2xl font-bold text-foreground">
                    {registrations.length
                      ? Math.round(
                          (registrations.filter((r: any) => r?.status === "attended").length /
                            registrations.length) *
                            100
                        )
                      : 0}
                    %
                  </p>
                </div>
                <TrendingUp className="h-7 w-7 text-[hsl(var(--chart-2))] opacity-80" />
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardContent className="pt-5 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total Events (All-Time)</p>
                  <p className="text-2xl font-bold text-foreground">
                    {events.length || stats?.totalEvents || 0}
                  </p>
                </div>
                <BarChart3 className="h-7 w-7 text-[hsl(var(--chart-4))] opacity-80" />
              </CardContent>
            </Card>
          </div>

          {/* Charts Row 1: Attendance by Event & Status Pie */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Attendance by Event Bar Chart */}
            <Card className="shadow-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Attendance by Event</CardTitle>
                <CardDescription className="text-xs">
                  Registered vs Attended participants for recent events
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[280px] w-full rounded-lg" />
                ) : eventAttendance.length ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={eventAttendance} barGap={4}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      />
                      <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar
                        dataKey="registered"
                        name="Registered"
                        fill="hsl(var(--chart-1))"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="attended"
                        name="Attended"
                        fill="hsl(var(--chart-3))"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-muted-foreground py-12">No event attendance data yet.</p>
                )}
              </CardContent>
            </Card>

            {/* Registration Status Distribution */}
            <Card className="shadow-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Registration Status Distribution</CardTitle>
                <CardDescription className="text-xs">
                  Proportion of registered vs attended students
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[280px] w-full rounded-lg" />
                ) : statusPie.length ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={statusPie}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={95}
                        paddingAngle={4}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {statusPie.map((_, idx) => (
                          <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-muted-foreground py-12">No registration records found.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Charts Row 2: Monthly Attendance Trend Line Chart */}
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Monthly Attendance Trend</CardTitle>
              <CardDescription className="text-xs">
                Turnout percentage over calendar months
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[280px] w-full rounded-lg" />
              ) : monthlyTrend.length ? (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                      unit="%"
                      domain={[0, 100]}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(val: number) => [`${val}%`, "Attendance Rate"]}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line
                      type="monotone"
                      dataKey="rate"
                      name="Attendance Rate (%)"
                      stroke="hsl(var(--chart-2))"
                      strokeWidth={2.5}
                      dot={{ r: 5 }}
                      activeDot={{ r: 7 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-muted-foreground py-12">
                  Not enough historical event data to render monthly trends.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <EventDetailModal
        event={selectedEventForModal}
        isOpen={isEventDetailOpen}
        onClose={() => {
          setIsEventDetailOpen(false);
          setSelectedEventForModal(null);
        }}
        clubName={clubName}
      />

      <AnnualReportDocumentModal
        isOpen={isDocumentModalOpen}
        onClose={() => setIsDocumentModalOpen(false)}
        clubName={clubName}
        department={departmentName}
        facultyName={user?.name || "Faculty Coordinator"}
        periodLabel={periodLabel}
        year={selectedYear}
        events={filteredEvents}
        onExportCsv={handleExportCsv}
      />
    </div>
  );
};

export default FacultyAnalytics;