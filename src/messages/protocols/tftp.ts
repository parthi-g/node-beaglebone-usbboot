/* tslint:disable */

import { fixBuff } from './util';
const sp = require('schemapack');

// TFTP packet --- this is only for ACK packets
const tftp = sp.build([
  { opcode: 'uint16' }, // Operation code, here 3 for read/write next block of data
  { blk_number: 'uint16' }, // Block number
  { pad: 'string' },
]);

// TFTP ERROR packet
const tftp_error = sp.build([{ opcode: 'uint16' }, { err_code: 'uint16' }, { err_mesg: 'string' }, { pad: 'string' }]);

export class TFTP {
  // Function for TFTP packet --- this is only for ACK packets
  public makeTFTP(opcode: any, blk_number: any) {
    const tftp_data = [{ opcode: opcode }, { blk_number: blk_number }];
    return fixBuff(tftp.encode(tftp_data));
  }
  // Function for TFTP error packet
  public makeTFTPError(opcode: any, err_code: any, desc: any) {
    const my_tftp_error = [{ opcode: opcode }, { err_code: err_code }, { err_msg: desc }];
    return fixBuff(tftp_error.encode(my_tftp_error));
  }
}
