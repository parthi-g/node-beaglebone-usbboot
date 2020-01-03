/* tslint:disable */

import { fixBuff } from './util';
const bp = require('binary-parser-encoder'); // Binary parser module
const sp = require('schemapack');
const Parser = bp.Parser;
// ether2 header for encoding
const ethhdr_e = sp.build([
  { h_dest: { 0: 'uint8', 1: 'uint8', 2: 'uint8', 3: 'uint8', 4: 'uint8', 5: 'uint8' } }, // Destination address
  { h_source: { 0: 'uint8', 1: 'uint8', 2: 'uint8', 3: 'uint8', 4: 'uint8', 5: 'uint8' } }, // Source address
  { h_proto: 'uint16' }, // Protocol Id
  { pad: 'string' }, // Padding to shift extra bit to last for Schemapack
]);

export class Eth {
  // ether header
  public parseEthHdr(buff: any) {
    const ethhdr = new Parser()
      .array('h_dest', {
        type: 'uint8',
        length: 6,
      })
      .array('h_source', {
        type: 'uint8',
        length: 6,
      })
      .uint16be('h_proto');
    return ethhdr.parse(buff);
  }

  // Function for ether2 data packet

  public makeEther2(dest: any, source: any, proto: any) {
    const eth = [{ h_dest: dest }, { h_source: source }, { h_proto: proto }];
    const data = fixBuff(ethhdr_e.encode(eth));
    return data;
  }
}
