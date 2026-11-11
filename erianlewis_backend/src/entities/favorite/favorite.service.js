import Favorite from './favorite.model.js';
import RentalProperty from '../rentalProperty/rentalProperty.model.js';


export const getFavoritesService = async (userId) => {
  return Favorite.find({ user: userId })
    .populate({
      path: 'property',
      populate: [
        { path: 'basicInformation.propertyType', select: 'name' },
        { path: 'address.island', select: 'name' },
        { path: 'createdBy', select: 'firstName lastName email' },
      ],
    })
    .sort({ createdAt: -1 });
};


export const getFavoriteService = async (userId, propertyId) => {
  const favorite = await Favorite.findOne({ user: userId, property: propertyId })
    .populate({
      path: 'property',
      populate: [
        { path: 'basicInformation.propertyType', select: 'name' },
        { path: 'address.island', select: 'name' },
        { path: 'createdBy', select: 'firstName lastName email' },
      ],
    });
  if (!favorite) throw new Error('Favorite not found');
  return favorite;
};


export const addFavoriteService = async (userId, propertyId) => {
  if (!propertyId) throw new Error('Property is required');

  const property = await RentalProperty.findById(propertyId);
  if (!property) throw new Error('Property not found');

  const existing = await Favorite.findOne({ user: userId, property: propertyId });
  if (existing) throw new Error('Property already in favorites');

  return Favorite.create({ user: userId, property: propertyId });
};


export const removeFavoriteService = async (userId, propertyId) => {
  const favorite = await Favorite.findOne({ user: userId, property: propertyId });
  if (!favorite) throw new Error('Favorite not found');
  await Favorite.findByIdAndDelete(favorite._id);
  return true;
};
