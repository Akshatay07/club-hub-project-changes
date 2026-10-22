import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Clock,
  MapPin,
  Target,
  DollarSign,
  FileText,
  UserCheck,
  ExternalLink,
  Sparkles,
  Layers,
  Image as ImageIcon,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface EventDetailModalProps {
  event: any | null;
  isOpen: boolean;
  onClose: () => void;
  clubName?: string;
}

export const EventDetailModal: React.FC<EventDetailModalProps> = ({
  event,
  isOpen,
  onClose,
  clubName,
}) => {
  const navigate = useNavigate();

  if (!isOpen || !event) return null;

  const totalAttendees = event.attendanceCount || 0;
  const internalFaculty = event.facultyParticipants?.internal ?? 0;
  const externalFaculty = event.facultyParticipants?.external ?? 0;
  const internalStudents = event.studentParticipants?.internal ?? 0;
  const externalStudents = event.studentParticipants?.external ?? 0;
  const totalFootfall =
    internalStudents + externalStudents + internalFaculty + externalFaculty || totalAttendees;

  const rawExp = event.totalExpenditure ?? event.budgetSpent ?? event.budgetApproved ?? 0;
  const expenditure = Number.isFinite(Number(rawExp)) ? Number(rawExp) : 0;

  const rawBudget = event.budgetApproved ?? event.budget ?? 0;
  const budget = Number.isFinite(Number(rawBudget)) ? Number(rawBudget) : 0;

  const hasPhotos = Array.isArray(event.eventPhotos) && event.eventPhotos.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="p-6 pb-4 border-b border-border bg-muted/20">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Badge variant="outline" className="font-semibold text-primary border-primary/30">
              {clubName || event.clubName || "Club Event"}
            </Badge>
            {event.type && (
              <Badge variant="secondary" className="bg-secondary/70">
                {event.type}
              </Badge>
            )}
            <Badge
              className={
                event.status === "approved"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                  : event.status === "pending"
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                  : "bg-muted text-muted-foreground"
              }
              variant="outline"
            >
              {event.status ? String(event.status).toUpperCase() : "SCHEDULED"}
            </Badge>
            {event.reportApproved ? (
              <Badge className="bg-emerald-600 text-white text-xs">24-Point Report Approved</Badge>
            ) : event.reportSubmitted ? (
              <Badge className="bg-blue-600 text-white text-xs">Report Submitted</Badge>
            ) : (
              <Badge variant="outline" className="text-xs text-muted-foreground">Report In Draft</Badge>
            )}
          </div>
          <DialogTitle className="text-xl font-bold text-foreground">
            {event.name || "Event Details"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground flex flex-wrap items-center gap-4 mt-2">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-primary" />
              {event.date || "Date TBA"}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-primary" />
              {event.time} {event.endTime ? `– ${event.endTime}` : ""}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-primary" />
              {event.venue || event.location || "On Campus"}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 space-y-6 text-sm">
          {/* Aligned UN Sustainable Development Goals (SDG) */}
          {event.alignedSDG && (
            <div className="p-3.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
              <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Target className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Aligned UN Sustainable Development Goals (SDG)
              </h4>
              <div className="flex flex-wrap gap-2">
                {event.alignedSDG.split(",").map((item: string, idx: number) => {
                  const clean = item.trim();
                  if (!clean) return null;
                  return (
                    <Badge
                      key={idx}
                      variant="outline"
                      className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-xs py-1 px-2.5 font-medium"
                    >
                      {clean}
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}

          {/* Summary / Description */}
          <div>
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-primary" />
              Event Description & Objectives
            </h4>
            <div className="p-3.5 rounded-lg bg-muted/40 border border-border text-foreground/90 whitespace-pre-line leading-relaxed">
              {event.summary || event.description || "No description provided for this event."}
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-lg bg-card border border-border shadow-sm">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                <DollarSign className="w-3.5 h-3.5 text-amber-500" /> Expenditure
              </span>
              <p className="text-lg font-bold text-foreground mt-1">
                ₹{expenditure.toLocaleString("en-IN")}
              </p>
              <span className="text-[11px] text-muted-foreground">
                Approved Budget: ₹{budget.toLocaleString("en-IN")}
              </span>
            </div>

            <div className="p-3.5 rounded-lg bg-card border border-border shadow-sm">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                <Layers className="w-3.5 h-3.5 text-purple-500" /> Total Footfall
              </span>
              <p className="text-lg font-bold text-foreground mt-1">
                {totalFootfall}
              </p>
              <span className="text-[11px] text-muted-foreground">students & faculty</span>
            </div>
          </div>

          {/* Resource Persons & Experts */}
          <div className="p-4 rounded-lg bg-muted/20 border border-border">
            <h5 className="font-semibold text-foreground text-xs uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-primary" />
              Resource Persons & Experts
            </h5>
            {event.resourcePerson1?.name ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 rounded bg-background border border-border">
                  <p className="font-bold text-foreground">{event.resourcePerson1.name}</p>
                  <p className="text-muted-foreground">
                    {event.resourcePerson1.designation} • {event.resourcePerson1.organization}
                  </p>
                  {event.resourcePerson1Topics && (
                    <p className="text-[11px] text-primary mt-1">
                      Topic: {event.resourcePerson1Topics}
                    </p>
                  )}
                </div>
                {event.resourcePerson2?.name && event.resourcePerson2?.name !== "NA" && (
                  <div className="p-2.5 rounded bg-background border border-border">
                    <p className="font-bold text-foreground">{event.resourcePerson2.name}</p>
                    <p className="text-muted-foreground">
                      {event.resourcePerson2.designation} • {event.resourcePerson2.organization}
                    </p>
                    {event.resourcePerson2Topics && event.resourcePerson2Topics !== "NA" && (
                      <p className="text-[11px] text-primary mt-1">
                        Topic: {event.resourcePerson2Topics}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic py-3">
                Internal club mentors / faculty coordinators conducted this activity.
              </p>
            )}
          </div>

          {/* Coordinators & Approvals */}
          <div className="p-4 rounded-lg bg-muted/20 border border-border">
            <h5 className="font-semibold text-foreground text-xs uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-primary" />
              Event Coordinators & Signatories
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-muted-foreground block">Faculty Coordinator:</span>
                <span className="font-medium text-foreground">
                  {event.facultyCoordinator || "Assigned Faculty"}
                </span>
                {event.facultyCoordinatorDetails && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {event.facultyCoordinatorDetails}
                  </p>
                )}
              </div>
              <div>
                <span className="text-muted-foreground block">Student Coordinator:</span>
                <span className="font-medium text-foreground">
                  {event.studentCoordinator || "Club Lead"}
                </span>
                {event.studentCoordinatorDetails && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {event.studentCoordinatorDetails}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Event Photos Preview (if any) */}
          {hasPhotos && (
            <div>
              <h5 className="font-semibold text-foreground text-xs uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-primary" />
                Attached Photographs ({event.eventPhotos.length})
              </h5>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {event.eventPhotos.map((photo: any, idx: number) => (
                  <div
                    key={photo?._id || idx}
                    className="group relative rounded-lg border border-border overflow-hidden bg-muted/40"
                  >
                    <img
                      src={photo?.url}
                      alt={photo?.caption || `Event photo ${idx + 1}`}
                      className="w-full h-28 object-cover transition-transform group-hover:scale-105"
                      onError={(e: any) => {
                        e.target.style.display = "none";
                      }}
                    />
                    {photo?.caption && (
                      <div className="p-1.5 text-[11px] bg-background/95 border-t border-border truncate text-muted-foreground">
                        {photo.caption}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="p-4 border-t border-border bg-muted/20 flex flex-wrap justify-between gap-2">
          <Button variant="ghost" onClick={onClose} size="sm">
            Close
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onClose();
                navigate(`/faculty/reports?eventId=${event._id}`);
              }}
              className="gap-1.5"
            >
              <FileText className="w-3.5 h-3.5 text-primary" />
              Open 24-Point Report
              <ExternalLink className="w-3 h-3 ml-0.5 opacity-70" />
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
