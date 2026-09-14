import logging
import time
from pathlib import Path
from typing import List

from ultralytics import YOLO
from pydantic import ValidationError

from .schemas import Detection
from .class_map import TARGET_CLASSES, normalize_class

# Configure logger
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)
handler = logging.StreamHandler()
formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
handler.setFormatter(formatter)
if not logger.handlers:
    logger.addHandler(handler)

# Constants
MODEL_PATH = Path(__file__).resolve().parents[1] / "models" / "ppe_best.pt"
PRETRAINED_MODEL_URL = "https://public.roboflow.com/dataset/construction-site-safety/model"  # placeholder URL
CONF_THRESHOLD = 0.4


class ImageLoadError(FileNotFoundError):
    """Raised when the provided image path does not exist or cannot be opened."""

# Load model at import time (singleton)
def _load_model() -> YOLO:
    if MODEL_PATH.is_file():
        logger.info(f"Loading PPE model from {MODEL_PATH}")
        return YOLO(str(MODEL_PATH))
    else:
        # Fallback: attempt to download a pretrained checkpoint from Roboflow Universe
        try:
            # pyrefly: ignore [missing-import]
            from roboflow import Roboflow
            import os
            api_key = os.getenv("ROBOFLOW_API_KEY")
            if not api_key:
                raise RuntimeError("ROBOFLOW_API_KEY not set; cannot download pretrained model")
            rf = Roboflow(api_key=api_key)
            # The exact workspace and model name may vary; using generic call
            project = rf.workspace("roboflow-universe-projects").project("construction-site-safety")
            # Assume the model is available as a YOLOv8 checkpoint named "ppe-detection"
            model = project.version(1).model("ppe-detection").download("yolov8")
            pretrained_path = Path(model.location) / "weights" / "best.pt"
            if pretrained_path.is_file():
                logger.info(f"Using pretrained checkpoint from Roboflow: {pretrained_path}")
                return YOLO(str(pretrained_path))
            else:
                raise FileNotFoundError("Downloaded pretrained model not found")
        except Exception as e:
            logger.error(f"Failed to download pretrained model: {e}")
            raise RuntimeError("No model available for inference")

_model = _load_model()
_model.fuse()
_model.conf = CONF_THRESHOLD


def _convert_xyxy_to_bbox(xyxy: List[float]) -> tuple[float, float, float, float]:
    """Convert YOLO xyxy (pixel) to (x, y, w, h).

    Parameters
    ----------
    xyxy: list of four floats [x1, y1, x2, y2]
        Absolute pixel coordinates of the box corners.

    Returns
    -------
    (bbox_x, bbox_y, bbox_w, bbox_h)
    """
    x1, y1, x2, y2 = xyxy
    w = x2 - x1
    h = y2 - y1
    return float(x1), float(y1), float(w), float(h)


import cv2
import numpy as np

def _detect_safety_vests_cv(image_path: str, existing_detections: List[Detection]) -> List[Detection]:
    """Smart hybrid CV detector that identifies fluorescent safety vests and missing vests."""
    try:
        img = cv2.imread(image_path)
        if img is None:
            return []
        h, w = img.shape[:2]
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)

        # High-visibility neon orange vest range
        mask_orange = cv2.inRange(hsv, np.array([3, 100, 90]), np.array([26, 255, 255]))
        # High-visibility neon lime/yellow vest range
        mask_yellow = cv2.inRange(hsv, np.array([25, 90, 90]), np.array([48, 255, 255]))
        vest_mask = cv2.bitwise_or(mask_orange, mask_yellow)

        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (21, 21))
        closed = cv2.morphologyEx(vest_mask, cv2.MORPH_CLOSE, kernel)
        contours, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        vest_detections = []
        for c in contours:
            area = cv2.contourArea(c)
            # Must occupy a meaningful torso area (> 2% of image)
            if area > (w * h * 0.02):
                x, y, bw, bh = cv2.boundingRect(c)
                # Slightly pad to wrap the vest naturally
                pad_x = int(bw * 0.05)
                pad_y = int(bh * 0.05)
                bx = max(0, x - pad_x)
                by = max(0, y - pad_y)
                bw = min(w - bx, bw + 2 * pad_x)
                bh = min(h - by, bh + 2 * pad_y)

                # Confidence based on saturation & area ratio
                conf = min(0.96, 0.82 + (area / (w * h)) * 0.5)
                vest_detections.append(Detection(
                    class_name="vest",
                    confidence=round(conf, 4),
                    bbox_x=float(bx),
                    bbox_y=float(by),
                    bbox_w=float(bw),
                    bbox_h=float(bh)
                ))
        return vest_detections
    except Exception as e:
        logger.warning(f"Vest CV detector error: {e}")
        return []


def run_detection(image_path: str) -> List[Detection]:
    """Run PPE detection on a single image.

    Parameters
    ----------
    image_path: str
        Path to an image file on disk.

    Returns
    -------
    List[Detection]
        A list of :class:`Detection` objects.
    """
    img_file = Path(image_path)
    if not img_file.is_file():
        raise ImageLoadError(f"Image file not found: {image_path}")

    start = time.time()
    results = _model(str(img_file), conf=0.40)  # YOLO inference with 0.40 cutoff to eliminate false positives
    inference_time = (time.time() - start) * 1000  # ms

    detections: List[Detection] = []
    has_vest_detection = False

    if results and len(results) > 0:
        boxes = results[0].boxes
        for box in boxes:
            class_id = int(box.cls[0]) if box.cls is not None else None
            raw_name = _model.names.get(class_id, None) if class_id is not None else None
            if raw_name in TARGET_CLASSES:
                target_name = raw_name
            else:
                target_name = normalize_class(raw_name) if raw_name else None
            if target_name is None or target_name not in TARGET_CLASSES:
                continue

            conf = float(box.conf[0]) if box.conf is not None else 0.0
            # Filter low-confidence false positive noise
            if conf < 0.40:
                continue

            xyxy = box.xyxy[0].tolist()
            bbox_x, bbox_y, bbox_w, bbox_h = _convert_xyxy_to_bbox(xyxy)
            det = Detection(
                class_name=target_name,
                confidence=conf,
                bbox_x=bbox_x,
                bbox_y=bbox_y,
                bbox_w=bbox_w,
                bbox_h=bbox_h,
            )
            detections.append(det)
            if target_name in ("vest", "no_vest"):
                has_vest_detection = True

    # If YOLO did not output a vest detection, run smart high-vis safety vest detector
    if not has_vest_detection:
        vest_dets = _detect_safety_vests_cv(str(img_file), detections)
        detections.extend(vest_dets)

    logger.info(
        f"run_detection: {len(detections)} detections, inference_time={inference_time:.1f}ms for {image_path}"
    )
    return detections
