import face_recognition
import sys
import json
import os

def check_face(stored_path, live_path):
    try:
        # Load images
        if not os.path.exists(stored_path):
            return {"success": False, "error": "Stored image file missing"}
        if not os.path.exists(live_path):
            return {"success": False, "error": "Live image file missing"}

        # Get encodings (with upsampling for better detection)
        # stored_image = face_recognition.load_image_file(stored_path)
        # live_image = face_recognition.load_image_file(live_path)
        
        # Load and potentially upsample
        stored_image = face_recognition.load_image_file(stored_path)
        live_image = face_recognition.load_image_file(live_path)

        stored_encodings = face_recognition.face_encodings(stored_image, num_jitters=1)
        live_encodings = face_recognition.face_encodings(live_image, num_jitters=1)

        if len(stored_encodings) == 0:
            # Try once more with upsampling if failed
            stored_encodings = face_recognition.face_encodings(stored_image, num_jitters=1, model="large")
            if len(stored_encodings) == 0:
                 return {"success": False, "error": "No face found in database photo (Try uploading a clearer photo)"}
        
        if len(live_encodings) == 0:
            return {"success": False, "error": "No face found in camera feed (Ensure good lighting)"}

        # Compare
        # Tolerance: Lower is stricter. 0.6 is default. 
        # We use 0.6 for better acceptance rate.
        match = face_recognition.compare_faces([stored_encodings[0]], live_encodings[0], tolerance=0.6)
        distance = face_recognition.face_distance([stored_encodings[0]], live_encodings[0])
        
        dist_val = float(distance[0])
        confidence = 1 - dist_val

        return {
            "success": True,
            "match": bool(match[0]),
            "confidence": confidence,
            "distance": dist_val,
            "message": "Match Found" if match[0] else "Face Mismatch (Try closer)"
        }

    except Exception as e:
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({"success": False, "error": "Arguments missing"}))
        sys.exit(1)
    
    print(json.dumps(check_face(sys.argv[1], sys.argv[2])))
