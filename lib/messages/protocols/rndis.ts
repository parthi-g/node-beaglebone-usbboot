import { fixBuff } from './util'
const sp = require('schemapack');
const toggle = require('endian-toggle');

// rndis header for encoding
const rndis_1 = sp.build([
    { msg_type: 'uint32' },      // always
    { msg_len: 'uint32' },       // length of header + data + payload
    { data_offset: 'uint32' },   // offset from data until payload
    { data_len: 'uint32' },      // length of payload
    { band_offset: 'uint32' },   // not used here
    { pad: 'string' }
]);
const rndis_2 = sp.build([
    { band_len: 'uint32' },      // not used here
    { out_band_elements: 'uint32' }, //not used here
    { packet_offset: 'uint32' },     // not used here
    { packet_info_len: 'uint32' },   // not used here
    { reserved_first: 'uint32' },    // not used here
    { reserved_second: 'uint32' },   // not used here
    { pad: 'string' }
]);

export class RNDIS {
    // Function for rndis data packet
    makeRNDIS(dataLength: number): Buffer {
        const rndis1 = [
            { msg_type: 0x00000001 },
            { msg_len: dataLength + 44 },
            { data_offset: 0x24 },
            { data_len: dataLength },
            { band_offset: 0 }
        ];
        const rndis2 = [
            { band_len: 0 },
            { out_band_elements: 0 },
            { packet_offset: 0 },
            { packet_info_len: 0 },
            { reserved_first: 0 },
            { reserved_second: 0 }
        ];

        const buf1 = fixBuff(rndis_1.encode(rndis1));
        const buf2 = fixBuff(rndis_2.encode(rndis2));
        const data = Buffer.concat([buf1, buf2], 44);
        return toggle(data, 32);    // convert byte order to little endian
    }
}