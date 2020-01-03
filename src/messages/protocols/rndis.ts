/* tslint:disable */

import { fixBuff } from './util';
const sp = require('schemapack');
const toggle = require('endian-toggle');

// rndis header for encoding
const rndis_1 = sp.build([
  { msg_type: 'uint32' }, // always
  { msg_len: 'uint32' }, // length of header + data + payload
  { data_offset: 'uint32' }, // offset from data until payload
  { data_len: 'uint32' }, // length of payload
  { band_offset: 'uint32' }, // not used here
  { pad: 'string' },
]);
const rndis_2 = sp.build([
  { band_len: 'uint32' }, // not used here
  { out_band_elements: 'uint32' }, // not used here
  { packet_offset: 'uint32' }, // not used here
  { packet_info_len: 'uint32' }, // not used here
  { reserved_first: 'uint32' }, // not used here
  { reserved_second: 'uint32' }, // not used here
  { pad: 'string' },
]);
// RNDIS Initialize Header (https://msdn.microsoft.com/en-us/library/ms919811.aspx)
const rndis_init_hdr = sp.build([
  { msg_type: 'uint32' },
  { msg_len: 'uint32' },
  { request_id: 'uint32' },
  { major_version: 'uint32' },
  { minor_version: 'uint32' },
  { max_transfer_size: 'uint32' },
  { pad: 'string' }, // For schemapack encoding fix
]);

// RNDIS Set Header (https://msdn.microsoft.com/en-us/library/ms919826.aspx)
const rndis_set_hdr = sp.build([
  { msg_type: 'uint32' },
  { msg_len: 'uint32' },
  { request_id: 'uint32' },
  { oid: 'uint32' },
  { len: 'uint32' },
  { offset: 'uint32' },
  { reserved: 'uint32' },
  { pad: 'string' },
]);

// oid parameter of 4 bytes
const oid = sp.build([{ oid_param: 'uint32' }, { pad: 'string' }]);

export class RNDIS {
  // Function for rndis data packet
  public makeRNDIS(dataLength: number): Buffer {
    const rndis1 = [
      { msg_type: 0x00000001 },
      { msg_len: dataLength + 44 },
      { data_offset: 0x24 },
      { data_len: dataLength },
      { band_offset: 0 },
    ];
    const rndis2 = [
      { band_len: 0 },
      { out_band_elements: 0 },
      { packet_offset: 0 },
      { packet_info_len: 0 },
      { reserved_first: 0 },
      { reserved_second: 0 },
    ];

    const buf1 = fixBuff(rndis_1.encode(rndis1));
    const buf2 = fixBuff(rndis_2.encode(rndis2));
    const data = Buffer.concat([buf1, buf2], 44);
    return toggle(data, 32); // convert byte order to little endian
  }
  public makeRNDISInit(): Buffer {
    const rndis_init = [
      { msg_type: 2 },
      { msg_len: 24 },
      { request_id: 1 },
      { major_version: 1 },
      { minor_version: 1 },
      { max_transfer_size: 64 },
    ];

    const data = fixBuff(rndis_init_hdr.encode(rndis_init));
    return toggle(data, 32); // convert byte order to little endian
  }
  public makeRNDISSet(): Buffer {
    const rndis_set = [
      { msg_type: 5 },
      { msg_len: 28 },
      { request_id: 23 },
      { oid: 0x1010e },
      { len: 4 },
      { offset: 20 },
      { reserved: 0 },
    ];

    const oid_ = [{ oid_param: 0x1 | 0x8 | 0x4 | 0x20 }];

    const set_buf = fixBuff(rndis_set_hdr.encode(rndis_set));
    const oid_p = fixBuff(oid.encode(oid_));
    const data = Buffer.concat([set_buf, oid_p], 32);
    return toggle(data, 32); // convert byte order to little endian
  }
}
