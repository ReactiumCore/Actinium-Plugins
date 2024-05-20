import fs from 'fs';
import { promisify } from 'util';
import db from 'mime-db';
import mimeType from 'mime-type';

const mime = mimeType(db);
const readFile = promisify(fs.readFile);

const getFileAs = async (filePath) => {
    const fileBuffer = await readFile(filePath);
    const mimetype = mime(filePath);
    return {
        mimetype,
        result: fileBuffer,
    };
};

export const getDataURL = async (filePath, encoding = 'base64') => {
    const { mimetype, result } = await getFileAs(filePath);
    return `data:${mimetype};base64,${result.toString(encoding)}`;
};

export const getArrayBuffer = async (filePath) => {
    return getFileAs(filePath);
};

export const getBinaryString = async (filePath) => {
    const { mimetype, result } = await getFileAs(filePath);
    return { mimetype, result: result.toString('binary') };
};

export const getText = async (filePath, encoding = 'utf8') => {
    const { mimetype, result } = await getFileAs(filePath);
    return { mimetype, result: result.toString(encoding) };
};
