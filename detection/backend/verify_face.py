import sys
import os
import json
import base64
import re
from io import BytesIO

# Import face_recognition with error handling
try:
    import face_recognition
    from PIL import Image
    import numpy as np
except ImportError as e:
    print(json.dumps({"success": False, "error": f"Missing library: {str(e)}"}))
    sys.exit(1)

def load_image_from_content(content):
    """
    Tries to load an image from a string content.
    1. Check if it's a valid file path.
    2. Check if it's a Base64 string.
    """
    content = content.strip()
    
    # 1. Is it a file path?
    if os.path.exists(content):
        try:
            return face_recognition.load_image_file(content)
        except:
            pass # Not a valid image file, maybe just a path string that exists as a folder?

    # 2. Is it Base64?
    # Remove data URI header if present
    if content.startswith('data:image'):
        content = re.sub(r'^data:image/.+;base64,', '', content)
    
    try:
        # Try decoding
        image_data = base64.b64decode(content)
        image = Image.open(BytesIO(image_data))
        image = image.convert('RGB')
        return np.array(image)
    except Exception as e:
        # print(f"Debug: Failed to decode base64: {e}", file=sys.stderr)
        return None

def verify(live_data_file, ref_data_files):
    try:
        # 1. Load Live Image
        with open(live_data_file, 'r', encoding='utf-8') as f:
            live_content = f.read()
        
        live_img = load_image_from_content(live_content)
        if live_img is None:
            return {"success": False, "error": "Could not decode Live Image"}
        
        live_encodings = face_recognition.face_encodings(live_img)
        if not live_encodings:
            return {"success": False, "error": "No face found in camera feed"}
        
        live_encoding = live_encodings[0]

        # 2. Check References
        best_match_confidence = 0.0
        verified = False
        
        valid_refs = 0

        for ref_file in ref_data_files:
            try:
                with open(ref_file, 'r', encoding='utf-8') as f:
                    ref_content = f.read()
                
                ref_img = load_image_from_content(ref_content)
                if ref_img is None:
                    continue # Skip invalid refs
                
                valid_refs += 1
                
                ref_encodings = face_recognition.face_encodings(ref_img)
                if not ref_encodings:
                    continue
                
                ref_encoding = ref_encodings[0]

                # Compare
                # match = face_recognition.compare_faces([ref_encoding], live_encoding, tolerance=0.5)
                distance = face_recognition.face_distance([ref_encoding], live_encoding)[0]
                confidence = 1 - distance

                if distance < 0.5: # 0.5 is a good strict threshold (default is 0.6)
                    verified = True
                    if confidence > best_match_confidence:
                        best_match_confidence = confidence
            except Exception as e:
                # print(f"Debug: Error checking ref {ref_file}: {e}", file=sys.stderr)
                continue

        if valid_refs == 0:
            return {"success": False, "error": "No valid reference photos found in database"}

        return {
            "success": True,
            "match": verified,
            "confidence": best_match_confidence
        }

    except Exception as e:
        return {"success": False, "error": f"Script Error: {str(e)}"}

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({"success": False, "error": "Usage: python verify_face.py <live_txt> <ref1_txt> [ref2_txt ...]"}) )
        sys.exit(1)

    live_file = sys.argv[1]
    ref_files = sys.argv[2:]
    
    result = verify(live_file, ref_files)
    print(json.dumps(result))
