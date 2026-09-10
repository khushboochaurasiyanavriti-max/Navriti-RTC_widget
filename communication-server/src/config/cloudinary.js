import { v2 as cloudinary } from "cloudinary";

const {
    CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET,
} = process.env;

if (
    !CLOUDINARY_CLOUD_NAME ||
    !CLOUDINARY_API_KEY ||
    !CLOUDINARY_API_SECRET
) {
    throw new Error(
        "Missing required Cloudinary environment variables"
    );
}

cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
});

export const connectCloudinary = async () => {
    try {
        await cloudinary.api.ping();

        console.log("Cloudinary connected");
    } catch (error) {
        console.error("Cloudinary connection failed:");
        console.error(error.message);

        process.exit(1);
    }
};

export default cloudinary;