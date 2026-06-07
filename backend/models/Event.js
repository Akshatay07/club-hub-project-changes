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

    // ===== NEW (REPORT FIELDS) =====

    type: { type: String, default: "" }, // FDP / Workshop
    department: { type: String, default: "" },
    venue: { type: String, default: "" },

    resourcePerson: {
  name: { type: String, default: "" },
  organization: { type: String, default: "" },
},

facultyParticipants: {
  internal: { type: Number, default: 0 },
  external: { type: Number, default: 0 },
},

studentParticipants: {
  internal: { type: Number, default: 0 },
  external: { type: Number, default: 0 },
},

eventType: {
  type: String,
  default: "",
},

department: {
  type: String,
  default: "",
},

venue: {
  type: String,
  default: "",
},

resourcePersonName: {
  type: String,
  default: "",
},

resourceOrganization: {
  type: String,
  default: "",
},

facultyInternal: {
  type: Number,
  default: 0,
},

facultyExternal: {
  type: Number,
  default: 0,
},

studentsInternal: {
  type: Number,
  default: 0,
},

studentsExternal: {
  type: Number,
  default: 0,
},

topicsCovered: {
  type: String,
  default: "",
},

agenda: {
  type: String,
  default: "",
},

summary: {
  type: String,
  default: "",
},

facultyCoordinator: {
  type: String,
  default: "",
},

studentCoordinator: {
  type: String,
  default: "",
},

reportSubmitted: {
  type: Boolean,
  default: false,
},

reportApproved: {
  type: Boolean,
  default: false,
},

reportRejected: {
  type: Boolean,
  default: false,
},

reportRemarks: {
  type: String,
  default: "",
},

certificatesPrinted: { type: Boolean, default: false },
feedbackCollected: { type: Boolean, default: false },
attendanceAttached: { type: Boolean, default: false },
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