import { generateResponse } from '../../lib/responseFormate.js';
import { createCountryService, getAllCountriesService, getCountryByIdService, updateCountryService, deleteCountryService } from './country.service.js';


export const createCountry = async (req, res) => {
  try {
    const { countryName, states } = req.body;

    const country = await createCountryService({ countryName, states });
    return generateResponse(res, 201, true, 'Country created successfully', country);
  } catch (error) {
    return generateResponse(res, 400, false, 'Failed to create Country', error.message);
  }
};


export const getAllCountries = async (req, res) => {
  try {
    const countries = await getAllCountriesService();
    return res.status(200).json({
      success: true,
      message: 'Fetched Countries',
      data: countries
    });
  }

  catch (error) {
    generateResponse(res, 500, false, 'Failed to fetch Countries', error.message);
  }
};


export const getCountryById = async (req, res) => {
  try {
    const country = await getCountryByIdService(req.params.id);
    if (!country) return generateResponse(res, 404, false, 'Country not found');

    generateResponse(res, 200, true, 'Fetched Country', country);
  } catch (error) {
    generateResponse(res, 500, false, 'Failed to fetch Country', error.message);
  }
};


export const updateCountry = async (req, res) => {
  try {
    const updated = await updateCountryService(req.params.id, req.body);
    generateResponse(res, 200, true, 'Country updated successfully', updated);
  } catch (error) {
    generateResponse(res, 400, false, 'Failed to update Country', error.message);
  }
};


export const deleteCountry = async (req, res) => {
  try {
    const deleted = await deleteCountryService(req.params.id);
    generateResponse(res, 200, true, 'Country deleted successfully', deleted);
  } catch (error) {
    generateResponse(res, 400, false, 'Failed to delete Country', error.message);
  }
};

