import { useEffect, useMemo, useState, useRef } from "react";
import api from "@/api/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMyFeedback, useFacultyEvents } from "@/hooks/use-dashboard-api";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
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
  FileSpreadsheet,
  FileText,
  Download,
  FileUp,
  Eye,
  CheckCheck,
  Loader2,
  Info,
  Sparkles,
  Upload,
  Star,
  Search,
  MessageSquare,
  AlertCircle,
  Building2,
  Calendar,
  Layers,
  User,
  FilterX,
  Trash2,
  ExternalLink,
} from "lucide-react";

const FacultyFeedback = () => {
  const { data: feedbackData = [], isLoading: feedbackLoading, refetch } = useMyFeedback();
  const { data: facultyEvents = [], isLoading: eventsLoading } = useFacultyEvents();
  const { toast } = useToast();

  const [clubs, setClubs] = useState<any[]>([]);

  // 2-Tier Selection State
  const [selectedClubId, setSelectedClubId] = useState<string>("all");
  const [selectedEventId, setSelectedEventId] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [isDownloadingSheet, setIsDownloadingSheet] = useState(false);

  // Deleting State
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);

  // Import Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importMode, setImportMode] = useState<"url" | "csv">("url");
  const [sheetUrl, setSheetUrl] = useState("");
  const [csvText, setCsvText] = useState("");
  const [importEventName, setImportEventName] = useState("");
  const [importTargetClubId, setImportTargetClubId] = useState<string>("all");
  const [importTargetEventId, setImportTargetEventId] = useState<string>("all");
  const [isProcessingImport, setIsProcessingImport] = useState(false);
  const [isSavingStaged, setIsSavingStaged] = useState(false);
  const [importPreview, setImportPreview] = useState<any | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchClubs();
  }, []);

  const fetchClubs = async () => {
    try {
      const res = await api.get("/clubs");
      setClubs(res.data || []);
    } catch (err) {
      console.error("Failed to load clubs:", err);
    }
  };

  /* ================= TIER 1: COMPUTED CLUBS METRICS ================= */
  const clubCardsList = useMemo(() => {
    const clubMap = new Map<string, {
      id: string;
      name: string;
      reviewCount: number;
      totalRating: number;
      eventCount: number;
    }>();

    clubs.forEach((c) => {
      clubMap.set(String(c._id), {
        id: String(c._id),
        name: c.name,
        reviewCount: 0,
        totalRating: 0,
        eventCount: 0,
      });
    });

    if (Array.isArray(feedbackData)) {
      feedbackData.forEach((fb: any) => {
        const cId = typeof fb.clubId === "object" ? fb.clubId?._id : fb.clubId;
        const eClubId = typeof fb.eventId?.clubId === "object" ? fb.eventId?.clubId?._id : fb.eventId?.clubId;
        const targetId = cId || eClubId;

        if (targetId) {
          const strId = String(targetId);
          if (!clubMap.has(strId)) {
            const name = typeof fb.clubId === "object" ? fb.clubId?.name : (typeof fb.eventId?.clubId === "object" ? fb.eventId?.clubId?.name : "Club");
            clubMap.set(strId, {
              id: strId,
              name,
              reviewCount: 0,
              totalRating: 0,
              eventCount: 0,
            });
          }
          const item = clubMap.get(strId)!;
          item.reviewCount += 1;
          item.totalRating += fb.rating || 5;
        }
      });
    }

    if (Array.isArray(facultyEvents)) {
      facultyEvents.forEach((e: any) => {
        const eClubId = typeof e.clubId === "object" ? e.clubId?._id : e.clubId;
        if (eClubId && clubMap.has(String(eClubId))) {
          clubMap.get(String(eClubId))!.eventCount += 1;
        }
      });
    }

    return Array.from(clubMap.values()).filter((c) => c.reviewCount > 0 || c.name);
  }, [clubs, feedbackData, facultyEvents]);

  /* ================= TIER 2: COMPUTED EVENTS UNDER SELECTED CLUB ================= */
  const availableEventCards = useMemo(() => {
    const eventMap = new Map<string, {
      id: string;
      name: string;
      clubName: string;
      date: string;
      reviewCount: number;
      totalRating: number;
    }>();

    if (Array.isArray(facultyEvents)) {
      facultyEvents.forEach((evt: any) => {
        const eClubId = typeof evt.clubId === "object" ? evt.clubId?._id : evt.clubId;
        if (selectedClubId === "all" || String(eClubId) === String(selectedClubId)) {
          eventMap.set(String(evt._id), {
            id: String(evt._id),
            name: evt.name,
            clubName: typeof evt.clubId === "object" ? evt.clubId?.name : "",
            date: evt.date || "",
            reviewCount: 0,
            totalRating: 0,
          });
        }
      });
    }

    if (Array.isArray(feedbackData)) {
      feedbackData.forEach((fb: any) => {
        if (!fb.eventId) return;

        const eObj = fb.eventId;
        const eId = typeof eObj === "object" ? eObj._id : eObj;
        const eName = typeof eObj === "object" ? eObj.name : "Event";
        const eClubId = typeof fb.clubId === "object" ? fb.clubId?._id : (typeof fb.eventId?.clubId === "object" ? fb.eventId?.clubId?._id : fb.clubId);

        if (selectedClubId === "all" || String(eClubId) === String(selectedClubId)) {
          const strEId = String(eId);
          if (!eventMap.has(strEId)) {
            eventMap.set(strEId, {
              id: strEId,
              name: eName,
              clubName: typeof fb.clubId === "object" ? fb.clubId?.name : "",
              date: typeof eObj === "object" ? eObj.date : "",
              reviewCount: 0,
              totalRating: 0,
            });
          }
          const item = eventMap.get(strEId)!;
          item.reviewCount += 1;
          item.totalRating += fb.rating || 5;
        }
      });
    }

    return Array.from(eventMap.values());
  }, [facultyEvents, feedbackData, selectedClubId]);

  /* ================= LIST OF IMPORTED SHEETS & SESSIONS ================= */
  const importedSheetsList = useMemo(() => {
    const list: Array<{
      eventId: string;
      name: string;
      clubName: string;
      reviewCount: number;
      averageRating: string;
      latestDate: string;
    }> = [];

    if (Array.isArray(feedbackData)) {
      const grouped = new Map<string, {
        eventId: string;
        name: string;
        clubName: string;
        reviewCount: number;
        totalRating: number;
        latestDate: Date;
      }>();

      feedbackData.forEach((fb: any) => {
        if (!fb.eventId) return;
        const eId = typeof fb.eventId === "object" ? fb.eventId._id : fb.eventId;
        const eName = typeof fb.eventId === "object" ? fb.eventId.name : "Imported Feedback";
        const cName = typeof fb.clubId === "object" ? fb.clubId?.name : (typeof fb.eventId?.clubId === "object" ? fb.eventId?.clubId?.name : "");

        const strEId = String(eId);
        if (!grouped.has(strEId)) {
          grouped.set(strEId, {
            eventId: strEId,
            name: eName,
            clubName: cName,
            reviewCount: 0,
            totalRating: 0,
            latestDate: new Date(fb.createdAt || Date.now()),
          });
        }

        const item = grouped.get(strEId)!;
        item.reviewCount += 1;
        item.totalRating += fb.rating || 5;
        const d = new Date(fb.createdAt || Date.now());
        if (d > item.latestDate) item.latestDate = d;
      });

      grouped.forEach((val) => {
        list.push({
          eventId: val.eventId,
          name: val.name,
          clubName: val.clubName,
          reviewCount: val.reviewCount,
          averageRating: val.reviewCount > 0 ? (val.totalRating / val.reviewCount).toFixed(1) : "0.0",
          latestDate: format(val.latestDate, "MMM d, yyyy"),
        });
      });
    }

    return list;
  }, [feedbackData]);

  // Handle Level 1 Club Selection
  const handleSelectClubCard = (clubId: string) => {
    setSelectedClubId(clubId);
    setSelectedEventId("all");
  };

  // Handle Level 2 Event Selection
  const handleSelectEventCard = (eventId: string) => {
    setSelectedEventId(eventId);
  };

  const handleResetFilters = () => {
    setSelectedClubId("all");
    setSelectedEventId("all");
    setSearch("");
  };

  /* ================= DELETE IMPORTED SHEET SESSION ================= */
  const handleDeleteImportedSheet = async (eventId: string, sheetName: string) => {
    if (!window.confirm(`Are you sure you want to delete the imported sheet session "${sheetName}"? This will delete all student reviews imported for this event.`)) {
      return;
    }

    try {
      setDeletingSessionId(eventId);
      const res = await api.delete(`/feedback/event/${eventId}`);

      toast({
        title: "Imported Sheet Deleted",
        description: res.data.message || `Deleted feedback entries for "${sheetName}".`,
      });

      if (selectedEventId === eventId) {
        setSelectedEventId("all");
      }
      refetch();
    } catch (err: any) {
      toast({
        title: "Delete Failed",
        description: err.response?.data?.message || "Failed to delete imported sheet session",
        variant: "destructive",
      });
    } finally {
      setDeletingSessionId(null);
    }
  };

  /* ================= DELETE SINGLE FEEDBACK ITEM ================= */
  const handleDeleteSingleFeedback = async (id: string) => {
    if (!window.confirm("Delete this student feedback review?")) return;
    try {
      await api.delete(`/feedback/${id}`);
      toast({ title: "Feedback review deleted" });
      refetch();
    } catch (err: any) {
      toast({
        title: "Delete Failed",
        description: err.response?.data?.message || "Could not delete feedback",
        variant: "destructive",
      });
    }
  };

  /* ================= TIER 3: FILTERED UNIFIED FEEDBACK LIST ================= */
  const displayedFeedback = useMemo(() => {
    if (!Array.isArray(feedbackData)) return [];

    return feedbackData.filter((fb: any) => {
      // 1. Club filter
      if (selectedClubId !== "all") {
        const cId = typeof fb.clubId === "object" ? fb.clubId?._id : fb.clubId;
        const eClubId = typeof fb.eventId?.clubId === "object" ? fb.eventId?.clubId?._id : fb.eventId?.clubId;
        if (String(cId) !== String(selectedClubId) && String(eClubId) !== String(selectedClubId)) {
          return false;
        }
      }

      // 2. Event filter
      if (selectedEventId !== "all") {
        const eId = typeof fb.eventId === "object" ? fb.eventId?._id : fb.eventId;
        if (String(eId) !== String(selectedEventId)) return false;
      }

      // 3. Search query filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesComment = fb.comment?.toLowerCase().includes(q);
        const matchesStudent = fb.studentId?.name?.toLowerCase().includes(q) || fb.studentId?.email?.toLowerCase().includes(q);
        const matchesClub = fb.clubId?.name?.toLowerCase().includes(q);
        const matchesEvent = fb.eventId?.name?.toLowerCase().includes(q);
        if (!matchesComment && !matchesStudent && !matchesClub && !matchesEvent) return false;
      }

      return true;
    });
  }, [feedbackData, selectedClubId, selectedEventId, search]);

  const activeClubObj = useMemo(() => {
    if (selectedClubId === "all") return null;
    return clubs.find((c) => String(c._id) === String(selectedClubId));
  }, [clubs, selectedClubId]);

  const activeEventObj = useMemo(() => {
    if (selectedEventId === "all") return null;
    return availableEventCards.find((e) => String(e.id) === String(selectedEventId));
  }, [availableEventCards, selectedEventId]);

  /* ================= DOWNLOAD EMPTY FEEDBACK FORM / SHEET ================= */
  const handleDownloadEmptyFeedbackSheet = async (targetEventObj?: any) => {
    const evtToUse = targetEventObj || (availableEventCards.length > 0 ? availableEventCards[0] : null);
    const eventIdToUse = evtToUse?.id || "generic";
    const eventName = evtToUse?.name || "Student Feedback Activity";

    try {
      setIsDownloadingSheet(true);
      let res;
      try {
        res = await api.get(`/events/${eventIdToUse}/feedback-pdf`, {
          responseType: "blob",
        });
      } catch {
        res = await api.get(`/faculty/events/${eventIdToUse}/feedback-pdf`, {
          responseType: "blob",
        });
      }

      if (res.data.type === "application/json") {
        const text = await res.data.text();
        const json = JSON.parse(text);
        throw new Error(json.message || "Failed to generate feedback form");
      }

      const fileName = `feedback-form-${eventName.replace(/[^a-zA-Z0-9-_]/g, "_")}.pdf`;
      const file = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(file);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Empty Feedback Sheet Downloaded",
        description: `Downloaded blank student feedback form PDF for "${eventName}".`,
      });
    } catch (err: any) {
      console.error("PDF download failed:", err);
      toast({
        title: "Download Failed",
        description: err?.message || err?.response?.data?.message || "Could not download feedback sheet",
        variant: "destructive",
      });
    } finally {
      setIsDownloadingSheet(false);
    }
  };

  /* ================= GOOGLE SHEET / CSV IMPORT HANDLERS ================= */

  const handleOpenImportModal = () => {
    setIsImportModalOpen(true);
    setImportPreview(null);
    setSheetUrl("");
    setCsvText("");
    setImportEventName("");
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
        eventName: importEventName.trim() || undefined,
        selectedClubId: importTargetClubId !== "all" ? importTargetClubId : undefined,
        selectedEventId: importTargetEventId !== "all" ? importTargetEventId : undefined,
        previewOnly: !directApply,
      };

      const res = await api.post("/feedback/import-google-sheet", payload);

      if (directApply) {
        toast({
          title: "Import Successful!",
          description: res.data.message || `Imported ${res.data.feedbackCount} feedback(s) and ${res.data.complaintCount} complaint(s).`,
        });
        setIsImportModalOpen(false);
        refetch();
        if (res.data.eventId) {
          setSelectedEventId(String(res.data.eventId));
        } else if (importTargetEventId !== "all") {
          setSelectedEventId(importTargetEventId);
        }
      } else {
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
        eventName: importEventName.trim() || undefined,
        selectedClubId: importTargetClubId !== "all" ? importTargetClubId : undefined,
        selectedEventId: importTargetEventId !== "all" ? importTargetEventId : undefined,
      });

      toast({
        title: "Import Complete!",
        description: res.data.message || "All selected responses have been saved.",
      });

      setIsImportModalOpen(false);
      setImportPreview(null);
      refetch();
      if (res.data.eventId) {
        setSelectedEventId(String(res.data.eventId));
      } else if (importTargetEventId !== "all") {
        setSelectedEventId(importTargetEventId);
      }
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

  const renderStars = (rating: number = 0) => (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <span
          key={s}
          className={
            s <= rating
              ? "text-amber-400"
              : "text-muted-foreground/30"
          }
        >
          ★
        </span>
      ))}
    </span>
  );

  const formatDate = (date: string) => {
    try {
      return format(new Date(date), "MMM d, yyyy");
    } catch {
      return "";
    }
  };

  const isFilterActive = selectedClubId !== "all" || selectedEventId !== "all" || search.trim() !== "";

  return (
    <div className="p-6 space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-primary" />
            Student Feedback Hub
          </h1>
          <p className="text-sm text-muted-foreground">
            View imported sheets, select club and event cards to explore feedback, or import Google Form sheets.
          </p>
        </div>

        <Button
          onClick={handleOpenImportModal}
          className="h-9 px-3.5 text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
        >
          <FileSpreadsheet className="w-4 h-4" />
          Import Google Sheet
        </Button>
      </div>

      {/* ================= SECTION: IMPORTED SHEETS & SESSIONS MANAGER ================= */}
      <Card className="border border-border/80 bg-card shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <FileSpreadsheet className="w-4 h-4 text-primary" />
              Imported Feedback Sheets & Sessions ({importedSheetsList.length})
            </div>
            <span className="text-[11px] text-muted-foreground">
              Manage and delete imported Google Sheets or event feedback sessions
            </span>
          </div>

          {importedSheetsList.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {importedSheetsList.map((sheet) => {
                const isSelected = String(selectedEventId) === String(sheet.eventId);
                const isDeleting = deletingSessionId === sheet.eventId;

                return (
                  <div
                    key={sheet.eventId}
                    className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-2 text-xs ${
                      isSelected
                        ? "border-primary bg-primary/10 shadow-sm"
                        : "border-border/60 bg-muted/20 hover:border-border"
                    }`}
                  >
                    <div
                      className="space-y-1 cursor-pointer flex-1 min-w-0"
                      onClick={() => handleSelectEventCard(sheet.eventId)}
                    >
                      <p className="font-bold text-foreground truncate flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        {sheet.name}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {sheet.reviewCount} reviews ({sheet.averageRating} ★)
                        </Badge>
                        {sheet.clubName && <span>{sheet.clubName}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="sm"
                        variant={isSelected ? "default" : "outline"}
                        onClick={() => handleSelectEventCard(sheet.eventId)}
                        className="h-7 px-2 text-[11px] gap-1"
                        title="View Feedback"
                      >
                        <Eye className="w-3 h-3" />
                        View
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteImportedSheet(sheet.eventId, sheet.name)}
                        disabled={isDeleting}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        title="Delete imported sheet & reviews"
                      >
                        {isDeleting ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-4 text-center border rounded-lg bg-muted/10 text-muted-foreground text-xs space-y-1">
              <FileSpreadsheet className="w-5 h-5 mx-auto text-muted-foreground/40 mb-1" />
              <p className="font-medium">No imported sheets yet</p>
              <p className="text-[11px]">Use the "Import Google Sheet" button above to upload a Google Form sheet.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ================= TIER 1: SELECT CLUB CARDS ================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            1. Select Club Card
          </Label>
          {isFilterActive && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="h-6 text-[11px] text-muted-foreground hover:text-foreground gap-1 px-1.5"
            >
              <FilterX className="w-3 h-3" />
              Reset Selection
            </Button>
          )}
        </div>

        {feedbackLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {/* CARD 0: ALL CLUBS */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleSelectClubCard("all")}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-2.5 ${
                selectedClubId === "all"
                  ? "border-primary bg-primary/10 shadow-md ring-1 ring-primary/40"
                  : "border-border/70 bg-card hover:border-border hover:bg-muted/40"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
                <Badge
                  variant={selectedClubId === "all" ? "default" : "secondary"}
                  className="text-[10px] font-semibold"
                >
                  {feedbackData.length} total
                </Badge>
              </div>

              <div>
                <p className="font-bold text-sm text-foreground">All Clubs</p>
                <p className="text-[11px] text-muted-foreground">All student feedback combined</p>
              </div>
            </motion.div>

            {/* CLUB CARDS */}
            {clubCardsList.map((c) => {
              const isSelected = String(selectedClubId) === String(c.id);
              const avgRating = c.reviewCount > 0 ? (c.totalRating / c.reviewCount).toFixed(1) : "0.0";

              return (
                <motion.div
                  key={c.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSelectClubCard(c.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-2.5 ${
                    isSelected
                      ? "border-primary bg-primary/10 shadow-md ring-1 ring-primary/40"
                      : "border-border/70 bg-card hover:border-border hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-500 flex items-center justify-center">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <Badge
                      variant={isSelected ? "default" : "outline"}
                      className={`text-[10px] font-semibold ${
                        isSelected ? "bg-primary text-primary-foreground" : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                      }`}
                    >
                      {c.reviewCount} reviews {c.reviewCount > 0 ? `• ${avgRating} ★` : ""}
                    </Badge>
                  </div>

                  <div>
                    <p className="font-bold text-sm text-foreground line-clamp-1">{c.name}</p>
                    <p className="text-[11px] text-muted-foreground line-clamp-1">
                      {c.eventCount > 0 ? `${c.eventCount} Event(s)` : "General Club Reviews"}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* ================= TIER 2: SELECT EVENT CARDS UNDER SELECTED CLUB ================= */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedClubId}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="space-y-3 pt-1 border-t border-border/60"
        >
          <div className="flex items-center justify-between">
            <Label className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              2. Select Event under {activeClubObj ? <strong>{activeClubObj.name}</strong> : "All Clubs"}
            </Label>
            <span className="text-xs text-muted-foreground font-medium">
              {availableEventCards.length} Events Available
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* PILL 0: ALL EVENTS */}
            <Button
              variant={selectedEventId === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => handleSelectEventCard("all")}
              className={`h-8 text-xs font-medium gap-1.5 rounded-lg ${
                selectedEventId === "all"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-card border-border/70 hover:bg-muted/50"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              All Events {activeClubObj ? `in ${activeClubObj.name}` : ""}
            </Button>

            {/* EVENT CARDS PILLS */}
            {availableEventCards.map((evt) => {
              const isSelected = String(selectedEventId) === String(evt.id);
              const avgRating = evt.reviewCount > 0 ? (evt.totalRating / evt.reviewCount).toFixed(1) : "0.0";

              return (
                <Button
                  key={evt.id}
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleSelectEventCard(evt.id)}
                  className={`h-8 text-xs font-medium gap-1.5 rounded-lg transition-all ${
                    isSelected
                      ? "bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/50"
                      : "bg-card border-border/70 hover:bg-muted/50 text-foreground"
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                  <span>{evt.name}</span>
                  {evt.reviewCount > 0 && (
                    <Badge
                      variant="secondary"
                      className={`text-[10px] px-1.5 py-0 ${
                        isSelected ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {evt.reviewCount} ({avgRating} ★)
                    </Badge>
                  )}
                </Button>
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* ================= TIER 3: UNIFIED FEEDBACK DATA DISPLAY ================= */}
      <div className="pt-2 space-y-4 border-t border-border/60">
        {/* ACTIVE SELECTION SUMMARY & SEARCH BAR */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-muted/30 p-3.5 rounded-xl border border-border/60">
          <div>
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              {activeEventObj
                ? `Feedback for "${activeEventObj.name}"`
                : activeClubObj
                ? `Feedback for "${activeClubObj.name}"`
                : "All Feedback Reviews"}
            </h2>
            <p className="text-xs text-muted-foreground">
              Showing <strong>{displayedFeedback.length}</strong> student review(s)
              {activeEventObj?.clubName ? ` • ${activeEventObj.clubName}` : ""}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            {/* DOWNLOAD EMPTY FEEDBACK SHEET BUTTON (ONLY WHEN EVENT IS SELECTED) */}
            {activeEventObj && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownloadEmptyFeedbackSheet(activeEventObj)}
                disabled={isDownloadingSheet}
                className="h-8 text-xs gap-1.5 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-emerald-500/10 border-emerald-500/30 font-medium shadow-sm transition-all"
                title={`Download empty printable feedback sheet form for "${activeEventObj.name}"`}
              >
                {isDownloadingSheet ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FileText className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                )}
                <span>Download Empty Sheet</span>
              </Button>
            )}

            {/* SEARCH INPUT */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Search by student or comment..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-xs bg-card"
              />
            </div>
          </div>
        </div>

        {/* UNIFIED FEEDBACK LIST CARDS */}
        {feedbackLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : displayedFeedback.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {displayedFeedback.map((fb: any, i: number) => (
              <motion.div
                key={fb._id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Card className="h-full border border-border/70 hover:border-border transition-colors bg-card shadow-sm">
                  <CardContent className="p-4 flex flex-col justify-between space-y-3">
                    <div className="flex justify-between items-start gap-2">
                      <div className="space-y-1">
                        {fb.eventId?.name ? (
                          <Badge className="bg-primary/10 text-primary border-primary/20 text-[11px] font-medium">
                            <Calendar className="w-3 h-3 mr-1 inline" />
                            {fb.eventId.name}
                          </Badge>
                        ) : fb.clubId?.name ? (
                          <Badge variant="outline" className="text-[11px] font-medium">
                            <Building2 className="w-3 h-3 mr-1 inline" />
                            {fb.clubId.name}
                          </Badge>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {renderStars(fb.rating)}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteSingleFeedback(fb._id)}
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                          title="Delete review"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    <p className="text-sm text-foreground italic bg-muted/30 p-3 rounded-lg border border-border/40">
                      {fb.comment ? `"${fb.comment}"` : "No written comment provided."}
                    </p>

                    <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-primary" />
                        <strong className="text-foreground">{fb.studentId?.name || "Student"}</strong>
                      </span>
                      <span className="text-[11px]">
                        {formatDate(fb.createdAt)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <Card className="border border-border/70">
            <CardContent className="py-12 text-center text-muted-foreground space-y-1">
              <MessageSquare className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm font-semibold text-foreground">No feedback reviews found</p>
              <p className="text-xs text-muted-foreground">
                There are no reviews for the selected event or club.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ================= MODAL: IMPORT GOOGLE SHEET / CSV ================= */}
      <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <FileSpreadsheet className="w-5 h-5 text-primary" />
              Import Google Form Feedback & Complaints
            </DialogTitle>
            <DialogDescription>
              Upload Google Form responses sheet (or paste CSV). Enter an event title below to group your sheet feedback under that specific event.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Event Name & Target Club selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg border bg-muted/30">
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs font-semibold">Event Name / Sheet Title (e.g. Web Dev Workshop)</Label>
                <Input
                  placeholder="e.g. Web Dev Workshop, AI Hackathon 2026..."
                  value={importEventName}
                  onChange={(e) => setImportEventName(e.target.value)}
                  className="h-8 text-xs bg-card"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Existing Event (Optional)</Label>
                <Select value={importTargetEventId} onValueChange={setImportTargetEventId}>
                  <SelectTrigger className="h-8 text-xs bg-card">
                    <SelectValue placeholder="Select Existing Event" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Create / Auto-detect Event</SelectItem>
                    {facultyEvents.map((evt: any) => (
                      <SelectItem key={evt._id} value={evt._id}>
                        {evt.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Assign to Club (Optional)</Label>
                <Select value={importTargetClubId} onValueChange={setImportTargetClubId}>
                  <SelectTrigger className="h-8 text-xs bg-card">
                    <SelectValue placeholder="Select Target Club" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Auto-detect from Sheet / General</SelectItem>
                    {clubs.map((club: any) => (
                      <SelectItem key={club._id} value={club._id}>
                        {club.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

                      {row.feedbackText && (
                        <div className="flex items-start gap-1.5 text-foreground">
                          <Star className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                          <span className="italic">"{row.feedbackText}"</span>
                        </div>
                      )}

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
};

export default FacultyFeedback;