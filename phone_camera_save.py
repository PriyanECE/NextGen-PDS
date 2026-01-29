"""
Phone Camera - Save Detections (No Display Window)
For systems where cv2.imshow doesn't work
"""
import cv2
import mediapipe as mp
from ultralytics import YOLO
import time
import os

print("=" * 70)
print("PHONE CAMERA - SAVE MODE")
print("=" * 70)

# Your IP Webcam address
phone_url = "http://10.201.148.190:8080/video"

print(f"\nConnecting to: {phone_url}")

# Try to connect
cap = cv2.VideoCapture(phone_url)
time.sleep(2)

if not cap.isOpened():
    print("\n✗ Failed to connect!")
    exit(1)

ret, test_frame = cap.read()
if not ret or test_frame is None:
    print("\n✗ Can't read frames!")
    cap.release()
    exit(1)

print("✓ Connected successfully!")

# Initialize detectors
print("\nInitializing detectors...")
mp_hands = mp.solutions.hands
mp_drawing = mp.solutions.drawing_utils
hands = mp_hands.Hands(
    static_image_mode=False,
    max_num_hands=2,
    min_detection_confidence=0.5
)

bag_model = YOLO('best.pt')
print("✓ Detectors ready!")

# Create output folder
os.makedirs('phone_detections', exist_ok=True)

print("\n" + "=" * 70)
print("DETECTION STARTED - SAVE MODE")
print("=" * 70)
print("\nSaving detected frames to 'phone_detections/' folder")
print("Will save frames with hands or bags detected")
print("\nPress Ctrl+C to stop")
print("-" * 70)

frame_count = 0
saved_count = 0

try:
    while True:
        ret, frame = cap.read()
        
        if not ret or frame is None:
            print("\n✗ Lost connection!")
            break
        
        frame_count += 1
        
        # Detect hands
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        hand_results = hands.process(rgb)
        
        # Detect bags
        bag_results = bag_model(frame, conf=0.5, verbose=False)
        
        has_detection = False
        
        # Draw hand landmarks
        if hand_results.multi_hand_landmarks:
            has_detection = True
            for hand_landmarks in hand_results.multi_hand_landmarks:
                mp_drawing.draw_landmarks(
                    frame,
                    hand_landmarks,
                    mp_hands.HAND_CONNECTIONS,
                    mp_drawing.DrawingSpec(color=(0, 255, 0), thickness=2),
                    mp_drawing.DrawingSpec(color=(0, 255, 0), thickness=2)
                )
                
                # Draw hand bounding box
                h, w, c = frame.shape
                x_coords = [lm.x for lm in hand_landmarks.landmark]
                y_coords = [lm.y for lm in hand_landmarks.landmark]
                
                x_min = max(0, int(min(x_coords) * w) - 20)
                x_max = min(w, int(max(x_coords) * w) + 20)
                y_min = max(0, int(min(y_coords) * h) - 20)
                y_max = min(h, int(max(y_coords) * h) + 20)
                
                cv2.rectangle(frame, (x_min, y_min), (x_max, y_max), (0, 255, 0), 3)
                cv2.putText(frame, 'HAND', (x_min, y_min - 10),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 0), 2)
        
        # Draw bag detections
        for result in bag_results:
            boxes = result.boxes
            if len(boxes) > 0:
                has_detection = True
            for box in boxes:
                x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                conf = box.conf[0].cpu().numpy()
                
                cv2.rectangle(frame, (int(x1), int(y1)), (int(x2), int(y2)), (255, 0, 0), 3)
                cv2.putText(frame, f'BAG {conf:.2f}', (int(x1), int(y1) - 10),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.9, (255, 0, 0), 2)
        
        # Save frame if detection found
        if has_detection:
            num_hands = len(hand_results.multi_hand_landmarks) if hand_results.multi_hand_landmarks else 0
            num_bags = sum(len(r.boxes) for r in bag_results)
            
            filename = f'phone_detections/frame_{frame_count:04d}_H{num_hands}_B{num_bags}.jpg'
            cv2.imwrite(filename, frame)
            saved_count += 1
            print(f"✓ Saved: {filename} (Hands: {num_hands}, Bags: {num_bags})")
        
        # Status update every 30 frames
        if frame_count % 30 == 0:
            print(f"Processed {frame_count} frames, saved {saved_count} detections...")
        
        time.sleep(0.1)  # Small delay to reduce CPU usage

except KeyboardInterrupt:
    print("\n\nStopped by user")

cap.release()
hands.close()

print("\n" + "=" * 70)
print("DETECTION COMPLETE")
print("=" * 70)
print(f"\n✓ Processed {frame_count} frames")
print(f"✓ Saved {saved_count} frames with detections")
print(f"\nCheck 'phone_detections/' folder for results")
print("\nDone!")
