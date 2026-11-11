import mongoose, { Schema } from "mongoose";

const divisionSchema = new Schema(
  {
    divisionName: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false } 
  
);

const stateSchema = new Schema(
  {
    stateName: {
      type: String,
      required: true,
      trim: true,
    },
    divisions: {
      type: [divisionSchema],
      default: [],
    },
  },
  { _id: false }
);

const countrySchema = new Schema(
  {
    countryName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    states: {
      type: [stateSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

const Country = mongoose.model("Country", countrySchema);
export default Country;
