"""
Phone Camera Connection - Hand & Bag Detection
Works with IP Webcam app
"""
import cv2
import mediapipe as mp
from ultralytics import YOLO
import time

print("=" * 70)
print("PHONE CAMERA - HAND & BAG DETECTION")
print("=" * 70)

# Your IP Webcam address
phone_url = "http://10.201.148.190:8080/video"

print(f"\nConnecting to: {phone_url}")
print("\nMake sure:")
print("1. IP Webcam app is running on your phone")
print("2. Phone and PC are on the SAME WiFi network")
print("3. The IP address matches what's shown in the app")
print("\nTrying to connect...")

# Try to connect
cap = cv2.VideoCapture(phone_url)

# Wait a bit for connection
time.sleep(2)

if not cap.isOpened():
    print("\n✗ Failed to connect!")
    print("\nTroubleshooting:")
    print("1. Check if phone and PC are on same WiFi")
    print("2. Try opening this in browser: " + phone_url)
    print("3. If browser works, try running script again")
    print("4. Make sure no firewall is blocking the connection")
    exit(1)

# Test read
ret, test_frame = cap.read()
if not ret or test_frame is None:
    print("\n✗ Connected but can't read frames!")
    print("\nTry:")
    print("1. Restart IP Webcam app")
    print("2. Check camera permissions on phone")
    print("3. Try a different URL format:")
    print(f"   - {phone_url}")
    print(f"   - http://100.88.97.225:8080/videofeed")
    print(f"   - http://100.88.97.225:8080/shot.jpg")
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

print("\n" + "=" * 70)
print("DETECTION STARTED")
print("=" * 70)
print("\nShowing:")
print("  - Hands: GREEN boxes with landmarks")
print("  - Bags: BLUE boxes")
print("\nPress 'q' to quit")
print("-" * 70)

frame_count = 0
hands_detected = 0
bags_detected = 0

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
    bag_results = bag_model(frame, conf=0.7, verbose=False)
    
    # Draw hand landmarks
    if hand_results.multi_hand_landmarks:
        hands_detected += 1
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
            bags_detected += 1
        for box in boxes:
            x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
            conf = box.conf[0].cpu().numpy()
            
            cv2.rectangle(frame, (int(x1), int(y1)), (int(x2), int(y2)), (255, 0, 0), 3)
            cv2.putText(frame, f'BAG {conf:.2f}', (int(x1), int(y1) - 10),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.9, (255, 0, 0), 2)
    
    # Status overlay
    num_hands = len(hand_results.multi_hand_landmarks) if hand_results.multi_hand_landmarks else 0
    num_bags = sum(len(r.boxes) for r in bag_results)
    
    status = f"Hands: {num_hands} | Bags: {num_bags} | Frame: {frame_count}"
    cv2.putText(frame, status, (10, 30),
               cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
    cv2.putText(frame, "Press Q to quit", (10, frame.shape[0] - 20),
               cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
    
    
    # Show frame (with error handling for Windows)
    try:
        cv2.imshow('Phone Camera - Hand & Bag Detection', frame)
        key = cv2.waitKey(1) & 0xFF
    except cv2.error:
        # If display fails, save frames periodically instead
        if frame_count % 30 == 0:  # Save every 30 frames
            cv2.imwrite(f'frame_{frame_count}.jpg', frame)
            print(f"Saved frame_{frame_count}.jpg (Hands: {num_hands}, Bags: {num_bags})")
        key = 0xFF  # Continue without display
    
    if key == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
hands.close()

print("\n" + "=" * 70)
print("DETECTION STOPPED")
print("=" * 70)
print(f"\n✓ Processed {frame_count} frames")
print(f"✓ Detected hands in {hands_detected} frames")
print(f"✓ Detected bags in {bags_detected} frames")
print("\nDone!")