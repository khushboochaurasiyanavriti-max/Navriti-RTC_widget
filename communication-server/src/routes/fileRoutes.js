import express from "express";

import upload
from "../middleware/uploadMiddleware.js";

import cloudinary
from "../config/cloudinary.js";

import { 
    encryptFile,
    decryptFile,
} from "../service/fileEncryptionService.js";
const router =
express.Router();

/*

* ---
* Platform Isolation Middleware
* ---
*
* platformId can come from:
*
* * JSON body
* * multipart/form-data body
* * query params
*
* The validated platform ID is stored in
* req.platformId.
* ---

*/

const requirePlatform =
(
req,
res,
next
) => {


    const platformId =
        req.body?.platformId ||
        req.query?.platformId;


    if (!platformId) {

        return res
            .status(400)
            .json({

                message:
                    "platformId is required",

            });
    }


    req.platformId =
        platformId;


    return next();
};


/*

* ---
* Upload File
* ---
*
* multer must run before requirePlatform
* because multipart form-data fields must
* be parsed before req.body.platformId
* is available.
* ---

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


        if (!req.file) {

            return res
                .status(400)
                .json({

                    message:
                        "No file uploaded",

                });
        }
        const encryptedFile = encryptFile(
            req.file.buffer,
            {
                platformId,
                entity: "file",
            }
        );


        /*
         * Platform-specific Cloudinary folder.
         */

        const folder =
            `communication-widget/${platformId}`;


        const uploadResult =
            await new Promise(

                (
                    resolve,
                    reject
                ) => {

                    const uploadStream =
                        cloudinary
                            .uploader
                            .upload_stream(

                                {

                                    resource_type:
                                        "auto",

                                    folder,

                                },

                                (
                                    error,
                                    result
                                ) => {

                                    if (error) {

                                        reject(
                                            error
                                        );

                                        return;
                                    }


                                    resolve(
                                        result
                                    );
                                }
                            );


                    uploadStream.end(
                        encryptedFile,
                    );
                }
            );


        return res
            .status(200)
            .json({

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

                    platformId,

                },

            });


    } catch (error) {

        console.error(
            "Cloudinary upload error:",
            error
        );


        return res
            .status(500)
            .json({

                message:
                    "File upload failed",

                error:
                    error.message,

            });
    }
}


);


/*
 * ---
 * Download / Decrypt File
 * ---
 */

router.get(
    "/download",
    requirePlatform,
    async (req, res) => {
        try {
            const {
                publicId,
                resourceType = "raw",
                fileType,
                fileName,
            } = req.query;

            const platformId =
                req.platformId;

            if (!publicId) {
                return res
                    .status(400)
                    .json({
                        message:
                            "publicId is required",
                    });
            }

            /*
             * Verify that the file belongs
             * to the requesting platform.
             */
            const expectedPrefix =
                `communication-widget/${platformId}/`;

            if (
                !publicId.startsWith(
                    expectedPrefix
                )
            ) {
                return res
                    .status(403)
                    .json({
                        message:
                            "File does not belong to this platform",
                    });
            }

            /*
             * Generate Cloudinary URL
             * for the encrypted asset.
             */
            const encryptedUrl =
                cloudinary.url(
                    publicId,
                    {
                        resource_type:
                            resourceType,
                        secure: true,
                    }
                );

            /*
             * Fetch encrypted bytes
             * from Cloudinary.
             */
            const response =
                await fetch(
                    encryptedUrl
                );

            if (!response.ok) {
                return res
                    .status(404)
                    .json({
                        message:
                            "Encrypted file not found",
                    });
            }

            const encryptedBuffer =
                Buffer.from(
                    await response.arrayBuffer()
                );

            /*
             * Decrypt the file.
             */
            const decryptedFile =
                decryptFile(
                    encryptedBuffer,
                    {
                        platformId,
                        entity: "file",
                    }
                );

            /*
             * Return original file
             * to the frontend.
             */
            res.setHeader(
                "Content-Type",
                fileType ||
                    "application/octet-stream"
            );

            if (fileName) {
                res.setHeader(
                    "Content-Disposition",
                    `inline; filename="${encodeURIComponent(fileName)}"`
                );
            }

            return res.send(
                decryptedFile
            );

        } catch (error) {
            console.error(
                "File decrypt error:",
                error
            );

            return res
                .status(500)
                .json({
                    message:
                        "File decryption failed",
                    error:
                        error.message,
                });
        }
    }
);

/*

* ---
* Delete File
* ---
*
* A platform can only delete files inside
* its own Cloudinary folder.
* ---

*/

router.delete(
"/upload",


requirePlatform,

async (
    req,
    res
) => {

    try {

        const {

            publicId,

            resourceType =
                "image",

        } = req.body || {};


        const platformId =
            req.platformId;


        if (!publicId) {

            return res
                .status(400)
                .json({

                    message:
                        "publicId is required",

                });
        }


        /*
         * Verify that the public ID belongs
         * to the requesting platform.
         */

        const expectedPrefix =
            `communication-widget/${platformId}/`;


        if (

            !publicId.startsWith(
                expectedPrefix
            )

        ) {

            return res
                .status(403)
                .json({

                    message:
                        "File does not belong to this platform",

                });
        }


        await cloudinary
            .uploader
            .destroy(

                publicId,

                {

                    resource_type:
                        resourceType,

                }
            );


        return res
            .status(200)
            .json({

                message:
                    "File cleanup completed",

            });


    } catch (error) {

        console.error(
            "Cloudinary cleanup error:",
            error
        );


        return res
            .status(500)
            .json({

                message:
                    "File cleanup failed",

                error:
                    error.message,

            });
    }
}


);

export default router;
