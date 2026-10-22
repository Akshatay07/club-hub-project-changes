import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Printer,
  Download,
  X,
  FileSpreadsheet,
  Edit3,
  Eye,
  RotateCcw,
  Plus,
  Trash2,
  Check,
  ExternalLink,
} from "lucide-react";
import { DSCASC_LOGO_PNG_BASE64, IIC_LOGO_PNG_BASE64 } from "@/utils/reportLogos";
import {
  generateAnnualCellReportPdf,
  AnnualReportEventItem,
  AnnualReportMemberItem,
} from "@/utils/annualCellReportPdfGenerator";

interface AnnualReportDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  clubName?: string;
  department?: string;
  facultyName?: string;
  periodLabel?: string;
  year?: number;
  events?: any[];
  onExportCsv?: () => void;
}

// Committee members matching official faculty structure
const DEFAULT_MEMBERS_TEMPLATE: AnnualReportMemberItem[] = [
  { slNo: 1, name: "Prof. Shruthi .B.K", role: "Unit Head", department: "BBA/B.COM" },
  { slNo: 2, name: "Prof. Sadiya firdoze", role: "Member", department: "BBA/B.COM" },
  { slNo: 3, name: "Prof. Anirudh", role: "Member", department: "BBA/B.COM" },
  { slNo: 4, name: "Prof. Sunil Kumar", role: "Member", department: "BBA/B.COM" },
  { slNo: 5, name: "Prof. Anusha. A", role: "Member", department: "BCA/MCA" },
  { slNo: 6, name: "Prof. Samudhyata .D S", role: "Member", department: "BCA/MCA" },
  { slNo: 7, name: "Dr. Guruprasad", role: "Member", department: "B.Sc" },
  { slNo: 8, name: "Prof. Balawanth kaur", role: "Member", department: "MBA" },
];

function formatDateForReport(dateStr?: string): string {
  if (!dateStr) return "—";
  const clean = String(dateStr).trim();
  const m = clean.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m) {
    const y = m[1];
    const mo = parseInt(m[2], 10);
    const d = parseInt(m[3], 10);
    return `${d < 10 ? "0" + d : d}-${mo}-${y}`;
  }
  const parsed = new Date(clean);
  if (!isNaN(parsed.getTime())) {
    const d = parsed.getDate();
    const mo = parsed.getMonth() + 1;
    const y = parsed.getFullYear();
    return `${d < 10 ? "0" + d : d}-${mo}-${y}`;
  }
  return clean;
}

export const AnnualReportDocumentModal: React.FC<AnnualReportDocumentModalProps> = ({
  isOpen,
  onClose,
  clubName = "Coding Club",
  department = "Computer Science",
  facultyName = "Faculty Coordinator",
  periodLabel = "June 2025 to May 2026",
  year = 2026,
  events = [],
  onExportCsv,
}) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<"preview" | "customize">("preview");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);

  // Compute academic years
  const endYear = year || 2026;
  const startYear = endYear - 1;

  // Title defaults
  const computedReportTitle = `Annual Report June ${startYear} to May ${endYear}`;
  const computedUnitSubtitle = useMemo(() => {
    const clean = (clubName || "").trim();
    if (!clean || clean.toLowerCase() === "club") return "Student Activity Unit";
    if (clean.toLowerCase().includes("entrepreneur") || clean.toLowerCase().includes("udyamita")) {
      return "Entrepreneurship Unit – UDYAMITA";
    }
    if (clean.toLowerCase().endsWith("unit") || clean.toLowerCase().endsWith("cell")) {
      return `${clean} – DSCASC`;
    }
    return `${clean} Unit – ${clean.toUpperCase()}`;
  }, [clubName]);

  const computedAcademicPeriod = `June ${startYear} – May ${endYear}`;

  // Helper to map incoming analytics events to report table format
  const mapAnalyticsEventsToReport = (rawEvents: any[]): AnnualReportEventItem[] => {
    if (!Array.isArray(rawEvents) || rawEvents.length === 0) return [];
    return rawEvents.map((e, idx) => {
      const attendees = e.attendanceCount || e.registeredCount || 0;
      const dept = e.department || department || "DSCASC";
      const weblink =
        e.websiteReportLink &&
        e.websiteReportLink !== "No" &&
        e.websiteReportLink.startsWith("http")
          ? e.websiteReportLink
          : `https://dscasc.edu.in/images/iqac/cell-events/${(e.name || "event")
              .toLowerCase()
              .replace(/[^a-z0-9]/g, "-")
              .slice(0, 18)}.pdf`;

      return {
        slNo: idx + 1,
        name: e.name || `Event ${idx + 1}`,
        date: formatDateForReport(e.date),
        department: dept,
        participants: attendees,
        weblink,
      };
    });
  };

  // Helper to synthesize narrative based on actual analytics events
  const buildNarrative = (rawEvents: any[], currentClubName: string) => {
    const p1 = `${currentClubName} in DSCASC aims to promote student engagement, practical knowledge, and excellence through hands-on workshops, seminars, and experiential learning. The cell provides an inclusive platform for students to foster creativity, analytical thinking, and collaboration. In this regard, it organized a series of initiatives aimed at nurturing domain skills, leadership, and professional acumen.`;

    let p2 = "";
    if (Array.isArray(rawEvents) && rawEvents.length > 0) {
      const e1 = rawEvents[0];
      const count1 = e1.attendanceCount || e1.registeredCount || 0;
      const d1 = formatDateForReport(e1.date);

      if (rawEvents.length === 1) {
        p2 = `The flagship activity, "${e1.name}," held on ${d1}, witnessed the participation of ${count1} students and inspired active engagement. The event offered students a hands-on platform, enhancing their practical and collaborative skills through experiential learning.`;
      } else if (rawEvents.length === 2) {
        const e2 = rawEvents[1];
        const count2 = e2.attendanceCount || e2.registeredCount || 0;
        const d2 = formatDateForReport(e2.date);
        p2 = `The flagship event, "${e1.name}," held on ${d1}, witnessed the participation of ${count1} students and inspired active engagement. To provide practical exposure, the "${e2.name}" was conducted on ${d2} for ${count2} ${e2.department || "DSCASC"} students, equipping participants with essential domain knowledge and industry insights.`;
      } else {
        const e2 = rawEvents[1];
        const count2 = e2.attendanceCount || e2.registeredCount || 0;
        const d2 = formatDateForReport(e2.date);
        const e3 = rawEvents[2] || rawEvents[rawEvents.length - 1];
        const count3 = e3.attendanceCount || e3.registeredCount || 0;
        const d3 = formatDateForReport(e3.date);
        p2 = `The flagship event, "${e1.name}," held on ${d1}, witnessed the participation of ${count1} students and inspired them toward technical excellence. To provide practical exposure, the "${e2.name}" was conducted on ${d2} for ${count2} students, equipping participants with essential practical skills and mentorship. The academic year's major highlight was "${e3.name}," organized on ${d3}, which attracted ${count3} participants, offering students a collaborative platform to establish teamwork, critical problem-solving, and experiential learning.`;
      }
    } else {
      p2 = `During the academic period ${periodLabel}, events and initiatives planned by ${currentClubName} were focused on foundational readiness and student mentorship across departments.`;
    }

    const p3 = `Through these initiatives, the ${currentClubName} Unit successfully fostered innovation, confidence, and a growth mindset among students, while strengthening the institution's commitment to delivering holistic, industry-ready education.`;

    return { p1, p2, p3 };
  };

  // State for editable content
  const [reportTitle, setReportTitle] = useState<string>(computedReportTitle);
  const [unitSubtitle, setUnitSubtitle] = useState<string>(computedUnitSubtitle);
  const [academicPeriod, setAcademicPeriod] = useState<string>(computedAcademicPeriod);
  const [para1, setPara1] = useState<string>("");
  const [para2, setPara2] = useState<string>("");
  const [para3, setPara3] = useState<string>("");
  const [tableEvents, setTableEvents] = useState<AnnualReportEventItem[]>([]);
  const [tableMembers, setTableMembers] = useState<AnnualReportMemberItem[]>([]);

  // Synchronize state directly from props whenever modal opens or events change
  useEffect(() => {
    if (!isOpen) return;

    // 1. Sync events strictly from analytics
    const mapped = mapAnalyticsEventsToReport(events);
    setTableEvents(mapped);

    // 2. Sync Titles
    setReportTitle(computedReportTitle);
    setUnitSubtitle(computedUnitSubtitle);
    setAcademicPeriod(computedAcademicPeriod);

    // 3. Sync Narrative
    const { p1, p2, p3 } = buildNarrative(events, clubName);
    setPara1(p1);
    setPara2(p2);
    setPara3(p3);

    // 4. Sync Committee Members
    const membersList = [...DEFAULT_MEMBERS_TEMPLATE];
    if (facultyName) {
      membersList[0] = {
        slNo: 1,
        name: facultyName.startsWith("Prof") || facultyName.startsWith("Dr") ? facultyName : `Prof. ${facultyName}`,
        role: "Unit Head",
        department: department || "DSCASC",
      };
    }
    setTableMembers(membersList);
  }, [isOpen, events, clubName, department, facultyName, year, periodLabel]);

  if (!isOpen) return null;

  // Print Handler
  const handlePrint = () => {
    window.print();
  };

  // Direct PDF Download Handler
  const handleDownloadPdf = () => {
    try {
      setIsGeneratingPdf(true);
      const pdf = generateAnnualCellReportPdf({
        reportTitle,
        unitSubtitle,
        academicPeriod,
        narrativeParagraphs: [para1, para2, para3],
        events: tableEvents,
        members: tableMembers,
      });

      const cleanFilename = `${unitSubtitle.replace(/[^a-zA-Z0-9]/g, "_")}_${academicPeriod.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;
      pdf.save(cleanFilename);
    } catch (err) {
      console.error("PDF generation error:", err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Reset to live analytics state
  const handleResetToAnalytics = () => {
    const mapped = mapAnalyticsEventsToReport(events);
    setTableEvents(mapped);
    setReportTitle(computedReportTitle);
    setUnitSubtitle(computedUnitSubtitle);
    setAcademicPeriod(computedAcademicPeriod);
    const { p1, p2, p3 } = buildNarrative(events, clubName);
    setPara1(p1);
    setPara2(p2);
    setPara3(p3);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl max-h-[94vh] overflow-y-auto p-0 print:m-0 print:p-0 print:max-w-none print:max-h-none print:shadow-none print:border-none bg-slate-100">
        <DialogHeader className="sr-only">
          <DialogTitle>{reportTitle} - {unitSubtitle}</DialogTitle>
        </DialogHeader>

        {/* ============================================================== */}
        {/* TOP TOOLBAR (Hidden when printing)                             */}
        {/* ============================================================== */}
        <div className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-900 text-white shadow-md print:hidden">
          <div className="flex items-center gap-2.5">
            <Badge className="bg-blue-600 hover:bg-blue-500 text-white font-semibold border-none px-2.5 py-1 text-xs">
              Annual Cell Report
            </Badge>
            <span className="text-xs text-slate-300 hidden sm:inline">
              Official DSCASC / IQAC Format • {tableEvents.length} Event{tableEvents.length === 1 ? "" : "s"} from Analytics
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-md bg-slate-800 p-0.5 border border-slate-700">
              <button
                type="button"
                onClick={() => setActiveTab("preview")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-all ${
                  activeTab === "preview"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                Document View
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("customize")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-all ${
                  activeTab === "customize"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                Customize Content
              </button>
            </div>

            {onExportCsv && (
              <Button
                variant="outline"
                size="sm"
                onClick={onExportCsv}
                className="gap-1.5 text-xs h-8 bg-slate-800 border-slate-700 text-emerald-400 hover:bg-slate-700 hover:text-emerald-300"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                CSV
              </Button>
            )}

            <Button
              variant="default"
              size="sm"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="gap-1.5 text-xs h-8 bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow"
            >
              <Download className="w-3.5 h-3.5" />
              {isGeneratingPdf ? "Generating..." : "Download PDF"}
            </Button>

            <Button
              variant="default"
              size="sm"
              onClick={handlePrint}
              className="gap-1.5 text-xs h-8 bg-blue-600 hover:bg-blue-500 text-white font-medium shadow"
            >
              <Printer className="w-3.5 h-3.5" />
              Print / Save PDF
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* CUSTOMIZE CONTENT PANEL (Optional tab)                         */}
        {/* ============================================================== */}
        {activeTab === "customize" && (
          <div className="p-6 bg-white border-b border-slate-200 max-h-[85vh] overflow-y-auto print:hidden space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">Customize Annual Report Content</h3>
                <p className="text-xs text-slate-500">
                  Update unit title, academic year, narrative description, and committee members.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetToAnalytics}
                className="gap-1 text-xs text-slate-600 hover:text-slate-900"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset to Live Analytics Data
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Report Title
                </label>
                <Input
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Unit Name / Subtitle
                </label>
                <Input
                  value={unitSubtitle}
                  onChange={(e) => setUnitSubtitle(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Academic Period
                </label>
                <Input
                  value={academicPeriod}
                  onChange={(e) => setAcademicPeriod(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-700">
                Narrative Paragraph 1 (Aims &amp; Cell Mission)
              </label>
              <Textarea
                rows={3}
                value={para1}
                onChange={(e) => setPara1(e.target.value)}
                className="text-xs font-serif leading-relaxed"
              />
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-700">
                Narrative Paragraph 2 (Conducted Event Highlights &amp; Flagship Activities)
              </label>
              <Textarea
                rows={3}
                value={para2}
                onChange={(e) => setPara2(e.target.value)}
                className="text-xs font-serif leading-relaxed"
              />
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-700">
                Narrative Paragraph 3 (Conclusion &amp; Institutional Impact)
              </label>
              <Textarea
                rows={2}
                value={para3}
                onChange={(e) => setPara3(e.target.value)}
                className="text-xs font-serif leading-relaxed"
              />
            </div>

            {/* Editable Members Table */}
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800">
                  Unit Head &amp; Committee Members ({tableMembers.length})
                </label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setTableMembers([
                      ...tableMembers,
                      {
                        slNo: tableMembers.length + 1,
                        name: "Prof. New Member",
                        role: "Member",
                        department: "DSCASC",
                      },
                    ])
                  }
                  className="text-xs gap-1 h-7"
                >
                  <Plus className="w-3 h-3" /> Add Member
                </Button>
              </div>

              <div className="border border-slate-200 rounded-md overflow-hidden text-xs">
                <table className="w-full border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-2 w-12 text-center">#</th>
                      <th className="p-2 text-left">Member Name</th>
                      <th className="p-2 text-left">Role</th>
                      <th className="p-2 text-left">Department</th>
                      <th className="p-2 w-12 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {tableMembers.map((m, idx) => (
                      <tr key={idx}>
                        <td className="p-2 text-center font-medium text-slate-500">{idx + 1}</td>
                        <td className="p-1">
                          <Input
                            value={m.name}
                            onChange={(e) => {
                              const updated = [...tableMembers];
                              updated[idx].name = e.target.value;
                              setTableMembers(updated);
                            }}
                            className="text-xs h-7"
                          />
                        </td>
                        <td className="p-1">
                          <Input
                            value={m.role}
                            onChange={(e) => {
                              const updated = [...tableMembers];
                              updated[idx].role = e.target.value;
                              setTableMembers(updated);
                            }}
                            className="text-xs h-7"
                          />
                        </td>
                        <td className="p-1">
                          <Input
                            value={m.department}
                            onChange={(e) => {
                              const updated = [...tableMembers];
                              updated[idx].department = e.target.value;
                              setTableMembers(updated);
                            }}
                            className="text-xs h-7"
                          />
                        </td>
                        <td className="p-1 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              if (tableMembers.length > 1) {
                                setTableMembers(tableMembers.filter((_, i) => i !== idx));
                              }
                            }}
                            className="text-rose-500 hover:text-rose-700 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="default"
                size="sm"
                onClick={() => setActiveTab("preview")}
                className="gap-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white"
              >
                <Check className="w-3.5 h-3.5" />
                Done &amp; Preview Document
              </Button>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* OFFICIAL 2-PAGE LETTERHEAD DOCUMENT VIEW                      */}
        {/* ============================================================== */}
        <div
          ref={printRef}
          className="py-6 px-3 sm:px-6 flex flex-col items-center gap-8 bg-slate-200/60 print:p-0 print:m-0 print:bg-white print:gap-0 select-text"
        >
          {/* ============================================================ */}
          {/* PAGE 1: HEADER, TITLE, NARRATIVE, EVENTS TABLE              */}
          {/* ============================================================ */}
          <div
            className="annual-report-page-1 w-full max-w-[800px] min-h-[1100px] p-10 sm:p-14 bg-white text-black shadow-lg rounded-sm print:shadow-none print:rounded-none print:m-0 print:p-8 print:w-full print:max-w-none print:min-h-0 font-serif leading-normal relative border border-slate-200 print:border-none"
            style={{
              pageBreakAfter: "always",
              breakAfter: "page",
            }}
          >
            {/* 1. INSTITUTIONAL LETTERHEAD */}
            <div className="flex items-start justify-between gap-4 mb-3">
              {/* Left Logo: DSCASC Crest */}
              <div className="w-20 h-20 shrink-0 flex items-center justify-center pt-1">
                {DSCASC_LOGO_PNG_BASE64 && (
                  <img
                    src={DSCASC_LOGO_PNG_BASE64}
                    alt="Dayananda Sagar Institutions Crest"
                    className="max-h-20 max-w-20 object-contain"
                  />
                )}
              </div>

              {/* Center Text: Royal Blue Serif Headings */}
              <div className="text-center flex-1 px-1">
                <h1
                  className="font-bold tracking-tight uppercase"
                  style={{
                    color: "#1a368a",
                    fontSize: "17px",
                    lineHeight: "1.25",
                    fontFamily: '"Times New Roman", Times, Georgia, serif',
                  }}
                >
                  DAYANANDA SAGAR COLLEGE OF ARTS
                </h1>
                <h2
                  className="font-bold tracking-tight uppercase mt-0.5"
                  style={{
                    color: "#1a368a",
                    fontSize: "17px",
                    lineHeight: "1.25",
                    fontFamily: '"Times New Roman", Times, Georgia, serif',
                  }}
                >
                  SCIENCE &amp; COMMERCE
                </h2>
                <p
                  className="mt-1"
                  style={{
                    color: "#1a368a",
                    fontSize: "13px",
                    fontFamily: '"Times New Roman", Times, Georgia, serif',
                  }}
                >
                  Affiliated to Bangalore University
                </p>
              </div>

              {/* Right Logo: IIC Logo */}
              <div className="w-24 h-20 shrink-0 flex items-center justify-center pt-1">
                {IIC_LOGO_PNG_BASE64 && (
                  <img
                    src={IIC_LOGO_PNG_BASE64}
                    alt="Institution's Innovation Council Logo"
                    className="max-h-16 max-w-24 object-contain"
                  />
                )}
              </div>
            </div>

            {/* 2. ADDRESS STRIP (Bordered Top & Bottom) */}
            <div
              className="py-1.5 mb-6 text-center"
              style={{
                borderTop: "1.2px solid #1a368a",
                borderBottom: "2px solid #1a368a",
              }}
            >
              <p className="text-[10.5px] leading-tight text-slate-800 font-serif">
                Shavige Malleshwara Hills, Kumaraswamy Layout, Bangalore, Karnataka, India, Pin Code : 560111
              </p>
              <p className="text-[10.5px] leading-tight text-slate-800 font-serif mt-0.5">
                Phone : +91 8042161762 / 26661104 Fax: 26660789,
              </p>
              <p className="text-[10.5px] leading-tight text-slate-800 font-serif mt-0.5">
                Website : https://dscasc.edu.in/
              </p>
            </div>

            {/* 3. REPORT MAIN TITLE */}
            <div className="text-center mb-2">
              <h2
                className="font-bold text-black"
                style={{
                  fontSize: "16px",
                  fontFamily: '"Times New Roman", Times, Georgia, serif',
                }}
              >
                {reportTitle}
              </h2>
            </div>

            {/* 4. UNIT SUBTITLE */}
            <div className="text-center mb-5">
              <h3
                className="font-bold text-black"
                style={{
                  fontSize: "14.5px",
                  fontFamily: '"Times New Roman", Times, Georgia, serif',
                }}
              >
                {unitSubtitle}
              </h3>
            </div>

            {/* 5. NARRATIVE INTRODUCTION (3 Paragraphs, Justified) */}
            <div
              className="space-y-3.5 text-black text-justify mb-7"
              style={{
                fontSize: "12.5px",
                lineHeight: "1.55",
                fontFamily: '"Times New Roman", Times, Georgia, serif',
              }}
            >
              <p>{para1}</p>
              <p>{para2}</p>
              <p>{para3}</p>
            </div>

            {/* 6. EVENTS CONDUCTED TABLE */}
            <div className="mt-6">
              <div className="text-center mb-2.5">
                <h4
                  className="font-bold text-black"
                  style={{
                    fontSize: "13.5px",
                    fontFamily: '"Times New Roman", Times, Georgia, serif',
                  }}
                >
                  Events conducted during {academicPeriod}
                </h4>
              </div>

              <div className="overflow-x-auto">
                <table
                  className="w-full text-black border-collapse"
                  style={{
                    border: "1.2px solid #000",
                    fontFamily: '"Times New Roman", Times, Georgia, serif',
                    fontSize: "12px",
                  }}
                >
                  <thead>
                    <tr className="border-b border-black">
                      <th
                        className="p-2 border-r border-black font-bold text-center"
                        style={{ width: "8%" }}
                      >
                        SL.No
                        <span className="block text-[10px] font-normal">.</span>
                      </th>
                      <th
                        className="p-2 border-r border-black font-bold text-center"
                        style={{ width: "32%" }}
                      >
                        Event Name
                      </th>
                      <th
                        className="p-2 border-r border-black font-bold text-center"
                        style={{ width: "16%" }}
                      >
                        Date
                      </th>
                      <th
                        className="p-2 border-r border-black font-bold text-center leading-tight"
                        style={{ width: "18%" }}
                      >
                        Department/
                        <br />
                        DSCASC
                      </th>
                      <th
                        className="p-2 border-r border-black font-bold text-center leading-tight"
                        style={{ width: "12%" }}
                      >
                        No. of
                        <br />
                        participants
                      </th>
                      <th
                        className="p-2 font-bold text-center"
                        style={{ width: "24%" }}
                      >
                        Weblink
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableEvents.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="p-4 text-center text-slate-500 italic font-normal"
                        >
                          No events conducted or recorded in the analytics section for this period.
                        </td>
                      </tr>
                    ) : (
                      tableEvents.map((e, idx) => (
                        <tr key={idx} className="border-b border-black">
                          <td className="p-2 border-r border-black text-center align-top font-normal">
                            {e.slNo || idx + 1}.
                          </td>
                          <td className="p-2 border-r border-black align-top font-normal">
                            {e.name}
                          </td>
                          <td className="p-2 border-r border-black text-center align-top whitespace-nowrap font-normal">
                            {e.date}
                          </td>
                          <td className="p-2 border-r border-black align-top font-normal">
                            {e.department}
                          </td>
                          <td className="p-2 border-r border-black text-center align-top font-normal">
                            {e.participants}
                          </td>
                          <td className="p-2 align-top break-all font-normal">
                            <a
                              href={e.weblink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 underline flex items-start gap-1"
                            >
                              <span>{e.weblink}</span>
                              <ExternalLink className="w-2.5 h-2.5 shrink-0 mt-0.5 print:hidden opacity-60" />
                            </a>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Page number indicator (screen only) */}
            <div className="absolute bottom-3 right-8 text-[11px] text-slate-400 print:hidden font-sans">
              Page 1 of 2
            </div>
          </div>

          {/* ============================================================ */}
          {/* PAGE 2: HEAD & MEMBERS TABLE + ALWAYS EMPTY SIGNATURES       */}
          {/* ============================================================ */}
          <div
            className="annual-report-page-2 w-full max-w-[800px] min-h-[1100px] p-10 sm:p-14 bg-white text-black shadow-lg rounded-sm print:shadow-none print:rounded-none print:m-0 print:p-8 print:w-full print:max-w-none print:min-h-0 font-serif leading-normal relative border border-slate-200 print:border-none flex flex-col justify-between"
            style={{
              pageBreakBefore: "always",
              breakBefore: "page",
            }}
          >
            <div>
              {/* Heading */}
              <div className="text-center pt-4 mb-6">
                <h3
                  className="font-bold text-black"
                  style={{
                    fontSize: "15px",
                    fontFamily: '"Times New Roman", Times, Georgia, serif',
                  }}
                >
                  Head and Members of the Unit
                </h3>
              </div>

              {/* Members Table */}
              <div className="overflow-x-auto mb-10">
                <table
                  className="w-full text-black border-collapse"
                  style={{
                    border: "1.2px solid #000",
                    fontFamily: '"Times New Roman", Times, Georgia, serif',
                    fontSize: "12.5px",
                  }}
                >
                  <thead>
                    <tr className="border-b border-black">
                      <th
                        className="p-2 border-r border-black font-bold text-center leading-tight"
                        style={{ width: "10%" }}
                      >
                        Sl.
                        <br />
                        No.
                      </th>
                      <th
                        className="p-2 border-r border-black font-bold text-center"
                        style={{ width: "42%" }}
                      >
                        Members name
                      </th>
                      <th
                        className="p-2 border-r border-black font-bold text-center"
                        style={{ width: "24%" }}
                      >
                        Role
                      </th>
                      <th
                        className="p-2 font-bold text-center"
                        style={{ width: "24%" }}
                      >
                        Department
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableMembers.map((m, idx) => (
                      <tr key={idx} className="border-b border-black">
                        <td className="p-2 border-r border-black text-center align-middle font-normal">
                          {m.slNo || idx + 1}.
                        </td>
                        <td className="p-2 border-r border-black align-middle font-normal">
                          {m.name}
                        </td>
                        <td className="p-2 border-r border-black align-middle font-normal">
                          {m.role}
                        </td>
                        <td className="p-2 align-middle font-normal">
                          {m.department}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ============================================================ */}
            {/* SIGNATURES SECTION (ALWAYS COMPLETELY EMPTY)                 */}
            {/* ============================================================ */}
            <div className="pt-16 pb-8">
              <div className="grid grid-cols-3 gap-6 text-center items-end">
                {/* Column 1: Unit Head (Empty Space) */}
                <div className="flex flex-col items-center">
                  {/* Clean empty space for physical pen signature */}
                  <div className="h-24 w-full" />
                  <p
                    className="font-bold text-black"
                    style={{
                      fontSize: "13px",
                      fontFamily: '"Times New Roman", Times, Georgia, serif',
                    }}
                  >
                    Unit Head
                  </p>
                  <p className="text-[11px] text-slate-800 font-serif leading-tight mt-0.5">
                    Dayananda Sagar College of Arts,
                  </p>
                  <p className="text-[11px] text-slate-800 font-serif leading-tight">
                    Science &amp; Commerce
                  </p>
                  <p className="text-[10px] text-slate-600 font-serif leading-tight">
                    Kumaraswamy Layout, Bengaluru - 560 111
                  </p>
                </div>

                {/* Column 2: IQAC Coordinator (Empty Space for Signature & Stamp) */}
                <div className="flex flex-col items-center">
                  {/* Clean empty space for physical pen signature and rubber stamp */}
                  <div className="h-24 w-full" />
                  <p
                    className="font-bold text-black"
                    style={{
                      fontSize: "13px",
                      fontFamily: '"Times New Roman", Times, Georgia, serif',
                    }}
                  >
                    IQAC Coordinator
                  </p>
                  <p className="text-[11px] text-slate-800 font-serif leading-tight mt-0.5">
                    Dayananda Sagar College of Arts,
                  </p>
                  <p className="text-[11px] text-slate-800 font-serif leading-tight">
                    Science &amp; Commerce
                  </p>
                  <p className="text-[10px] text-slate-600 font-serif leading-tight">
                    Kumaraswamy Layout, Bengaluru - 560 111
                  </p>
                </div>

                {/* Column 3: Principal (Empty Space) */}
                <div className="flex flex-col items-center">
                  {/* Clean empty space for physical pen signature */}
                  <div className="h-24 w-full" />
                  <p
                    className="font-bold text-black"
                    style={{
                      fontSize: "13px",
                      fontFamily: '"Times New Roman", Times, Georgia, serif',
                    }}
                  >
                    Principal
                  </p>
                  <p className="text-[11px] text-slate-800 font-serif leading-tight mt-0.5">
                    Dayananda Sagar College of Arts,
                  </p>
                  <p className="text-[11px] text-slate-800 font-serif leading-tight">
                    Science &amp; Commerce
                  </p>
                  <p className="text-[10px] text-slate-600 font-serif leading-tight">
                    Kumaraswamy Layout, Bengaluru - 560 111
                  </p>
                </div>
              </div>
            </div>

            {/* Page number indicator (screen only) */}
            <div className="text-right text-[11px] text-slate-400 print:hidden font-sans">
              Page 2 of 2
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
