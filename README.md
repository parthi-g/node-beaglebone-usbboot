# node-beaglebone-usbboot
Transforms BeagleBone to mass storage device


This is heavily based on [node-beagle-boot](https://github.com/ravikp7/node-beagle-boot) & 
[node-raspberrypi-usbboot](https://github.com/balena-io-modules/node-raspberrypi-usbboot)

On most GNU/Linux distributions, you'll need to run this as root.

```npm install```

```sudo npm start```

Now that everything is ready, we can transform BeagleBone to mass storage device:
* Makeing sure the device is powered off
* Pluging the USB cable to the device but not to the computer yet
* Pressing the the 'USER' button, and keep pressing it
* Pluging the USB cable: This will power up the device
* Releasing the 'USER' button

The device will now configure itself trough BOOTP and transform to mass storage device.
