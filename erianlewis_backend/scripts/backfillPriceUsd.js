import mongoose from "mongoose";

import { mongoURI } from "../src/core/config/config.js";
import RentalProperty from "../src/entities/rentalProperty/rentalProperty.model.js";
import { convertToUsd, getUsdRates } from "../src/lib/exchangeRates.js";

const run = async () => {
  if (!mongoURI) {
    throw new Error("MONGO_URI is required");
  }

  await mongoose.connect(mongoURI);

  const rates = await getUsdRates();
  const listings = await RentalProperty.find({});

  let updated = 0;

  for (const listing of listings) {
    const priceUsd = convertToUsd(
      listing.basicInformation?.monthlyRent,
      listing.basicInformation?.preferredCurrency || "USD",
      rates,
    );

    if (priceUsd === null) {
      continue;
    }

    listing.basicInformation.priceUsd = priceUsd;
    await listing.save();
    updated += 1;
  }

  console.log(`Backfilled ${updated} listings with priceUsd`);
};

run()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
