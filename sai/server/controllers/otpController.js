import { emailService } from '../utils/emailService.js';
import { dataService } from '../services/dataService.js';

export const sendOtp = async (req, res) => {
  try {
    const { personId } = req.body;
    if (!personId) {
      return res.status(400).json({ success: false, message: 'personId is required' });
    }

    const person = await dataService.getPersonById(personId);
    if (!person) {
      return res.status(404).json({ success: false, message: 'Person not found' });
    }

    const result = await emailService.sendOtpEmail(person.id, person.name, person.email);

    res.json({
      success: true,
      message: `OTP dispatched to ${person.email || person.id}`,
      data: {
        code: result.code, // Returned for instant testing/simulation in sandbox & offline environments
        email: result.email,
        delivered: result.delivered,
        previewUrl: result.previewUrl
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const { personId, code } = req.body;
    if (!personId || !code) {
      return res.status(400).json({ success: false, message: 'personId and code are required' });
    }

    const check = emailService.verifyOtp(personId, code);
    if (!check.valid) {
      return res.status(400).json({ success: false, message: check.message });
    }

    res.json({ success: true, message: check.message });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
