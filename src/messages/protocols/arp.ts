/* tslint:disable */

import { fixBuff } from './util';
const bp = require('binary-parser-encoder'); // Binary parser module
const Parser = bp.Parser;
const sp = require('schemapack');
// ARP header for response
const arphdr_e = sp.build([
  { htype: 'uint16' }, // Hardware type
  { ptype: 'uint16' }, // Protocol type
  { hlen: 'uint8' }, // Hardware Address length
  { plen: 'uint8' }, // Protocol Address length
  { opcode: 'uint16' }, // Operation code, here 2 for reply
  { hw_source: { 0: 'uint8', 1: 'uint8', 2: 'uint8', 3: 'uint8', 4: 'uint8', 5: 'uint8' } }, // Source MAC address
  { ip_source: { 0: 'uint8', 1: 'uint8', 2: 'uint8', 3: 'uint8' } }, // Source IP address
  { hw_dest: { 0: 'uint8', 1: 'uint8', 2: 'uint8', 3: 'uint8', 4: 'uint8', 5: 'uint8' } }, // Destination MAC address
  { ip_dest: { 0: 'uint8', 1: 'uint8', 2: 'uint8', 3: 'uint8' } }, // Destination IP address
  { pad: 'string' },
]);

export class ARP {
  public parseARP(buff: any) {
    const arphdr = new Parser()
      .uint16be('htype')
      .uint16be('ptype')
      .uint8('hlen')
      .uint8('plen')
      .uint16be('opcode')
      .array('hw_source', {
        length: 6,
        type: 'uint8',
      })
      .array('ip_source', {
        length: 4,
        type: 'uint8',
      })
      .array('hw_dest', {
        length: 6,
        type: 'uint8',
      })
      .array('ip_dest', {
        length: 4,
        type: 'uint8',
      });
    return arphdr.parse(buff);
  }
  // Function for ARP response
  public makeARP(opcode: any, hw_source: any, ip_source: any, hw_dest: any, ip_dest: any) {
    const arp = [
      { htype: 1 },
      { ptype: 0x0800 },
      { hlen: 6 },
      { plen: 4 },
      { opcode: opcode },
      { hw_source: hw_source },
      { ip_source: ip_source },
      { hw_dest: hw_dest },
      { ip_dest: ip_dest },
    ];
    return fixBuff(arphdr_e.encode(arp));
  }
}
