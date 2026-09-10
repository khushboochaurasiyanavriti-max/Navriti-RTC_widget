import crypto from "crypto";

import dotenv from 'dotenv';

dotenv.config();


const ENCRYPTION_PREFIX = "enc";
const ENCRYPTION_VERSION = "v1";


const getEncryptionKey = () => {

    const secret =
        process.env.ENCRYPTION_KEY;


    if (!secret) {

        throw new Error(
            "ENCRYPTION_KEY is missing"
        );

    }


    /*
     * Convert the configured secret into
     * a fixed 32-byte AES-256 key.
     */

    return crypto
        .createHash("sha256")
        .update(
            secret,
            "utf8"
        )
        .digest();
};


const createContext = ({
    platformId,
    entity,
    field,
} = {}) => {

    return [
        platformId || "",
        entity || "",
        field || "",
    ].join("|");

};


/*
 * Strictly validate our encryption envelope.
 *
 * Format:
 *
 * enc:v1:<iv>:<authTag>:<ciphertext>
 */

export const isEncrypted = (
    value
) => {

    if (
        typeof value !== "string"
    ) {

        return false;

    }


    const parts =
        value.split(":");


    if (
        parts.length !== 5
    ) {

        return false;

    }

    const [
        prefix,
        version,
        ivBase64,
        authTagBase64,
        ciphertextBase64,
    ] = parts;


    if (
        prefix !== ENCRYPTION_PREFIX ||
        version !== ENCRYPTION_VERSION ||
        !ivBase64 ||
        !authTagBase64 ||
        !ciphertextBase64
    ) {

        return false;

    }


    try {

        const iv =
            Buffer.from(
                ivBase64,
                "base64"
            );


        const authTag =
            Buffer.from(
                authTagBase64,
                "base64"
            );


        const ciphertext =
            Buffer.from(
                ciphertextBase64,
                "base64"
            );


        return (
            iv.length === 12 &&
            authTag.length === 16 &&
            ciphertext.length > 0
        );

    } catch {

        return false;

    }

};


export const encrypt = (
    value,
    context = {}
) => {

    /*
     * Preserve null values.
     */

    if (
        value === null ||
        value === undefined
    ) {

        return value;

    }


    const plaintext =
        String(value);


    /*
     * Prevent accidental double encryption.
     */

    if (
        isEncrypted(
            plaintext
        )
    ) {

        return plaintext;

    }


    const key =
        getEncryptionKey();


    /*
     * AES-GCM recommended IV size.
     */

    const iv =
        crypto.randomBytes(
            12
        );


    const cipher =
        crypto.createCipheriv(
            "aes-256-gcm",
            key,
            iv
        );

    const aad =
        Buffer.from(
            createContext(
                context
            ),
            "utf8"
        );


    /*
     * Bind ciphertext to its application context.
     */

    cipher.setAAD(
        aad
    );


    const encrypted =
        Buffer.concat(
            [
                cipher.update(
                    plaintext,
                    "utf8"
                ),

                cipher.final(),
            ]
        );


    const authTag =
        cipher.getAuthTag();


    return [
        ENCRYPTION_PREFIX,
        ENCRYPTION_VERSION,

        iv.toString(
            "base64"
        ),

        authTag.toString(
            "base64"
        ),

        encrypted.toString(
            "base64"
        ),
    ].join(":");

};


export const decrypt = (
    value,
    context = {}
) => {

    if (
        value === null ||
        value === undefined
    ) {

        return value;

    }


    /*
     * Existing database records are plaintext.
     *
     * Therefore old data remains readable.
     */

    if (
        !isEncrypted(
            value
        )
    ) {

        return value;

    }


    const [
        ,
        ,
        ivBase64,
        authTagBase64,
        ciphertextBase64,
    ] =
        value.split(":");


    const key =
        getEncryptionKey();


    const iv =
        Buffer.from(
            ivBase64,
            "base64"
        );


    const authTag =
        Buffer.from(
            authTagBase64,
            "base64"
        );


    const ciphertext =
        Buffer.from(
            ciphertextBase64,
            "base64"
        );


    const decipher =
        crypto.createDecipheriv(
            "aes-256-gcm",
            key,
            iv
        );


    const aad =
        Buffer.from(
            createContext(
                context
            ),
            "utf8"
        );


    decipher.setAAD(
        aad
    );


    decipher.setAuthTag(
        authTag
    );


    const decrypted =
        Buffer.concat(
            [
                decipher.update(
                    ciphertext
                ),

                decipher.final(),
            ]
        );


    return decrypted.toString(
        "utf8"
    );

};