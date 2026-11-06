import { dataService } from '../services/dataService.js';

export const getConfig = async (req, res) => {
  try {
    const config = await dataService.getConfig();
    res.json({ success: true, data: config });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateConfig = async (req, res) => {
  try {
    const { face, rfid, finger, qr, otp, minDetectionScore, faceMatchThreshold } = req.body;
    const update = {};
    if (typeof face === 'boolean') update.face = face;
    if (typeof rfid === 'boolean') update.rfid = rfid;
    if (typeof finger === 'boolean') update.finger = finger;
    if (typeof qr === 'boolean') update.qr = qr;
    if (typeof otp === 'boolean') update.otp = otp;
    if (typeof minDetectionScore === 'number') update.minDetectionScore = minDetectionScore;
    if (typeof faceMatchThreshold === 'number') update.faceMatchThreshold = faceMatchThreshold;

    const updated = await dataService.updateConfig(update);
    res.json({ success: true, message: 'Configuration saved successfully.', data: updated });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
