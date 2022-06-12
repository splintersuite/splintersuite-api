import crypto from 'crypto';
const algorithm = 'aes-256-ctr';

// to be deployed on electron
// const hash = encrypt(Buffer.from('xdwwGodTierCLI', 'utf8'));
// hash.iv goes in the ss_access_token_iv header
// hash.content goes in the ss_access_token_content header
const encrypt = (text) => {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, process.env.SECRET_KEY, iv);
    const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);

    return {
        iv: iv.toString('hex'),
        content: encrypted.toString('hex'),
    };
};

const decrypt = (hash) => {
    const decipher = crypto.createDecipheriv(
        algorithm,
        process.env.SECRET_KEY,
        Buffer.from(hash.iv, 'hex')
    );

    const decrypted = Buffer.concat([
        decipher.update(Buffer.from(hash.content, 'hex')),
        decipher.final(),
    ]);

    return decrypted.toString();
};

// const { encrypt, decrypt } = require('./crypto');

const hash = encrypt(Buffer.from('xdwwGodTierCLI', 'utf8'));

console.log(hash);

// {
//     iv: '692e44dbbea073fc1a8d1c37ea68dffa',
//     content: 'bbffd902d55d7a00f3a0504e'
// }

const text = decrypt(hash);

console.log(text); // Hello World!

export default { encrypt, decrypt };
