import { useEffect, useMemo, useState } from "react";
import api from "@/api/api";
import { socket } from "@/lib/socket";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertCircle,
  CheckCircle2,
  Star,
  MessageSquare,
  Search,
  Trash2,
  Building2,
  Calendar,
  User,
  Mail,
  Sparkles,
  FilterX,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

export default function AdminComplaints() {
  const [complaints, setComplaints] = useState<any[]>([]);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [clubs, setClubs] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loadingComplaints, setLoadingComplaints] = useState(true);
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(true);

  // Filter Dropdowns State
  const [filterClubId, setFilterClubId] = useState<string>("all");
  const [filterEventId, setFilterEventId] = useState<string>("all");
  const [search, setSearch] = useState("");

  const { toast } = useToast();

  useEffect(() => {
    fetchComplaints();
    fetchFeedbacks();
    fetchClubs();
    fetchEvents();

    socket.on("complaint:new", (newC) => {
      setComplaints((prev) => [newC, ...prev]);
      toast({
        title: "New Student Complaint",
        description: `New complaint received from ${newC.studentId?.name || "Student"}.`,
      });
    });

    socket.on("complaint:updated", (updated) => {
      setComplaints((prev) =>
        prev.map((c) => (c._id === updated._id ? { ...c, ...updated } : c))
      );
    });

    socket.on("complaint:deleted", (id) => {
      setComplaints((prev) => prev.filter((c) => c._id !== id));
    });

    return () => {
      socket.off("complaint:new");
      socket.off("complaint:updated");
      socket.off("complaint:deleted");
    };
  }, []);

  const fetchComplaints = async () => {
    try {
      setLoadingComplaints(true);
      const res = await api.get("/complaints");
      setComplaints(res.data || []);
    } catch (err) {
      console.error("Failed to load complaints:", err);
    } finally {
      setLoadingComplaints(false);
    }
  };

  const fetchFeedbacks = async () => {
    try {
      setLoadingFeedbacks(true);
      const res = await api.get("/feedback");
      setFeedbacks(res.data || []);
    } catch (err) {
      console.error("Failed to load feedback:", err);
    } finally {
      setLoadingFeedbacks(false);
    }
  };

  const fetchClubs = async () => {
    try {
      const res = await api.get("/clubs");
      setClubs(res.data || []);
    } catch (err) {
      console.error("Failed to load clubs:", err);
    }
  };

  const fetchEvents = async () => {
    try {
      const res = await api.get("/events");
      setEvents(res.data || []);
    } catch (err) {
      console.error("Failed to load events:", err);
    }
  };

  /* ================= AVAILABLE EVENTS BASED ON SELECTED CLUB ================= */
  const availableEvents = useMemo(() => {
    if (filterClubId === "all") return events;
    return events.filter((e) => {
      const clubId = typeof e.clubId === "object" ? e.clubId?._id : e.clubId;
      return clubId === filterClubId;
    });
  }, [events, filterClubId]);

  const handleClubChange = (clubId: string) => {
    setFilterClubId(clubId);
    if (clubId !== "all") {
      const isEventInClub = events.some((e) => {
        const eClubId = typeof e.clubId === "object" ? e.clubId?._id : e.clubId;
        return e._id === filterEventId && eClubId === clubId;
      });
      if (!isEventInClub) {
        setFilterEventId("all");
      }
    }
  };

  const handleResetFilters = () => {
    setFilterClubId("all");
    setFilterEventId("all");
    setSearch("");
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "resolved" ? "open" : "resolved";
    try {
      await api.patch(`/complaints/${id}/status`, { status: newStatus });
      setComplaints((prev) =>
        prev.map((c) => (c._id === id ? { ...c, status: newStatus } : c))
      );
      toast({
        title: newStatus === "resolved" ? "Complaint Resolved" : "Complaint Reopened",
        description: `Marked as ${newStatus}.`,
      });
    } catch (err: any) {
      toast({
        title: "Update Failed",
        description: err.response?.data?.message || "Could not update status",
        variant: "destructive",
      });
    }
  };

  const handleDeleteComplaint = async (id: string) => {
    if (!window.confirm("Delete this complaint?")) return;
    try {
      await api.delete(`/complaints/${id}`);
      setComplaints((prev) => prev.filter((c) => c._id !== id));
      toast({ title: "Complaint deleted" });
    } catch (err: any) {
      toast({
        title: "Delete Failed",
        description: err.response?.data?.message || "Could not delete complaint",
        variant: "destructive",
      });
    }
  };

  const handleDeleteFeedback = async (id: string) => {
    if (!window.confirm("Delete this feedback review?")) return;
    try {
      await api.delete(`/feedback/${id}`);
      setFeedbacks((prev) => prev.filter((f) => f._id !== id));
      toast({ title: "Feedback review deleted" });
    } catch (err: any) {
      toast({
        title: "Delete Failed",
        description: err.response?.data?.message || "Could not delete feedback",
        variant: "destructive",
      });
    }
  };

  /* ================= FILTERED DATA COMPUTATION ================= */

  const filteredComplaints = useMemo(() => {
    return complaints.filter((c) => {
      // 1. Club filter check
      if (filterClubId !== "all") {
        const cClubId = typeof c.clubId === "object" ? c.clubId?._id : c.clubId;
        if (cClubId !== filterClubId) return false;
      }

      // 2. Search check
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesContent = c.content?.toLowerCase().includes(q) || c.message?.toLowerCase().includes(q);
        const matchesStudent = c.studentId?.name?.toLowerCase().includes(q) || c.studentId?.email?.toLowerCase().includes(q);
        const matchesClub = c.clubId?.name?.toLowerCase().includes(q);
        if (!matchesContent && !matchesStudent && !matchesClub) return false;
      }

      return true;
    });
  }, [complaints, filterClubId, search]);

  const filteredFeedbacks = useMemo(() => {
    return feedbacks.filter((f) => {
      // 1. Club filter check
      if (filterClubId !== "all") {
        const fClubId = typeof f.clubId === "object" ? f.clubId?._id : f.clubId;
        const fEventClubId = typeof f.eventId?.clubId === "object" ? f.eventId?.clubId?._id : f.eventId?.clubId;
        if (fClubId !== filterClubId && fEventClubId !== filterClubId) return false;
      }

      // 2. Event filter check
      if (filterEventId !== "all") {
        const fEventId = typeof f.eventId === "object" ? f.eventId?._id : f.eventId;
        if (fEventId !== filterEventId) return false;
      }

      // 3. Search check
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesComment = f.comment?.toLowerCase().includes(q);
        const matchesStudent = f.studentId?.name?.toLowerCase().includes(q);
        const matchesClub = f.clubId?.name?.toLowerCase().includes(q);
        const matchesEvent = f.eventId?.name?.toLowerCase().includes(q);
        if (!matchesComment && !matchesStudent && !matchesClub && !matchesEvent) return false;
      }

      return true;
    });
  }, [feedbacks, filterClubId, filterEventId, search]);

  const selectedClubName = useMemo(() => {
    if (filterClubId === "all") return null;
    return clubs.find((c) => c._id === filterClubId)?.name || "Selected Club";
  }, [clubs, filterClubId]);

  const selectedEventName = useMemo(() => {
    if (filterEventId === "all") return null;
    return events.find((e) => e._id === filterEventId)?.name || "Selected Event";
  }, [events, filterEventId]);

  const averageRating = useMemo(() => {
    if (!filteredFeedbacks.length) return "0.0";
    const sum = filteredFeedbacks.reduce((acc, f) => acc + (f.rating || 5), 0);
    return (sum / filteredFeedbacks.length).toFixed(1);
  }, [filteredFeedbacks]);

  const renderStars = (rating: number = 0) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star
            key={s}
            className={`w-3.5 h-3.5 ${
              s <= rating
                ? "text-amber-400 fill-amber-400"
                : "text-muted-foreground/30"
            }`}
          />
        ))}
      </div>
    );
  };

  const formatTimestamp = (dateStr: string) => {
    if (!dateStr) return "Recently";
    try {
      const d = new Date(dateStr);
      return `${formatDistanceToNow(d, { addSuffix: true })} (${format(d, "dd MMM yyyy, hh:mm a")})`;
    } catch {
      return "Recently";
    }
  };

  const isFilterActive = filterClubId !== "all" || filterEventId !== "all" || search.trim() !== "";

  return (
    <div className="p-6 space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-primary" />
            Complaints & Feedback
          </h1>
          <p className="text-sm text-muted-foreground">
            Filter student complaints and feedback reviews by selecting specific clubs and events below.
          </p>
        </div>
      </div>

      {/* ================= FILTER PANEL (2 DROPDOWNS + SEARCH) ================= */}
      <Card className="border border-border/80 bg-card shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <Building2 className="w-4 h-4 text-primary" />
            Select Club & Event to Filter Data
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* DROPDOWN 1: SELECT CLUB */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-primary" />
                Select Club
              </Label>
              <Select value={filterClubId} onValueChange={handleClubChange}>
                <SelectTrigger className="h-9 text-xs bg-background">
                  <SelectValue placeholder="All Clubs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clubs</SelectItem>
                  {clubs.map((c) => (
                    <SelectItem key={c._id} value={c._id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* DROPDOWN 2: SELECT EVENT */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                Select Event Name
              </Label>
              <Select value={filterEventId} onValueChange={setFilterEventId}>
                <SelectTrigger className="h-9 text-xs bg-background">
                  <SelectValue placeholder="All Events" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {filterClubId === "all" ? "All Events" : `All Events in ${selectedClubName}`}
                  </SelectItem>
                  {availableEvents.map((e) => (
                    <SelectItem key={e._id} value={e._id}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* SEARCH INPUT */}
            <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
              <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-muted-foreground" />
                Search Text
              </Label>
              <div className="relative">
                <Input
                  placeholder="Search by name, text, club..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 text-xs pl-8 bg-background"
                />
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
              </div>
            </div>
          </div>

          {/* ACTIVE FILTER BADGES & RESET */}
          {isFilterActive && (
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/50 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground font-medium">Active Filters:</span>
                {selectedClubName && (
                  <Badge variant="secondary" className="text-[11px] gap-1">
                    <Building2 className="w-3 h-3" />
                    Club: {selectedClubName}
                  </Badge>
                )}
                {selectedEventName && (
                  <Badge variant="secondary" className="text-[11px] gap-1 bg-primary/10 text-primary border border-primary/20">
                    <Calendar className="w-3 h-3" />
                    Event: {selectedEventName}
                  </Badge>
                )}
                {search && (
                  <Badge variant="outline" className="text-[11px]">
                    Query: "{search}"
                  </Badge>
                )}
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1 px-2"
              >
                <FilterX className="w-3.5 h-3.5" />
                Reset Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ================= SUMMARY STATS BANNER ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="bg-card border border-border/70 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Complaints Found</p>
              <p className="text-2xl font-bold text-foreground mt-0.5">{filteredComplaints.length}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
              <AlertCircle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border border-border/70 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Feedback Reviews</p>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-2xl font-bold text-foreground">{filteredFeedbacks.length}</p>
                <span className="text-xs font-semibold text-amber-400">({averageRating} ★)</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Star className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border border-border/70 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Current Scope</p>
              <p className="text-sm font-semibold text-foreground truncate max-w-[180px] mt-1">
                {selectedEventName || selectedClubName || "All Clubs & Events"}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* TABS */}
      <Tabs defaultValue="complaints" className="space-y-4">
        <TabsList className="bg-muted p-1">
          <TabsTrigger value="complaints" className="gap-2 text-xs">
            <AlertCircle className="w-3.5 h-3.5" />
            Complaints ({filteredComplaints.length})
          </TabsTrigger>
          <TabsTrigger value="feedback" className="gap-2 text-xs">
            <Star className="w-3.5 h-3.5" />
            Feedback ({filteredFeedbacks.length})
          </TabsTrigger>
        </TabsList>

        {/* ================= TAB 1: COMPLAINTS ================= */}
        <TabsContent value="complaints" className="space-y-3">
          {loadingComplaints ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))
          ) : filteredComplaints.length > 0 ? (
            filteredComplaints.map((c) => {
              const isResolved = c.status === "resolved";

              return (
                <Card
                  key={c._id}
                  className="shadow-sm border border-border/70 hover:border-border transition-colors bg-card"
                >
                  <CardContent className="p-4 space-y-3">
                    {/* Top row: Club & Date */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        {c.clubId && (
                          <span className="font-semibold text-primary flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5" />
                            {c.clubId.name}
                          </span>
                        )}
                        <Badge
                          variant={isResolved ? "default" : "secondary"}
                          className={`text-[11px] px-2 py-0.5 font-medium ${
                            isResolved
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                              : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                          }`}
                        >
                          {isResolved ? "Resolved" : "Open"}
                        </Badge>
                      </div>

                      <span>{formatTimestamp(c.createdAt)}</span>
                    </div>

                    {/* Complaint Message */}
                    <p className="text-sm font-medium text-foreground whitespace-pre-wrap">
                      {c.content || c.message}
                    </p>

                    {/* Bottom row: Student info & Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs">
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-primary" />
                          <strong className="text-foreground">{c.studentId?.name || "Student"}</strong>
                        </span>
                        {c.studentId?.email && (
                          <span className="flex items-center gap-1 hidden sm:inline-flex">
                            <Mail className="w-3.5 h-3.5" />
                            {c.studentId.email}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleStatus(c._id, c.status || "open")}
                          className={`h-7 px-2.5 text-xs font-medium ${
                            isResolved
                              ? "border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                              : "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                          }`}
                        >
                          {isResolved ? "Reopen" : "Mark Resolved"}
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteComplaint(c._id)}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          title="Delete complaint"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <Card className="border border-border/70">
              <CardContent className="py-12 text-center text-muted-foreground space-y-1">
                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500/50 mb-2" />
                <p className="font-semibold text-sm">No complaints found</p>
                <p className="text-xs">
                  {isFilterActive
                    ? "No student complaints match the selected dropdown filters."
                    : "There are no student complaints to display."}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ================= TAB 2: FEEDBACK ================= */}
        <TabsContent value="feedback" className="space-y-3">
          {loadingFeedbacks ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))
          ) : filteredFeedbacks.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredFeedbacks.map((f) => (
                <Card
                  key={f._id}
                  className="shadow-sm border border-border/70 hover:border-border transition-colors bg-card"
                >
                  <CardContent className="p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      {renderStars(f.rating)}
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-muted-foreground">
                          {f.createdAt ? format(new Date(f.createdAt), "dd MMM yyyy") : "Recent"}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteFeedback(f._id)}
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                          title="Delete feedback"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>

                    <p className="text-sm text-foreground italic">
                      {f.comment ? `"${f.comment}"` : "No comment provided."}
                    </p>

                    <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {f.studentId?.name || "Student"}
                      </span>
                      <span className="font-semibold text-primary">
                        {f.eventId?.name || f.clubId?.name || "General"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border border-border/70">
              <CardContent className="py-12 text-center text-muted-foreground space-y-1">
                <Star className="w-8 h-8 mx-auto text-amber-400/50 mb-2" />
                <p className="font-semibold text-sm">No feedback reviews found</p>
                <p className="text-xs">
                  {isFilterActive
                    ? "No student feedback reviews match the selected dropdown filters."
                    : "There are no student feedback reviews yet."}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
