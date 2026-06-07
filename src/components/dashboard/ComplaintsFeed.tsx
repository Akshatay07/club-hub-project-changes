import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Star } from "lucide-react";
import { useComplaints } from "@/hooks/use-dashboard-api";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";

const ComplaintsFeed = () => {
  const { data: complaints, isLoading } = useComplaints();

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">
          Complaints & Feedback
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        {isLoading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))
        ) : Array.isArray(complaints) && complaints.length > 0 ? (
          complaints.map((c) => {
            const type = c?.type || "alert";
            const Icon =
  type === "rating-drop" ? Star : AlertTriangle;
            const iconColor =
              type === "rating-drop"
                ? "text-status-critical"
                : "text-status-warning";

            return (
              <div
                key={c._id}
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
              >
                <Icon className={`h-4 w-4 mt-0.5 ${iconColor}`} />

                <div className="flex-1 min-w-0">
                  <div>
  <p className="text-sm font-medium text-card-foreground">
    {c.message}
  </p>

  {c.comment && (
    <p className="text-xs text-muted-foreground mt-1">
      {c.comment}
    </p>
  )}
</div>

                  <p className="text-xs text-muted-foreground mt-0.5">
                    {c.createdAt
                      ? formatDistanceToNow(new Date(c.createdAt), {
                          addSuffix: true,
                        })
                      : "recently"}
                  </p>
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No complaints
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default ComplaintsFeed;