import { Parse, Maker } from './protocols';
const BOOTPS = 67;
const BOOTPC = 68;
const IP_UDP = 17;
const IPV6_HOP_BY_HOP_OPTION = 0;
const IPV6_ICMP = 0x3A;
//const IP_TCP = 0x06;
const TFTP_PORT = 69;
const NETCONSOLE_UDP_PORT = 6666;
const MDNS_UDP_PORT = 5353;
const ETH_TYPE_ARP = 0x0806;
const ETH_TYPE_IPV4 = 0x0800;
const ETH_TYPE_IPV6 = 0x86DD;
const LINUX_COMPOSITE_DEVICE = 'LINUX_COMPOSITE_DEVICE';
// Size of all protocol headers
const RNDIS_SIZE = 44;
const ETHER_SIZE = 14;
const IPV4_SIZE = 20;
const IPV6_SIZE = 40;
const UDP_SIZE = 8;
const MAXBUF = 500;
const BOOTP_SIZE = 300
const SERVER_IP = [0xc0, 0xa8, 0x01, 0x09]; // 192.168.1.9
const BB_IP = [0xc0, 0xa8, 0x01, 0x03]; // 192.168.1.3
const FULL_SIZE = 386;
const SERVER_NAME = [66, 69, 65, 71, 76, 69, 66, 79, 79, 84]; // ASCII ['B','E','A','G','L','E','B','O','O','T']
const ARP_SIZE = 28;
/*
const ARP_OPCODE_REQUEST = 1;
const ARP_OPCODE_REPLY = 2;



const ROM = 'ROM';
const SPL = 'SPL';
const UMS = 'UMS';
const ROM_VID = 0x0451;
const ROM_PID = 0x6141;
const SPL_VID = 0x0451;
const SPL_PID = 0xd022;
const LINUX_COMPOSITE_DEVICE_VID = 0x1d6b;
const LINUX_COMPOSITE_DEVICE_PID = 0x0104;
const ARP_SIZE = 28;
;
const const TFTP_SIZE = 4;

*/
export class Message {
    private parse: Parse;
    private maker: Maker;
    constructor() {
        this.parse = new Parse();
        this.maker = new Maker();
    }
    identify(foundDevice: string, buff: any): string {
        let rndisHeaderSize = (foundDevice === LINUX_COMPOSITE_DEVICE) ? 0 : RNDIS_SIZE;
        const parse = new Parse();
        const ether = parse.parseEthHdr(buff.slice(rndisHeaderSize));
        if (ether.h_proto === ETH_TYPE_ARP) return 'ARP';
        if (ether.h_proto === ETH_TYPE_IPV4) {
            const ipv4 = parse.parseIpv4(buff.slice(rndisHeaderSize + ETHER_SIZE));
            if (ipv4.Protocol === 2) return 'IGMP';
            if (ipv4.Protocol === IP_UDP) {
                const udp = parse.parseUdp(buff.slice(rndisHeaderSize + ETHER_SIZE + IPV4_SIZE));
                const sPort = udp.udpSrc;
                const dPort = udp.udpDest;
                if (sPort == BOOTPC && dPort == BOOTPS) return 'BOOTP'; // Port 68: BOOTP Client, Port 67: BOOTP Server
                if (dPort == TFTP_PORT) {
                    const opcode = buff[rndisHeaderSize + ETHER_SIZE + IPV4_SIZE + UDP_SIZE + 1];
                    if (opcode == 1) return 'TFTP'; // Opcode = 1 for Read Request (RRQ)
                    if (opcode == 4) return 'TFTP_Data'; // Opcode = 4 for Acknowledgement (ACK)
                }
                if (dPort == NETCONSOLE_UDP_PORT) return 'NC';
                if (dPort == MDNS_UDP_PORT && sPort == MDNS_UDP_PORT) return 'mDNS';
            }
        }
        if (ether.h_proto === ETH_TYPE_IPV6) {
            const ipv6 = parse.parseIpv6(buff.slice(rndisHeaderSize + ETHER_SIZE));
            if (ipv6.NextHeader === IPV6_HOP_BY_HOP_OPTION) {
                const ipv6Option = parse.parseIpv6Option(buff.slice(rndisHeaderSize + ETHER_SIZE + IPV6_SIZE));
                if (ipv6Option.NextHeader === IPV6_ICMP) return 'ICMPv6';
            }
            if (ipv6.NextHeader === IP_UDP) {
                const udp = parse.parseUdp(buff.slice(rndisHeaderSize + ETHER_SIZE + IPV6_SIZE));
                if (udp.udpSrc == MDNS_UDP_PORT && udp.udpDest == MDNS_UDP_PORT) return 'mDNS';
            }
        }
        return 'unidentified';
    }

    // Function to process BOOTP request
    getBOOTPResponse(data: any, serverConfig: any): { bootPBuff: Buffer, bootPServerConfig: any } {
        const etherBuf = Buffer.alloc(MAXBUF - RNDIS_SIZE);
        const udpBuf = Buffer.alloc(UDP_SIZE);
        const bootpBuf = Buffer.alloc(BOOTP_SIZE);
        data.copy(udpBuf, 0, RNDIS_SIZE + ETHER_SIZE + IPV4_SIZE, MAXBUF);
        data.copy(bootpBuf, 0, RNDIS_SIZE + ETHER_SIZE + IPV4_SIZE + UDP_SIZE, MAXBUF);
        data.copy(etherBuf, 0, RNDIS_SIZE, MAXBUF);
        serverConfig.ether = this.parse.parseEthHdr(etherBuf); // Gets decoded ether packet data
        const udpUboot = this.parse.parseUdp(udpBuf); // parsed udp header
        const bootp = this.parse.parseBOOTP(bootpBuf); // parsed bootp header
        const rndis = this.maker.makeRNDIS(FULL_SIZE - RNDIS_SIZE);
        const eth2 = this.maker.makeEther2(serverConfig.ether.h_source, serverConfig.ether.h_dest, ETH_TYPE_IPV4);
        const ip = this.maker.makeIPV4(SERVER_IP, BB_IP, IP_UDP, 0, IPV4_SIZE + UDP_SIZE + BOOTP_SIZE, 0);
        const udp = this.maker.makeUDP(BOOTP_SIZE, udpUboot.udpDest, udpUboot.udpSrc);
        const bootreply = this.maker.makeBOOTP(SERVER_NAME, serverConfig.bootpFile, bootp.xid, serverConfig.ether.h_source, BB_IP, SERVER_IP);
        const bootPBuff = Buffer.concat([rndis, eth2, ip, udp, bootreply], FULL_SIZE)
        const bootPServerConfig = serverConfig;
        return { bootPBuff, bootPServerConfig };
    }
    // Function to process ARP request
    getARResponse(data: any, serverConfig: any): { arpBuff: Buffer, arpServerConfig: any } {
        const arpBuf = Buffer.alloc(ARP_SIZE);
        data.copy(arpBuf, 0, RNDIS_SIZE + ETHER_SIZE, RNDIS_SIZE + ETHER_SIZE + ARP_SIZE);
        serverConfig.receivedARP = this.parse.parseARP(arpBuf); // Parsed received ARP request
        const arpResponse = this.maker.makeARP(2, serverConfig.ether.h_dest, serverConfig.receivedARP.ip_dest, serverConfig.receivedARP.hw_source, serverConfig.receivedARP.ip_source);
        const rndis = this.maker.makeRNDIS(ETHER_SIZE + ARP_SIZE);
        const eth2 = this.maker.makeEther2(serverConfig.ether.h_source, serverConfig.ether.h_dest, ETH_TYPE_ARP);
        const arpBuff = Buffer.concat([rndis, eth2, arpResponse], RNDIS_SIZE + ETHER_SIZE + ARP_SIZE);
        const arpServerConfig = serverConfig;
        return { arpBuff, arpServerConfig };
    };
}