import crypto from 'crypto';

// https://attacomsian.com/blog/nodejs-encrypt-decrypt-data

const decrypt = (hash) => {
    const decipher = crypto.createDecipheriv(
        'aes-256-ctr',
        process.env.SECRET_KEY,
        Buffer.from(hash.iv, 'hex')
    );

    const decrypted = Buffer.concat([
        decipher.update(Buffer.from(hash.content, 'hex')),
        decipher.final(),
    ]);

    return decrypted.toString();
};

export default decrypt;
