import mongoose from "mongoose";
import { convertToUsd, getUsdRates } from "../../lib/exchangeRates.js";

const { Schema } = mongoose;

/** 1) Basic Information */
const BasicInformationSchema = new Schema(
  {
    propertyTitle: { type: String, required: true, trim: true },
    details: { type: String, trim: true },
    propertyType: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    monthlyRent: { type: Number, required: true, min: 0 },
    preferredCurrency: {
      type: String,
      default: "USD",
      trim: true,
      uppercase: true,
    },
    priceUsd: { type: Number, min: 0, default: 0 },
  },
  { _id: false }
);

/** 2) Address — street, city, island */
const AddressSchema = new Schema(
  {
    streetNumber: { type: String, trim: true },
    cityTown:     { type: String, trim: true },
    island:       { type: Schema.Types.ObjectId, ref: "Island", required: true },
  },
  { _id: false }
);

/** 2b) Location — coordinates for geo queries */
/** 2b) Location — precise geo + readable address */
const GeoPointSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point",
      required: true,
    },
    coordinates: {
      type: [Number], // [lng, lat]
      required: true,
    },
  },
  { _id: false }
);

const LocationSchema = new Schema(
  {
    address: { type: String, required: true, trim: true },

    lat: { type: Number, required: true },
    lng: { type: Number, required: true },

    geo: { type: GeoPointSchema, required: true },
  },
  { _id: false }
);


/** 3) Property Details (Residential + Commercial fields together) */
const PropertyDetailsSchema = new Schema(
  {
    // Residential
    bedrooms:     { type: Number, min: 0, default: 0 },
    bathrooms:    { type: Number, min: 0, default: 0 },
    squareFeet:   { type: Number, min: 0, default: 0 },
    lotSizeSqFt:  { type: Number, min: 0, default: 0 },
    yearBuilt:    { type: Number, min: 0 },
    parkingSpaces:{ type: Number, min: 0, default: 0 },

    // Commercial
    commercialPropertyType: { type: String, trim: true },
    totalBuildingSizeSqFt:  { type: Number, min: 0, default: 0 },
    numberOfFloors:         { type: Number, min: 0, default: 0 },
    numberOfUnitsSuites:    { type: Number, min: 0, default: 0 },

    // Land
    landType:      { type: String, trim: true },
    totalLandSize: { type: Number, min: 0, default: 0 },
    landSizeUnit:  { type: String, trim: true },
    topography:    { type: String, trim: true },
  },
  { _id: false }
);

/** 4) Rental Terms */
const RentalTermsSchema = new Schema(
  {
    leaseTerm: {
      monthToMonth: { type: Boolean, default: false },
      sixMonths:    { type: Boolean, default: false },
      twelveMonths: { type: Boolean, default: false },
      other:        { type: Boolean, default: false },
      otherText:    { type: String, trim: true },
    },
    additional: {
      utilitiesIncluded: { type: Boolean, default: false },
      furnished:         { type: Boolean, default: false },
      petFriendly:       { type: Boolean, default: false },
    },
  },
  { _id: false }
);

/** 5) Amenities */
const AmenitiesSchema = new Schema(
  {
    amenities:         { type: [String], default: [] },
    parkingType:       { type: String, trim: true },
    hoaFeesMonthly:    { type: Number, min: 0, default: 0 },
    propertyTaxAmount: { type: Number, min: 0, default: 0 },
  },
  { _id: false }
);

/** 5.0) Financials */
const FinancialsSchema = new Schema(
  {
    occupancyStatus:   { type: String, trim: true },
    rentalIncome:      { type: Number, min: 0, default: 0 },
    operatingExpenses: { type: Number, min: 0, default: 0 },
  },
  { _id: false }
);

/** 5.1) Property Features */
const PropertyFeaturesSchema = new Schema(
  {
    parkingAvailability:   { type: String, trim: true },
    numberOfParkingSpaces: { type: Number, min: 0, default: 0 },
    elevator:              { type: Boolean, default: false },
    loadingDock:           { type: Boolean, default: false },
    accessibilityFeatures: { type: [String], default: [] },
    securityFeatures:      { type: [String], default: [] },
  },
  { _id: false }
);

/** 5.2) Utilities & Infrastructure */
const UtilitiesInfrastructureSchema = new Schema(
  {
    electricityAvailability: { type: Boolean, default: false },
    waterAvailability:       { type: Boolean, default: false },
    roadAccess:              { type: Boolean, default: false },
    sewerAvailable:          { type: Boolean, default: false },
    sewerOrSeptic:           { type: Boolean, default: false },
    internetAvailability:    { type: Boolean, default: false },
    backupPower:             { type: Boolean, default: false },
  },
  { _id: false }
);

/** 6) Unit Details */
const UnitDetailSchema = new Schema(
  {
    unitType: { type: String, required: true, trim: true },
    sqFt:     { type: Number, min: 0, default: 0 },
    baseRent: { type: Number, min: 0, default: 0 },
  },
  { _id: false }
);

/** 7) Photos */
const PhotoSchema = new Schema(
  {
    url:          { type: String, required: true },
    publicId:     { type: String, required: true },
    originalName: { type: String },
  },
  { _id: false }
);

const RentalPropertySchema = new Schema(
  {
    basicInformation:        { type: BasicInformationSchema,        required: true },
    address:                 { type: AddressSchema,                 required: true },
    location:                { type: LocationSchema,                default: {}   },
    propertyDetails:         { type: PropertyDetailsSchema,         default: {}   },
    rentalTerms:             { type: RentalTermsSchema,             default: {}   },
    amenities:               { type: AmenitiesSchema,               default: {}   },
    financials:              { type: FinancialsSchema,              default: {}   },
    propertyFeatures:        { type: PropertyFeaturesSchema,        default: {}   },
    utilitiesInfrastructure: { type: UtilitiesInfrastructureSchema, default: {}   },
    propertyTaxAnnual:       { type: Number, min: 0, default: 0 },
    unitDetails:             { type: [UnitDetailSchema],            default: []   },
    photos:                  { type: [PhotoSchema],                 default: []   },

    // owner — LANDLORD or AGENT who created this property
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    createdByRole: {
      type: String,
      enum: ["USER", "LANDLORD", "AGENT", "ADMIN"],
      default: null,
    },

    // rent or buy
    listingType: {
      type: String,
      enum: ["rent", "buy"],
      default: "rent",
      required: true,
    },

    // listing status
    status: {
      type: String,
      enum: ["active", "disabled"],
      default: "active",
    },

    // view count — incremented each time someone views the property
    views: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// 2dsphere index for geo queries on location.geo
RentalPropertySchema.index({ "location.geo": "2dsphere" });
RentalPropertySchema.index({ "basicInformation.priceUsd": 1 });

RentalPropertySchema.pre("save", async function setPriceUsd(next) {
  if (
    !this.isModified("basicInformation.monthlyRent") &&
    !this.isModified("basicInformation.preferredCurrency")
  ) {
    return next();
  }

  try {
    const rates = await getUsdRates();
    const priceUsd = convertToUsd(
      this.basicInformation?.monthlyRent,
      this.basicInformation?.preferredCurrency || "USD",
      rates,
    );

    if (priceUsd !== null) {
      this.basicInformation.priceUsd = priceUsd;
    }
  } catch (_) {}

  return next();
});

const RentalProperty =
  mongoose.models.RentalProperty ||
  mongoose.model("RentalProperty", RentalPropertySchema);

export default RentalProperty;
