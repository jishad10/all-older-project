import { generateResponse } from '../../lib/responseFormate.js';
import {
  createBannerService,
  updateBannerService,
  deleteBannerService,
  getBannerByIdService,
  listBannersService
} from './banner.service.js';

export const createBanner = async (req, res, next) => {
  const { title, description, additionalInfo } = req.body;
  const mediaFile = req.files?.media?.[0];

  try {
    const banner = await createBannerService({
      title,
      description,
      additionalInfo,
      mediaFile,
      userId: req.user?._id
    });

    return generateResponse(res, 201, true, 'Banner created successfully', banner);
  } catch (error) {
    return next(error);
  }
};

export const updateBanner = async (req, res, next) => {
  const { title, description, additionalInfo } = req.body;
  const mediaFile = req.files?.media?.[0];
  const { bannerId } = req.params;

  try {
    const banner = await updateBannerService(bannerId, {
      title,
      description,
      additionalInfo,
      mediaFile
    });

    return generateResponse(res, 200, true, 'Banner updated successfully', banner);
  } catch (error) {
    return next(error);
  }
};

export const deleteBanner = async (req, res, next) => {
  const { bannerId } = req.params;

  try {
    await deleteBannerService(bannerId);
    return generateResponse(res, 200, true, 'Banner deleted successfully', null);
  } catch (error) {
    return next(error);
  }
};

export const getBannerById = async (req, res, next) => {
  const { bannerId } = req.params;

  try {
    const banner = await getBannerByIdService(bannerId);
    return generateResponse(res, 200, true, 'Banner fetched successfully', banner);
  } catch (error) {
    return next(error);
  }
};

export const listBanners = async (req, res, next) => {
  try {
    const banners = await listBannersService();
    return generateResponse(res, 200, true, 'Banners fetched successfully', banners);
  } catch (error) {
    return next(error);
  }
};
