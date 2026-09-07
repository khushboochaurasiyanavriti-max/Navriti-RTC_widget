
import express from "express";

import upload
    from "../middleware/uploadMiddleware.js";

import cloudinary
    from "../config/cloudinary.js";


const router =
    express.Router();


/*
 * ---------------------------------------------------------
 * Platform Isolation Middleware
 * ---------------------------------------------------------
 */

const requirePlatform = (
    req,
    res,
    next
) => {

    const platformId =
        req.body?.platformId ||
        req.query?.platformId;


    if (!platformId) {

        return res.status(400).json({
            message:
                "platformId is required",
        });

    }


    req.platformId =
        platformId;


    return next();
};


/*
 * ---------------------------------------------------------
 * Upload File
 * ---------------------------------------------------------
 */

router.post(
    "/upload",

    upload.single(
        "file"
    ),

    requirePlatform,

    async (
        req,
        res
    ) => {

        try {

            const platformId =
                req.platformId;


            console.log(
                "UPLOAD PLATFORM:",
                platformId
            );


            if (!req.file) {

                return res.status(400).json({
                    message:
                        "No file uploaded",
                });

            }


            /*
             * Platform-specific Cloudinary folder.
             *
             * Example:
             *
             * communication-widget/platform-A/
             * communication-widget/platform-B/
             */

            const uploadResult =
                await new Promise(
                    (
                        resolve,
                        reject
                    ) => {

                        const uploadStream =
                            cloudinary.uploader.upload_stream(
                                {
                                    resource_type:
                                        "auto",

                                    folder:
                                        `communication-widget/${platformId}`,
                                },

                                (
                                    error,
                                    result
                                ) => {

                                    if (error) {

                                        reject(
                                            error
                                        );

                                    } else {

                                        resolve(
                                            result
                                        );

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


            return res.status(200).json({

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

                    /*
                     * Return platform ownership.
                     */

                    platformId,

                },

            });

        } catch (error) {

            console.error(
                "Cloudinary upload error:",
                error
            );


            return res.status(500).json({

                message:
                    "File upload failed",

                error:
                    error.message,

            });

        }

    }
);


/*
 * ---------------------------------------------------------
 * Delete File
 * ---------------------------------------------------------
 *
 * publicId must belong to the requesting platform folder.
 * ---------------------------------------------------------
 */

router.delete(
    "/upload",

    requirePlatform,

    async (
        req,
        res
    ) => {

        const {
            publicId,
            resourceType = "image",
        } = req.body || {};


        const platformId =
            req.platformId;


        if (!publicId) {

            return res.status(400).json({

                message:
                    "publicId is required",

            });

        }


        /*
         * Verify platform ownership from
         * Cloudinary public ID.
         */

        const expectedPrefix =
            `communication-widget/${platformId}/`;


        if (
            !publicId.startsWith(
                expectedPrefix
            )
        ) {

            return res.status(403).json({

                message:
                    "File does not belong to this platform",

            });

        }


        try {

            await cloudinary.uploader.destroy(
                publicId,

                {
                    resource_type:
                        resourceType,
                }
            );


            return res.status(200).json({

                message:
                    "File cleanup completed",

            });

        } catch (error) {

            console.error(
                "Cloudinary cleanup error:",
                error
            );


            return res.status(500).json({

                message:
                    "File cleanup failed",

                error:
                    error.message,

            });

        }

    }
);


export default router;

