import 'dotenv/config';
import {v2 as cloudinary} from "cloudinary"

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET,
})

const uploadOnCloudinary = async(fileBuffer, originalname)=>{
    if (!fileBuffer || !originalname) {
        console.error("Missing file buffer or filename.");
        return null;
    }

    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream({
            resource_type: "auto",
            folder: "EducateMe/classes",
            use_filename: true,
            filename_override: originalname,
        }, (error, result) => {
            if (error) {
                console.error("Error uploading file to Cloudinary:", error.message);
                reject(null);
            } else {
                resolve(result);
            }
        });

        stream.end(fileBuffer);
    });
}

const deleteFromCloudinary = async (public_id) => {
    try {
        if (!public_id) return null;
        const response = await cloudinary.uploader.destroy(public_id, {
            resource_type: "auto"
        });
        return response;
    } catch (error) {
        console.error("Error deleting file from Cloudinary:", error.message);
        return null;
    }
};

export {uploadOnCloudinary,deleteFromCloudinary}