import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { socket } from "@/lib/socket";
import api from "@/api/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useClubs } from "@/hooks/use-dashboard-api";
import { useAuth } from "@/contexts/AuthContext";

const ClubsPage = () => {
  const { data: clubs = [], isLoading } = useClubs();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [showModal, setShowModal] = useState(false);
  const [clubName, setClubName] = useState("");
  const [loading, setLoading] = useState(false);

  // SOCKET
  useEffect(() => {
    socket.on("clubCreated", (newClub) => {
      queryClient.setQueryData(["clubs"], (old: any) =>
        old ? [...old, newClub] : [newClub]
      );
    });

    socket.on("clubUpdated", (updatedClub) => {
      queryClient.setQueryData(["clubs"], (old: any) =>
        old
          ? old.map((c: any) =>
              c._id === updatedClub._id ? updatedClub : c
            )
          : []
      );
    });

    socket.on("clubDeleted", (id) => {
      queryClient.setQueryData(["clubs"], (old: any) =>
        old ? old.filter((c: any) => c._id !== id) : []
      );
    });

    return () => {
      socket.off("clubCreated");
      socket.off("clubUpdated");
      socket.off("clubDeleted");
    };
  }, [queryClient]);

  // CREATE
  const handleCreateClub = async () => {
    if (!clubName.trim()) return;

    try {
      setLoading(true);
      const res = await api.post("/clubs", { name: clubName });

      queryClient.setQueryData(["clubs"], (old: any) =>
        old ? [...old, res.data] : [res.data]
      );

      setClubName("");
      setShowModal(false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // DELETE
  const handleDeleteClub = async (clubId: string) => {
    const confirmDelete = confirm("Delete this club?");
    if (!confirmDelete) return;

    try {
      await api.delete(`/clubs/${clubId}`);

      queryClient.setQueryData(["clubs"], (old: any) =>
        old ? old.filter((c: any) => c._id !== clubId) : []
      );
    } catch (err) {
      console.error(err);
    }
  };

  // JOIN / LEAVE
  const handleJoin = async (clubId: string) => {
    try {
      await api.post(`/clubs/${clubId}/join`);
    } catch (err) {
      console.error(err);
    }
  };0

  const handleLeave = async (clubId: string) => {
    try {
      await api.post(`/clubs/${clubId}/leave`);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-6 space-y-6">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Clubs</h1>

        {user?.role === "admin" && (
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow"
          >
            + Create Club
          </button>
        )}
      </div>

      {/* STATS */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white shadow rounded-xl p-4">
          <p className="text-sm text-gray-500">Total Clubs</p>
          <p className="text-2xl font-bold">{clubs.length}</p>
        </div>

        <div className="bg-white shadow rounded-xl p-4">
          <p className="text-sm text-gray-500">Assigned</p>
          <p className="text-2xl font-bold">
            {clubs.filter((c: any) => c.facultyIds?.length).length}
          </p>
        </div>

        <div className="bg-white shadow rounded-xl p-4">
          <p className="text-sm text-gray-500">Unassigned</p>
          <p className="text-2xl font-bold">
            {clubs.filter((c: any) => !c.facultyIds?.length).length}
          </p>
        </div>
      </div>

      {/* CLUB LIST */}
      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {clubs.map((club: any) => {
            const isJoined = club.members?.includes(user?._id);

            return (
              <Card
                key={club._id}
                className="hover:shadow-lg transition rounded-xl border"
              >
                {/* HEADER WITH BADGE */}
                <CardHeader className="flex items-center justify-between pb-2">
                  <CardTitle className="text-lg">{club.name}</CardTitle>

                  {isJoined && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                      Joined
                    </span>
                  )}
                </CardHeader>

                <CardContent className="space-y-2">
                  <p className="text-sm text-gray-600">
                    Members:{" "}
                    <span className="font-medium">
                      {club.membersCount ?? 0}
                    </span>
                  </p>

                  <p className="text-sm text-gray-600">
                    Status:{" "}
                    <span
                      className={`px-2 py-1 text-xs rounded ${
                        club.healthStatus === "healthy"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {club.healthStatus}
                    </span>
                  </p>

                  <p className="text-sm text-gray-600">
                    Faculty:{" "}
                    <span className="font-medium">
                      {club.facultyIds?.length
                        ? club.facultyIds[0].name
                        : "Not Assigned"}
                    </span>
                  </p>

                  {/* STUDENT ACTIONS */}
                  {user?.role === "student" && (
                    <div className="flex gap-2 mt-2">
                      {!isJoined ? (
                        <button
                          onClick={() => handleJoin(club._id)}
                          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                        >
                          Join
                        </button>
                      ) : (
                        <button
                          onClick={() => handleLeave(club._id)}
                          className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm"
                        >
                          Leave
                        </button>
                      )}
                    </div>
                  )}

                  {/* ADMIN DELETE */}
                  {user?.role === "admin" && (
                    <button
                      onClick={() => handleDeleteClub(club._id)}
                      className="mt-3 w-full bg-red-50 hover:bg-red-100 text-red-600 py-2 rounded-lg text-sm"
                    >
                      Delete Club
                    </button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white p-6 rounded-xl w-[350px] shadow-lg space-y-4">
            <h2 className="text-lg font-semibold">Create Club</h2>

            <input
              value={clubName}
              onChange={(e) => setClubName(e.target.value)}
              placeholder="Enter club name"
              className="w-full border px-3 py-2 rounded"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded bg-gray-200"
              >
                Cancel
              </button>

              <button
                onClick={handleCreateClub}
                disabled={loading}
                className="px-4 py-2 rounded bg-blue-600 text-white"
              >
                {loading ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClubsPage;