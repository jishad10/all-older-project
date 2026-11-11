import Banner from './banner.model.js';
import { cloudinaryUpload } from '../../lib/cloudinaryUpload.js';

export const createBannerService = async ({ title, description, additionalInfo, mediaFile, userId }) => {
  if (!title) {
    throw new Error('Title is required');
  }

  // Enforce one banner per user; must delete existing before creating another
  const existing = await Banner.findOne({ createdBy: userId || null });
  if (existing) {
    throw new Error('You already have a banner. Delete it before creating a new one.');
  }

  let mediaUrl = '';

  if (mediaFile?.path) {
    const uploadResult = await cloudinaryUpload(
      mediaFile.path,
      `banner-${Date.now()}`,
      'banners'
    );

    if (uploadResult?.secure_url) {
      mediaUrl = uploadResult.secure_url;
    } else {
      throw new Error('Media upload failed');
    }
  }

  const banner = new Banner({
    title,
    description,
    additionalInfo,
    media: mediaUrl,
    createdBy: userId || null
  });

  return banner.save();
};

export const updateBannerService = async (bannerId, { title, description, additionalInfo, mediaFile }) => {
  const banner = await Banner.findById(bannerId);
  if (!banner) {
    throw new Error('Banner not found');
  }

  if (title !== undefined) banner.title = title;
  if (description !== undefined) banner.description = description;
  if (additionalInfo !== undefined) banner.additionalInfo = additionalInfo;

  if (mediaFile?.path) {
    const uploadResult = await cloudinaryUpload(
      mediaFile.path,
      `banner-${Date.now()}`,
      'banners'
    );

    if (uploadResult?.secure_url) {
      banner.media = uploadResult.secure_url;
    } else {
      throw new Error('Media upload failed');
    }
  }

  return banner.save();
};

export const deleteBannerService = async (bannerId) => {
  const banner = await Banner.findById(bannerId);
  if (!banner) {
    throw new Error('Banner not found');
  }

  await banner.deleteOne();
  return;
};

export const getBannerByIdService = async (bannerId) => {
  const banner = await Banner.findById(bannerId);
  if (!banner) {
    throw new Error('Banner not found');
  }
  return banner;
};

export const listBannersService = async () => {
  return Banner.find().sort({ createdAt: -1 });
};
