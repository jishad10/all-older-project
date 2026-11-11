import mongoose, { Schema } from "mongoose";

const resourceTypesSchema = new Schema(
  {
    resourceTypeName: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    description: {
      type: String,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

const ResourceType = mongoose.model("ResourceType", resourceTypesSchema);
export default ResourceType;
