const bp = require('binary-parser-encoder'); // Binary parser module
const Parser = bp.Parser;
export class Eth {
    // ether header
    parseEthHdr(buff: any) {
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
        return ethhdr.parse(buff)

    }
}