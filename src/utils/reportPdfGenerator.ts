import { jsPDF } from "jspdf";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { DSCASC_LOGO_PNG_BASE64, IIC_LOGO_PNG_BASE64 } from "./reportLogos";
import { signaturesConfig, getProcessedSignatureBase64 } from "./signatureLoader";

function base64ToUint8Array(base64: string): Uint8Array {
  const clean = base64.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");
  const binaryString = atob(clean);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function drawHeaderOnPdfPage(
  page: any,
  title: string,
  dscascLogoImg: any,
  iicLogoImg: any,
  fontBold: any,
  fontReg: any
) {
  const { width, height } = page.getSize();
  const headerHeight = 65;
  const topY = height;

  // Solid white background bar for header
  page.drawRectangle({
    x: 0,
    y: topY - headerHeight,
    width: width,
    height: headerHeight,
    color: rgb(1, 1, 1),
  });

  // DSCASC logo (Left)
  if (dscascLogoImg) {
    page.drawImage(dscascLogoImg, {
      x: 35,
      y: topY - 55,
      width: 45,
      height: 45,
    });
  }

  // IIC logo (Right)
  if (iicLogoImg) {
    page.drawImage(iicLogoImg, {
      x: width - 115,
      y: topY - 52,
      width: 75,
      height: 35,
    });
  }

  // Centered Header Titles
  const titleLine1 = "Dayananda Sagar College of Arts, Science, and Commerce";
  const titleLine2 = "Internal Quality Assurance Cell";

  const size1 = 10.5;
  const size2 = 9;
  const size3 = 9.5;

  const width1 = fontBold.widthOfTextAtSize(titleLine1, size1);
  const width2 = fontBold.widthOfTextAtSize(titleLine2, size2);

  let displayTitle = title;
  const maxTitleW = width - 240;
  while (displayTitle.length > 5 && fontBold.widthOfTextAtSize(displayTitle, size3) > maxTitleW) {
    displayTitle = displayTitle.slice(0, -4) + "...";
  }
  const width3 = fontBold.widthOfTextAtSize(displayTitle, size3);

  page.drawText(titleLine1, {
    x: (width - width1) / 2,
    y: topY - 20,
    size: size1,
    font: fontBold,
    color: rgb(0.06, 0.09, 0.16),
  });

  page.drawText(titleLine2, {
    x: (width - width2) / 2,
    y: topY - 34,
    size: size2,
    font: fontBold,
    color: rgb(0.12, 0.16, 0.23),
  });

  page.drawText(displayTitle, {
    x: (width - width3) / 2,
    y: topY - 50,
    size: size3,
    font: fontBold,
    color: rgb(0, 0, 0),
  });

  // Divider line
  page.drawLine({
    start: { x: 35, y: topY - 58 },
    end: { x: width - 35, y: topY - 58 },
    thickness: 0.8,
    color: rgb(0.8, 0.84, 0.88),
  });
}

async function addImageAnnexurePage(
  pdfDoc: PDFDocument,
  imgUrl: string,
  title: string,
  dscascLogoImg: any,
  iicLogoImg: any,
  fontBold: any,
  fontReg: any
) {
  try {
    const buffer = await fetchArrayBuffer(imgUrl);
    if (!buffer) return;

    let embeddedImg;
    const isPng = imgUrl.toLowerCase().includes(".png");
    if (isPng) {
      embeddedImg = await pdfDoc.embedPng(buffer);
    } else {
      try {
        embeddedImg = await pdfDoc.embedJpg(buffer);
      } catch {
        embeddedImg = await pdfDoc.embedPng(buffer);
      }
    }

    const page = pdfDoc.addPage([595.28, 841.89]);
    const { width, height } = page.getSize();

    drawHeaderOnPdfPage(page, title, dscascLogoImg, iicLogoImg, fontBold, fontReg);

    const topMargin = 75;
    const bottomMargin = 40;
    const sideMargin = 35;

    const maxW = width - sideMargin * 2;
    const maxH = height - topMargin - bottomMargin;

    const scaled = embeddedImg.scaleToFit(maxW, maxH);

    const imgX = (width - scaled.width) / 2;
    const imgY = bottomMargin + (maxH - scaled.height) / 2;

    page.drawImage(embeddedImg, {
      x: imgX,
      y: imgY,
      width: scaled.width,
      height: scaled.height,
    });
  } catch (err) {
    console.warn("Failed to add image annexure page:", err);
  }
}

async function addPdfAnnexurePages(
  finalPdfDoc: PDFDocument,
  pdfUrl: string,
  title: string,
  dscascLogoImg: any,
  iicLogoImg: any,
  fontBold: any,
  fontReg: any
) {
  try {
    const buffer = await fetchArrayBuffer(pdfUrl);
    if (!buffer) return;

    const sourcePdfDoc = await PDFDocument.load(buffer);
    const copiedPages = await finalPdfDoc.copyPages(
      sourcePdfDoc,
      sourcePdfDoc.getPageIndices()
    );

    for (let pIdx = 0; pIdx < copiedPages.length; pIdx++) {
      const p = copiedPages[pIdx];
      finalPdfDoc.addPage(p);

      const pageTitle = copiedPages.length > 1 ? `${title} (Page ${pIdx + 1})` : title;
      drawHeaderOnPdfPage(
        p,
        pageTitle,
        dscascLogoImg,
        iicLogoImg,
        fontBold,
        fontReg
      );
    }
  } catch (err) {
    console.warn(`Failed to merge PDF for ${title}:`, err);
  }
}

async function addPhotosAnnexurePage(
  pdfDoc: PDFDocument,
  photos: Array<{ url?: string; caption?: string }>,
  dscascLogoImg: any,
  iicLogoImg: any,
  fontBold: any,
  fontReg: any,
  backendBase: string
) {
  if (!photos || photos.length === 0) return;

  const page = pdfDoc.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();

  drawHeaderOnPdfPage(
    page,
    "ANNEXURE II: EVENT PHOTOGRAPHS / GLIMPSES",
    dscascLogoImg,
    iicLogoImg,
    fontBold,
    fontReg
  );

  const photoW = (width - 90) / 2;
  const photoH = 190;
  const startY = height - 90;

  for (let i = 0; i < Math.min(photos.length, 6); i++) {
    const photo = photos[i];
    const col = i % 2;
    const row = Math.floor(i / 2);

    const px = 35 + col * (photoW + 20);
    const py = startY - (row + 1) * (photoH + 30);

    page.drawRectangle({
      x: px,
      y: py,
      width: photoW,
      height: photoH,
      color: rgb(0.97, 0.98, 0.99),
      borderColor: rgb(0.8, 0.84, 0.88),
      borderWidth: 1,
    });

    const photoUrl = photo.url?.startsWith("http")
      ? photo.url
      : `${backendBase}${photo.url}`;

    try {
      const buffer = await fetchArrayBuffer(photoUrl);
      if (buffer) {
        let embeddedImg;
        if (photoUrl.toLowerCase().includes(".png")) {
          embeddedImg = await pdfDoc.embedPng(buffer);
        } else {
          try {
            embeddedImg = await pdfDoc.embedJpg(buffer);
          } catch {
            embeddedImg = await pdfDoc.embedPng(buffer);
          }
        }

        const maxIW = photoW - 10;
        const maxIH = photoH - 30;
        const scaled = embeddedImg.scaleToFit(maxIW, maxIH);

        const ix = px + (photoW - scaled.width) / 2;
        const iy = py + 24 + (maxIH - scaled.height) / 2;

        page.drawImage(embeddedImg, {
          x: ix,
          y: iy,
          width: scaled.width,
          height: scaled.height,
        });
      }
    } catch (err) {
      console.warn("Photo render error:", err);
    }

    const captionText = `Photo ${i + 1}: ${photo.caption || "Event Session"}`;
    const capSize = 8.5;
    let displayCap = captionText;
    while (displayCap.length > 5 && fontBold.widthOfTextAtSize(displayCap, capSize) > photoW - 8) {
      displayCap = displayCap.slice(0, -4) + "...";
    }
    const capW = fontBold.widthOfTextAtSize(displayCap, capSize);
    page.drawText(displayCap, {
      x: px + (photoW - capW) / 2,
      y: py + 8,
      size: capSize,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });
  }
}

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
  approvalStage?: string;
  status?: string;

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

// Fetch file as ArrayBuffer
async function fetchArrayBuffer(url: string): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch (err) {
    console.warn("Failed to fetch file buffer:", err);
    return null;
  }
}

export async function generateInstitutionalReportPdf(report: ReportData): Promise<{ save: (filename: string) => void }> {
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
    const headerTop = 28;

    // Left Logo: Authentic DSCASC Crest
    if (DSCASC_LOGO_PNG_BASE64) {
      try {
        doc.addImage(DSCASC_LOGO_PNG_BASE64, "PNG", marginLeft, headerTop, 54, 54);
      } catch (e) {
        console.warn("Logo add error:", e);
      }
    }

    // Right Logo: Authentic IIC Logo
    if (IIC_LOGO_PNG_BASE64) {
      try {
        doc.addImage(IIC_LOGO_PNG_BASE64, "PNG", pageWidth - marginRight - 98, headerTop + 4, 98, 42);
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
      const titleLines = doc.splitTextToSize(titleLine, contentWidth - 210);
      setFont("bold", 10.5);
      doc.text(titleLines, pageWidth / 2, headerTop + 40, { align: "center" });

      const afterTitleY = headerTop + 40 + titleLines.length * 12 + 8;

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

    return headerTop + 60;
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
    val1Width: number = 95
  ) => {
    const leftValW = val1Width;
    const rightPartW = 160;
    const rightValW = col3W - leftValW - rightPartW;

    setFont("normal", 9);
    const p1Lines = doc.splitTextToSize(part1, col2W - 8);
    const v1Lines = doc.splitTextToSize(val1 || "-", leftValW - 8);
    const p2Lines = doc.splitTextToSize(part2, rightPartW - 16);
    const v2Lines = doc.splitTextToSize(val2 || "-", rightValW - 6);

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
    95
  );

  // 16 & 17: Agenda of the Event | Provide link of report on College Website
  drawSubdividedRow(
    "16.",
    "Agenda of the Event",
    report.agenda || "Training on AI/ML model analyis and research paper writing",
    "17.",
    "Provide the link of the report uploaded on College Website",
    report.websiteReportLink || "No",
    95
  );

  // 18 & 19: Social Media Links | Report sent to Newspapers?
  drawSubdividedRow(
    "18.",
    "Social Media Links",
    report.socialMediaLinks || "---",
    "19.",
    "Report sent to Newspapers? If yes, provide cuttings/images:",
    report.newspaperReport || "No",
    95
  );

  // 20 & 21: Certificates Printed? | Feedback Collected?
  drawSubdividedRow(
    "20.",
    "Certificates Printed?",
    report.certificatesPrinted ? String(report.certificatesPrinted) : "No",
    "21.",
    "Feedback Collected?",
    report.feedbackCollected ? String(report.feedbackCollected) : "Yes",
    95
  );

  // 22 & 23: Attendance Sheet Attached?* | Photographs of the Event
  drawSubdividedRow(
    "22.",
    "Attendance Sheet Attached?*",
    report.attendanceAttached ? String(report.attendanceAttached) : "Yes",
    "23.",
    "Photographs of the Event",
    report.photographsAttached || "Attached",
    95
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

  // 5 Signatories Block with Signature Image Imprinting
  const signatories = signaturesConfig.signatories;

  const currentStageStr = report.approvalStage || "Event Coordinators";
  const getStageIndexNum = (st: string) => {
    if (st === "Approved") return 6;
    if (st === "Rejected") return -1;
    const idx = signatories.findIndex((s) => s.title === st);
    return idx >= 0 ? idx + 1 : 1;
  };

  const activeStageIdx = getStageIndexNum(currentStageStr);
  const sigY = curY + 60;
  const sigSpacing = contentWidth / 5;

  // Pre-load processed signature base64 images
  const loadedSignatures: Record<number, string> = {};
  for (const sig of signatories) {
    if (sig.signatureUrl) {
      try {
        const base64 = await getProcessedSignatureBase64(sig.signatureUrl);
        if (base64) {
          loadedSignatures[sig.stageNum] = base64;
        }
      } catch (err) {
        console.warn(`Failed loading signature for ${sig.title}:`, err);
      }
    }
  }

  signatories.forEach((sig, index) => {
    const x = marginLeft + index * sigSpacing + sigSpacing / 2;
    const isSigned = activeStageIdx > sig.stageNum || currentStageStr === "Approved";
    const sigImgBase64 = loadedSignatures[sig.stageNum];

    if (isSigned && sigImgBase64) {
      // Imprint real signature image onto document
      doc.addImage(sigImgBase64, "JPEG", x - 32, sigY - 42, 64, 30);

      // Draw subtle signature line
      doc.setDrawColor(30, 41, 59);
      doc.setLineWidth(0.6);
      doc.line(x - 38, sigY - 10, x + 38, sigY - 10);
    } else {
      // Clean signature line for unsigned / pending stage
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.5);
      doc.line(x - 38, sigY - 10, x + 38, sigY - 10);
    }

    setFont("bold", 8.5);
    doc.text(sig.title, x, sigY + 8, { align: "center" });
  });

  // ================= UNIFIED MASTER PDF GENERATION VIA PDF-LIB =================
  const backendBase = "http://localhost:5000";

  const basePdfBytes = doc.output("arraybuffer");
  const finalPdfDoc = await PDFDocument.load(basePdfBytes);

  // Embed fonts and logos for institutional headers
  const fontBold = await finalPdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontReg = await finalPdfDoc.embedFont(StandardFonts.Helvetica);

  let dscascLogoImg: any = null;
  let iicLogoImg: any = null;

  try {
    const dscascBytes = base64ToUint8Array(DSCASC_LOGO_PNG_BASE64);
    dscascLogoImg = await finalPdfDoc.embedPng(dscascBytes);
  } catch (err) {
    console.warn("Failed to embed DSCASC logo in pdf-lib:", err);
  }

  try {
    const iicBytes = base64ToUint8Array(IIC_LOGO_PNG_BASE64);
    iicLogoImg = await finalPdfDoc.embedPng(iicBytes);
  } catch (err) {
    console.warn("Failed to embed IIC logo in pdf-lib:", err);
  }

  // 1. ANNEXURE I: EVENT BROCHURE
  const brochure = report.attachments?.find(
    (att) => att.label === "brochure" && !att.isDeleted
  );

  if (brochure?.url) {
    const fullBrochureUrl = brochure.url.startsWith("http")
      ? brochure.url
      : `${backendBase}${brochure.url}`;

    const isPdf =
      brochure.url.toLowerCase().endsWith(".pdf") ||
      brochure.originalName?.toLowerCase().endsWith(".pdf");

    if (isPdf) {
      await addPdfAnnexurePages(
        finalPdfDoc,
        fullBrochureUrl,
        "ANNEXURE I: EVENT BROCHURE",
        dscascLogoImg,
        iicLogoImg,
        fontBold,
        fontReg
      );
    } else {
      await addImageAnnexurePage(
        finalPdfDoc,
        fullBrochureUrl,
        "ANNEXURE I: EVENT BROCHURE",
        dscascLogoImg,
        iicLogoImg,
        fontBold,
        fontReg
      );
    }
  }

  // 2. ANNEXURE II: EVENT PHOTOGRAPHS
  if (report.eventPhotos && report.eventPhotos.length > 0) {
    await addPhotosAnnexurePage(
      finalPdfDoc,
      report.eventPhotos,
      dscascLogoImg,
      iicLogoImg,
      fontBold,
      fontReg,
      backendBase
    );
  }

  // 3. ANNEXURE III: SIGNED ATTENDANCE SHEETS
  if (report.signedAttendanceSheets && report.signedAttendanceSheets.length > 0) {
    for (let sIdx = 0; sIdx < report.signedAttendanceSheets.length; sIdx++) {
      const sheet = report.signedAttendanceSheets[sIdx];
      if (!sheet.url) continue;

      const sheetUrl = sheet.url.startsWith("http")
        ? sheet.url
        : `${backendBase}${sheet.url}`;

      const isPdf =
        sheet.url.toLowerCase().endsWith(".pdf") ||
        sheet.originalName?.toLowerCase().endsWith(".pdf") ||
        sheet.fileName?.toLowerCase().endsWith(".pdf");

      const title =
        report.signedAttendanceSheets.length > 1
          ? `ANNEXURE III: SIGNED ATTENDANCE SHEET (Sheet ${sIdx + 1})`
          : `ANNEXURE III: SIGNED ATTENDANCE SHEET`;

      if (isPdf) {
        await addPdfAnnexurePages(
          finalPdfDoc,
          sheetUrl,
          title,
          dscascLogoImg,
          iicLogoImg,
          fontBold,
          fontReg
        );
      } else {
        await addImageAnnexurePage(
          finalPdfDoc,
          sheetUrl,
          title,
          dscascLogoImg,
          iicLogoImg,
          fontBold,
          fontReg
        );
      }
    }
  }

  // 4. ANNEXURE IV: MISCELLANEOUS ATTACHMENTS
  const miscAttachments = (report.attachments || []).filter(
    (att) => att.label !== "brochure" && !att.isDeleted && att.url
  );

  if (miscAttachments.length > 0) {
    for (let mIdx = 0; mIdx < miscAttachments.length; mIdx++) {
      const att = miscAttachments[mIdx];
      if (!att.url) continue;

      const attUrl = att.url.startsWith("http")
        ? att.url
        : `${backendBase}${att.url}`;

      const isPdf =
        att.url.toLowerCase().endsWith(".pdf") ||
        att.originalName?.toLowerCase().endsWith(".pdf") ||
        att.fileName?.toLowerCase().endsWith(".pdf");

      const fileTitle = att.originalName || att.fileName || `File ${mIdx + 1}`;
      const title = `ANNEXURE IV: MISCELLANEOUS ATTACHMENT (${fileTitle})`;

      if (isPdf) {
        await addPdfAnnexurePages(
          finalPdfDoc,
          attUrl,
          title,
          dscascLogoImg,
          iicLogoImg,
          fontBold,
          fontReg
        );
      } else {
        await addImageAnnexurePage(
          finalPdfDoc,
          attUrl,
          title,
          dscascLogoImg,
          iicLogoImg,
          fontBold,
          fontReg
        );
      }
    }
  }

  const finalMergedBytes = await finalPdfDoc.save();

  return {
    save: (filename: string) => {
      const blob = new Blob([finalMergedBytes], { type: "application/pdf" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    },
    getBlobUrl: () => {
      const blob = new Blob([finalMergedBytes], { type: "application/pdf" });
      return URL.createObjectURL(blob);
    },
    getBlob: () => {
      return new Blob([finalMergedBytes], { type: "application/pdf" });
    },
  };
}
