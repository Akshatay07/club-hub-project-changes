import { useEffect, useState } from "react";
import api from "@/lib/api";
import { jsPDF } from "jspdf";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Input } from "@/components/ui/input";

import { Button } from "@/components/ui/button";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { FileText, Download } from "lucide-react";

export default function AdminReports() {
  const [reports, setReports] = useState<any[]>([]);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const res = await api.get("/events/submitted-reports");
      setReports(res.data);
    } catch (err) {
      console.error("Failed to load reports:", err);
    }
  };

  const filteredReports = reports.filter((report) =>
    report.name?.toLowerCase().includes(search.toLowerCase())
  );

  const downloadPDF = (report: any) => {
    const doc = new jsPDF();

    let y = 20;

    doc.setFontSize(18);
    doc.text("COLLEGE CLUB REPORT", 20, y);

    y += 15;

    doc.setFontSize(12);

    doc.text(`Event Name: ${report.name || ""}`, 20, y);
    y += 10;

    doc.text(`Department: ${report.department || ""}`, 20, y);
    y += 10;

    doc.text(`Event Type: ${report.type || ""}`, 20, y);
    y += 10;

    doc.text(`Date: ${report.date || ""}`, 20, y);
    y += 10;

    doc.text(`Venue: ${report.venue || ""}`, 20, y);
    y += 10;

    doc.text(
      `Resource Person: ${report.resourcePerson?.name || ""}`,
      20,
      y
    );
    y += 10;

    doc.text(
      `Organization: ${report.resourcePerson?.organization || ""}`,
      20,
      y
    );
    y += 10;

    doc.text(
      `Faculty Coordinator: ${report.facultyCoordinator || ""}`,
      20,
      y
    );
    y += 10;

    doc.text(
      `Student Coordinator: ${report.studentCoordinator || ""}`,
      20,
      y
    );
    y += 15;

    doc.text("Topics Covered:", 20, y);
    y += 8;

    const topics = doc.splitTextToSize(
      report.topicsCovered || "",
      170
    );

    doc.text(topics, 20, y);

    y += topics.length * 7 + 10;

    doc.text("Agenda:", 20, y);
    y += 8;

    const agenda = doc.splitTextToSize(
      report.agenda || "",
      170
    );

    doc.text(agenda, 20, y);

    y += agenda.length * 7 + 10;

    doc.text("Summary:", 20, y);
    y += 8;

    const summary = doc.splitTextToSize(
      report.summary || "",
      170
    );

    doc.text(summary, 20, y);

    doc.save(`${report.name}-Report.pdf`);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">
            Submitted Reports
          </h1>

          <p className="text-muted-foreground">
            {reports.length} reports submitted
          </p>
        </div>

        <Input
          placeholder="Search reports..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Reports</CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          {filteredReports.length > 0 ? (
            filteredReports.map((report) => (
              <div
                key={report._id}
                className="flex items-center justify-between border rounded-lg p-4"
              >
                <div>
                  <h3 className="font-semibold text-lg">
                    {report.name}
                  </h3>

                  <p className="text-sm text-muted-foreground">
                    {report.clubId?.name} •{" "}
                    {report.facultyId?.name}
                  </p>

                  <p className="text-xs text-muted-foreground">
                    {report.date}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() =>
                      setSelectedReport(report)
                    }
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    View
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      downloadPDF(report)
                    }
                  >
                    <Download className="h-4 w-4 mr-2" />
                    PDF
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-muted-foreground py-10">
              No reports found
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={!!selectedReport}
        onOpenChange={() =>
          setSelectedReport(null)
        }
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedReport?.name}
            </DialogTitle>
          </DialogHeader>

          {selectedReport && (
            <div className="space-y-4">
              <p>
                <strong>Department:</strong>{" "}
                {selectedReport.department}
              </p>

              <p>
                <strong>Event Type:</strong>{" "}
                {selectedReport.type}
              </p>

              <p>
                <strong>Date:</strong>{" "}
                {selectedReport.date}
              </p>

              <p>
                <strong>Venue:</strong>{" "}
                {selectedReport.venue}
              </p>

              <p>
                <strong>Resource Person:</strong>{" "}
                {selectedReport.resourcePerson?.name}
              </p>

              <p>
                <strong>Organization:</strong>{" "}
                {selectedReport.resourcePerson?.organization}
              </p>

              <p>
                <strong>Faculty Coordinator:</strong>{" "}
                {selectedReport.facultyCoordinator}
              </p>

              <p>
                <strong>Student Coordinator:</strong>{" "}
                {selectedReport.studentCoordinator}
              </p>

              <div>
                <h3 className="font-semibold mb-2">
                  Topics Covered
                </h3>
                <p>{selectedReport.topicsCovered}</p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">
                  Agenda
                </h3>
                <p>{selectedReport.agenda}</p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">
                  Summary
                </h3>
                <p>{selectedReport.summary}</p>
              </div>

              <Button
                onClick={() =>
                  downloadPDF(selectedReport)
                }
              >
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}