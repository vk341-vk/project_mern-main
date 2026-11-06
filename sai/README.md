# Clearpoint — Multi-Factor Attendance System (MERN Stack)

> A production-grade Multi-Factor Attendance & Identity Verification Console built with **MongoDB**, **Express.js**, **React.js**, and **Node.js** for educational institutions and corporate campuses.

---

## 🌟 Key Features

- **5-Layer Multi-Factor Verification Pipeline:**
  1. **Facial Biometrics:** Neural face detection and 128-dimensional descriptor extraction via `face-api.js` directly through the webcam with confidence checking (`minDetectionScore = 0.72`).
  2. **RFID Card Tap:** Web Serial API connection to RC522 RFID readers with real-time UID matching, plus 1-click test simulation.
  3. **Optical Fingerprint Scanner:** R307/AS608 sensor integration over USB serial with slot matching and simulated scan fallback.
  4. **Cryptographic QR Badges:** Instant generation of student/faculty QR codes and live camera scanning using `jsQR`.
  5. **Two-Factor OTP Dispatch:** Automated 6-digit one-time passcode delivery using `Nodemailer` with an offline resilience queue.
- **Dual Audience Architecture:**
  - Standardized pipeline for both **Students** (Roll Number, Department, Academic Year) and **Staff/Faculty** (Employee ID, Department, Designation).
- **Comprehensive Attendance & Compliance Records:**
  - Live dashboard with real-time metrics and verification channel health diagnostics.
  - Searchable, filterable audit log by candidate name, ID, person type, and date.
  - One-click CSV export (`/api/attendance/export/csv`).
  - Attendance rate analytics and cohort compliance calculations.
- **Resilient Database Layer:**
  - Connects to **MongoDB** (Local or MongoDB Atlas) using Mongoose schemas.
  - Automatically activates an embedded JSON document store fallback if a MongoDB service is not detected, enabling instant zero-setup development and demonstration!

---

## 🏗️ Project Architecture

```
sai/
├── package.json              # Root package orchestrating client and server concurrently
├── arduino/
│   └── clearpoint_sensors.ino # Firmware for RC522 RFID + R307 Fingerprint scanner
├── server/                   # Express + Node.js + Mongoose Backend
│   ├── package.json
│   ├── server.js             # API entrypoint, CORS, rate limits, health checks
│   ├── .env                  # Environment configuration
│   ├── config/
│   │   └── db.js             # Mongoose connection with resilient JSON fallback
│   ├── models/
│   │   ├── Person.js         # Student & Staff schema with biometric fields
│   │   ├── Attendance.js     # Timestamped attendance log schema
│   │   └── Config.js         # Security thresholds and verification toggles
│   ├── services/
│   │   └── dataService.js    # Unified database repository abstraction
│   ├── controllers/          # Business logic for People, Attendance, Reports, Config, OTP
│   ├── routes/               # Modular Express API routes
│   └── utils/
│       └── emailService.js   # Nodemailer OTP generator and mailer
└── client/                   # Modern React + Vite Frontend
    ├── package.json
    ├── vite.config.js        # Vite build config with /api proxy to port 5000
    ├── index.html            # Google Fonts (Space Grotesk, Inter, JetBrains Mono)
    └── src/
        ├── App.jsx           # Main controller and status monitor
        ├── index.css         # Dark cybernetic theme matching Clearpoint design
        ├── api/              # Fetch API client
        ├── utils/
        │   ├── faceApi.js    # face-api.js neural wrapper
        │   └── serial.js     # Web Serial API driver for Arduino hardware
        ├── components/
        │   ├── Sidebar.jsx   # Navigation & real-time status LEDs
        │   └── Toast.jsx     # Feedback notifications
        └── pages/
            ├── Dashboard.jsx # High-level stats, channel health, recent events
            ├── Register.jsx  # Candidate registration & biometric enrolment
            ├── Verify.jsx    # Live sequential verification engine
            ├── Records.jsx   # Attendance logs, filters, CSV export
            ├── Reports.jsx   # Compliance analytics & percentage rankings
            └── Settings.jsx  # Security layer toggles and confidence sliders
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js** v18+ (tested on Node.js v24)
- **npm** v9+
- *(Optional)* **MongoDB** running locally on `mongodb://127.0.0.1:27017` or a MongoDB Atlas connection string in `server/.env`.

### 2. Installation
Run the following from the root directory:

```bash
# Install root, server, and client dependencies
npm run install:all
```

### 3. Run the Development Server
Start both the Express backend (port 5000) and the React Vite client (port 5173) with one command:

```bash
npm run dev
```

Open your browser at:
👉 **`http://localhost:5173`**

---

## 📡 REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check & database connection status |
| `GET` | `/api/people` | Retrieve list of students and staff |
| `POST` | `/api/people` | Register new student or staff candidate |
| `POST` | `/api/people/:id/enrol` | Enrol biometrics (face, rfid, finger, qr) |
| `GET` | `/api/attendance` | Fetch attendance log with search & date filters |
| `POST` | `/api/attendance` | Mark attendance after multi-factor clearance |
| `DELETE` | `/api/attendance` | Clear all attendance records |
| `GET` | `/api/attendance/stats/dashboard` | Real-time counts and channel health stats |
| `GET` | `/api/attendance/export/csv` | Download complete attendance audit CSV |
| `GET` | `/api/reports` | Aggregate compliance percentage per candidate |
| `GET` | `/api/config` | Retrieve active verification layers & thresholds |
| `PUT` | `/api/config` | Update security configuration toggles |
| `POST` | `/api/otp/send` | Generate and dispatch 6-digit OTP code |
| `POST` | `/api/otp/verify` | Validate OTP code against active request |

---

## 🔌 Hardware Setup (Arduino Uno + RC522 + R307)

Flash the provided sketch located at:
[`arduino/clearpoint_sensors.ino`](file:///c:/Users/varun/OneDrive/Desktop/sai/arduino/clearpoint_sensors.ino)

### RC522 RFID Pinout (SPI):
- `3.3V` -> Arduino `3.3V` (Do **not** connect to 5V)
- `RST` -> Pin `9`
- `GND` -> `GND`
- `MISO` -> Pin `12`
- `MOSI` -> Pin `11`
- `SCK` -> Pin `13`
- `SDA/SS` -> Pin `10`

### R307 / AS608 Fingerprint Pinout:
- `VCC` -> Arduino `5V`
- `GND` -> `GND`
- `TX` -> Arduino Pin `2`
- `RX` -> Arduino Pin `3`

*Note: In the web console, click **"Read live from Arduino"** in Chrome or Edge to connect directly over Web Serial at 9600 baud! If hardware is not connected, the console provides 1-click test simulators for seamless demonstration.*
