import multer from "multer";

const fileFilter = (req, file, cb) => {

    const allowedTypes = [

        // Images
        "image/jpeg",
        "image/png",
        "image/webp",

        // Documents
        "application/pdf",
        "text/plain",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

        // Excel
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

        // ZIP
        "application/zip",
        "application/x-zip-compressed"
    ];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(
            new Error("File type not allowed"),
            false
        );
    }
};

const upload = multer({
    storage: multer.memoryStorage(),

    fileFilter,

    limits: {
        fileSize: 20 * 1024 * 1024
    }
});

export default upload;