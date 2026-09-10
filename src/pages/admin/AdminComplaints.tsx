import { useEffect, useMemo, useState, useRef } from "react";
import api from "@/api/api";
import { socket } from "@/lib/socket";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertCircle,
  CheckCircle2,
  Star,
  MessageSquare,
  Search,
  Trash2,
  Building2,
  User,
  Mail,
  Clock,
  FileSpreadsheet,
  FileUp,
  Eye,
  CheckCheck,
  Loader2,
  Info,
  Sparkles,
  Upload,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

export default function AdminComplaints() {
  const [complaints, setComplaints] = useState<any[]>([]);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [clubs, setClubs] = useState<any[]>([]);
  const [loadingComplaints, setLoadingComplaints] = useState(true);
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(true);
  const [search, setSearch] = useState("");

  // Import Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importMode, setImportMode] = useState<"url" | "csv">("url");
  const [sheetUrl, setSheetUrl] = useState("");
  const [csvText, setCsvText] = useState("");
  const [selectedClubId, setSelectedClubId] = useState<string>("all");
  const [isProcessingImport, setIsProcessingImport] = useState(false);
  const [isSavingStaged, setIsSavingStaged] = useState(false);
  const [importPreview, setImportPreview] = useState<any | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchComplaints();
    fetchFeedbacks();
    fetchClubs();

    socket.on("complaint:new", (newC) => {
      setComplaints((prev) => [newC, ...prev]);
      toast({
        title: "New Student Complaint",
        description: `New complaint received from ${newC.studentId?.name || "Student"}.`,
      });
    });

    socket.on("complaint:updated", (updated) => {
      setComplaints((prev) =>
        prev.map((c) => (c._id === updated._id ? { ...c, ...updated } : c))
      );
    });

    socket.on("complaint:deleted", (id) => {
      setComplaints((prev) => prev.filter((c) => c._id !== id));
    });

    return () => {
      socket.off("complaint:new");
      socket.off("complaint:updated");
      socket.off("complaint:deleted");
    };
  }, []);

  const fetchComplaints = async () => {
    try {
      setLoadingComplaints(true);
      const res = await api.get("/complaints");
      setComplaints(res.data || []);
    } catch (err) {
      console.error("Failed to load complaints:", err);
    } finally {
      setLoadingComplaints(false);
    }
  };

  const fetchFeedbacks = async () => {
    try {
      setLoadingFeedbacks(true);
      const res = await api.get("/feedback");
      setFeedbacks(res.data || []);
    } catch (err) {
      console.error("Failed to load feedback:", err);
    } finally {
      setLoadingFeedbacks(false);
    }
  };

  const fetchClubs = async () => {
    try {
      const res = await api.get("/clubs");
      setClubs(res.data || []);
    } catch (err) {
      console.error("Failed to load clubs:", err);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "resolved" ? "open" : "resolved";
    try {
      await api.patch(`/complaints/${id}/status`, { status: newStatus });
      setComplaints((prev) =>
        prev.map((c) => (c._id === id ? { ...c, status: newStatus } : c))
      );
      toast({
        title: newStatus === "resolved" ? "Complaint Resolved" : "Complaint Reopened",
        description: `Marked as ${newStatus}.`,
      });
    } catch (err: any) {
      toast({
        title: "Update Failed",
        description: err.response?.data?.message || "Could not update status",
        variant: "destructive",
      });
    }
  };

  const handleDeleteComplaint = async (id: string) => {
    if (!window.confirm("Delete this complaint?")) return;
    try {
      await api.delete(`/complaints/${id}`);
      setComplaints((prev) => prev.filter((c) => c._id !== id));
      toast({ title: "Complaint deleted" });
    } catch (err: any) {
      toast({
        title: "Delete Failed",
        description: err.response?.data?.message || "Could not delete complaint",
        variant: "destructive",
      });
    }
  };

  const handleDeleteFeedback = async (id: string) => {
    if (!window.confirm("Delete this feedback review?")) return;
    try {
      await api.delete(`/feedback/${id}`);
      setFeedbacks((prev) => prev.filter((f) => f._id !== id));
      toast({ title: "Feedback review deleted" });
    } catch (err: any) {
      toast({
        title: "Delete Failed",
        description: err.response?.data?.message || "Could not delete feedback",
        variant: "destructive",
      });
    }
  };

  /* ================= GOOGLE SHEET / CSV IMPORT HANDLERS ================= */

  const handleOpenImportModal = () => {
    setIsImportModalOpen(true);
    setImportPreview(null);
    setSheetUrl("");
    setCsvText("");
  };

  const handleCsvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      setCsvText(text || "");
      setImportMode("csv");
    };
    reader.readAsText(file);
  };

  const handleProcessImport = async (directApply: boolean) => {
    if (importMode === "url" && !sheetUrl.trim()) {
      toast({ title: "Please paste a Google Sheets share link", variant: "destructive" });
      return;
    }
    if (importMode === "csv" && !csvText.trim()) {
      toast({ title: "Please paste CSV data or upload a file", variant: "destructive" });
      return;
    }

    try {
      setIsProcessingImport(true);
      const payload = {
        sheetUrl: importMode === "url" ? sheetUrl.trim() : undefined,
        csvData: importMode === "csv" ? csvText.trim() : undefined,
        selectedClubId: selectedClubId !== "all" ? selectedClubId : undefined,
        previewOnly: !directApply,
      };

      const res = await api.post("/feedback/import-google-sheet", payload);

      if (directApply) {
        toast({
          title: "Import Successful!",
          description: res.data.message || `Imported ${res.data.feedbackCount} feedback(s) and ${res.data.complaintCount} complaint(s).`,
        });
        setIsImportModalOpen(false);
        fetchComplaints();
        fetchFeedbacks();
      } else {
        // Preview mode
        setImportPreview(res.data);
        toast({
          title: "Sheet Parsed Successfully",
          description: `Found ${res.data.totalRows} student entries (${res.data.feedbackCount} feedback, ${res.data.complaintCount} complaints). Review below before applying.`,
        });
      }
    } catch (err: any) {
      toast({
        title: "Import Failed",
        description: err.response?.data?.message || "Failed to process sheet. Ensure link is public.",
        variant: "destructive",
      });
    } finally {
      setIsProcessingImport(false);
    }
  };

  const handleToggleRowSelection = (rowId: string) => {
    if (!importPreview) return;
    setImportPreview((prev: any) => ({
      ...prev,
      rows: prev.rows.map((r: any) =>
        r.id === rowId ? { ...r, selected: !r.selected } : r
      ),
    }));
  };

  const handleConfirmSaveStaged = async () => {
    if (!importPreview || !importPreview.rows) return;
    const selectedRows = importPreview.rows.filter((r: any) => r.selected);
    if (selectedRows.length === 0) {
      toast({ title: "No entries selected to import", variant: "destructive" });
      return;
    }

    try {
      setIsSavingStaged(true);
      const res = await api.post("/feedback/import-google-sheet", {
        itemsToImport: selectedRows,
        selectedClubId: selectedClubId !== "all" ? selectedClubId : undefined,
      });

      toast({
        title: "Import Complete!",
        description: res.data.message || "All selected responses have been saved.",
      });

      setIsImportModalOpen(false);
      setImportPreview(null);
      fetchComplaints();
      fetchFeedbacks();
    } catch (err: any) {
      toast({
        title: "Save Failed",
        description: err.response?.data?.message || "Could not save imported data",
        variant: "destructive",
      });
    } finally {
      setIsSavingStaged(false);
    }
  };

  const filteredComplaints = useMemo(() => {
    if (!search.trim()) return complaints;
    const q = search.toLowerCase();
    return complaints.filter(
      (c) =>
        c.content?.toLowerCase().includes(q) ||
        c.studentId?.name?.toLowerCase().includes(q) ||
        c.studentId?.email?.toLowerCase().includes(q) ||
        c.clubId?.name?.toLowerCase().includes(q)
    );
  }, [complaints, search]);

  const filteredFeedbacks = useMemo(() => {
    if (!search.trim()) return feedbacks;
    const q = search.toLowerCase();
    return feedbacks.filter(
      (f) =>
        f.comment?.toLowerCase().includes(q) ||
        f.studentId?.name?.toLowerCase().includes(q) ||
        f.clubId?.name?.toLowerCase().includes(q) ||
        f.eventId?.name?.toLowerCase().includes(q)
    );
  }, [feedbacks, search]);

  const renderStars = (rating: number = 0) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star
            key={s}
            className={`w-3.5 h-3.5 ${
              s <= rating
                ? "text-amber-400 fill-amber-400"
                : "text-muted-foreground/30"
            }`}
          />
        ))}
      </div>
    );
  };

  const formatTimestamp = (dateStr: string) => {
    if (!dateStr) return "Recently";
    try {
      const d = new Date(dateStr);
      return `${formatDistanceToNow(d, { addSuffix: true })} (${format(d, "dd MMM yyyy, hh:mm a")})`;
    } catch {
      return "Recently";
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-primary" />
            Complaints & Feedback
          </h1>
          <p className="text-sm text-muted-foreground">
            View student complaints and feedback reviews, or import directly from Google Form sheets.
          </p>
        </div>

        {/* SEARCH & ACTIONS */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            <Input
              placeholder="Search by name, text, club..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs bg-card"
            />
          </div>

          <Button
            onClick={handleOpenImportModal}
            className="h-9 px-3 text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Import Google Sheet
          </Button>
        </div>
      </div>

      {/* TABS */}
      <Tabs defaultValue="complaints" className="space-y-4">
        <TabsList className="bg-muted p-1">
          <TabsTrigger value="complaints" className="gap-2 text-xs">
            <AlertCircle className="w-3.5 h-3.5" />
            Complaints ({complaints.length})
          </TabsTrigger>
          <TabsTrigger value="feedback" className="gap-2 text-xs">
            <Star className="w-3.5 h-3.5" />
            Feedback ({feedbacks.length})
          </TabsTrigger>
        </TabsList>

        {/* ================= TAB 1: COMPLAINTS ================= */}
        <TabsContent value="complaints" className="space-y-3">
          {loadingComplaints ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))
          ) : filteredComplaints.length > 0 ? (
            filteredComplaints.map((c) => {
              const isResolved = c.status === "resolved";

              return (
                <Card
                  key={c._id}
                  className="shadow-sm border border-border/70 hover:border-border transition-colors bg-card"
                >
                  <CardContent className="p-4 space-y-3">
                    {/* Top row: Club & Date */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        {c.clubId && (
                          <span className="font-semibold text-primary flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5" />
                            {c.clubId.name}
                          </span>
                        )}
                        <Badge
                          variant={isResolved ? "default" : "secondary"}
                          className={`text-[11px] px-2 py-0.5 font-medium ${
                            isResolved
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                              : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                          }`}
                        >
                          {isResolved ? "Resolved" : "Open"}
                        </Badge>
                      </div>

                      <span>{formatTimestamp(c.createdAt)}</span>
                    </div>

                    {/* Complaint Message */}
                    <p className="text-sm font-medium text-foreground whitespace-pre-wrap">
                      {c.content || c.message}
                    </p>

                    {/* Bottom row: Student info & Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs">
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-primary" />
                          <strong className="text-foreground">{c.studentId?.name || "Student"}</strong>
                        </span>
                        {c.studentId?.email && (
                          <span className="flex items-center gap-1 hidden sm:inline-flex">
                            <Mail className="w-3.5 h-3.5" />
                            {c.studentId.email}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleStatus(c._id, c.status || "open")}
                          className={`h-7 px-2.5 text-xs font-medium ${
                            isResolved
                              ? "border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                              : "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                          }`}
                        >
                          {isResolved ? "Reopen" : "Mark Resolved"}
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteComplaint(c._id)}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          title="Delete complaint"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <Card className="border border-border/70">
              <CardContent className="py-12 text-center text-muted-foreground space-y-1">
                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500/50 mb-2" />
                <p className="font-semibold text-sm">No complaints found</p>
                <p className="text-xs">There are no student complaints to display.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ================= TAB 2: FEEDBACK ================= */}
        <TabsContent value="feedback" className="space-y-3">
          {loadingFeedbacks ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))
          ) : filteredFeedbacks.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredFeedbacks.map((f) => (
                <Card
                  key={f._id}
                  className="shadow-sm border border-border/70 hover:border-border transition-colors bg-card"
                >
                  <CardContent className="p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      {renderStars(f.rating)}
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-muted-foreground">
                          {f.createdAt ? format(new Date(f.createdAt), "dd MMM yyyy") : "Recent"}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteFeedback(f._id)}
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                          title="Delete feedback"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>

                    <p className="text-sm text-foreground italic">
                      {f.comment ? `"${f.comment}"` : "No comment provided."}
                    </p>

                    <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {f.studentId?.name || "Student"}
                      </span>
                      <span className="font-semibold text-primary">
                        {f.clubId?.name || f.eventId?.name || "General"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border border-border/70">
              <CardContent className="py-12 text-center text-muted-foreground space-y-1">
                <Star className="w-8 h-8 mx-auto text-amber-400/50 mb-2" />
                <p className="font-semibold text-sm">No feedback reviews found</p>
                <p className="text-xs">There are no student feedback reviews yet.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* ================= MODAL: IMPORT GOOGLE SHEET / CSV ================= */}
      <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <FileSpreadsheet className="w-5 h-5 text-primary" />
              Import Google Form Feedback & Complaints
            </DialogTitle>
            <DialogDescription>
              Upload Google Form responses sheet (or paste CSV). The system will automatically parse <strong>Student Name</strong>, <strong>Feedback</strong>, and <strong>Complaint</strong> columns.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Target Club selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg border bg-muted/30">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Assign to Club / Category (Optional)</Label>
                <Select value={selectedClubId} onValueChange={setSelectedClubId}>
                  <SelectTrigger className="h-8 text-xs bg-card">
                    <SelectValue placeholder="Auto-detect or General" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Auto-detect from Sheet / General</SelectItem>
                    {clubs.map((club) => (
                      <SelectItem key={club._id} value={club._id}>
                        {club.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center text-xs text-muted-foreground p-1">
                <Info className="w-4 h-4 text-primary mr-2 shrink-0" />
                <span>
                  If sheet rows have a <strong>Club</strong> column, it will automatically match to each specific club.
                </span>
              </div>
            </div>

            <Tabs
              value={importMode}
              onValueChange={(v: any) => {
                setImportMode(v);
                setImportPreview(null);
              }}
              className="w-full"
            >
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="url" className="text-xs">Google Sheets Share URL</TabsTrigger>
                <TabsTrigger value="csv" className="text-xs">Paste CSV / Table Data</TabsTrigger>
              </TabsList>

              {/* TAB 1: URL */}
              <TabsContent value="url" className="space-y-3 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="feedbackSheetUrl" className="text-xs font-semibold">
                    Google Sheets Share Link
                  </Label>
                  <Input
                    id="feedbackSheetUrl"
                    placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5n.../edit?usp=sharing"
                    value={sheetUrl}
                    onChange={(e) => setSheetUrl(e.target.value)}
                    className="h-9 text-xs"
                  />
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-primary shrink-0" />
                    Ensure link access in Google Sheets is set to <strong>"Anyone with the link can view"</strong>.
                  </p>
                </div>

                <div className="flex gap-2 justify-end pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleProcessImport(false)}
                    disabled={isProcessingImport || !sheetUrl.trim()}
                    className="gap-1.5 text-xs h-8"
                  >
                    {isProcessingImport ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                    Preview & Match
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleProcessImport(true)}
                    disabled={isProcessingImport || !sheetUrl.trim()}
                    className="gap-1.5 text-xs h-8 bg-primary text-primary-foreground"
                  >
                    {isProcessingImport ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCheck className="w-3.5 h-3.5" />
                    )}
                    Import Directly
                  </Button>
                </div>
              </TabsContent>

              {/* TAB 2: CSV */}
              <TabsContent value="csv" className="space-y-3 pt-2">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="csvFeedbackData" className="text-xs font-semibold">
                      Paste CSV / Sheet Text
                    </Label>
                    <label className="text-xs text-primary hover:underline cursor-pointer flex items-center gap-1 font-medium">
                      <FileUp className="w-3.5 h-3.5" />
                      Upload .csv file
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,text/csv"
                        className="hidden"
                        onChange={handleCsvFileUpload}
                      />
                    </label>
                  </div>
                  <Textarea
                    id="csvFeedbackData"
                    rows={5}
                    placeholder={`Student Name,Feedback,Complaint\nAditya Kumar,Best hackathon ever!,Venue was too crowded\nSneha Patel,Great technical workshop,Need better mic system`}
                    value={csvText}
                    onChange={(e) => setCsvText(e.target.value)}
                    className="font-mono text-xs"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Supported columns: <code>Student Name</code>, <code>Feedback</code>, <code>Complaint</code> (and optional <code>Stars/Rating</code>, <code>Club</code>, <code>Email</code>).
                  </p>
                </div>

                <div className="flex gap-2 justify-end pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleProcessImport(false)}
                    disabled={isProcessingImport || !csvText.trim()}
                    className="gap-1.5 text-xs h-8"
                  >
                    {isProcessingImport ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                    Preview & Match
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleProcessImport(true)}
                    disabled={isProcessingImport || !csvText.trim()}
                    className="gap-1.5 text-xs h-8 bg-primary text-primary-foreground"
                  >
                    {isProcessingImport ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCheck className="w-3.5 h-3.5" />
                    )}
                    Import Directly
                  </Button>
                </div>
              </TabsContent>
            </Tabs>

            {/* PREVIEW LEDGER TABLE */}
            {importPreview && (
              <div className="mt-4 pt-3 border-t space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 bg-muted/40 p-2.5 rounded-lg border text-xs">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="font-semibold text-foreground">
                      Preview: {importPreview.totalRows} Student Responses
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30 text-[11px]">
                      {importPreview.feedbackCount} Feedback(s)
                    </Badge>
                    <Badge variant="outline" className="bg-rose-500/10 text-rose-500 border-rose-500/30 text-[11px]">
                      {importPreview.complaintCount} Complaint(s)
                    </Badge>
                  </div>
                </div>

                <div className="max-h-[38vh] overflow-y-auto space-y-2 border rounded-lg p-2 bg-card">
                  {importPreview.rows.map((row: any) => (
                    <div
                      key={row.id}
                      onClick={() => handleToggleRowSelection(row.id)}
                      className={`p-3 rounded-lg border transition-all cursor-pointer text-xs space-y-1.5 ${
                        row.selected
                          ? "border-primary/50 bg-primary/5"
                          : "border-border/50 bg-muted/20 opacity-60"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={row.selected}
                            onChange={() => handleToggleRowSelection(row.id)}
                            className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
                          />
                          <span className="font-bold text-foreground">{row.studentName}</span>
                          {row.email && (
                            <span className="text-muted-foreground text-[11px]">({row.email})</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {renderStars(row.rating || 5)}
                          {row.clubName && (
                            <Badge variant="secondary" className="text-[10px]">
                              {row.clubName}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Feedback snippet */}
                      {row.feedbackText && (
                        <div className="flex items-start gap-1.5 text-foreground">
                          <Star className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                          <span className="italic">"{row.feedbackText}"</span>
                        </div>
                      )}

                      {/* Complaint snippet */}
                      {row.complaintText && (
                        <div className="flex items-start gap-1.5 text-rose-400">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                          <span className="font-medium">"{row.complaintText}"</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-muted-foreground">
                    {importPreview.rows.filter((r: any) => r.selected).length} of {importPreview.rows.length} rows selected
                  </span>
                  <Button
                    onClick={handleConfirmSaveStaged}
                    disabled={isSavingStaged || importPreview.rows.filter((r: any) => r.selected).length === 0}
                    className="gap-1.5 text-xs h-8 bg-primary text-primary-foreground shadow-sm"
                  >
                    {isSavingStaged ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Upload className="w-3.5 h-3.5" />
                    )}
                    Confirm & Save Selected Responses
                  </Button>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="pt-2 border-t">
            <Button variant="outline" size="sm" onClick={() => setIsImportModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
