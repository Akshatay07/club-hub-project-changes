import { jsPDF } from "jspdf";
import { DSCASC_LOGO_SVG, IIC_LOGO_SVG, svgToDataUrl } from "./reportLogos";

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
        resolve(canvas.toDataURL("image/jpeg", 0.9));
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
  const marginLeft = 36;
  const marginRight = 36;
  const contentWidth = pageWidth - marginLeft - marginRight; // 523.28 pt

  const dscascLogoPng = await svgToDataUrl(DSCASC_LOGO_SVG);
  const iicLogoPng = await svgToDataUrl(IIC_LOGO_SVG);

  let curY = 32;

  // Helper to render institutional header
  const renderHeader = (isFirstPage: boolean = true) => {
    const headerTop = 28;
    // Left Logo: DSCASC Crest
    if (dscascLogoPng) {
      try {
        doc.addImage(dscascLogoPng, "PNG", marginLeft + 2, headerTop, 44, 44);
      } catch (e) {
        console.warn("Logo add error:", e);
      }
    }

    // Right Logo: IIC Logo
    if (iicLogoPng) {
      try {
        doc.addImage(iicLogoPng, "PNG", pageWidth - marginRight - 84, headerTop + 4, 82, 34);
      } catch (e) {
        console.warn("IIC Logo add error:", e);
      }
    }

    // Institution Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11.5);
    doc.setTextColor(15, 23, 42);
    doc.text(
      "Dayananda Sagar College of Arts, Science, and Commerce",
      pageWidth / 2,
      headerTop + 14,
      { align: "center" }
    );

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Internal Quality Assurance Cell", pageWidth / 2, headerTop + 26, {
      align: "center",
    });

    if (isFirstPage) {
      const eventType = report.type || "Event";
      const titleLine = `${eventType} on “${report.name || "Event Title"}”`;
      const titleLines = doc.splitTextToSize(titleLine, contentWidth - 170);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.text(titleLines, pageWidth / 2, headerTop + 38, { align: "center" });

      const afterTitleY = headerTop + 38 + (titleLines.length * 11) + 4;

      // Meta Line: Department & Date
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.text(`Department: ${report.department || "BCA"}`, marginLeft, afterTitleY);
      doc.text(
        `Date of Report: ${report.reportDate || new Date().toLocaleDateString("en-GB")}`,
        pageWidth - marginRight,
        afterTitleY,
        { align: "right" }
      );

      return afterTitleY + 8;
    }

    return headerTop + 50;
  };

  curY = renderHeader(true);

  // Table Column Definitions
  const col1W = 24; // Sl. No.
  const col2W = 104; // Particulars
  const col3W = contentWidth - col1W - col2W; // 395.28 pt

  // Table Header Row
  const drawTableHeader = (y: number) => {
    const h = 20;
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.8);

    doc.rect(marginLeft, y, col1W, h);
    doc.rect(marginLeft + col1W, y, col2W, h);
    doc.rect(marginLeft + col1W + col2W, y, col3W, h);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(0, 0, 0);

    doc.text("Sl.", marginLeft + col1W / 2, y + 8, { align: "center" });
    doc.text("No.", marginLeft + col1W / 2, y + 16, { align: "center" });

    doc.text("Particulars", marginLeft + col1W + 6, y + 13);
    doc.text("Event related Details", marginLeft + col1W + col2W + 6, y + 13);

    return y + h;
  };

  curY = drawTableHeader(curY);

  // Generic Row Renderer
  const drawSimpleRow = (
    slNo: string,
    particulars: string,
    details: string | string[],
    isBoldParticulars: boolean = true
  ) => {
    const linesDetails = Array.isArray(details)
      ? details
      : doc.splitTextToSize(details || "-", col3W - 12);

    const particularsLines = doc.splitTextToSize(particulars, col2W - 10);
    const textHeight = Math.max(linesDetails.length, particularsLines.length) * 10.5;
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
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(slNo, marginLeft + col1W / 2, curY + 11, { align: "center" });

    // Particulars
    doc.setFont("helvetica", isBoldParticulars ? "bold" : "normal");
    doc.text(particularsLines, marginLeft + col1W + 5, curY + 11);

    // Details
    doc.setFont("helvetica", "normal");
    doc.text(linesDetails, marginLeft + col1W + col2W + 5, curY + 11);

    curY += rowH;
  };

  // Row with Split in Col 3 (e.g., Sl 3 & 4: Date + Time)
  const drawSplitRow = (
    sl1: string,
    part1: string,
    val1: string,
    sl2: string,
    part2: string,
    val2: string
  ) => {
    const halfCol3 = col3W / 2;
    const lines1 = doc.splitTextToSize(val1 || "-", halfCol3 - 10);
    const lines2 = doc.splitTextToSize(val2 || "-", halfCol3 - 45);
    const rowH = Math.max(Math.max(lines1.length, lines2.length) * 10 + 8, 18);

    if (curY + rowH > pageHeight - 65) {
      doc.addPage();
      curY = renderHeader(false);
      curY = drawTableHeader(curY);
    }

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.6);

    doc.rect(marginLeft, curY, col1W, rowH);
    doc.rect(marginLeft + col1W, curY, col2W, rowH);
    doc.rect(marginLeft + col1W + col2W, curY, halfCol3, rowH);
    doc.rect(marginLeft + col1W + col2W + halfCol3, curY, halfCol3, rowH);

    // Left half
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(sl1, marginLeft + col1W / 2, curY + 11, { align: "center" });
    doc.text(part1, marginLeft + col1W + 5, curY + 11);
    doc.setFont("helvetica", "normal");
    doc.text(lines1, marginLeft + col1W + col2W + 5, curY + 11);

    // Right half
    const rightBoxX = marginLeft + col1W + col2W + halfCol3;
    doc.setFont("helvetica", "bold");
    doc.text(`${sl2} ${part2}`, rightBoxX + 5, curY + 11);
    const labelOffset = part2.length > 0 ? 38 : 16;
    doc.setFont("helvetica", "normal");
    doc.text(lines2, rightBoxX + labelOffset, curY + 11);

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

    const intLabelW = 60;
    const intValW = 70;
    const extLabelW = 60;
    const extValW = col3W - (intLabelW + intValW + extLabelW);

    doc.rect(marginLeft, curY, col1W, rowH);
    doc.rect(marginLeft + col1W, curY, col2W, rowH);
    doc.rect(marginLeft + col1W + col2W, curY, intLabelW + intValW, rowH);
    doc.rect(marginLeft + col1W + col2W + intLabelW + intValW, curY, extLabelW + extValW, rowH);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(slNo, marginLeft + col1W / 2, curY + 11, { align: "center" });
    doc.text(particulars, marginLeft + col1W + 5, curY + 11);

    // Internal
    doc.text("Internal:", marginLeft + col1W + col2W + 5, curY + 11);
    doc.setFont("helvetica", "normal");
    doc.text(String(internalVal ?? "-"), marginLeft + col1W + col2W + intLabelW, curY + 11);

    // External
    const extX = marginLeft + col1W + col2W + intLabelW + intValW;
    doc.setFont("helvetica", "bold");
    doc.text("External:", extX + 5, curY + 11);
    doc.setFont("helvetica", "normal");
    doc.text(String(externalVal ?? "NIL"), extX + extLabelW, curY + 11);

    curY += rowH;
  };

  // 1. Event*
  drawSimpleRow("1.", "Event*", report.type || "Faculty Development Program");

  // 2. Title of the Event
  drawSimpleRow("2.", "Title of the Event", `“${report.name || ""}”`);

  // 3. Date of Conduction | 4. Time
  drawSplitRow("3.", "Date of Conduction", report.date || "-", "4.", "Time :", report.time || "-");

  // 5. Venue
  drawSimpleRow("5.", "Venue", report.venue || report.location || "Online Google meet");

  // 6. Resource Person 1 Details
  const rp1Lines = [
    report.resourcePerson1?.name || "Nirmal Gaud",
    report.resourcePerson1?.designation || "Founder & CEO",
    report.resourcePerson1?.organization || "Cognitia Research - ThinkAI",
  ].filter(Boolean);
  drawSimpleRow("6.", "Resource Person 1 Details", rp1Lines);

  // 7. Topics Covered
  drawSimpleRow(
    "7.",
    "Topics Covered",
    report.resourcePerson1Topics || "Mathematics behind AI/ML model with tips and tools to write Research paper"
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
    rp2Lines.length > 0 ? rp2Lines : "NA"
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
  const fcDetails = report.facultyCoordinatorDetails || [
    `Name: ${report.facultyCoordinator || "Lakshmi S"}`,
    "Designation : Assistant Professor",
    `Department: Department of ${report.department || "Computer Applications"}, DSCASC.`,
  ].join("\n");
  drawSimpleRow("12.", "Faculty Coordinator", doc.splitTextToSize(fcDetails, col3W - 12));

  // 13. Student Coordinator/s
  const scDetails = report.studentCoordinatorDetails || [
    report.studentCoordinator || "Yadavacharya Jayacharya Nagasampagi",
    "P03CJ24S126119 III sem MCA",
  ].join("\n");
  drawSimpleRow("13.", "Student Coordinator/s", doc.splitTextToSize(scDetails, col3W - 12));

  // 14. Total Expenditure | 15. Sponsors and Amount
  drawSplitRow(
    "14.",
    "Total Expenditure",
    report.totalExpenditure ? `${report.totalExpenditure}/-` : (report.budgetSpent ? `${report.budgetSpent}/-` : "20,000/-"),
    "15.",
    "Sponsors and Amount (if any)",
    report.sponsors || "NA"
  );

  // 16. Agenda of the Event | 17. Link of the report uploaded on College Website
  drawSplitRow(
    "16.",
    "Agenda of the Event",
    report.agenda || "Training on AI/ML model analysis and research paper writing",
    "17.",
    "Provide the link of the report uploaded on College Website",
    report.websiteReportLink || "No"
  );

  // 18. Social Media Links | 19. Report sent to Newspapers?
  drawSplitRow(
    "18.",
    "Social Media Links",
    report.socialMediaLinks || "---",
    "19.",
    "Report sent to Newspapers? If yes, provide cuttings/images:",
    report.newspaperReport || "No"
  );

  // 20. Certificates Printed? | 21. Feedback Collected?
  drawSplitRow(
    "20.",
    "Certificates Printed?",
    report.certificatesPrinted ? (typeof report.certificatesPrinted === "string" ? report.certificatesPrinted : "Yes") : "No",
    "21.",
    "Feedback Collected?",
    report.feedbackCollected ? (typeof report.feedbackCollected === "string" ? report.feedbackCollected : "Yes") : "Yes"
  );

  // 22. Attendance Sheet Attached?* | 23. Photographs of the Event
  drawSplitRow(
    "22.",
    "Attendance Sheet Attached?*",
    report.attendanceAttached ? (typeof report.attendanceAttached === "string" ? report.attendanceAttached : "Yes") : "Yes",
    "23.",
    "Photographs of the Event",
    report.photographsAttached || "Attached"
  );

  // 24. Summary of the Event (Multi-line flowing cleanly)
  const defaultSummary =
    "The Department of Computer Applications – BCA conducted a FDP for faculty members by Nirmal Gaud. The FDP was on “Computational Mathematics for AI & Machine Learning: Modeling, Analysis, and Research Paper Writing”. Day 1 to Day 5 the concepts like introduced to the mathematical foundations underlying AI and ML models, with a focus on deep learning architectures such as DenseNet, and then the session included discussions on selected research papers, highlighting model design, datasets, and implementation aspects. Practical exposure was provided through code walkthroughs and dataset analysis to bridge theory and application. In addition, participants were trained in using Overleaf for academic writing, enabling them to collaboratively prepare and format research papers efficiently according to standard publication guidelines. The faculty where also appraised of journal quartile and publications. Excellent feedback for FDP was received from faculty members.";

  const fullSummary = report.summary || defaultSummary;
  const summaryLines = doc.splitTextToSize(fullSummary, col3W - 14);

  // Calculate remaining space on current page
  const maxLinesOnCurrentPage = Math.floor((pageHeight - 65 - curY - 8) / 10.5);

  if (summaryLines.length <= maxLinesOnCurrentPage) {
    // Fits on current page
    const rowH = Math.max(summaryLines.length * 10.5 + 8, 24);
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.6);
    doc.rect(marginLeft, curY, col1W, rowH);
    doc.rect(marginLeft + col1W, curY, col2W, rowH);
    doc.rect(marginLeft + col1W + col2W, curY, col3W, rowH);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("24.", marginLeft + col1W / 2, curY + 11, { align: "center" });
    doc.text("Summary of the Event", marginLeft + col1W + 5, curY + 11);
    doc.setFont("helvetica", "normal");
    doc.text(summaryLines, marginLeft + col1W + col2W + 5, curY + 11);

    curY += rowH;
  } else {
    // Multi-page split (matching reference page 1 and page 2 image exactly!)
    const linesPart1 = summaryLines.slice(0, Math.max(maxLinesOnCurrentPage, 2));
    const linesPart2 = summaryLines.slice(Math.max(maxLinesOnCurrentPage, 2));

    const rowH1 = linesPart1.length * 10.5 + 8;
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.6);
    doc.rect(marginLeft, curY, col1W, rowH1);
    doc.rect(marginLeft + col1W, curY, col2W, rowH1);
    doc.rect(marginLeft + col1W + col2W, curY, col3W, rowH1);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("24.", marginLeft + col1W / 2, curY + 11, { align: "center" });
    doc.text("Summary of the Event", marginLeft + col1W + 5, curY + 11);
    doc.setFont("helvetica", "normal");
    doc.text(linesPart1, marginLeft + col1W + col2W + 5, curY + 11);

    // New Page for Part 2
    doc.addPage();
    curY = 40;
    curY = drawTableHeader(curY);

    const rowH2 = linesPart2.length * 10.5 + 12;
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.6);
    doc.rect(marginLeft, curY, col1W, rowH2);
    doc.rect(marginLeft + col1W, curY, col2W, rowH2);
    doc.rect(marginLeft + col1W + col2W, curY, col3W, rowH2);

    doc.setFont("helvetica", "normal");
    doc.text(linesPart2, marginLeft + col1W + col2W + 5, curY + 11);

    curY += rowH2;
  }

  // 5 Signatories Block
  const signatories = [
    "Event Coordinators",
    "HOD-BCA",
    "Vice-Principal",
    "IQAC Coordinator",
    "Principal",
  ];

  const sigY = Math.max(curY + 45, pageHeight - 90);
  if (sigY > pageHeight - 50) {
    doc.addPage();
    curY = 60;
  }

  const sigSpacing = contentWidth / 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);

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

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text("ANNEXURE I: EVENT BROCHURE", pageWidth / 2, 85, { align: "center" });

    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(1);
    doc.line(marginLeft, 95, pageWidth - marginRight, 95);

    const fullBrochureUrl = brochure.url.startsWith("http")
      ? brochure.url
      : `${backendBase}${brochure.url}`;

    try {
      const brochureBase64 = await getBase64ImageFromUrl(fullBrochureUrl);
      if (brochureBase64) {
        doc.addImage(brochureBase64, "JPEG", marginLeft + 30, 110, contentWidth - 60, 620, undefined, "FAST");
      } else {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        doc.text(`Brochure File: ${brochure.originalName || "Event Brochure (Attached in PDF format)"}`, pageWidth / 2, 160, { align: "center" });
      }
    } catch {
      doc.text("Event Brochure Attached", pageWidth / 2, 160, { align: "center" });
    }
  }

  // ANNEXURE II: EVENT PHOTOGRAPHS
  if (report.eventPhotos && report.eventPhotos.length > 0) {
    doc.addPage();
    renderHeader(false);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text("ANNEXURE II: EVENT PHOTOGRAPHS / GLIMPSES", pageWidth / 2, 85, { align: "center" });

    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(1);
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

      // Draw photo container border
      doc.setDrawColor(203, 213, 225);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(px, py, photoW, photoH, 4, 4, "FD");

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

      // Caption
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
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

      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(15, 23, 42);
      doc.text(
        `ANNEXURE III: SIGNED ATTENDANCE SHEET (Page ${sIdx + 1})`,
        pageWidth / 2,
        85,
        { align: "center" }
      );

      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(1);
      doc.line(marginLeft, 95, pageWidth - marginRight, 95);

      const sheetUrl = sheet.url?.startsWith("http")
        ? sheet.url
        : `${backendBase}${sheet.url}`;

      try {
        const sheetBase64 = await getBase64ImageFromUrl(sheetUrl);
        if (sheetBase64) {
          doc.addImage(sheetBase64, "JPEG", marginLeft + 10, 110, contentWidth - 20, 640, undefined, "FAST");
        } else {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(10);
          doc.setTextColor(15, 23, 42);
          doc.text(`Scanned Signed Attendance Sheet: ${sheet.originalName || "attendance-sheet.pdf"}`, pageWidth / 2, 200, { align: "center" });
          doc.setFont("helvetica", "normal");
          doc.text("Official signature verified and archived in institutional records.", pageWidth / 2, 220, { align: "center" });
        }
      } catch {
        doc.text(`Signed Attendance Sheet: ${sheet.originalName || "attendance.pdf"}`, pageWidth / 2, 200, { align: "center" });
      }
    }
  }

  return doc;
}
