import SavedSearch from './savedSearch.model.js';


export const getSavedSearchesService = async (userId) => {
  return SavedSearch.find({ user: userId })
    .populate('filters.island', 'name')
    .populate('filters.type',   'name')
    .sort({ createdAt: -1 });
};


export const getSavedSearchService = async (userId, id) => {
  const saved = await SavedSearch.findOne({ _id: id, user: userId })
    .populate('filters.island', 'name')
    .populate('filters.type',   'name');
  if (!saved) throw new Error('Saved search not found');
  return saved;
};


export const createSavedSearchService = async (userId, { name, filters }) => {
  if (!name) throw new Error('Search name is required');
  return SavedSearch.create({ user: userId, name, filters: filters || {} });
};


export const updateSavedSearchService = async (userId, id, { name, filters }) => {
  const saved = await SavedSearch.findOne({ _id: id, user: userId });
  if (!saved) throw new Error('Saved search not found');
  if (name)    saved.name    = name;
  if (filters) saved.filters = { ...saved.filters, ...filters };
  await saved.save();
  return saved;
};


export const deleteSavedSearchService = async (userId, id) => {
  const saved = await SavedSearch.findOne({ _id: id, user: userId });
  if (!saved) throw new Error('Saved search not found');
  await SavedSearch.findByIdAndDelete(id);
  return true;
};
