import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let isMongoConnected = false;
const dataDir = path.join(__dirname, '../data');
const storeFile = path.join(dataDir, 'clearpoint-store.json');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export const getInitialSeedData = () => {
  const people = [
    {
      id: 'CS21B045',
      name: 'Ananya Rao',
      type: 'student',
      dept: 'Computer Science',
      year: '3rd Year',
      email: 'ananya@college.edu',
      faceDescriptor: 'SIMULATED',
      rfid: 'A1:B2:C3:D4',
      fingerId: 'FP-101',
      qrToken: 'CLPT-CS21B045-A9B1C2',
      createdAt: new Date(Date.now() - 30 * 86400000).toISOString()
    },
    {
      id: 'EC21B012',
      name: 'Rohan Sharma',
      type: 'student',
      dept: 'Electronics & Communication',
      year: '3rd Year',
      email: 'rohan.sharma@college.edu',
      faceDescriptor: 'SIMULATED',
      rfid: '89:AB:CD:EF',
      fingerId: 'FP-102',
      qrToken: 'CLPT-EC21B012-K4L5M6',
      createdAt: new Date(Date.now() - 30 * 86400000).toISOString()
    },
    {
      id: 'ME22B088',
      name: 'Priya Nair',
      type: 'student',
      dept: 'Mechanical Engineering',
      year: '2nd Year',
      email: 'priya.nair@college.edu',
      faceDescriptor: 'SIMULATED',
      rfid: '12:34:56:78',
      fingerId: 'FP-103',
      qrToken: 'CLPT-ME22B088-P7Q8R9',
      createdAt: new Date(Date.now() - 25 * 86400000).toISOString()
    },
    {
      id: 'IT20B003',
      name: 'Karthik Sundaram',
      type: 'student',
      dept: 'Information Technology',
      year: '4th Year',
      email: 'karthik.s@college.edu',
      faceDescriptor: 'SIMULATED',
      rfid: '45:67:89:AB',
      fingerId: 'FP-104',
      qrToken: 'CLPT-IT20B003-V1W2X3',
      createdAt: new Date(Date.now() - 40 * 86400000).toISOString()
    },
    {
      id: 'EMP-1042',
      name: 'Dr. Vikram Patel',
      type: 'staff',
      dept: 'Electronics & Communication',
      year: 'Associate Professor',
      email: 'vikram.patel@college.edu',
      faceDescriptor: 'SIMULATED',
      rfid: 'E5:F6:07:18',
      fingerId: 'FP-201',
      qrToken: 'CLPT-EMP1042-X7Y8Z9',
      createdAt: new Date(Date.now() - 60 * 86400000).toISOString()
    },
    {
      id: 'EMP-2089',
      name: 'Meera Sen',
      type: 'staff',
      dept: 'Computer Science',
      year: 'Lab Superintendent',
      email: 'meera.sen@college.edu',
      faceDescriptor: 'SIMULATED',
      rfid: '9C:3D:11:FA',
      fingerId: 'FP-202',
      qrToken: 'CLPT-EMP2089-T3U4V5',
      createdAt: new Date(Date.now() - 60 * 86400000).toISOString()
    }
  ];

  // Generate 5 days of realistic attendance history
  const today = new Date();
  const pastDates = [];
  for (let i = 4; i >= 1; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    pastDates.push(d.toISOString().slice(0, 10));
  }

  const attendance = [];
  pastDates.forEach((dateStr, dayIndex) => {
    // Ananya present 4 of 4 days
    attendance.push({
      _id: `att_seed_ananya_${dayIndex}`,
      personId: 'CS21B045',
      personName: 'Ananya Rao',
      personType: 'student',
      dept: 'Computer Science',
      date: dateStr,
      time: '08:45:12',
      methods: ['Face recognition', 'RFID card tap'],
      status: 'present',
      createdAt: `${dateStr}T08:45:12.000Z`
    });

    // Rohan present 3 of 4 days (missed day 2)
    if (dayIndex !== 1) {
      attendance.push({
        _id: `att_seed_rohan_${dayIndex}`,
        personId: 'EC21B012',
        personName: 'Rohan Sharma',
        personType: 'student',
        dept: 'Electronics & Communication',
        date: dateStr,
        time: '08:52:30',
        methods: ['Face recognition', 'Fingerprint'],
        status: 'present',
        createdAt: `${dateStr}T08:52:30.000Z`
      });
    }

    // Priya present all days
    attendance.push({
      _id: `att_seed_priya_${dayIndex}`,
      personId: 'ME22B088',
      personName: 'Priya Nair',
      personType: 'student',
      dept: 'Mechanical Engineering',
      date: dateStr,
      time: '08:40:05',
      methods: ['QR code scan', 'OTP'],
      status: 'present',
      createdAt: `${dateStr}T08:40:05.000Z`
    });

    // Karthik present 2 of 4 days (missed days 0 and 2)
    if (dayIndex % 2 === 1) {
      attendance.push({
        _id: `att_seed_karthik_${dayIndex}`,
        personId: 'IT20B003',
        personName: 'Karthik Sundaram',
        personType: 'student',
        dept: 'Information Technology',
        date: dateStr,
        time: '09:05:44',
        methods: ['Face recognition'],
        status: 'present',
        createdAt: `${dateStr}T09:05:44.000Z`
      });
    }

    // Dr. Vikram Patel present all days
    attendance.push({
      _id: `att_seed_vikram_${dayIndex}`,
      personId: 'EMP-1042',
      personName: 'Dr. Vikram Patel',
      personType: 'staff',
      dept: 'Electronics & Communication',
      date: dateStr,
      time: '08:30:19',
      methods: ['RFID card tap'],
      status: 'present',
      createdAt: `${dateStr}T08:30:19.000Z`
    });

    // Meera Sen present 3 of 4 days
    if (dayIndex !== 3) {
      attendance.push({
        _id: `att_seed_meera_${dayIndex}`,
        personId: 'EMP-2089',
        personName: 'Meera Sen',
        personType: 'staff',
        dept: 'Computer Science',
        date: dateStr,
        time: '08:38:50',
        methods: ['Fingerprint'],
        status: 'present',
        createdAt: `${dateStr}T08:38:50.000Z`
      });
    }
  });

  return {
    people,
    attendance,
    config: {
      face: true,
      rfid: false,
      finger: false,
      qr: false,
      otp: false,
      minDetectionScore: 0.72,
      faceMatchThreshold: 0.5
    }
  };
};

// Seed store if not present or empty
if (!fs.existsSync(storeFile)) {
  fs.writeFileSync(storeFile, JSON.stringify(getInitialSeedData(), null, 2), 'utf-8');
} else {
  // If store exists but has few people, refresh with rich seed data
  try {
    const existing = JSON.parse(fs.readFileSync(storeFile, 'utf-8'));
    if (!existing.people || existing.people.length < 4) {
      fs.writeFileSync(storeFile, JSON.stringify(getInitialSeedData(), null, 2), 'utf-8');
    }
  } catch (e) {}
}

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/clearpoint_attendance';
  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2000
    });
    isMongoConnected = true;
    console.log(`[Clearpoint] Connected to MongoDB at ${uri}`);
  } catch (error) {
    isMongoConnected = false;
    console.warn(`[Clearpoint] Notice: MongoDB service not detected on ${uri}`);
    console.log(`[Clearpoint] Seamlessly running with local JSON document store at ${storeFile}`);
  }
};

export const getDbStatus = () => ({
  connected: isMongoConnected,
  type: isMongoConnected ? 'mongodb' : 'json-store',
  storePath: storeFile
});

export const readFallbackStore = () => {
  try {
    const raw = fs.readFileSync(storeFile, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading fallback store:', err);
    return { people: [], attendance: [], config: {} };
  }
};

export const writeFallbackStore = (data) => {
  try {
    fs.writeFileSync(storeFile, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error writing fallback store:', err);
    return false;
  }
};
