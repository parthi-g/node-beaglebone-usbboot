import { UsbBBbootDevice, UsbBBbootScanner } from './';

const main = () => {
  const scanner = new UsbBBbootScanner();
  scanner.on('attach', (usbBBbootDevice: UsbBBbootDevice) => {
    console.log('device attached', usbBBbootDevice.portId);
    usbBBbootDevice.on('progress', (progress: number) => {
      console.log('progress', usbBBbootDevice.portId, progress, '%');
      if (progress === 100) {
        console.log('device', usbBBbootDevice.portId, 'is ready');
      }
    });
  });
  scanner.on('detach', (usbBBbootDevice: UsbBBbootDevice) => {
    console.log('device', usbBBbootDevice.portId, 'detached');
  });
  console.log('Waiting for BeagleBone');
  try {
    scanner.start();
  } catch (err) {
    console.log(err);
  }
};

main();
