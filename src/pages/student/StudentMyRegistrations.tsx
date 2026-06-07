import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Clock } from "lucide-react";
import { useMyRegistrations } from "@/hooks/use-dashboard-api";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";



const statusStyles: Record<string, string> = {
  registered: "bg-blue-100 text-blue-600",
  attended: "bg-green-100 text-green-600",
  absent: "bg-red-100 text-red-600",
  cancelled: "bg-gray-200 text-gray-600",
};

const StudentMyRegistrations = () => {
  const { data: registrations, isLoading } = useMyRegistrations();
  const [filter, setFilter] = useState("all");

  // ✅ filter logic
  const filteredData =
    filter === "all"
      ? registrations
      : registrations?.filter((r: any) => r.status === filter);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Registrations</h1>
        <p className="text-sm text-muted-foreground">
          Events you've registered for
        </p>
      </div>

      {/* ✅ FILTER BUTTONS */}
      <div className="flex gap-2 flex-wrap">
        {["all", "registered", "attended", "absent", "cancelled"].map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? "default" : "outline"}
            onClick={() => setFilter(f)}
            className="capitalize"
          >
            {f}
          </Button>
        ))}
      </div>

      {/* ✅ GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-lg" />
          ))
        ) : filteredData?.length ? (
          filteredData.map((reg: any, i: number) => {
            const event = reg.event || reg.eventId;

            return (
              <motion.div
                key={reg._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="shadow-card hover:shadow-card-hover transition-shadow">
                  <CardHeader className="pb-2 flex flex-row items-start justify-between">
                    <CardTitle className="text-base">
                      {event?.name || "Event not available"}
                    </CardTitle>

                    {/* ✅ STATUS BADGE */}
                    <Badge className={statusStyles[reg.status] || ""}>
                      {reg.status}
                    </Badge>
                  </CardHeader>

                  <CardContent className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      {event?.club || "Club"}
                    </p>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CalendarDays className="h-3.5 w-3.5" />
                      <span>{event?.date || "-"}</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{event?.time || "-"}</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })
        ) : (
          <p className="col-span-full text-center text-muted-foreground py-12">
            No registrations found.
          </p>
        )}
      </div>
    </div>
  );
};

export default StudentMyRegistrations;