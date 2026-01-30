import sys
import json
import os
import traceback

# 1. Redirect standard stdout to stderr to catch ALL noise (TF logs, etc.)
# Keep a reference to the real stdout for our JSON usage
real_stdout = sys.stdout
sys.stdout = sys.stderr

# Suppress TF logs via environment variables
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'  # 3 = ERROR
os.environ['TF_EnableOneDNNOpts'] = '0'

# Now import heavy libraries
from deepface import DeepFace
from liveness_utils import LivenessDetector
import cv2
import numpy as np

# Global detector instance
liveness_detector = None

def load_model():
    """
    Preload the models by running a dummy verification and initializing liveness detector.
    """
    global liveness_detector
    try:
        # Send status to REAL stdout
        real_stdout.write(json.dumps({"status": "loading", "message": "Loading Face Authentication models..."}) + "\n")
        real_stdout.flush()
        
        DeepFace.build_model("Facenet512")
        
        # Initialize Liveness Detector
        model_path = os.path.join(os.path.dirname(__file__), "models", "liveness_model.onnx")
        if os.path.exists(model_path):
            # Allow threshold override via ENV
            try:
                env_threshold = float(os.environ.get('LIVENESS_THRESHOLD', 0.5))
            except:
                env_threshold = 0.5
                
            liveness_detector = LivenessDetector(model_path, threshold=env_threshold)
            real_stdout.write(json.dumps({"status": "ready", "message": f"Models loaded with Liveness Detection (th={env_threshold})"}) + "\n")
        else:
            real_stdout.write(json.dumps({"status": "ready", "message": "Models loaded (Liveness model missing)"}) + "\n")
        
        real_stdout.flush()
    except Exception as e:
        real_stdout.write(json.dumps({"status": "error", "error": f"Load error: {str(e)}"}) + "\n")
        real_stdout.flush()

def process_request(data):
    try:
        img1_path = data.get("img1_path")
        img2_path = data.get("img2_path")

        if not img1_path or not img2_path:
            return {"success": False, "error": "Missing image paths"}

        if not os.path.exists(img1_path):
            return {"success": False, "error": f"Stored image not found: {img1_path}"}
        if not os.path.exists(img2_path):
            return {"success": False, "error": f"Live image not found: {img2_path}"}

        # 1. Load Live Image for Liveness Check
        live_img = cv2.imread(img2_path)
        if live_img is None:
            return {"success": False, "error": "Failed to read live image"}

        # 2. Extract Face for Bounding Box (use for liveness)
        # We use extract_faces to get both the face and its area/location
        faces = DeepFace.extract_faces(
            img_path=img2_path,
            detector_backend="opencv",
            enforce_detection=False,
            align=True
        )

        liveness_result = {"is_liveness": True, "liveness_status": "skipped"}
        
        if faces and len(faces) > 0:
            # Pick the largest face
            main_face = max(faces, key=lambda x: x["facial_area"]["w"] * x["facial_area"]["h"])
            area = main_face["facial_area"]
            bbox = (area["x"], area["y"], area["x"] + area["w"], area["y"] + area["h"])
            
            # Run Liveness Detection
            if liveness_detector:
                liveness_result = liveness_detector.detect_liveness(live_img, bbox)

        # 3. Run Face Verification
        # Optimization: Switching to 'opencv' detector for speed (RetinaFace is too slow on CPU)
        result = DeepFace.verify(
            img1_path=img1_path,
            img2_path=img2_path,
            model_name="Facenet512",
            detector_backend="opencv", 
            distance_metric="cosine",
            enforce_detection=False,
            align=True
        )

        distance = result["distance"]
        CUSTOM_THRESHOLD = 0.50
        is_match = distance <= CUSTOM_THRESHOLD
        
        # FINAL DECISION: Must be a match AND must be real (liveness)
        is_liveness = liveness_result.get("is_liveness", False)
        authenticated = is_match and is_liveness

        # Log detailed info for debugging (visible in Node.js logs)
        status_msg = f"Match: {is_match} (dist={distance:.3f}/{CUSTOM_THRESHOLD}), Liveness: {is_liveness} (score={liveness_result.get('liveness_score', 0):.3f})"
        sys.stderr.write(f"[FaceService] {status_msg}\n")

        return {
            "success": True,
            "authenticated": authenticated,
            "match": is_match,
            "liveness": is_liveness,
            "liveness_status": liveness_result.get("liveness_status"),
            "liveness_score": liveness_result.get("liveness_score"),
            "confidence": 1 - distance,
            "distance": distance,
            "threshold": CUSTOM_THRESHOLD,
            "message": "Authenticated Successfully" if authenticated else 
                       ("Face Mismatch" if not is_match else "Spoofing Detected (Liveness Failed)")
        }

    except Exception as e:
        return {"success": False, "error": f"Processing error: {str(e)}"}

def main():
    load_model()
    
    # Process Loop - Read from stdin
    while True:
        try:
            line = sys.stdin.readline()
            if not line:
                break
            line = line.strip()
            if not line:
                continue
            
            try:
                data = json.loads(line)
                response = process_request(data)
                
                # Write ONLY to REAL stdout
                real_stdout.write(json.dumps(response) + "\n")
                real_stdout.flush()
                
            except json.JSONDecodeError:
                real_stdout.write(json.dumps({"success": False, "error": "Invalid JSON input"}) + "\n")
                real_stdout.flush()
                
        except Exception as e:
            real_stdout.write(json.dumps({"success": False, "error": f"Unexpected loop error: {str(e)}"}) + "\n")
            real_stdout.flush()

if __name__ == "__main__":
    main()
