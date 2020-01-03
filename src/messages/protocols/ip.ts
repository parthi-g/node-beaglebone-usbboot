/* tslint:disable */

import { fixBuff } from './util';
const sp = require('schemapack');
const bp = require('binary-parser-encoder'); // Binary parser module
const Parser = bp.Parser;
// ipv4 header in two parts for encoding
const iphdr1 = sp.build([
  { ver_hl: 'uint8' }, // version and header length each of 4 bits
  { tos: 'uint8' }, // Type of service
  { tot_len: 'uint16' }, // Total length of IP datagram
  { id: 'uint16' }, // Identfication
  { frag_off: 'uint16' }, // Flag and Fragment offset
  { ttl: 'uint8' }, // Time to live
  { protocol: 'uint8' }, // Protocol UDP/IP here
  { check: 'uint16' }, // Checksum for IP header
  { pad: 'string' }, // Padding to shift extra bit to last for Schemapack
]);
const iphdr2 = sp.build([
  { saddr: { 0: 'uint8', 1: 'uint8', 2: 'uint8', 3: 'uint8' } }, // Source IP address (Server)
  { daddr: { 0: 'uint8', 1: 'uint8', 2: 'uint8', 3: 'uint8' } }, // Destination IP address (BB)
  { pad: 'string' },
]);

export class IP {
  public parseIpv4(buff: any) {
    // Parser for IPv4 Header
    const ipv4Hdr = new Parser()
      .endianess('big')
      .bit4('Version')
      .bit4('IHL')
      .uint8('TypeOfService')
      .uint16('TotalLength')
      .uint16('Identification')
      .bit3('Flags')
      .bit13('FragmentOffset')
      .uint8('TimeToLIve')
      .uint8('Protocol')
      .uint16('HeaderChecksum')
      .array('SourceAddress', {
        length: 4,
        type: 'uint8',
      })
      .array('DestinationAddress', {
        length: 4,
        type: 'uint8',
      });
    return ipv4Hdr.parse(buff);
  }
  public parseIpv6(buff: any) {
    // Parser for IPv6 Header
    const ipv6Hdr = new Parser()
      .endianess('big')
      // .bit4('Version')
      // .uint8('TrafficClass')
      // .bit20('FlowLabel') // Left 4 bits to hackaround bug
      .array('VTF', {
        length: 4,
        type: 'uint8',
      })
      .uint16('PayloadLength')
      .uint8('NextHeader')
      .uint8('HopLimit')
      .array('SourceAddress', {
        length: 16,
        type: 'uint8',
      })
      .array('DestinationAddress', {
        length: 16,
        type: 'uint8',
      });
    return ipv6Hdr.parse(buff);
  }
  public parseIpv6Option(buff: any) {
    // IPv6 Hop By Hop Option
    const ipv6Option = new Parser()
      .endianess('big')
      .uint8('NextHeader')
      .uint8('Length')
      .string('Data', {
        encoding: 'hex',
        length: 'Length',
      });
    return ipv6Option.parse(buff);
  }

  // Function for ipv4 header packet
  public makeIPV4(src_addr: any, dst_addr: any, proto: any, id_: any, total_len: any, chksum: any) {
    const ip1 = [
      { ver_hl: 69 },
      { tos: 0 },
      { tot_len: total_len },
      { id: id_ },
      { frag_off: 0 },
      { ttl: 64 },
      { protocol: proto },
      { check: chksum },
    ];
    const ip2 = [{ saddr: src_addr }, { daddr: dst_addr }];
    const buf1 = fixBuff(iphdr1.encode(ip1));
    const buf2 = fixBuff(iphdr2.encode(ip2));
    let data = Buffer.concat([buf1, buf2], 20);

    // Calculating Checksum and adding it in packet
    if (!chksum) {
      const ip = new Parser() // Parsing packet data as array of 2 byte words
        .array('data', {
          length: 10,
          type: 'uint16be',
        });
      const ip_packet = ip.parse(data);
      // Checksum calculation
      let i = 0;
      let sum = 0;
      while (i < 10) {
        sum += ip_packet.data[i++];
        var a = sum.toString(16);
        if (a.length > 4) {
          sum = parseInt(a[1] + a[2] + a[3] + a[4], 16) + 1;
        }
      }
      a = (~sum >>> 0).toString(16); // Invert bitwise and unsign the number
      sum = parseInt(a[4] + a[5] + a[6] + a[7], 16); // Taking 2 bytes out of the inverted bytes
      data = this.makeIPV4(src_addr, dst_addr, proto, id_, total_len, sum); // Making packet again with checksum
    }

    return data;
  }
}
