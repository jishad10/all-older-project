import Country from "./country.model.js";

export const createCountryService = async ({ countryName, states }) => {
  const trimmedName = countryName.trim();

  const existing = await Country.findOne({ countryName: trimmedName });
  if (existing) {
    throw new Error('Country already exists.');
  }

  const normalizedStates = Array.isArray(states) ? states : [states];

  const country = new Country({
    countryName: trimmedName,
    states: normalizedStates
  });

  return await country.save();
};


export const getAllCountriesService = async () => {
  const countries = (
    await Country.find({})
  )
  return countries;
};

export const getCountryByIdService = async (countryId) => {
  return await Country.findById(countryId);
};

export const updateCountryService = async (countryId, updateData) => {
  const updated = await Country.findByIdAndUpdate(countryId, updateData, { new: true });
  if (!updated) throw new Error('Country not found');
  return updated;
};

export const deleteCountryService = async (countryId) => {
  const deleted = await Country.findByIdAndDelete(countryId);
  if (!deleted) throw new Error('Country not found or already deleted');
  return deleted;
};
