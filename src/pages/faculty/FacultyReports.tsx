import { useState, useEffect, useRef } from "react";
import api from "@/api/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  FileText,
  Upload,
  Download,
  Eye,
  CheckCircle2,
  Clock,
  Sparkles,
  Send,
  Trash2,
  Image as ImageIcon,
  FileCheck,
  Building2,
  Layers,
  Users,
  Calendar,
  MapPin,
  Loader2,
  ExternalLink,
  ChevronRight,
  Printer,
  ShieldCheck,
  Plus,
  RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { generateInstitutionalReportPdf, ReportData } from "@/utils/reportPdfGenerator";
import { DSCASC_LOGO_SVG, IIC_LOGO_SVG } from "@/utils/reportLogos";

const BACKEND_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace("/api", "");

const FacultyReports = () => {
  const { toast } = useToast();
  const [events, setEvents] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [activeTab, setActiveTab] = useState<"form" | "preview">("form");

  // Step 2 Modal: Attachments prompt
  const [isAttachmentModalOpen, setIsAttachmentModalOpen] = useState(false);
  const [uploadingBrochure, setUploadingBrochure] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [uploadingSheet, setUploadingSheet] = useState(false);

  // Form State
  const [formData, setFormData] = useState<ReportData>({
    name: "",
    type: "Faculty Development Program",
    department: "BCA",
    reportDate: new Date().toLocaleDateString("en-GB"),
    date: "",
    time: "2:00 PM to 4:00 PM",
    venue: "Online Google meet",
    resourcePerson1: {
      name: "",
      designation: "",
      organization: "",
    },
    resourcePerson1Topics: "",
    resourcePerson2: {
      name: "NA",
      designation: "NA",
      organization: "NA",
    },
    resourcePerson2Topics: "NA",
    facultyParticipants: {
      internal: 22,
      external: 0,
    },
    studentParticipants: {
      internal: 0,
      external: 0,
    },
    facultyCoordinator: "",
    facultyCoordinatorDetails: "",
    studentCoordinator: "",
    studentCoordinatorDetails: "",
    totalExpenditure: "20,000/-",
    sponsors: "NA",
    agenda: "",
    websiteReportLink: "No",
    socialMediaLinks: "---",
    newspaperReport: "No",
    certificatesPrinted: "No",
    feedbackCollected: "Yes",
    attendanceAttached: "Yes",
    photographsAttached: "Attached",
    summary: "",
    attachments: [],
    eventPhotos: [],
    signedAttendanceSheets: [],
  });

  // File input refs
  const brochureInputRef = useRef<HTMLInputElement>(null);
  const photosInputRef = useRef<HTMLInputElement>(null);
  const sheetInputRef = useRef<HTMLInputElement>(null);

  // Load events
  const loadEvents = async () => {
    try {
      setLoading(true);
      const res = await api.get("/events");
      const list = Array.isArray(res.data) ? res.data : [];
      setEvents(list);
      if (list.length > 0 && !selectedId) {
        setSelectedId(list[0]._id);
      }
    } catch (err: any) {
      toast({
        title: "Error fetching events",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  // Fetch full event details when selected
  useEffect(() => {
    if (!selectedId) return;

    api
      .get(`/events/${selectedId}`)
      .then((res) => {
        const ev = res.data;
        if (!ev) return;

        setFormData({
          _id: ev._id,
          name: ev.name || "",
          type: ev.type || "Faculty Development Program",
          department: ev.department || "BCA",
          reportDate: ev.reportDate || new Date().toLocaleDateString("en-GB"),
          date: ev.date || "",
          time: ev.time || "2:00 PM to 4:00 PM",
          venue: ev.venue || ev.location || "Online Google meet",
          resourcePerson1: {
            name: ev.resourcePerson1?.name || ev.resourcePerson?.name || "Nirmal Gaud",
            designation: ev.resourcePerson1?.designation || "Founder & CEO",
            organization: ev.resourcePerson1?.organization || ev.resourcePerson?.organization || "Cognitia Research - ThinkAI",
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
          facultyCoordinator: ev.facultyCoordinator || "Lakshmi S",
          facultyCoordinatorDetails:
            ev.facultyCoordinatorDetails ||
            `Name: ${ev.facultyCoordinator || "Lakshmi S"}\nDesignation : Assistant Professor\nDepartment: Department of Computer Applications, DSCASC.`,
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
            ev.eventPhotos?.length > 0 ? "Attached" : "Attached",
          summary:
            ev.summary ||
            "The Department of Computer Applications – BCA conducted a FDP for faculty members by Nirmal Gaud. The FDP was on “Computational Mathematics for AI & Machine Learning: Modeling, Analysis, and Research Paper Writing”. Day 1 to Day 5 the concepts like introduced to the mathematical foundations underlying AI and ML models, with a focus on deep learning architectures such as DenseNet, and then the session included discussions on selected research papers, highlighting model design, datasets, and implementation aspects. Practical exposure was provided through code walkthroughs and dataset analysis to bridge theory and application. In addition, participants were trained in using Overleaf for academic writing, enabling them to collaboratively prepare and format research papers efficiently according to standard publication guidelines. The faculty where also appraised of journal quartile and publications. Excellent feedback for FDP was received from faculty members.",
          attachments: ev.attachments || [],
          eventPhotos: ev.eventPhotos || [],
          signedAttendanceSheets: ev.signedAttendanceSheets || [],
        });
      })
      .catch((err) => {
        console.error("Failed to load event data:", err);
      });
  }, [selectedId]);

  // Save report particulars to backend
  const handleSaveReport = async (quiet: boolean = false) => {
    if (!selectedId) return false;
    try {
      setSaving(true);
      const res = await api.patch(`/events/${selectedId}/report`, formData);
      if (res.data) {
        setFormData((prev) => ({
          ...prev,
          ...res.data,
        }));
      }
      if (!quiet) {
        toast({
          title: "Report Saved Successfully",
          description: "All 24 particulars have been recorded.",
        });
      }
      return true;
    } catch (err: any) {
      toast({
        title: "Save Failed",
        description: err.response?.data?.message || err.message,
        variant: "destructive",
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Submit report to Admin
  const handleSubmitReport = async () => {
    if (!selectedId) return;
    try {
      setSubmitting(true);
      await handleSaveReport(true);
      await api.patch(`/events/${selectedId}/submit-report`, {
        reportSubmitted: true,
      });
      toast({
        title: "Report Submitted to Admin",
        description:
          "Your institutional report has been submitted for stage approvals.",
      });
      loadEvents();
    } catch (err: any) {
      toast({
        title: "Submission Failed",
        description: err.response?.data?.message || err.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Upload Brochure
  const handleBrochureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedId) return;

    try {
      setUploadingBrochure(true);
      const form = new FormData();
      form.append("brochure", file);

      const res = await api.post(`/events/${selectedId}/brochure`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setFormData((prev) => ({
        ...prev,
        attachments: res.data.attachments || [
          ...(prev.attachments || []),
          res.data.brochure,
        ],
      }));

      toast({
        title: "Brochure Uploaded",
        description: `${file.name} attached successfully as Annexure I.`,
      });
    } catch (err: any) {
      toast({
        title: "Brochure Upload Failed",
        description: err.response?.data?.message || err.message,
        variant: "destructive",
      });
    } finally {
      setUploadingBrochure(false);
      if (brochureInputRef.current) brochureInputRef.current.value = "";
    }
  };

  // Upload Event Photos
  const handlePhotosUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !selectedId) return;

    try {
      setUploadingPhotos(true);
      const form = new FormData();
      Array.from(files).forEach((f) => form.append("photos", f));

      const res = await api.post(`/events/${selectedId}/photos`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setFormData((prev) => ({
        ...prev,
        eventPhotos: res.data.photos || [],
        photographsAttached: "Attached",
      }));

      toast({
        title: "Photographs Uploaded",
        description: `${files.length} photo(s) added to Annexure II gallery.`,
      });
    } catch (err: any) {
      toast({
        title: "Photos Upload Failed",
        description: err.response?.data?.message || err.message,
        variant: "destructive",
      });
    } finally {
      setUploadingPhotos(false);
      if (photosInputRef.current) photosInputRef.current.value = "";
    }
  };

  // Delete Photo
  const handleDeletePhoto = async (photoId: string) => {
    if (!selectedId || !photoId) return;
    try {
      const res = await api.delete(`/events/${selectedId}/photos/${photoId}`);
      setFormData((prev) => ({
        ...prev,
        eventPhotos: res.data.photos || [],
      }));
      toast({
        title: "Photo Deleted",
        description: "Photograph removed from report annexure.",
      });
    } catch (err: any) {
      toast({
        title: "Deletion Failed",
        description: err.response?.data?.message || err.message,
        variant: "destructive",
      });
    }
  };

  // Upload Signed Attendance Sheet
  const handleSheetUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedId) return;

    try {
      setUploadingSheet(true);
      const form = new FormData();
      form.append("file", file);

      const res = await api.post(
        `/faculty/attendance/${selectedId}/signed-sheet`,
        form,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      setFormData((prev) => ({
        ...prev,
        signedAttendanceSheets: res.data.sheets || [
          ...(prev.signedAttendanceSheets || []),
          res.data.sheet,
        ],
        attendanceAttached: "Yes",
      }));

      toast({
        title: "Signed Attendance Sheet Uploaded",
        description: `${file.name} attached as Annexure III.`,
      });
    } catch (err: any) {
      toast({
        title: "Attendance Upload Failed",
        description: err.response?.data?.message || err.message,
        variant: "destructive",
      });
    } finally {
      setUploadingSheet(false);
      if (sheetInputRef.current) sheetInputRef.current.value = "";
    }
  };

  // Trigger PDF Generation & Download
  const handleDownloadPdf = async () => {
    try {
      setDownloadingPdf(true);
      const doc = await generateInstitutionalReportPdf(formData);
      const sanitizedName = (formData.name || "DSCASC_Report").replace(
        /[^a-zA-Z0-9_-]/g,
        "_"
      );
      doc.save(`DSCASC_IQAC_Report_${sanitizedName}.pdf`);
      toast({
        title: "Report PDF Generated",
        description: "Official institutional PDF report downloaded.",
      });
    } catch (err: any) {
      toast({
        title: "PDF Generation Failed",
        description: err.message || "Failed to generate report PDF",
        variant: "destructive",
      });
    } finally {
      setDownloadingPdf(false);
    }
  };

  const currentBrochure = formData.attachments?.find(
    (a) => a.label === "brochure" && !a.isDeleted
  );

  const selectedEventObj = events.find((e) => e._id === selectedId);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border p-5 rounded-xl shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-primary/10 text-primary">
              <FileCheck className="w-5 h-5" />
            </span>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">
              DSCASC Institutional Event Reports
            </h1>
            <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5">
              IQAC & IIC Format
            </Badge>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground">
            Generate official 24-point IQAC event reports with attached attendance sheets, event photographs, and brochures.
          </p>
        </div>

        {/* Action Buttons in Header */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSaveReport()}
            disabled={saving || !selectedId}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-1.5 text-amber-500" />
            )}
            Save Draft
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsAttachmentModalOpen(true)}
            disabled={!selectedId}
            className="border border-border/80"
          >
            <Upload className="w-4 h-4 mr-1.5 text-blue-500" />
            Manage Attachments
            {((formData.eventPhotos?.length || 0) > 0 || currentBrochure || (formData.signedAttendanceSheets?.length || 0) > 0) && (
              <Badge className="ml-1.5 h-4 px-1 text-[10px] bg-primary text-primary-foreground">
                {(formData.eventPhotos?.length || 0) + (currentBrochure ? 1 : 0) + (formData.signedAttendanceSheets?.length || 0)}
              </Badge>
            )}
          </Button>

          <Button
            size="sm"
            onClick={handleDownloadPdf}
            disabled={downloadingPdf || !selectedId}
            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
          >
            {downloadingPdf ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-1.5" />
            )}
            Download Official PDF
          </Button>
        </div>
      </div>

      {/* Select Event Card */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1 space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Select Event for Institutional Report
              </Label>
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="w-full bg-background border border-border text-foreground p-2.5 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
              >
                <option value="">-- Choose an Event --</option>
                {events.map((e) => (
                  <option key={e._id} value={e._id}>
                    {e.name} ({e.date || "No Date"}) • [{e.approvalStage || "Event Coordinators"}]
                  </option>
                ))}
              </select>
            </div>

            {selectedEventObj && (
              <div className="flex items-center gap-3 pt-2 md:pt-5">
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Approval Stage</div>
                  <Badge variant="outline" className="font-semibold text-xs mt-0.5">
                    {selectedEventObj.approvalStage || "Event Coordinators"}
                  </Badge>
                </div>
                {selectedEventObj.reportSubmitted && (
                  <Badge className="bg-emerald-600/90 text-white hover:bg-emerald-600">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Report Submitted
                  </Badge>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs: Edit Form & Live Paper Preview */}
      {selectedId && (
        <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="space-y-4">
          <div className="flex items-center justify-between">
            <TabsList className="grid grid-cols-2 w-[340px]">
              <TabsTrigger value="form" className="flex items-center gap-1.5">
                <FileText className="w-4 h-4" />
                24-Point Entry Form
              </TabsTrigger>
              <TabsTrigger value="preview" className="flex items-center gap-1.5">
                <Eye className="w-4 h-4" />
                Live Paper Preview
              </TabsTrigger>
            </TabsList>

            <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              5 Institutional Signatories Configured
            </div>
          </div>

          {/* TAB 1: 24-POINT ENTRY FORM */}
          <TabsContent value="form" className="space-y-6">
            {/* Section 1: Header & Event Particulars */}
            <Card className="shadow-sm border-l-4 border-l-primary">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary" />
                  1. Institutional Header &amp; Event Classification (Points 1 – 5)
                </CardTitle>
                <CardDescription>
                  Core details printed in the official Dayananda Sagar College IQAC header banner.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">
                      1. Event Type / Category *
                    </Label>
                    <Input
                      value={formData.type || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, type: e.target.value })
                      }
                      placeholder="e.g. Faculty Development Program, Workshop"
                    />
                  </div>

                  <div className="md:col-span-2 space-y-1.5">
                    <Label className="text-xs font-semibold">
                      2. Title of the Event *
                    </Label>
                    <Input
                      value={formData.name || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="e.g. Computational Mathematics for AI & Machine Learning"
                      className="font-medium"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">
                      3. Date of Conduction *
                    </Label>
                    <Input
                      value={formData.date || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, date: e.target.value })
                      }
                      placeholder="e.g. 22nd, 24th, 28th Jan 2026"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">4. Time :</Label>
                    <Input
                      value={formData.time || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, time: e.target.value })
                      }
                      placeholder="e.g. 2:00 PM to 4:00 PM"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">5. Venue</Label>
                    <Input
                      value={formData.venue || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, venue: e.target.value })
                      }
                      placeholder="e.g. Online Google meet / Seminar Hall - 1"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Department</Label>
                    <Input
                      value={formData.department || "BCA"}
                      onChange={(e) =>
                        setFormData({ ...formData, department: e.target.value })
                      }
                      placeholder="e.g. BCA"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Date of Report</Label>
                    <Input
                      value={formData.reportDate || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, reportDate: e.target.value })
                      }
                      placeholder="DD-MM-YYYY"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Section 2: Resource Persons */}
            <Card className="shadow-sm border-l-4 border-l-blue-500">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-500" />
                  2. Resource Persons &amp; Technical Coverage (Points 6 – 9)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Resource Person 1 */}
                <div className="p-3.5 rounded-lg border border-border bg-muted/20 space-y-3">
                  <span className="text-xs font-bold text-foreground">
                    Resource Person 1 (Primary Speaker)
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">
                        Speaker Name
                      </Label>
                      <Input
                        value={formData.resourcePerson1?.name || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            resourcePerson1: {
                              ...formData.resourcePerson1,
                              name: e.target.value,
                            },
                          })
                        }
                        placeholder="e.g. Nirmal Gaud"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">
                        Designation
                      </Label>
                      <Input
                        value={formData.resourcePerson1?.designation || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            resourcePerson1: {
                              ...formData.resourcePerson1,
                              designation: e.target.value,
                            },
                          })
                        }
                        placeholder="e.g. Founder & CEO"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">
                        Organization
                      </Label>
                      <Input
                        value={formData.resourcePerson1?.organization || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            resourcePerson1: {
                              ...formData.resourcePerson1,
                              organization: e.target.value,
                            },
                          })
                        }
                        placeholder="e.g. Cognitia Research - ThinkAI"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">
                      7. Topics Covered (Resource Person 1)
                    </Label>
                    <Input
                      value={formData.resourcePerson1Topics || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          resourcePerson1Topics: e.target.value,
                        })
                      }
                      placeholder="e.g. Mathematics behind AI/ML model with tips and tools to write Research paper"
                    />
                  </div>
                </div>

                {/* Resource Person 2 */}
                <div className="p-3.5 rounded-lg border border-border bg-muted/20 space-y-3">
                  <span className="text-xs font-bold text-foreground">
                    Resource Person 2 (Optional / NA)
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">
                        Speaker Name
                      </Label>
                      <Input
                        value={formData.resourcePerson2?.name || "NA"}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            resourcePerson2: {
                              ...formData.resourcePerson2,
                              name: e.target.value,
                            },
                          })
                        }
                        placeholder="NA"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">
                        Designation
                      </Label>
                      <Input
                        value={formData.resourcePerson2?.designation || "NA"}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            resourcePerson2: {
                              ...formData.resourcePerson2,
                              designation: e.target.value,
                            },
                          })
                        }
                        placeholder="NA"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">
                        Organization
                      </Label>
                      <Input
                        value={formData.resourcePerson2?.organization || "NA"}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            resourcePerson2: {
                              ...formData.resourcePerson2,
                              organization: e.target.value,
                            },
                          })
                        }
                        placeholder="NA"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">
                      9. Topics Covered (Resource Person 2)
                    </Label>
                    <Input
                      value={formData.resourcePerson2Topics || "NA"}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          resourcePerson2Topics: e.target.value,
                        })
                      }
                      placeholder="NA"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Section 3: Participation Breakdown & Coordinators */}
            <Card className="shadow-sm border-l-4 border-l-emerald-500">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-500" />
                  3. Participation Statistics &amp; Coordinators (Points 10 – 13)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Point 10 */}
                  <div className="p-3 rounded-lg border border-border bg-muted/10 space-y-2">
                    <Label className="text-xs font-bold">
                      10. No. Faculty Participants
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Internal</Label>
                        <Input
                          type="number"
                          value={formData.facultyParticipants?.internal ?? 22}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              facultyParticipants: {
                                ...formData.facultyParticipants,
                                internal: Number(e.target.value),
                              },
                            })
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">External</Label>
                        <Input
                          type="number"
                          value={formData.facultyParticipants?.external ?? 0}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              facultyParticipants: {
                                ...formData.facultyParticipants,
                                external: Number(e.target.value),
                              },
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* Point 11 */}
                  <div className="p-3 rounded-lg border border-border bg-muted/10 space-y-2">
                    <Label className="text-xs font-bold">
                      11. No. Student Participants
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Internal</Label>
                        <Input
                          type="number"
                          value={formData.studentParticipants?.internal ?? 0}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              studentParticipants: {
                                ...formData.studentParticipants,
                                internal: Number(e.target.value),
                              },
                            })
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">External</Label>
                        <Input
                          type="number"
                          value={formData.studentParticipants?.external ?? 0}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              studentParticipants: {
                                ...formData.studentParticipants,
                                external: Number(e.target.value),
                              },
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* Point 12: Faculty Coordinator Details */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">
                      12. Faculty Coordinator (Full Details)
                    </Label>
                    <Textarea
                      rows={3}
                      value={formData.facultyCoordinatorDetails || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          facultyCoordinatorDetails: e.target.value,
                        })
                      }
                      placeholder="Name: Lakshmi S&#10;Designation : Assistant Professor&#10;Department: Department of Computer Applications, DSCASC."
                    />
                  </div>

                  {/* Point 13: Student Coordinator Details */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">
                      13. Student Coordinator/s (Full Details)
                    </Label>
                    <Textarea
                      rows={3}
                      value={formData.studentCoordinatorDetails || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          studentCoordinatorDetails: e.target.value,
                        })
                      }
                      placeholder="Yadavacharya Jayacharya Nagasampagi&#10;P03CJ24S126119 III sem MCA"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Section 4: Financials & Dissemination */}
            <Card className="shadow-sm border-l-4 border-l-amber-500">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">
                  4. Financials, Agenda &amp; Dissemination (Points 14 – 19)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">
                      14. Total Expenditure
                    </Label>
                    <Input
                      value={formData.totalExpenditure || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          totalExpenditure: e.target.value,
                        })
                      }
                      placeholder="20,000/-"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">
                      15. Sponsors and Amount (if any)
                    </Label>
                    <Input
                      value={formData.sponsors || "NA"}
                      onChange={(e) =>
                        setFormData({ ...formData, sponsors: e.target.value })
                      }
                      placeholder="NA"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">
                      16. Agenda of the Event
                    </Label>
                    <Input
                      value={formData.agenda || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, agenda: e.target.value })
                      }
                      placeholder="e.g. Training on AI/ML model analysis and research paper writing"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">
                      17. Report Uploaded on College Website?
                    </Label>
                    <Input
                      value={formData.websiteReportLink || "No"}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          websiteReportLink: e.target.value,
                        })
                      }
                      placeholder="No / URL"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">
                      18. Social Media Links
                    </Label>
                    <Input
                      value={formData.socialMediaLinks || "---"}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          socialMediaLinks: e.target.value,
                        })
                      }
                      placeholder="---"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">
                      19. Report Sent to Newspapers?
                    </Label>
                    <Input
                      value={formData.newspaperReport || "No"}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          newspaperReport: e.target.value,
                        })
                      }
                      placeholder="No"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Section 5: Verifications & Compliance */}
            <Card className="shadow-sm border-l-4 border-l-purple-500">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">
                  5. Verification &amp; Attachments Status (Points 20 – 23)
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">20. Certificates Printed?</Label>
                  <select
                    value={String(formData.certificatesPrinted || "No")}
                    onChange={(e) =>
                      setFormData({ ...formData, certificatesPrinted: e.target.value })
                    }
                    className="w-full border rounded-md p-2 text-sm bg-background"
                  >
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">21. Feedback Collected?</Label>
                  <select
                    value={String(formData.feedbackCollected || "Yes")}
                    onChange={(e) =>
                      setFormData({ ...formData, feedbackCollected: e.target.value })
                    }
                    className="w-full border rounded-md p-2 text-sm bg-background"
                  >
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">22. Attendance Sheet Attached?*</Label>
                  <select
                    value={String(formData.attendanceAttached || "Yes")}
                    onChange={(e) =>
                      setFormData({ ...formData, attendanceAttached: e.target.value })
                    }
                    className="w-full border rounded-md p-2 text-sm bg-background"
                  >
                    <option value="Yes">Yes (Attached)</option>
                    <option value="No">No</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">23. Photographs of Event</Label>
                  <Input
                    value={formData.photographsAttached || "Attached"}
                    onChange={(e) =>
                      setFormData({ ...formData, photographsAttached: e.target.value })
                    }
                    placeholder="Attached"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Section 6: Comprehensive Summary */}
            <Card className="shadow-sm border-l-4 border-l-indigo-600">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">
                  6. Comprehensive Event Summary (Point 24)
                </CardTitle>
                <CardDescription>
                  Detailed narrative covering day-to-day proceedings, hands-on modules, speaker sessions, and feedback.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Textarea
                  rows={6}
                  value={formData.summary || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, summary: e.target.value })
                  }
                  className="font-normal text-sm leading-relaxed"
                  placeholder="Enter detailed institutional event summary..."
                />
              </CardContent>
            </Card>

            {/* Step 1 Completion Call-To-Action */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-muted/40 border border-border">
              <div className="space-y-0.5 text-center sm:text-left">
                <div className="font-semibold text-sm">Form Entries Completed?</div>
                <div className="text-xs text-muted-foreground">
                  Proceed to Step 2 to attach the event brochure, photographs, and signed attendance sheet.
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => handleSaveReport()}
                  disabled={saving}
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Save Draft
                </Button>

                <Button
                  onClick={async () => {
                    await handleSaveReport(true);
                    setIsAttachmentModalOpen(true);
                  }}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  Attach Records (Step 2)
                  <ChevronRight className="w-4 h-4 ml-1.5" />
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: LIVE PAPER PREVIEW (EXACT REPLICA OF INSTITUTIONAL TEMPLATE) */}
          <TabsContent value="preview" className="space-y-4">
            <div className="flex justify-end gap-2 pb-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
              >
                <Printer className="w-4 h-4 mr-1.5" />
                Print
              </Button>
              <Button
                size="sm"
                onClick={handleDownloadPdf}
                disabled={downloadingPdf}
                className="bg-primary text-primary-foreground"
              >
                {downloadingPdf ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                ) : (
                  <Download className="w-4 h-4 mr-1.5" />
                )}
                Download Official PDF
              </Button>
            </div>

            {/* Document Paper Container matching exact college format */}
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
                      {formData.type || "FDP"} on “{formData.name || "Computational Mathematics for AI & Machine Learning: Modeling, Analysis, and Research Paper Writing"}”
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
                  <span>Department: {formData.department || "BCA"}</span>
                  <span>Date of Report: {formData.reportDate || "31-01-2026"}</span>
                </div>

                {/* 24-Point Table */}
                <div className="border border-black overflow-x-auto">
                  <table className="w-full text-xs border-collapse font-serif">
                    <thead>
                      <tr className="border-b border-black font-bold">
                        <th className="border-r border-black p-2 w-10 text-center">
                          Sl.<br />No.
                        </th>
                        <th className="border-r border-black p-2 w-44 text-left">Particulars</th>
                        <th className="p-2 text-left">Event related Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-black">
                        <td className="border-r border-black p-2 font-bold text-center">1.</td>
                        <td className="border-r border-black p-2 font-bold">Event*</td>
                        <td className="p-2">{formData.type || "Faculty Development Program"}</td>
                      </tr>
                      <tr className="border-b border-black">
                        <td className="border-r border-black p-2 font-bold text-center">2.</td>
                        <td className="border-r border-black p-2 font-bold">Title of the Event</td>
                        <td className="p-2 font-bold">“{formData.name}”</td>
                      </tr>
                      <tr className="border-b border-black">
                        <td className="border-r border-black p-2 font-bold text-center">3.</td>
                        <td className="border-r border-black p-2 font-bold">Date of Conduction</td>
                        <td className="p-0">
                          <div className="flex divide-x divide-black">
                            <div className="p-2 flex-1">{formData.date || "22nd ,24th ,28th, 30th ,31st Jan 2026"}</div>
                            <div className="p-2 flex items-center gap-2 w-56">
                              <span className="font-bold">4. &nbsp; Time :</span>
                              <span className="font-bold">{formData.time || "2:00 PM to 4:00 PM"}</span>
                            </div>
                          </div>
                        </td>
                      </tr>
                      <tr className="border-b border-black">
                        <td className="border-r border-black p-2 font-bold text-center">5.</td>
                        <td className="border-r border-black p-2 font-bold">Venue</td>
                        <td className="p-2">{formData.venue || "Online Google meet"}</td>
                      </tr>
                      <tr className="border-b border-black">
                        <td className="border-r border-black p-2 font-bold text-center align-top">6.</td>
                        <td className="border-r border-black p-2 font-bold align-top">Resource Person 1 Details</td>
                        <td className="p-2 space-y-0.5 font-bold">
                          <div>{formData.resourcePerson1?.name || "Nirmal Gaud"}</div>
                          <div>{formData.resourcePerson1?.designation || "Founder & CEO"}</div>
                          <div>{formData.resourcePerson1?.organization || "Cognitia Research - ThinkAI"}</div>
                        </td>
                      </tr>
                      <tr className="border-b border-black">
                        <td className="border-r border-black p-2 font-bold text-center">7.</td>
                        <td className="border-r border-black p-2 font-bold">Topics Covered</td>
                        <td className="p-2">{formData.resourcePerson1Topics || "Mathematics behind AI/ML model with tips and tools to write Research paper"}</td>
                      </tr>
                      <tr className="border-b border-black">
                        <td className="border-r border-black p-2 font-bold text-center">8.</td>
                        <td className="border-r border-black p-2 font-bold">Resource Person 2 Details</td>
                        <td className="p-2">{formData.resourcePerson2?.name || "NA"}</td>
                      </tr>
                      <tr className="border-b border-black">
                        <td className="border-r border-black p-2 font-bold text-center">9.</td>
                        <td className="border-r-black p-2 font-bold">Topics Covered</td>
                        <td className="p-2">{formData.resourcePerson2Topics || "NA"}</td>
                      </tr>
                      <tr className="border-b border-black">
                        <td className="border-r border-black p-2 font-bold text-center">10.</td>
                        <td className="border-r border-black p-2 font-bold">No. Faculty Participants</td>
                        <td className="p-0">
                          <div className="flex divide-x divide-black">
                            <div className="p-2 w-32 flex justify-between">
                              <span className="font-bold">Internal:</span>
                              <span className="font-bold">{formData.facultyParticipants?.internal ?? 22}</span>
                            </div>
                            <div className="p-2 flex-1 flex justify-between">
                              <span className="font-bold">External:</span>
                              <span className="font-bold">{formData.facultyParticipants?.external || "NIL"}</span>
                            </div>
                          </div>
                        </td>
                      </tr>
                      <tr className="border-b border-black">
                        <td className="border-r border-black p-2 font-bold text-center">11.</td>
                        <td className="border-r border-black p-2 font-bold">No. Student Participants</td>
                        <td className="p-0">
                          <div className="flex divide-x divide-black">
                            <div className="p-2 w-32 flex justify-between">
                              <span className="font-bold">Internal:</span>
                              <span>{formData.studentParticipants?.internal || "---"}</span>
                            </div>
                            <div className="p-2 flex-1 flex justify-between">
                              <span className="font-bold">External:</span>
                              <span className="font-bold">{formData.studentParticipants?.external || "NIL"}</span>
                            </div>
                          </div>
                        </td>
                      </tr>
                      <tr className="border-b border-black">
                        <td className="border-r border-black p-2 font-bold text-center align-top">12.</td>
                        <td className="border-r border-black p-2 font-bold align-top">Faculty Coordinator</td>
                        <td className="p-2 whitespace-pre-line leading-relaxed">{formData.facultyCoordinatorDetails}</td>
                      </tr>
                      <tr className="border-b border-black">
                        <td className="border-r border-black p-2 font-bold text-center align-top">13.</td>
                        <td className="border-r border-black p-2 font-bold align-top">Student Coordinator/s</td>
                        <td className="p-2 whitespace-pre-line leading-relaxed">{formData.studentCoordinatorDetails}</td>
                      </tr>
                      <tr className="border-b border-black">
                        <td className="border-r border-black p-2 font-bold text-center">14.</td>
                        <td className="border-r border-black p-2 font-bold">Total Expenditure</td>
                        <td className="p-0">
                          <div className="flex divide-x divide-black">
                            <div className="p-2 w-28 md:w-32 font-bold">{formData.totalExpenditure || "20,000/-"}</div>
                            <div className="p-2 flex-1 flex items-center gap-2">
                              <span className="font-bold">15. &nbsp; Sponsors and Amount (if any)</span>
                              <span className="font-bold">{formData.sponsors || "NA"}</span>
                            </div>
                          </div>
                        </td>
                      </tr>
                      <tr className="border-b border-black">
                        <td className="border-r border-black p-2 font-bold text-center">16.</td>
                        <td className="border-r border-black p-2 font-bold">Agenda of the Event</td>
                        <td className="p-0">
                          <div className="flex divide-x divide-black">
                            <div className="p-2 w-28 md:w-32">{formData.agenda || "Training on AI/ML model analyis and research paper writing"}</div>
                            <div className="p-2 flex-1 flex items-center gap-2">
                              <span className="font-bold">17. &nbsp; Provide the link of the report uploaded on College Website</span>
                              <span className="font-bold">{formData.websiteReportLink || "No"}</span>
                            </div>
                          </div>
                        </td>
                      </tr>
                      <tr className="border-b border-black">
                        <td className="border-r border-black p-2 font-bold text-center">18.</td>
                        <td className="border-r border-black p-2 font-bold">Social Media Links</td>
                        <td className="p-0">
                          <div className="flex divide-x divide-black">
                            <div className="p-2 w-28 md:w-32">{formData.socialMediaLinks || "---"}</div>
                            <div className="p-2 flex-1 flex items-center gap-2">
                              <span className="font-bold">19. &nbsp; Report sent to Newspapers? If yes, provide cuttings/images:</span>
                              <span className="font-bold">{formData.newspaperReport || "No"}</span>
                            </div>
                          </div>
                        </td>
                      </tr>
                      <tr className="border-b border-black">
                        <td className="border-r border-black p-2 font-bold text-center">20.</td>
                        <td className="border-r border-black p-2 font-bold">Certificates Printed?</td>
                        <td className="p-0">
                          <div className="flex divide-x divide-black">
                            <div className="p-2 w-28 md:w-32 font-bold">{formData.certificatesPrinted || "No"}</div>
                            <div className="p-2 flex-1 flex items-center gap-2">
                              <span className="font-bold">21. &nbsp; Feedback Collected?</span>
                              <span className="font-bold">{formData.feedbackCollected || "Yes"}</span>
                            </div>
                          </div>
                        </td>
                      </tr>
                      <tr className="border-b border-black">
                        <td className="border-r border-black p-2 font-bold text-center">22.</td>
                        <td className="border-r border-black p-2 font-bold">Attendance Sheet Attached?*</td>
                        <td className="p-0">
                          <div className="flex divide-x divide-black">
                            <div className="p-2 w-28 md:w-32 font-bold">{formData.attendanceAttached || "Yes"}</div>
                            <div className="p-2 flex-1 flex items-center gap-2">
                              <span className="font-bold">23 &nbsp; Photographs of the Event</span>
                              <span className="font-bold">{formData.photographsAttached || "Attached"}</span>
                            </div>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td className="border-r border-black p-2 font-bold text-center align-top">24.</td>
                        <td className="border-r border-black p-2 font-bold align-top">Summary of the Event</td>
                        <td className="p-2 leading-relaxed text-justify">
                          {formData.summary?.slice(0, 560) || "The Department of Computer Applications – BCA conducted a FDP for faculty members by Nirmal Gaud..."}
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
                          {formData.summary?.slice(560) ||
                            "walkthroughs and dataset analysis to bridge theory and application. In addition, participants were trained in using Overleaf for academic writing, enabling them to collaboratively prepare and format research papers efficiently according to standard publication guidelines. The faculty where also appraised of journal quartile and publications. Excellent feedback for FDP was received from faculty members."}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* 5 Institutional Signatories at Bottom */}
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
                    <span className="text-xs text-muted-foreground italic">No brochure attached yet.</span>
                  )}
                </div>

                {/* Annexure II: Photos */}
                <div className="border border-slate-300 rounded p-4">
                  <div className="font-bold text-xs mb-2">
                    Annexure II: Event Photographs ({formData.eventPhotos?.length || 0} attached)
                  </div>
                  {formData.eventPhotos && formData.eventPhotos.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {formData.eventPhotos.map((photo, i) => (
                        <div key={i} className="border rounded overflow-hidden">
                          <img
                            src={`${BACKEND_URL}${photo.url}`}
                            alt={photo.caption || "Event"}
                            className="w-full h-24 object-cover"
                          />
                          <div className="p-1 text-[10px] text-center font-medium truncate">
                            {photo.caption || `Photo ${i + 1}`}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">No photos attached yet.</span>
                  )}
                </div>

                {/* Annexure III: Attendance */}
                <div className="border border-slate-300 rounded p-4">
                  <div className="font-bold text-xs mb-2">
                    Annexure III: Signed Attendance Sheets ({formData.signedAttendanceSheets?.length || 0} attached)
                  </div>
                  {formData.signedAttendanceSheets && formData.signedAttendanceSheets.length > 0 ? (
                    <div className="space-y-1">
                      {formData.signedAttendanceSheets.map((sheet, i) => (
                        <div key={i} className="flex items-center justify-between text-xs border-b py-1">
                          <span>{sheet.originalName || `Signed Sheet ${i + 1}`}</span>
                          <a
                            href={`${BACKEND_URL}${sheet.url}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 underline"
                          >
                            View Sheet
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

            {/* Bottom Submit Banner */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setActiveTab("form")}
              >
                Back to Edit Form
              </Button>
              <Button
                onClick={handleSubmitReport}
                disabled={submitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                ) : (
                  <Send className="w-4 h-4 mr-1.5" />
                )}
                Submit Official Report to Admin
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      )}

      {/* STEP 2 MODAL: POST-ENTRY ATTACHMENTS PROMPT */}
      <Dialog open={isAttachmentModalOpen} onOpenChange={setIsAttachmentModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <Upload className="w-5 h-5 text-primary" />
              Event Records &amp; Annexures Input (Step 2)
            </DialogTitle>
            <DialogDescription>
              Attach the required event verification documents (Brochure, Event Photographs, and Signed Attendance Sheet) to complete the official institutional report.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-3">
            {/* Attachment 1: Event Brochure */}
            <div className="border border-border rounded-xl p-4 space-y-3 bg-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-md bg-blue-500/10 text-blue-500">
                    <FileText className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold">1. Event Brochure (Annexure I)</h3>
                    <p className="text-xs text-muted-foreground">
                      Upload the official event promotional flyer or brochure (Image / PDF).
                    </p>
                  </div>
                </div>

                {currentBrochure ? (
                  <Badge className="bg-emerald-600 text-white">Attached ✓</Badge>
                ) : (
                  <Badge variant="outline" className="text-amber-500 border-amber-500/30">
                    Pending
                  </Badge>
                )}
              </div>

              {currentBrochure && (
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 border border-border text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <FileCheck className="w-4 h-4 text-emerald-500" />
                    <span className="font-medium truncate">{currentBrochure.originalName || "Brochure"}</span>
                  </div>
                  <a
                    href={`${BACKEND_URL}${currentBrochure.url}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline flex items-center gap-1 font-medium"
                  >
                    View <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              <input
                ref={brochureInputRef}
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={handleBrochureUpload}
              />

              <Button
                variant="outline"
                size="sm"
                onClick={() => brochureInputRef.current?.click()}
                disabled={uploadingBrochure}
                className="w-full border-dashed"
              >
                {uploadingBrochure ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                {currentBrochure ? "Replace Brochure File" : "Upload Event Brochure"}
              </Button>
            </div>

            {/* Attachment 2: Event Photographs */}
            <div className="border border-border rounded-xl p-4 space-y-3 bg-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-md bg-purple-500/10 text-purple-500">
                    <ImageIcon className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold">2. Event Photographs (Annexure II)</h3>
                    <p className="text-xs text-muted-foreground">
                      Upload high-resolution event session photographs &amp; glimpses.
                    </p>
                  </div>
                </div>

                <Badge
                  className={
                    (formData.eventPhotos?.length || 0) > 0
                      ? "bg-emerald-600 text-white"
                      : "bg-muted text-muted-foreground"
                  }
                >
                  {formData.eventPhotos?.length || 0} Photos Added
                </Badge>
              </div>

              {/* Photo Thumbnails */}
              {formData.eventPhotos && formData.eventPhotos.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {formData.eventPhotos.map((photo, i) => (
                    <div
                      key={photo._id || i}
                      className="group relative border border-border rounded-lg overflow-hidden bg-muted/20"
                    >
                      <img
                        src={`${BACKEND_URL}${photo.url}`}
                        alt={photo.caption || "Event Photo"}
                        className="w-full h-24 object-cover"
                      />
                      <button
                        onClick={() => handleDeletePhoto(photo._id!)}
                        className="absolute top-1 right-1 p-1 rounded-full bg-red-600/90 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete photo"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                      <div className="p-1 text-[10px] text-center font-medium truncate bg-card/90">
                        {photo.caption || `Photo ${i + 1}`}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <input
                ref={photosInputRef}
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={handlePhotosUpload}
              />

              <Button
                variant="outline"
                size="sm"
                onClick={() => photosInputRef.current?.click()}
                disabled={uploadingPhotos}
                className="w-full border-dashed"
              >
                {uploadingPhotos ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Add Event Photos (Multi-Upload)
              </Button>
            </div>

            {/* Attachment 3: Signed Attendance Sheet */}
            <div className="border border-border rounded-xl p-4 space-y-3 bg-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-500">
                    <FileCheck className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold">3. Signed Attendance Sheet (Annexure III)</h3>
                    <p className="text-xs text-muted-foreground">
                      Upload scanned signed attendance ledger with faculty/coordinator signatures.
                    </p>
                  </div>
                </div>

                {(formData.signedAttendanceSheets?.length || 0) > 0 ? (
                  <Badge className="bg-emerald-600 text-white">Sheet Attached ✓</Badge>
                ) : (
                  <Badge variant="outline" className="text-amber-500 border-amber-500/30">
                    Pending
                  </Badge>
                )}
              </div>

              {formData.signedAttendanceSheets && formData.signedAttendanceSheets.length > 0 && (
                <div className="space-y-1.5">
                  {formData.signedAttendanceSheets.map((sheet, i) => (
                    <div
                      key={sheet._id || i}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 border border-border text-xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <FileCheck className="w-4 h-4 text-emerald-500" />
                        <span className="font-medium truncate">{sheet.originalName || "Signed Sheet"}</span>
                      </div>
                      <a
                        href={`${BACKEND_URL}${sheet.url}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline flex items-center gap-1 font-medium"
                      >
                        View <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  ))}
                </div>
              )}

              <input
                ref={sheetInputRef}
                type="file"
                accept=".pdf,image/*"
                className="hidden"
                onChange={handleSheetUpload}
              />

              <Button
                variant="outline"
                size="sm"
                onClick={() => sheetInputRef.current?.click()}
                disabled={uploadingSheet}
                className="w-full border-dashed"
              >
                {uploadingSheet ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                Upload Scanned Signed Attendance Sheet
              </Button>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 pt-3 border-t border-border">
            <Button
              variant="outline"
              onClick={() => setIsAttachmentModalOpen(false)}
            >
              Done Managing
            </Button>
            <Button
              onClick={() => {
                setIsAttachmentModalOpen(false);
                setActiveTab("preview");
              }}
              className="bg-primary text-primary-foreground"
            >
              Preview &amp; Generate Report →
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FacultyReports;