import mongoose from "mongoose";

const attachmentSchema = new mongoose.Schema(
  {
    label: { type: String, default: "" },
    originalName: { type: String, default: "" },
    fileName: { type: String, default: "" },
    mimeType: { type: String, default: "" },
    size: { type: Number, default: 0 },
    url: { type: String, default: "" },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    uploadedAt: { type: Date, default: Date.now },

    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { _id: true }
);

const eventSchema = new mongoose.Schema(
  {
    // ===== EXISTING =====
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },

    clubId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Club",
      required: true,
      index: true,
    },

    facultyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "cancelled", "postponed"],
      default: "pending",
      index: true,
    },

    approvalStage: {
      type: String,
      enum: [
        "Event Coordinators",
        "HOD-BCA",
        "Vice-Principal",
        "IQAC Coordinator",
        "Principal",
        "Approved",
        "Rejected",
      ],
      default: "Event Coordinators",
      index: true,
    },

    stageSignatures: {
      type: Map,
      of: String,
      default: {},
    },

    date: { type: String, required: true },
    time: { type: String, required: true },
    endTime: { type: String, default: "" },
    location: { type: String, default: "" },

    maxCapacity: { type: Number, default: 100, min: 1 },
    registeredCount: { type: Number, default: 0, min: 0 },
    attendanceCount: { type: Number, default: 0, min: 0 },
    attendanceRate: { type: Number, default: 0, min: 0, max: 100 },
    averageRating: { type: Number, default: 0, min: 0, max: 5 },

    planned: { type: Boolean, default: true },

    budgetRequested: { type: Number, default: 0, min: 0 },
    budgetApproved: { type: Number, default: 0, min: 0 },
    budgetSpent: { type: Number, default: 0, min: 0 },

    requiresProof: { type: Boolean, default: true },

    proofStatus: {
      type: String,
      enum: ["not_submitted", "submitted", "approved", "rejected"],
      default: "not_submitted",
    },

    proofReviewedAt: { type: Date, default: null },

    proofReviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    proofReviewComment: { type: String, default: "" },

    qrCodeToken: { type: String, default: "" },
    qrCodeDataUrl: { type: String, default: "" },

    attendanceWindowStart: { type: Date, default: null },
    attendanceWindowEnd: { type: Date, default: null },

    attachments: [attachmentSchema],
    signedAttendanceSheets: [
      {
        fileName: { type: String, default: "" },
        originalName: { type: String, default: "" },
        url: { type: String, default: "" },
        size: { type: Number, default: 0 },
        uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],

    // ===== 24-POINT INSTITUTIONAL REPORT FIELDS =====
    type: { type: String, default: "" }, // Event type (e.g. Faculty Development Program, Workshop)
    department: { type: String, default: "BCA" },
    venue: { type: String, default: "" },
    reportDate: { type: String, default: "" },

    // 6 & 7: Resource Person 1 & Topics
    resourcePerson1: {
      name: { type: String, default: "" },
      designation: { type: String, default: "" },
      organization: { type: String, default: "" },
    },
    resourcePerson1Topics: { type: String, default: "" },

    // 8 & 9: Resource Person 2 & Topics
    resourcePerson2: {
      name: { type: String, default: "" },
      designation: { type: String, default: "" },
      organization: { type: String, default: "" },
    },
    resourcePerson2Topics: { type: String, default: "" },

    // 10 & 11: Participant Counts
    facultyParticipants: {
      internal: { type: Number, default: 0 },
      external: { type: Number, default: 0 },
    },
    studentParticipants: {
      internal: { type: Number, default: 0 },
      external: { type: Number, default: 0 },
    },

    // 12 & 13: Coordinators
    facultyCoordinator: { type: String, default: "" },
    facultyCoordinatorDetails: { type: String, default: "" },
    studentCoordinator: { type: String, default: "" },
    studentCoordinatorDetails: { type: String, default: "" },

    // 14 & 15: Financials
    totalExpenditure: { type: String, default: "" },
    sponsors: { type: String, default: "NA" },

    // 16 & 17: Agenda & Website
    agenda: { type: String, default: "" },
    websiteReportLink: { type: String, default: "No" },

    // 18 & 19: Media & Press
    socialMediaLinks: { type: String, default: "---" },
    newspaperReport: { type: String, default: "No" },

    // 20, 21, 22, 23: Verifications
    certificatesPrinted: { type: String, default: "No" },
    feedbackCollected: { type: String, default: "Yes" },
    attendanceAttached: { type: String, default: "Yes" },
    photographsAttached: { type: String, default: "Attached" },

    // 24: Comprehensive Summary
    summary: { type: String, default: "" },

    // Event Photographs Annexure
    eventPhotos: [
      {
        fileName: { type: String, default: "" },
        originalName: { type: String, default: "" },
        url: { type: String, default: "" },
        caption: { type: String, default: "" },
        size: { type: Number, default: 0 },
        uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],

    // Workflow status
    reportSubmitted: { type: Boolean, default: false },
    reportApproved: { type: Boolean, default: false },
    reportRejected: { type: Boolean, default: false },
    reportRemarks: { type: String, default: "" },
  },
  { timestamps: true }
);

// ===== EXISTING VIRTUAL =====
eventSchema.virtual("seatsRemaining").get(function () {
  return Math.max(this.maxCapacity - this.registeredCount, 0);
});

eventSchema.set("toJSON", { virtuals: true });
eventSchema.set("toObject", { virtuals: true });

export default mongoose.model("Event", eventSchema);