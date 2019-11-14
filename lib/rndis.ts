/**
 * Remove this file 
 * Split the code and move index.ts -> message.ts -> protocols
 */

import * as usb from '@balena.io/usb';
const sp = require('schemapack');
const toggle = require('endian-toggle');
export class RNDIS {
	public initialize(device: usb.Device): usb.InEndpoint {
		console.log('RNDIS initialize');
		const inEndpoint = initialize$(device);
		const CONTROL_BUFFER_SIZE = 1025;
		const init_msg = this.make_rndis_init(); // RNDIS INIT Message
		// Windows Control Transfer
		// https://msdn.microsoft.com/en-us/library/aa447434.aspx
		// http://www.beyondlogic.org/usbnutshell/usb6.shtml
		const bmRequestType_send = 0x21; // USB_TYPE=CLASS | USB_RECIPIENT=INTERFACE
		const bmRequestType_receive = 0xa1; // USB_DATA=DeviceToHost | USB_TYPE=CLASS | USB_RECIPIENT=INTERFACE

		// const iEndpoint = intf0.endpoints[0];

		// Sending rndis_init_msg (SEND_ENCAPSULATED_COMMAND)
		device.controlTransfer(bmRequestType_send, 0, 0, 0, init_msg, error => {
			if (error)
				throw new Error(`Control transfer error on SEND_ENCAPSULATED ${error}`);
		});

		// Receive rndis_init_cmplt (GET_ENCAPSULATED_RESPONSE)
		device.controlTransfer(
			bmRequestType_receive,
			0x01,
			0,
			0,
			CONTROL_BUFFER_SIZE,
			error => {
				if (error)
					throw new Error(
						`Control transfer error on GET_ENCAPSULATED ${error}`,
					);
			},
		);

		const set_msg = this.make_rndis_set(); // RNDIS SET Message

		// Send rndis_set_msg (SEND_ENCAPSULATED_COMMAND)
		device.controlTransfer(bmRequestType_send, 0, 0, 0, set_msg, error => {
			if (error)
				throw new Error(`Control transfer error on SEND_ENCAPSULATED ${error}`);
		});
		// Receive rndis_init_cmplt (GET_ENCAPSULATED_RESPONSE)
		device.controlTransfer(
			bmRequestType_receive,
			0x01,
			0,
			0,
			CONTROL_BUFFER_SIZE,
			error => {
				if (error)
					throw new Error(
						`Control transfer error on GET_ENCAPSULATED ${error}`,
					);
			},
		);
		return inEndpoint;
	}

	///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	/////////////////////////////////////////// Packet make functions /////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////////////////////////////////////////

	// Function for rndis_init_msg packet
	make_rndis_init() {
		var rndis_init = [
			{ msg_type: 2 },
			{ msg_len: 24 },
			{ request_id: 1 },
			{ major_version: 1 },
			{ minor_version: 1 },
			{ max_transfer_size: 64 },
		];

		var data = this.fix_buff(rndis_init_hdr.encode(rndis_init));
		return toggle(data, 32); // convert byte order to little endian
	}

	// Function for rndis_set_msg packet
	make_rndis_set() {
		var rndis_set = [
			{ msg_type: 5 },
			{ msg_len: 28 },
			{ request_id: 23 },
			{ oid: 0x1010e },
			{ len: 4 },
			{ offset: 20 },
			{ reserved: 0 },
		];

		var oid_ = [{ oid_param: 0x1 | 0x8 | 0x4 | 0x20 }];

		var set_buf = this.fix_buff(rndis_set_hdr.encode(rndis_set));
		var oid_p = this.fix_buff(oid.encode(oid_));
		var data = Buffer.concat([set_buf, oid_p], 32);
		return toggle(data, 32); // convert byte order to little endian
	}

	///////////////////////////////////////// Function to remove extra byte from last /////////////////////////////////
	fix_buff(buf: Buffer): Buffer {
		var buf_fix = Buffer.alloc(buf.length - 1, 0, 'hex');
		buf.copy(buf_fix, 0, 0, buf.length - 1);
		return buf_fix;
	}
}
const initialize$ = (device: usb.Device): usb.InEndpoint => {
	// interface is a reserved keyword in TypeScript so we use iface
	const interfaceNumber = 0;
	const iface0 = device.interface(interfaceNumber);
	iface0.claim();
	const inEndpoint = iface0.endpoints[0];
	if (!(inEndpoint instanceof usb.InEndpoint)) {
		throw new Error('endpoint is not an usb.OutEndpoint');
	} else {
		inEndpoint.startPoll(1, 256);
	}

	return inEndpoint;
};

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////// Headers for encoding (Schemapack) //////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// RNDIS Initialize Header (https://msdn.microsoft.com/en-us/library/ms919811.aspx)
const rndis_init_hdr = sp.build([
	{ msg_type: 'uint32' },
	{ msg_len: 'uint32' },
	{ request_id: 'uint32' },
	{ major_version: 'uint32' },
	{ minor_version: 'uint32' },
	{ max_transfer_size: 'uint32' },
	{ pad: 'string' }, // For schemapack encoding fix
]);

// RNDIS Set Header (https://msdn.microsoft.com/en-us/library/ms919826.aspx)
const rndis_set_hdr = sp.build([
	{ msg_type: 'uint32' },
	{ msg_len: 'uint32' },
	{ request_id: 'uint32' },
	{ oid: 'uint32' },
	{ len: 'uint32' },
	{ offset: 'uint32' },
	{ reserved: 'uint32' },
	{ pad: 'string' },
]);

// oid parameter of 4 bytes
const oid = sp.build([{ oid_param: 'uint32' }, { pad: 'string' }]);
