/*
  Clearpoint Multi-Factor Attendance System
  Arduino Sensor Interface: MFRC522 (RFID) & R307/AS608 (Fingerprint)
  
  Wiring Guide:
  --------------------------------------------------
  MFRC522 (RFID)        Arduino Uno
  SDA (SS)              Pin 10
  SCK                   Pin 13
  MOSI                  Pin 11
  MISO                  Pin 12
  RST                   Pin 9
  3.3V                  3.3V (Do NOT connect to 5V!)
  GND                   GND
  
  R307 / AS608          Arduino Uno
  VCC                   5V
  GND                   GND
  TX                    Pin 2 (SoftwareSerial RX)
  RX                    Pin 3 (SoftwareSerial TX, via voltage divider if 3.3V logic)
  --------------------------------------------------
*/

#include <SPI.h>
#include <MFRC522.h>
#include <SoftwareSerial.h>
#include <Adafruit_Fingerprint.h>

#define SS_PIN 10
#define RST_PIN 9
MFRC522 mfrc522(SS_PIN, RST_PIN);

SoftwareSerial mySerial(2, 3); // RX, TX
Adafruit_Fingerprint finger = Adafruit_Fingerprint(&mySerial);

void setup() {
  Serial.begin(9600);
  while (!Serial);

  SPI.begin();
  mfrc522.PCD_Init();

  finger.begin(57600);
  if (finger.verifyPassword()) {
    // Fingerprint sensor detected
  }
}

void loop() {
  checkRFID();
  checkFingerprint();
  delay(50);
}

void checkRFID() {
  if (!mfrc522.PICC_IsNewCardPresent()) return;
  if (!mfrc522.PICC_ReadCardSerial()) return;

  String uidStr = "";
  for (byte i = 0; i < mfrc522.uid.size; i++) {
    if (mfrc522.uid.uidByte[i] < 0x10) uidStr += "0";
    uidStr += String(mfrc522.uid.uidByte[i], HEX);
    if (i < mfrc522.uid.size - 1) uidStr += ":";
  }
  uidStr.toUpperCase();

  // Print single line UID for Web Serial API reading
  Serial.println(uidStr);

  mfrc522.PICC_HaltA();
  mfrc522.PCD_StopCrypto1();
  delay(1000);
}

void checkFingerprint() {
  uint8_t p = finger.getImage();
  if (p != FINGERPRINT_OK) return;

  p = finger.image2Tz();
  if (p != FINGERPRINT_OK) return;

  p = finger.fingerFastSearch();
  if (p == FINGERPRINT_OK) {
    // Print matched template ID as FP-{id}
    Serial.print("FP-");
    Serial.println(finger.fingerID);
    delay(1000);
  }
}
