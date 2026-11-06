/*
 ============================================================================
  CLEARPOINT MULTI-FACTOR ATTENDANCE SYSTEM — ARDUINO SENSORS FIRMWARE
  Hardware Modules:
    1. RC522 RFID Reader / Writer (SPI)
    2. R307 / AS608 Optical Fingerprint Scanner (SoftwareSerial)
  Communication:
    USB Serial to Clearpoint Web Console at 9600 baud
 ============================================================================

  WIRING DIAGRAM (Arduino Uno / Nano):
  -------------------------------------------------------------
  RC522 RFID Module (SPI):
    - 3.3V  -> Arduino 3.3V  (CAUTION: Do NOT connect to 5V!)
    - RST   -> Arduino Pin 9
    - GND   -> Arduino GND
    - MISO  -> Arduino Pin 12
    - MOSI  -> Arduino Pin 11
    - SCK   -> Arduino Pin 13
    - SDA/SS-> Arduino Pin 10

  R307 / AS608 Fingerprint Module (UART):
    - VCC   -> Arduino 5V
    - GND   -> Arduino GND
    - TXD   -> Arduino Pin 2 (Fingerprint RX on Arduino)
    - RXD   -> Arduino Pin 3 (Fingerprint TX on Arduino)
  -------------------------------------------------------------
*/

#include <SPI.h>
#include <MFRC522.h>
#include <SoftwareSerial.h>
#include <Adafruit_Fingerprint.h>

// RFID Pin Configuration
#define SS_PIN 10
#define RST_PIN 9
MFRC522 rfid(SS_PIN, RST_PIN);

// Fingerprint Sensor Pins (SoftwareSerial)
#define FP_RX_PIN 2
#define FP_TX_PIN 3
SoftwareSerial fpSerial(FP_RX_PIN, FP_TX_PIN);
Adafruit_Fingerprint finger = Adafruit_Fingerprint(&fpSerial);

unsigned long lastRfidScan = 0;
unsigned long lastFingerScan = 0;
const unsigned long DEBOUNCE_DELAY = 1500; // 1.5 second scan cooldown

void setup() {
  Serial.begin(9600);
  while (!Serial) { delay(10); } // Wait for USB Serial link

  // Initialize SPI & RC522
  SPI.begin();
  rfid.PCD_Init();

  // Initialize Fingerprint Module
  finger.begin(57600);
  delay(100);

  // Ready beacon
  Serial.println("CLEARPOINT_ARDUINO_ONLINE:RC522+R307_READY");
}

void loop() {
  // 1. Check for RFID Card Tap
  checkRfid();

  // 2. Check for Fingerprint Sensor Placement
  checkFingerprint();

  delay(50);
}

void checkRfid() {
  if (millis() - lastRfidScan < DEBOUNCE_DELAY) return;

  // Look for new cards
  if (!rfid.PICC_IsNewCardPresent()) return;
  if (!rfid.PICC_ReadCardSerial()) return;

  // Format Card UID as uppercase hex string with colons (e.g., A1:B2:C3:D4)
  String uidString = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    if (rfid.uid.uidByte[i] < 0x10) uidString += "0";
    uidString += String(rfid.uid.uidByte[i], HEX);
    if (i < rfid.uid.size - 1) uidString += ":";
  }
  uidString.toUpperCase();

  // Transmit UID to Clearpoint Web Serial Link
  Serial.println(uidString);

  // Halt card to prevent repeated reads
  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();
  lastRfidScan = millis();
}

void checkFingerprint() {
  if (millis() - lastFingerScan < DEBOUNCE_DELAY) return;

  uint8_t p = finger.getImage();
  if (p != FINGERPRINT_OK) return;

  p = finger.image2Tz();
  if (p != FINGERPRINT_OK) return;

  p = finger.fingerFastSearch();
  if (p == FINGERPRINT_OK) {
    // Found a match in onboard database!
    String fingerTag = "FP-" + String(finger.fingerID);
    Serial.println(fingerTag);
    lastFingerScan = millis();
  } else if (p == FINGERPRINT_NOTFOUND) {
    Serial.println("FP-UNKNOWN");
    lastFingerScan = millis();
  }
}
