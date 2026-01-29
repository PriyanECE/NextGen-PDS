from ultralytics import YOLO

import cv2
import os

# Override all specific class names (garbage, plastic, etc.) to generic "Bag"
# We do this post-inference to ensure the plot function sees it.

# Load the trained model
model = YOLO('best.pt')

# Run inference on the test image (disable auto-save to handle it manually)
results = model('images/sample2.jpeg', save=False, conf=0.5)

for r in results:
    # Override names in the result object
    r.names = {i: 'Bag' for i in r.names.keys()}
    
    # Plot (returns BGR numpy array)
    im_array = r.plot()
    
    # Save manually
    save_path = os.path.join('prediction', 'prediction_bag.jpg')
    os.makedirs(os.path.dirname(save_path), exist_ok=True)
    cv2.imwrite(save_path, im_array)
    print(f"Prediction saved to {save_path}")
