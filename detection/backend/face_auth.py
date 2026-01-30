import sys
import json
import os

try:
    import face_recognition
    import numpy as np
except ImportError:
    # Fallback for environments without face_recognition installed
    print(json.dumps({"success": False, "error": "Missing libraries: face_recognition/numpy"}))
    sys.exit(1)

def verify_face(live_image_path, known_image_paths):
    try:
        if not os.path.exists(live_image_path):
            return {"success": False, "error": "Live image not found"}

        # Load live image once
        try:
            live_image = face_recognition.load_image_file(live_image_path)
            live_encodings = face_recognition.face_encodings(live_image)
        except Exception as e:
            return {"success": False, "error": f"Failed to process live image: {str(e)}"}

        if len(live_encodings) == 0:
            return {"success": False, "error": "No face found in live image"}
        
        live_encoding = live_encodings[0] # Use the first face found

        best_match_confidence = 0.0
        is_match = False
        
        checked_count = 0

        # Iterate through all known images
        for known_path in known_image_paths:
            if not os.path.exists(known_path):
                continue
            
            try:
                known_image = face_recognition.load_image_file(known_path)
                known_encodings = face_recognition.face_encodings(known_image)

                if len(known_encodings) > 0:
                    checked_count += 1
                    # Compare
                    # tolerance=0.6 is default. Lower is stricter.
                    match = face_recognition.compare_faces([known_encodings[0]], live_encoding, tolerance=0.5)
                    distance = face_recognition.face_distance([known_encodings[0]], live_encoding)
                    
                    confidence = 1 - float(distance[0])

                    if match[0]:
                        is_match = True
                        if confidence > best_match_confidence:
                            best_match_confidence = confidence
            except:
                continue # Skip bad known images

        if checked_count == 0:
             return {"success": False, "error": "No valid reference photos found for this card"}

        if is_match:
            return {
                "success": True, 
                "match": True, 
                "confidence": best_match_confidence 
            }
        else:
             return {
                "success": True, # Process succeeded, but no match
                "match": False, 
                "confidence": best_match_confidence,
                "error": "Face does not match any family member"
            }

    except Exception as e:
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    if len(sys.argv) < 3:
        # Expect at least: script.py <live_path> <known_path_1>
        print(json.dumps({"success": False, "error": "Usage: python face_auth.py <live_path> <known_path_1> [known_path_2 ...]"}) )
        sys.exit(1)

    live_path = sys.argv[1]
    known_paths = sys.argv[2:] # All remaining args are known paths
    
    result = verify_face(live_path, known_paths)
    print(json.dumps(result))
