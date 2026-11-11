import { createPaginationInfo } from '../../lib/pagination.js';
import RentalProperty from '../rentalProperty/rentalProperty.model.js';
import User from '../auth/auth.model.js';
import AuditLog from '../auditLog/auditLog.model.js';
import Island from './island.model.js';
import RoleType from '../../lib/types.js';

// ─── CRUD ────────────────────────────────────────────────────────────────────

export const createIsland = async ({ name }) => {
  if (!name) throw new Error('Island name is required');

  const existing = await Island.findOne({
    name: { $regex: `^${name}$`, $options: 'i' },
  });
  if (existing) throw new Error('Island already exists');

  const island = new Island({ name: name.trim() });
  return island.save();
};

export const getAllIslands = async ({ page = 1, limit = 10, search, date } = {}) => {
  const numericPage  = Number(page)  || 1;
  const numericLimit = Number(limit) || 10;

  const filter = {};
  if (search) filter.name = { $regex: search, $options: 'i' };
  if (date)   filter.createdAt = { $gte: new Date(date) };

  const totalIslands = await Island.countDocuments(filter);
  const islands = await Island.find(filter)
    .sort({ createdAt: -1 })
    .skip((numericPage - 1) * numericLimit)
    .limit(numericLimit);

  const islandsWithStats = await Promise.all(
    islands.map(async (island) => {
      const [totalProperties, salesCount, rentalsCount, accountsCount, propertyIds] =
        await Promise.all([
          RentalProperty.countDocuments({ 'address.island': island._id }),
          RentalProperty.countDocuments({ 'address.island': island._id, listingType: 'buy' }),
          RentalProperty.countDocuments({ 'address.island': island._id, listingType: 'rent' }),
          User.countDocuments({
            role: { $in: [RoleType.LANDLORD, RoleType.AGENT] },
            $or: [
              { 'individual.operatingLocations': island._id },
              { 'business.operatingLocations': island._id },
            ],
          }),
          RentalProperty.find({ 'address.island': island._id }).distinct('_id'),
        ]);

      const totalActivity = await AuditLog.countDocuments({
        'entity.id': { $in: propertyIds },
      });

      return {
        _id: island._id,
        name: island.name,
        totalProperties,
        salesCount,
        rentalsCount,
        accountsCount,
        totalActivity,
      };
    })
  );

  const paginationInfo = createPaginationInfo(numericPage, numericLimit, totalIslands);
  return { islands: islandsWithStats, paginationInfo };
};

export const getIslandById = async (id) => {
  const island = await Island.findById(id);
  if (!island) throw new Error('Island not found');
  return island;
};

export const updateIsland = async ({ id, name }) => {
  const updateData = {};
  if (name) updateData.name = name;

  const island = await Island.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });
  if (!island) throw new Error('Island not found');
  return island;
};

export const deleteIsland = async (id) => {
  const island = await Island.findByIdAndDelete(id);
  if (!island) throw new Error('Island not found');
  return true;
};

// ─── OVERVIEW ────────────────────────────────────────────────────────────────

export const getIslandOverviewService = async () => {
  const [totalAccounts, totalProperties, managedIslands] = await Promise.all([
    User.countDocuments({ role: { $in: [RoleType.USER, RoleType.LANDLORD, RoleType.AGENT] } }),
    RentalProperty.countDocuments(),
    Island.countDocuments(),
  ]);

  const [salesCount, rentalsCount] = await Promise.all([
    RentalProperty.countDocuments({ listingType: 'buy' }),
    RentalProperty.countDocuments({ listingType: 'rent' }),
  ]);

  return { totalAccounts, totalProperties, salesCount, rentalsCount, managedIslands };
};

// ─── LISTINGS ────────────────────────────────────────────────────────────────

export const getIslandListingsService = async (
  islandId,
  { page = 1, limit = 10, listingType } = {}
) => {
  const numericPage  = Number(page)  || 1;
  const numericLimit = Number(limit) || 10;

  const filter = { 'address.island': islandId };
  if (listingType) filter.listingType = listingType;

  const total = await RentalProperty.countDocuments(filter);
  const listings = await RentalProperty.find(filter)
    .populate('basicInformation.propertyType', 'name')
    .populate('address.island', 'name')
    .populate('createdBy', 'firstName lastName email role')
    .sort({ createdAt: -1 })
    .skip((numericPage - 1) * numericLimit)
    .limit(numericLimit);

  return { listings, total, page: numericPage, limit: numericLimit };
};