import cloudinary from "cloudinary";
import dotenv from "dotenv";

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

export const handleUpload = (buffer) =>
  new Promise((resolve, reject) => {
    cloudinary.v2.uploader
      .upload_stream(
        { resource_type: "auto", folder: "discord-servers" },
        (err, result) => {
          if (err) return reject(err);
          resolve(result);
        }
      )
      .end(buffer);
  });
