import { dataService } from './services/dataService.js';
import { emailService } from './utils/emailService.js';
import { getDbStatus } from './config/db.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✕ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n======================================================');
  console.log('   CLEARPOINT MERN STACK — END-TO-END VERIFICATION');
  console.log('======================================================\n');

  // 1. Database & Persistence Status
  console.log('[1/7] Testing Storage Engine...');
  const dbStatus = getDbStatus();
  assert(dbStatus && (dbStatus.type === 'mongodb' || dbStatus.type === 'json-store'), 'Storage backend active');

  // 2. People & Enrolment
  console.log('\n[2/7] Testing People Enrolment & Constraints...');
  const initialPeople = await dataService.getPeople();
  assert(initialPeople.length >= 4, `Seed candidates loaded (${initialPeople.length} enrolled)`);

  const testStudentId = `TEST_STU_${Date.now().toString().slice(-4)}`;
  const createdStudent = await dataService.createPerson({
    id: testStudentId,
    name: 'Test Candidate',
    type: 'student',
    dept: 'Robotics',
    year: '1st Year',
    email: 'test.candidate@university.edu'
  });
  assert(createdStudent && createdStudent.id === testStudentId, 'New student registered successfully');

  // Test duplicate ID constraint
  let duplicateCaught = false;
  try {
    await dataService.createPerson({
      id: testStudentId,
      name: 'Duplicate Candidate',
      type: 'student'
    });
  } catch (err) {
    duplicateCaught = true;
  }
  assert(duplicateCaught, 'Duplicate candidate ID properly rejected');

  // Enrol credentials
  const enrolledRfid = await dataService.updatePerson(testStudentId, { rfid: '99:88:77:66' });
  assert(enrolledRfid.rfid === '99:88:77:66', 'RFID UID enrolled successfully');

  const enrolledFinger = await dataService.updatePerson(testStudentId, { fingerId: 'FP-888' });
  assert(enrolledFinger.fingerId === 'FP-888', 'Fingerprint ID enrolled successfully');

  const enrolledFace = await dataService.updatePerson(testStudentId, { faceDescriptor: 'SIMULATED' });
  assert(enrolledFace.faceDescriptor === 'SIMULATED', 'Face descriptor enrolled successfully');

  // 3. Attendance Logging & Same-Day Duplicate Prevention
  console.log('\n[3/7] Testing Attendance Pipeline...');
  const today = new Date().toISOString().slice(0, 10);
  const attRecord = await dataService.recordAttendance({
    personId: testStudentId,
    methods: ['Face recognition', 'RFID card tap'],
    date: today,
    status: 'present'
  });
  assert(attRecord && attRecord.personId === testStudentId, 'Attendance marked and logged');
  assert(attRecord._id, 'Attendance record assigned unique ID');

  // Test duplicate attendance rejection on same date
  let duplicateAttCaught = false;
  try {
    await dataService.recordAttendance({
      personId: testStudentId,
      date: today
    });
  } catch (err) {
    duplicateAttCaught = true;
  }
  assert(duplicateAttCaught, 'Duplicate attendance on same date blocked');

  // 4. Analytics & Compliance Reports
  console.log('\n[4/7] Testing Compliance & Reports...');
  const reportsData = await dataService.getReportsSummary();
  assert(reportsData && Array.isArray(reportsData.reports), 'Compliance reports calculated');
  assert(reportsData.totalSessions > 0, `Total unique sessions recorded: ${reportsData.totalSessions}`);

  const candidateReport = reportsData.reports.find((r) => r.id === testStudentId);
  assert(candidateReport && candidateReport.daysPresent >= 1, 'Candidate attendance percentage tracked correctly');

  // 5. Dashboard Metrics
  console.log('\n[5/7] Testing Dashboard Metrics...');
  const stats = await dataService.getDashboardStats();
  assert(stats.totalEnrolled >= 5, `Total enrolled count accurate: ${stats.totalEnrolled}`);
  assert(stats.presentTodayCount >= 1, `Present today count accurate: ${stats.presentTodayCount}`);
  assert(stats.rate >= 0 && stats.rate <= 100, `Cohort rate percentage valid: ${stats.rate}%`);

  // 6. Security Configuration
  console.log('\n[6/7] Testing System Security Configuration...');
  const currentConfig = await dataService.getConfig();
  assert(typeof currentConfig.face === 'boolean', 'Security layer flags accessible');

  const updatedConfig = await dataService.updateConfig({ rfid: true, minDetectionScore: 0.75 });
  assert(updatedConfig.rfid === true && updatedConfig.minDetectionScore === 0.75, 'Security configuration updated & saved');

  // Restore config
  await dataService.updateConfig({ rfid: false, minDetectionScore: 0.72 });

  // 7. OTP Second-Factor Delivery & Verification
  console.log('\n[7/7] Testing OTP Second-Factor Channel...');
  const otpResult = await emailService.sendOtpEmail(testStudentId, 'Test Candidate', 'test.candidate@university.edu');
  assert(otpResult && otpResult.code && otpResult.code.length === 6, `6-digit OTP generated: ${otpResult.code}`);

  // Test wrong code rejection
  const wrongCheck = emailService.verifyOtp(testStudentId, '000000');
  assert(!wrongCheck.valid, 'Invalid OTP code properly rejected');

  // Test correct code verification
  const correctCheck = emailService.verifyOtp(testStudentId, otpResult.code);
  assert(correctCheck.valid, 'Valid OTP code confirmed successfully');

  // Cleanup test candidate
  await dataService.deletePerson(testStudentId);
  console.log('\n------------------------------------------------------');
  console.log(`TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log('------------------------------------------------------\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
