import mongoose from "mongoose";

const SignatureSchema = new mongoose.Schema(
  {
    stageKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    signatureUrl: {
      type: String,
      required: true,
    },
    updatedBy: {
      type: String,
      default: "Admin",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Signature", SignatureSchema);
