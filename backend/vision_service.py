import cv2
import socketio
import sys
import time
import numpy as np
from ultralytics import YOLO
import os

# Suppress OpenCV warnings about MJPEG overread
os.environ['OPENCV_FFMPEG_LOGLEVEL'] = '-8'

# Configuration
CAMERA_SOURCE = sys.argv[1] if len(sys.argv) > 1 else 0
BACKEND_URL = 'http://localhost:5000'

# Initialize Socket.IO with reconnection
sio = socketio.Client(reconnection=True, reconnection_attempts=0, reconnection_delay=1)

# Initialize AI Models
print("Loading Models...")

# Load BOTH YOLO models for comprehensive bag detection
try:
    # Custom model for plastic/paper/garbage bags
    model_custom = YOLO("C:/Users/rjpra/Downloads/Smart-PDS-main/Smart-PDS-main/backend/best.pt")
    print("✅ Custom Model Loaded (best.pt)")
    print("   Detecting: plastic bags, paper bags, garbage bags")
except Exception as e:
    print(f"⚠️ Custom model failed: {e}")
    print("   Continuing with COCO model only...")
    model_custom = None

try:
    # Standard COCO model for backpacks/handbags/suitcases
    model_coco = YOLO("yolov8n.pt")
    print("✅ YOLO Model Loaded (yolov8n - COCO dataset)")
    print("   Detecting: backpacks, handbags, suitcases")
except Exception as e:
    print(f"❌ Error loading YOLO model: {e}")
    sys.exit(1)

# Status State to avoid spamming
last_status = None
bag_detected_count = 0  # Stability counter
no_bag_count = 0  # Stability counter
STABILITY_THRESHOLD = 3  # Need 3 consistent readings to change state as requested 

@sio.event
def connect():
    print("✅ Connected to Backend")

@sio.event
def disconnect():
    print("❌ Disconnected from Backend")

def detect_hand_simple(frame):
    """Simple hand detection using skin color in HSV space"""
    # Convert to HSV
    hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
    
    # Define skin color range in HSV
    lower_skin = np.array([0, 20, 70], dtype=np.uint8)
    upper_skin = np.array([20, 255, 255], dtype=np.uint8)
    
    # Create mask
    mask = cv2.inRange(hsv, lower_skin, upper_skin)
    
    # Apply morphological operations to reduce noise
    kernel = np.ones((5,5), np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
    
    # Count skin pixels
    skin_pixels = cv2.countNonZero(mask)
    total_pixels = frame.shape[0] * frame.shape[1]
    skin_ratio = skin_pixels / total_pixels
    
    # If more than 15% of frame is skin color, consider it a hand (increased from 5%)
    return skin_ratio > 0.5

def main():
    try:
        sio.connect(BACKEND_URL)
    except Exception as e:
        print(f"❌ Could not connect to backend: {e}")
        return

    # Open Camera
    print(f"📷 Opening Camera: {CAMERA_SOURCE}")
    cap = cv2.VideoCapture(CAMERA_SOURCE)
    
    if not cap.isOpened():
        print("❌ Failed to open camera. Check URL or connection.")
        return

    print("🚀 Vision Service Running... Press Ctrl+C to quit.")

    frame_count = 0
    try:
        while True:
            # Declare all globals at the start
            global bag_detected_count, no_bag_count, last_status
            
            ret, frame = cap.read()
            if not ret:
                print("⚠️ Frame read failed")
                time.sleep(1)
                continue

            frame_count += 1
            # Process every 3rd frame for speed (skip 2 frames)
            if frame_count % 3 != 0:
                continue

            # Resize frame to 640x480 for faster processing
            frame = cv2.resize(frame, (640, 480))

            # 1. Hand Detection (Simple skin color detection)
            hand_detected = detect_hand_simple(frame)

            # 2. Object Detection - ONLY using custom model (best.pt)
            bag_detected_raw = False
            
            # check every 3 frames instead of 6 for better consistency
            if frame_count % 3 == 0:
                try:
                    # ONLY use custom model for bag detection
                    if model_custom:
                        results_custom = model_custom(frame, verbose=False, conf=0.3, imgsz=320)
                        num_detections = len(results_custom[0].boxes)
                        
                        if num_detections > 0:
                            bag_detected_raw = True
                            # Debug: show what was detected
                            for box in results_custom[0].boxes:
                                conf = float(box.conf[0])
                                cls = int(box.cls[0])
                                print(f"🎯 Detected! Class: {cls}, Confidence: {conf:.2f}")
                        else:
                            # print(f"❌ No detections") # reduced spam
                            pass
                except Exception as e:
                    print(f"❌ Detection error: {e}")
                    pass

            # Stability logic - Optimized
            # If detecting, increment. If not, only reset if we miss 2 frames in a row.
            if bag_detected_raw:
                bag_detected_count = min(bag_detected_count + 1, 10) # Cap at 10
                no_bag_count = 0
                print(f"✅ Consistent Detection: {bag_detected_count}/{STABILITY_THRESHOLD}")
            else:
                # Grace period: Don't reset immediately on one missed frame
                no_bag_count += 1
                if no_bag_count > 1: # Require 2 missed frames to reset
                     bag_detected_count = max(0, bag_detected_count - 2) # Decay count instead of full reset

            # Only change state after STABILITY_THRESHOLD consistent readings
            if bag_detected_count >= STABILITY_THRESHOLD:
                bag_detected = True
            elif no_bag_count >= STABILITY_THRESHOLD:
                bag_detected = False
            else:
                # Keep previous state during transition
                bag_detected = (last_status == "safe")

            # 3. Logic & Signaling
            current_status = "safe"
            message = "Ready"

            if hand_detected:
                current_status = "danger"
                message = "⚠️ HAND DETECTED! PLEASE REMOVE HAND."
            elif not bag_detected:
                current_status = "warning"
                message = "⚠️ NO BAG DETECTED. PLEASE PLACE BAG PROPERLY."
            else:
                current_status = "safe"
                message = "✅ BAG DETECTED. SAFE TO DISPENSE."

            payload = {
                "hand": hand_detected,
                "bag": bag_detected,
                "status": current_status,
                "message": message
            }

            # Emit on change or if danger
            if current_status != last_status or current_status == "danger":
                sio.emit('vision:update', payload)
                if current_status == "danger":
                    print(f"🔴 DANGER: {message}")
                elif current_status == "warning":
                    print(f"🟡 WARNING: {message}")
                else:
                    print(f"🟢 SAFE: {message}")
                last_status = current_status

            time.sleep(0.05)  # 20Hz frame grab, but only process every 3rd

    except KeyboardInterrupt:
        print("\n👋 Shutting down...")
    finally:
        cap.release()
        sio.disconnect()

if __name__ == "__main__":
    main()
