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

def load_model():
    """
    Preload the model by running a dummy verification.
    """
    try:
        # Send status to REAL stdout
        real_stdout.write(json.dumps({"status": "loading", "message": "Loading DeepFace models..."}) + "\n")
        real_stdout.flush()
        
        DeepFace.build_model("Facenet512")
        
        real_stdout.write(json.dumps({"status": "ready", "message": "Models loaded"}) + "\n")
        real_stdout.flush()
    except Exception as e:
        real_stdout.write(json.dumps({"status": "error", "error": str(e)}) + "\n")
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

        # Run Verification
        # Optimization: Switching to 'opencv' detector for speed (RetinaFace is too slow on CPU)
        # TUNING: Using custom threshold 0.50 (relaxed) to handle posture/distance variance
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

        return {
            "success": True,
            "match": is_match, # Override with custom threshold
            "confidence": 1 - distance,
            "distance": distance,
            "threshold": CUSTOM_THRESHOLD,
            "message": "Match Found" if is_match else "Face Mismatch"
        }

    except Exception as e:
        return {"success": False, "error": str(e)}

def main():
    load_model()
    
    # Process Loop - Read from stdin (which is still connected to parent)
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
