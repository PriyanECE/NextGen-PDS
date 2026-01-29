"""
MediaPipe Hand Detection - Simple Version
Works with MediaPipe 0.10.x
"""
import cv2
try:
    import mediapipe as mp
    if hasattr(mp, 'solutions'):
        mp_hands = mp.solutions.hands
        mp_drawing = mp.solutions.drawing_utils
        USE_SOLUTIONS = True
    else:
        # MediaPipe 0.10.x uses different API
        from mediapipe.python.solutions import hands as mp_hands
        from mediapipe.python.solutions import drawing_utils as mp_drawing
        USE_SOLUTIONS = False
except ImportError:
    print("MediaPipe not installed. Install with: pip install mediapipe")
    exit(1)

import os

print("=" * 70)
print("MEDIAPIPE HAND DETECTION")
print("=" * 70)

# Create Hands detector
if USE_SOLUTIONS:
    hands = mp_hands.Hands(
        static_image_mode=True,
        max_num_hands=2,
        min_detection_confidence=0.5
    )
else:
    hands = mp_hands.Hands(
        static_image_mode=True,
        max_num_hands=2,
        min_detection_confidence=0.5
    )

print("\n✓ MediaPipe initialized")

# Process images
image_folder = 'images'
if os.path.exists(image_folder):
    images = [f for f in os.listdir(image_folder) if f.endswith(('.jpg', '.jpeg', '.png'))]
    
    if images:
        print(f"\n✓ Found {len(images)} image(s)")
        
        for img_file in images:
            img_path = os.path.join(image_folder, img_file)
            print(f"\nProcessing: {img_file}")
            
            image = cv2.imread(img_path)
            if image is None:
                continue
            
            rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            results = hands.process(rgb_image)
            
            if results.multi_hand_landmarks:
                print(f"  ✓ Detected {len(results.multi_hand_landmarks)} hand(s)")
                
                for hand_landmarks in results.multi_hand_landmarks:
                    mp_drawing.draw_landmarks(
                        image,
                        hand_landmarks,
                        mp_hands.HAND_CONNECTIONS
                    )
                    
                    h, w, c = image.shape
                    x_coords = [lm.x for lm in hand_landmarks.landmark]
                    y_coords = [lm.y for lm in hand_landmarks.landmark]
                    
                    x_min = max(0, int(min(x_coords) * w) - 20)
                    x_max = min(w, int(max(x_coords) * w) + 20)
                    y_min = max(0, int(min(y_coords) * h) - 20)
                    y_max = min(h, int(max(y_coords) * h) + 20)
                    
                    cv2.rectangle(image, (x_min, y_min), (x_max, y_max), (0, 255, 0), 2)
                    cv2.putText(image, 'Hand', (x_min, y_min - 10),
                               cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
                
                output_file = f"hand_detected_{img_file}"
                cv2.imwrite(output_file, image)
                print(f"  ✓ Saved: {output_file}")
            else:
                print(f"  ✗ No hands detected")
    else:
        print("\n✗ No images in 'images' folder")
else:
    print("\n✗ 'images' folder not found")

hands.close()

print("\n" + "=" * 70)
print("DONE! MediaPipe hand detection complete")
print("=" * 70)