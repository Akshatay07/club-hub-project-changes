import { useEffect, useMemo, useState } from "react";
import api from "@/api/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { socket } from "@/lib/socket";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  CheckCircle2,
  Clock,
  FileText,
  ExternalLink,
  Eye,
  Calendar,
  MapPin,
  Users,
  Building2,
  UserCheck,
  Check,
  AlertCircle,
  Pencil,
  Trash2,
  Loader2,
  FileCheck,
  ShieldCheck,
  Download,
  Upload,
} from "lucide-react";
import { generateInstitutionalReportPdf, ReportData } from "@/utils/reportPdfGenerator";
import { DSCASC_LOGO_PNG_BASE64, IIC_LOGO_PNG_BASE64 } from "@/utils/reportLogos";
import { saveStoredGlobalSignature } from "@/utils/signatureLoader";

const PAGE_SIZE = 5;

const APPROVAL_STAGES = [
  "Event Coordinators",
  "HOD-BCA",
  "Vice-Principal",
  "IQAC Coordinator",
  "Principal",
  "Approved",
  "Rejected",
];

const STAGE_STEPS = [
  { id: "Event Coordinators", label: "Event Coordinators", num: 1 },
  { id: "HOD-BCA", label: "HOD-BCA", num: 2 },
  { id: "Vice-Principal", label: "Vice-Principal", num: 3 },
  { id: "IQAC Coordinator", label: "IQAC Coordinator", num: 4 },
  { id: "Principal", label: "Principal", num: 5 },
];

export const getEffectiveStage = (e: any): string => {
  if (!e) return "Event Coordinators";
  if (e.status === "approved" || e.approvalStage === "Approved") return "Approved";
  if (e.status === "rejected" || e.approvalStage === "Rejected") return "Rejected";
  return e.approvalStage || "Event Coordinators";
};

export const getEffectiveStatus = (e: any): "approved" | "pending" | "rejected" => {
  if (!e) return "pending";
  if (e.approvalStage === "Approved" || e.status === "approved") return "approved";
  if (e.approvalStage === "Rejected" || e.status === "rejected") return "rejected";
  return e.status || "pending";
};

export const getStageIndex = (stage: string) => {
  if (stage === "Approved") return 6;
  if (stage === "Rejected") return -1;
  const idx = STAGE_STEPS.findIndex((s) => s.id === stage);
  return idx >= 0 ? idx + 1 : 1;
};

/* ================= REPORT PREVIEW DIALOG CONTENT ================= */
const ReportPreviewContent = ({
  previewEvent,
  setPreviewEvent,
  downloadingReportId,
  handleDownloadReport,
  openSignatureUploadModal,
  isFaculty,
  getStageBadgeStyle,
  formatReportData,
}: any) => {
  if (!previewEvent) return null;

  const reportData = formatReportData(previewEvent);
  const currentStage = getEffectiveStage(previewEvent);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState<boolean>(true);

  useEffect(() => {
    let isCancelled = false;
    setPdfLoading(true);
    generateInstitutionalReportPdf(reportData)
      .then((generator) => {
        if (!isCancelled) {
          const url = generator.getBlobUrl();
          setPdfBlobUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return url;
          });
          setPdfLoading(false);
        }
      })
      .catch((err) => {
        console.warn("Failed to generate PDF Blob URL:", err);
        if (!isCancelled) setPdfLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [previewEvent?.approvalStage, previewEvent?._id, JSON.stringify(previewEvent?.stageSignatures)]);

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-lg font-bold flex flex-wrap items-center justify-between gap-2 border-b pb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            <span>24-Point IQAC Institutional Report PDF Preview</span>
          </div>

          <Button
            size="sm"
            disabled={downloadingReportId === previewEvent._id}
            onClick={() => handleDownloadReport(previewEvent)}
            className="h-8 text-xs font-semibold gap-1.5 bg-primary text-primary-foreground shadow-sm"
          >
            {downloadingReportId === previewEvent._id ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>Download PDF</span>
          </Button>
        </DialogTitle>
        <DialogDescription className="text-xs">
          Previewing full multi-page PDF document for <strong>{previewEvent.name}</strong> (includes 24-point ledger, digital signature stamps, brochure & attendance sheets).
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-2 text-xs">
        {/* INTERACTIVE STAGE MARKER BAR */}
        <div className="p-3 bg-muted/40 border rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-muted-foreground uppercase tracking-wider text-[11px]">
              Mark Approval Stage to Stamp Digital Signatures:
            </span>
            <Badge className={getStageBadgeStyle(currentStage)}>
              Stage: {currentStage}
            </Badge>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-6 gap-1.5 pt-1">
            {["Event Coordinators", "HOD-BCA", "Vice-Principal", "IQAC Coordinator", "Principal", "Approved"].map((st, idx) => {
              const currentIdx = getStageIndex(currentStage);
              const isPassed = currentIdx > (idx + 1) || currentStage === "Approved";
              const isCurrent = currentStage === st;

              return (
                <button
                  key={st}
                  type="button"
                  disabled={isFaculty}
                  onClick={() => {
                    if (isFaculty) return;
                    openSignatureUploadModal(previewEvent, st);
                  }}
                  className={`p-2 rounded-lg border text-center transition-all ${
                    isFaculty ? "cursor-default" : "cursor-pointer"
                  } ${
                    isCurrent
                      ? "bg-primary text-primary-foreground border-primary font-bold shadow-sm"
                      : isPassed
                      ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400 font-medium"
                      : "bg-background border-border text-muted-foreground hover:bg-muted"
                  }`}
                  title={isFaculty ? `Current Stage: ${st}` : `Click to mark stage as ${st}`}
                >
                  <span className="block text-[11px] leading-tight">
                    {st === "Approved" ? "✓ Approved" : `${idx + 1}. ${st}`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* FULL MULTI-PAGE PDF EMBEDDED VIEWER */}
        <div className="border rounded-xl p-1 bg-muted/20">
          {pdfLoading ? (
            <div className="h-[750px] flex flex-col items-center justify-center gap-2 bg-background rounded-lg border">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground font-medium">
                Rendering full multi-page PDF document with brochure & attendance sheets...
              </span>
            </div>
          ) : pdfBlobUrl ? (
            <iframe
              src={pdfBlobUrl}
              className="w-full h-[750px] border-0 rounded-lg bg-white shadow-inner"
              title="Official Institutional PDF Report Preview"
            />
          ) : null}
        </div>
      </div>
    </>
  );
};

/* ================= MAIN EVENTS TABLE COMPONENT ================= */
interface EventsTableProps {
  facultyView?: boolean;
}

const EventsTable = ({ facultyView = false }: EventsTableProps) => {
  const { user } = useAuth();
  const isFaculty = facultyView || user?.role === "faculty";
  const [data, setData] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");
  const [club, setClub] = useState("all");
  const [date, setDate] = useState("");
  const [sort, setSort] = useState("latest");
  const [page, setPage] = useState(1);
  const { toast } = useToast();

  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState<any>(null);

  // Event Details Modal State
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsEvent, setDetailsEvent] = useState<any>(null);

  // Report Download & Preview State
  const [downloadingReportId, setDownloadingReportId] = useState<string | null>(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewEvent, setPreviewEvent] = useState<any>(null);

  // Format event data to 24-point institutional report structure
  const formatReportData = (ev: any): ReportData => {
    if (!ev) return { name: "" };
    return {
      _id: ev._id,
      name: ev.name || "",
      type: ev.type || "Faculty Development Program",
      department: ev.department || "BCA",
      approvalStage: getEffectiveStage(ev),
      status: getEffectiveStatus(ev),
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
        ev.facultyCoordinator || ev.facultyName || "Lakshmi S",
      facultyCoordinatorDetails:
        ev.facultyCoordinatorDetails ||
        `Name: ${ev.facultyCoordinator || ev.facultyName || "Lakshmi S"}\nDesignation : Assistant Professor\nDepartment: Department of Computer Applications, DSCASC.`,
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
        `Official institutional report for ${ev.name} conducted on ${ev.date} by ${ev.clubName || "Club"}.`,
      attachments: ev.attachments || [],
      eventPhotos: ev.eventPhotos || [],
      signedAttendanceSheets: ev.signedAttendanceSheets || [],
      stageSignatures: ev.stageSignatures || {},
    };
  };

  const handleDownloadReport = async (ev: any) => {
    try {
      setDownloadingReportId(ev._id);
      const reportData = formatReportData(ev);
      const doc = await generateInstitutionalReportPdf(reportData);
      const sanitizedName = (reportData.name || "Event_Report").replace(
        /[^a-zA-Z0-9_-]/g,
        "_"
      );
      doc.save(`DSCASC_IQAC_Report_${sanitizedName}.pdf`);
      toast({
        title: "Report PDF Generated",
        description: `Official institutional 24-point report downloaded for "${reportData.name}".`,
      });
    } catch (err: any) {
      console.error("Failed to generate report PDF:", err);
      toast({
        title: "Report Generation Failed",
        description: err.message || "Could not generate report PDF",
        variant: "destructive",
      });
    } finally {
      setDownloadingReportId(null);
    }
  };

  const handleOpenReportPreview = async (e: any) => {
    try {
      setPreviewEvent(e);
      setPreviewModalOpen(true);
      const res = await api.get(`/events/${e._id}`);
      if (res.data) {
        setPreviewEvent((prev: any) => ({ ...prev, ...res.data }));
      }
    } catch (err) {
      console.error("Failed to fetch event details:", err);
    }
  };

  useEffect(() => {
    fetchEvents();

    socket.on("event:created", (event) => {
      setData((prev) => {
        const exists = prev.find((e) => e._id === event._id);
        if (exists) return prev;
        return [event, ...prev];
      });
    });

    socket.on("event:updated", (event) => {
      setData((prev) =>
        prev.map((e) => (e._id === event._id ? { ...e, ...event } : e))
      );
      setDetailsEvent((prev: any) =>
        prev && prev._id === event._id ? { ...prev, ...event } : prev
      );
      setPreviewEvent((prev: any) =>
        prev && prev._id === event._id ? { ...prev, ...event } : prev
      );
    });

    socket.on("eventDeleted", (id) => {
      setData((prev) => prev.filter((e) => e._id !== id));
      setDetailsEvent((prev: any) => (prev && prev._id === id ? null : prev));
      setPreviewEvent((prev: any) => (prev && prev._id === id ? null : prev));
    });

    return () => {
      socket.off("event:created");
      socket.off("event:updated");
      socket.off("eventDeleted");
    };
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, status, stageFilter, club, date]);

  const fetchEvents = async () => {
    try {
      const res = await api.get("/events");
      setData(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this event?")) return;
    try {
      await api.delete(`/events/${id}`);
      setData((prev) => prev.filter((e) => e._id !== id));
      if (detailsEvent?._id === id) setDetailsOpen(false);
      if (previewEvent?._id === id) setPreviewModalOpen(false);
      toast({ title: "Event deleted" });
    } catch (err: any) {
      toast({ title: "Delete Failed", description: err.message, variant: "destructive" });
    }
  };

  const handleStatusChange = async (id: string, newStatus: "approved" | "rejected") => {
    try {
      await api.put(`/admin/events/${id}/status`, { status: newStatus });
      const newStage = newStatus === "approved" ? "Approved" : "Rejected";
      setData((prev) =>
        prev.map((e) => (e._id === id ? { ...e, status: newStatus, approvalStage: newStage } : e))
      );
      setDetailsEvent((prev: any) =>
        prev && prev._id === id ? { ...prev, status: newStatus, approvalStage: newStage } : prev
      );
      setPreviewEvent((prev: any) =>
        prev && prev._id === id ? { ...prev, status: newStatus, approvalStage: newStage } : prev
      );
      toast({
        title: `Event ${newStatus === "approved" ? "Approved" : "Rejected"}`,
        description: `Event status marked as ${newStatus}.`,
      });
    } catch (err: any) {
      console.error("Failed to update status:", err);
      toast({
        title: "Update Failed",
        description: err.response?.data?.message || "Could not update status",
        variant: "destructive",
      });
    }
  };

  // Stage Signature Upload Modal States
  const [sigModalOpen, setSigModalOpen] = useState<boolean>(false);
  const [targetStageForSig, setTargetStageForSig] = useState<string>("");
  const [targetEventForSig, setTargetEventForSig] = useState<any>(null);
  const [sigFile, setSigFile] = useState<File | null>(null);
  const [sigPreview, setSigPreview] = useState<string>("");
  const [sigUploading, setSigUploading] = useState<boolean>(false);

  const openSignatureUploadModal = (event: any, stage: string) => {
    setTargetEventForSig(event);
    setTargetStageForSig(stage);
    setSigFile(null);
    setSigPreview("");
    setSigModalOpen(true);
  };

  const handleSaveStageWithSignature = async (withSignature: boolean) => {
    if (!targetEventForSig || !targetStageForSig) return;
    setSigUploading(true);
    try {
      const sigDataUrl = withSignature ? sigPreview : undefined;
      if (sigDataUrl) {
        saveStoredGlobalSignature(targetStageForSig, sigDataUrl);
      }
      await handleStageChange(
        targetEventForSig._id,
        targetStageForSig,
        sigDataUrl,
        targetStageForSig
      );
      setSigModalOpen(false);
    } catch (err) {
      console.error("Save stage with signature failed:", err);
    } finally {
      setSigUploading(false);
    }
  };

  const handleStageChange = async (
    id: string,
    newStage: string,
    signatureBase64?: string,
    signatureStage?: string
  ) => {
    try {
      const res = await api.put(`/admin/events/${id}/stage`, {
        stage: newStage,
        signature: signatureBase64,
        signatureStage: signatureStage || newStage,
      });

      const updatedStatus =
        newStage === "Approved" ? "approved" : newStage === "Rejected" ? "rejected" : "pending";
      const updatedEvent = res.data?.event;

      const mergeSignatures = (prevObj: any) => {
        if (!signatureBase64) return updatedEvent?.stageSignatures || prevObj;
        const stageKey = signatureStage || newStage;
        if (updatedEvent?.stageSignatures) {
          return updatedEvent.stageSignatures;
        }
        const copy = typeof prevObj === "object" && prevObj ? { ...prevObj } : {};
        copy[stageKey] = signatureBase64;
        return copy;
      };

      setData((prev) =>
        prev.map((e) =>
          e._id === id
            ? {
                ...e,
                approvalStage: newStage,
                status: updatedStatus,
                stageSignatures: mergeSignatures(e.stageSignatures),
              }
            : e
        )
      );

      setDetailsEvent((prev: any) =>
        prev && prev._id === id
          ? {
              ...prev,
              approvalStage: newStage,
              status: updatedStatus,
              stageSignatures: mergeSignatures(prev.stageSignatures),
            }
          : prev
      );

      setPreviewEvent((prev: any) =>
        prev && prev._id === id
          ? {
              ...prev,
              approvalStage: newStage,
              status: updatedStatus,
              stageSignatures: mergeSignatures(prev.stageSignatures),
            }
          : prev
      );

      toast({
        title: "Approval Stage Updated",
        description: signatureBase64
          ? `Stage updated to ${newStage} with signature uploaded!`
          : `Event moved to stage: ${newStage}`,
      });
    } catch (err: any) {
      console.error("Failed to update stage:", err);
      toast({
        title: "Stage Update Failed",
        description: err.response?.data?.message || "Could not update approval stage",
        variant: "destructive",
      });
    }
  };

  const handleEditSave = async () => {
    try {
      await api.put(`/events/${editData._id}`, editData);
      setData((prev) => prev.map((e) => (e._id === editData._id ? { ...e, ...editData } : e)));
      setEditOpen(false);
      toast({ title: "Event updated successfully" });
    } catch (err: any) {
      console.error(err);
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    }
  };

  const handleOpenDetails = (event: any) => {
    setDetailsEvent(event);
    setDetailsOpen(true);
  };

  const exportCSV = () => {
    const rows = data.map((e) => [
      e.name,
      e.clubName,
      e.facultyName,
      e.date,
      getEffectiveStatus(e),
      getEffectiveStage(e),
    ]);

    const csv = [
      ["Name", "Club", "Faculty", "Date", "Status", "Approval Stage"],
      ...rows,
    ]
      .map((r) => r.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "events.csv";
    a.click();
  };

  const clubs = useMemo(() => {
    const set = new Set(data.map((e) => e.clubName));
    return ["all", ...Array.from(set).filter(Boolean)];
  }, [data]);

  const filtered = useMemo(() => {
    let result = [...data];

    result = result.filter((e) =>
      e.name?.toLowerCase().includes(search.toLowerCase())
    );

    if (status !== "all") {
      result = result.filter((e) => getEffectiveStatus(e) === status);
    }
    if (stageFilter !== "all") {
      result = result.filter((e) => getEffectiveStage(e) === stageFilter);
    }
    if (club !== "all") result = result.filter((e) => e.clubName === club);
    if (date) result = result.filter((e) => e.date === date);

    result.sort((a, b) =>
      sort === "latest"
        ? new Date(b.date).getTime() - new Date(a.date).getTime()
        : new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    return result;
  }, [data, search, status, stageFilter, club, date, sort]);

  const paginated = filtered.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  const getStatusColor = (s: string) => {
    if (s === "approved") return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30";
    if (s === "pending") return "bg-amber-500/10 text-amber-400 border border-amber-500/30";
    if (s === "rejected") return "bg-rose-500/10 text-rose-400 border border-rose-500/30";
    return "bg-muted text-muted-foreground";
  };

  const getStageBadgeStyle = (stage: string) => {
    switch (stage) {
      case "Event Coordinators":
        return "bg-sky-500/15 text-sky-400 border-sky-500/40 hover:bg-sky-500/25";
      case "HOD-BCA":
        return "bg-amber-500/15 text-amber-400 border-amber-500/40 hover:bg-amber-500/25";
      case "Vice-Principal":
        return "bg-purple-500/15 text-purple-400 border-purple-500/40 hover:bg-purple-500/25";
      case "IQAC Coordinator":
        return "bg-indigo-500/15 text-indigo-400 border-indigo-500/40 hover:bg-indigo-500/25";
      case "Principal":
        return "bg-pink-500/15 text-pink-400 border-pink-500/40 hover:bg-pink-500/25";
      case "Approved":
        return "bg-emerald-500/15 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/25";
      case "Rejected":
        return "bg-rose-500/15 text-rose-400 border-rose-500/40 hover:bg-rose-500/25";
      default:
        return "bg-sky-500/15 text-sky-400 border-sky-500/40";
    }
  };

  const getStageStep = (stage: string) => {
    switch (stage) {
      case "Event Coordinators":
        return "1/5";
      case "HOD-BCA":
        return "2/5";
      case "Vice-Principal":
        return "3/5";
      case "IQAC Coordinator":
        return "4/5";
      case "Principal":
        return "5/5";
      case "Approved":
        return "✓ Completed";
      case "Rejected":
        return "✕ Rejected";
      default:
        return "1/5";
    }
  };

  return (
    <div className="p-4 space-y-4 border rounded-xl bg-card shadow-sm">
      {/* TOP FILTER BAR */}
      <div className="flex flex-wrap gap-3 justify-between items-center">
        <Input
          placeholder="Search events..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-52 h-9 text-xs bg-muted/40"
        />

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="text-xs bg-card border border-border rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary text-foreground cursor-pointer"
          >
            <option value="all">All Status</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
          </select>

          {/* 5-Stage Filter */}
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="text-xs bg-card border border-border rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary text-foreground cursor-pointer"
          >
            <option value="all">All Approval Stages</option>
            <option value="Event Coordinators">1. Event Coordinators</option>
            <option value="HOD-BCA">2. HOD-BCA</option>
            <option value="Vice-Principal">3. Vice-Principal</option>
            <option value="IQAC Coordinator">4. IQAC Coordinator</option>
            <option value="Principal">5. Principal</option>
            <option value="Approved">✓ Approved</option>
          </select>

          {/* Club Filter */}
          <select
            value={club}
            onChange={(e) => setClub(e.target.value)}
            className="text-xs bg-card border border-border rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary text-foreground cursor-pointer"
          >
            <option value="all">All Clubs</option>
            {clubs
              .filter((c) => c !== "all")
              .map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
          </select>

          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="text-xs bg-card border border-border rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary text-foreground cursor-pointer"
          />

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="text-xs bg-card border border-border rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary text-foreground cursor-pointer"
          >
            <option value="latest">Latest First</option>
            <option value="oldest">Oldest First</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={exportCSV} className="text-xs h-9 gap-1.5">
            <FileText className="w-3.5 h-3.5" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto rounded-lg border border-border/60">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30 text-muted-foreground text-xs uppercase tracking-wider text-left">
              <th className="py-3 px-3">Event Name</th>
              <th className="py-3 px-3">Club</th>
              <th className="py-3 px-3">Faculty</th>
              <th className="py-3 px-3">Date</th>
              <th className="py-3 px-3 text-center">Status</th>
              <th className="py-3 px-3 text-center">Approval Stage</th>
              <th className="py-3 px-3 text-center">Reports</th>
              <th className="py-3 px-3 text-right">Actions</th>
            </tr>
          </thead>

          <tbody>
            {paginated.length > 0 ? (
              paginated.map((e) => {
                const currentStage = getEffectiveStage(e);
                const currentStatus = getEffectiveStatus(e);
                const stepNum = getStageStep(currentStage);

                return (
                  <tr key={e._id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    {/* EVENT NAME (CLICKABLE) */}
                    <td className="py-3 px-3 space-y-0.5">
                      <button
                        type="button"
                        onClick={() => handleOpenDetails(e)}
                        className="font-medium text-foreground hover:text-primary transition-colors text-left flex items-center gap-1.5 group"
                        title="Click to view full event details & approval roadmap"
                      >
                        <span>{e.name}</span>
                        <Eye className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-primary transition-opacity" />
                      </button>
                      <span className="text-[11px] text-muted-foreground block">
                        {e.venue || "Campus Venue"} • {e.time || "TBD"}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-muted-foreground text-xs">{e.clubName || "—"}</td>
                    <td className="py-3 px-3 text-muted-foreground text-xs">{e.facultyName || "—"}</td>
                    <td className="py-3 px-3 text-muted-foreground text-xs whitespace-nowrap">{e.date}</td>

                    {/* STATUS COLUMN */}
                    <td className="py-3 px-3 text-center">
                      <div className="flex flex-col items-center gap-0.5">
                        <Badge className={`${getStatusColor(currentStatus)} capitalize text-[11px] font-semibold px-2 py-0.5`}>
                          {currentStatus}
                        </Badge>
                        {currentStatus === "approved" && (
                          <span className="text-[10px] text-red-400 font-medium">
                            Locked
                          </span>
                        )}
                      </div>
                    </td>

                    {/* APPROVAL STAGE COLUMN */}
                    <td className="py-3 px-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        {isFaculty ? (
                          <span
                            onClick={() => handleOpenDetails(e)}
                            className={`text-xs rounded-lg px-2.5 py-1 font-semibold border inline-block cursor-pointer transition-all shadow-sm ${getStageBadgeStyle(
                              currentStage
                            )}`}
                            title="Click to view approval roadmap"
                          >
                            {currentStage === "Approved"
                              ? "✓ Approved"
                              : currentStage === "Rejected"
                              ? "✕ Rejected"
                              : currentStage}
                          </span>
                        ) : (
                          <select
                            value={currentStage}
                            onChange={(ev) => openSignatureUploadModal(e, ev.target.value)}
                            className={`text-xs rounded-lg px-2.5 py-1.5 font-semibold border cursor-pointer transition-all shadow-sm ${getStageBadgeStyle(
                              currentStage
                            )}`}
                            title="Click to switch approval stage"
                          >
                            <option value="Event Coordinators" className="bg-popover text-popover-foreground">
                              1. Event Coordinators
                            </option>
                            <option value="HOD-BCA" className="bg-popover text-popover-foreground">
                              2. HOD-BCA
                            </option>
                            <option value="Vice-Principal" className="bg-popover text-popover-foreground">
                              3. Vice-Principal
                            </option>
                            <option value="IQAC Coordinator" className="bg-popover text-popover-foreground">
                              4. IQAC Coordinator
                            </option>
                            <option value="Principal" className="bg-popover text-popover-foreground">
                              5. Principal
                            </option>
                            <option value="Approved" className="bg-popover text-popover-foreground">
                              ✓ Approved
                            </option>
                            <option value="Rejected" className="bg-popover text-popover-foreground">
                              ✕ Rejected
                            </option>
                          </select>
                        )}
                        <span className="text-[10px] text-muted-foreground font-medium">
                          {currentStage === "Approved" ? "Clearance Done" : `Stage ${stepNum}`}
                        </span>
                      </div>
                    </td>

                    {/* REPORTS COLUMN */}
                    <td className="py-3 px-3 text-center">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenReportPreview(e)}
                        className="h-7 px-2.5 text-xs font-medium border-primary/30 text-primary hover:bg-primary/10 gap-1.5 transition-colors shadow-sm"
                        title="Click to preview 24-point IQAC report & digital signatures"
                      >
                        <Eye className="w-3.5 h-3.5 text-primary" />
                        <span>Preview Report</span>
                      </Button>
                    </td>

                    {/* ACTIONS COLUMN */}
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {!isFaculty && currentStatus === "pending" && (
                          <>
                            <Button
                              size="sm"
                              className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm"
                              onClick={() => handleStatusChange(e._id, "approved")}
                              title="Directly approve event"
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2.5 text-xs border-red-500/40 text-red-500 hover:bg-red-500/10 font-medium"
                              onClick={() => handleStatusChange(e._id, "rejected")}
                              title="Reject event"
                            >
                              Reject
                            </Button>
                          </>
                        )}

                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2.5 text-xs"
                          disabled={isFaculty && currentStatus === "approved"}
                          onClick={() => {
                            if (isFaculty && currentStatus === "approved") return;
                            setEditData(e);
                            setEditOpen(true);
                          }}
                          title="Edit event"
                        >
                          <Pencil className="w-3 h-3 mr-1" />
                          Edit
                        </Button>

                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-7 px-2 text-xs"
                          onClick={() => handleDelete(e._id)}
                          title="Delete event"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={8} className="text-center py-10 text-muted-foreground text-xs">
                  No events found matching current filter criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {filtered.length > PAGE_SIZE && (
        <div className="flex items-center justify-between pt-2 text-xs text-muted-foreground">
          <span>
            Showing {(page - 1) * PAGE_SIZE + 1} to{" "}
            {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} events
          </span>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs"
              disabled={page * PAGE_SIZE >= filtered.length}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* ================= MODAL 1: EVENT DETAILS & 5-STAGE APPROVAL ROADMAP ================= */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {detailsEvent && (() => {
            const modalStage = getEffectiveStage(detailsEvent);
            const modalStatus = getEffectiveStatus(detailsEvent);

            return (
              <>
                <DialogHeader>
                  <DialogTitle className="text-xl flex items-center justify-between gap-2">
                    <span>{detailsEvent.name}</span>
                    <Badge className={getStatusColor(modalStatus)}>
                      {modalStatus}
                    </Badge>
                  </DialogTitle>
                  <DialogDescription>
                    {detailsEvent.clubName} • Coordinated by {detailsEvent.facultyName}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-5 py-2">
                  {/* 5-STAGE SIGNATORY ROADMAP */}
                  <div className="p-4 rounded-xl bg-muted/40 border space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        5-Stage Institutional Signatory Progress
                      </h4>
                      <span className="text-xs font-semibold text-primary">
                        Current: {modalStage}
                      </span>
                    </div>

                    <div className="grid grid-cols-5 gap-2 pt-2">
                      {STAGE_STEPS.map((st) => {
                        const currentIdx = getStageIndex(modalStage);
                        const isPassed = currentIdx > st.num || modalStage === "Approved";
                        const isCurrent = modalStage === st.id || (!modalStage && st.num === 1);

                        return (
                          <button
                            key={st.id}
                            type="button"
                            disabled={isFaculty}
                            onClick={() => !isFaculty && handleStageChange(detailsEvent._id, st.id)}
                            className={`flex flex-col items-center text-center p-2 rounded-lg border transition-all ${
                              isFaculty ? "cursor-default" : "cursor-pointer"
                            } ${
                              isCurrent
                                ? "bg-primary/10 border-primary text-primary font-bold shadow-sm"
                                : isPassed
                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                                : "bg-background/50 border-border text-muted-foreground hover:bg-muted"
                            }`}
                            title={isFaculty ? `Stage: ${st.label}` : `Click to set stage to ${st.label}`}
                          >
                            <div
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs mb-1 font-semibold ${
                                isCurrent
                                  ? "bg-primary text-primary-foreground"
                                  : isPassed
                                  ? "bg-emerald-500 text-white"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {isPassed ? <Check className="w-3.5 h-3.5" /> : st.num}
                            </div>
                            <span className="text-[11px] leading-tight line-clamp-2">{st.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {!isFaculty && (
                      <div className="pt-2 flex items-center justify-between gap-2 border-t text-xs">
                        <span className="text-muted-foreground">Quick Action:</span>
                        <div className="flex gap-1.5">
                          {modalStatus !== "approved" ? (
                            <Button
                              size="sm"
                              className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                              onClick={() => handleStatusChange(detailsEvent._id, "approved")}
                            >
                              Approve Event (All Stages Cleared)
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs border-amber-500/40 text-amber-400"
                              onClick={() => handleStageChange(detailsEvent._id, "Event Coordinators")}
                            >
                              Reset to Stage 1
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* EVENT SPECIFICATIONS GRID */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 bg-muted/30 border rounded-lg space-y-1">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-primary" /> Date
                      </span>
                      <span className="font-semibold text-foreground text-sm">{detailsEvent.date}</span>
                    </div>

                    <div className="p-3 bg-muted/30 border rounded-lg space-y-1">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-primary" /> Time
                      </span>
                      <span className="font-semibold text-foreground text-sm">{detailsEvent.time || "—"}</span>
                    </div>

                    <div className="p-3 bg-muted/30 border rounded-lg space-y-1">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-primary" /> Venue
                      </span>
                      <span className="font-semibold text-foreground text-sm">{detailsEvent.venue || "Campus"}</span>
                    </div>

                    <div className="p-3 bg-muted/30 border rounded-lg space-y-1">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-primary" /> Club
                      </span>
                      <span className="font-semibold text-foreground text-sm">{detailsEvent.clubName || "—"}</span>
                    </div>

                    <div className="p-3 bg-muted/30 border rounded-lg space-y-1">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5 text-primary" /> Faculty Coordinator
                      </span>
                      <span className="font-semibold text-foreground text-sm">{detailsEvent.facultyName || "—"}</span>
                    </div>

                    <div className="p-3 bg-muted/30 border rounded-lg space-y-1">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-primary" /> Max Capacity
                      </span>
                      <span className="font-semibold text-foreground text-sm">{detailsEvent.maxCapacity || 100} students</span>
                    </div>
                  </div>

                  {/* DESCRIPTION */}
                  {detailsEvent.description && (
                    <div className="space-y-1 text-xs">
                      <h5 className="font-bold text-muted-foreground uppercase tracking-wider">Event Description</h5>
                      <p className="p-3 bg-muted/20 border rounded-lg text-foreground whitespace-pre-wrap">
                        {detailsEvent.description}
                      </p>
                    </div>
                  )}

                  {/* ATTACHMENTS & EVENT REPORTS */}
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <h5 className="font-bold text-muted-foreground uppercase tracking-wider">Event Reports & Documents</h5>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={downloadingReportId === detailsEvent._id}
                        onClick={() => handleDownloadReport(detailsEvent)}
                        className="h-7 text-xs font-medium border-primary/30 text-primary hover:bg-primary/10 gap-1.5"
                      >
                        {downloadingReportId === detailsEvent._id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <FileText className="w-3.5 h-3.5" />
                        )}
                        <span>Download Official Report PDF</span>
                      </Button>
                    </div>

                    {detailsEvent.attachments && detailsEvent.attachments.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {detailsEvent.attachments
                          .filter((f: any) => !f.isDeleted)
                          .map((file: any) => (
                            <a
                              key={file._id}
                              href={`http://localhost:5000${file.url}`}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/30 hover:bg-muted/50 text-foreground transition-colors group"
                            >
                              <div className="flex items-center gap-2 truncate">
                                <FileText className="w-4 h-4 text-primary shrink-0" />
                                <span className="truncate font-medium capitalize">
                                  {file.label || file.originalName || "Document"}
                                </span>
                              </div>
                              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary" />
                            </a>
                          ))}
                      </div>
                    ) : (
                      <p className="p-3 bg-muted/20 border rounded-lg text-muted-foreground italic">
                        No extra document files attached. You can click above to download the generated 24-point IQAC report PDF.
                      </p>
                    )}
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ================= MODAL 2: EDIT EVENT ================= */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
          </DialogHeader>

          {editData && (
            <div className="space-y-3 pt-2">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Event Name</label>
                <Input
                  value={editData.name || ""}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Event Type</label>
                <Input
                  value={editData.type || ""}
                  onChange={(e) => setEditData({ ...editData, type: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Date</label>
                <Input
                  type="date"
                  value={editData.date}
                  onChange={(e) => setEditData({ ...editData, date: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Venue</label>
                <Input
                  value={editData.venue || ""}
                  onChange={(e) => setEditData({ ...editData, venue: e.target.value })}
                />
              </div>

              <Button onClick={handleEditSave} className="w-full bg-gradient-primary">
                Save Changes
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ================= MODAL 3: 24-POINT REPORT PREVIEW & DIGITAL SIGNATURES ================= */}
      <Dialog open={previewModalOpen} onOpenChange={setPreviewModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {previewEvent ? (
            <ReportPreviewContent
              previewEvent={previewEvent}
              setPreviewEvent={setPreviewEvent}
              downloadingReportId={downloadingReportId}
              handleDownloadReport={handleDownloadReport}
              openSignatureUploadModal={openSignatureUploadModal}
              isFaculty={isFaculty}
              getStageBadgeStyle={getStageBadgeStyle}
              formatReportData={formatReportData}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      {/* ================= MODAL 4: STAGE SIGNATURE UPLOAD MODAL ================= */}
      <Dialog open={sigModalOpen} onOpenChange={setSigModalOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-800">
              <Upload className="w-5 h-5 text-primary" />
              <span>Mark Stage: {targetStageForSig}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Upload official digital signature image for <strong>{targetStageForSig}</strong> on event report <em>{targetEventForSig?.name}</em>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer relative">
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setSigFile(file);
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setSigPreview(reader.result as string);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              {sigPreview ? (
                <div className="flex flex-col items-center gap-2">
                  <img
                    src={sigPreview}
                    alt="Signature Preview"
                    className="max-h-24 max-w-[200px] object-contain border p-1.5 rounded bg-white shadow-sm"
                  />
                  <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Signature Attached ({sigFile?.name})
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1 text-center py-3">
                  <Upload className="w-8 h-8 text-slate-400 mb-1" />
                  <span className="text-xs font-semibold text-slate-700">Click or Drag &amp; Drop Digital Signature</span>
                  <span className="text-[10px] text-slate-500">Supports PNG, JPG (Clean background recommended)</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={sigUploading}
                onClick={() => handleSaveStageWithSignature(false)}
                className="text-xs text-slate-600"
              >
                Skip Upload &amp; Change Stage
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={sigUploading || !sigPreview}
                onClick={() => handleSaveStageWithSignature(true)}
                className="text-xs font-bold bg-primary text-primary-foreground gap-1.5 shadow-sm"
              >
                {sigUploading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Save Stage &amp; Stamp Signature
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EventsTable;