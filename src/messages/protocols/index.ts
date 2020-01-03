import { ARP } from './arp';
import { BOOTP } from './bootp';
import { Eth } from './eth';
import { IP } from './ip';
import { RNDIS } from './rndis';
import { TFTP } from './tftp';
import { UDP } from './udp';
export class Parser {
  // ether header
  public parseEthHdr(buff: any) {
    return new Eth().parseEthHdr(buff);
  }
  // IPV4 header
  public parseIpv4(buff: any) {
    return new IP().parseIpv4(buff);
  }
  // IPV6 header
  public parseIpv6(buff: any) {
    return new IP().parseIpv6(buff);
  }
  public parseIpv6Option(buff: any) {
    return new IP().parseIpv6Option(buff);
  }
  // UDP packet
  public parseUdp(buff: any) {
    return new UDP().parseUdp(buff);
  }
  public parseBOOTP(buff: any) {
    return new BOOTP().parseBOOTP(buff);
  }
  public parseARP(buff: any) {
    return new ARP().parseARP(buff);
  }
}
// tslint:disable-next-line
export class Encoder {
  // Make RNDIS
  public makeRNDIS(dataLength: number): Buffer {
    return new RNDIS().makeRNDIS(dataLength);
  }
  public makeRNDISInit(): Buffer {
    return new RNDIS().makeRNDISInit();
  }
  public makeRNDISSet(): Buffer {
    return new RNDIS().makeRNDISSet();
  }
  public makeEther2(dest: any, source: any, proto: any): Buffer {
    return new Eth().makeEther2(dest, source, proto);
  }
  public makeIPV4(srcAddr: any, dstAddr: any, proto: any, id: any, totalLen: any, chksum: any): Buffer {
    return new IP().makeIPV4(srcAddr, dstAddr, proto, id, totalLen, chksum);
  }
  public makeUDP(udpDataLen: any, srcPort: any, dstPort: any): Buffer {
    return new UDP().makeUDP(udpDataLen, srcPort, dstPort);
  }
  public makeBOOTP(serverName: any, fileName: any, xid: any, hwDest: any, bbIP: any, serverIP: any): Buffer {
    return new BOOTP().makeBOOTP(serverName, fileName, xid, hwDest, bbIP, serverIP);
  }
  public makeARP(opCode: any, hwSource: any, ipSource: any, hwDest: any, ipDest: any) {
    return new ARP().makeARP(opCode, hwSource, ipSource, hwDest, ipDest);
  }
  public makeTFTP(opcode: any, blkNumber: any) {
    return new TFTP().makeTFTP(opcode, blkNumber);
  }
  public makeTFTPError(opcode: any, errCode: any, desc: any) {
    return new TFTP().makeTFTPError(opcode, errCode, desc);
  }
}
