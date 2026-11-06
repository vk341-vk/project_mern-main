require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Person = require('../models/Person');
const Attendance = require('../models/Attendance');
const Config = require('../models/Config');

const seedData = async () => {
  try {
    await connectDB();

    console.log('[Seed] Cleaning old demo data...');
    await Person.deleteMany({});
    await Attendance.deleteMany({});
    await Config.deleteMany({});

    console.log('[Seed] Creating System Config...');
    await Config.create({
      key: 'system_config',
      face: true,
      rfid: true,
      finger: false,
      qr: true,
      otp: false,
      institutionName: 'Clearpoint Academy & Tech Campus',
      lateThreshold: '09:30:00',
      allowManualFallback: true,
      minFaceDetectionScore: 0.72,
      faceMatchThreshold: 0.50
    });

    console.log('[Seed] Creating demo people (Students & Staff)...');
    const demoPeople = [
      {
        id: 'CS21B045',
        name: 'Ananya Rao',
        type: 'student',
        dept: 'Computer Science',
        year: '3rd Year',
        email: 'ananya.rao@college.edu',
        faceDescriptor: 'SIMULATED',
        rfid: 'E4:92:A1:0F',
        fingerId: 'FP-101',
        qrToken: 'CLPT-CS21B045-8K92L1'
      },
      {
        id: 'EE22B018',
        name: 'Rohan Sharma',
        type: 'student',
        dept: 'Electrical Engineering',
        year: '2nd Year',
        email: 'rohan.s@college.edu',
        faceDescriptor: 'SIMULATED',
        rfid: 'A2:7B:39:1C',
        fingerId: 'FP-102',
        qrToken: 'CLPT-EE22B018-9P43M2'
      },
      {
        id: 'ME20B102',
        name: 'Vikram Aditya',
        type: 'student',
        dept: 'Mechanical Engineering',
        year: '4th Year',
        email: 'vikram.a@college.edu',
        faceDescriptor: 'SIMULATED',
        rfid: 'C8:55:12:F3',
        fingerId: 'FP-103',
        qrToken: 'CLPT-ME20B102-1Z77X9'
      },
      {
        id: 'EMP-1042',
        name: 'Dr. Srinivas Iyer',
        type: 'staff',
        dept: 'Computer Science',
        year: 'Associate Professor',
        email: 'srinivas.iyer@college.edu',
        faceDescriptor: 'SIMULATED',
        rfid: '99:1F:B4:88',
        fingerId: 'FP-201',
        qrToken: 'CLPT-EMP-1042-3B44Q7'
      },
      {
        id: 'EMP-2089',
        name: 'Meera Nambiar',
        type: 'staff',
        dept: 'Administration',
        year: 'Lab Superintendent',
        email: 'meera.n@college.edu',
        faceDescriptor: 'SIMULATED',
        rfid: '33:88:EA:51',
        fingerId: 'FP-202',
        qrToken: 'CLPT-EMP-2089-7H22R5'
      }
    ];

    const insertedPeople = await Person.insertMany(demoPeople);
    console.log(`[Seed] Inserted ${insertedPeople.length} people.`);

    // Add some sample attendance for the past 3 days
    const today = new Date();
    const dates = [];
    for (let i = 2; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().slice(0, 10));
    }

    const attendanceRecords = [
      {
        personId: 'CS21B045',
        personName: 'Ananya Rao',
        personType: 'student',
        dept: 'Computer Science',
        date: dates[0],
        time: '08:52:14',
        methods: ['Face recognition', 'RFID tap'],
        status: 'present',
        verificationScore: 0.96
      },
      {
        personId: 'EE22B018',
        personName: 'Rohan Sharma',
        personType: 'student',
        dept: 'Electrical Engineering',
        date: dates[0],
        time: '09:05:40',
        methods: ['Face recognition', 'RFID tap'],
        status: 'present',
        verificationScore: 0.94
      },
      {
        personId: 'EMP-1042',
        personName: 'Dr. Srinivas Iyer',
        personType: 'staff',
        dept: 'Computer Science',
        date: dates[0],
        time: '08:40:11',
        methods: ['RFID tap'],
        status: 'present',
        verificationScore: 1.0
      },
      {
        personId: 'CS21B045',
        personName: 'Ananya Rao',
        personType: 'student',
        dept: 'Computer Science',
        date: dates[1],
        time: '08:55:00',
        methods: ['Face recognition', 'QR scan'],
        status: 'present',
        verificationScore: 0.95
      },
      {
        personId: 'EMP-2089',
        personName: 'Meera Nambiar',
        personType: 'staff',
        dept: 'Administration',
        date: dates[1],
        time: '08:35:19',
        methods: ['Face recognition', 'Fingerprint'],
        status: 'present',
        verificationScore: 0.98
      },
      {
        personId: 'CS21B045',
        personName: 'Ananya Rao',
        personType: 'student',
        dept: 'Computer Science',
        date: dates[2],
        time: '08:49:33',
        methods: ['Face recognition', 'RFID tap'],
        status: 'present',
        verificationScore: 0.97
      },
      {
        personId: 'EMP-1042',
        personName: 'Dr. Srinivas Iyer',
        personType: 'staff',
        dept: 'Computer Science',
        date: dates[2],
        time: '08:42:05',
        methods: ['RFID tap', 'OTP'],
        status: 'present',
        verificationScore: 1.0
      }
    ];

    await Attendance.insertMany(attendanceRecords);
    console.log(`[Seed] Inserted ${attendanceRecords.length} historical attendance logs.`);

    console.log('[Seed] Database seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('[Seed] Error seeding data:', error);
    process.exit(1);
  }
};

seedData();
