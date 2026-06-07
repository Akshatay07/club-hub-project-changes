import { Card, CardContent } from "@/components/ui/card";
import { useMyFeedback } from "@/hooks/use-dashboard-api";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { format } from "date-fns";

const FacultyFeedback = () => {
  const { data = [], isLoading } = useMyFeedback();

  // ✅ SAFE FILTER (avoid crash if undefined)
  const clubFeedback =
  data?.filter((f) => f.clubId) || [];

const eventFeedback =
  data?.filter((f) => f.eventId) || [];

  // ✅ SAFE STARS
  const renderStars = (rating: number = 0) => (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <span
          key={s}
          className={
            s <= rating
              ? "text-[hsl(var(--chart-4))]"
              : "text-muted-foreground/30"
          }
        >
          ★
        </span>
      ))}
    </span>
  );

  // ✅ SAFE DATE FORMAT
  const formatDate = (date: string) => {
    try {
      return format(new Date(date), "MMM d, yyyy");
    } catch {
      return "";
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Student Feedback</h1>
        <p className="text-sm text-muted-foreground">
          Reviews from students
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      ) : (
        <>
          {/* CLUB FEEDBACK */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Club Feedback</h2>

            {clubFeedback.length ? (
              clubFeedback.map((fb: any, i: number) => (
                <motion.div
                  key={fb._id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex justify-between">
                        <div>
                          <p className="font-medium text-sm">
{fb.clubId?.name || "Unknown Club"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {fb.comment || "No comment"}
                          </p>
                        </div>

                        <div className="text-right">
                          {renderStars(fb.rating)}
                          <p className="text-xs text-muted-foreground">
                            {formatDate(fb.createdAt)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No club feedback yet
              </p>
            )}
          </div>

          {/* EVENT FEEDBACK */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Event Feedback</h2>

            {eventFeedback.length ? (
              eventFeedback.map((fb: any, i: number) => (
                <motion.div
                  key={fb._id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex justify-between">
                        <div>
                          <p className="font-medium text-sm">
                            {fb.eventId?.name || "Unknown Event"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {fb.comment || "No comment"}
                          </p>
                        </div>

                        <div className="text-right">
                          {renderStars(fb.rating)}
                          <p className="text-xs text-muted-foreground">
                            {formatDate(fb.createdAt)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No event feedback yet
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default FacultyFeedback;