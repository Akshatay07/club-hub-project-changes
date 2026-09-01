import { useEffect, useMemo, useState } from "react";
import api from "@/api/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { socket } from "@/lib/socket";

const PAGE_SIZE = 5;

const EventsTable = () => {
  const [data, setData] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [club, setClub] = useState("all");
  const [date, setDate] = useState("");
  const [sort, setSort] = useState("latest");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);

  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState<any>(null);

  useEffect(() => {
    fetchEvents();

    socket.on("event:created", (event) => {
      setData((prev) => {
        const exists = prev.find((e) => e._id === event._id);
        if (exists) return prev;
        return [event, ...prev];
      });
    });

    socket.on("event:updated", (event) => {
      setData((prev) =>
        prev.map((e) => (e._id === event._id ? event : e))
      );
    });

    socket.on("eventDeleted", (id) => {
      setData((prev) => prev.filter((e) => e._id !== id));
    });

    return () => {
      socket.off("event:created");
      socket.off("event:updated");
      socket.off("eventDeleted");
    };
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, status, club, date]);

  const fetchEvents = async () => {
    try {
      const res = await api.get("/events");
      setData(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this event?")) return;
    await api.delete(`/events/${id}`);
    setData((prev) => prev.filter((e) => e._id !== id));
  };

  const handleBulkDelete = async () => {
    if (!window.confirm("Delete selected events?")) return;
    await Promise.all(selected.map((id) => api.delete(`/events/${id}`)));
    setData((prev) => prev.filter((e) => !selected.includes(e._id)));
    setSelected([]);
  };

  const handleStatusChange = async (id: string, newStatus: "approved" | "rejected") => {
    try {
      await api.put(`/admin/events/${id}/status`, { status: newStatus });
      setData((prev) =>
        prev.map((e) => (e._id === id ? { ...e, status: newStatus } : e))
      );
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const handleEditSave = async () => {
    try {
      if (editData.status === "approved") return;

      await api.put(`/events/${editData._id}`, editData);
      setEditOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const exportCSV = () => {
    const rows = data.map((e) => [
      e.name,
      e.clubName,
      e.facultyName,
      e.date,
      e.status,
    ]);

    const csv = [
      ["Name", "Club", "Faculty", "Date", "Status"],
      ...rows,
    ]
      .map((r) => r.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "events.csv";
    a.click();
  };

  const clubs = useMemo(() => {
    const set = new Set(data.map((e) => e.clubName));
    return ["all", ...Array.from(set)];
  }, [data]);

  const filtered = useMemo(() => {
    let result = [...data];

    result = result.filter((e) =>
      e.name.toLowerCase().includes(search.toLowerCase())
    );

    if (status !== "all") result = result.filter((e) => e.status === status);
    if (club !== "all") result = result.filter((e) => e.clubName === club);
    if (date) result = result.filter((e) => e.date === date);

    result.sort((a, b) =>
      sort === "latest"
        ? new Date(b.date).getTime() - new Date(a.date).getTime()
        : new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    return result;
  }, [data, search, status, club, date, sort]);

  const paginated = filtered.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  const getStatusColor = (s: string) => {
    if (s === "approved") return "bg-green-100 text-green-700";
    if (s === "pending") return "bg-yellow-100 text-yellow-700";
    if (s === "rejected") return "bg-red-100 text-red-700";
    return "bg-gray-100 text-gray-600";
  };

  return (
    <div className="p-4 space-y-4 border rounded-lg bg-card">

      {/* TOP BAR */}
      <div className="flex flex-wrap gap-3 justify-between">
        <Input
          placeholder="Search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-60"
        />

        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">Status</option>
          <option value="approved">Approved</option>
          <option value="pending">Pending</option>
          <option value="rejected">Rejected</option>
        </select>

        <select value={club} onChange={(e) => setClub(e.target.value)}>
          {clubs.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>

        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />

        <select value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="latest">Latest</option>
          <option value="oldest">Oldest</option>
        </select>

        <Button onClick={exportCSV}>Export CSV</Button>

        <Button variant="destructive" onClick={handleBulkDelete}>
          Delete ({selected.length})
        </Button>
      </div>

      {/* TABLE */}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th></th>
            <th>Name</th>
            <th>Club</th>
            <th>Faculty</th>
            <th>Date</th>
            <th>Status</th>
            <th>Brochure</th>
            <th></th>
          </tr>
        </thead>

        <tbody>
          {paginated.map((e) => (
            <tr key={e._id} className="border-b">
              <td>
                <input
                  type="checkbox"
                  checked={selected.includes(e._id)}
                  onChange={() =>
                    setSelected((prev) =>
                      prev.includes(e._id)
                        ? prev.filter((i) => i !== e._id)
                        : [...prev, e._id]
                    )
                  }
                />
              </td>

              <td className="space-y-1">
                <div>{e.name}</div>

                {e.attachments?.some(
                  (f: any) => f.label === "brochure" && !f.isDeleted
                ) && (
                  <a
                    href={`http://localhost:5000${
                      e.attachments.find(
                        (f: any) => f.label === "brochure" && !f.isDeleted
                      )?.url
                    }`}
                    target="_blank"
                    className="text-xs text-blue-500 underline"
                  >
                    View Brochure
                  </a>
                )}
              </td>

              <td>{e.clubName}</td>
              <td>{e.facultyName}</td>
              <td>{e.date}</td>

              <td>
                <div className="flex flex-col gap-1">
                  <Badge className={getStatusColor(e.status)}>
                    {e.status}
                  </Badge>

                  {e.status === "approved" && (
                    <span className="text-xs text-red-500">
                      Locked
                    </span>
                  )}
                </div>
              </td>

              <td>
                {e.attachments?.some(
                  (f: any) => f.label === "brochure" && !f.isDeleted
                ) && (
                  <a
                    href={`http://localhost:5000${
                      e.attachments.find(
                        (f: any) => f.label === "brochure" && !f.isDeleted
                      )?.url
                    }`}
                    target="_blank"
                    className="text-xs text-blue-500 underline"
                  >
                    View
                  </a>
                )}
              </td>

              <td className="flex items-center gap-2">
                {e.status === "pending" && (
                  <>
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm"
                      onClick={() => handleStatusChange(e._id, "approved")}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-500/40 text-red-500 hover:bg-red-500/10 font-medium"
                      onClick={() => handleStatusChange(e._id, "rejected")}
                    >
                      Reject
                    </Button>
                  </>
                )}

                <Button
                  size="sm"
                  disabled={e.status === "approved"}
                  className={
                    e.status === "approved"
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }
                  onClick={() => {
                    if (e.status === "approved") return;
                    setEditData(e);
                    setEditOpen(true);
                  }}
                >
                  Edit
                </Button>

                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDelete(e._id)}
                >
                  Delete
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* EDIT MODAL */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
          </DialogHeader>

          {editData && (
            <div className="space-y-3">
              <Input
                value={editData.type || ""}
                onChange={(e) =>
                  setEditData({ ...editData, type: e.target.value })
                }
              />

              <Input
                value={editData.date}
                onChange={(e) =>
                  setEditData({ ...editData, date: e.target.value })
                }
              />

              <Button onClick={handleEditSave}>Save</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EventsTable;