import { ARP } from './arp'
import { BOOTP } from './bootp'
import { Eth } from './eth'
import { IP } from './ip'
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
    makeARP(opCode:any, hwSource:any, ipSource:any, hwDest:any, ipDest:any) {
        return new ARP().makeARP(opCode,hwSource,ipSource,hwDest,ipDest);
    }
}
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////// Headers for parsing (Binary-Praser) /////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/*
// ether header
const ethhdr = new Parser()
    .array('h_dest', {
        type: 'uint8',
        length: 6
    })
    .array('h_source', {
        type: 'uint8',
        length: 6
    })
    .uint16be('h_proto');

// ARP header
const arphdr = new Parser()
    .uint16be('htype')
    .uint16be('ptype')
    .uint8('hlen')
    .uint8('plen')
    .uint16be('opcode')
    .array('hw_source', {
        type: 'uint8',
        length: 6
    })
    .array('ip_source', {
        type: 'uint8',
        length: 4
    })
    .array('hw_dest', {
        type: 'uint8',
        length: 6
    })
    .array('ip_dest', {
        type: 'uint8',
        length: 4
    });

// UDP packet
const udp = new Parser()
    .uint16be('udpSrc')
    .uint16be('udpDest')
    .uint16be('udpLen')
    .uint16be('chkSum');

// BOOTP packet
const bootp = new Parser()
    .uint8('opcode')
    .uint8('hw')
    .uint8('hwlength')
    .uint8('hopcount')
    .uint32be('xid')
    .uint16be('secs')
    .uint16be('flags')
    .array('ciaddr', {
        type: 'uint8',
        length: 4
    })
    .array('yiaddr', {
        type: 'uint8',
        length: 4
    })
    .array('server_ip', {
        type: 'uint8',
        length: 4
    })
    .array('bootp_gw_ip', {
        type: 'uint8',
        length: 4
    })
    .array('hwaddr', {
        type: 'uint8',
        length: 16
    })
    .array('servername', {
        type: 'uint8',
        length: 64
    })
    .array('bootfile', {
        type: 'uint8',
        length: 128
    })
    .array('vendor', {
        type: 'uint8',
        length: 64
    });
*/