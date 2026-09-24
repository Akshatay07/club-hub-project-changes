import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  useFacultyEvents,
  useFacultyRegistrations,
} from "@/hooks/use-dashboard-api";
import {
  useMarkAttendance,
  useBulkMarkAttendance,
} from "@/hooks/use-mutations";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import {
  CheckCircle,
  Users,
  CheckCheck,
  Download,
  FileUp,
  FileSpreadsheet,
  FileText,
  ExternalLink,
  Trash2,
  Calendar,
  Clock,
  MapPin,
  Search,
  Loader2,
  XCircle,
  AlertCircle,
  Check,
  Eye,
  Info,
} from "lucide-react";
import api from "@/api/api";

const BACKEND_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace("/api", "");

interface SignedSheet {
  _id?: string;
  fileName: string;
  originalName: string;
  url: string;
  size: number;
  uploadedAt: string;
}

const FacultyAttendance = () => {
  const queryClient = useQueryClient();
  const { data: events = [], isLoading: eventsLoading } = useFacultyEvents();
  const { data: registrations = [], isLoading: regsLoading } = useFacultyRegistrations();

  const markAttendance = useMarkAttendance();
  const bulkMark = useBulkMarkAttendance();
  const { toast } = useToast();

  const [selectedEvent, setSelectedEvent] = useState<string>("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modal States
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isDownloadingRecords, setIsDownloadingRecords] = useState(false);

  // Upload Modal State
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Google Sheet / CSV Import Modal State
  const [importMode, setImportMode] = useState<"url" | "csv">("url");
  const [sheetUrl, setSheetUrl] = useState("");
  const [csvText, setCsvText] = useState("");
  const [isFetchingImport, setIsFetchingImport] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [isApplyingImport, setIsApplyingImport] = useState(false);

  // Auto-select first event when events are loaded
  useEffect(() => {
    if (events.length > 0 && (!selectedEvent || !events.some((e: any) => e._id === selectedEvent))) {
      setSelectedEvent(events[0]._id);
    }
  }, [events, selectedEvent]);

  // Current active event details
  const activeEvent = events.find((e: any) => e._id === selectedEvent);

  // Query signed sheets for current event
  const {
    data: signedSheets = [],
    isLoading: sheetsLoading,
    refetch: refetchSignedSheets,
  } = useQuery<SignedSheet[]>({
    queryKey: ["signed-sheets", selectedEvent],
    queryFn: async () => {
      if (!selectedEvent) return [];
      const res = await api.get(`/faculty/attendance/${selectedEvent}/signed-sheets`);
      return res.data || [];
    },
    enabled: !!selectedEvent,
  });

  // Filter registrations by selected event
  const eventRegistrations =
    registrations?.filter(
      (r: any) => r?.event?._id === selectedEvent
    ) ?? [];

  // Filter by search query (Name or Reg No)
  const filtered = eventRegistrations.filter((r: any) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const nameMatch = r?.student?.name?.toLowerCase().includes(query);
    const regMatch = r?.student?.regNo?.toLowerCase().includes(query);
    return nameMatch || regMatch;
  });

  const attendedCount = eventRegistrations.filter((r: any) => r?.status === "attended").length;
  const absentCount = eventRegistrations.filter((r: any) => r?.status === "absent").length;
  const unattendedFiltered = filtered.filter((r: any) => r?.status !== "attended");

  const allSelected =
    unattendedFiltered.length > 0 &&
    unattendedFiltered.every((r: any) => selectedIds.has(r._id));

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(unattendedFiltered.map((r: any) => r._id)));
    }
  };

  const handleToggleStatus = (reg: any) => {
    const newStatus = reg.status === "attended" ? "absent" : "attended";
    markAttendance.mutate(
      { id: reg._id, status: newStatus },
      {
        onSuccess: () => {
          toast({
            title: `Marked as ${newStatus}`,
            description: `${reg.student?.name || "Student"} marked as ${newStatus}`,
          });
          queryClient.invalidateQueries({ queryKey: ["faculty-registrations"] });
          queryClient.invalidateQueries({ queryKey: ["faculty-events"] });
        },
        onError: (err: any) =>
          toast({
            title: "Error",
            description: err.response?.data?.message || "Failed to update attendance",
            variant: "destructive",
          }),
      }
    );
  };

  const handleBulkMarkStatus = (status: "attended" | "absent") => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;

    bulkMark.mutate(
      { ids, status },
      {
        onSuccess: (data: any) => {
          toast({
            title: `Success`,
            description: `${data.count ?? ids.length} students marked as ${status}`,
          });
          setSelectedIds(new Set());
          queryClient.invalidateQueries({ queryKey: ["faculty-registrations"] });
          queryClient.invalidateQueries({ queryKey: ["faculty-events"] });
        },
        onError: (err: any) =>
          toast({
            title: "Error",
            description: err.response?.data?.message || "Bulk update failed",
            variant: "destructive",
          }),
      }
    );
  };

  // Download Populated Attendance Records PDF for the selected event
  const handleDownloadAttendancePDF = async () => {
    if (!selectedEvent) {
      toast({ title: "Please select an event first", variant: "destructive" });
      return;
    }

    try {
      setIsDownloadingRecords(true);
      const res = await api.get(`/faculty/attendance/${selectedEvent}/records-pdf`, {
        responseType: "blob",
      });
      const file = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(file);
      const a = document.createElement("a");
      a.href = url;
      a.download = `attendance-${activeEvent?.name || "event"}-records.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast({
        title: "Attendance Sheet Downloaded",
        description: `Downloaded attendance ledger with student records for ${activeEvent?.name || "the event"}.`,
      });
    } catch (err: any) {
      toast({
        title: "Download Failed",
        description: err?.response?.data?.message || "Could not generate attendance PDF",
        variant: "destructive",
      });
    } finally {
      setIsDownloadingRecords(false);
    }
  };

  const handleDownloadFeedbackPDF = async () => {
    if (!selectedEvent) return;
    try {
      let res;
      try {
        res = await api.get(`/events/${selectedEvent}/feedback-pdf`, {
          responseType: "blob",
        });
      } catch {
        res = await api.get(`/faculty/events/${selectedEvent}/feedback-pdf`, {
          responseType: "blob",
        });
      }

      if (res.data.type === "application/json") {
        const text = await res.data.text();
        const json = JSON.parse(text);
        throw new Error(json.message || "Failed to generate feedback form");
      }

      const file = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(file);
      const a = document.createElement("a");
      a.href = url;
      a.download = `feedback-form-${(activeEvent?.name || "event").replace(/[^a-zA-Z0-9-_]/g, "_")}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Feedback Form Downloaded",
        description: `Downloaded blank student feedback form for ${activeEvent?.name || "the event"}.`,
      });
    } catch (err: any) {
      toast({
        title: "Download Failed",
        description: err?.message || err?.response?.data?.message || "Could not generate feedback form",
        variant: "destructive",
      });
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (!filtered.length) {
      toast({ title: "No attendance data to export", variant: "destructive" });
      return;
    }
    const headers = ["Sl No", "Student Name", "Registration Number", "Status"];
    const rows = filtered.map((r: any, idx: number) => [
      idx + 1,
      r?.student?.name ?? "—",
      r?.student?.regNo ?? "—",
      r?.status ?? "registered",
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((v: any) => `"${v}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-${activeEvent?.name || "event"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "CSV Exported successfully" });
  };

  // Handle PDF file upload for signed sheet
  const handleUploadSignedSheet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) {
      toast({ title: "Select a specific event first", variant: "destructive" });
      return;
    }
    if (!uploadFile) {
      toast({ title: "Please choose a PDF file to upload", variant: "destructive" });
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("file", uploadFile);

      await api.post(`/faculty/attendance/${selectedEvent}/signed-sheet`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast({
        title: "Signed Sheet Uploaded",
        description: `Successfully uploaded scanned copy: ${uploadFile.name}`,
      });

      setUploadFile(null);
      setIsUploadOpen(false);
      refetchSignedSheets();
      queryClient.invalidateQueries({ queryKey: ["faculty-events"] });
    } catch (err: any) {
      toast({
        title: "Upload Failed",
        description: err?.response?.data?.message || "Failed to upload signed sheet",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Handle delete of signed sheet
  const handleDeleteSignedSheet = async (sheetId: string) => {
    if (!confirm("Are you sure you want to remove this signed attendance sheet?")) return;
    try {
      await api.delete(`/faculty/attendance/${selectedEvent}/signed-sheet/${sheetId}`);
      toast({ title: "Signed sheet removed" });
      refetchSignedSheets();
      queryClient.invalidateQueries({ queryKey: ["faculty-events"] });
    } catch (err: any) {
      toast({
        title: "Delete Failed",
        description: err?.response?.data?.message || "Could not delete file",
        variant: "destructive",
      });
    }
  };

  // Process / Fetch Google Sheet or CSV data
  const handleFetchImport = async (applyDirectly: boolean = false) => {
    if (!selectedEvent) {
      toast({ title: "Please select an event first", variant: "destructive" });
      return;
    }

    if (importMode === "url" && !sheetUrl.trim()) {
      toast({ title: "Please paste a Google Sheets URL", variant: "destructive" });
      return;
    }

    if (importMode === "csv" && !csvText.trim()) {
      toast({ title: "Please paste CSV data or upload a file", variant: "destructive" });
      return;
    }

    try {
      setIsFetchingImport(true);
      const payload: any = {
        applyImmediately: applyDirectly,
      };

      if (importMode === "url") {
        payload.sheetUrl = sheetUrl.trim();
      } else {
        payload.csvData = csvText.trim();
      }

      const res = await api.post(`/faculty/attendance/${selectedEvent}/import-google-sheet`, payload);
      setImportResult(res.data);

      if (applyDirectly) {
        toast({
          title: "Attendance Applied",
          description: `Recorded attendance for ${res.data.matchedCount} students.`,
        });
        queryClient.invalidateQueries({ queryKey: ["faculty-registrations"] });
        queryClient.invalidateQueries({ queryKey: ["faculty-events"] });
        setIsImportOpen(false);
        setImportResult(null);
      } else {
        toast({
          title: "Sheet Parsed",
          description: `Found ${res.data.totalInSheet} rows. ${res.data.matchedCount} student(s) ready to import.`,
        });
      }
    } catch (err: any) {
      toast({
        title: "Import Error",
        description: err?.response?.data?.message || "Could not process sheet data",
        variant: "destructive",
      });
    } finally {
      setIsFetchingImport(false);
    }
  };

  // Confirm applying parsed import
  const handleApplyImport = async () => {
    if (!importResult || !importResult.matchedStudents?.length) return;

    try {
      setIsApplyingImport(true);
      const presentStudentIds = importResult.matchedStudents
        .filter((s: any) => s.status === "attended" && s.studentId)
        .map((s: any) => s.studentId);

      const absentStudentIds = importResult.matchedStudents
        .filter((s: any) => s.status === "absent" && s.studentId)
        .map((s: any) => s.studentId);

      await api.post(`/faculty/attendance/${selectedEvent}/import-google-sheet`, {
        studentsToImport: importResult.matchedStudents,
        presentStudentIds,
        absentStudentIds,
      });

      toast({
        title: "Attendance Updated Successfully",
        description: `Successfully recorded attendance for ${importResult.matchedStudents.length} students.`,
      });

      queryClient.invalidateQueries({ queryKey: ["faculty-registrations"] });
      queryClient.invalidateQueries({ queryKey: ["faculty-events"] });
      setIsImportOpen(false);
      setImportResult(null);
    } catch (err: any) {
      toast({
        title: "Failed to apply",
        description: err?.response?.data?.message || "Error applying attendance",
        variant: "destructive",
      });
    } finally {
      setIsApplyingImport(false);
    }
  };

  const handleCsvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvText(text || "");
      toast({ title: `Loaded ${file.name}` });
    };
    reader.readAsText(file);
  };

  const isBusy = markAttendance.isPending || bulkMark.isPending;
  const isLoading = eventsLoading || regsLoading;

  return (
    <div className="p-6 space-y-6">
      {/* Top Header & Actions Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            Event Attendance Tracking
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Select an event to view student attendance ledger, upload scanned signed sheets, or import Google Sheets.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* BUTTON 1: Upload Signed Sheets (scanned copies as PDF) */}
          <Button
            onClick={() => {
              if (!selectedEvent) {
                toast({ title: "Please select a specific event first", variant: "destructive" });
                return;
              }
              setIsUploadOpen(true);
            }}
            disabled={!selectedEvent}
            className="gap-2 bg-gradient-primary hover:opacity-90 shadow-sm"
          >
            <FileUp className="h-4 w-4" />
            Upload Signed Sheet (PDF)
          </Button>

          {/* BUTTON 2: Import Google Sheets */}
          <Button
            variant="outline"
            onClick={() => {
              if (!selectedEvent) {
                toast({ title: "Please select a specific event first", variant: "destructive" });
                return;
              }
              setImportResult(null);
              setIsImportOpen(true);
            }}
            disabled={!selectedEvent}
            className="gap-2 border-primary/30 hover:border-primary hover:bg-primary/5 text-foreground"
          >
            <FileSpreadsheet className="h-4 w-4 text-primary" />
            Import Google Sheet
          </Button>

          {/* BUTTON 3: Download Attendance Records PDF */}
          <Button
            variant="outline"
            onClick={handleDownloadAttendancePDF}
            disabled={!selectedEvent || isDownloadingRecords}
            className="gap-2"
            title="Download PDF of displayed student attendance records"
          >
            {isDownloadingRecords ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Downloading...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Download Sheet
              </>
            )}
          </Button>

          {/* BUTTON 4: Download Blank Feedback Form */}
          <Button
            variant="outline"
            onClick={handleDownloadFeedbackPDF}
            disabled={!selectedEvent}
            className="gap-2 border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-600"
            title="Download blank printable student feedback form"
          >
            <FileText className="h-4 w-4" />
            Feedback Form
          </Button>

          {/* BUTTON 4: Export CSV */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExportCSV}
            disabled={!selectedEvent || !filtered.length}
            className="text-muted-foreground hover:text-foreground"
          >
            Export CSV
          </Button>
        </div>
      </div>

      {/* Prominent Event Selection & Event Details Card */}
      <Card className="border-border/80 shadow-sm bg-card/60 backdrop-blur-sm">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Select Event
                </Label>
                <Select
                  value={selectedEvent}
                  onValueChange={(val) => {
                    setSelectedEvent(val);
                    setSelectedIds(new Set());
                  }}
                >
                  <SelectTrigger className="w-[280px] sm:w-[320px] h-10 font-medium">
                    <SelectValue placeholder="Choose an event..." />
                  </SelectTrigger>
                  <SelectContent>
                    {events.map((e: any) => (
                      <SelectItem key={e._id} value={e._id}>
                        {e.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {activeEvent && (
                <div className="flex flex-wrap items-center gap-2 sm:pt-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    {activeEvent.date}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    {activeEvent.time}
                  </span>
                  {activeEvent.venue && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-primary" />
                        {activeEvent.venue}
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Quick Metrics Badges for Selected Event */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="px-3 py-1.5 rounded-lg bg-muted/60 border border-border text-center">
                <div className="text-xs text-muted-foreground">Registered</div>
                <div className="text-base font-bold">{eventRegistrations.length}</div>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center">
                <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Attended</div>
                <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                  {attendedCount}
                </div>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-center">
                <div className="text-xs text-rose-600 dark:text-rose-400 font-medium">Absent</div>
                <div className="text-base font-bold text-rose-600 dark:text-rose-400">
                  {absentCount}
                </div>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-center">
                <div className="text-xs text-primary font-medium">Rate</div>
                <div className="text-base font-bold text-primary">
                  {eventRegistrations.length
                    ? `${Math.round((attendedCount / eventRegistrations.length) * 100)}%`
                    : "0%"}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attached Physical Signed Sheet(s) Section */}
      {selectedEvent && signedSheets.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-primary/30 bg-primary/5 shadow-sm">
            <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary text-primary-foreground">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-foreground">
                      Official Scanned Signed Sheet Attached
                    </h4>
                    <Badge variant="default" className="text-[10px] bg-emerald-600 hover:bg-emerald-600">
                      Verified Copy
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {signedSheets[0].originalName} • {(signedSheets[0].size / 1024).toFixed(1)} KB • Uploaded{" "}
                    {new Date(signedSheets[0].uploadedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 h-8 bg-background border-primary/40 text-primary hover:bg-primary/10"
                  onClick={() => {
                    const fullUrl = `${BACKEND_URL}${signedSheets[0].url}`;
                    window.open(fullUrl, "_blank");
                  }}
                >
                  <Eye className="h-3.5 w-3.5" />
                  View Signed PDF
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                  onClick={() => handleDeleteSignedSheet(signedSheets[0]._id!)}
                  title="Remove signed copy"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Attendance Ledger Table */}
      <Card className="shadow-card border-border/80">
        <CardHeader className="p-4 sm:p-5 border-b border-border/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg font-bold">
                Student Attendance Ledger
              </CardTitle>
              <CardDescription>
                {activeEvent ? `Attendance list for ${activeEvent.name}` : "Select an event to view attendance"}
              </CardDescription>
            </div>

            {/* Search & Filter Bar */}
            <div className="flex items-center gap-2.5">
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search student or Reg No..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-9 text-xs"
                />
              </div>

              {/* Bulk Actions if Selected */}
              {selectedIds.size > 0 && (
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    className="gap-1.5 h-9 bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => handleBulkMarkStatus("attended")}
                    disabled={isBusy}
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    Mark {selectedIds.size} Attended
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 h-9 text-rose-600 hover:bg-rose-50 border-rose-200"
                    onClick={() => handleBulkMarkStatus("absent")}
                    disabled={isBusy}
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Mark Absent
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded" />
              ))}
            </div>
          ) : filtered.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="w-12 text-center">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={toggleSelectAll}
                        disabled={isBusy || unattendedFiltered.length === 0}
                      />
                    </TableHead>
                    {/* Serial Number */}
                    <TableHead className="w-16 text-center font-bold text-xs uppercase tracking-wider">
                      Sl No.
                    </TableHead>
                    {/* Student Name */}
                    <TableHead className="font-bold text-xs uppercase tracking-wider">
                      Student Name
                    </TableHead>
                    {/* Registration Number */}
                    <TableHead className="font-bold text-xs uppercase tracking-wider">
                      Registration Number
                    </TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider text-center">
                      Status
                    </TableHead>
                    <TableHead className="w-28 text-right font-bold text-xs uppercase tracking-wider">
                      Quick Action
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filtered.map((reg: any, index: number) => {
                    const isAttended = reg.status === "attended";
                    const isAbsent = reg.status === "absent";
                    const regNo = reg?.student?.regNo || reg?.student?.studentId || "—";

                    return (
                      <TableRow
                        key={reg._id}
                        className={`transition-colors ${
                          isAttended
                            ? "bg-emerald-500/[0.02]"
                            : isAbsent
                            ? "bg-rose-500/[0.02]"
                            : ""
                        }`}
                      >
                        <TableCell className="text-center">
                          <Checkbox
                            checked={isAttended || selectedIds.has(reg._id)}
                            onCheckedChange={() =>
                              isAttended ? handleToggleStatus(reg) : toggleSelect(reg._id)
                            }
                            disabled={isBusy}
                          />
                        </TableCell>

                        {/* SERIAL NUMBER */}
                        <TableCell className="text-center font-semibold text-xs text-muted-foreground">
                          {index + 1}
                        </TableCell>

                        {/* STUDENT NAME */}
                        <TableCell className="font-semibold text-sm">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                              {(reg?.student?.name || "S").charAt(0).toUpperCase()}
                            </div>
                            <span className="text-foreground">
                              {reg?.student?.name ?? "—"}
                            </span>
                          </div>
                        </TableCell>

                        {/* REGISTRATION NUMBER */}
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="font-mono text-xs font-semibold px-2 py-0.5 tracking-wider bg-background border-border/80 text-foreground"
                          >
                            {regNo}
                          </Badge>
                        </TableCell>

                        {/* ATTENDANCE STATUS */}
                        <TableCell className="text-center">
                          {isAttended ? (
                            <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 text-[11px] font-medium shadow-none">
                              <CheckCircle className="w-3 h-3" />
                              Attended
                            </Badge>
                          ) : isAbsent ? (
                            <Badge
                              variant="destructive"
                              className="bg-rose-600 hover:bg-rose-700 text-white gap-1 text-[11px] font-medium shadow-none"
                            >
                              <XCircle className="w-3 h-3" />
                              Absent
                            </Badge>
                          ) : (
                            <Badge
                              variant="secondary"
                              className="text-muted-foreground text-[11px] font-medium gap-1"
                            >
                              <Clock className="w-3 h-3" />
                              Registered
                            </Badge>
                          )}
                        </TableCell>

                        {/* QUICK ACTION TOGGLE */}
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant={isAttended ? "outline" : "default"}
                            className={`h-7 px-2.5 text-xs font-medium ${
                              isAttended
                                ? "text-rose-600 border-rose-200 hover:bg-rose-50"
                                : "bg-emerald-600 hover:bg-emerald-700 text-white"
                            }`}
                            onClick={() => handleToggleStatus(reg)}
                            disabled={isBusy}
                          >
                            {isAttended ? "Mark Absent" : "Mark Attended"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  No Attendance Records Yet
                </p>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  {selectedEvent
                    ? "Pre-registration is not required. You can directly upload your attendance sheet (Google Sheet or CSV) to import all attendees and mark attendance automatically."
                    : "Please select an event to view and manage attendance."}
                </p>
              </div>
              {selectedEvent && (
                <div className="pt-2 flex justify-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => setIsImportOpen(true)}
                    className="gap-2 bg-gradient-primary shadow-sm"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    Upload Attendance Sheet
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ================= MODAL 1: UPLOAD SIGNED SHEET (PDF) ================= */}
      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileUp className="w-5 h-5 text-primary" />
              Upload Signed Attendance Sheet
            </DialogTitle>
            <DialogDescription>
              Upload the scanned PDF copy of the physically signed attendance sheet for{" "}
              <strong>{activeEvent?.name || "this event"}</strong>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUploadSignedSheet} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="pdfFile" className="text-xs font-semibold">
                Select Scanned PDF File
              </Label>
              <div className="border-2 border-dashed border-border/80 hover:border-primary/50 rounded-xl p-6 text-center transition-colors bg-muted/20 cursor-pointer">
                <input
                  id="pdfFile"
                  type="file"
                  accept="application/pdf,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setUploadFile(file);
                  }}
                />
                <label htmlFor="pdfFile" className="cursor-pointer space-y-2 block">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                    <FileText className="w-5 h-5" />
                  </div>
                  {uploadFile ? (
                    <div>
                      <p className="text-sm font-semibold text-foreground truncate max-w-xs mx-auto">
                        {uploadFile.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(uploadFile.size / 1024).toFixed(1)} KB • Ready to upload
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Click to browse or drop your scanned PDF here
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Format: PDF only (Max 15MB)
                      </p>
                    </div>
                  )}
                </label>
              </div>
            </div>

            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg text-xs flex items-start gap-2 text-muted-foreground">
              <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <span>
                Once uploaded, this signed sheet will be linked to <strong>{activeEvent?.name}</strong> and stored permanently for institutional audits and compliance.
              </span>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsUploadOpen(false);
                  setUploadFile(null);
                }}
                disabled={isUploading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!uploadFile || isUploading}
                className="gap-2 bg-gradient-primary"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <FileUp className="w-4 h-4" />
                    Upload & Attach PDF
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ================= MODAL 2: IMPORT GOOGLE SHEET ================= */}
      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-primary" />
              Direct Attendance Upload
            </DialogTitle>
            <DialogDescription>
              Upload your attendance sheet or paste CSV data for <strong>{activeEvent?.name}</strong>. Attendance will be recorded directly (no prior student registration or student login required).
            </DialogDescription>
          </DialogHeader>

          <Tabs
            value={importMode}
            onValueChange={(val: any) => {
              setImportMode(val);
              setImportResult(null);
            }}
            className="w-full"
          >
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="url">Google Sheets Share URL</TabsTrigger>
              <TabsTrigger value="csv">Paste CSV / Table Data</TabsTrigger>
            </TabsList>

            {/* TAB 1: Google Sheet Share Link */}
            <TabsContent value="url" className="space-y-4 pt-3">
              <div className="space-y-2">
                <Label htmlFor="sheetUrl" className="text-xs font-semibold">
                  Google Sheet Link
                </Label>
                <Input
                  id="sheetUrl"
                  placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5n.../edit?usp=sharing"
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                  className="h-10 text-xs"
                />
                <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-primary shrink-0" />
                  Make sure link access in Google Sheets is set to <strong>"Anyone with the link can view"</strong>.
                </p>
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleFetchImport(false)}
                  disabled={isFetchingImport || !sheetUrl.trim()}
                  className="gap-1.5"
                >
                  {isFetchingImport ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
                  Preview & Match
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleFetchImport(true)}
                  disabled={isFetchingImport || !sheetUrl.trim()}
                  className="gap-1.5 bg-gradient-primary"
                >
                  {isFetchingImport ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCheck className="w-3.5 h-3.5" />
                  )}
                  Import & Apply Directly
                </Button>
              </div>
            </TabsContent>

            {/* TAB 2: Direct CSV / Table Paste */}
            <TabsContent value="csv" className="space-y-4 pt-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="csvData" className="text-xs font-semibold">
                    Paste CSV / SpreadSheet Text
                  </Label>
                  <label className="text-xs text-primary hover:underline cursor-pointer flex items-center gap-1">
                    <FileUp className="w-3 h-3" />
                    Upload .csv file
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      className="hidden"
                      onChange={handleCsvFileUpload}
                    />
                  </label>
                </div>
                <Textarea
                  id="csvData"
                  rows={5}
                  placeholder={`Register Number,Student Name,Status\n21CS045,Aditya Kumar,Attended\n21EC012,Sneha Patel,Attended`}
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  className="font-mono text-xs"
                />
                <p className="text-[11px] text-muted-foreground">
                  Headers can include <code>Register Number / USN</code>, <code>Student Name</code>, <code>Email</code> (optional), and <code>Status</code> (optional - defaults to Attended).
                </p>
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleFetchImport(false)}
                  disabled={isFetchingImport || !csvText.trim()}
                  className="gap-1.5"
                >
                  {isFetchingImport ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
                  Preview Matches
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleFetchImport(true)}
                  disabled={isFetchingImport || !csvText.trim()}
                  className="gap-1.5 bg-gradient-primary"
                >
                  {isFetchingImport ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCheck className="w-3.5 h-3.5" />
                  )}
                  Apply Directly
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          {/* PREVIEW OF PARSED DATA */}
          {importResult && (
            <div className="mt-4 pt-4 border-t space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Import Preview ({importResult.matchedCount} of {importResult.totalInSheet} Rows Parsed)
                  </h4>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {(importResult.preRegisteredCount > 0) && (
                      <Badge variant="outline" className="text-[10px] bg-slate-100 text-slate-700 border-slate-200">
                        {importResult.preRegisteredCount} Pre-Registered
                      </Badge>
                    )}
                    {(importResult.newAttendeesCount > 0) && (
                      <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                        {importResult.newAttendeesCount} Direct Attendees (Auto-Register)
                      </Badge>
                    )}
                  </div>
                </div>
                <Badge
                  variant={importResult.matchedCount > 0 ? "default" : "secondary"}
                  className="text-xs bg-emerald-600"
                >
                  {importResult.matchedCount} Students Ready to Save
                </Badge>
              </div>

              <div className="max-h-60 overflow-y-auto border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 text-[11px]">
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Student Name</TableHead>
                      <TableHead>Reg No</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>New Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importResult.matchedStudents?.map((s: any, idx: number) => (
                      <TableRow key={s.studentId || s.regNo || idx} className="text-xs">
                        <TableCell className="font-mono text-muted-foreground">{idx + 1}</TableCell>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell className="font-mono">{s.regNo}</TableCell>
                        <TableCell>
                          {s.isNewRegistration ? (
                            <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 border-emerald-200">
                              Direct Attendee
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-700 border-blue-200">
                              Pre-Registered
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`text-[10px] ${
                              s.status === "attended"
                                ? "bg-emerald-600 text-white"
                                : "bg-rose-600 text-white"
                            }`}
                          >
                            {s.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {importResult.unmatchedCount > 0 && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  {importResult.unmatchedCount} row(s) could not be parsed (missing Name or Register Number).
                </p>
              )}

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setImportResult(null)}
                >
                  Clear Preview
                </Button>
                <Button
                  type="button"
                  onClick={handleApplyImport}
                  disabled={isApplyingImport || importResult.matchedCount === 0}
                  className="gap-2 bg-gradient-primary"
                >
                  {isApplyingImport ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Applying...
                    </>
                  ) : (
                    <>
                      <CheckCheck className="w-4 h-4" />
                      Confirm & Save Attendance
                    </>
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>


    </div>
  );
};

export default FacultyAttendance;