import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { socket } from "@/lib/socket";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, CalendarDays, Clock, Download, FileText } from "lucide-react";
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

  const handleDownloadSheet = async (eventId: string, eventName: string) => {
    try {
      const res = await api.get(`/faculty/attendance/${eventId}/pdf`, {
        responseType: "blob",
      });
      const file = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(file);
      const a = document.createElement("a");
      a.href = url;
      a.download = `attendance-${eventName || "event"}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast({
        title: "Attendance Sheet Downloaded",
        description: `Blank printable attendance sheet ready for ${eventName}.`,
      });
    } catch (err: any) {
      toast({
        title: "Download Failed",
        description: err?.response?.data?.message || "Could not generate sheet",
        variant: "destructive",
      });
    }
  };

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

                  <Badge
                    variant={event.status as any}
                    className="capitalize"
                  >
                    {event.status}
                  </Badge>
                  {event.status === "approved" && (
  <p className="text-xs text-red-500 mt-1">Locked</p>
)}
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
                      onClick={() => handleDownloadSheet(event._id, event.name)}
                      title="Download printable attendance sheet"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Sheet
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
    </div>
  );
};

export default FacultyEvents;