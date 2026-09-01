import React from "react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { IndianRupee, Wallet, TrendingUp, CheckCircle2, AlertTriangle } from "lucide-react";
import { useFacultyBudget } from "@/hooks/use-dashboard-api";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface FacultyBudgetProps {
  allocated?: number;
  used?: number;
  clubName?: string;
}

const FacultyBudget: React.FC<FacultyBudgetProps> = ({ allocated, used, clubName }) => {
  // If props are passed (like in FacultyDashboard)
  const isDirectProps = allocated !== undefined || used !== undefined;

  // Fallback query for Admin Dashboard view (Index.tsx)
  const { data: facultyData, isLoading: facultyLoading } = useFacultyBudget();

  if (isDirectProps) {
    const totalAllocated = Math.max(0, allocated ?? 0);
    const totalUsed = Math.max(0, used ?? 0);
    const remaining = Math.max(0, totalAllocated - totalUsed);
    const percent = totalAllocated > 0 ? Math.min(100, Math.round((totalUsed / totalAllocated) * 100)) : 0;

    let badgeVariant: "healthy" | "warning" | "critical" | "secondary" = "healthy";
    let badgeText = "Within Budget";

    if (totalAllocated === 0) {
      badgeVariant = "secondary";
      badgeText = "No Allocation";
    } else if (percent >= 90) {
      badgeVariant = "critical";
      badgeText = `${percent}% Used (Critical)`;
    } else if (percent >= 70) {
      badgeVariant = "warning";
      badgeText = `${percent}% Used (Warning)`;
    } else {
      badgeVariant = "healthy";
      badgeText = `${percent}% Used (Healthy)`;
    }

    return (
      <div className="space-y-6">
        {/* Header with Title and Status Badge */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-card-foreground">
                Club Budget & Expenditure
              </h3>
              <p className="text-xs text-muted-foreground">
                {clubName ? `${clubName} • ` : ""}Live allocation, event expenses, and remaining funds
              </p>
            </div>
          </div>

          <Badge variant={badgeVariant} className="self-start sm:self-auto px-3 py-1 text-xs">
            {badgeText}
          </Badge>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-medium">
            <span className="text-muted-foreground">Budget Consumption</span>
            <span className={percent >= 90 ? "text-status-critical font-bold" : percent >= 70 ? "text-status-warning font-bold" : "text-status-healthy font-bold"}>
              {percent}%
            </span>
          </div>
          <Progress value={percent} className="h-2.5" />
        </div>

        {/* Three Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Allocated */}
          <div className="p-4 rounded-xl border border-border bg-card/60 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">Allocated Budget</span>
              <IndianRupee className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-xl font-bold text-card-foreground">
              ₹{totalAllocated.toLocaleString("en-IN")}
            </p>
            <p className="text-[11px] text-muted-foreground">Annual operational cap</p>
          </div>

          {/* Card 2: Spent */}
          <div className="p-4 rounded-xl border border-border bg-card/60 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">Budget Used</span>
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <p className="text-xl font-bold text-card-foreground">
              ₹{totalUsed.toLocaleString("en-IN")}
            </p>
            <p className="text-[11px] text-muted-foreground">Approved event expenses</p>
          </div>

          {/* Card 3: Remaining */}
          <div className="p-4 rounded-xl border border-border bg-card/60 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">Remaining Balance</span>
              {remaining > 0 ? (
                <CheckCircle2 className="h-4 w-4 text-status-healthy" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-status-critical" />
              )}
            </div>
            <p className={`text-xl font-bold ${remaining > 0 ? "text-status-healthy" : "text-status-critical"}`}>
              ₹{remaining.toLocaleString("en-IN")}
            </p>
            <p className="text-[11px] text-muted-foreground">Available for new proposals</p>
          </div>
        </div>
      </div>
    );
  }

  // Admin View (Standalone on Index.tsx)
  return (
    <Card className="shadow-card mt-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <IndianRupee className="h-4 w-4" />
          Faculty Budget Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        {facultyLoading ? (
          <Skeleton className="h-20 w-full rounded-lg" />
        ) : !facultyData || facultyData.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">No faculty budget records found.</p>
        ) : (
          <div className="space-y-3">
            {facultyData.map((item: any) => (
              <div key={item._id} className="flex items-center justify-between text-sm py-1 border-b border-border/50 last:border-0">
                <div>
                  <p className="font-medium text-card-foreground">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.totalEvents || 0} events organized</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-card-foreground">₹{(item.totalBudget || 0).toLocaleString("en-IN")}</p>
                  <p className="text-[10px] text-muted-foreground">Spent</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FacultyBudget;