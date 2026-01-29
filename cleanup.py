"""
Cleanup Script - Remove Unnecessary YOLO Files
Keeps only MediaPipe solution and your data
"""
import os
import shutil

print("=" * 70)
print("CLEANUP - REMOVING UNNECESSARY FILES")
print("=" * 70)

# Files to delete
files_to_delete = [
    # Training scripts
    'train_yolo.py',
    'train_hand_detection.py',
    'train_hand_model.py',
    'get_hand_model.py',
    'download_hand_dataset.py',
    'download_hand_model.py',
    'download_roboflow_hand.py',
    'get_hand_model_simple.py',
    
    # Test scripts
    'test_yolo.py',
    'test_yolov8_detection.py',
    'test_hand_detection.py',
    'test_camera_hand_detection.py',
    'yolo_hand_detection.py',
    'simple_hand_detection.py',
    'demo_hand_detection.py',
    
    # Documentation
    'HAND_DETECTION_GUIDE.md',
    'README_HAND_DETECTION.md',
    'FINAL_SOLUTION.md',
    'QUICK_START.md',
    'GET_HAND_MODEL.md',
    'download_model.ps1',
    'download_hand.py',
    
    # YOLO models (large files)
    'yolov8n.pt',
    'yolov8n_base.pt',
    
    # Other
    'get-pip.py',
    'asdf.py',
    'test_log.txt',
    'test_image.jpg',
    'hand_sample.png',
    'detected_hand_sample.png',
    'dataset_path.txt',
    'hand_model_path.txt',
    'predict.py',
]

# Folders to delete
folders_to_delete = [
    'weights',
]

deleted_count = 0
kept_count = 0
total_size_freed = 0

print("\nDeleting files...")
for file in files_to_delete:
    if os.path.exists(file):
        try:
            size = os.path.getsize(file)
            os.remove(file)
            deleted_count += 1
            total_size_freed += size
            print(f"  ✓ Deleted: {file}")
        except Exception as e:
            print(f"  ✗ Failed to delete {file}: {e}")
    else:
        kept_count += 1

print("\nDeleting folders...")
for folder in folders_to_delete:
    if os.path.exists(folder):
        try:
            shutil.rmtree(folder)
            deleted_count += 1
            print(f"  ✓ Deleted folder: {folder}")
        except Exception as e:
            print(f"  ✗ Failed to delete {folder}: {e}")

print("\n" + "=" * 70)
print("CLEANUP COMPLETE!")
print("=" * 70)
print(f"\n✓ Deleted {deleted_count} files/folders")
print(f"✓ Freed {total_size_freed / (1024*1024):.2f} MB")

print("\n" + "=" * 70)
print("REMAINING FILES")
print("=" * 70)
print("""
MediaPipe Scripts:
  ✓ detect_hand.py - Hand detection for images
  ✓ webcam_hand_detection.py - Real-time webcam detection

Your Data:
  ✓ images/ - Your images
  ✓ train/ - Training data
  ✓ test/ - Test data
  ✓ data.yaml - Dataset config
  ✓ classes.txt - Class names

Environment:
  ✓ venv_gpu/ - Python virtual environment

YOLO Models (if you need bag detection):
  ✓ yolo11n.pt - Keep for bag detection
  ✓ yolo26n.pt - Your trained bag model
""")

print("\nYour hand detection setup is now clean and simple!")
print("Use: python detect_hand.py")
