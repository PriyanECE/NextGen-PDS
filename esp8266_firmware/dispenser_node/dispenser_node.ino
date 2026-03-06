// ============================================================
// NextGen-PDS Dispenser Node — ESP8266 NodeMCU
//
// INTEGRATED CALIBRATION BUILD
// Based on exact code confirmed working by user:
//   - Uses scale.get_value(15) for calibration
//   - Uses scale.get_units(5) for weight reading
//   - Incorporates Serial.parseFloat() for interactive calibration
// ============================================================

#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>
#include "HX711.h"
#include <Servo.h>

// ─── WiFi ─────────────────────────────────────────────────────
const char* ssid     = "priyan";
const char* password = "11111111";

// ─── Pins (Match User's Old Code) ─────────────────────────────
#define DOUT     14   // D5 (GPIO14)
#define CLK      12   // D6 (GPIO12)
#define SRV_PIN  13   // D7 (GPIO13)

// ─── MG90S Servo Pulse Widths ─────────────────────────────────
#define SERVO_MIN_US  500    // 0 degrees
#define SERVO_MAX_US  2500   // 180 degrees
#define POS_CLOSED    0
#define POS_PARTIAL   60
#define POS_OPEN      90

// ─── Calibration ──────────────────────────────────────────────
// This value is updated dynamically if you send a weight via Serial.
// For now, it defaults to the calculated 14172 value.
float calibration_factor = 14172.0f;

// ─── Objects ──────────────────────────────────────────────────
ESP8266WebServer server(80);
HX711  scale;
Servo  myServo;

// ─── State ────────────────────────────────────────────────────
enum State { IDLE, DISPENSING, PAUSED };
State  curState    = IDLE;
float  targetG     = 0.0f;
float  currentG    = 0.0f;
float  smoothG     = 0.0f;
bool   scaleOk     = false;

unsigned long lastWeightMs  = 0;
unsigned long lastPrintMs   = 0;

// ─── Forward declarations ─────────────────────────────────────
void handleStatus();
void handleTare();
void handleDispense();
void handlePause();
void handleResume();
void handleStop();
void performInteractiveCalibration();

// ============================================================
// SETUP
// ============================================================
void setup() {
  Serial.begin(115200);  // Keeping 115200 for faster HTTP debug output
  delay(1000);

  Serial.println("\n\n------------------------------------------");
  Serial.println("NextGen-PDS Dispenser - HX711 & SERVO INIT");
  Serial.println("------------------------------------------");

  // 1. Servo Init
  myServo.attach(SRV_PIN, SERVO_MIN_US, SERVO_MAX_US);
  myServo.write(POS_CLOSED);
  delay(500);
  Serial.println("[SERVO] Attached -> CLOSED (0 deg)");

  // 2. HX711 Load Cell Init (Using user's exact flow)
  scale.begin(DOUT, CLK);
  
  Serial.println("[SCALE] Waiting for HX711...");
  for (int i = 0; i < 30 && !scale.is_ready(); i++) {
    delay(100); yield();
  }

  if (scale.is_ready()) {
    scaleOk = true;
    Serial.println("[SCALE] Remove all weight...");
    delay(3000); // Wait for scale to settle

    scale.tare();
    Serial.println("Tare done ✔");
    
    // Set initial calibration factor
    scale.set_scale(calibration_factor);

    Serial.println("\n>> CALIBRATION MODE ACTIVE <<");
    Serial.println("If weight is wrong: Place known weight and ENTER value in grams exactly (example: 200)");
  } else {
    Serial.println("\n[ERROR] HX711 not responding on D5/D6.");
  }

  // 3. WiFi Init
  WiFi.mode(WIFI_STA);
  WiFi.setSleepMode(WIFI_NONE_SLEEP);
  WiFi.begin(ssid, password);
  Serial.printf("\n[WIFI] Connecting to %s", ssid);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500); Serial.print("."); yield();
  }
  Serial.printf("\n[WIFI] Connected! IP: %s\n", WiFi.localIP().toString().c_str());

  // 4. HTTP Server Init
  server.on("/status",   HTTP_GET,  handleStatus);
  server.on("/tare",     HTTP_POST, handleTare);
  server.on("/dispense", HTTP_POST, handleDispense);
  server.on("/pause",    HTTP_POST, handlePause);
  server.on("/resume",   HTTP_POST, handleResume);
  server.on("/stop",     HTTP_POST, handleStop);
  server.begin();
  Serial.println("[HTTP] Server ready.\n");
}

// ============================================================
// LOOP
// ============================================================
void loop() {
  // 1. HTTP Server
  server.handleClient();

  // 2. Interactive Calibration (User's Old Code Logic)
  if (Serial.available()) {
    performInteractiveCalibration();
  }

  // 3. Weight Reading (120ms interval)
  if (scaleOk && scale.is_ready()) {
    unsigned long now = millis();
    if (now - lastWeightMs >= 120) {
      lastWeightMs = now;
      
      // Get raw value and apply calibration manually 
      // This exactly matches user's proven calibration logic and prevents library drift
      long rawVal = scale.get_value(3);
      float calculatedGrams = (float)rawVal / calibration_factor;
      
      // EMA Smoothing (Allows negative values during smoothing to prevent artificial drift, 
      // then clamps the final result to 0 for display)
      smoothG  = (0.4f * calculatedGrams) + (0.6f * smoothG);
      
      currentG = smoothG;
      if (currentG < 0.0f) currentG = 0.0f; // Clamp only the final output
    }
  }

  // 4. Debug output
  if (millis() - lastPrintMs >= 1000) {
    lastPrintMs = millis();
    const char* st = curState == DISPENSING ? "DISPENSING" : curState == PAUSED ? "PAUSED" : "IDLE";
    Serial.printf("[STATUS] State=%-10s Weight=%.1fg Target=%.1fg (Cal=%.2f)\n", 
                  st, currentG, targetG, calibration_factor);
  }

  // 5. Dispensing State Machine
  if (curState == DISPENSING) {
    if (targetG > 0.0f && currentG >= targetG) {
      myServo.write(POS_CLOSED);
      curState = IDLE;
      Serial.printf("[DONE] Dispensed: %.1fg\n", currentG);
    } else if (targetG - currentG <= 200.0f) {
      myServo.write(POS_PARTIAL);
    } else {
      myServo.write(POS_OPEN);
    }
  }

  yield();
}

// ============================================================
// USER'S CALIBRATION LOGIC
// ============================================================
void performInteractiveCalibration() {
  float known_weight_g = Serial.parseFloat();

  if (known_weight_g > 0) {
    Serial.println("\nCalibrating...");
    delay(2000); // Settle time

    // Use raw value to calculate factor, exactly as in user's old code
    long raw = scale.get_value(15);
    calibration_factor = (float)raw / known_weight_g;
    
    // Apply new factor immediately
    scale.set_scale(calibration_factor);

    Serial.println("\n========== CALIBRATION DONE ==========");
    Serial.print("Known Weight      : ");
    Serial.print(known_weight_g);
    Serial.println(" g");
    Serial.print("Calibration Factor: ");
    Serial.println(calibration_factor, 2);
    Serial.println("=====================================\n");
  }
}

// ============================================================
// HTTP HANDLERS
// ============================================================

void handleStatus() {
  const char* st = "idle";
  if (curState == DISPENSING) st = "dispensing";
  if (curState == PAUSED)     st = "paused";
  
  char buf[128];
  snprintf(buf, sizeof(buf),
    "{\"status\":\"%s\",\"current_weight_g\":%.2f,\"target_weight_g\":%.2f}",
    st, currentG, targetG);
    
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "application/json", buf);
}

void handleTare() {
  if (curState == DISPENSING) {
    server.send(400, "application/json", "{\"error\":\"Cannot tare while dispensing\"}");
    return;
  }
  if (!scaleOk) {
    server.send(500, "application/json", "{\"error\":\"Scale not connected\"}");
    return;
  }
  Serial.println("[TARE] Scale zeroing...");
  scale.tare(15);
  currentG = 0.0f;
  smoothG  = 0.0f;
  server.send(200, "application/json", "{\"message\":\"Tared\"}");
}

void handleDispense() {
  if (!server.hasArg("target")) {
    server.send(400, "application/json", "{\"error\":\"Missing target\"}");
    return;
  }
  float t = server.arg("target").toFloat();
  if (t <= 0.0f) {
    server.send(400, "application/json", "{\"error\":\"Target must be > 0\"}");
    return;
  }
  targetG  = t;
  curState = DISPENSING;

  myServo.write(POS_OPEN);
  Serial.printf("[DISPENSE] Target=%.1fg → Servo OPEN\n", t);

  char buf[96];
  snprintf(buf, sizeof(buf), "{\"message\":\"Dispensing\",\"target\":%.1f}", t);
  server.send(200, "application/json", buf);
}

void handlePause() {
  if (curState != DISPENSING) {
    server.send(400, "application/json", "{\"error\":\"Not dispensing\"}");
    return;
  }
  myServo.write(POS_CLOSED);
  curState = PAUSED;
  server.send(200, "application/json", "{\"message\":\"Paused\"}");
}

void handleResume() {
  if (curState != PAUSED) {
    server.send(400, "application/json", "{\"error\":\"Not paused\"}");
    return;
  }
  curState = DISPENSING;
  myServo.write(POS_OPEN);
  server.send(200, "application/json", "{\"message\":\"Resumed\"}");
}

void handleStop() {
  myServo.write(POS_CLOSED);
  curState = IDLE;
  targetG  = 0.0f;
  server.send(200, "application/json", "{\"message\":\"Stopped\"}");
}
