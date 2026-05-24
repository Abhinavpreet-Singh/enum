import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

// ─── Cloudinary Configuration ────────────────────────────────────────────────
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload a raw file buffer to Cloudinary under simulations/{simulationId}/
 */
export async function uploadFileToCloudinary(content, filename, simulationId) {
    const buffer =
        typeof content === "string" ? Buffer.from(content, "utf-8") : content;

    const publicId = `simulations/${simulationId}/${filename.replace(/\//g, "_")}`;

    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                resource_type: "raw",
                public_id: publicId,
                overwrite: true,
                invalidate: true,
            },
            (error, result) => {
                if (error) return reject(error);
                resolve({
                    url: result.secure_url,
                    publicId: result.public_id,
                });
            }
        );

        uploadStream.end(buffer);
    });
}

/**
 * Delete a raw file from Cloudinary by its public ID.
 */
export async function deleteFileFromCloudinary(publicId) {
    return cloudinary.uploader.destroy(publicId, { resource_type: "raw" });
}

/**
 * Delete all files under a simulation's Cloudinary folder.
 */
export async function deleteSimulationFolder(simulationId) {
    const prefix = `simulations/${simulationId}`;
    try {
        await cloudinary.api.delete_resources_by_prefix(prefix, {
            resource_type: "raw",
        });
        await cloudinary.api.delete_folder(prefix);
    } catch (err) {
        if (err?.http_code !== 404) throw err;
    }
}

/**
 * Fetch raw file content from a Cloudinary URL.
 */
export async function fetchFileFromCloudinary(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(
            `Failed to fetch file from Cloudinary: ${response.status} ${response.statusText}`
        );
    }
    return response.text();
}

/**
 * Upload an image buffer to Cloudinary under avatars/
 */
export async function uploadAvatarToCloudinary(buffer, userId) {
    const publicId = `avatars/${userId}`;

    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                resource_type: "image",
                public_id: publicId,
                overwrite: true,
                invalidate: true,
                transformation: [
                    { width: 400, height: 400, crop: "fill", gravity: "face" },
                ],
            },
            (error, result) => {
                if (error) return reject(error);
                resolve({
                    url: result.secure_url,
                    publicId: result.public_id,
                });
            }
        );

        uploadStream.end(buffer);
    });
}
