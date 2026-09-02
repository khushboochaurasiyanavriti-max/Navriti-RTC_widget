import express from "express";
import upload from "../middleware/uploadMiddleware.js";
import cloudinary from "../config/cloudinary.js";

const router = express.Router();

router.post(
    "/upload",
    upload.single("file"),
    async (req, res) => {
        try {
            console.log("BODY:", req.body);
            console.log("FILE:", req.file);

            if (!req.file) {
                return res.status(400).json({
                    message: "No file uploaded",
                });
            }

            const uploadResult =
                await new Promise(
                    (resolve, reject) => {

                        const uploadStream =
                            cloudinary.uploader.upload_stream(
                                {
                                    resource_type: "auto",
                                    folder: "communication-widget",
                                },
                                (error, result) => {

                                    if (error) {
                                        reject(error);
                                    } else {
                                        resolve(result);
                                    }
                                }
                            );

                        uploadStream.end(
                            req.file.buffer
                        );
                    }
                );

            console.log(
                "CLOUDINARY RESULT:",
                uploadResult
            );

            res.status(200).json({
                message:
                    "File uploaded successfully",

                file: {
                    originalName:
                        req.file.originalname,

                    fileName:
                        req.file.originalname,

                    fileType:
                        req.file.mimetype,

                    fileSize:
                        req.file.size,

                    fileUrl:
                        uploadResult.secure_url,
                    publicId: 
                        uploadResult.public_id,
                    resourceType: 
                    uploadResult.resource_type,
                },
            });

        } catch (error) {

            console.error(
                "Cloudinary upload error:",
                error
            );

            res.status(500).json({
                message:
                    "File upload failed",
                error:
                    error.message,
            });
        }
    }
);

router.delete(
    "/upload",
    async (req, res) => {
        const {
            publicId,
            resourceType = "image",
        } = req.body || {};

        if (!publicId) {
            return res.status(400).json({
                message: "publicId is required",
            });
        }

        try {
            await cloudinary.uploader.destroy(
                publicId,
                { resource_type: resourceType }
            );

            return res.status(200).json({
                message: "File cleanup completed",
            });
        } catch (error) {
            console.error(
                "Cloudinary cleanup error:",
                error
            );

            return res.status(500).json({
                message: "File cleanup failed",
            });
        }
    }
);

export default router;