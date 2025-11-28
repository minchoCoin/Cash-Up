import os
from pathlib import Path
from typing import Any, Dict, List, Optional

try:
    from ultralytics import YOLO
except Exception:  # ultralytics not installed or no weights available
    YOLO = None  # type: ignore


YOLO_MODEL_PATH = os.getenv("YOLO_MODEL_PATH", "yolov8n.pt")
TRASH_CANDIDATE_CLASSES = {
    "bottle",
    "cup",
    "wine glass",
    "bowl",
    "banana",
    "apple",
    "orange",
    "carrot",
    "pizza",
    "donut",
    "cake",
    "fork",
    "knife",
    "spoon",
    "book",
    "vase",
    "cell phone",
    "handbag",
    "backpack",
    "laptop",
    "sandwich",
    "hot dog",
    "carrot",
    "broccoli",
    "bottle",
    "cup",
    "truck",
    "boat",
    "tie",
}

_model: Optional[Any] = None


def _load_model():
    global _model
    if _model is None and YOLO is not None:
        try:
            _model = YOLO(YOLO_MODEL_PATH)
        except Exception:
            _model = None
    return _model


def analyze_trash(image_path: str) -> Dict[str, Any]:
    """Run YOLO inference. Returns detection summary but never raises."""
    model = _load_model()
    if model is None or not Path(image_path).exists():
        return {
            "has_trash": None,
            "trash_count": None,
            "max_trash_confidence": None,
            "raw_detections": None,
        }

    try:
        results = model(image_path, verbose=False)
        detections: List[Dict[str, Any]] = []
        trash_candidates: List[Dict[str, Any]] = []
        for res in results:
            names = res.names
            for box in res.boxes:
                cls_id = int(box.cls[0])
                cls_name = names.get(cls_id, str(cls_id)) if names else str(cls_id)
                conf = float(box.conf[0])
                bbox = [float(x) for x in box.xyxy[0].tolist()]
                det = {
                    "class_id": cls_id,
                    "class_name": cls_name,
                    "confidence": conf,
                    "bbox": bbox,
                }
                detections.append(det)
                if cls_name in TRASH_CANDIDATE_CLASSES:
                    trash_candidates.append(det)

        has_trash = bool(trash_candidates)
        max_conf = max((d["confidence"] for d in trash_candidates), default=None)
        return {
            "has_trash": has_trash,
            "trash_count": len(trash_candidates),
            "max_trash_confidence": max_conf,
            "raw_detections": detections,
        }
    except Exception:
        return {
            "has_trash": None,
            "trash_count": None,
            "max_trash_confidence": None,
            "raw_detections": None,
        }
