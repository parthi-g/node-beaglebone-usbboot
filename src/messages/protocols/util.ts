import { readFileSync } from 'fs';
import * as Path from 'path';
///////////////////////////////////////// Function to remove extra byte from last /////////////////////////////////
export const fixBuff = (buff: Buffer): Buffer => {
  const bufFix = Buffer.alloc(buff.length - 1, 0, 'hex');
  buff.copy(bufFix, 0, 0, buff.length - 1);
  return bufFix;
};
export const stringToAscii = (filename: string): any => {
  let x = 0;
  const fileName = [];
  while (x <= 72) {
    x = fileName.push(x < filename.length ? filename.charCodeAt(x) : 0);
  }
  return fileName;
};
export const safeReadFile = (filename: string): Buffer | undefined => {
  try {
    const filePath = Path.join(__dirname, '..', '..', '..', 'blobs', 'am335x', filename);
    return readFileSync(filePath);
  } catch (e) {
    // no data
    return undefined;
  }
};
