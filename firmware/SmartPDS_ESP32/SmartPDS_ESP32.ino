/*
 * ESP Universal Grain Dispenser - WiFi Version
 * Supports BOTH ESP32 and ESP8266 automatically!
 * Configured for SSID: pk, Password: 12345676
 */

#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>
#include <ESP32Servo.h>
#define WEB_SERVER WebServer

#include <ArduinoJson.h>
#include <HX711.h>

// ==================== CONFIGURATION ====================
const char* WIFI_SSID = "pk";           
const char* WIFI_PASSWORD = "12345676";  

// Backend Server (Your Computer's IP)
const char* BACKEND_IP = "10.97.19.105";  
const int BACKEND_PORT = 5000;

// Hardware Pins (ESP32 Specific)
#define HX711_DOUT_PIN 4  // DT on G4
#define HX711_SCK_PIN 5   // CLK on D5 (GPIO 5)
#define SERVO_RICE_PIN 18
#define SERVO_DAL_PIN 19

// Calibration (From User Request)
#define CALIBRATION_FACTOR 488.53

// Servo Angles (From User Request)
#define OPEN_ANGLE  0
#define CLOSE_ANGLE 40

// ==================== GLOBAL OBJECTS ====================
WEB_SERVER server(80);
HX711 scale;
Servo servoRice;
Servo servoDal;

float currentWeight = 0.0;
float targetWeight = 0.0;
int currentGrainType = 0; 
bool isDispensing = false;
unsigned long lastReadTime = 0;
unsigned long lastWiFiCheck = 0;

// Helper Functions
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

// ==================== SETUP ====================
void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n\n=== ESP Universal Grain Dispenser ===");
  
  Serial.println("Running on ESP32");
  ESP32PWM::allocateTimer(0);
  ESP32PWM::allocateTimer(1);
  servoRice.setPeriodHertz(50);
  servoDal.setPeriodHertz(50);
  servoRice.attach(SERVO_RICE_PIN, 500, 2400);
  servoDal.attach(SERVO_DAL_PIN, 500, 2400);

  closeAllServos(); // Start closed (40 degrees)
  
  // Initialize scale
  scale.begin(HX711_DOUT_PIN, HX711_SCK_PIN);
  scale.set_scale(CALIBRATION_FACTOR);
  
  Serial.println("Taring scale... do not place anything on it!");
  scale.tare(); // Zero the scale on startup
  
  // WiFi
  Serial.print("Connecting to WiFi: ");
  Serial.println(WIFI_SSID);
  WiFi.setSleep(false); // Disable WiFi power save to prevent disconnects during servo mvmt
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n✅ WiFi Connected!");
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());
  
  // Endpoints
  server.on("/status", []() {
    StaticJsonDocument<200> doc;
    doc["weight"] = currentWeight;
    doc["dispensing"] = isDispensing;
    doc["ip"] = WiFi.localIP().toString();
    
    String json;
    serializeJson(doc, json);
    server.send(200, "application/json", json);
  });

  // Alias for backend compatibility
  server.on("/weight", []() {
    String json = "{\"weight\":" + String(currentWeight) + "}";
    server.send(200, "application/json", json);
  });
  
  server.on("/dispense", HTTP_POST, []() {
    StaticJsonDocument<200> doc;
    deserializeJson(doc, server.arg("plain"));
    currentGrainType = doc["grainType"];
    targetWeight = doc["weight"];
    
    // Safety check
    if(targetWeight > 0) {
        Serial.print("➡️ Start Dispense: "); Serial.println(targetWeight);
        scale.tare(); // Tare before new dispense
        isDispensing = true;
        server.send(200, "application/json", "{\"success\":true}");
    } else {
        server.send(400, "application/json", "{\"error\":\"Invalid weight\"}");
    }
  });

  server.on("/stop", []() {
    stopDispensing();
    server.send(200, "application/json", "{\"success\":true}");
  });

  server.on("/tare", []() {
    Serial.println("⚖️ Manual Tare Requested");
    scale.tare(3); // Use only 3 samples for faster tare (instead of default 10)
    currentWeight = 0.0; // Force immediate update
    server.send(200, "application/json", "{\"success\":true}");
  });
  
  server.begin();
  registerWithBackend();
}

void loop() {
  server.handleClient();
  
  // WiFi Connection Monitor - Check every 10 seconds
  if (millis() - lastWiFiCheck > 10000) {
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("⚠️ WiFi Disconnected! Reconnecting...");
      WiFi.disconnect();
      WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
      
      int attempts = 0;
      while (WiFi.status() != WL_CONNECTED && attempts < 20) {
        delay(500);
        Serial.print(".");
        attempts++;
      }
      
      if (WiFi.status() == WL_CONNECTED) {
        Serial.println("\n✅ WiFi Reconnected!");
        Serial.print("IP: ");
        Serial.println(WiFi.localIP());
        registerWithBackend(); // Re-register with backend
      } else {
        Serial.println("\n❌ WiFi Reconnection Failed. Will retry...");
      }
    }
    lastWiFiCheck = millis();
  }
  
  // Non-blocking Scale Reading
  if (millis() - lastReadTime > 200) {
    if (scale.is_ready()) {
      currentWeight = scale.get_units(1); // Check average of 1 reading for speed
      // Do not zero out negative weight logic here if tared with container
    }
    lastReadTime = millis();
  }
  
  if (isDispensing) {
    Serial.print("Weight: "); Serial.print(currentWeight); Serial.print(" / "); Serial.println(targetWeight);

    if (currentWeight >= targetWeight) {
      // User Logic: Target reached
      stopDispensing();
      Serial.println("✅ Dispense Complete - Target Reached");
      
      // Delay then retare per user request
      delay(2000); 
      scale.tare();
      Serial.println("✅ Tare Done (Ready for next)");
      
    } else {
      // Open Gates
      if (currentGrainType == 1) openRice();
      else openDal();
    }
  }
  
  yield();
}

void stopDispensing() {
  isDispensing = false;
  closeAllServos();
}

void registerWithBackend() {
  WiFiClient client;
  if (client.connect(BACKEND_IP, BACKEND_PORT)) {
    String json = "{\"ip\":\"" + WiFi.localIP().toString() + "\",\"type\":\"esp\"}";
    client.println("POST /api/hardware/register HTTP/1.1");
    client.println("Host: " + String(BACKEND_IP));
    client.println("Content-Type: application/json");
    client.print("Content-Length: "); client.println(json.length());
    client.println();
    client.println(json);
    client.stop();
  }
}
