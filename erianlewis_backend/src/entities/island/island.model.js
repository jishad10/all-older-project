import mongoose from 'mongoose';

const IslandSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
  },
  { timestamps: true }
);

const Island = mongoose.models.Island || mongoose.model('Island', IslandSchema);

export default Island;
