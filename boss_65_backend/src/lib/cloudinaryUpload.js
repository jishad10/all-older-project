import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import { cloudinaryApiKey, cloudinaryCloudName, cloudinarySecret } from "../core/config/config.js";
import { CLIENT_RENEG_LIMIT } from "tls";

cloudinary.config({
  cloud_name: cloudinaryCloudName,
  api_key: cloudinaryApiKey,
  api_secret: cloudinarySecret,
});

export const cloudinaryUpload = async (filePath, public_id, folder) => {
  try {
    const uploadImage = await cloudinary.uploader.upload(filePath, {
      resource_type: "auto",
      public_id,
      folder,
    });
    

    fs.unlinkSync(filePath);
    return uploadImage;
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    fs.unlinkSync(filePath);
    return "file upload failed";
  }
};

export const cloudinaryDelete = async (public_id) => {
  try {
    const result = await cloudinary.uploader.destroy(public_id, {
      resource_type: "image",
    });

    return result;
  } catch (error) {
    console.error("Cloudinary delete error:", error);
    return null;
  }
};

export default cloudinary;
