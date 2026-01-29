# Files to Delete - Cleanup Script

## Unnecessary YOLO Files (Can be deleted)

### Training Scripts (Not needed for MediaPipe)
- train_yolo.py
- train_hand_detection.py
- train_hand_model.py
- get_hand_model.py
- download_hand_dataset.py
- download_hand_model.py
- download_roboflow_hand.py
- get_hand_model_simple.py

### Test Scripts (Replaced by MediaPipe)
- test_yolo.py
- test_yolov8_detection.py
- test_hand_detection.py
- test_camera_hand_detection.py
- yolo_hand_detection.py
- simple_hand_detection.py
- demo_hand_detection.py

### Documentation (Outdated)
- HAND_DETECTION_GUIDE.md
- README_HAND_DETECTION.md
- FINAL_SOLUTION.md
- QUICK_START.md
- GET_HAND_MODEL.md
- download_model.ps1
- download_hand.py

### YOLO Models (Large files, not needed)
- yolov8n.pt (6.5 MB)
- yolov8n_base.pt (6.5 MB)
- yolo11n.pt (5.6 MB) - Keep if used for bag detection
- yolo26n.pt (5.3 MB) - Keep if used for bag detection

### Other
- get-pip.py
- asdf.py
- test_log.txt
- test_image.jpg
- hand_sample.png
- detected_hand_sample.png
- dataset_path.txt
- hand_model_path.txt

## Keep These Files

### MediaPipe Scripts (Current solution)
- detect_hand.py ✓
- webcam_hand_detection.py ✓

### Your Data
- images/ folder ✓
- classes.txt ✓
- data.yaml ✓
- train/ folder ✓
- test/ folder ✓
- runs/ folder ✓

### Environment
- venv_gpu/ ✓
- .venv/ ✓

## Run Cleanup

To delete unnecessary files, run:
```powershell
python cleanup.py
```
