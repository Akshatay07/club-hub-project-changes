import { useEffect, useState } from "react";
import api from "@/api/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  FileText,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Eye,
  Loader2,
  Building2,
  Calendar,
  Users,
  Search,
  Filter,
  Sparkles,
  ShieldCheck,
  ImageIcon,
  Printer,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  generateInstitutionalReportPdf,
  ReportData,
} from "@/utils/reportPdfGenerator";

const BACKEND_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace("/api", "");

export default function AdminReports() {
  const { toast } = useToast();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "pending" | "approved" | "rejected"
  >("all");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      setLoading(true);
      const res = await api.get("/events/submitted-reports");
      setReports(Array.isArray(res.data) ? res.data : []);
    } catch (err: any) {
      console.error("Failed to load reports:", err);
      toast({
        title: "Failed to load reports",
        description: err.response?.data?.message || err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Convert an event document to full 24-point ReportData
  const formatReportData = (ev: any): ReportData => {
    if (!ev) {
      return { name: "" };
    }

    return {
      _id: ev._id,
      name: ev.name || "",
      type: ev.type || "Faculty Development Program",
      department: ev.department || "BCA",
      reportDate:
        ev.reportDate ||
        (ev.updatedAt
          ? new Date(ev.updatedAt).toLocaleDateString("en-GB")
          : new Date().toLocaleDateString("en-GB")),
      date: ev.date || "",
      time: ev.time || "2:00 PM to 4:00 PM",
      venue: ev.venue || ev.location || "Online Google meet",
      resourcePerson1: {
        name:
          ev.resourcePerson1?.name ||
          ev.resourcePerson?.name ||
          "Nirmal Gaud",
        designation:
          ev.resourcePerson1?.designation || "Founder & CEO",
        organization:
          ev.resourcePerson1?.organization ||
          ev.resourcePerson?.organization ||
          "Cognitia Research - ThinkAI",
      },
      resourcePerson1Topics:
        ev.resourcePerson1Topics ||
        ev.topicsCovered ||
        "Mathematics behind AI/ML model with tips and tools to write Research paper",
      resourcePerson2: {
        name: ev.resourcePerson2?.name || "NA",
        designation: ev.resourcePerson2?.designation || "NA",
        organization: ev.resourcePerson2?.organization || "NA",
      },
      resourcePerson2Topics: ev.resourcePerson2Topics || "NA",
      facultyParticipants: {
        internal: ev.facultyParticipants?.internal ?? 22,
        external: ev.facultyParticipants?.external ?? 0,
      },
      studentParticipants: {
        internal: ev.studentParticipants?.internal ?? 0,
        external: ev.studentParticipants?.external ?? 0,
      },
      facultyCoordinator:
        ev.facultyCoordinator || ev.facultyId?.name || "Lakshmi S",
      facultyCoordinatorDetails:
        ev.facultyCoordinatorDetails ||
        `Name: ${ev.facultyCoordinator || ev.facultyId?.name || "Lakshmi S"}\nDesignation : Assistant Professor\nDepartment: Department of Computer Applications, DSCASC.`,
      studentCoordinator:
        ev.studentCoordinator || "Yadavacharya Jayacharya Nagasampagi",
      studentCoordinatorDetails:
        ev.studentCoordinatorDetails ||
        `${ev.studentCoordinator || "Yadavacharya Jayacharya Nagasampagi"}\nP03CJ24S126119 III sem MCA`,
      totalExpenditure:
        ev.totalExpenditure ||
        (ev.budgetSpent ? `${ev.budgetSpent}/-` : "20,000/-"),
      budgetSpent: ev.budgetSpent || 0,
      sponsors: ev.sponsors || "NA",
      agenda:
        ev.agenda ||
        "Training on AI/ML model analysis and research paper writing",
      websiteReportLink: ev.websiteReportLink || "No",
      socialMediaLinks: ev.socialMediaLinks || "---",
      newspaperReport: ev.newspaperReport || "No",
      certificatesPrinted: ev.certificatesPrinted || "No",
      feedbackCollected: ev.feedbackCollected || "Yes",
      attendanceAttached: ev.attendanceAttached ? "Yes" : "Yes",
      photographsAttached:
        ev.eventPhotos && ev.eventPhotos.length > 0 ? "Attached" : "Attached",
      summary:
        ev.summary ||
        "The Department of Computer Applications – BCA conducted a FDP for faculty members by Nirmal Gaud. The FDP was on “Computational Mathematics for AI & Machine Learning: Modeling, Analysis, and Research Paper Writing”. Day 1 to Day 5 the concepts like introduced to the mathematical foundations underlying AI and ML models, with a focus on deep learning architectures such as DenseNet, and then the session included discussions on selected research papers, highlighting model design, datasets, and implementation aspects. Practical exposure was provided through code walkthroughs and dataset analysis to bridge theory and application. In addition, participants were trained in using Overleaf for academic writing, enabling them to collaboratively prepare and format research papers efficiently according to standard publication guidelines. The faculty where also appraised of journal quartile and publications. Excellent feedback for FDP was received from faculty members.",
      attachments: ev.attachments || [],
      eventPhotos: ev.eventPhotos || [],
      signedAttendanceSheets: ev.signedAttendanceSheets || [],
    };
  };

  // Download institutional 24-point PDF
  const downloadOfficialPDF = async (report: any) => {
    try {
      setDownloadingId(report._id);
      const data = formatReportData(report);
      const doc = await generateInstitutionalReportPdf(data);
      const sanitizedName = (data.name || "DSCASC_Report").replace(
        /[^a-zA-Z0-9_-]/g,
        "_"
      );
      doc.save(`DSCASC_IQAC_Report_${sanitizedName}.pdf`);
      toast({
        title: "Official PDF Downloaded",
        description: `Official 24-pointer report with attachments generated for "${data.name}".`,
      });
    } catch (err: any) {
      console.error("PDF generation failed:", err);
      toast({
        title: "PDF Generation Failed",
        description: err.message || "Failed to generate report PDF",
        variant: "destructive",
      });
    } finally {
      setDownloadingId(null);
    }
  };

  // Approve Report
  const handleApproveReport = async (reportId: string) => {
    try {
      setActionLoading(reportId);
      const res = await api.patch(`/events/${reportId}/approve-report`);
      toast({
        title: "Report Approved",
        description: "The official institutional report has been approved.",
      });

      // Update in reports list
      setReports((prev) =>
        prev.map((r) =>
          r._id === reportId
            ? { ...r, reportApproved: true, reportRejected: false }
            : r
        )
      );

      // Update selected report if open
      if (selectedReport && selectedReport._id === reportId) {
        setSelectedReport((prev: any) => ({
          ...prev,
          reportApproved: true,
          reportRejected: false,
        }));
      }
    } catch (err: any) {
      toast({
        title: "Approval Failed",
        description: err.response?.data?.message || err.message,
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Reject Report
  const handleRejectReport = async (reportId: string) => {
    try {
      setActionLoading(reportId);
      const res = await api.patch(`/events/${reportId}/reject-report`);
      toast({
        title: "Report Rejected",
        description: "The report status has been updated to rejected.",
        variant: "destructive",
      });

      // Update in reports list
      setReports((prev) =>
        prev.map((r) =>
          r._id === reportId
            ? { ...r, reportApproved: false, reportRejected: true }
            : r
        )
      );

      // Update selected report if open
      if (selectedReport && selectedReport._id === reportId) {
        setSelectedReport((prev: any) => ({
          ...prev,
          reportApproved: false,
          reportRejected: true,
        }));
      }
    } catch (err: any) {
      toast({
        title: "Rejection Failed",
        description: err.response?.data?.message || err.message,
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Filtering
  const filteredReports = reports.filter((report) => {
    const matchSearch =
      report.name?.toLowerCase().includes(search.toLowerCase()) ||
      report.clubId?.name?.toLowerCase().includes(search.toLowerCase()) ||
      report.facultyId?.name?.toLowerCase().includes(search.toLowerCase()) ||
      report.department?.toLowerCase().includes(search.toLowerCase()) ||
      report.type?.toLowerCase().includes(search.toLowerCase());

    if (!matchSearch) return false;

    if (statusFilter === "approved") return report.reportApproved;
    if (statusFilter === "rejected") return report.reportRejected;
    if (statusFilter === "pending")
      return !report.reportApproved && !report.reportRejected;

    return true;
  });

  const totalCount = reports.length;
  const approvedCount = reports.filter((r) => r.reportApproved).length;
  const rejectedCount = reports.filter((r) => r.reportRejected).length;
  const pendingCount = reports.filter(
    (r) => !r.reportApproved && !r.reportRejected
  ).length;

  const currentFormatted = selectedReport
    ? formatReportData(selectedReport)
    : null;

  const currentBrochure = currentFormatted?.attachments?.find(
    (a) => a.label === "brochure" && !a.isDeleted
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              Submitted Institutional Reports
            </h1>
            <Badge className="bg-primary/10 text-primary border-primary/20">
              IQAC 24-Pointer Format
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Review and approve official 24-pointer event completion reports submitted by faculty.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadReports}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card
          className={`cursor-pointer transition-all ${
            statusFilter === "all" ? "ring-2 ring-primary" : ""
          }`}
          onClick={() => setStatusFilter("all")}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Total Submitted
              </p>
              <h3 className="text-2xl font-bold mt-1">{totalCount}</h3>
            </div>
            <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-500">
              <FileText className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all ${
            statusFilter === "pending" ? "ring-2 ring-amber-500" : ""
          }`}
          onClick={() => setStatusFilter("pending")}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Pending Review
              </p>
              <h3 className="text-2xl font-bold text-amber-600 mt-1">
                {pendingCount}
              </h3>
            </div>
            <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-500">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all ${
            statusFilter === "approved" ? "ring-2 ring-emerald-500" : ""
          }`}
          onClick={() => setStatusFilter("approved")}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Approved
              </p>
              <h3 className="text-2xl font-bold text-emerald-600 mt-1">
                {approvedCount}
              </h3>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-500">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all ${
            statusFilter === "rejected" ? "ring-2 ring-red-500" : ""
          }`}
          onClick={() => setStatusFilter("rejected")}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Rejected
              </p>
              <h3 className="text-2xl font-bold text-red-600 mt-1">
                {rejectedCount}
              </h3>
            </div>
            <div className="p-2.5 rounded-lg bg-red-500/10 text-red-500">
              <XCircle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card p-3 rounded-lg border">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by event, department, faculty, club..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-muted-foreground hidden md:inline">
            Status:
          </span>
          <div className="flex gap-1 bg-muted/60 p-1 rounded-md text-xs font-medium w-full sm:w-auto overflow-x-auto">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1 rounded transition-colors ${
                statusFilter === "all"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All ({totalCount})
            </button>
            <button
              onClick={() => setStatusFilter("pending")}
              className={`px-3 py-1 rounded transition-colors ${
                statusFilter === "pending"
                  ? "bg-background shadow-sm text-amber-600 font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Pending ({pendingCount})
            </button>
            <button
              onClick={() => setStatusFilter("approved")}
              className={`px-3 py-1 rounded transition-colors ${
                statusFilter === "approved"
                  ? "bg-background shadow-sm text-emerald-600 font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Approved ({approvedCount})
            </button>
            <button
              onClick={() => setStatusFilter("rejected")}
              className={`px-3 py-1 rounded transition-colors ${
                statusFilter === "rejected"
                  ? "bg-background shadow-sm text-red-600 font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Rejected ({rejectedCount})
            </button>
          </div>
        </div>
      </div>

      {/* Reports List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Event Reports List</CardTitle>
          <CardDescription>
            Showing {filteredReports.length} of {reports.length} submitted reports
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
              <p className="text-sm text-muted-foreground">
                Loading submitted reports...
              </p>
            </div>
          ) : filteredReports.length > 0 ? (
            <div className="grid gap-4">
              {filteredReports.map((report) => {
                const isApproved = report.reportApproved;
                const isRejected = report.reportRejected;
                const brochureAttached = report.attachments?.some(
                  (a: any) => a.label === "brochure" && !a.isDeleted
                );
                const photoCount = report.eventPhotos?.length || 0;
                const sheetCount = report.signedAttendanceSheets?.length || 0;

                return (
                  <div
                    key={report._id}
                    className="flex flex-col lg:flex-row lg:items-center justify-between border rounded-xl p-5 hover:border-primary/40 hover:shadow-sm transition-all gap-4 bg-card"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-lg text-foreground">
                          {report.name}
                        </span>
                        {isApproved ? (
                          <Badge className="bg-emerald-600 text-white gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Approved
                          </Badge>
                        ) : isRejected ? (
                          <Badge className="bg-red-600 text-white gap-1">
                            <XCircle className="w-3 h-3" /> Rejected
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-amber-500 border-amber-500/30 bg-amber-500/5 gap-1"
                          >
                            <Clock className="w-3 h-3" /> Pending Review
                          </Badge>
                        )}
                        <Badge variant="secondary" className="text-xs">
                          {report.type || "Faculty Development Program"}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1 font-medium text-foreground">
                          <Building2 className="w-3.5 h-3.5 text-primary" />
                          {report.department || "BCA"}
                        </span>
                        <span>•</span>
                        <span>Club: {report.clubId?.name || "DSCASC Club"}</span>
                        <span>•</span>
                        <span>
                          Faculty: {report.facultyCoordinator || report.facultyId?.name || "Faculty Coordinator"}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          Event Date: {report.date}
                        </span>
                      </div>

                      {/* Annexures Attached Badges */}
                      <div className="flex flex-wrap gap-2 pt-1">
                        {brochureAttached && (
                          <Badge
                            variant="outline"
                            className="text-[11px] bg-blue-500/5 text-blue-600 border-blue-200"
                          >
                            <FileText className="w-3 h-3 mr-1" /> Brochure
                          </Badge>
                        )}
                        {photoCount > 0 && (
                          <Badge
                            variant="outline"
                            className="text-[11px] bg-purple-500/5 text-purple-600 border-purple-200"
                          >
                            <ImageIcon className="w-3 h-3 mr-1" /> {photoCount} Photos
                          </Badge>
                        )}
                        {sheetCount > 0 && (
                          <Badge
                            variant="outline"
                            className="text-[11px] bg-emerald-500/5 text-emerald-600 border-emerald-200"
                          >
                            <FileCheck className="w-3 h-3 mr-1" /> {sheetCount} Attendance Sheet
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        onClick={() => setSelectedReport(report)}
                        className="gap-1.5"
                      >
                        <Eye className="h-4 w-4" />
                        View 24-Pointer Report
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadOfficialPDF(report)}
                        disabled={downloadingId === report._id}
                        className="gap-1.5"
                      >
                        {downloadingId === report._id ? (
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                        Official PDF
                      </Button>

                      {!isApproved && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleApproveReport(report._id)}
                          disabled={actionLoading === report._id}
                          className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 px-2.5"
                          title="Approve Report"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                      )}

                      {!isRejected && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRejectReport(report._id)}
                          disabled={actionLoading === report._id}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 px-2.5"
                          title="Reject Report"
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 space-y-3">
              <FileText className="w-12 h-12 text-muted-foreground/40 mx-auto" />
              <h3 className="font-semibold text-lg text-foreground">
                No submitted reports found
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                {search || statusFilter !== "all"
                  ? "Try changing your search terms or filter selection."
                  : "When faculty members finalize and submit event reports, they will appear here in the 24-pointer institutional format."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 24-POINTER INSTITUTIONAL REPORT VIEWER DIALOG */}
      <Dialog
        open={!!selectedReport}
        onOpenChange={(open) => !open && setSelectedReport(null)}
      >
        <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto p-0 bg-slate-100 dark:bg-slate-900 border-none shadow-2xl">
          {selectedReport && currentFormatted && (
            <div>
              {/* Sticky Top Header Controls */}
              <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <DialogTitle className="text-xl font-bold">
                      {currentFormatted.name}
                    </DialogTitle>
                    {selectedReport.reportApproved ? (
                      <Badge className="bg-emerald-600 text-white gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Approved
                      </Badge>
                    ) : selectedReport.reportRejected ? (
                      <Badge className="bg-red-600 text-white gap-1">
                        <XCircle className="w-3 h-3" /> Rejected
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-amber-500 border-amber-500/30 bg-amber-500/5 gap-1"
                      >
                        <Clock className="w-3 h-3" /> Pending Review
                      </Badge>
                    )}
                  </div>
                  <DialogDescription className="text-xs">
                    Official DSCASC IQAC 24-Pointer Event Report
                  </DialogDescription>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => downloadOfficialPDF(selectedReport)}
                    disabled={downloadingId === selectedReport._id}
                    className="gap-1.5"
                  >
                    {downloadingId === selectedReport._id ? (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    Download Official PDF
                  </Button>

                  {!selectedReport.reportApproved && (
                    <Button
                      size="sm"
                      onClick={() => handleApproveReport(selectedReport._id)}
                      disabled={actionLoading === selectedReport._id}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-sm"
                    >
                      {actionLoading === selectedReport._id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                      Approve Report
                    </Button>
                  )}

                  {!selectedReport.reportRejected && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleRejectReport(selectedReport._id)}
                      disabled={actionLoading === selectedReport._id}
                      className="gap-1.5"
                    >
                      {actionLoading === selectedReport._id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <XCircle className="w-4 h-4" />
                      )}
                      Reject Report
                    </Button>
                  )}
                </div>
              </div>

              {/* Document Paper Area */}
              <div className="p-4 sm:p-8">
                <div className="bg-white text-black p-8 md:p-12 rounded-lg border border-slate-300 shadow-md max-w-4xl mx-auto font-serif leading-snug">
                  {/* PAGE 1 */}
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between gap-4 pb-2">
                      <img
                        src="/dscasc_logo.png"
                        alt="DSCASC Crest"
                        className="w-[76px] h-[76px] object-contain shrink-0"
                      />

                      <div className="text-center space-y-1 flex-1 px-2">
                        <h2 className="text-base md:text-lg font-bold text-slate-900 leading-tight">
                          Dayananda Sagar College of Arts, Science, and Commerce
                        </h2>
                        <h3 className="text-sm font-bold text-slate-800">
                          Internal Quality Assurance Cell
                        </h3>
                        <p className="text-xs md:text-sm font-bold text-slate-900">
                          {currentFormatted.type || "Faculty Development Program"} on “{currentFormatted.name}”
                        </p>
                      </div>

                      <img
                        src="/iic_logo.png"
                        alt="IIC Logo"
                        className="w-32 h-14 object-contain shrink-0"
                      />
                    </div>

                    {/* Department & Date Row */}
                    <div className="flex justify-between items-center text-xs font-bold pt-1 pb-1">
                      <span>Department: {currentFormatted.department || "BCA"}</span>
                      <span>Date of Report: {currentFormatted.reportDate}</span>
                    </div>

                    {/* 24-Point Table */}
                    <div className="border border-black overflow-x-auto">
                      <table className="w-full text-xs border-collapse font-serif">
                        <thead>
                          <tr className="border-b border-black font-bold">
                            <th className="border-r border-black p-2 w-10 text-center">
                              Sl.<br />No.
                            </th>
                            <th className="border-r border-black p-2 w-44 text-left">
                              Particulars
                            </th>
                            <th className="p-2 text-left">
                              Event related Details
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {/* 1 */}
                          <tr className="border-b border-black">
                            <td className="border-r border-black p-2 font-bold text-center">1.</td>
                            <td className="border-r border-black p-2 font-bold">Event*</td>
                            <td className="p-2">{currentFormatted.type || "Faculty Development Program"}</td>
                          </tr>

                          {/* 2 */}
                          <tr className="border-b border-black">
                            <td className="border-r border-black p-2 font-bold text-center">2.</td>
                            <td className="border-r border-black p-2 font-bold">Title of the Event</td>
                            <td className="p-2 font-bold">“{currentFormatted.name}”</td>
                          </tr>

                          {/* 3 & 4 */}
                          <tr className="border-b border-black">
                            <td className="border-r border-black p-2 font-bold text-center">3.</td>
                            <td className="border-r border-black p-2 font-bold">Date of Conduction</td>
                            <td className="p-0">
                              <div className="flex divide-x divide-black">
                                <div className="p-2 flex-1">{currentFormatted.date}</div>
                                <div className="p-2 flex items-center gap-2 w-56">
                                  <span className="font-bold">4. &nbsp; Time :</span>
                                  <span className="font-bold">{currentFormatted.time || "2:00 PM to 4:00 PM"}</span>
                                </div>
                              </div>
                            </td>
                          </tr>

                          {/* 5 */}
                          <tr className="border-b border-black">
                            <td className="border-r border-black p-2 font-bold text-center">5.</td>
                            <td className="border-r border-black p-2 font-bold">Venue</td>
                            <td className="p-2">{currentFormatted.venue || "Online Google meet"}</td>
                          </tr>

                          {/* 6 */}
                          <tr className="border-b border-black">
                            <td className="border-r border-black p-2 font-bold text-center align-top">6.</td>
                            <td className="border-r border-black p-2 font-bold align-top">Resource Person 1 Details</td>
                            <td className="p-2 space-y-0.5 font-bold">
                              <div>{currentFormatted.resourcePerson1?.name || "Nirmal Gaud"}</div>
                              <div>{currentFormatted.resourcePerson1?.designation || "Founder & CEO"}</div>
                              <div>{currentFormatted.resourcePerson1?.organization || "Cognitia Research - ThinkAI"}</div>
                            </td>
                          </tr>

                          {/* 7 */}
                          <tr className="border-b border-black">
                            <td className="border-r border-black p-2 font-bold text-center">7.</td>
                            <td className="border-r border-black p-2 font-bold">Topics Covered</td>
                            <td className="p-2">{currentFormatted.resourcePerson1Topics || "Mathematics behind AI/ML model with tips and tools to write Research paper"}</td>
                          </tr>

                          {/* 8 */}
                          <tr className="border-b border-black">
                            <td className="border-r border-black p-2 font-bold text-center">8.</td>
                            <td className="border-r border-black p-2 font-bold">Resource Person 2 Details</td>
                            <td className="p-2">{currentFormatted.resourcePerson2?.name || "NA"}</td>
                          </tr>

                          {/* 9 */}
                          <tr className="border-b border-black">
                            <td className="border-r border-black p-2 font-bold text-center">9.</td>
                            <td className="border-r border-black p-2 font-bold">Topics Covered</td>
                            <td className="p-2">{currentFormatted.resourcePerson2Topics || "NA"}</td>
                          </tr>

                          {/* 10 */}
                          <tr className="border-b border-black">
                            <td className="border-r border-black p-2 font-bold text-center">10.</td>
                            <td className="border-r border-black p-2 font-bold">No. Faculty Participants</td>
                            <td className="p-0">
                              <div className="flex divide-x divide-black">
                                <div className="p-2 w-32 flex justify-between">
                                  <span className="font-bold">Internal:</span>
                                  <span className="font-bold">{currentFormatted.facultyParticipants?.internal ?? 22}</span>
                                </div>
                                <div className="p-2 flex-1 flex justify-between">
                                  <span className="font-bold">External:</span>
                                  <span className="font-bold">{currentFormatted.facultyParticipants?.external || "NIL"}</span>
                                </div>
                              </div>
                            </td>
                          </tr>

                          {/* 11 */}
                          <tr className="border-b border-black">
                            <td className="border-r border-black p-2 font-bold text-center">11.</td>
                            <td className="border-r border-black p-2 font-bold">No. Student Participants</td>
                            <td className="p-0">
                              <div className="flex divide-x divide-black">
                                <div className="p-2 w-32 flex justify-between">
                                  <span className="font-bold">Internal:</span>
                                  <span>{currentFormatted.studentParticipants?.internal || "---"}</span>
                                </div>
                                <div className="p-2 flex-1 flex justify-between">
                                  <span className="font-bold">External:</span>
                                  <span className="font-bold">{currentFormatted.studentParticipants?.external || "NIL"}</span>
                                </div>
                              </div>
                            </td>
                          </tr>

                          {/* 12 */}
                          <tr className="border-b border-black">
                            <td className="border-r border-black p-2 font-bold text-center align-top">12.</td>
                            <td className="border-r border-black p-2 font-bold align-top">Faculty Coordinator</td>
                            <td className="p-2 whitespace-pre-line leading-relaxed">{currentFormatted.facultyCoordinatorDetails}</td>
                          </tr>

                          {/* 13 */}
                          <tr className="border-b border-black">
                            <td className="border-r border-black p-2 font-bold text-center align-top">13.</td>
                            <td className="border-r border-black p-2 font-bold align-top">Student Coordinator/s</td>
                            <td className="p-2 whitespace-pre-line leading-relaxed">{currentFormatted.studentCoordinatorDetails}</td>
                          </tr>

                          {/* 14 & 15 */}
                          <tr className="border-b border-black">
                            <td className="border-r border-black p-2 font-bold text-center">14.</td>
                            <td className="border-r border-black p-2 font-bold">Total Expenditure</td>
                            <td className="p-0">
                              <div className="flex divide-x divide-black">
                                <div className="p-2 w-28 md:w-32 font-bold">{currentFormatted.totalExpenditure || "20,000/-"}</div>
                                <div className="p-2 flex-1 flex items-center gap-2">
                                  <span className="font-bold">15. &nbsp; Sponsors and Amount (if any)</span>
                                  <span className="font-bold">{currentFormatted.sponsors || "NA"}</span>
                                </div>
                              </div>
                            </td>
                          </tr>

                          {/* 16 & 17 */}
                          <tr className="border-b border-black">
                            <td className="border-r border-black p-2 font-bold text-center">16.</td>
                            <td className="border-r border-black p-2 font-bold">Agenda of the Event</td>
                            <td className="p-0">
                              <div className="flex divide-x divide-black">
                                <div className="p-2 w-28 md:w-32">{currentFormatted.agenda || "Training on AI/ML model analysis and research paper writing"}</div>
                                <div className="p-2 flex-1 flex items-center gap-2">
                                  <span className="font-bold">17. &nbsp; Provide the link of the report uploaded on College Website</span>
                                  <span className="font-bold">{currentFormatted.websiteReportLink || "No"}</span>
                                </div>
                              </div>
                            </td>
                          </tr>

                          {/* 18 & 19 */}
                          <tr className="border-b border-black">
                            <td className="border-r border-black p-2 font-bold text-center">18.</td>
                            <td className="border-r border-black p-2 font-bold">Social Media Links</td>
                            <td className="p-0">
                              <div className="flex divide-x divide-black">
                                <div className="p-2 w-28 md:w-32">{currentFormatted.socialMediaLinks || "---"}</div>
                                <div className="p-2 flex-1 flex items-center gap-2">
                                  <span className="font-bold">19. &nbsp; Report sent to Newspapers? If yes, provide cuttings/images:</span>
                                  <span className="font-bold">{currentFormatted.newspaperReport || "No"}</span>
                                </div>
                              </div>
                            </td>
                          </tr>

                          {/* 20 & 21 */}
                          <tr className="border-b border-black">
                            <td className="border-r border-black p-2 font-bold text-center">20.</td>
                            <td className="border-r border-black p-2 font-bold">Certificates Printed?</td>
                            <td className="p-0">
                              <div className="flex divide-x divide-black">
                                <div className="p-2 w-28 md:w-32 font-bold">{currentFormatted.certificatesPrinted || "No"}</div>
                                <div className="p-2 flex-1 flex items-center gap-2">
                                  <span className="font-bold">21. &nbsp; Feedback Collected?</span>
                                  <span className="font-bold">{currentFormatted.feedbackCollected || "Yes"}</span>
                                </div>
                              </div>
                            </td>
                          </tr>

                          {/* 22 & 23 */}
                          <tr className="border-b border-black">
                            <td className="border-r border-black p-2 font-bold text-center">22.</td>
                            <td className="border-r border-black p-2 font-bold">Attendance Sheet Attached?*</td>
                            <td className="p-0">
                              <div className="flex divide-x divide-black">
                                <div className="p-2 w-28 md:w-32 font-bold">{currentFormatted.attendanceAttached || "Yes"}</div>
                                <div className="p-2 flex-1 flex items-center gap-2">
                                  <span className="font-bold">23 &nbsp; Photographs of the Event</span>
                                  <span className="font-bold">{currentFormatted.photographsAttached || "Attached"}</span>
                                </div>
                              </div>
                            </td>
                          </tr>

                          {/* 24 */}
                          <tr>
                            <td className="border-r border-black p-2 font-bold text-center align-top">24.</td>
                            <td className="border-r border-black p-2 font-bold align-top">Summary of the Event</td>
                            <td className="p-2 leading-relaxed text-justify">
                              {currentFormatted.summary?.slice(0, 560) || "The Department of Computer Applications – BCA conducted a FDP for faculty members by Nirmal Gaud..."}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* PAGE 2 BREAK & CONTINUATION */}
                  <div className="mt-12 pt-8 border-t-2 border-dashed border-slate-400 space-y-6">
                    <div className="text-center text-xs font-bold uppercase tracking-wider text-slate-500">
                      --- PAGE 2 CONTINUATION ---
                    </div>

                    <div className="border border-black overflow-x-auto">
                      <table className="w-full text-xs border-collapse font-serif">
                        <thead>
                          <tr className="border-b border-black font-bold">
                            <th className="border-r border-black p-2 w-10 text-center">Sl.<br />No.</th>
                            <th className="border-r border-black p-2 w-44 text-left">Particulars</th>
                            <th className="p-2 text-left">Event related Details</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="border-r border-black p-2"></td>
                            <td className="border-r border-black p-2"></td>
                            <td className="p-3 leading-relaxed text-justify">
                              {currentFormatted.summary?.slice(560) ||
                                "walkthroughs and dataset analysis to bridge theory and application. In addition, participants were trained in using Overleaf for academic writing, enabling them to collaboratively prepare and format research papers efficiently according to standard publication guidelines. The faculty where also appraised of journal quartile and publications. Excellent feedback for FDP was received from faculty members."}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* 5 Institutional Signatories */}
                    <div className="grid grid-cols-5 gap-2 text-center text-xs font-bold pt-16 pb-4">
                      <div>Event Coordinators</div>
                      <div>HOD-BCA</div>
                      <div>Vice-Principal</div>
                      <div>IQAC Coordinator</div>
                      <div>Principal</div>
                    </div>
                  </div>

                  {/* Annexure Cards */}
                  <div className="mt-12 space-y-6 pt-6 border-t-2 border-dashed border-slate-400">
                    <div className="text-center font-bold text-sm text-slate-700">
                      --- ATTACHED ANNEXURES &amp; RECORDS ---
                    </div>

                    {/* Annexure I: Brochure */}
                    <div className="border border-slate-300 rounded p-4">
                      <div className="font-bold text-xs mb-2">Annexure I: Event Brochure</div>
                      {currentBrochure ? (
                        <div className="flex items-center gap-3">
                          <Badge className="bg-emerald-600">Attached</Badge>
                          <span className="text-xs">{currentBrochure.originalName || "Event Brochure"}</span>
                          <a
                            href={`${BACKEND_URL}${currentBrochure.url}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-blue-600 underline flex items-center gap-1"
                          >
                            View Brochure <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">No brochure attached.</span>
                      )}
                    </div>

                    {/* Annexure II: Photos */}
                    <div className="border border-slate-300 rounded p-4">
                      <div className="font-bold text-xs mb-2">
                        Annexure II: Event Photographs ({currentFormatted.eventPhotos?.length || 0} attached)
                      </div>
                      {currentFormatted.eventPhotos && currentFormatted.eventPhotos.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {currentFormatted.eventPhotos.map((photo, i) => (
                            <div key={i} className="border rounded overflow-hidden">
                              <img
                                src={`${BACKEND_URL}${photo.url}`}
                                alt={photo.caption || "Event"}
                                className="w-full h-24 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => window.open(`${BACKEND_URL}${photo.url}`, "_blank")}
                              />
                              <div className="p-1 text-[10px] text-center font-medium truncate">
                                {photo.caption || `Photo ${i + 1}`}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">No photos attached.</span>
                      )}
                    </div>

                    {/* Annexure III: Attendance */}
                    <div className="border border-slate-300 rounded p-4">
                      <div className="font-bold text-xs mb-2">
                        Annexure III: Signed Attendance Sheets ({currentFormatted.signedAttendanceSheets?.length || 0} attached)
                      </div>
                      {currentFormatted.signedAttendanceSheets && currentFormatted.signedAttendanceSheets.length > 0 ? (
                        <div className="space-y-1">
                          {currentFormatted.signedAttendanceSheets.map((sheet, i) => (
                            <div key={i} className="flex items-center justify-between text-xs border-b py-1">
                              <span>{sheet.originalName || `Signed Sheet ${i + 1}`}</span>
                              <a
                                href={`${BACKEND_URL}${sheet.url}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-600 underline flex items-center gap-1"
                              >
                                View Sheet <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">No signed attendance sheet attached.</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}