///////////////////////////////////////// Function to remove extra byte from last /////////////////////////////////
export const fixBuff = (buff: Buffer): Buffer => {
    var bufFix = Buffer.alloc(buff.length - 1, 0, 'hex');
    buff.copy(bufFix, 0, 0, buff.length - 1);
    return bufFix;
}
export const stringToAscii = (filename: string): any => {
    let x = 0;
    const file_name = [];
    while (x <= 72) {
        x = file_name.push((x < filename.length) ? filename.charCodeAt(x) : 0);
    }
    return file_name;
}