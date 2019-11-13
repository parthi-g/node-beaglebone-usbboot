const bp = require('binary-parser-encoder'); // Binary parser module
const Parser = bp.Parser;
export class IP {
    parseIpv4(buff: any) {
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
                type: 'uint8',
                length: 4
            })
            .array('DestinationAddress', {
                type: 'uint8',
                length: 4
            });
        return ipv4Hdr.parse(buff);
    }
    parseIpv6(buff: any) {
        // Parser for IPv6 Header
        const ipv6Hdr = new Parser()
            .endianess('big')
            //.bit4('Version')
            //.uint8('TrafficClass')
            //.bit20('FlowLabel') // Left 4 bits to hackaround bug
            .array('VTF', {
                type: 'uint8',
                length: 4
            })
            .uint16('PayloadLength')
            .uint8('NextHeader')
            .uint8('HopLimit')
            .array('SourceAddress', {
                type: 'uint8',
                length: 16
            })
            .array('DestinationAddress', {
                type: 'uint8',
                length: 16
            });
        return ipv6Hdr.parse(buff);
    }
    parseIpv6Option(buff: any) {
        // IPv6 Hop By Hop Option
        const ipv6Option = new Parser()
            .endianess('big')
            .uint8('NextHeader')
            .uint8('Length')
            .string('Data', {
                encoding: 'hex',
                length: 'Length'
            });
        return ipv6Option.parse(buff);
    }
    /*
    encodeIpv4(buff: any) {

    }
    encodeIpv6(buff: any) {

    }
    encodeIpv6Pseudo(buff: any) {

    }
    */
}