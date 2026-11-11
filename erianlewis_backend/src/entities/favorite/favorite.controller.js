import { generateResponse } from '../../lib/responseFormate.js';
import {
  getFavoritesService,
  getFavoriteService,
  addFavoriteService,
  removeFavoriteService,
} from './favorite.service.js';

export const getFavorites = async (req, res, next) => {
  try {
    const data = await getFavoritesService(req.user._id);
    return generateResponse(res, 200, true, 'Favorites fetched', data);
  } catch (error) { next(error); }
};

export const getFavorite = async (req, res, next) => {
  try {
    const data = await getFavoriteService(req.user._id, req.params.propertyId);
    return generateResponse(res, 200, true, 'Favorite fetched', data);
  } catch (error) {
    if (error.message === 'Favorite not found') return generateResponse(res, 404, false, error.message, null);
    next(error);
  }
};

export const addFavorite = async (req, res, next) => {
  try {
    const data = await addFavoriteService(req.user._id, req.body.propertyId);
    return generateResponse(res, 201, true, 'Added to favorites', data);
  } catch (error) {
    if (error.message === 'Property is required')          return generateResponse(res, 400, false, error.message, null);
    if (error.message === 'Property not found')            return generateResponse(res, 404, false, error.message, null);
    if (error.message === 'Property already in favorites') return generateResponse(res, 400, false, error.message, null);
    next(error);
  }
};

export const removeFavorite = async (req, res, next) => {
  try {
    await removeFavoriteService(req.user._id, req.params.propertyId);
    return generateResponse(res, 200, true, 'Removed from favorites', null);
  } catch (error) {
    if (error.message === 'Favorite not found') return generateResponse(res, 404, false, error.message, null);
    next(error);
  }
};
