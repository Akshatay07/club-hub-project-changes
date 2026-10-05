import { jsPDF } from "jspdf";
import { DSCASC_LOGO_PNG_BASE64 } from "./reportLogos";

export interface ExpenditureItem {
  slNo: number;
  details: string;
  dateOfBill: string;
  qty: string | number;
  amount: string | number;
  total: string | number;
}

export interface CoverLetterData {
  date: string;
  eventName: string;
  dateOfConduction: string;
  unitName: string;
  budgetSrNo: string;
  expenditureItems: ExpenditureItem[];
  grandTotal: string | number;
  toTitle?: string;
  toOrg?: string;
  toLocation?: string;
  subject?: string;
  submittedByRole?: string;
  approvedByRole?: string;
}

export function generateCoverLetterPdf(data: CoverLetterData): {
  save: (filename?: string) => void;
  getBlob: () => Blob;
} {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "a4",
  });

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const marginLeft = 40;
  const marginRight = 40;
  const contentWidth = pageWidth - marginLeft - marginRight; // 515.28 pt

  let curY = 35;

  const setFont = (style: "normal" | "bold" | "italic" = "normal", size: number = 10) => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    doc.setTextColor(0, 0, 0);
  };

  // ================= 1. HEADER =================
  // Left Logo: DSCASC Crest
  if (DSCASC_LOGO_PNG_BASE64) {
    try {
      doc.addImage(DSCASC_LOGO_PNG_BASE64, "PNG", marginLeft, curY, 52, 52);
    } catch (e) {
      console.warn("DSCASC logo add error:", e);
    }
  }

  // Header Titles (Centered across page or offset from logo)
  const headerCenterX = marginLeft + 55 + (contentWidth - 55) / 2;

  setFont("bold", 12);
  doc.text(
    "DAYANANDA SAGAR COLLEGE OF ARTS, SCIENCE AND COMMERCE",
    headerCenterX,
    curY + 12,
    { align: "center" }
  );

  setFont("normal", 7.5);
  doc.text(
    "College affiliated to Bangalore University (BU),",
    headerCenterX,
    curY + 24,
    { align: "center" }
  );

  setFont("normal", 7);
  doc.text(
    "Approved by AICTE and UGC, Accredited by NAAC with 'B+' grade, and ISO 9001-2015 Certified Institution",
    headerCenterX,
    curY + 34,
    { align: "center" }
  );

  setFont("bold", 11);
  doc.text(
    "[Internal Quality Assurance Cell",
    headerCenterX,
    curY + 48,
    { align: "center" }
  );

  curY += 62;

  // Divider Line
  doc.setDrawColor(50, 50, 50);
  doc.setLineWidth(0.75);
  doc.line(marginLeft, curY, pageWidth - marginRight, curY);

  curY += 20;

  // ================= 2. LETTER META =================
  setFont("bold", 10);
  doc.text(`Date: ${data.date || "_______________"}`, marginLeft, curY);
  curY += 20;

  setFont("bold", 10);
  doc.text("To", marginLeft, curY);
  curY += 14;

  setFont("normal", 10);
  doc.text(data.toTitle || "The Accounts Manager", marginLeft, curY);
  curY += 13;
  doc.text(data.toOrg || "Dayananda Sagar Institutions", marginLeft, curY);
  curY += 13;
  doc.text(data.toLocation || "Bengaluru-560111", marginLeft, curY);
  curY += 22;

  setFont("bold", 10);
  doc.text(
    `Subject: ${data.subject || "Submission of Accounts for the Event"}`,
    marginLeft,
    curY
  );
  curY += 20;

  setFont("normal", 10);
  doc.text("Dear Sir/Madam,", marginLeft, curY);
  curY += 16;

  const bodyText =
    "Please find below the details of the event and the expenditure incurred towards the same. The accounts are submitted along with the original bills and supporting documents for verification and necessary processing.";
  
  const splitBody = doc.splitTextToSize(bodyText, contentWidth);
  doc.text(splitBody, marginLeft, curY);
  curY += splitBody.length * 14 + 12;

  // ================= 3. EVENT DETAILS TABLE =================
  setFont("bold", 11);
  doc.text("Event Details", marginLeft, curY);
  curY += 8;

  const evTableX = marginLeft;
  const evTableW = contentWidth;
  const col1W = 110;
  const col2W = (evTableW - 220) / 2;
  const col3W = 110;
  const col4W = col2W;

  const rowHeight = 20;

  // Header Row
  doc.setFillColor(245, 245, 245);
  doc.rect(evTableX, curY, evTableW, rowHeight, "F");
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.rect(evTableX, curY, evTableW, rowHeight);
  doc.line(evTableX + col1W, curY, evTableX + col1W, curY + rowHeight);
  doc.line(evTableX + col1W + col2W, curY, evTableX + col1W + col2W, curY + rowHeight);
  doc.line(evTableX + col1W + col2W + col3W, curY, evTableX + col1W + col2W + col3W, curY + rowHeight);

  setFont("bold", 9.5);
  doc.text("Particulars", evTableX + 8, curY + 13);
  doc.text("Details", evTableX + col1W + 8, curY + 13);
  doc.text("Particulars", evTableX + col1W + col2W + 8, curY + 13);
  doc.text("Details", evTableX + col1W + col2W + col3W + 8, curY + 13);

  curY += rowHeight;

  // Row 1: Event Name & Date of Conduction
  doc.rect(evTableX, curY, evTableW, rowHeight);
  doc.line(evTableX + col1W, curY, evTableX + col1W, curY + rowHeight);
  doc.line(evTableX + col1W + col2W, curY, evTableX + col1W + col2W, curY + rowHeight);
  doc.line(evTableX + col1W + col2W + col3W, curY, evTableX + col1W + col2W + col3W, curY + rowHeight);

  setFont("normal", 9);
  doc.text("Name of the Event", evTableX + 8, curY + 13);
  doc.text(data.eventName || "___________________________", evTableX + col1W + 8, curY + 13);
  doc.text("Date of Conduction", evTableX + col1W + col2W + 8, curY + 13);
  doc.text(data.dateOfConduction || "___________________", evTableX + col1W + col2W + col3W + 8, curY + 13);

  curY += rowHeight;

  // Row 2: Unit Name & Budget Sr. No.
  doc.rect(evTableX, curY, evTableW, rowHeight);
  doc.line(evTableX + col1W, curY, evTableX + col1W, curY + rowHeight);
  doc.line(evTableX + col1W + col2W, curY, evTableX + col1W + col2W, curY + rowHeight);
  doc.line(evTableX + col1W + col2W + col3W, curY, evTableX + col1W + col2W + col3W, curY + rowHeight);

  doc.text("Unit Name", evTableX + 8, curY + 13);
  doc.text(data.unitName || "___________________________", evTableX + col1W + 8, curY + 13);
  doc.text("Budget Sr. No.", evTableX + col1W + col2W + 8, curY + 13);
  doc.text(data.budgetSrNo || "___________________", evTableX + col1W + col2W + col3W + 8, curY + 13);

  curY += rowHeight + 20;

  // ================= 4. EXPENDITURE DETAILS TABLE =================
  setFont("bold", 11);
  doc.text("Expenditure Details", marginLeft, curY);
  curY += 8;

  const expTableX = marginLeft;
  const expTableW = contentWidth;

  const c1 = 40;  // Sl. No.
  const c2 = 185; // Details
  const c3 = 80;  // Date of Bill
  const c4 = 45;  // Qty.
  const c5 = 80;  // Amount (₹)
  const c6 = expTableW - (c1 + c2 + c3 + c4 + c5); // Total (₹) (~85)

  // Header Row
  doc.setFillColor(245, 245, 245);
  doc.rect(expTableX, curY, expTableW, rowHeight, "F");
  doc.rect(expTableX, curY, expTableW, rowHeight);
  
  let xOffset = expTableX;
  const colWidths = [c1, c2, c3, c4, c5, c6];
  for (let i = 0; i < colWidths.length - 1; i++) {
    xOffset += colWidths[i];
    doc.line(xOffset, curY, xOffset, curY + rowHeight);
  }

  setFont("bold", 9);
  doc.text("Sl. No.", expTableX + 5, curY + 13);
  doc.text("Details", expTableX + c1 + 8, curY + 13);
  doc.text("Date of Bill", expTableX + c1 + c2 + 8, curY + 13);
  doc.text("Qty.", expTableX + c1 + c2 + c3 + 8, curY + 13);
  doc.text("Amount (₹)", expTableX + c1 + c2 + c3 + c4 + 8, curY + 13);
  doc.text("Total (₹)", expTableX + c1 + c2 + c3 + c4 + c5 + 8, curY + 13);

  curY += rowHeight;

  // Rows 1 to 5 (or dynamic)
  const items = data.expenditureItems && data.expenditureItems.length > 0
    ? data.expenditureItems
    : Array.from({ length: 5 }, (_, i) => ({
        slNo: i + 1,
        details: "",
        dateOfBill: "",
        qty: "",
        amount: "",
        total: "",
      }));

  setFont("normal", 9);
  items.forEach((item, index) => {
    doc.rect(expTableX, curY, expTableW, rowHeight);
    let xCurr = expTableX;
    for (let i = 0; i < colWidths.length - 1; i++) {
      xCurr += colWidths[i];
      doc.line(xCurr, curY, xCurr, curY + rowHeight);
    }

    doc.text(String(item.slNo || index + 1), expTableX + 12, curY + 13);
    doc.text(String(item.details || ""), expTableX + c1 + 8, curY + 13);
    doc.text(String(item.dateOfBill || ""), expTableX + c1 + c2 + 8, curY + 13);
    doc.text(String(item.qty || ""), expTableX + c1 + c2 + c3 + 8, curY + 13);
    doc.text(String(item.amount || ""), expTableX + c1 + c2 + c3 + c4 + 8, curY + 13);
    doc.text(String(item.total || ""), expTableX + c1 + c2 + c3 + c4 + c5 + 8, curY + 13);

    curY += rowHeight;
  });

  // Grand Total Row
  doc.rect(expTableX, curY, expTableW, rowHeight);
  const grandTotalTextX = expTableX + c1 + 8;
  const grandTotalValX = expTableX + c1 + c2 + c3 + c4 + c5 + 8;
  doc.line(expTableX + c1 + c2 + c3 + c4 + c5, curY, expTableX + c1 + c2 + c3 + c4 + c5, curY + rowHeight);

  setFont("bold", 9.5);
  doc.text("Grand Total", grandTotalTextX, curY + 13);
  doc.text(`₹ ${data.grandTotal || "__________"}`, grandTotalValX, curY + 13);+ 13);

  curY += rowHeight + 20;

  // ================= 5. CLOSING TEXT =================
  setFont("normal", 10);
  const closingText =
    "The original bills and supporting documents are enclosed for verification and further necessary processing.";
  const splitClosing = doc.splitTextToSize(closingText, contentWidth);
  doc.text(splitClosing, marginLeft, curY);
  curY += splitClosing.length * 14 + 12;

  doc.text("Thank you.", marginLeft, curY);
  curY += 25;

  // ================= 6. SIGNATURES BLOCK =================
  const sigBoxW = contentWidth;
  const sigBoxH = 55;
  const halfW = sigBoxW / 2;

  doc.rect(marginLeft, curY, sigBoxW, sigBoxH);
  doc.line(marginLeft + halfW, curY, marginLeft + halfW, curY + sigBoxH);

  // Top header row inside sig box
  doc.line(marginLeft, curY + 18, marginLeft + sigBoxW, curY + 18);

  setFont("bold", 9.5);
  doc.text("Submitted by", marginLeft + 12, curY + 13);
  doc.text("Approved by", marginLeft + halfW + 12, curY + 13);

  setFont("bold", 9.5);
  doc.text(data.submittedByRole || "IQAC Coordinator", marginLeft + 12, curY + 46);
  doc.text(data.approvedByRole || "Principal", marginLeft + halfW + 12, curY + 46);

  curY += sigBoxH + 30;

  // ================= 7. FOOTER =================
  const footerY = pageHeight - 35;
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.5);
  doc.line(marginLeft, footerY - 18, pageWidth - marginRight, footerY - 18);

  setFont("bold", 8);
  const footerLine1 =
    "Postal Address: 1st Stage, Kumaraswamy Layout, Bengaluru, Karnataka 560111";
  doc.text(footerLine1, pageWidth / 2, footerY - 8, { align: "center" });

  setFont("normal", 7.5);
  const footerLine2 =
    "Ph: 080-42161767    Email ID: principal-dscasc@dayanandasagar.edu    Website: www.dscasc.edu.in";
  doc.text(footerLine2, pageWidth / 2, footerY + 3, { align: "center" });

  return {
    save: (filename: string = "Event_Cover_Letter.pdf") => doc.save(filename),
    getBlob: () => doc.output("blob"),
  };
}
