import Cms from "./cms.model.js";


export const createOrUpdateCmsPageService = async ({ page, description }) => {
  if (!page || !description) throw new Error('Page and description are required');

  if (!['terms_conditions', 'privacy_policy'].includes(page)) {
    throw new Error('Invalid page type');
  }

  const cms = await Cms.findOneAndUpdate(
    { page },
    { description },
    { new: true, upsert: true, runValidators: true }
  );

  return cms;
};


export const getCmsPageService = async (page) => {
  if (!['terms_conditions', 'privacy_policy'].includes(page)) {
    throw new Error('Invalid page type');
  }

  const cms = await Cms.findOne({ page });

  if (!cms) throw new Error('Page not found');

  return cms;
};


export const getAllCmsPagesService = async () => {
  const pages = await Cms.find();
  return pages;
};