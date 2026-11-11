import mongoose from "mongoose";
import bcrypt from "bcrypt";

const teamSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },

    email: { type: String, required: true, unique: true, lowercase: true },

    password: { type: String, required: true },

    role: {
      type: String,
      enum: ["ADMIN", "SUPER_ADMIN"],
      default: "ADMIN",
    },

    permissions: [
      {
        type: String,
        enum: [
          "Overview",
          "Drivers Management",
          "Membership Status",
          "Payments Status",
          "Pickup History",
          "Orders request",
          "User Management",
          "Subscription Management",
          "Banner Management",
          "Contacts Management",
          "Settings",
          "All Access"
        ]
      }
    ],

    status: {
      type: String,
      enum: ["Active", "Suspended"],
      default: "Active"
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    lastActive: { type: Date }
  },
  { timestamps: true }
);

// Auto-hash password
teamSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

const Team = mongoose.model("Team", teamSchema);
export default Team;
