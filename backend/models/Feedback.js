import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema(
{
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  clubId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Club",
  },

  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Event",
  },

  targetType: {
    type: String,
    enum: ["club", "event"],
    default: "club",
  },

  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },

  comment: {
    type: String,
    default: "",
  },

  facultyResponse: {
    type: String,
    default: "",
  },

  facultyRespondedAt: {
    type: Date,
    default: null,
  },
},
{ timestamps: true }
);

export default mongoose.model("Feedback", feedbackSchema);