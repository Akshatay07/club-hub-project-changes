import { useEffect, useMemo, useState } from "react";
import api from "@/api/api";
import { socket } from "@/lib/socket";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertCircle,
  CheckCircle2,
  Star,
  MessageSquare,
  Search,
  Trash2,
  Building2,
  User,
  Mail,
  Clock,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

export default function AdminComplaints() {
  const [complaints, setComplaints] = useState<any[]>([]);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loadingComplaints, setLoadingComplaints] = useState(true);
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(true);
  const [search, setSearch] = useState("");

  const { toast } = useToast();

  useEffect(() => {
    fetchComplaints();
    fetchFeedbacks();

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

  const filteredComplaints = useMemo(() => {
    if (!search.trim()) return complaints;
    const q = search.toLowerCase();
    return complaints.filter(
      (c) =>
        c.content?.toLowerCase().includes(q) ||
        c.studentId?.name?.toLowerCase().includes(q) ||
        c.studentId?.email?.toLowerCase().includes(q) ||
        c.clubId?.name?.toLowerCase().includes(q)
    );
  }, [complaints, search]);

  const filteredFeedbacks = useMemo(() => {
    if (!search.trim()) return feedbacks;
    const q = search.toLowerCase();
    return feedbacks.filter(
      (f) =>
        f.comment?.toLowerCase().includes(q) ||
        f.studentId?.name?.toLowerCase().includes(q) ||
        f.clubId?.name?.toLowerCase().includes(q) ||
        f.eventId?.name?.toLowerCase().includes(q)
    );
  }, [feedbacks, search]);

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
            View student complaints and feedback reviews.
          </p>
        </div>

        {/* SEARCH */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs bg-card"
          />
        </div>
      </div>

      {/* TABS */}
      <Tabs defaultValue="complaints" className="space-y-4">
        <TabsList className="bg-muted p-1">
          <TabsTrigger value="complaints" className="gap-2 text-xs">
            <AlertCircle className="w-3.5 h-3.5" />
            Complaints ({complaints.length})
          </TabsTrigger>
          <TabsTrigger value="feedback" className="gap-2 text-xs">
            <Star className="w-3.5 h-3.5" />
            Feedback ({feedbacks.length})
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
                <p className="text-xs">There are no student complaints to display.</p>
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
                      <span className="text-[11px] text-muted-foreground">
                        {f.createdAt ? format(new Date(f.createdAt), "dd MMM yyyy") : "Recent"}
                      </span>
                    </div>

                    <p className="text-sm text-foreground italic">
                      {f.comment ? `"${f.comment}"` : "No comment provided."}
                    </p>

                    <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {f.studentId?.name || "Student"}
                      </span>
                      <span className="font-semibold text-primary">
                        {f.clubId?.name || f.eventId?.name || "General"}
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
                <p className="text-xs">There are no student feedback reviews yet.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
