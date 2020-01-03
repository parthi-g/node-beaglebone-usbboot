/* tslint:disable */

import { fixBuff } from './util';
const bp = require('binary-parser-encoder'); // Binary parser module
const sp = require('schemapack');
const Parser = bp.Parser;
// UDP Packet for encoding
const udp_e = sp.build([
  { udpSrc: 'uint16' }, // Server UDP port
  { udpDst: 'uint16' }, // BB UDP port
  { udpLen: 'uint16' }, // UDP data length + UDP header length
  { chkSum: 'uint16' }, // Checksum
  { pad: 'string' },
]);
export class UDP {
  public parseUdp(buff: any) {
    // UDP packet
    const udp = new Parser()
      .uint16be('udpSrc')
      .uint16be('udpDest')
      .uint16be('udpLen')
      .uint16be('chkSum');
    return udp.parse(buff);
  }
  // Function for UDP packet
  public makeUDP(udpDataLen: any, srcPort: any, dstPort: any) {
    const udp = [{ udpSrc: srcPort }, { udpDst: dstPort }, { udpLen: udpDataLen + 8 }, { chkSum: 0 }];
    return fixBuff(udp_e.encode(udp));
  }
}
