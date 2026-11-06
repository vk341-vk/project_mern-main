# Clearpoint — Multi-Factor Attendance System (MERN Stack)

A complete, production-grade **MERN stack** (MongoDB, Express, React, Node.js) multi-factor attendance verification console designed for educational institutions and corporate campuses.

Supports students and staff through a unified identity pipeline with **5 verification channels**:
1. **Face Recognition** (client-side 128D embeddings via `face-api.js` TinyFaceDetector, confidence score filtering, and Euclidean distance matching)
2. **RFID Card Tap** (Arduino Uno/Nano + RC522 over the browser's Web Serial API, with manual/simulation fallback)
3. **Fingerprint Biometrics** (Arduino + R307/AS608 optical sensor over Web Serial, with manual/simulation fallback)
4. **QR Code Attendance Credentials** (dynamic token badge generation + live camera stream decoding via `jsQR`)
5. **OTP Verification** (6-digit challenge passcodes with email delivery or live console simulation)

---

## 🏛️ System Architecture

```
                       ┌────────────────────────┐
                       │     React Frontend     │
                       │   (Vite + Lucide UI)   │
                       └───────────┬────────────┘
                                   │
              HTTP / REST API      │     Web Serial API (9600 baud)
           (http://localhost:5000) │
                                   ├────────────────────┐
                                   ▼                    ▼
                    ┌────────────────────────┐  ┌───────────────┐
                    │     Express Server     │  │  Arduino Uno  │
                    │   (Node.js + Morgan)   │  │  RC522 + R307 │
                    └───────────┬────────────┘  └───────────────┘
                                │
                                ▼
                    ┌────────────────────────┐
                    │    MongoDB Database    │
                    │ (Mongoose Collections) │
                    └────────────────────────┘
```

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js** (v18 or newer)
- **MongoDB** (running locally on port `27017` or a MongoDB Atlas URI)

### 2. Install Dependencies
Run the install command from the root directory:
```bash
npm run install:all
```
*(Or install in `server` and `client` individually: `cd server && npm install`, `cd client && npm install`)*

### 3. Seed Realistic Demo Data
Populate MongoDB with sample students, faculty staff, enrolled biometrics, and historical attendance logs:
```bash
npm run seed
```

### 4. Start the Full Application
Start both the backend Express server and Vite React frontend concurrently:
```bash
npm start
```
- **React Frontend**: [http://localhost:5173](http://localhost:5173)
- **Express Backend API**: [http://localhost:5000](http://localhost:5000)

---

## 📁 Project Structure

```
sai/
├── server/                       # Node.js + Express Backend
│   ├── config/
│   │   └── db.js                 # Mongoose MongoDB connection
│   ├── models/
│   │   ├── Person.js             # Student & Staff schema with biometric credentials
│   │   ├── Attendance.js         # Attendance records with methods and scores
│   │   ├── Config.js             # Dynamic verification pipeline configuration
│   │   └── Otp.js                # One-time passcode schema with TTL expiry
│   ├── routes/
│   │   ├── people.js             # People CRUD & biometric enrolment routes
│   │   ├── attendance.js         # Mark attendance, logs, CSV export, analytics
│   │   ├── config.js             # System verification layer toggles
│   │   ├── otp.js                # OTP generation and verification
│   │   └── health.js             # System diagnostics and MongoDB status
│   ├── utils/
│   │   └── seedData.js           # Database seeder with realistic test data
│   ├── .env                      # Environment config (PORT, MONGO_URI)
│   ├── package.json
│   └── server.js                 # Server entrypoint
│
├── client/                       # React 19 + Vite Frontend
│   ├── public/
│   ├── src/
│   │   ├── api/
│   │   │   └── index.js          # Axios API client functions
│   │   ├── components/
│   │   │   ├── Sidebar.jsx       # Navigation bar & real-time status LEDs
│   │   │   ├── Toast.jsx         # Notification toasts
│   │   │   └── Modal.jsx         # Modal dialogs for QR badges & previews
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx     # Live metrics, channel health, recent activity
│   │   │   ├── MarkAttendance.jsx# Multi-Factor Verification Pipeline Console
│   │   │   ├── RegisterPerson.jsx# Register Person & Enrol Biometrics
│   │   │   ├── PeopleDirectory.jsx# Searchable student/staff directory
│   │   │   ├── Records.jsx       # Filterable attendance log & CSV export
│   │   │   ├── Reports.jsx       # Department & personal attendance analytics
│   │   │   └── SystemConfig.jsx  # Toggle verification layers & diagnostic tests
│   │   ├── utils/
│   │   │   ├── faceApi.js        # Face-api.js embeddings & Euclidean matching
│   │   │   └── webSerial.js      # Web Serial API driver for Arduino sensors
│   │   ├── App.jsx               # Main application container
│   │   ├── index.css             # Dark cyber-industrial design tokens
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── arduino/
│   └── clearpoint_sensors.ino    # Arduino sketch for RC522 RFID & R307 Fingerprint
├── package.json                  # Root orchestration package
└── README.md
```

---

## 🔌 Hardware Wiring Guide (Arduino Uno)

If you have physical sensors, connect them to an **Arduino Uno** and flash `arduino/clearpoint_sensors.ino`:

| Sensor Pin | Arduino Pin | Description |
| :--- | :--- | :--- |
| **RC522 RFID** | | |
| 3.3V | **3.3V** | **Crucial: Do NOT connect to 5V!** |
| RST | Pin 9 | Reset pin |
| GND | GND | Ground |
| MISO | Pin 12 | SPI MISO |
| MOSI | Pin 11 | SPI MOSI |
| SCK | Pin 13 | SPI Clock |
| SDA (SS) | Pin 10 | SPI Slave Select |
| **R307 / AS608 Fingerprint** | | |
| VCC | 5V | Power |
| GND | GND | Ground |
| TX | Pin 2 | SoftwareSerial RX |
| RX | Pin 3 | SoftwareSerial TX |

*Note: In Chrome or Edge, click **"Connect Arduino & Tap Card"** to allow the browser to talk directly to the Arduino via the Web Serial API.*

---

## 📡 REST API Documentation

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/people` | List students and staff (filter by `type`, `search`) |
| `POST` | `/api/people` | Register a new person |
| `POST` | `/api/people/:id/enrol-face` | Enrol 128D face descriptor array |
| `POST` | `/api/people/:id/enrol-rfid` | Enrol RFID card UID |
| `POST` | `/api/people/:id/enrol-finger`| Enrol Fingerprint ID |
| `POST` | `/api/people/:id/enrol-qr` | Generate/assign attendance QR token |
| `DELETE` | `/api/people/:id` | Delete person and attendance records |
| `GET` | `/api/attendance` | Get attendance logs (filter by date, type, search) |
| `POST` | `/api/attendance` | Mark attendance (verifies duplicate for date) |
| `GET` | `/api/attendance/summary` | Dashboard metrics (totals, attendance rate) |
| `GET` | `/api/attendance/reports` | Analytics and percentage per person/department |
| `GET` | `/api/attendance/export-csv` | Download attendance database as CSV |
| `DELETE` | `/api/attendance` | Clear all attendance logs |
| `GET` | `/api/config` | Get current verification layers & thresholds |
| `PUT` | `/api/config` | Update required verification layers |
| `POST` | `/api/otp/generate` | Generate 6-digit challenge code |
| `POST` | `/api/otp/verify` | Verify 6-digit challenge code |
| `GET` | `/api/health` | System diagnostics & MongoDB connection status |
