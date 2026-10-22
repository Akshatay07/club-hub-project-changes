import { jsPDF } from "jspdf";
import { DSCASC_LOGO_PNG_BASE64, IIC_LOGO_PNG_BASE64 } from "./reportLogos";

export interface AnnualReportEventItem {
  slNo: number | string;
  name: string;
  date: string;
  department: string;
  participants: number | string;
  weblink: string;
}

export interface AnnualReportMemberItem {
  slNo: number | string;
  name: string;
  role: string;
  department: string;
}

export interface AnnualCellReportData {
  reportTitle: string; // e.g. "Annual Report June 2025 to May 2026"
  unitSubtitle: string; // e.g. "Coding Club Unit – CODING CLUB"
  academicPeriod: string; // e.g. "June 2025 – May 2026"
  narrativeParagraphs: string[]; // 3 paragraphs
  events: AnnualReportEventItem[];
  members: AnnualReportMemberItem[];
}

export function generateAnnualCellReportPdf(data: AnnualCellReportData): {
  save: (filename: string) => void;
  getBlobUrl: () => string;
  getBlob: () => Blob;
} {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "a4",
  });

  const pageWidth = 595.28;
  const marginLeft = 40;
  const marginRight = 40;
  const contentWidth = pageWidth - marginLeft - marginRight; // 515.28 pt

  // ==========================================
  // PAGE 1: LETTERHEAD, NARRATIVE & EVENTS
  // ==========================================
  let curY = 28;

  // 1. Logos
  if (DSCASC_LOGO_PNG_BASE64) {
    try {
      doc.addImage(DSCASC_LOGO_PNG_BASE64, "PNG", marginLeft, curY, 48, 48);
    } catch (e) {
      console.warn("DSCASC logo error:", e);
    }
  }

  if (IIC_LOGO_PNG_BASE64) {
    try {
      doc.addImage(
        IIC_LOGO_PNG_BASE64,
        "PNG",
        pageWidth - marginRight - 78,
        curY + 2,
        78,
        42
      );
    } catch (e) {
      console.warn("IIC logo error:", e);
    }
  }

  // 2. Centered Institution Header
  doc.setFont("times", "bold");
  doc.setFontSize(13);
  doc.setTextColor(26, 54, 138); // Deep royal / navy blue
  doc.text(
    "DAYANANDA SAGAR COLLEGE OF ARTS",
    pageWidth / 2,
    curY + 14,
    { align: "center" }
  );
  doc.text("SCIENCE & COMMERCE", pageWidth / 2, curY + 29, {
    align: "center",
  });

  doc.setFont("times", "normal");
  doc.setFontSize(9.5);
  doc.text("Affiliated to Bangalore University", pageWidth / 2, curY + 43, {
    align: "center",
  });

  curY += 56;

  // 3. Address Strip enclosed by lines
  doc.setDrawColor(26, 54, 138);
  doc.setLineWidth(0.9);
  doc.line(marginLeft, curY, pageWidth - marginRight, curY);

  curY += 10;
  doc.setFont("times", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);

  doc.text(
    "Shavige Malleshwara Hills, Kumaraswamy Layout, Bangalore, Karnataka, India, Pin Code : 560111",
    pageWidth / 2,
    curY,
    { align: "center" }
  );
  curY += 10;
  doc.text(
    "Phone : +91 8042161762 / 26661104 Fax: 26660789,",
    pageWidth / 2,
    curY,
    { align: "center" }
  );
  curY += 10;
  doc.text("Website : https://dscasc.edu.in/", pageWidth / 2, curY, {
    align: "center",
  });

  curY += 5;
  doc.setLineWidth(1.4);
  doc.line(marginLeft, curY, pageWidth - marginRight, curY);

  // 4. Report Title
  curY += 22;
  doc.setFont("times", "bold");
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(data.reportTitle || "Annual Report", pageWidth / 2, curY, {
    align: "center",
  });

  // 5. Unit Subtitle
  curY += 18;
  doc.setFont("times", "bold");
  doc.setFontSize(11);
  doc.text(data.unitSubtitle || "Assigned Club Unit", pageWidth / 2, curY, {
    align: "center",
  });

  // 6. Narrative Paragraphs
  curY += 16;
  doc.setFont("times", "normal");
  doc.setFontSize(9.2);
  doc.setTextColor(0, 0, 0);

  const paragraphs = data.narrativeParagraphs || [];
  paragraphs.forEach((pText) => {
    if (!pText || !pText.trim()) return;
    const lines = doc.splitTextToSize(pText.trim(), contentWidth);
    doc.text(lines, marginLeft, curY);
    curY += lines.length * 11.5 + 8;
  });

  // 7. Events Table Title
  curY += 4;
  doc.setFont("times", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(0, 0, 0);
  const tableTitle = `Events conducted during ${data.academicPeriod || "Selected Period"}`;
  doc.text(tableTitle, pageWidth / 2, curY, { align: "center" });

  curY += 10;

  // 8. Events Table Grid
  const colW = {
    slNo: 32,
    name: 165,
    date: 65,
    dept: 80,
    part: 65,
    link: contentWidth - (32 + 165 + 65 + 80 + 65), // 108.28 pt
  };

  const drawEventsTableHeader = (y: number) => {
    const headerH = 22;
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.8);

    let x = marginLeft;
    doc.rect(x, y, colW.slNo, headerH);
    x += colW.slNo;
    doc.rect(x, y, colW.name, headerH);
    x += colW.name;
    doc.rect(x, y, colW.date, headerH);
    x += colW.date;
    doc.rect(x, y, colW.dept, headerH);
    x += colW.dept;
    doc.rect(x, y, colW.part, headerH);
    x += colW.part;
    doc.rect(x, y, colW.link, headerH);

    doc.setFont("times", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(0, 0, 0);

    doc.text("SL.No", marginLeft + colW.slNo / 2, y + 14, { align: "center" });
    doc.text("Event Name", marginLeft + colW.slNo + 6, y + 14);
    doc.text("Date", marginLeft + colW.slNo + colW.name + colW.date / 2, y + 14, {
      align: "center",
    });
    doc.text(
      "Department/\nDSCASC",
      marginLeft + colW.slNo + colW.name + colW.date + colW.dept / 2,
      y + 9,
      { align: "center" }
    );
    doc.text(
      "No. of\nparticipants",
      marginLeft + colW.slNo + colW.name + colW.date + colW.dept + colW.part / 2,
      y + 9,
      { align: "center" }
    );
    doc.text(
      "Weblink",
      marginLeft + colW.slNo + colW.name + colW.date + colW.dept + colW.part + 6,
      y + 14
    );

    return y + headerH;
  };

  curY = drawEventsTableHeader(curY);

  // Rows from analytics section
  const events = data.events && data.events.length > 0 ? data.events : [];

  if (events.length === 0) {
    const emptyRowH = 28;
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.6);
    doc.rect(marginLeft, curY, contentWidth, emptyRowH);
    doc.setFont("times", "italic");
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(
      "No events recorded in the analytics section for this period.",
      pageWidth / 2,
      curY + 17,
      { align: "center" }
    );
    curY += emptyRowH;
  } else {
    events.forEach((ev, idx) => {
      const slNoStr = `${ev.slNo || idx + 1}.`;
      const nameLines = doc.splitTextToSize(ev.name || "Event", colW.name - 10);
      const dateStr = ev.date || "—";
      const deptStr = ev.department || "DSCASC";
      const partStr = String(ev.participants ?? "0");
      const linkStr = ev.weblink || `https://dscasc.edu.in/images/iqac/cell-events/ev-${idx + 1}.pdf`;

      const linkLines = doc.splitTextToSize(linkStr, colW.link - 8);
      const maxLines = Math.max(nameLines.length, linkLines.length, 1);
      const rowH = Math.max(maxLines * 11 + 10, 24);

      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.6);

      let x = marginLeft;
      doc.rect(x, curY, colW.slNo, rowH);
      x += colW.slNo;
      doc.rect(x, curY, colW.name, rowH);
      x += colW.name;
      doc.rect(x, curY, colW.date, rowH);
      x += colW.date;
      doc.rect(x, curY, colW.dept, rowH);
      x += colW.dept;
      doc.rect(x, curY, colW.part, rowH);
      x += colW.part;
      doc.rect(x, curY, colW.link, rowH);

      doc.setFont("times", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(0, 0, 0);

      // SlNo
      doc.text(slNoStr, marginLeft + colW.slNo / 2, curY + 14, { align: "center" });

      // Name
      doc.text(nameLines, marginLeft + colW.slNo + 5, curY + 12);

      // Date
      doc.text(dateStr, marginLeft + colW.slNo + colW.name + colW.date / 2, curY + 14, {
        align: "center",
      });

      // Department
      doc.text(
        deptStr,
        marginLeft + colW.slNo + colW.name + colW.date + 6,
        curY + 14
      );

      // Participants
      doc.text(
        partStr,
        marginLeft + colW.slNo + colW.name + colW.date + colW.dept + colW.part / 2,
        curY + 14,
        { align: "center" }
      );

      // Weblink (blue underlined text)
      doc.setTextColor(37, 99, 235);
      doc.text(
        linkLines,
        marginLeft + colW.slNo + colW.name + colW.date + colW.dept + colW.part + 4,
        curY + 12
      );

      curY += rowH;
    });
  }

  // ==========================================
  // PAGE 2: HEAD & MEMBERS + EMPTY SIGNATURES
  // ==========================================
  doc.addPage();
  curY = 48;

  // Page 2 Heading
  doc.setFont("times", "bold");
  doc.setFontSize(13);
  doc.setTextColor(0, 0, 0);
  doc.text("Head and Members of the Unit", pageWidth / 2, curY, {
    align: "center",
  });

  curY += 24;

  // Members Table Grid
  const memTableW = 480;
  const memLeft = (pageWidth - memTableW) / 2; // 57.64
  const mColW = {
    slNo: 40,
    name: 180,
    role: 110,
    dept: 150,
  };

  // Header
  const mHeaderH = 22;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.8);

  let mx = memLeft;
  doc.rect(mx, curY, mColW.slNo, mHeaderH);
  mx += mColW.slNo;
  doc.rect(mx, curY, mColW.name, mHeaderH);
  mx += mColW.name;
  doc.rect(mx, curY, mColW.role, mHeaderH);
  mx += mColW.role;
  doc.rect(mx, curY, mColW.dept, mHeaderH);

  doc.setFont("times", "bold");
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);

  doc.text("Sl.\nNo.", memLeft + mColW.slNo / 2, curY + 9, { align: "center" });
  doc.text("Members name", memLeft + mColW.slNo + mColW.name / 2, curY + 14, {
    align: "center",
  });
  doc.text(
    "Role",
    memLeft + mColW.slNo + mColW.name + mColW.role / 2,
    curY + 14,
    { align: "center" }
  );
  doc.text(
    "Department",
    memLeft + mColW.slNo + mColW.name + mColW.role + mColW.dept / 2,
    curY + 14,
    { align: "center" }
  );

  curY += mHeaderH;

  // Members Rows
  const members = data.members || [];
  members.forEach((m, idx) => {
    const rowH = 20;
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.6);

    let x = memLeft;
    doc.rect(x, curY, mColW.slNo, rowH);
    x += mColW.slNo;
    doc.rect(x, curY, mColW.name, rowH);
    x += mColW.name;
    doc.rect(x, curY, mColW.role, rowH);
    x += mColW.role;
    doc.rect(x, curY, mColW.dept, rowH);

    doc.setFont("times", "normal");
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);

    // SlNo
    doc.text(`${m.slNo || idx + 1}.`, memLeft + mColW.slNo / 2, curY + 13, {
      align: "center",
    });

    // Name
    doc.text(m.name || "—", memLeft + mColW.slNo + 8, curY + 13);

    // Role
    doc.text(m.role || "Member", memLeft + mColW.slNo + mColW.name + 8, curY + 13);

    // Department
    doc.text(
      m.department || "DSCASC",
      memLeft + mColW.slNo + mColW.name + mColW.role + 8,
      curY + 13
    );

    curY += rowH;
  });

  // ==========================================
  // SIGNATURES SECTION (ALWAYS COMPLETELY EMPTY)
  // ==========================================
  const sigY = Math.max(curY + 120, 710);

  // Column 1: Unit Head (Empty Space)
  const col1X = memLeft + 70;
  doc.setFont("times", "bold");
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text("Unit Head", col1X, sigY, { align: "center" });

  doc.setFont("times", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(40, 40, 40);
  doc.text("Dayananda Sagar College of Arts,", col1X, sigY + 13, {
    align: "center",
  });
  doc.text("Science & Commerce", col1X, sigY + 24, { align: "center" });
  doc.setFont("times", "normal");
  doc.setFontSize(8);
  doc.text("Kumaraswamy Layout, Bengaluru - 560 111", col1X, sigY + 35, {
    align: "center",
  });

  // Column 2: IQAC Coordinator (Empty Space)
  const col2X = pageWidth / 2;
  doc.setFont("times", "bold");
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text("IQAC Coordinator", col2X, sigY, { align: "center" });

  doc.setFont("times", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(40, 40, 40);
  doc.text("Dayananda Sagar College of Arts,", col2X, sigY + 13, {
    align: "center",
  });
  doc.text("Science & Commerce", col2X, sigY + 24, { align: "center" });
  doc.setFont("times", "normal");
  doc.setFontSize(8);
  doc.text("Kumaraswamy Layout, Bengaluru - 560 111", col2X, sigY + 35, {
    align: "center",
  });

  // Column 3: Principal (Empty Space)
  const col3X = pageWidth - memLeft - 70;
  doc.setFont("times", "bold");
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text("Principal", col3X, sigY, { align: "center" });

  doc.setFont("times", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(40, 40, 40);
  doc.text("Dayananda Sagar College of Arts", col3X, sigY + 13, {
    align: "center",
  });
  doc.text("Science & Commerce", col3X, sigY + 24, { align: "center" });
  doc.setFont("times", "normal");
  doc.setFontSize(8);
  doc.text("Kumaraswamy Layout, Bengaluru - 560 111", col3X, sigY + 35, {
    align: "center",
  });

  return {
    save: (filename: string) => {
      doc.save(filename);
    },
    getBlobUrl: () => {
      return doc.output("bloburl");
    },
    getBlob: () => {
      return doc.output("blob");
    },
  };
}
