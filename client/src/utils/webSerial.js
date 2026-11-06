let activePort = null;

export const isWebSerialSupported = () => {
  return typeof navigator !== 'undefined' && 'serial' in navigator;
};

export const isSerialConnected = () => {
  return activePort !== null;
};

export const connectSerialDevice = async (baudRate = 9600) => {
  if (!isWebSerialSupported()) {
    throw new Error('Web Serial API is not supported in this browser. Please use Chrome or Edge.');
  }

  try {
    const port = await navigator.serial.requestPort();
    await port.open({ baudRate });
    activePort = port;
    return port;
  } catch (err) {
    console.error('[WebSerial] Connection failed:', err);
    throw err;
  }
};

export const readSerialLine = async (port = activePort, timeoutMs = 15000) => {
  if (!port || !port.readable) {
    throw new Error('No open readable serial port.');
  }

  const textDecoder = new TextDecoderStream();
  const readableStreamClosed = port.readable.pipeTo(textDecoder.writable);
  const reader = textDecoder.readable.getReader();

  let lineBuffer = '';
  let timeoutHandle;

  try {
    const timeoutPromise = new Promise((_, reject) => {
      timeoutHandle = setTimeout(() => {
        reject(new Error('Serial read timed out waiting for sensor data.'));
      }, timeoutMs);
    });

    const readPromise = (async () => {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        lineBuffer += value;
        if (lineBuffer.includes('\n')) {
          const lines = lineBuffer.split('\n');
          const firstLine = lines[0].trim();
          if (firstLine.length > 0) {
            return firstLine;
          }
        }
      }
      return lineBuffer.trim();
    })();

    const result = await Promise.race([readPromise, timeoutPromise]);
    return result;
  } finally {
    clearTimeout(timeoutHandle);
    try {
      reader.releaseLock();
    } catch (e) {
      // Ignored
    }
  }
};

export const disconnectSerial = async () => {
  if (activePort) {
    try {
      await activePort.close();
    } catch (e) {
      console.warn('[WebSerial] Error closing port:', e);
    }
    activePort = null;
  }
};
