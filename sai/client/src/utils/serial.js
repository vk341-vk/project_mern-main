let currentPort = null;
let reader = null;

export const serialService = {
  isSupported() {
    return 'serial' in navigator;
  },

  isConnected() {
    return !!currentPort;
  },

  async requestAndConnect(baudRate = 9600) {
    if (!this.isSupported()) {
      throw new Error('Web Serial API is not supported in this browser. Please use Chrome or Edge on desktop.');
    }

    try {
      currentPort = await navigator.serial.requestPort();
      await currentPort.open({ baudRate });
      return true;
    } catch (err) {
      currentPort = null;
      throw new Error(err.message || 'Failed to open serial port.');
    }
  },

  async readNextLine(timeoutMs = 15000) {
    if (!currentPort || !currentPort.readable) {
      throw new Error('Serial port is not connected.');
    }

    reader = currentPort.readable.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    return new Promise((resolve, reject) => {
      const timer = setTimeout(async () => {
        try {
          if (reader) await reader.cancel();
        } catch (e) {}
        reject(new Error('Serial read timed out after 15s.'));
      }, timeoutMs);

      const readLoop = async () => {
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value);
            if (buffer.includes('\n')) {
              clearTimeout(timer);
              const line = buffer.split('\n')[0].trim();
              try {
                reader.releaseLock();
              } catch (e) {}
              resolve(line);
              return;
            }
          }
        } catch (err) {
          clearTimeout(timer);
          try {
            reader.releaseLock();
          } catch (e) {}
          reject(err);
        }
      };

      readLoop();
    });
  },

  async disconnect() {
    try {
      if (reader) {
        await reader.cancel();
        reader.releaseLock();
        reader = null;
      }
      if (currentPort) {
        await currentPort.close();
        currentPort = null;
      }
    } catch (e) {
      console.warn('Error during serial port disconnect:', e);
    }
  }
};
