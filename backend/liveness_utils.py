import cv2
import numpy as np
import onnxruntime as ort
from typing import List, Dict, Tuple

class LivenessDetector:
    def __init__(self, model_path: str, model_img_size: int = 128, threshold: float = 0.5):
        self.model_path = model_path
        self.model_img_size = model_img_size
        self.threshold = threshold
        
        # Load ONNX session
        self.session = ort.InferenceSession(
            model_path,
            providers=["CPUExecutionProvider"]
        )
        self.input_name = self.session.get_inputs()[0].name
        
        # Sigmoid threshold for logit comparison (converts probability to logit)
        p = max(1e-6, min(1 - 1e-6, threshold))
        self.logit_threshold = np.log(p / (1 - p))
        print(f"[LivenessDetector] Initialized with prob_threshold={threshold}, logit_threshold={self.logit_threshold:.4f}")

    def _crop_face(self, img: np.ndarray, bbox: Tuple[int, int, int, int], expansion_factor: float = 1.5) -> np.ndarray:
        """Extract square face crop from bbox with expansion. Pad edges with reflection."""
        original_height, original_width = img.shape[:2]
        x1, y1, x2, y2 = bbox
        
        w = x2 - x1
        h = y2 - y1
        
        if w <= 0 or h <= 0:
            raise ValueError("Invalid bbox dimensions")
            
        max_dim = max(w, h)
        center_x = x1 + w / 2
        center_y = y1 + h / 2
        
        side = int(max_dim * expansion_factor)
        new_x1 = int(center_x - side / 2)
        new_y1 = int(center_y - side / 2)
        
        # Determine actual crop coordinates
        actual_x1 = max(0, new_x1)
        actual_y1 = max(0, new_y1)
        actual_x2 = min(original_width, new_x1 + side)
        actual_y2 = min(original_height, new_y1 + side)
        
        # Padding
        top_pad = int(max(0, -new_y1))
        left_pad = int(max(0, -new_x1))
        bottom_pad = int(max(0, (new_y1 + side) - original_height))
        right_pad = int(max(0, (new_x1 + side) - original_width))
        
        if actual_x2 > actual_x1 and actual_y2 > actual_y1:
            img_crop = img[actual_y1:actual_y2, actual_x1:actual_x2, :]
        else:
            img_crop = np.zeros((0, 0, 3), dtype=img.dtype)
            
        result = cv2.copyMakeBorder(
            img_crop, top_pad, bottom_pad, left_pad, right_pad, cv2.BORDER_REFLECT_101
        )
        
        return cv2.resize(result, (self.model_img_size, self.model_img_size), interpolation=cv2.INTER_AREA)

    def _preprocess(self, face_crop: np.ndarray) -> np.ndarray:
        """Normalize to [0,1], convert to CHW and add batch dimension."""
        img = face_crop.transpose(2, 0, 1).astype(np.float32) / 255.0
        return np.expand_dims(img, axis=0)

    def detect_liveness(self, img_bgr: np.ndarray, face_bbox_xyxy: Tuple[int, int, int, int]) -> Dict:
        """
        Predict if face is real or fake.
        face_bbox_xyxy: (x1, y1, x2, y2)
        """
        # Convert BGR to RGB as models are usually trained on RGB
        img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
        
        try:
            face_crop = self._crop_face(img_rgb, face_bbox_xyxy)
            input_tensor = self._preprocess(face_crop)
            
            # Inference
            outputs = self.session.run([], {self.input_name: input_tensor})
            logits = outputs[0][0] # (2,) - [real_logit, spoof_logit]
            
            real_logit = float(logits[0])
            spoof_logit = float(logits[1])
            logit_diff = real_logit - spoof_logit
            
            is_real = logit_diff >= self.logit_threshold
            
            return {
                "is_liveness": bool(is_real),
                "liveness_score": float(logit_diff),
                "liveness_status": "real" if is_real else "spoof"
            }
        except Exception as e:
            return {
                "is_liveness": False,
                "error": str(e),
                "liveness_status": "error"
            }
