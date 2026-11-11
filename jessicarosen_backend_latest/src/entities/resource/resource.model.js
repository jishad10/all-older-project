import mongoose, { Schema } from "mongoose";

const resourceSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    country: {
      type: String,
      default: ""
    },
    states: [{
      type: String,
      default: ""
    }],
    divisions: [{
      type: String
    }],
    resourceType: {
      type: [String],
      default: []
    },
    description: {
      type: String,
      default: ""
    },
    discountPrice: {
      type: Number,
      default: 0
    },
    quantity: {
      type: Number,
      required: true
    },
    format: {
      type: String,
      enum: ["PDF","Document"],
      required: true
    },
    file: {
      url: {
        type: String,
      },
      type: {
        type: String,
      }
    },
    thumbnail: {
      type: String,
      default: "https://celadonbooks.com/wp-content/uploads/2020/02/what-is-literary-fiction.jpg"
    },
    images: {
      type: [String],
      default: []
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    status: {
      type: String,
      enum: ["draft", "pending", "approved", "rejected"],
      default: "pending"
    },
    productId: {
      type: String,
      unique: true,
      required: true
    },
    practiceAreas: {
      type: [String],
      default: []
    },
    subPracticeAreas: {
      type: [String],
      default: []
    }
  },
  {
    timestamps: true
  }
);


resourceSchema.pre("validate", async function (next) {
  if (!this.productId) {
    let isUnique = false;
    let generatedId;

    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

    while (!isUnique) {
      generatedId = Array(6)
        .fill("")
        .map(() => characters.charAt(Math.floor(Math.random() * characters.length)))
        .join("");
      const existing = await mongoose.models.Resource.findOne({ productId: generatedId });
      if (!existing) isUnique = true;
    }

    this.productId = generatedId;
  }

  next();
});


const Resource = mongoose.model("Resource", resourceSchema);
export default Resource;
