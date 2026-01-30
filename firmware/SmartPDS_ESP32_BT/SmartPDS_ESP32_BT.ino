/*
 * ESP32 Smart PDS Grain Dispenser - Bluetooth Version
 * Uses Bluetooth Serial (BLE) for communication with backend
 * Device Name: SmartPDS_Dispenser
 */

#include <BluetoothSerial.h>
#include <ArduinoJson.h>
#include <HX711.h>
#include <ESP32Servo.h>

// ==================== CONFIGURATION ====================
#define HX711_DOUT_PIN 4
#define HX711_SCK_PIN 5
#define SERVO_RICE_PIN 18
#define SERVO_DAL_PIN 19

#define CALIBRATION_FACTOR 488.53
#define OPEN_ANGLE  0
#define CLOSE_ANGLE 40

// ==================== GLOBAL OBJECTS ====================
BluetoothSerial SerialBT;
HX711 scale;
Servo servoRice;
Servo servoDal;

float currentWeight = 0.0;
float targetWeight = 0.0;
int currentGrainType = 0;
bool isDispensing = false;
unsigned long lastWeightUpdate = 0;
unsigned long lastReadTime = 0;

// ==================== HELPER FUNCTIONS ====================
void closeAllServos() {
  servoRice.write(CLOSE_ANGLE);
  servoDal.write(CLOSE_ANGLE);
}

void openRice() {
  servoRice.write(OPEN_ANGLE);
  servoDal.write(CLOSE_ANGLE);
}

void openDal() {
  servoDal.write(OPEN_ANGLE);
  servoRice.write(CLOSE_ANGLE);
}

void sendResponse(const char* type, bool success, const char* message = "") {
  StaticJsonDocument<200> doc;
  doc["type"] = type;
  doc["success"] = success;
  if (strlen(message) > 0) {
    doc["message"] = message;
  }
  
  String output;
  serializeJson(doc, output);
  SerialBT.println(output);
  Serial.println("→ " + output);
}

void sendWeightUpdate() {
  StaticJsonDocument<200> doc;
  doc["type"] = "weight_update";
  doc["weight"] = currentWeight;
  doc["dispensing"] = isDispensing;
  doc["target"] = targetWeight;
  
  String output;
  serializeJson(doc, output);
  SerialBT.println(output);
}

void handleCommand(String json) {
  StaticJsonDocument<200> doc;
  DeserializationError error = deserializeJson(doc, json);
  
  if (error) {
    Serial.println("❌ JSON Parse Error");
    sendResponse("error", false, "Invalid JSON");
    return;
  }
  
  String cmd = doc["cmd"];
  Serial.println("← CMD: " + cmd);
  
  if (cmd == "status") {
    StaticJsonDocument<200> resp;
    resp["type"] = "status";
    resp["weight"] = currentWeight;
    resp["dispensing"] = isDispensing;
    resp["target"] = targetWeight;
    
    String output;
    serializeJson(resp, output);
    SerialBT.println(output);
    
  } else if (cmd == "tare") {
    Serial.println("⚖️ Tare Requested");
    scale.tare(3); // Fast tare with 3 samples
    currentWeight = 0.0;
    sendResponse("tare", true);
    
  } else if (cmd == "dispense") {
    currentGrainType = doc["grainType"];
    targetWeight = doc["weight"];
    
    if (targetWeight > 0) {
      Serial.print("➡️ Start Dispense: ");
      Serial.print(targetWeight);
      Serial.println("g");
      
      scale.tare(3);
      isDispensing = true;
      sendResponse("dispense", true);
    } else {
      sendResponse("dispense", false, "Invalid weight");
    }
    
  } else if (cmd == "stop") {
    Serial.println("⏹️ Stop Requested");
    isDispensing = false;
    closeAllServos();
    sendResponse("stop", true);
    
  } else {
    sendResponse("error", false, "Unknown command");
  }
}

void stopDispensing() {
  isDispensing = false;
  closeAllServos();
  
  StaticJsonDocument<200> doc;
  doc["type"] = "dispense_complete";
  doc["finalWeight"] = currentWeight;
  doc["targetWeight"] = targetWeight;
  
  String output;
  serializeJson(doc, output);
  SerialBT.println(output);
  Serial.println("✅ Dispense Complete");
}

// ==================== SETUP ====================
void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n\n=== ESP32 Smart PDS - Bluetooth Version ===");
  
  // Initialize Servos
  ESP32PWM::allocateTimer(0);
  ESP32PWM::allocateTimer(1);
  servoRice.setPeriodHertz(50);
  servoDal.setPeriodHertz(50);
  servoRice.attach(SERVO_RICE_PIN, 500, 2400);
  servoDal.attach(SERVO_DAL_PIN, 500, 2400);
  closeAllServos();
  
  // Initialize Scale
  scale.begin(HX711_DOUT_PIN, HX711_SCK_PIN);
  scale.set_scale(CALIBRATION_FACTOR);
  Serial.println("Taring scale... do not place anything on it!");
  scale.tare(3);
  
  // Initialize Bluetooth
  SerialBT.begin("SmartPDS_Dispenser"); // Bluetooth device name
  Serial.println("✅ Bluetooth Started: SmartPDS_Dispenser");
  Serial.println("📱 Waiting for connection...");
}

// ==================== LOOP ====================
void loop() {
  // Handle Bluetooth Commands
  if (SerialBT.available()) {
    String cmd = SerialBT.readStringUntil('\n');
    cmd.trim();
    if (cmd.length() > 0) {
      handleCommand(cmd);
    }
  }
  
  // Non-blocking Scale Reading
  if (millis() - lastReadTime > 200) {
    if (scale.is_ready()) {
      currentWeight = scale.get_units(1);
    }
    lastReadTime = millis();
  }
  
  // Send periodic weight updates (every 500ms)
  if (millis() - lastWeightUpdate > 500) {
    sendWeightUpdate();
    lastWeightUpdate = millis();
  }
  
  // Dispensing Logic
  if (isDispensing) {
    if (currentWeight >= targetWeight) {
      stopDispensing();
      
      // Auto-tare after 2 seconds
      delay(2000);
      scale.tare(3);
      Serial.println("✅ Auto-Tare Complete");
    } else {
      // Open appropriate gate
      if (currentGrainType == 1) openRice();
      else openDal();
    }
  }
  
  yield();
}
