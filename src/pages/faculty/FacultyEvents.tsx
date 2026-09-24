import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { socket } from "@/lib/socket";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus,
  Pencil,
  Trash2,
  CalendarDays,
  Clock,
  Download,
  FileText,
  Loader2,
  Info,
  MapPin,
} from "lucide-react";
import api from "@/api/api";
import { useFacultyEvents } from "@/hooks/use-dashboard-api";
import {
  useCreateEvent,
  useUpdateEvent,
  useDeleteEvent,
} from "@/hooks/use-mutations";
import { Skeleton } from "@/components/ui/skeleton";
import EventFormDialog from "@/components/dashboard/EventFormDialog";
import DeleteConfirmDialog from "@/components/dashboard/DeleteConfirmDialog";
import { useToast } from "@/hooks/use-toast";
import type { Event } from "@/types/api";
import { motion } from "framer-motion";

const statusDot: Record<string, string> = {
  approved: "bg-status-healthy",
  pending: "bg-status-warning",
  warning: "bg-status-critical",
};

const FacultyEvents = () => {
  const { data: events = [], isLoading } = useFacultyEvents();

  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const deleteEvent = useDeleteEvent();

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Blank Sheet Modal State
  const [isSheetModalOpen, setIsSheetModalOpen] = useState(false);
  const [sheetEvent, setSheetEvent] = useState<Event | null>(null);
  const [totalRows, setTotalRows] = useState<number>(30);
  const [rowsPerPage, setRowsPerPage] = useState<number>(25);
  const [isGeneratingSheet, setIsGeneratingSheet] = useState(false);

  // ✅ REAL-TIME SOCKET FIX (IMPORTANT)
  useEffect(() => {
    // CREATE
    socket.on("event:created", (newEvent) => {
      queryClient.setQueryData(["faculty-events"], (old: any) => {
        if (!old) return [newEvent];

        const exists = old.some((e: any) => e._id === newEvent._id);
        if (exists) return old; // ✅ PREVENT DUPLICATE

        return [newEvent, ...old];
      });
    });

    socket.on("event:updated", (updatedEvent) => {
      queryClient.setQueryData(["faculty-events"], (old: any) => {
        if (!old) return [updatedEvent];

        return old.map((e: any) =>
          e._id === updatedEvent._id ? updatedEvent : e
        );
      });
    });

    // DELETE
    socket.on("eventDeleted", (id) => {
      queryClient.setQueryData(["faculty-events"], (old: any) => {
        if (!old) return [];
        return old.filter((e: any) => e._id !== id);
      });
    });

    return () => {
      socket.off("event:created");
      socket.off("event:updated");
      socket.off("eventDeleted");
    };
  }, [queryClient]);

  const handleSubmit = (data: Partial<Event> & { id?: string }) => {
    const mutation = data.id ? updateEvent : createEvent;

    mutation.mutate(data as any, {
      onSuccess: () => {
        setFormOpen(false);
        setEditingEvent(null);
        toast({
          title: data.id ? "Event updated" : "Event created",
        });
      },
      onError: (err: any) =>
        toast({
          title: "Error",
          description: err.response?.data?.message || "Failed",
          variant: "destructive",
        }),
    });
  };

  const handleDelete = () => {
    if (!deletingId) return;

    deleteEvent.mutate(deletingId, {
      onSuccess: () => {
        setDeleteOpen(false);
        setDeletingId(null);
        toast({ title: "Event deleted" });
      },
      onError: (err: any) =>
        toast({
          title: "Error",
          description: err.response?.data?.message || "Failed",
          variant: "destructive",
        }),
    });
  };

  const handleOpenSheetModal = (event: Event) => {
    setSheetEvent(event);
    setTotalRows(
      event.maxCapacity && event.maxCapacity > 0
        ? Math.min(event.maxCapacity, 100)
        : 30
    );
    setRowsPerPage(25);
    setIsSheetModalOpen(true);
  };

  const handleDownloadBlankPDF = async () => {
    if (!sheetEvent) return;

    try {
      setIsGeneratingSheet(true);
      const rows = totalRows || 30;
      const perPage = rowsPerPage || 25;

      const res = await api.get(
        `/faculty/attendance/${sheetEvent._id}/pdf?rows=${rows}&rowsPerPage=${perPage}`,
        { responseType: "blob" }
      );

      const file = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(file);
      const a = document.createElement("a");
      a.href = url;
      a.download = `attendance-${sheetEvent.name || "event"}-blank.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setIsSheetModalOpen(false);
      toast({
        title: "Blank Attendance Sheet Ready",
        description: `Downloaded blank sheet with ${rows} rows (${perPage} rows/page) for ${sheetEvent.name}.`,
      });
    } catch (err: any) {
      toast({
        title: "Download Failed",
        description: err?.response?.data?.message || "Could not generate sheet",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingSheet(false);
    }
  };

  const handleDownloadFeedbackPDF = async (event: any) => {
    try {
      let res;
      try {
        res = await api.get(`/events/${event._id}/feedback-pdf`, {
          responseType: "blob",
        });
      } catch {
        res = await api.get(`/faculty/events/${event._id}/feedback-pdf`, {
          responseType: "blob",
        });
      }

      if (res.data.type === "application/json") {
        const text = await res.data.text();
        const json = JSON.parse(text);
        throw new Error(json.message || "Failed to generate feedback form");
      }

      const file = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(file);
      const a = document.createElement("a");
      a.href = url;
      a.download = `feedback-form-${(event.name || "event").replace(/[^a-zA-Z0-9-_]/g, "_")}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Feedback Form Downloaded",
        description: `Downloaded blank student feedback form for ${event.name}.`,
      });
    } catch (err: any) {
      toast({
        title: "Download Failed",
        description: err?.message || err?.response?.data?.message || "Could not generate feedback form",
        variant: "destructive",
      });
    }
  };

  const calculatedPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Club Events
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage events for your club
          </p>
        </div>

        <Button
          className="gap-2 bg-gradient-primary border-0 hover:opacity-90"
          onClick={() => {
            setEditingEvent(null);
            setFormOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Add Event
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))
        ) : events.length ? (
          events.map((event, i) => (
            <motion.div
              key={event._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="shadow-card">
                <CardHeader className="pb-2 flex flex-row items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${statusDot[event.status]}`}
                    />
                    <CardTitle className="text-base">
                      {event.name}
                    </CardTitle>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <Badge
                      variant={event.status as any}
                      className="capitalize"
                    >
                      {event.status}
                    </Badge>
                    {event.status === "approved" ? (
                      <p className="text-xs text-red-500 font-medium">Locked</p>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/30 font-medium whitespace-nowrap">
                        Stage: {event.approvalStage || "Event Coordinators"}
                      </span>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {event.date}
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    {event.time}
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 gap-1"
                      disabled={event.status === "approved"}
                      onClick={() => {
                        if (event.status === "approved") return;
                        setEditingEvent(event);
                        setFormOpen(true);
                      }}
                    >
                      <Pencil className="h-3 w-3" />
                      Edit
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 text-primary hover:bg-primary/5 border-primary/30"
                      onClick={() => handleOpenSheetModal(event)}
                      title="Download blank printable attendance sheet"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Sheet
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 text-emerald-600 hover:bg-emerald-500/10 border-emerald-500/30"
                      onClick={() => handleDownloadFeedbackPDF(event)}
                      title="Download blank printable student feedback form"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      Feedback
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 text-destructive hover:text-destructive"
                      onClick={() => {
                        setDeletingId(event._id);
                        setDeleteOpen(true);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        ) : (
          <p className="col-span-full text-center text-muted-foreground py-12">
            No events yet. Create one!
          </p>
        )}
      </div>

      <EventFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        event={editingEvent}
        onSubmit={handleSubmit}
        isLoading={createEvent.isPending || updateEvent.isPending}
      />

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Event"
        description="Are you sure? This cannot be undone."
        onConfirm={handleDelete}
        isLoading={deleteEvent.isPending}
      />

      {/* ================= MODAL: DOWNLOAD BLANK ATTENDANCE SHEET ================= */}
      <Dialog open={isSheetModalOpen} onOpenChange={setIsSheetModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="w-5 h-5 text-primary" />
              Download Event Attendance Sheet
            </DialogTitle>
            <DialogDescription>
              Generate a printable blank attendance ledger with Event Name, Date, Sl No, and blank Student Name, Registration Number, and Signature columns.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Event Details Box */}
            <div className="p-3 bg-muted/40 border rounded-lg text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Event:</span>
                <span className="font-semibold text-foreground">{sheetEvent?.name || "Selected Event"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date:</span>
                <span className="font-semibold text-foreground">{sheetEvent?.date || "—"}</span>
              </div>
              {sheetEvent?.venue && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Venue:</span>
                  <span className="font-semibold text-foreground">{sheetEvent.venue}</span>
                </div>
              )}
            </div>

            {/* Total Student Rows Configuration */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Total Number of Student Rows</Label>
                <span className="text-xs text-primary font-medium">{totalRows} rows total</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[25, 30, 50, 100].map((count) => (
                  <Button
                    key={count}
                    type="button"
                    variant={totalRows === count ? "default" : "outline"}
                    size="sm"
                    className="text-xs"
                    onClick={() => setTotalRows(count)}
                  >
                    {count} Rows
                  </Button>
                ))}
              </div>

              <div className="pt-1 flex items-center gap-2">
                <Label htmlFor="customTotalRows" className="text-xs text-muted-foreground whitespace-nowrap">
                  Custom total count:
                </Label>
                <Input
                  id="customTotalRows"
                  type="number"
                  min={1}
                  max={500}
                  value={totalRows}
                  onChange={(e) => setTotalRows(Math.max(1, parseInt(e.target.value) || 1))}
                  className="h-8 text-xs w-24"
                />
                <span className="text-xs text-muted-foreground">rows</span>
              </div>
            </div>

            {/* Rows Per Page Configuration */}
            <div className="space-y-2 border-t pt-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Rows Per Page</Label>
                <span className="text-xs text-muted-foreground">
                  Generates <strong className="text-foreground">{calculatedPages} page{calculatedPages > 1 ? "s" : ""}</strong>
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[15, 20, 25, 30].map((perPage) => (
                  <Button
                    key={perPage}
                    type="button"
                    variant={rowsPerPage === perPage ? "default" : "outline"}
                    size="sm"
                    className="text-xs"
                    onClick={() => setRowsPerPage(perPage)}
                  >
                    {perPage} / Page
                  </Button>
                ))}
              </div>

              <div className="pt-1 flex items-center gap-2">
                <Label htmlFor="customRowsPerPage" className="text-xs text-muted-foreground whitespace-nowrap">
                  Custom rows per page:
                </Label>
                <Input
                  id="customRowsPerPage"
                  type="number"
                  min={5}
                  max={50}
                  value={rowsPerPage}
                  onChange={(e) => setRowsPerPage(Math.min(50, Math.max(5, parseInt(e.target.value) || 5)))}
                  className="h-8 text-xs w-24"
                />
                <span className="text-xs text-muted-foreground">per page</span>
              </div>
            </div>

            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg text-xs flex items-start gap-2 text-muted-foreground">
              <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <span>
                The blank PDF is formatted with official college headers, numbered rows, signature columns, and faculty verification footers across {calculatedPages} page{calculatedPages > 1 ? "s" : ""}.
              </span>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsSheetModalOpen(false)}
              disabled={isGeneratingSheet}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleDownloadBlankPDF}
              disabled={isGeneratingSheet}
              className="gap-2 bg-gradient-primary"
            >
              {isGeneratingSheet ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating PDF...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Download PDF ({totalRows} Rows • {calculatedPages} Pg)
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FacultyEvents;