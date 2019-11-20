import { ARP } from './arp'
import { BOOTP } from './bootp'
import { Eth } from './eth'
import { IP } from './ip'
import { TFTP } from './tftp'
import { UDP } from './udp'
import { RNDIS } from './rndis';
export class Parse {
    // ether header
    parseEthHdr(buff: any) {
        return new Eth().parseEthHdr(buff);
    }
    // IPV4 header
    parseIpv4(buff: any) {
        return new IP().parseIpv4(buff);
    }
    // IPV6 header
    parseIpv6(buff: any) {
        return new IP().parseIpv6(buff);
    }
    parseIpv6Option(buff: any) {
        return new IP().parseIpv6Option(buff);
    }
    // UDP packet
    parseUdp(buff: any) {
        return new UDP().parseUdp(buff)
    }
    parseBOOTP(buff: any) {
        return new BOOTP().parseBOOTP(buff)
    }
    parseARP(buff: any) {
        return new ARP().parseARP(buff);
    }

}
export class Maker {
    // Make RNDIS
    makeRNDIS(dataLength: number): Buffer {
        return new RNDIS().makeRNDIS(dataLength);
    }
    makeRNDISInit(): Buffer {
        return new RNDIS().makeRNDISInit();
    }
    makeRNDISSet(): Buffer {
        return new RNDIS().makeRNDISSet();
    }
    makeEther2(dest: any, source: any, proto: any): Buffer {
        return new Eth().makeEther2(dest, source, proto)
    }
    makeIPV4(srcAddr: any, dstAddr: any, proto: any, id_: any, totalLen: any, chksum: any): Buffer {
        return new IP().makeIPV4(srcAddr, dstAddr, proto, id_, totalLen, chksum);
    }
    makeUDP(udpDataLen: any, srcPort: any, dstPort: any): Buffer {
        return new UDP().makeUDP(udpDataLen, srcPort, dstPort);
    }
    makeBOOTP(serverName: any, fileName: any, xid_: any, hwDest: any, bbIP: any, serverIP: any): Buffer {
        return new BOOTP().makeBOOTP(serverName, fileName, xid_, hwDest, bbIP, serverIP);
    }
    makeARP(opCode: any, hwSource: any, ipSource: any, hwDest: any, ipDest: any) {
        return new ARP().makeARP(opCode, hwSource, ipSource, hwDest, ipDest);
    }
    makeTFTP(opcode: any, blkNumber: any) {
        return new TFTP().makeTFTP(opcode, blkNumber);
    }
    makeTFTPError(opcode: any, errCode: any, desc: any) {
        return new TFTP().makeTFTPError(opcode, errCode, desc);
    }
}