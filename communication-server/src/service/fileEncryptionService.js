import crypto from "crypto";

const ENCRYPTION_PREFIX = "enc";
const ENCRYPTION_VERSION = "v1";

const getEncryptionKey = () => {
    const secret = process.env.ENCRYPTION_KEY;

    if (!secret) {
        throw new Error("ENCRYPTION_KEY is missing");
    }

    return crypto
        .createHash("sha256")
        .update(secret, "utf8")
        .digest();
};

const createContext = ({
    platformId,
    entity = "file",
} = {}) => {
    return [
        platformId || "",
        entity,
    ].join("|");
};


/*
 * Encrypt file Buffer
 */
export const encryptFile = (
    fileBuffer,
    context = {}
) => {

    if (!Buffer.isBuffer(fileBuffer)) {
        throw new Error("File data must be a Buffer");
    }

    const key = getEncryptionKey();

    // AES-GCM recommended IV size
    const iv = crypto.randomBytes(12);

    const cipher = crypto.createCipheriv(
        "aes-256-gcm",
        key,
        iv
    );

    const aad = Buffer.from(
        createContext(context),
        "utf8"
    );

    cipher.setAAD(aad);

    const encrypted = Buffer.concat([
        cipher.update(fileBuffer),
        cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    /*
     * File format:
     *
     * enc:v1:<iv>:<authTag>:<encryptedData>
     *
     * We keep the envelope as Buffer.
     */
    const envelope = JSON.stringify({
        prefix: ENCRYPTION_PREFIX,
        version: ENCRYPTION_VERSION,
        iv: iv.toString("base64"),
        authTag: authTag.toString("base64"),
        data: encrypted.toString("base64"),
    });

    return Buffer.from(
        envelope,
        "utf8"
    );
};


/*
 * Decrypt file Buffer
 */
export const decryptFile = (
    encryptedBuffer,
    context = {}
) => {

    if (!Buffer.isBuffer(encryptedBuffer)) {
        throw new Error("Encrypted file data must be a Buffer");
    }

    let envelope;

    try {
        envelope = JSON.parse(
            encryptedBuffer.toString("utf8")
        );
    } catch {
        throw new Error(
            "Invalid encrypted file format"
        );
    }

    if (
        envelope.prefix !== ENCRYPTION_PREFIX ||
        envelope.version !== ENCRYPTION_VERSION ||
        !envelope.iv ||
        !envelope.authTag ||
        !envelope.data
    ) {
        throw new Error(
            "Invalid encrypted file envelope"
        );
    }

    const key = getEncryptionKey();

    const iv = Buffer.from(
        envelope.iv,
        "base64"
    );

    const authTag = Buffer.from(
        envelope.authTag,
        "base64"
    );

    const ciphertext = Buffer.from(
        envelope.data,
        "base64"
    );

    if (
        iv.length !== 12 ||
        authTag.length !== 16
    ) {
        throw new Error(
            "Invalid encryption parameters"
        );
    }

    const decipher = crypto.createDecipheriv(
        "aes-256-gcm",
        key,
        iv
    );

    const aad = Buffer.from(
        createContext(context),
        "utf8"
    );

    decipher.setAAD(aad);
    decipher.setAuthTag(authTag);

    return Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
    ]);
};