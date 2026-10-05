import { useState, useEffect, useRef } from "react";
import api from "@/api/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  FileCheck,
  Download,
  Printer,
  Calendar,
  Building2,
  Plus,
  Trash2,
  RefreshCw,
  Sparkles,
  Info,
  CheckCircle2,
  Layers,
  FileText,
} from "lucide-react";
import {
  generateCoverLetterPdf,
  CoverLetterData,
  ExpenditureItem,
} from "@/utils/coverLetterPdfGenerator";
import { DSCASC_LOGO_PNG_BASE64 } from "@/utils/reportLogos";

const FacultyCoverLetter = () => {
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);

  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [loadingEvents, setLoadingEvents] = useState<boolean>(true);
  const [loadingDetails, setLoadingDetails] = useState<boolean>(false);

  // Cover Letter Form State
  const [date, setDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [eventName, setEventName] = useState<string>("");
  const [dateOfConduction, setDateOfConduction] = useState<string>("");
  const [unitName, setUnitName] = useState<string>("");
  const [budgetSrNo, setBudgetSrNo] = useState<string>("");

  const [expenditureItems, setExpenditureItems] = useState<ExpenditureItem[]>([
    { slNo: 1, details: "", dateOfBill: "", qty: "", amount: "", total: "" },
    { slNo: 2, details: "", dateOfBill: "", qty: "", amount: "", total: "" },
    { slNo: 3, details: "", dateOfBill: "", qty: "", amount: "", total: "" },
    { slNo: 4, details: "", dateOfBill: "", qty: "", amount: "", total: "" },
    { slNo: 5, details: "", dateOfBill: "", qty: "", amount: "", total: "" },
  ]);

  const [grandTotalOverride, setGrandTotalOverride] = useState<string>("");

  // FETCH FACULTY EVENTS
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoadingEvents(true);
        const res = await api.get("/events");
        const list = Array.isArray(res.data) ? res.data : res.data?.events || [];
        setEvents(list);
        if (list.length > 0) {
          setSelectedEventId(list[0]._id);
        }
      } catch (err) {
        console.error("Failed to load events for cover letter:", err);
        toast({
          title: "Error",
          description: "Failed to load faculty events.",
          variant: "destructive",
        });
      } finally {
        setLoadingEvents(false);
      }
    };

    fetchEvents();
  }, [toast]);

  // WHEN SELECTED EVENT CHANGES, POPULATE REPORT DATA
  useEffect(() => {
    if (!selectedEventId) return;

    const loadEventDetails = async () => {
      try {
        setLoadingDetails(true);
        const res = await api.get(`/events/${selectedEventId}`);
        const ev = res.data;

        // Auto populate matching fields from report
        setEventName(ev.name || "");
        setDateOfConduction(ev.date || ev.reportDate || "");
        setUnitName(ev.unitName || ev.clubId?.name || ev.department || "DSCASC");
        setDate(ev.reportDate || ev.date || new Date().toISOString().split("T")[0]);

        // Unmapped fields left empty as requested
        setBudgetSrNo("");

        // Total expenditure if present
        if (ev.totalExpenditure || ev.budgetSpent) {
          setGrandTotalOverride(String(ev.totalExpenditure || ev.budgetSpent));
        } else {
          setGrandTotalOverride("");
        }
      } catch (err) {
        console.error("Error fetching event details:", err);
      } finally {
        setLoadingDetails(false);
      }
    };

    loadEventDetails();
  }, [selectedEventId]);

  // CALCULATE GRAND TOTAL FROM TABLE IF NOT OVERRIDDEN
  const calculatedTotal = expenditureItems.reduce((sum, item) => {
    const val = parseFloat(String(item.total || item.amount || 0));
    return sum + (isNaN(val) ? 0 : val);
  }, 0);

  const displayGrandTotal =
    grandTotalOverride.trim() !== ""
      ? grandTotalOverride
      : calculatedTotal > 0
      ? calculatedTotal.toLocaleString("en-IN")
      : "";

  // HANDLERS FOR EXPENDITURE TABLE
  const handleItemChange = (
    index: number,
    field: keyof ExpenditureItem,
    value: string
  ) => {
    const updated = [...expenditureItems];
    updated[index] = { ...updated[index], [field]: value };

    // Auto calculate row total if qty and amount exist
    if (field === "qty" || field === "amount") {
      const q = parseFloat(String(updated[index].qty));
      const a = parseFloat(String(updated[index].amount));
      if (!isNaN(q) && !isNaN(a)) {
        updated[index].total = String(q * a);
      }
    }

    setExpenditureItems(updated);
  };

  const addRow = () => {
    setExpenditureItems((prev) => [
      ...prev,
      {
        slNo: prev.length + 1,
        details: "",
        dateOfBill: "",
        qty: "",
        amount: "",
        total: "",
      },
    ]);
  };

  const removeRow = (index: number) => {
    if (expenditureItems.length <= 1) return;
    const filtered = expenditureItems.filter((_, i) => i !== index);
    const renumbered = filtered.map((item, i) => ({ ...item, slNo: i + 1 }));
    setExpenditureItems(renumbered);
  };

  const resetRows = () => {
    setExpenditureItems([
      { slNo: 1, details: "", dateOfBill: "", qty: "", amount: "", total: "" },
      { slNo: 2, details: "", dateOfBill: "", qty: "", amount: "", total: "" },
      { slNo: 3, details: "", dateOfBill: "", qty: "", amount: "", total: "" },
      { slNo: 4, details: "", dateOfBill: "", qty: "", amount: "", total: "" },
      { slNo: 5, details: "", dateOfBill: "", qty: "", amount: "", total: "" },
    ]);
    setGrandTotalOverride("");
  };

  // COVER LETTER DATA OBJECT
  const coverLetterPayload: CoverLetterData = {
    date,
    eventName,
    dateOfConduction,
    unitName,
    budgetSrNo,
    expenditureItems,
    grandTotal: displayGrandTotal,
    toTitle: "The Accounts Manager",
    toOrg: "Dayananda Sagar Institutions",
    toLocation: "Bengaluru-560111",
    subject: "Submission of Accounts for the Event",
    submittedByRole: "IQAC Coordinator",
    approvedByRole: "Principal",
  };

  // DOWNLOAD PDF
  const handleDownloadPdf = () => {
    try {
      const pdf = generateCoverLetterPdf(coverLetterPayload);
      const safeName = (eventName || "Event").replace(/[^a-z0-9]/gi, "_");
      pdf.save(`Cover_Letter_${safeName}.pdf`);
      toast({
        title: "Success",
        description: "Cover letter PDF downloaded successfully.",
      });
    } catch (err) {
      console.error("PDF download error:", err);
      toast({
        title: "Error",
        description: "Failed to generate cover letter PDF.",
        variant: "destructive",
      });
    }
  };

  // PRINT COVER LETTER
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-6 md:p-8 bg-background min-h-screen space-y-8">
      {/* PAGE HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileCheck className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Event Cover Letter Generator
            </h1>
          </div>
          <p className="text-muted-foreground mt-1">
            Generate and print official expenditure submission cover letters using event report data.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="gap-2 border-border hover:bg-accent"
            onClick={handlePrint}
          >
            <Printer className="h-4 w-4 text-blue-500" />
            Print Cover Letter
          </Button>

          <Button
            className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md"
            onClick={handleDownloadPdf}
          >
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
        </div>
      </div>

      {/* ALERT INFO */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4 flex items-start gap-3 text-sm text-foreground">
          <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Auto-fetching behavior:</span> Event Name, Date of Conduction, Unit Name, and Report Date are pre-filled directly from the selected event report. Unmapped fields (such as Budget Sr. No. and individual bill entries) are left empty by default and can be filled below before printing/downloading.
          </div>
        </CardContent>
      </Card>

      {/* MAIN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT FORM CONTROLS (5 COLUMNS) */}
        <div className="lg:col-span-5 space-y-6">
          {/* EVENT SELECTOR CARD */}
          <Card className="shadow-card border border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Select Event
              </CardTitle>
              <CardDescription>
                Choose an event to fetch report data for the cover letter
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="event-select" className="text-xs font-semibold uppercase text-muted-foreground">
                  Faculty Events
                </Label>
                <select
                  id="event-select"
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  className="w-full mt-1.5 px-3 py-2 bg-background border border-input rounded-md text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                  disabled={loadingEvents}
                >
                  {events.length === 0 ? (
                    <option value="">No events found</option>
                  ) : (
                    events.map((ev) => (
                      <option key={ev._id} value={ev._id}>
                        {ev.name} ({ev.date || "No date"})
                      </option>
                    ))
                  )}
                </select>
              </div>

              {selectedEventId && (
                <div className="p-3 bg-muted/40 rounded-lg text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {events.find((e) => e._id === selectedEventId)?.status || "N/A"}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Club / Unit:</span>
                    <span className="font-medium text-foreground">{unitName || "N/A"}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* EVENT DETAILS FORM */}
          <Card className="shadow-card border border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Cover Letter Header Details
              </CardTitle>
              <CardDescription>
                Edit event details or letter metadata
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="letter-date" className="text-xs font-medium">
                    Date of Letter
                  </Label>
                  <Input
                    id="letter-date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="mt-1 text-sm"
                  />
                </div>

                <div>
                  <Label htmlFor="budget-sr" className="text-xs font-medium flex items-center justify-between">
                    Budget Sr. No.
                    <span className="text-[10px] text-muted-foreground">(Unmapped)</span>
                  </Label>
                  <Input
                    id="budget-sr"
                    placeholder="Leave empty or enter Sr. No."
                    value={budgetSrNo}
                    onChange={(e) => setBudgetSrNo(e.target.value)}
                    className="mt-1 text-sm"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="event-name" className="text-xs font-medium">
                  Name of the Event
                </Label>
                <Input
                  id="event-name"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  className="mt-1 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date-conduction" className="text-xs font-medium">
                    Date of Conduction
                  </Label>
                  <Input
                    id="date-conduction"
                    value={dateOfConduction}
                    onChange={(e) => setDateOfConduction(e.target.value)}
                    className="mt-1 text-sm"
                  />
                </div>

                <div>
                  <Label htmlFor="unit-name" className="text-xs font-medium">
                    Unit Name
                  </Label>
                  <Input
                    id="unit-name"
                    value={unitName}
                    onChange={(e) => setUnitName(e.target.value)}
                    className="mt-1 text-sm"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* EXPENDITURE ITEMS EDITOR */}
          <Card className="shadow-card border border-border bg-card">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Expenditure Details Table
                </CardTitle>
                <CardDescription>
                  Enter individual bill items or leave blank
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs gap-1 text-muted-foreground hover:text-foreground"
                onClick={resetRows}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Reset
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="max-h-[320px] overflow-y-auto pr-1 space-y-3">
                {expenditureItems.map((item, index) => (
                  <div
                    key={index}
                    className="p-3 border border-border rounded-lg bg-muted/20 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between font-semibold">
                      <span>Sl. No. {item.slNo}</span>
                      {expenditureItems.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive hover:bg-destructive/10"
                          onClick={() => removeRow(index)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>

                    <div>
                      <Input
                        placeholder="Particulars / Details of Expenditure"
                        value={item.details}
                        onChange={(e) => handleItemChange(index, "details", e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      <Input
                        placeholder="Bill Date"
                        value={item.dateOfBill}
                        onChange={(e) => handleItemChange(index, "dateOfBill", e.target.value)}
                        className="h-8 text-xs"
                      />
                      <Input
                        placeholder="Qty"
                        value={item.qty}
                        onChange={(e) => handleItemChange(index, "qty", e.target.value)}
                        className="h-8 text-xs"
                      />
                      <Input
                        placeholder="Amount (Rs.)"
                        value={item.amount}
                        onChange={(e) => handleItemChange(index, "amount", e.target.value)}
                        className="h-8 text-xs"
                      />
                      <Input
                        placeholder="Total (Rs.)"
                        value={item.total}
                        onChange={(e) => handleItemChange(index, "total", e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full gap-1.5 text-xs border-dashed"
                onClick={addRow}
              >
                <Plus className="h-3.5 w-3.5" />
                Add Expenditure Row
              </Button>

              <div className="pt-2 border-t border-border">
                <Label htmlFor="grand-total" className="text-xs font-semibold">
                  Grand Total (Rs.)
                </Label>
                <Input
                  id="grand-total"
                  placeholder={
                    calculatedTotal > 0
                      ? `Calculated: Rs. ${calculatedTotal}`
                      : "Leave empty or enter total amount"
                  }
                  value={grandTotalOverride}
                  onChange={(e) => setGrandTotalOverride(e.target.value)}
                  className="mt-1 text-sm font-semibold"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT LIVE DOCUMENT PREVIEW (7 COLUMNS) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Live A4 Document Preview
            </span>
            <span className="text-xs text-muted-foreground">
              Matches official institutional cover letter format
            </span>
          </div>

          {/* A4 PREVIEW CONTAINER */}
          <div className="bg-muted/40 p-4 md:p-8 rounded-xl border border-border flex justify-center overflow-x-auto">
            <div
              ref={printRef}
              id="cover-letter-printable"
              className="bg-white text-black shadow-2xl rounded-sm w-[595px] min-h-[842px] p-[40px] text-[12px] leading-snug flex flex-col justify-between font-serif border border-gray-300 print:shadow-none print:w-full print:p-0 print:border-none"
              style={{ fontFamily: "'Times New Roman', Times, serif" }}
            >
              {/* DOCUMENT CONTENT AREA */}
              <div>
                {/* 1. INSTITUTION HEADER */}
                <div className="flex items-center gap-4 pb-3 border-b border-black">
                  <img
                    src={DSCASC_LOGO_PNG_BASE64 || "/dscasc_logo.png"}
                    alt="DSCASC Logo"
                    className="h-16 w-16 object-contain shrink-0"
                  />
                  <div className="text-center flex-1">
                    <h2 className="text-[13px] font-bold tracking-tight text-black uppercase leading-tight">
                      DAYANANDA SAGAR COLLEGE OF ARTS, SCIENCE AND COMMERCE
                    </h2>
                    <p className="text-[9px] text-gray-800 leading-tight mt-0.5">
                      <span className="font-semibold">College</span> affiliated to <span className="font-semibold">Bangalore University (BU)</span>,
                    </p>
                    <p className="text-[8.5px] text-gray-800 leading-tight">
                      Approved by <span className="font-semibold">AICTE</span> and <span className="font-semibold">UGC</span>, Accredited by <span className="font-semibold">NAAC</span> with <span className="font-semibold">'B+'</span> grade, and <span className="font-semibold">ISO 9001-2015</span> Certified Institution
                    </p>
                    <h3 className="text-[12px] font-bold text-black mt-1">
                      Internal Quality Assurance Cell
                    </h3>
                  </div>
                </div>

                {/* 2. LETTER METADATA */}
                <div className="mt-5 space-y-3 text-[11px]">
                  <div>
                    <span className="font-bold">Date:</span>{" "}
                    <span className="border-b border-black pb-0.5 px-2 font-medium">
                      {date || "________________"}
                    </span>
                  </div>

                  <div className="space-y-0.5">
                    <p className="font-bold">To</p>
                    <p>The Accounts Manager</p>
                    <p>Dayananda Sagar Institutions</p>
                    <p>Bengaluru-560111</p>
                  </div>

                  <div className="pt-1">
                    <p className="font-bold">
                      Subject: Submission of Accounts for the Event
                    </p>
                  </div>

                  <div className="pt-1">
                    <p>Dear Sir/Madam,</p>
                  </div>

                  <p className="text-justify leading-relaxed">
                    Please find below the details of the event and the expenditure incurred towards the same. The accounts are submitted along with the original bills and supporting documents for verification and necessary processing.
                  </p>
                </div>

                {/* 3. EVENT DETAILS TABLE */}
                <div className="mt-5">
                  <h4 className="font-bold text-[12px] mb-1.5">Event Details</h4>
                  <table className="w-full border-collapse border border-black text-[10.5px]">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-black p-1.5 text-left font-bold w-[22%]">Particulars</th>
                        <th className="border border-black p-1.5 text-left font-bold w-[28%]">Details</th>
                        <th className="border border-black p-1.5 text-left font-bold w-[22%]">Particulars</th>
                        <th className="border border-black p-1.5 text-left font-bold w-[28%]">Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-black p-1.5 font-bold">Name of the Event</td>
                        <td className="border border-black p-1.5">{eventName || ""}</td>
                        <td className="border border-black p-1.5 font-bold">Date of Conduction</td>
                        <td className="border border-black p-1.5">{dateOfConduction || ""}</td>
                      </tr>
                      <tr>
                        <td className="border border-black p-1.5 font-bold">Unit Name</td>
                        <td className="border border-black p-1.5">{unitName || ""}</td>
                        <td className="border border-black p-1.5 font-bold">Budget Sr. No.</td>
                        <td className="border border-black p-1.5">{budgetSrNo || ""}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* 4. EXPENDITURE DETAILS TABLE */}
                <div className="mt-5">
                  <h4 className="font-bold text-[12px] mb-1.5">Expenditure Details</h4>
                  <table className="w-full border-collapse border border-black text-[10.5px]">
                    <thead>
                      <tr className="bg-gray-100 text-center">
                        <th className="border border-black p-1.5 font-bold w-[8%]">Sl. No.</th>
                        <th className="border border-black p-1.5 font-bold text-left w-[36%]">Details</th>
                        <th className="border border-black p-1.5 font-bold w-[18%]">Date of Bill</th>
                        <th className="border border-black p-1.5 font-bold w-[10%]">Qty.</th>
                        <th className="border border-black p-1.5 font-bold w-[14%]">Amount (Rs.)</th>
                        <th className="border border-black p-1.5 font-bold w-[14%]">Total (Rs.)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenditureItems.map((item, idx) => (
                        <tr key={idx} className="h-6">
                          <td className="border border-black p-1 text-center font-medium">{item.slNo || idx + 1}</td>
                          <td className="border border-black p-1">{item.details || ""}</td>
                          <td className="border border-black p-1 text-center">{item.dateOfBill || ""}</td>
                          <td className="border border-black p-1 text-center">{item.qty || ""}</td>
                          <td className="border border-black p-1 text-right">{item.amount || ""}</td>
                          <td className="border border-black p-1 text-right">{item.total || ""}</td>
                        </tr>
                      ))}
                      <tr>
                        <td colSpan={5} className="border border-black p-1.5 text-left font-bold">
                          Grand Total
                        </td>
                        <td className="border border-black p-1.5 text-right font-bold">
                          {displayGrandTotal ? (displayGrandTotal.toLowerCase().includes("rs") ? displayGrandTotal : `Rs. ${displayGrandTotal}`) : "___________"}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* 5. CLOSING REMARKS */}
                <div className="mt-4 space-y-2 text-[11px]">
                  <p className="leading-relaxed">
                    The original bills and supporting documents are enclosed for verification and further necessary processing.
                  </p>
                  <p className="pt-1">Thank you.</p>
                </div>

                {/* 6. SIGNATURES BLOCK */}
                <div className="mt-8">
                  <table className="w-full border-collapse border border-black text-[11px]">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-black p-1.5 text-left font-bold w-1/2">Submitted by</th>
                        <th className="border border-black p-1.5 text-left font-bold w-1/2">Approved by</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="h-14">
                        <td className="border border-black p-2 align-bottom font-bold">
                          IQAC Coordinator
                        </td>
                        <td className="border border-black p-2 align-bottom font-bold">
                          Principal
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 7. INSTITUTION FOOTER */}
              <div className="mt-8 pt-3 border-t border-gray-400 text-center text-[8.5px] leading-tight text-gray-700">
                <p className="font-semibold text-gray-900">
                  Postal Address: 1st Stage, Kumaraswamy Layout, Bengaluru, Karnataka 560111
                </p>
                <p className="mt-0.5">
                  Ph: 080-42161767 &nbsp;&nbsp;&nbsp; Email ID: principal-dscasc@dayanandasagar.edu &nbsp;&nbsp;&nbsp; Website: www.dscasc.edu.in
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PRINT CSS STYLES */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #cover-letter-printable, #cover-letter-printable * {
            visibility: visible;
          }
          #cover-letter-printable {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            min-height: 100% !important;
            padding: 20px !important;
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: white !important;
            color: black !important;
          }
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
        }
      `}</style>
    </div>
  );
};

export default FacultyCoverLetter;
