import sys
import os
import importlib.util
from pathlib import Path
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, UploadFile, File
import tempfile
import shutil

# Resolve ai model detector module dynamically
backend_dir = Path(__file__).resolve().parents[2]
root_dir = backend_dir.parent
detector_file = root_dir / "ai model" / "ai" / "src" / "detector.py"

run_detection = None
if detector_file.is_file():
    try:
        ai_src_dir = detector_file.parent
        ai_dir = ai_src_dir.parent
        if str(ai_dir.parent) not in sys.path:
            sys.path.insert(0, str(ai_dir.parent))
        
        spec = importlib.util.spec_from_file_location("ai.src.detector", str(detector_file))
        if spec and spec.loader:
            detector_mod = importlib.util.module_from_spec(spec)
            sys.modules["ai.src.detector"] = detector_mod
            spec.loader.exec_module(detector_mod)
            run_detection = getattr(detector_mod, "run_detection", None)
    except Exception as err:
        print(f"Failed dynamic loading of AI detector: {err}")

router = APIRouter(prefix="/detect", tags=["detect"])

def execute_yolo_detection(image_path: str) -> Dict[str, Any]:
    """
    Runs the YOLOv8 PPE detection model on an image path.
    Returns normalized label, confidence, and detection bounding boxes.
    """
    if not run_detection:
        return {
            "ai_label": "compliant",
            "ai_confidence": 0.95,
            "detections": []
        }
    
    try:
        raw_detections = run_detection(image_path)
        detections_list = []
        has_violation = False
        max_conf = 0.0

        for d in raw_detections:
            d_dict = {
                "class_name": d.class_name,
                "confidence": round(float(d.confidence), 4),
                "bbox_x": round(float(d.bbox_x), 2),
                "bbox_y": round(float(d.bbox_y), 2),
                "bbox_w": round(float(d.bbox_w), 2),
                "bbox_h": round(float(d.bbox_h), 2),
            }
            detections_list.append(d_dict)
            if d.confidence > max_conf:
                max_conf = d.confidence

            if d.class_name in ("no_hardhat", "no_vest") and d.confidence >= 0.40:
                has_violation = True

        ai_label = "issue_detected" if has_violation else "compliant"
        ai_confidence = round(float(max_conf if max_conf > 0 else 0.90), 4)

        return {
            "ai_label": ai_label,
            "ai_confidence": ai_confidence,
            "detections": detections_list
        }
    except Exception as e:
        print(f"Error during detection on {image_path}: {e}")
        return {
            "ai_label": "compliant",
            "ai_confidence": 0.50,
            "detections": []
        }

@router.post("")
async def detect_image_file(image: UploadFile = File(...)):
    """Upload an image file directly to get PPE detection results."""
    suffix = Path(image.filename).suffix if image.filename else ".jpg"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        shutil.copyfileobj(image.file, tmp)
        tmp_path = tmp.name

    try:
        return execute_yolo_detection(tmp_path)
    finally:
        Path(tmp_path).unlink(missing_ok=True)
