const bp = require('binary-parser-encoder'); // Binary parser module
const Parser = bp.Parser;
export class UDP {
    parseUdp(buff: any) {
        // UDP packet
        const udp = new Parser()
            .uint16be('udpSrc')
            .uint16be('udpDest')
            .uint16be('udpLen')
            .uint16be('chkSum');
        return udp.parse(buff);
    }
}