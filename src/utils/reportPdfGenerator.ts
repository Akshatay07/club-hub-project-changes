import { jsPDF } from "jspdf";
import { DSCASC_LOGO_PNG_BASE64, IIC_LOGO_PNG_BASE64 } from "./reportLogos";

export interface ReportData {
  _id?: string;
  name: string;
  type?: string;
  department?: string;
  reportDate?: string;
  date?: string;
  time?: string;
  venue?: string;
  location?: string;

  resourcePerson1?: {
    name?: string;
    designation?: string;
    organization?: string;
  };
  resourcePerson1Topics?: string;

  resourcePerson2?: {
    name?: string;
    designation?: string;
    organization?: string;
  };
  resourcePerson2Topics?: string;

  facultyParticipants?: {
    internal?: number | string;
    external?: number | string;
  };
  studentParticipants?: {
    internal?: number | string;
    external?: number | string;
  };

  facultyCoordinator?: string;
  facultyCoordinatorDetails?: string;
  studentCoordinator?: string;
  studentCoordinatorDetails?: string;

  totalExpenditure?: string | number;
  budgetSpent?: number;
  sponsors?: string;

  agenda?: string;
  websiteReportLink?: string;
  socialMediaLinks?: string;
  newspaperReport?: string;

  certificatesPrinted?: string | boolean;
  feedbackCollected?: string | boolean;
  attendanceAttached?: string | boolean;
  photographsAttached?: string | boolean;

  summary?: string;

  // Annexures
  attachments?: Array<{
    _id?: string;
    label?: string;
    url?: string;
    originalName?: string;
    fileName?: string;
    isDeleted?: boolean;
  }>;
  eventPhotos?: Array<{
    _id?: string;
    url?: string;
    caption?: string;
    originalName?: string;
  }>;
  signedAttendanceSheets?: Array<{
    _id?: string;
    url?: string;
    originalName?: string;
    fileName?: string;
  }>;
}

// Convert image URL to base64 for jsPDF
async function getBase64ImageFromUrl(imageUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.setAttribute("crossOrigin", "anonymous");
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/jpeg", 0.95));
      } else {
        resolve("");
      }
    };
    img.onerror = () => resolve("");
    img.src = imageUrl;
  });
}

export async function generateInstitutionalReportPdf(report: ReportData): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "a4",
  });

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const marginLeft = 38;
  const marginRight = 38;
  const contentWidth = pageWidth - marginLeft - marginRight; // 519.28 pt

  let curY = 36;

  // Set font family to Times (standard serif matching institutional document)
  const setFont = (style: "normal" | "bold" | "italic" = "normal", size: number = 9) => {
    doc.setFont("times", style);
    doc.setFontSize(size);
    doc.setTextColor(0, 0, 0);
  };

  // Helper to render institutional header
  const renderHeader = (isFirstPage: boolean = true) => {
    const headerTop = 32;

    // Left Logo: Authentic DSCASC Crest
    if (DSCASC_LOGO_PNG_BASE64) {
      try {
        doc.addImage(DSCASC_LOGO_PNG_BASE64, "PNG", marginLeft, headerTop, 46, 46);
      } catch (e) {
        console.warn("Logo add error:", e);
      }
    }

    // Right Logo: Authentic IIC Logo
    if (IIC_LOGO_PNG_BASE64) {
      try {
        doc.addImage(IIC_LOGO_PNG_BASE64, "PNG", pageWidth - marginRight - 82, headerTop + 4, 82, 34);
      } catch (e) {
        console.warn("IIC Logo add error:", e);
      }
    }

    // Institution Title in Times-Bold
    setFont("bold", 12.5);
    doc.text(
      "Dayananda Sagar College of Arts, Science, and Commerce",
      pageWidth / 2,
      headerTop + 14,
      { align: "center" }
    );

    setFont("bold", 11);
    doc.text("Internal Quality Assurance Cell", pageWidth / 2, headerTop + 27, {
      align: "center",
    });

    if (isFirstPage) {
      const eventType = report.type || "FDP";
      const titleLine = `${eventType} on “${report.name || "Event Title"}”`;
      const titleLines = doc.splitTextToSize(titleLine, contentWidth - 180);
      setFont("bold", 10.5);
      doc.text(titleLines, pageWidth / 2, headerTop + 40, { align: "center" });

      const afterTitleY = headerTop + 40 + titleLines.length * 12 + 6;

      // Meta Line: Department & Date (Times-Bold)
      setFont("bold", 10);
      doc.text(`Department: ${report.department || "BCA"}`, marginLeft, afterTitleY);
      doc.text(
        `Date of Report: ${report.reportDate || "31-01-2026"}`,
        pageWidth - marginRight,
        afterTitleY,
        { align: "right" }
      );

      return afterTitleY + 8;
    }

    return headerTop + 54;
  };

  curY = renderHeader(true);

  // Table Column Definitions
  const col1W = 28; // Sl. No.
  const col2W = 108; // Particulars
  const col3W = contentWidth - col1W - col2W; // 383.28 pt

  // Table Header Row
  const drawTableHeader = (y: number) => {
    const h = 24;
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.8);

    doc.rect(marginLeft, y, col1W, h);
    doc.rect(marginLeft + col1W, y, col2W, h);
    doc.rect(marginLeft + col1W + col2W, y, col3W, h);

    setFont("bold", 9.5);
    doc.text("Sl.", marginLeft + col1W / 2, y + 10, { align: "center" });
    doc.text("No.", marginLeft + col1W / 2, y + 19, { align: "center" });

    doc.text("Particulars", marginLeft + col1W + 6, y + 15);
    doc.text("Event related Details", marginLeft + col1W + col2W + 6, y + 15);

    return y + h;
  };

  curY = drawTableHeader(curY);

  // Generic Simple Row Renderer
  const drawSimpleRow = (
    slNo: string,
    particulars: string,
    details: string | string[],
    isBoldDetails: boolean = false
  ) => {
    setFont("normal", 9);
    const linesDetails = Array.isArray(details)
      ? details
      : doc.splitTextToSize(details || "-", col3W - 12);

    const particularsLines = doc.splitTextToSize(particulars, col2W - 10);
    const textHeight = Math.max(linesDetails.length, particularsLines.length) * 11;
    const rowH = Math.max(textHeight + 8, 18);

    // Page break check
    if (curY + rowH > pageHeight - 65) {
      doc.addPage();
      curY = renderHeader(false);
      curY = drawTableHeader(curY);
    }

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.6);

    doc.rect(marginLeft, curY, col1W, rowH);
    doc.rect(marginLeft + col1W, curY, col2W, rowH);
    doc.rect(marginLeft + col1W + col2W, curY, col3W, rowH);

    // Sl No
    setFont("bold", 9);
    doc.text(slNo, marginLeft + col1W / 2, curY + 12, { align: "center" });

    // Particulars
    setFont("bold", 9);
    doc.text(particularsLines, marginLeft + col1W + 5, curY + 12);

    // Details
    setFont(isBoldDetails ? "bold" : "normal", 9);
    doc.text(linesDetails, marginLeft + col1W + col2W + 5, curY + 12);

    curY += rowH;
  };

  // Row 3 & 4: Date of Conduction + 4. Time :
  const drawDateAndTimeRow = (
    sl1: string,
    part1: string,
    dateVal: string,
    sl2: string,
    part2: string,
    timeVal: string
  ) => {
    const leftW = 165;
    const midLabelW = 65;
    const rightW = col3W - leftW - midLabelW;

    setFont("normal", 9);
    const dateLines = doc.splitTextToSize(dateVal || "-", leftW - 10);
    const timeLines = doc.splitTextToSize(timeVal || "-", rightW - 8);
    const rowH = Math.max(Math.max(dateLines.length, timeLines.length) * 11 + 8, 18);

    if (curY + rowH > pageHeight - 65) {
      doc.addPage();
      curY = renderHeader(false);
      curY = drawTableHeader(curY);
    }

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.6);

    doc.rect(marginLeft, curY, col1W, rowH);
    doc.rect(marginLeft + col1W, curY, col2W, rowH);
    doc.rect(marginLeft + col1W + col2W, curY, leftW, rowH);
    doc.rect(marginLeft + col1W + col2W + leftW, curY, midLabelW, rowH);
    doc.rect(marginLeft + col1W + col2W + leftW + midLabelW, curY, rightW, rowH);

    // Sl 3
    setFont("bold", 9);
    doc.text(sl1, marginLeft + col1W / 2, curY + 12, { align: "center" });
    doc.text(part1, marginLeft + col1W + 5, curY + 12);

    // Date Val
    setFont("normal", 9);
    doc.text(dateLines, marginLeft + col1W + col2W + 5, curY + 12);

    // 4. Time :
    const midX = marginLeft + col1W + col2W + leftW;
    setFont("bold", 9);
    doc.text(sl2, midX + 6, curY + 12);
    doc.text(part2, midX + 22, curY + 12);

    // Time Val
    const rightX = midX + midLabelW;
    setFont("bold", 9);
    doc.text(timeLines, rightX + 5, curY + 12);

    curY += rowH;
  };

  // Row for Participants: Internal / External
  const drawParticipantsRow = (
    slNo: string,
    particulars: string,
    internalVal: string | number,
    externalVal: string | number
  ) => {
    const rowH = 18;
    if (curY + rowH > pageHeight - 65) {
      doc.addPage();
      curY = renderHeader(false);
      curY = drawTableHeader(curY);
    }

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.6);

    const intLabelW = 65;
    const intValW = 60;
    const extLabelW = 65;
    const extValW = col3W - (intLabelW + intValW + extLabelW);

    doc.rect(marginLeft, curY, col1W, rowH);
    doc.rect(marginLeft + col1W, curY, col2W, rowH);
    doc.rect(marginLeft + col1W + col2W, curY, intLabelW, rowH);
    doc.rect(marginLeft + col1W + col2W + intLabelW, curY, intValW, rowH);
    doc.rect(marginLeft + col1W + col2W + intLabelW + intValW, curY, extLabelW, rowH);
    doc.rect(marginLeft + col1W + col2W + intLabelW + intValW + extLabelW, curY, extValW, rowH);

    setFont("bold", 9);
    doc.text(slNo, marginLeft + col1W / 2, curY + 12, { align: "center" });
    doc.text(particulars, marginLeft + col1W + 5, curY + 12);

    // Internal Label & Val
    doc.text("Internal:", marginLeft + col1W + col2W + 5, curY + 12);
    setFont("bold", 9);
    doc.text(String(internalVal ?? "-"), marginLeft + col1W + col2W + intLabelW + 6, curY + 12);

    // External Label & Val
    const extX = marginLeft + col1W + col2W + intLabelW + intValW;
    setFont("bold", 9);
    doc.text("External:", extX + 5, curY + 12);
    doc.text(String(externalVal ?? "NIL"), extX + extLabelW + 6, curY + 12);

    curY += rowH;
  };

  // Row for Split Particulars (e.g. 14 & 15, 16 & 17, 18 & 19, 20 & 21, 22 & 23)
  const drawSubdividedRow = (
    sl1: string,
    part1: string,
    val1: string,
    sl2: string,
    part2: string,
    val2: string,
    val1Width: number = 140
  ) => {
    const leftValW = val1Width;
    const rightPartW = 145;
    const rightValW = col3W - leftValW - rightPartW;

    setFont("normal", 9);
    const p1Lines = doc.splitTextToSize(part1, col2W - 8);
    const v1Lines = doc.splitTextToSize(val1 || "-", leftValW - 10);
    const p2Lines = doc.splitTextToSize(part2, rightPartW - 20);
    const v2Lines = doc.splitTextToSize(val2 || "-", rightValW - 8);

    const maxLines = Math.max(p1Lines.length, v1Lines.length, p2Lines.length, v2Lines.length);
    const rowH = Math.max(maxLines * 11 + 8, 18);

    if (curY + rowH > pageHeight - 65) {
      doc.addPage();
      curY = renderHeader(false);
      curY = drawTableHeader(curY);
    }

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.6);

    doc.rect(marginLeft, curY, col1W, rowH);
    doc.rect(marginLeft + col1W, curY, col2W, rowH);
    doc.rect(marginLeft + col1W + col2W, curY, leftValW, rowH);
    doc.rect(marginLeft + col1W + col2W + leftValW, curY, rightPartW, rowH);
    doc.rect(marginLeft + col1W + col2W + leftValW + rightPartW, curY, rightValW, rowH);

    // Left Side
    setFont("bold", 9);
    doc.text(sl1, marginLeft + col1W / 2, curY + 12, { align: "center" });
    doc.text(p1Lines, marginLeft + col1W + 5, curY + 12);
    setFont("bold", 9);
    doc.text(v1Lines, marginLeft + col1W + col2W + 5, curY + 12);

    // Right Side
    const midX = marginLeft + col1W + col2W + leftValW;
    setFont("bold", 9);
    doc.text(sl2, midX + 5, curY + 12);
    doc.text(p2Lines, midX + 18, curY + 12);

    const rightX = midX + rightPartW;
    setFont("bold", 9);
    doc.text(v2Lines, rightX + 5, curY + 12);

    curY += rowH;
  };

  // 1. Event*
  drawSimpleRow("1.", "Event*", report.type || "Faculty Development Program", true);

  // 2. Title of the Event
  drawSimpleRow("2.", "Title of the Event", `“${report.name || ""}”`, true);

  // 3 & 4: Date of Conduction | 4. Time :
  drawDateAndTimeRow(
    "3.",
    "Date of Conduction",
    report.date || "22nd ,24th ,28th, 30th ,31st Jan 2026",
    "4.",
    "Time :",
    report.time || "2:00 PM to 4:00 PM"
  );

  // 5. Venue
  drawSimpleRow("5.", "Venue", report.venue || report.location || "Online Google meet");

  // 6. Resource Person 1 Details
  const rp1Lines = [
    report.resourcePerson1?.name || "Nirmal Gaud",
    report.resourcePerson1?.designation || "Founder & CEO",
    report.resourcePerson1?.organization || "Cognitia Research - ThinkAI",
  ].filter(Boolean);
  drawSimpleRow("6.", "Resource Person 1 Details", rp1Lines, true);

  // 7. Topics Covered
  drawSimpleRow(
    "7.",
    "Topics Covered",
    report.resourcePerson1Topics ||
      "Mathematics behind AI/ML model with tips and tools to write Research paper"
  );

  // 8. Resource Person 2 Details
  const rp2Lines = [
    report.resourcePerson2?.name,
    report.resourcePerson2?.designation,
    report.resourcePerson2?.organization,
  ].filter(Boolean);
  drawSimpleRow(
    "8.",
    "Resource Person 2 Details",
    rp2Lines.length > 0 && rp2Lines[0] !== "NA" ? rp2Lines : "NA"
  );

  // 9. Topics Covered
  drawSimpleRow("9.", "Topics Covered", report.resourcePerson2Topics || "NA");

  // 10. No. Faculty Participants
  drawParticipantsRow(
    "10.",
    "No. Faculty Participants",
    report.facultyParticipants?.internal ?? "22",
    report.facultyParticipants?.external ?? "NIL"
  );

  // 11. No. Student Participants
  drawParticipantsRow(
    "11.",
    "No. Student Participants",
    report.studentParticipants?.internal ?? "---",
    report.studentParticipants?.external ?? "NIL"
  );

  // 12. Faculty Coordinator
  const fcDetails =
    report.facultyCoordinatorDetails ||
    `Name: ${report.facultyCoordinator || "Lakshmi S"}\nDesignation : Assistant Professor\nDepartment: Department of Computer Applications, DSCASC.`;
  drawSimpleRow("12.", "Faculty Coordinator", fcDetails.split("\n"));

  // 13. Student Coordinator/s
  const scDetails =
    report.studentCoordinatorDetails ||
    `${report.studentCoordinator || "Yadavacharya Jayacharya Nagasampagi"}\nP03CJ24S126119 III sem MCA`;
  drawSimpleRow("13.", "Student Coordinator/s", scDetails.split("\n"));

  // 14 & 15: Total Expenditure | Sponsors and Amount (if any)
  drawSubdividedRow(
    "14.",
    "Total Expenditure",
    report.totalExpenditure ? `${report.totalExpenditure}` : "20,000/-",
    "15.",
    "Sponsors and Amount (if any)",
    report.sponsors || "NA",
    140
  );

  // 16 & 17: Agenda of the Event | Provide link of report on College Website
  drawSubdividedRow(
    "16.",
    "Agenda of the Event",
    report.agenda || "Training on AI/ML model analyis and research paper writing",
    "17.",
    "Provide the link of the report uploaded on College Website",
    report.websiteReportLink || "No",
    140
  );

  // 18 & 19: Social Media Links | Report sent to Newspapers?
  drawSubdividedRow(
    "18.",
    "Social Media Links",
    report.socialMediaLinks || "---",
    "19.",
    "Report sent to Newspapers? If yes, provide cuttings/images:",
    report.newspaperReport || "No",
    140
  );

  // 20 & 21: Certificates Printed? | Feedback Collected?
  drawSubdividedRow(
    "20.",
    "Certificates Printed?",
    report.certificatesPrinted ? String(report.certificatesPrinted) : "No",
    "21.",
    "Feedback Collected?",
    report.feedbackCollected ? String(report.feedbackCollected) : "Yes",
    140
  );

  // 22 & 23: Attendance Sheet Attached?* | Photographs of the Event
  drawSubdividedRow(
    "22.",
    "Attendance Sheet Attached?*",
    report.attendanceAttached ? String(report.attendanceAttached) : "Yes",
    "23.",
    "Photographs of the Event",
    report.photographsAttached || "Attached",
    140
  );

  // 24. Summary of the Event
  const defaultSummary =
    "The Department of Computer Applications – BCA conducted a FDP for faculty members by Nirmal Gaud. The FDP was on “Computational Mathematics for AI & Machine Learning: Modeling, Analysis, and Research Paper Writing”. Day 1 to Day 5 the concepts like introduced to the mathematical foundations underlying AI and ML models, with a focus on deep learning architectures such as DenseNet, and then the session included discussions on selected research papers, highlighting model design, datasets, and implementation aspects. Practical exposure was provided through code walkthroughs and dataset analysis to bridge theory and application. In addition, participants were trained in using Overleaf for academic writing, enabling them to collaboratively prepare and format research papers efficiently according to standard publication guidelines. The faculty where also appraised of journal quartile and publications. Excellent feedback for FDP was received from faculty members.";

  const fullSummary = report.summary || defaultSummary;
  setFont("normal", 9);
  const summaryLines = doc.splitTextToSize(fullSummary, col3W - 12);

  // Available lines on Page 1
  const remainingSpace = pageHeight - 45 - curY;
  const linesThatFit = Math.max(Math.floor((remainingSpace - 12) / 11), 3);

  const linesPage1 = summaryLines.slice(0, linesThatFit);
  const linesPage2 = summaryLines.slice(linesThatFit);

  // Draw Page 1 chunk
  const rowH1 = linesPage1.length * 11 + 8;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.6);
  doc.rect(marginLeft, curY, col1W, rowH1);
  doc.rect(marginLeft + col1W, curY, col2W, rowH1);
  doc.rect(marginLeft + col1W + col2W, curY, col3W, rowH1);

  setFont("bold", 9);
  doc.text("24.", marginLeft + col1W / 2, curY + 12, { align: "center" });
  doc.text("Summary of the Event", marginLeft + col1W + 5, curY + 12);
  setFont("normal", 9);
  doc.text(linesPage1, marginLeft + col1W + col2W + 5, curY + 12);

  // ================= PAGE 2 (CONTINUATION & 5 SIGNATORIES) =================
  doc.addPage();
  curY = 40;
  curY = drawTableHeader(curY);

  const rowH2 = Math.max(linesPage2.length * 11 + 14, 45);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.6);
  doc.rect(marginLeft, curY, col1W, rowH2);
  doc.rect(marginLeft + col1W, curY, col2W, rowH2);
  doc.rect(marginLeft + col1W + col2W, curY, col3W, rowH2);

  setFont("normal", 9);
  doc.text(linesPage2, marginLeft + col1W + col2W + 5, curY + 12);
  curY += rowH2;

  // 5 Signatories Block (Exact position below table matching image 2)
  const signatories = [
    "Event Coordinators",
    "HOD-BCA",
    "Vice-Principal",
    "IQAC Coordinator",
    "Principal",
  ];

  const sigY = curY + 55;
  const sigSpacing = contentWidth / 5;
  setFont("bold", 9.5);

  signatories.forEach((sig, index) => {
    const x = marginLeft + index * sigSpacing + sigSpacing / 2;
    doc.text(sig, x, sigY, { align: "center" });
  });

  // ================= ANNEXURES =================
  const backendBase = "http://localhost:5000";

  // ANNEXURE I: BROCHURE
  const brochure = report.attachments?.find(
    (att) => att.label === "brochure" && !att.isDeleted
  );

  if (brochure?.url) {
    doc.addPage();
    renderHeader(false);

    setFont("bold", 12);
    doc.text("ANNEXURE I: EVENT BROCHURE", pageWidth / 2, 85, { align: "center" });

    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.8);
    doc.line(marginLeft, 95, pageWidth - marginRight, 95);

    const fullBrochureUrl = brochure.url.startsWith("http")
      ? brochure.url
      : `${backendBase}${brochure.url}`;

    try {
      const brochureBase64 = await getBase64ImageFromUrl(fullBrochureUrl);
      if (brochureBase64) {
        doc.addImage(brochureBase64, "JPEG", marginLeft + 30, 110, contentWidth - 60, 620, undefined, "FAST");
      } else {
        setFont("italic", 10);
        doc.text(`Brochure File: ${brochure.originalName || "Event Brochure (Attached)"}`, pageWidth / 2, 160, { align: "center" });
      }
    } catch {
      doc.text("Event Brochure Attached", pageWidth / 2, 160, { align: "center" });
    }
  }

  // ANNEXURE II: EVENT PHOTOGRAPHS
  if (report.eventPhotos && report.eventPhotos.length > 0) {
    doc.addPage();
    renderHeader(false);

    setFont("bold", 12);
    doc.text("ANNEXURE II: EVENT PHOTOGRAPHS / GLIMPSES", pageWidth / 2, 85, { align: "center" });

    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.8);
    doc.line(marginLeft, 95, pageWidth - marginRight, 95);

    const photoW = (contentWidth - 20) / 2;
    const photoH = 190;
    const startPhotoY = 110;

    for (let i = 0; i < Math.min(report.eventPhotos.length, 6); i++) {
      const photo = report.eventPhotos[i];
      const col = i % 2;
      const row = Math.floor(i / 2);

      const px = marginLeft + col * (photoW + 20);
      const py = startPhotoY + row * (photoH + 30);

      doc.setDrawColor(203, 213, 225);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(px, py, photoW, photoH, 3, 3, "FD");

      const photoUrl = photo.url?.startsWith("http")
        ? photo.url
        : `${backendBase}${photo.url}`;

      try {
        const photoBase64 = await getBase64ImageFromUrl(photoUrl);
        if (photoBase64) {
          doc.addImage(photoBase64, "JPEG", px + 4, py + 4, photoW - 8, photoH - 24, undefined, "FAST");
        }
      } catch (err) {
        console.warn("Photo render error:", err);
      }

      setFont("bold", 8.5);
      doc.text(
        `Photo ${i + 1}: ${photo.caption || "Event Session"}`,
        px + photoW / 2,
        py + photoH - 6,
        { align: "center" }
      );
    }
  }

  // ANNEXURE III: SIGNED ATTENDANCE SHEETS
  if (report.signedAttendanceSheets && report.signedAttendanceSheets.length > 0) {
    for (let sIdx = 0; sIdx < report.signedAttendanceSheets.length; sIdx++) {
      const sheet = report.signedAttendanceSheets[sIdx];
      doc.addPage();
      renderHeader(false);

      setFont("bold", 12);
      doc.text(
        `ANNEXURE III: SIGNED ATTENDANCE SHEET (Page ${sIdx + 1})`,
        pageWidth / 2,
        85,
        { align: "center" }
      );

      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.8);
      doc.line(marginLeft, 95, pageWidth - marginRight, 95);

      const sheetUrl = sheet.url?.startsWith("http")
        ? sheet.url
        : `${backendBase}${sheet.url}`;

      try {
        const sheetBase64 = await getBase64ImageFromUrl(sheetUrl);
        if (sheetBase64) {
          doc.addImage(sheetBase64, "JPEG", marginLeft + 10, 110, contentWidth - 20, 640, undefined, "FAST");
        } else {
          setFont("bold", 10);
          doc.text(`Scanned Signed Attendance Sheet: ${sheet.originalName || "attendance-sheet.pdf"}`, pageWidth / 2, 200, { align: "center" });
        }
      } catch {
        doc.text(`Signed Attendance Sheet: ${sheet.originalName || "attendance.pdf"}`, pageWidth / 2, 200, { align: "center" });
      }
    }
  }

  return doc;
}
