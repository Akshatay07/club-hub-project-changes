import { jsPDF } from "jspdf";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { DSCASC_LOGO_PNG_BASE64, IIC_LOGO_PNG_BASE64 } from "./reportLogos";
import { signaturesConfig, getProcessedSignatureBase64, getStoredGlobalSignature } from "./signatureLoader";

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
  unitName?: string;
  clubName?: string;
  alignedSDG?: string;
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
    specialization?: string;
    mobile?: string;
    email?: string;
  };
  resourcePerson1Topics?: string;

  resourcePerson2?: {
    name?: string;
    designation?: string;
    organization?: string;
    specialization?: string;
    mobile?: string;
    email?: string;
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
  stageSignatures?: Record<string, string> | Map<string, string>;
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
        const dataUrl = canvas.toDataURL("image/jpeg");
        resolve(dataUrl);
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

export async function generateInstitutionalReportPdf(report: ReportData): Promise<{
  save: (filename: string) => void;
  getBlobUrl: () => string;
  getBlob: () => Blob;
}> {
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

  let curY = 32;

  const setFont = (style: "normal" | "bold" | "italic" = "normal", size: number = 9) => {
    doc.setFont("times", style);
    doc.setFontSize(size);
    doc.setTextColor(0, 0, 0);
  };

  // Render header with outer rectangle box and metadata
  const renderHeader = (isFirstPage: boolean = true) => {
    const headerTop = 26;
    const headerHeight = 64;

    // Outer border for header box
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.8);
    doc.rect(marginLeft, headerTop, contentWidth, headerHeight);

    // Left Logo: DSCASC Crest
    if (DSCASC_LOGO_PNG_BASE64) {
      try {
        doc.addImage(DSCASC_LOGO_PNG_BASE64, "PNG", marginLeft + 8, headerTop + 7, 50, 50);
      } catch (e) {
        console.warn("Logo add error:", e);
      }
    }

    // Right Logo: Authentic IIC Logo
    if (IIC_LOGO_PNG_BASE64) {
      try {
        doc.addImage(IIC_LOGO_PNG_BASE64, "PNG", pageWidth - marginRight - 88, headerTop + 10, 80, 42);
      } catch (e) {
        console.warn("IIC Logo add error:", e);
      }
    }

    // Centered Title Text
    setFont("bold", 12);
    doc.text(
      "Dayananda Sagar College of Arts, Science, and Commerce",
      pageWidth / 2,
      headerTop + 16,
      { align: "center" }
    );

    setFont("bold", 10.5);
    doc.text("Internal Quality Assurance Cell", pageWidth / 2, headerTop + 30, {
      align: "center",
    });

    const unitStr = `Unit Name: ${report.unitName || report.clubName || "__________________________"}`;
    setFont("bold", 9.5);
    doc.text(unitStr, pageWidth / 2, headerTop + 46, { align: "center" });

    if (isFirstPage) {
      const subY = headerTop + headerHeight + 14;

      const deptDisplay = report.department && report.department.includes('/')
        ? report.department
        : `MCA / MBA / M. Com / Bcom / BBA / BCA / B.Sc.${report.department ? ` (${report.department})` : ""}`;
      doc.text(
        `Department*: ${deptDisplay}`,
        marginLeft,
        subY
      );
      doc.text(
        `Date of Report: ${report.reportDate || report.date || ""}`,
        pageWidth - marginRight,
        subY,
        { align: "right" }
      );

      return subY + 8;
    }

    return headerTop + headerHeight + 12;
  };

  curY = renderHeader(true);

  // Column definitions
  const col1W = 28; // Sl. No.
  const col2W = 112; // Particulars
  const col3W = contentWidth - col1W - col2W; // 379.28 pt

  const drawTableHeader = (y: number) => {
    const h = 22;
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.8);

    doc.rect(marginLeft, y, col1W, h);
    doc.rect(marginLeft + col1W, y, col2W, h);
    doc.rect(marginLeft + col1W + col2W, y, col3W, h);

    setFont("bold", 9);
    doc.text("Sl. No.", marginLeft + col1W / 2, y + 14, { align: "center" });
    doc.text("Particulars", marginLeft + col1W + 5, y + 14);
    doc.text("Event related Details", marginLeft + col1W + col2W + 5, y + 14);

    return y + h;
  };

  curY = drawTableHeader(curY);

  const checkPageBreak = (neededHeight: number) => {
    if (curY + neededHeight > pageHeight - 65) {
      doc.addPage();
      curY = renderHeader(false);
      curY = drawTableHeader(curY);
    }
  };

  // Row Renderer Helpers
  const drawSimpleRow = (
    slNo: string,
    particulars: string,
    details: string | string[],
    isBoldDetails: boolean = false
  ) => {
    setFont("normal", 9);
    const linesDetails = Array.isArray(details)
      ? details
      : doc.splitTextToSize(details || "-", col3W - 10);
    const particularsLines = doc.splitTextToSize(particulars, col2W - 8);

    const rowH = Math.max(Math.max(linesDetails.length, particularsLines.length) * 11 + 8, 18);
    checkPageBreak(rowH);

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.6);

    doc.rect(marginLeft, curY, col1W, rowH);
    doc.rect(marginLeft + col1W, curY, col2W, rowH);
    doc.rect(marginLeft + col1W + col2W, curY, col3W, rowH);

    setFont("bold", 9);
    doc.text(slNo, marginLeft + col1W / 2, curY + 12, { align: "center" });
    doc.text(particularsLines, marginLeft + col1W + 4, curY + 12);

    setFont(isBoldDetails ? "bold" : "normal", 9);
    doc.text(linesDetails, marginLeft + col1W + col2W + 5, curY + 12);

    curY += rowH;
  };

  // Row 2: Title of the Event + Aligned SDG Goal(s) Box
  const drawTitleAndSDGRow = (titleVal: string, sdgVal: string) => {
    const leftTitleW = 230;
    const sdgBoxW = col3W - leftTitleW;

    setFont("bold", 9);
    const titleLines = doc.splitTextToSize(titleVal || "", leftTitleW - 10);
    const sdgLines = doc.splitTextToSize(sdgVal || "", sdgBoxW - 65);
    const rowH = Math.max(Math.max(titleLines.length, sdgLines.length + 1) * 11 + 10, 28);

    checkPageBreak(rowH);

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.6);

    doc.rect(marginLeft, curY, col1W, rowH);
    doc.rect(marginLeft + col1W, curY, col2W, rowH);
    doc.rect(marginLeft + col1W + col2W, curY, col3W, rowH);

    const sdgX = marginLeft + col1W + col2W + leftTitleW;
    doc.rect(sdgX, curY, sdgBoxW, rowH);

    setFont("bold", 9);
    doc.text("2.", marginLeft + col1W / 2, curY + 12, { align: "center" });
    doc.text("Title of the Event", marginLeft + col1W + 4, curY + 12);

    doc.text(titleLines, marginLeft + col1W + col2W + 5, curY + 12);

    setFont("bold", 8.5);
    doc.text("Aligned SDG", sdgX + 4, curY + 10);
    doc.text("Goal(s)", sdgX + 4, curY + 20);

    setFont("normal", 8.5);
    doc.text(sdgLines.length > 0 ? sdgLines : "-", sdgX + 60, curY + 12);

    curY += rowH;
  };

  // Row 3 & 4: Date of Conduction + 4. Time
  const drawDateAndTimeRow = (
    sl1: string,
    part1: string,
    dateVal: string,
    sl2: string,
    part2: string,
    timeVal: string
  ) => {
    const leftW = 160;
    const midLabelW = 55;
    const rightW = col3W - leftW - midLabelW;

    setFont("normal", 9);
    const dateLines = doc.splitTextToSize(dateVal || "-", leftW - 10);
    const timeLines = doc.splitTextToSize(timeVal || "-", rightW - 8);
    const rowH = Math.max(Math.max(dateLines.length, timeLines.length) * 11 + 8, 18);

    checkPageBreak(rowH);

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.6);

    doc.rect(marginLeft, curY, col1W, rowH);
    doc.rect(marginLeft + col1W, curY, col2W, rowH);
    doc.rect(marginLeft + col1W + col2W, curY, leftW, rowH);
    doc.rect(marginLeft + col1W + col2W + leftW, curY, midLabelW, rowH);
    doc.rect(marginLeft + col1W + col2W + leftW + midLabelW, curY, rightW, rowH);

    setFont("bold", 9);
    doc.text(sl1, marginLeft + col1W / 2, curY + 12, { align: "center" });
    doc.text(part1, marginLeft + col1W + 4, curY + 12);

    setFont("normal", 9);
    doc.text(dateLines, marginLeft + col1W + col2W + 5, curY + 12);

    const midX = marginLeft + col1W + col2W + leftW;
    setFont("bold", 9);
    doc.text(sl2, midX + 4, curY + 12);
    doc.text(part2, midX + 18, curY + 12);

    const rightX = midX + midLabelW;
    setFont("normal", 9);
    doc.text(timeLines, rightX + 5, curY + 12);

    curY += rowH;
  };

  // Resource Person Grid Row (3 rows x 2 cols)
  const drawResourcePersonRow = (slNo: string, partLabel: string, rpObj: any) => {
    const gridRowH = 16;
    const rowH = gridRowH * 3;

    checkPageBreak(rowH);

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.6);

    doc.rect(marginLeft, curY, col1W, rowH);
    doc.rect(marginLeft + col1W, curY, col2W, rowH);
    doc.rect(marginLeft + col1W + col2W, curY, col3W, rowH);

    setFont("bold", 9);
    doc.text(slNo, marginLeft + col1W / 2, curY + 12, { align: "center" });
    const pLines = doc.splitTextToSize(partLabel, col2W - 8);
    doc.text(pLines, marginLeft + col1W + 4, curY + 12);

    const c1LabelW = 60;
    const c1ValW = 115;
    const c2LabelW = 68;
    const c2ValW = col3W - (c1LabelW + c1ValW + c2LabelW);

    const baseX = marginLeft + col1W + col2W;

    doc.rect(baseX, curY, c1LabelW, gridRowH);
    doc.rect(baseX + c1LabelW, curY, c1ValW, gridRowH);
    doc.rect(baseX + c1LabelW + c1ValW, curY, c2LabelW, gridRowH);
    doc.rect(baseX + c1LabelW + c1ValW + c2LabelW, curY, c2ValW, gridRowH);

    doc.rect(baseX, curY + gridRowH, c1LabelW, gridRowH);
    doc.rect(baseX + c1LabelW, curY + gridRowH, c1ValW, gridRowH);
    doc.rect(baseX + c1LabelW + c1ValW, curY + gridRowH, c2LabelW, gridRowH);
    doc.rect(baseX + c1LabelW + c1ValW + c2LabelW, curY + gridRowH, c2ValW, gridRowH);

    doc.rect(baseX, curY + gridRowH * 2, c1LabelW, gridRowH);
    doc.rect(baseX + c1LabelW, curY + gridRowH * 2, c1ValW, gridRowH);
    doc.rect(baseX + c1LabelW + c1ValW, curY + gridRowH * 2, c2LabelW, gridRowH);
    doc.rect(baseX + c1LabelW + c1ValW + c2LabelW, curY + gridRowH * 2, c2ValW, gridRowH);

    setFont("bold", 8.5);
    doc.text("Name", baseX + 4, curY + 11);
    setFont("normal", 8.5);
    doc.text(rpObj?.name || "-", baseX + c1LabelW + 4, curY + 11, { maxWidth: c1ValW - 6 });

    setFont("bold", 8.5);
    doc.text("Organization", baseX + c1LabelW + c1ValW + 4, curY + 11);
    setFont("normal", 8.5);
    doc.text(rpObj?.organization || "-", baseX + c1LabelW + c1ValW + c2LabelW + 4, curY + 11, { maxWidth: c2ValW - 6 });

    const r2Y = curY + gridRowH;
    setFont("bold", 8.5);
    doc.text("Designation", baseX + 4, r2Y + 11);
    setFont("normal", 8.5);
    doc.text(rpObj?.designation || "-", baseX + c1LabelW + 4, r2Y + 11, { maxWidth: c1ValW - 6 });

    setFont("bold", 8.5);
    doc.text("Specialization", baseX + c1LabelW + c1ValW + 4, r2Y + 11);
    setFont("normal", 8.5);
    doc.text(rpObj?.specialization || "-", baseX + c1LabelW + c1ValW + c2LabelW + 4, r2Y + 11, { maxWidth: c2ValW - 6 });

    const r3Y = curY + gridRowH * 2;
    setFont("bold", 8.5);
    doc.text("Mobile No.", baseX + 4, r3Y + 11);
    setFont("normal", 8.5);
    doc.text(rpObj?.mobile || "-", baseX + c1LabelW + 4, r3Y + 11, { maxWidth: c1ValW - 6 });

    setFont("bold", 8.5);
    doc.text("Email ID", baseX + c1LabelW + c1ValW + 4, r3Y + 11);
    setFont("normal", 8.5);
    doc.text(rpObj?.email || "-", baseX + c1LabelW + c1ValW + c2LabelW + 4, r3Y + 11, { maxWidth: c2ValW - 6 });

    curY += rowH;
  };

  // Row for Participants: Internal / External
  const drawParticipantsRow = (
    slNo: string,
    particulars: string,
    internalVal: string | number,
    externalVal: string | number
  ) => {
    setFont("bold", 9);
    const pLines = doc.splitTextToSize(particulars, col2W - 8);
    const rowH = Math.max(pLines.length * 11 + 6, 26);
    checkPageBreak(rowH);

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.6);

    const intLabelW = 60;
    const intValW = 60;
    const extLabelW = 60;
    const extValW = col3W - (intLabelW + intValW + extLabelW);

    doc.rect(marginLeft, curY, col1W, rowH);
    doc.rect(marginLeft + col1W, curY, col2W, rowH);
    doc.rect(marginLeft + col1W + col2W, curY, intLabelW, rowH);
    doc.rect(marginLeft + col1W + col2W + intLabelW, curY, intValW, rowH);
    doc.rect(marginLeft + col1W + col2W + intLabelW + intValW, curY, extLabelW, rowH);
    doc.rect(marginLeft + col1W + col2W + intLabelW + intValW + extLabelW, curY, extValW, rowH);

    setFont("bold", 9);
    doc.text(slNo, marginLeft + col1W / 2, curY + 12, { align: "center" });
    doc.text(pLines, marginLeft + col1W + 4, curY + 11);

    const midY = curY + rowH / 2 + 3;
    doc.text("Internal:", marginLeft + col1W + col2W + 4, midY);
    setFont("normal", 9);
    doc.text(String(internalVal ?? "-"), marginLeft + col1W + col2W + intLabelW + 5, midY);

    const extX = marginLeft + col1W + col2W + intLabelW + intValW;
    setFont("bold", 9);
    doc.text("External:", extX + 4, midY);
    setFont("normal", 9);
    doc.text(String(externalVal ?? "NIL"), extX + extLabelW + 5, midY);

    curY += rowH;
  };

  // Coordinator Grid Row (Full Name, Department, Designation)
  const drawCoordinatorRow = (slNo: string, partLabel: string, rawVal: string, detailsObj?: any) => {
    const subH = 16;
    const rowH = subH * 3;

    checkPageBreak(rowH);

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.6);

    doc.rect(marginLeft, curY, col1W, rowH);
    doc.rect(marginLeft + col1W, curY, col2W, rowH);
    doc.rect(marginLeft + col1W + col2W, curY, col3W, rowH);

    setFont("bold", 9);
    doc.text(slNo, marginLeft + col1W / 2, curY + 12, { align: "center" });
    const pLines = doc.splitTextToSize(partLabel, col2W - 8);
    doc.text(pLines, marginLeft + col1W + 4, curY + 12);

    const baseX = marginLeft + col1W + col2W;
    const lblW = 65;
    const valW = col3W - lblW;

    doc.rect(baseX, curY, lblW, subH);
    doc.rect(baseX + lblW, curY, valW, subH);

    doc.rect(baseX, curY + subH, lblW, subH);
    doc.rect(baseX + lblW, curY + subH, valW, subH);

    doc.rect(baseX, curY + subH * 2, lblW, subH);
    doc.rect(baseX + lblW, curY + subH * 2, valW, subH);

    let nameVal = detailsObj?.name || "";
    let deptVal = detailsObj?.department || "";
    let desigVal = detailsObj?.designation || "";

    if (!nameVal && !deptVal && !desigVal) {
      const rawStr = rawVal || "";
      const lines = rawStr.split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (/^name\s*:/i.test(trimmed)) {
          nameVal = trimmed.replace(/^name\s*:/i, "").trim();
        } else if (/^department\s*:/i.test(trimmed) || /^dept\s*:/i.test(trimmed)) {
          deptVal = trimmed.replace(/^department\s*:/i, "").replace(/^dept\s*:/i, "").trim();
        } else if (/^designation\s*:/i.test(trimmed) || /^desig\s*:/i.test(trimmed)) {
          desigVal = trimmed.replace(/^designation\s*:/i, "").replace(/^desig\s*:/i, "").trim();
        } else if (!nameVal) {
          nameVal = trimmed;
        } else if (!deptVal) {
          deptVal = trimmed;
        } else if (!desigVal) {
          desigVal = trimmed;
        }
      }
    }

    setFont("bold", 8.5);
    doc.text("Full Name", baseX + 4, curY + 11);
    setFont("normal", 8.5);
    doc.text(nameVal || "-", baseX + lblW + 4, curY + 11, { maxWidth: valW - 6 });

    setFont("bold", 8.5);
    doc.text("Department", baseX + 4, curY + subH + 11);
    setFont("normal", 8.5);
    doc.text(deptVal || "-", baseX + lblW + 4, curY + subH + 11, { maxWidth: valW - 6 });

    setFont("bold", 8.5);
    doc.text("Designation", baseX + 4, curY + subH * 2 + 11);
    setFont("normal", 8.5);
    doc.text(desigVal || "-", baseX + lblW + 4, curY + subH * 2 + 11, { maxWidth: valW - 6 });

    curY += rowH;
  };

  // Subdivided row helper (e.g. 14 & 15, 16 & 17, 18 & 19, 20 & 21, 22 & 23)
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
    const rightPartW = 155;
    const rightValW = col3W - leftValW - rightPartW;

    setFont("normal", 9);
    const p1Lines = doc.splitTextToSize(part1, col2W - 8);
    const v1Lines = doc.splitTextToSize(val1 || "-", leftValW - 8);
    const p2Lines = doc.splitTextToSize(part2, rightPartW - 16);
    const v2Lines = doc.splitTextToSize(val2 || "-", rightValW - 6);

    const maxLines = Math.max(p1Lines.length, v1Lines.length, p2Lines.length, v2Lines.length);
    const rowH = Math.max(maxLines * 11 + 8, 18);

    checkPageBreak(rowH);

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.6);

    doc.rect(marginLeft, curY, col1W, rowH);
    doc.rect(marginLeft + col1W, curY, col2W, rowH);
    doc.rect(marginLeft + col1W + col2W, curY, leftValW, rowH);
    doc.rect(marginLeft + col1W + col2W + leftValW, curY, rightPartW, rowH);
    doc.rect(marginLeft + col1W + col2W + leftValW + rightPartW, curY, rightValW, rowH);

    // Left
    setFont("bold", 9);
    doc.text(sl1, marginLeft + col1W / 2, curY + 12, { align: "center" });
    doc.text(p1Lines, marginLeft + col1W + 4, curY + 12);
    setFont("normal", 9);
    doc.text(v1Lines, marginLeft + col1W + col2W + 5, curY + 12);

    // Right
    const midX = marginLeft + col1W + col2W + leftValW;
    setFont("bold", 9);
    doc.text(sl2, midX + 4, curY + 12);
    doc.text(p2Lines, midX + 18, curY + 12);

    const rightX = midX + rightPartW;
    setFont("normal", 9);
    doc.text(v2Lines, rightX + 5, curY + 12);

    curY += rowH;
  };

  // 1. Event*
  drawSimpleRow("1.", "Event*", report.type || "Faculty Development Program", true);

  // 2. Title of the Event
  drawTitleAndSDGRow(`“${report.name || ""}”`, report.alignedSDG || "");

  // 3 & 4: Date of Conduction | 4. Time
  drawDateAndTimeRow(
    "3.",
    "Date of Conduction",
    report.date || "",
    "4.",
    "Time",
    report.time || ""
  );

  // 5. Venue
  drawSimpleRow("5.", "Venue", report.venue || report.location || "");

  // 6. Resource Person 1 Details (Profile to be enclosed)
  drawResourcePersonRow(
    "6.",
    "Resource Person 1 Details\n(Profile to be enclosed)",
    report.resourcePerson1 || {
      name: "Nirmal Gaud",
      designation: "Founder & CEO",
      organization: "Cognitia Research - ThinkAI",
      specialization: "AI & ML Modeling",
      mobile: "-",
      email: "-",
    }
  );

  // 7. Topics Covered
  drawSimpleRow(
    "7.",
    "Topics Covered",
    report.resourcePerson1Topics ||
      "Mathematics behind AI/ML model with tips and tools to write Research paper"
  );

  // 8. Resource Person 2 Details (Profile to be enclosed)
  drawResourcePersonRow(
    "8.",
    "Resource Person 2 Details\n(Profile to be enclosed)",
    report.resourcePerson2 || {
      name: "NA",
      designation: "NA",
      organization: "NA",
      specialization: "NA",
      mobile: "NA",
      email: "NA",
    }
  );

  // 9. Topics Covered
  drawSimpleRow("9.", "Topics Covered", report.resourcePerson2Topics || "NA");

  // 10. No. Faculty Participants
  drawParticipantsRow(
    "10.",
    "No. Faculty Participants\n(Enclose a copy of names with signatures)",
    report.facultyParticipants?.internal ?? "22",
    report.facultyParticipants?.external ?? "NIL"
  );

  // 11. No. Student Participants
  drawParticipantsRow(
    "11.",
    "No. Student Participants\n(Enclose a copy of names with signatures)",
    report.studentParticipants?.internal ?? "---",
    report.studentParticipants?.external ?? "NIL"
  );

  // 12. Faculty Coordinator/s
  drawCoordinatorRow(
    "12.",
    "Faculty Coordinator/s",
    report.facultyCoordinatorDetails || report.facultyCoordinator || "Lakshmi S"
  );

  // 13. Student Coordinator/s
  drawCoordinatorRow(
    "13.",
    "Student Coordinator/s",
    report.studentCoordinatorDetails || report.studentCoordinator || "Yadavacharya Jayacharya Nagasampagi"
  );

  // 14 & 15: Total Expenditure | Sponsors and Amount (if any)
  drawSubdividedRow(
    "14.",
    "Total Expenditure\n(Details to be enclosed)",
    report.totalExpenditure ? `${report.totalExpenditure}` : "-",
    "15.",
    "Sponsors and Amount (if any)",
    report.sponsors || "NA",
    95
  );

  // 16 & 17: Agenda of the Event | Provide link of report on College Website
  drawSubdividedRow(
    "16.",
    "Agenda of the Event\n(Attach a copy)",
    report.agenda || "-",
    "17.",
    "Provide the link of the report uploaded on College Website",
    report.websiteReportLink || "No",
    95
  );

  // 18 & 19: Social Media Links | Report sent to Newspapers?
  drawSubdividedRow(
    "18.",
    "Social Media Links\n(Provide the links of the report uploaded on Social Media)",
    report.socialMediaLinks || "---",
    "19.",
    "Report sent to Newspapers? If yes, provide cuttings/images:",
    report.newspaperReport || "No",
    95
  );

  // 20 & 21: Certificates Printed? | Feedback Collected?
  drawSubdividedRow(
    "20.",
    "Certificates Printed?\n(Attach a copy**)",
    report.certificatesPrinted ? String(report.certificatesPrinted) : "No",
    "21.",
    "Feedback Collected?\n(Attach a copy**)",
    report.feedbackCollected ? String(report.feedbackCollected) : "Yes",
    95
  );

  // 22 & 23: Attendance Sheet Attached?* | Photographs of the Event
  drawSubdividedRow(
    "22.",
    "Attendance Sheet Attached?*",
    report.attendanceAttached ? String(report.attendanceAttached) : "Yes",
    "23.",
    "Photographs of the Event\n(About 5 relevant, clear, and appropriate photos with precise caption. The jpg files need to be attached)",
    report.photographsAttached ? String(report.photographsAttached) : "Attached",
    95
  );

  // 24. Summary of the Event
  const defaultSummaryPrompt =
    "This text needs to be uploaded on our website/social media or sent to print media with the photos you have attached. You need to keep this thing in mind while preparing the text and selecting the photographs.";

  const userSummary = report.summary || "";
  const fullSummaryText = userSummary
    ? `${userSummary}\n\n[Note: ${defaultSummaryPrompt}]`
    : defaultSummaryPrompt;

  setFont("normal", 9);
  const summaryLines = doc.splitTextToSize(fullSummaryText, col3W - 10);

  const remainingSpace = pageHeight - 45 - curY;
  const linesThatFit = Math.max(Math.floor((remainingSpace - 12) / 11), 3);

  const linesPage1 = summaryLines.slice(0, linesThatFit);
  const linesPage2 = summaryLines.slice(linesThatFit);

  const rowH1 = linesPage1.length * 11 + 8;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.6);
  doc.rect(marginLeft, curY, col1W, rowH1);
  doc.rect(marginLeft + col1W, curY, col2W, rowH1);
  doc.rect(marginLeft + col1W + col2W, curY, col3W, rowH1);

  setFont("bold", 9);
  doc.text("24.", marginLeft + col1W / 2, curY + 12, { align: "center" });
  const sumLabelLines = doc.splitTextToSize("Summary of the Event\n(Around 100 words)", col2W - 8);
  doc.text(sumLabelLines, marginLeft + col1W + 4, curY + 12);

  setFont("normal", 9);
  doc.text(linesPage1, marginLeft + col1W + col2W + 5, curY + 12);
  curY += rowH1;

  // Render Footer Note Block below Table
  setFont("bold", 8);
  doc.text("Note:", marginLeft, curY + 8);
  setFont("normal", 7.5);
  const noteText =
    "* Seminar / Webinar / Workshop / Symposium / Conference / Cultural Fest / Quiz / Sports / Literature Fest, etc. ** Format Copy need to be attached and hard copy need to be filed, # Original sheet need to be filed and scanned copy should be attached. *Department, please select the department";
  const noteLines = doc.splitTextToSize(noteText, contentWidth - 30);
  doc.text(noteLines, marginLeft + 26, curY + 8);

  const noteY = curY + 8 + noteLines.length * 9.5 + 2;
  setFont("bold", 8);
  doc.text("PS:", marginLeft, noteY);
  setFont("normal", 7.5);
  doc.text("❖   Whichever column is not applicable, write as NA.", marginLeft + 26, noteY);
  doc.text("❖   If the nothing is done / gained / spent, write as No/Nil.", marginLeft + 26, noteY + 9.5);

  curY = noteY + 22;

  // PAGE 2 (CONTINUATION IF NEEDED & 5 SIGNATORIES)
  doc.addPage();
  curY = 36;
  curY = drawTableHeader(curY);

  if (linesPage2.length > 0) {
    const rowH2 = Math.max(linesPage2.length * 11 + 14, 30);
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.6);
    doc.rect(marginLeft, curY, col1W, rowH2);
    doc.rect(marginLeft + col1W, curY, col2W, rowH2);
    doc.rect(marginLeft + col1W + col2W, curY, col3W, rowH2);

    setFont("normal", 9);
    doc.text(linesPage2, marginLeft + col1W + col2W + 5, curY + 12);
    curY += rowH2;
  }

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
  const sigY = curY + 55;
  const sigSpacing = contentWidth / 5;

  const loadedSignatures: Record<number, string> = {};
  const stageSigs = report.stageSignatures;

  const norm = (s: string) => (s ? s.toLowerCase().replace(/[^a-z0-9]/g, "") : "");

  const getUploadedSignature = (title: string, id: string, defaultUrl: string): string => {
    let sigMap: Record<string, string> = {};
    if (stageSigs instanceof Map) {
      stageSigs.forEach((val, key) => {
        if (typeof val === "string") sigMap[key] = val;
      });
    } else if (stageSigs && typeof stageSigs === "object") {
      sigMap = stageSigs as Record<string, string>;
    }

    const targetTitle = norm(title);
    const targetId = norm(id);

    for (const [k, v] of Object.entries(sigMap)) {
      if (v) {
        const normK = norm(k);
        if (normK === targetTitle || normK === targetId || k === title || k === id) {
          return v;
        }
      }
    }

    const globalSig = getStoredGlobalSignature(title) || getStoredGlobalSignature(id);
    if (globalSig) return globalSig;

    return defaultUrl || "";
  };

  for (const sig of signatories) {
    const rawSig = getUploadedSignature(sig.title, sig.id, sig.signatureUrl);
    if (rawSig) {
      try {
        if (rawSig.startsWith("data:image")) {
          const processed = await getProcessedSignatureBase64(rawSig);
          loadedSignatures[sig.stageNum] = processed || rawSig;
        } else {
          const base64 = await getProcessedSignatureBase64(rawSig);
          if (base64) {
            loadedSignatures[sig.stageNum] = base64;
          }
        }
      } catch (err) {
        console.warn(`Failed loading signature for ${sig.title}:`, err);
      }
    }
  }

  signatories.forEach((sig, index) => {
    const x = marginLeft + index * sigSpacing + sigSpacing / 2;
    const sigImgBase64 = loadedSignatures[sig.stageNum];
    const isSigned = (activeStageIdx >= sig.stageNum || currentStageStr === "Approved") && activeStageIdx !== -1;

    if (isSigned && sigImgBase64) {
      try {
        const isPng = sigImgBase64.toLowerCase().includes("data:image/png") || sigImgBase64.toLowerCase().includes(".png");
        const imgFormat = isPng ? "PNG" : "JPEG";
        doc.addImage(sigImgBase64, imgFormat, x - 32, sigY - 42, 64, 30);
      } catch (err) {
        console.warn(`Failed adding signature for ${sig.title}:`, err);
        try {
          doc.addImage(sigImgBase64, x - 32, sigY - 42, 64, 30);
        } catch (e2) {}
      }

      doc.setDrawColor(30, 41, 59);
      doc.setLineWidth(0.6);
      doc.line(x - 38, sigY - 10, x + 38, sigY - 10);
    } else {
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
      const blob = new Blob([finalMergedBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    },
    getBlobUrl: () => {
      const blob = new Blob([finalMergedBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      return URL.createObjectURL(blob);
    },
    getBlob: () => {
      return new Blob([finalMergedBytes.buffer as ArrayBuffer], { type: "application/pdf" });
    },
  };
}
