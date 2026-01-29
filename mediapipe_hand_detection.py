"""
MediaPipe Hand Detection - Compatible with MediaPipe 0.10.x
"""
import cv2
try:
    # Try new API first (MediaPipe 0.10+)
    from mediapipe.tasks import python
    from mediapipe.tasks.python import vision
    NEW_API = True
except ImportError:
    # Fall back to old API
    import mediapipe as mp
    NEW_API = False

print("=" * 70)
print("MEDIAPIPE HAND DETECTION")
print("=" * 70)

if NEW_API:
    print("\nUsing MediaPipe Tasks API (v0.10+)")
    print("\nNote: This version requires a different setup.")
    print("Switching to legacy solution API...")
    NEW_API = False

# Use the solutions API which is more stable
import mediapipe as mp

# Check if solutions module exists
if not hasattr(mp, 'solutions'):
    print("\n✗ Error: MediaPipe solutions not available")
    print("\nPlease upgrade MediaPipe:")
    print("  pip install --upgrade mediapipe")
    exit(1)

mp_hands = mp.solutions.hands
mp_drawing = mp.solutions.drawing_utils

try:
    mp_drawing_styles = mp.solutions.drawing_styles
except AttributeError:
    mp_drawing_styles = None

# Create Hands object
hands = mp_hands.Hands(
    static_image_mode=False,
    max_num_hands=2,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)

print("✓ MediaPipe Hands initialized")
print("\nStarting webcam...")
print("Press 'q' to quit")
print("-" * 70)

# Open webcam
cap = cv2.VideoCapture(0)

if not cap.isOpened():
    print("✗ Error: Could not open webcam")
    exit(1)

frame_count = 0

while True:
    ret, frame = cap.read()
    if not ret:
        break
    
    frame_count += 1
    
    # Convert BGR to RGB
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    
    # Detect hands
    results = hands.process(rgb_frame)
    
    # Draw results
    hand_detected = False
    if results.multi_hand_landmarks:
        hand_detected = True
        for hand_landmarks in results.multi_hand_landmarks:
            # Draw landmarks
            if mp_drawing_styles:
                mp_drawing.draw_landmarks(
                    frame,
                    hand_landmarks,
                    mp_hands.HAND_CONNECTIONS,
                    mp_drawing_styles.get_default_hand_landmarks_style(),
                    mp_drawing_styles.get_default_hand_connections_style()
                )
            else:
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
    status = f"Hands Detected: {num_hands}"
    color = (0, 255, 0) if hand_detected else (0, 0, 255)
    cv2.putText(frame, status, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, color, 2)
    
    # Display
    cv2.imshow('Hand Detection (Press Q to quit)', frame)
    
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
hands.close()

print(f"\n✓ Processed {frame_count} frames")
print("\n" + "=" * 70)
print("Hand detection completed successfully!")
print("=" * 70)
