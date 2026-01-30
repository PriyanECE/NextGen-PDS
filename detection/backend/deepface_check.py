from deepface import DeepFace
import sys
import json
import os

# Suppress TF logs
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'

def verify(img1_path, img2_path):
    try:
        # Check files exist
        if not os.path.exists(img1_path):
            return {"success": False, "error": f"Stored image not found: {img1_path}"}
        if not os.path.exists(img2_path):
            return {"success": False, "error": f"Live image not found: {img2_path}"}

        # Run Verification
        # Upgrading to FaceNet512 (Google) + RetinaFace (SOTA Detector)
        result = DeepFace.verify(
            img1_path=img1_path,
            img2_path=img2_path,
            model_name="Facenet512",
            detector_backend="retinaface", 
            enforce_detection=False,
            align=True
        )

        return {
            "success": True,
            "match": result["verified"],
            "confidence": 1 - result["distance"], # Rough approximation
            "distance": result["distance"],
            "threshold": result["threshold"],
            "model": result["model"],
            "message": "Match Found" if result["verified"] else "Face Mismatch"
        }

    except Exception as e:
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({"success": False, "error": "Missing arguments"}))
    else:
        result = verify(sys.argv[1], sys.argv[2])
        print(json.dumps(result))
