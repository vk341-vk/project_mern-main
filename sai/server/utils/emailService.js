import nodemailer from 'nodemailer';

// In-memory OTP cache: personId -> { code, expiresAt, email }
const activeOtps = new Map();

let transporter = null;

const initTransporter = async () => {
  if (transporter) return transporter;

  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  } else {
    // Development fallback test account
    try {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
      console.log(`[Clearpoint OTP] Initialized Ethereal test mailer (${testAccount.user})`);
    } catch (e) {
      console.warn('[Clearpoint OTP] Ethereal mailer setup deferred, running in simulation mode.');
      transporter = null;
    }
  }
  return transporter;
};

export const emailService = {
  generateOtp(personId, email) {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
    activeOtps.set(String(personId).toUpperCase(), { code, expiresAt, email });
    return code;
  },

  async sendOtpEmail(personId, personName, email) {
    const code = this.generateOtp(personId, email);
    let previewUrl = null;
    let delivered = false;

    try {
      const mailer = await initTransporter();
      if (mailer && email && email.includes('@')) {
        const info = await mailer.sendMail({
          from: '"Clearpoint Security Console" <security@clearpoint.local>',
          to: email,
          subject: 'Your Clearpoint Multi-Factor Attendance Code',
          html: `
            <div style="font-family:sans-serif; background:#0B0F14; color:#E7EDF2; padding:24px; border-radius:8px; max-width:480px; margin:auto;">
              <h2 style="color:#5EEAD4; margin-top:0;">Clearpoint Verification</h2>
              <p>Hello <strong>${personName}</strong>,</p>
              <p>Your one-time verification code to mark attendance is:</p>
              <div style="background:#121820; border:1px solid #26313C; color:#5EEAD4; font-size:32px; font-weight:700; text-align:center; padding:16px; border-radius:6px; letter-spacing:4px; font-family:monospace;">
                ${code}
              </div>
              <p style="color:#8CA0AE; font-size:12px; margin-top:16px;">This OTP expires in 5 minutes. If you did not initiate attendance, please notify system administration.</p>
            </div>
          `
        });
        previewUrl = nodemailer.getTestMessageUrl(info) || null;
        delivered = true;
      }
    } catch (err) {
      console.warn('[Clearpoint OTP] Mail dispatch error, proceeding with simulated code:', err.message);
    }

    return {
      code,
      email: email || 'No email registered (test delivery)',
      delivered,
      previewUrl
    };
  },

  verifyOtp(personId, code) {
    const cleanId = String(personId).toUpperCase();
    const entry = activeOtps.get(cleanId);
    if (!entry) {
      return { valid: false, message: 'No active OTP request found for this person.' };
    }
    if (Date.now() > entry.expiresAt) {
      activeOtps.delete(cleanId);
      return { valid: false, message: 'OTP has expired. Please request a new code.' };
    }
    if (String(entry.code).trim() !== String(code).trim()) {
      return { valid: false, message: 'Invalid OTP code. Please check and retry.' };
    }

    activeOtps.delete(cleanId);
    return { valid: true, message: 'OTP verified successfully.' };
  }
};
