"""
MediaPipe Hand Detection - Webcam Version
Real-time hand detection with webcam
"""
import cv2
import mediapipe as mp

print("=" * 70)
print("MEDIAPIPE HAND DETECTION - WEBCAM")
print("=" * 70)

# Initialize MediaPipe
mp_hands = mp.solutions.hands
mp_drawing = mp.solutions.drawing_utils

hands = mp_hands.Hands(
    static_image_mode=False,
    max_num_hands=2,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)

print("\n✓ MediaPipe initialized")

# Find camera
print("\nSearching for camera...")
cap = None
for i in range(5):
    test_cap = cv2.VideoCapture(i)
    if test_cap.isOpened():
        ret, _ = test_cap.read()
        if ret:
            cap = test_cap
            print(f"✓ Camera found at index {i}")
            break
        test_cap.release()

if cap is None:
    print("✗ No camera found")
    print("\nTo use with images instead:")
    print("  python detect_hand.py")
    exit(1)

print("\n" + "-" * 70)
print("Starting detection...")
print("Press 'q' to quit")
print("-" * 70)

frame_count = 0
hands_detected = 0

while True:
    ret, frame = cap.read()
    if not ret:
        break
    
    frame_count += 1
    
    # Convert to RGB
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    
    # Detect hands
    results = hands.process(rgb_frame)
    
    # Draw results
    if results.multi_hand_landmarks:
        hands_detected += 1
        for hand_landmarks in results.multi_hand_landmarks:
            # Draw landmarks
            mp_drawing.draw_landmarks(
                frame,
                hand_landmarks,
                mp_hands.HAND_CONNECTIONS
            )
            
            # Get bounding box
            h, w, c = frame.shape
            x_coords = [lm.x for lm in hand_landmarks.landmark]
            y_coords = [lm.y for lm in hand_landmarks.landmark]
            
            x_min = max(0, int(min(x_coords) * w) - 20)
            x_max = min(w, int(max(x_coords) * w) + 20)
            y_min = max(0, int(min(y_coords) * h) - 20)
            y_max = min(h, int(max(y_coords) * h) + 20)
            
            # Draw bounding box
            cv2.rectangle(frame, (x_min, y_min), (x_max, y_max), (0, 255, 0), 2)
            cv2.putText(frame, 'Hand', (x_min, y_min - 10),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
    
    # Status
    num_hands = len(results.multi_hand_landmarks) if results.multi_hand_landmarks else 0
    status = f"Hands: {num_hands} | Frame: {frame_count}"
    cv2.putText(frame, status, (10, 30),
               cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
    
    # Display
    cv2.imshow('MediaPipe Hand Detection (Press Q to quit)', frame)
    
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
hands.close()

print(f"\n✓ Processed {frame_count} frames")
print(f"✓ Detected hands in {hands_detected} frames")
print("\nDone!")
