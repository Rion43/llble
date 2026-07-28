import { BleManager, Device } from 'react-native-ble-plx';

export interface BleDevice {
  id: string;
  name: string | null;
  rssi: number | null;
}

export class BleScanner {
  private manager: BleManager;

  constructor() {
    this.manager = new BleManager();
  }

  async scan(timeoutMs = 10000): Promise<BleDevice[]> {
    const devices: Map<string, BleDevice> = new Map();

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.manager.stopDeviceScan();
        resolve();
      }, timeoutMs);

      this.manager.startDeviceScan(
        null,
        null,
        (error, device) => {
          if (error) {
            clearTimeout(timer);
            this.manager.stopDeviceScan();
            reject(error);
            return;
          }
          if (device) {
            devices.set(device.id, {
              id: device.id,
              name: device.name || null,
              rssi: device.rssi ?? null,
            });
          }
        },
      );
    });

    return Array.from(devices.values());
  }

  stopScan(): void {
    this.manager.stopDeviceScan();
  }

  async connect(id: string): Promise<Device> {
    const device = await this.manager.connectToDevice(id);
    await device.discoverAllServicesAndCharacteristics();
    return device;
  }

  destroy(): void {
    this.manager.destroy();
  }
}
