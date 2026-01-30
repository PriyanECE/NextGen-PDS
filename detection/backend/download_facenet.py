import os
import urllib.request
from pathlib import Path

# Path where DeepFace expects weights
home = str(Path.home())
weights_dir = os.path.join(home, ".deepface", "weights")
os.makedirs(weights_dir, exist_ok=True)

# FaceNet512 Weights
url = "https://github.com/serengil/deepface_models/releases/download/v1.0/facenet512_weights.h5"
output_path = os.path.join(weights_dir, "facenet512_weights.h5")

if os.path.exists(output_path):
    print(f"Weights already exist at {output_path}")
    if os.path.getsize(output_path) < 1000000: # Check if corrupted
        print("File seems too small, re-downloading...")
        os.remove(output_path)
    else:
        print("Skipping download.")
        exit(0)

print(f"Downloading FaceNet512 weights to {output_path}...")
try:
    urllib.request.urlretrieve(url, output_path)
    print("Download complete!")
except Exception as e:
    print(f"Download failed: {e}")
