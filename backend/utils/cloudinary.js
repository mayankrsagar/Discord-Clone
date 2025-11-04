// backend/utils/cloudinary.js
import cloudinary from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } =
  process.env;

if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
  throw new Error("Cloudinary credentials missing in environment");
}

cloudinary.v2.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Streams a Buffer to Cloudinary.
 * @param {Buffer} buffer
 * @param {Object} options - upload options (folder, transformation, etc.)
 * @returns {Promise<Object>} upload result (secure_url, public_id, ...)
 */
export const handleUpload = (buffer, options = {}) =>
  new Promise((resolve, reject) => {
    const uploadStream = cloudinary.v2.uploader.upload_stream(
      options,
      (err, result) => {
        if (err) return reject(err);
        resolve(result);
      }
    );
    uploadStream.end(buffer);
  });

/**
 * Deletes a Cloudinary asset by public_id.
 * @param {String} publicId
 * @returns {Promise<Object>}
 */
export const destroyImage = (publicId) =>
  new Promise((resolve, reject) => {
    if (!publicId) return resolve({ result: "not_found_or_empty_public_id" });
    cloudinary.v2.uploader.destroy(publicId, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });

export default cloudinary;
