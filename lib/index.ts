// tslint:disable:no-bitwise

import * as usb from '@balena.io/usb';
// import { delay, fromCallback, promisify } from 'bluebird';
// import { promisify } from 'bluebird';
import * as _debug from 'debug';
import { EventEmitter } from 'events';
// import { readFile as readFile_ } from 'fs';
// import * as Path from 'path';

// const readFile = promisify(readFile_);
import * as _utils from 'util';
const debug = _debug('node-beaglebone-usbboot');

const POLLING_INTERVAL_MS = 2000;
// Delay in ms after which we consider that the device was unplugged (not resetted)
const DEVICE_UNPLUG_TIMEOUT = 5000;

// const USB_ENDPOINT_INTERFACES_SOC_BCM2835 = 0;
const USB_VENDOR_ID_TEXAS_INSTRUMENTS = 0x0451;
const USB_PRODUCT_ID_ROM = 0x6141;
const USB_PRODUCT_ID_SPL = 0xd022;

// When the pi reboots in mass storage mode, it has this product id
const USB_VENDOR_ID_NETCHIP_TECHNOLOGY = 0x0525;
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

const isUsbBootCapableUSBDevice$ = (device: usb.Device): boolean => {
	return isUsbBootCapableUSBDevice(
		device.deviceDescriptor.idVendor,
		device.deviceDescriptor.idProduct,
	);
};
const isBeagleBoneInMassStorageMode = (device: usb.Device): boolean => {
	return (
		device.deviceDescriptor.idVendor === USB_VENDOR_ID_NETCHIP_TECHNOLOGY &&
		device.deviceDescriptor.idProduct === USB_PRODUCT_ID_POCKETBOOK_PRO_903
	);
};
const initializeDevice = (
	device: usb.Device,
): { iface: usb.Interface; endpoint: usb.OutEndpoint } => {
	// interface is a reserved keyword in TypeScript so we use iface

	debug('device', device);
	console.log(_utils.inspect(device));
	debug('bInterface', device.configDescriptor.bNumInterfaces);
	device.open();
	// Handle 2837 where it can start with two interfaces, the first is mass storage
	// the second is the vendor interface for programming

	const interfaceNumber = 1;
	const endpointNumber = 2;
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
	const endpoint = iface.endpoint(endpointNumber);
	if (!(endpoint instanceof usb.OutEndpoint)) {
		throw new Error('endpoint is not an usb.OutEndpoint');
	}
	debug('Initialized device correctly', devicePortId(device));
	return { iface, endpoint };
};

const secondStageBoot = async (
	device: usb.Device,
	endpoint: usb.OutEndpoint,
) => {
	console.log(`device${device} & endpoint${endpoint}`);
};

export class UsbbootDevice extends EventEmitter {
	// LAST_STEP is hardcoded here as it is depends on the bootcode.bin file we send to the pi.
	// List of steps:
	// 0) device connects with iSerialNumber 0 and we write bootcode.bin to it
	// 1) the device detaches
	// 2 - 39) the device reattaches with iSerialNumber 1 and we upload the files it requires (the number of steps depends on the device)
	// 40) the device detaches
	// 41) the device reattaches as a mass storage device
	public static readonly LAST_STEP = 41;
	private _step = 0;

	constructor(public portId: string) {
		super();
	}

	get progress() {
		return Math.round((this._step / UsbbootDevice.LAST_STEP) * 100);
	}

	get step() {
		return this._step;
	}

	set step(step: number) {
		this._step = step;
		this.emit('progress', this.progress);
	}
}

export class UsbbootScanner extends EventEmitter {
	private usbbootDevices = new Map<string, UsbbootDevice>();
	private boundAttachDevice: (device: usb.Device) => Promise<void>;
	private boundDetachDevice: (device: usb.Device) => void;
	private interval: number | undefined;
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
		this.usbbootDevices.clear();
	}

	private step(device: usb.Device, step: number): void {
		const usbbootDevice = this.getOrCreate(device);
		usbbootDevice.step = step;
		if (step === UsbbootDevice.LAST_STEP) {
			this.remove(device);
		}
	}

	private get(device: usb.Device): UsbbootDevice | undefined {
		const key = devicePortId(device);
		return this.usbbootDevices.get(key);
	}

	private getOrCreate(device: usb.Device): UsbbootDevice {
		const key = devicePortId(device);
		let usbbootDevice = this.usbbootDevices.get(key);
		if (usbbootDevice === undefined) {
			usbbootDevice = new UsbbootDevice(key);
			this.usbbootDevices.set(key, usbbootDevice);
			this.emit('attach', usbbootDevice);
		}
		return usbbootDevice;
	}

	private remove(device: usb.Device): void {
		const key = devicePortId(device);
		const usbbootDevice = this.usbbootDevices.get(key);
		if (usbbootDevice !== undefined) {
			this.usbbootDevices.delete(key);
			this.emit('detach', usbbootDevice);
		}
	}

	private async attachDevice(device: usb.Device): Promise<void> {
		if (this.attachedDeviceIds.has(getDeviceId(device))) {
			return;
		}
		this.attachedDeviceIds.add(getDeviceId(device));

		if (
			isBeagleBoneInMassStorageMode(device) &&
			this.usbbootDevices.has(devicePortId(device))
		) {
			this.step(device, 41);
			return;
		}
		if (!isUsbBootCapableUSBDevice$(device)) {
			return;
		}
		debug('Found serial number', device.deviceDescriptor.iSerialNumber);
		debug('port id', devicePortId(device));
		try {
			const { endpoint } = initializeDevice(device);
			if (device.deviceDescriptor.iSerialNumber === 0) {
				debug('Sending u-boot-spl.bin', devicePortId(device));
				this.step(device, 0);
				await secondStageBoot(device, endpoint);
				// The device will now detach and reattach with iSerialNumber 1.
				// This takes approximately 1.5 seconds
			} else {
				debug('Second stage boot server', devicePortId(device));
				await this.fileServer(device, endpoint, 2);
			}
			device.close();
		} catch (error) {
			debug('error', error, devicePortId(device));
			this.remove(device);
		}
	}

	private detachDevice(device: usb.Device): void {
		this.attachedDeviceIds.delete(getDeviceId(device));
		if (!isUsbBootCapableUSBDevice$(device)) {
			return;
		}
		const step = device.deviceDescriptor.iSerialNumber === 0 ? 1 : 40;
		debug('detach', devicePortId(device), step);
		this.step(device, step);
		// This timeout is here to differentiate between the device resetting and the device being unplugged
		// If the step didn't changed in 5 seconds, we assume the device was unplugged.
		setTimeout(() => {
			const usbbootDevice = this.get(device);
			if (usbbootDevice !== undefined && usbbootDevice.step === step) {
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

	private async fileServer(
		device: usb.Device,
		endpoint: usb.OutEndpoint,
		step: number,
	) {
		console.log(`device:${device}, endpoint${endpoint} and step${step}`);
		// Write file server call here
	}
}

const devicePortId = (device: usb.Device) => {
	let result = `${device.busNumber}`;
	if (device.portNumbers !== undefined) {
		result += `-${device.portNumbers.join('.')}`;
	}
	return result;
};
