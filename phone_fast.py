"""
Phone Camera - Fast Detection (No Saving)
Optimized for speed
"""
import cv2
import mediapipe as mp
from ultralytics import YOLO
import time

print("=" * 70)
print("PHONE CAMERA - FAST MODE")
print("=" * 70)

# Your IP Webcam address
phone_url = "http://10.201.148.190:8080/video"

print(f"\nConnecting to: {phone_url}")

# Connect
cap = cv2.VideoCapture(phone_url)
time.sleep(1)

if not cap.isOpened():
    print("✗ Failed to connect!")
    exit(1)

print("✓ Connected!")

# Initialize detectors
mp_hands = mp.solutions.hands
hands = mp_hands.Hands(
    static_image_mode=False,
    max_num_hands=2,
    min_detection_confidence=0.6,  # Higher threshold = faster
    min_tracking_confidence=0.5
)

bag_model = YOLO('best.pt')

print("\n" + "=" * 70)
print("DETECTION RUNNING - Press Ctrl+C to stop")
print("=" * 70)

frame_count = 0
start_time = time.time()

try:
    while True:
        ret, frame = cap.read()
        
        if not ret:
            break
        
        frame_count += 1
        
        # Skip frames for speed (process every 2nd frame)
        if frame_count % 2 != 0:
            continue
        
        # Detect hands (faster - no RGB conversion needed for display)
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        hand_results = hands.process(rgb)
        
        # Detect bags (reduced confidence for speed)
        bag_results = bag_model(frame, conf=0.6, verbose=False)
        
        # Count detections
        num_hands = len(hand_results.multi_hand_landmarks) if hand_results.multi_hand_landmarks else 0
        num_bags = sum(len(r.boxes) for r in bag_results)
        
        # Print status every 30 frames
        if frame_count % 30 == 0:
            elapsed = time.time() - start_time
            fps = frame_count / elapsed
            print(f"Frame {frame_count} | Hands: {num_hands} | Bags: {num_bags} | FPS: {fps:.1f}")

except KeyboardInterrupt:
    print("\n\nStopped!")

cap.release()
hands.close()

elapsed = time.time() - start_time
fps = frame_count / elapsed if elapsed > 0 else 0

print("\n" + "=" * 70)
print(f"Processed {frame_count} frames in {elapsed:.1f}s")
print(f"Average FPS: {fps:.1f}")
print("=" * 70)
