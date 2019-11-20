// tslint:disable:no-bitwise
import * as usb from 'usb';
// import { delay, fromCallback, promisify } from 'bluebird';
// import { promisify } from 'bluebird';

import * as _debug from 'debug';
import { EventEmitter } from 'events';
import * as _os from 'os';
// import { readFile as readFile_ } from 'fs';
// import * as Path from 'path';

// const readFile = promisify(readFile_);
import { Message } from './messages'
// import { RNDIS } from './rndis';
const platform = _os.platform();
const debug = _debug('node-beaglebone-usbboot');

const POLLING_INTERVAL_MS = 2000;
// Delay in ms after which we consider that the device was unplugged (not resetted)
const DEVICE_UNPLUG_TIMEOUT = 5000;

// const USB_ENDPOINT_INTERFACES_SOC_BCM2835 = 0;
const USB_VENDOR_ID_TEXAS_INSTRUMENTS = 0x0451;
const USB_PRODUCT_ID_ROM = 0x6141;
const USB_PRODUCT_ID_SPL = 0xd022;

// When the pi reboots in mass storage mode, it has this product id
// const USB_VENDOR_ID_NETCHIP_TECHNOLOGY = 0x0525;
const USB_PRODUCT_ID_POCKETBOOK_PRO_903 = 0xa4a5;

const getDeviceId = (device: usb.Device): string => {
	return `${device.busNumber}:${device.deviceAddress}`;
};
export const isUsbBootCapableUSBDevice = (
	idVendor: number,
	idProduct: number,
): boolean => {
	return (
		idVendor === USB_VENDOR_ID_TEXAS_INSTRUMENTS &&
		(idProduct === USB_PRODUCT_ID_ROM || idProduct === USB_PRODUCT_ID_SPL)
	);
};
export const isROMUSBDevice = (
	idVendor: number,
	idProduct: number,
): boolean => {
	return (idVendor === USB_VENDOR_ID_TEXAS_INSTRUMENTS && idProduct === USB_PRODUCT_ID_ROM);
};
export const isSPLUSBDevice = (
	idVendor: number,
	idProduct: number,
): boolean => {
	return (idVendor === USB_VENDOR_ID_TEXAS_INSTRUMENTS && idProduct === USB_PRODUCT_ID_SPL);
};
const isUsbBootCapableUSBDevice$ = (device: usb.Device): boolean => {
	return isUsbBootCapableUSBDevice(
		device.deviceDescriptor.idVendor,
		device.deviceDescriptor.idProduct,
	);
};
const isBeagleBoneInMassStorageMode = (device: usb.Device): boolean => {
	return (
		device.deviceDescriptor.idVendor === USB_VENDOR_ID_TEXAS_INSTRUMENTS &&
		device.deviceDescriptor.idProduct === USB_PRODUCT_ID_POCKETBOOK_PRO_903
	);
};
const initializeDevice = (
	device: usb.Device,
): {
	iface: usb.Interface;
	inEndpoint: usb.InEndpoint;
	outEndpoint: usb.OutEndpoint;
} => {
	// interface is a reserved keyword in TypeScript so we use iface

	debug('bInterface', device.configDescriptor.bNumInterfaces);
	device.open();
	// Handle 2837 where it can start with two interfaces, the first is mass storage
	// the second is the vendor interface for programming

	const interfaceNumber = 1;
	// const endpointNumber = 2;
	/*
	if (
		device.configDescriptor.bNumInterfaces ===
		USB_ENDPOINT_INTERFACES_SOC_BCM2835
	) {
		interfaceNumber = 2;
		endpointNumber = 2;
	} else {
		interfaceNumber = 2;
		endpointNumber = 2;
	} */
	const iface = device.interface(interfaceNumber);
	iface.claim();
	// const endpoint = iface.endpoint(endpointNumber);
	const inEndpoint = iface.endpoints[0];
	const outEndpoint = iface.endpoints[1];
	if (!(inEndpoint instanceof usb.InEndpoint)) {
		console.log('endpoint is not an usb.OutEndpoint');
		throw new Error('endpoint is not an usb.OutEndpoint');
	}
	if (!(outEndpoint instanceof usb.OutEndpoint)) {
		throw new Error('endpoint is not an usb.OutEndpoint');
	}
	debug('Initialized device correctly', devicePortId(device));
	return { iface, inEndpoint, outEndpoint };
};
const initializeRNDIS = (device: usb.Device): usb.InEndpoint => {
	// console.log('RNDIS initialize');
	const interfaceNumber = 0;
	const iface0 = device.interface(interfaceNumber);
	iface0.claim();
	const iEndpoint = iface0.endpoints[0];
	if (!(iEndpoint instanceof usb.InEndpoint)) {
		throw new Error('endpoint is not an usb.OutEndpoint');
	} else {
		iEndpoint.startPoll(1, 256);
	}

	const CONTROL_BUFFER_SIZE = 1025;
	const message = new Message()
	const initMsg = message.getRNDISInit(); // RNDIS INIT Message
	// Windows Control Transfer
	// https://msdn.microsoft.com/en-us/library/aa447434.aspx
	// http://www.beyondlogic.org/usbnutshell/usb6.shtml
	const bmRequestType_send = 0x21; // USB_TYPE=CLASS | USB_RECIPIENT=INTERFACE
	const bmRequestType_receive = 0xa1; // USB_DATA=DeviceToHost | USB_TYPE=CLASS | USB_RECIPIENT=INTERFACE


	// Sending rndis_init_msg (SEND_ENCAPSULATED_COMMAND)
	device.controlTransfer(bmRequestType_send, 0, 0, 0, initMsg, error => {
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

	const setMsg = message.getRNDISSet(); // RNDIS SET Message

	// Send rndis_set_msg (SEND_ENCAPSULATED_COMMAND)
	device.controlTransfer(bmRequestType_send, 0, 0, 0, setMsg, error => {
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
	return iEndpoint;
}


export class UsbBBbootDevice extends EventEmitter {
	// LAST_STEP is hardcoded here as it is depends on the bootcode.bin file we send to the pi.
	// List of steps:
	// 0) device connects with iSerialNumber 0 and we write bootcode.bin to it
	// 1) the device detaches
	// 2 - 39) the device reattaches with iSerialNumber 1 and we upload the files it requires (the number of steps depends on the device)
	// 40) the device detaches
	// 41) the device reattaches as a mass storage device
	public static readonly LAST_STEP = 1122;
	private _step = 0;

	constructor(public portId: string) {
		super();
	}

	get progress() {
		return Math.round((this._step / UsbBBbootDevice.LAST_STEP) * 100);
	}

	get step() {
		return this._step;
	}

	set step(step: number) {
		this._step = step;
		this.emit('progress', this.progress);
	}
}

export class UsbBBbootScanner extends EventEmitter {
	private usbBBbootDevices = new Map<string, UsbBBbootDevice>();
	private boundAttachDevice: (device: usb.Device) => Promise<void>;
	private boundDetachDevice: (device: usb.Device) => void;
	private interval: number | undefined;
	private stepCounter: number;
	// We use both events ('attach' and 'detach') and polling getDeviceList() on usb.
	// We don't know which one will trigger the this.attachDevice call.
	// So we keep track of attached devices ids in attachedDeviceIds to not run it twice.
	private attachedDeviceIds = new Set<string>();

	constructor() {
		super();
		this.boundAttachDevice = this.attachDevice.bind(this);
		this.boundDetachDevice = this.detachDevice.bind(this);
	}

	public start(): void {
		debug('Waiting for BeagleBone');

		// Prepare already connected devices
		usb.getDeviceList().map(this.boundAttachDevice);

		// At this point all devices from `usg.getDeviceList()` above
		// have had an 'attach' event emitted if they were beaglebone.
		this.emit('ready');
		// Watch for new devices being plugged in and prepare them
		usb.on('attach', this.boundAttachDevice);
		// Watch for devices detaching
		usb.on('detach', this.boundDetachDevice);

		// ts-ignore because of a confusion between NodeJS.Timer and number
		// @ts-ignore
		this.interval = setInterval(() => {
			usb.getDeviceList().forEach(this.boundAttachDevice);
		}, POLLING_INTERVAL_MS);
	}

	public stop(): void {
		usb.removeListener('attach', this.boundAttachDevice);
		usb.removeListener('detach', this.boundDetachDevice);
		clearInterval(this.interval);
		this.usbBBbootDevices.clear();
	}

	private step(device: usb.Device, step: number): void {
		const usbBBbootDevice = this.getOrCreate(device);
		usbBBbootDevice.step = step;
		if (step === UsbBBbootDevice.LAST_STEP) {
			this.remove(device);
		}
	}

	private get(device: usb.Device): UsbBBbootDevice | undefined {
		const key = devicePortId(device);
		return this.usbBBbootDevices.get(key);
	}

	private getOrCreate(device: usb.Device): UsbBBbootDevice {
		const key = devicePortId(device);
		let usbBBbootDevice = this.usbBBbootDevices.get(key);
		if (usbBBbootDevice === undefined) {
			usbBBbootDevice = new UsbBBbootDevice(key);
			this.usbBBbootDevices.set(key, usbBBbootDevice);
			this.emit('attach', usbBBbootDevice);
		}
		return usbBBbootDevice;
	}

	private remove(device: usb.Device): void {
		const key = devicePortId(device);
		const usbBBbootDevice = this.usbBBbootDevices.get(key);
		if (usbBBbootDevice !== undefined) {
			this.usbBBbootDevices.delete(key);
			this.emit('detach', usbBBbootDevice);
		}
	}

	private async attachDevice(device: usb.Device): Promise<void> {
		let fileName;
		if (this.attachedDeviceIds.has(getDeviceId(device))) {
			// console.log('Device already exist')
			return;
		}
		this.attachedDeviceIds.add(getDeviceId(device));

		if (isBeagleBoneInMassStorageMode(device) && this.usbBBbootDevices.has(devicePortId(device))) {
			this.step(device, 1122);
			return;
		}
		if (!isUsbBootCapableUSBDevice$(device)) {
			return;
		}
		if (device.deviceDescriptor.iSerialNumber != 0) {
			return;
		}
		if (isROMUSBDevice(device.deviceDescriptor.idVendor, device.deviceDescriptor.idProduct)) {
			fileName = 'u-boot-spl.bin';
			this.stepCounter =0 ;
			// console.log('Attached Device:ROM:' + JSON.stringify(device));
		}
		if (isSPLUSBDevice(device.deviceDescriptor.idVendor, device.deviceDescriptor.idProduct)) {
			fileName = 'u-boot.img'
			// console.log('Attached Device:SPL:' + JSON.stringify(device));
		}
		debug('Found serial number', device.deviceDescriptor.iSerialNumber);
		debug('port id', devicePortId(device));
		try {
			let rndisInEndpoint: usb.InEndpoint;
			const { iface, inEndpoint, outEndpoint } = initializeDevice(device);
			debug('iface', iface);
			debug('inEndpoint', inEndpoint);
			debug('outEndpoint', outEndpoint);
			if (platform === 'win32') {
				// console.log('Running on windows');
				// const rndis = new RNDIS();
				// rndisInEndpoint = rndis.initialize(device);
				rndisInEndpoint = initializeRNDIS(device)
			}
			let serverConfig: any = {};
			serverConfig.foundDevice = '';
			serverConfig.bootpFile = fileName;
			inEndpoint.startPoll(1, 500); // MAXBUFF
			inEndpoint.on('data', (data: any) => {
				// console.log('I am reciving some data');
				// console.log(JSON.stringify(data));
				const message = new Message()
				const request = message.identify(serverConfig.foundDevice, data);
				switch (request) {
					case 'unidentified':
						// console.log(request);
						break;
					case 'TFTP':
						// console.log(request);
						serverConfig = message.getBootFile(data, serverConfig);
						if (!serverConfig.tftp.fileError) {
							const { tftpBuff, tftpServerConfig } = message.getTFTPData(serverConfig);
							serverConfig = tftpServerConfig;
							this.emit('outTransfer', outEndpoint, request, tftpBuff, this.stepCounter++);
						} else {
							this.emit('outTransfer', outEndpoint, request, message.getTFTPError(serverConfig), this.stepCounter)
						}
						break;
					case 'BOOTP':
						// console.log(request);
						const { bootPBuff, bootPServerConfig } = message.getBOOTPResponse(data, serverConfig);
						serverConfig = bootPServerConfig;
						this.emit('outTransfer', outEndpoint, request, bootPBuff, this.stepCounter++);
						break;
					case 'ARP':
						// console.log(request);
						const { arpBuff, arpServerConfig } = message.getARResponse(data, serverConfig)
						serverConfig = arpServerConfig;
						this.emit('outTransfer', outEndpoint, request, arpBuff, this.stepCounter++);
						break;
					case 'TFTP_Data':
						// console.log(request);
						if (serverConfig.tftp.i <= serverConfig.tftp.blocks) { // Transfer until all blocks of file are transferred
							const { tftpBuff, tftpServerConfig } = message.getTFTPData(serverConfig);
							serverConfig = tftpServerConfig;
							this.emit('outTransfer', outEndpoint, request, tftpBuff, this.stepCounter++)
						} else {
							// console.log(`${serverConfig.foundDevice} TFTP transfer complete`);
							inEndpoint.stopPoll();
							if(platform!='linux'){
								rndisInEndpoint.stopPoll(); // activate this only for Windows and Mac
							}
							this.step(device,this.stepCounter++);
							// console.log(`Number of steps completed:${this.stepCounter}`);
						}
						break;
					case 'NC':
						console.log(request);
						break;
					default:
						console.log(request);
				}
			});
			inEndpoint.on('error', (error: any) => {
				debug('error', error);
			});
			// device.close();
		} catch (error) {
			// console.log(error);
			debug('error', error, devicePortId(device));
			this.remove(device);
		}
		// Event for outEnd Transfer
		this.on('outTransfer', (outEndpoint: usb.OutEndpoint, request: any, response: any, step: number) => {
			// console.log('Step:' + step);
			outEndpoint.transfer(response, (error: any) => {
				if (!error) {
					if (request == 'BOOTP') {
						this.step(device,step);
						// console.log(`BOOTP reply done: step ${step}`);
					}
					if (request == 'ARP') {
						this.step(device,step);
						// console.log(`ARP reply done: step ${step}`);
					}
					if (request == 'TFTP') {
						this.step(device,step);
						// console.log(`TFTP reply done: step ${step}`);
					}
					if (request == 'TFTP_Data') {
						this.step(device,step);
						// console.log(`TFTP Data reply done: step ${step}`);
						
					}
				}
			});
		});
	}

	private detachDevice(device: usb.Device): void {
		// console.log('Detatch Device:' + device);
		this.attachedDeviceIds.delete(getDeviceId(device));
		if (!isUsbBootCapableUSBDevice$(device)) {
			return;
		}
		// const step = device.deviceDescriptor.iSerialNumber === 0 ? 1 : 40;
		const step = UsbBBbootDevice.LAST_STEP;
		debug('detach', devicePortId(device), step);
		this.step(device, step);
		// This timeout is here to differentiate between the device resetting and the device being unplugged
		// If the step didn't changed in 5 seconds, we assume the device was unplugged.
		setTimeout(() => {
			const usbBBbootDevice = this.get(device);
			if (usbBBbootDevice !== undefined && usbBBbootDevice.step === step) {
				debug(
					'device',
					devicePortId(device),
					'did not reattached after',
					DEVICE_UNPLUG_TIMEOUT,
					'ms.',
				);
				this.remove(device);
			}
		}, DEVICE_UNPLUG_TIMEOUT);
	}
}

const devicePortId = (device: usb.Device) => {
	let result = `${device.busNumber}`;
	if (device.portNumbers !== undefined) {
		result += `-${device.portNumbers.join('.')}`;
	}
	return result;
};