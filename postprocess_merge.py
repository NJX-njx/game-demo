"""
Postprocess Merge Algorithm for Object Detection

This module provides functionality to merge overlapping bounding boxes
from object detection results using containment and IoU thresholds.
"""

import numpy as np
from typing import List, Dict, Tuple, Optional


def compute_iou(box1: List[float], box2: List[float]) -> float:
    """
    Compute Intersection over Union (IoU) between two boxes.
    
    Args:
        box1: [x1, y1, x2, y2] format
        box2: [x1, y1, x2, y2] format
    
    Returns:
        IoU value between 0 and 1
    """
    x1_inter = max(box1[0], box2[0])
    y1_inter = max(box1[1], box2[1])
    x2_inter = min(box1[2], box2[2])
    y2_inter = min(box1[3], box2[3])
    
    if x2_inter <= x1_inter or y2_inter <= y1_inter:
        return 0.0
    
    inter_area = (x2_inter - x1_inter) * (y2_inter - y1_inter)
    box1_area = (box1[2] - box1[0]) * (box1[3] - box1[1])
    box2_area = (box2[2] - box2[0]) * (box2[3] - box2[1])
    union_area = box1_area + box2_area - inter_area
    
    return inter_area / union_area if union_area > 0 else 0.0


def compute_containment(box1: List[float], box2: List[float]) -> float:
    """
    Compute containment ratio (intersection / smaller_box_area).
    
    Args:
        box1: [x1, y1, x2, y2] format
        box2: [x1, y1, x2, y2] format
    
    Returns:
        Containment ratio between 0 and 1
    """
    x1_inter = max(box1[0], box2[0])
    y1_inter = max(box1[1], box2[1])
    x2_inter = min(box1[2], box2[2])
    y2_inter = min(box1[3], box2[3])
    
    if x2_inter <= x1_inter or y2_inter <= y1_inter:
        return 0.0
    
    inter_area = (x2_inter - x1_inter) * (y2_inter - y1_inter)
    box1_area = (box1[2] - box1[0]) * (box1[3] - box1[1])
    box2_area = (box2[2] - box2[0]) * (box2[3] - box2[1])
    smaller_area = min(box1_area, box2_area)
    
    return inter_area / smaller_area if smaller_area > 0 else 0.0


def box_area(box: List[float]) -> float:
    """Calculate the area of a bounding box."""
    return (box[2] - box[0]) * (box[3] - box[1])


def merge_detections(
    detections: List[Dict],
    contain_thr: float = 0.8,
    iou_thr: float = 0.5,
    sort_key: str = "area",
    max_per_image: Optional[int] = None
) -> List[Dict]:
    """
    Merge overlapping detections based on containment and IoU thresholds.
    
    Args:
        detections: List of detection dicts with keys: bbox, score, category_id
                   bbox format: [x, y, width, height] (COCO format)
        contain_thr: Containment threshold for merging (default: 0.8)
        iou_thr: IoU threshold for merging (default: 0.5)
        sort_key: Key for sorting boxes - "area" or "score" (default: "area")
        max_per_image: Maximum number of detections to keep (default: None)
    
    Returns:
        List of merged detections
    """
    if not detections:
        return []
    
    # Convert COCO format [x, y, w, h] to [x1, y1, x2, y2]
    boxes = []
    for det in detections:
        bbox = det['bbox']
        boxes.append([bbox[0], bbox[1], bbox[0] + bbox[2], bbox[1] + bbox[3]])
    
    # Sort boxes by area or score (descending)
    if sort_key == "area":
        areas = [box_area(box) for box in boxes]
        sorted_indices = sorted(range(len(boxes)), key=lambda i: areas[i], reverse=True)
    else:  # sort by score
        sorted_indices = sorted(range(len(detections)), key=lambda i: detections[i]['score'], reverse=True)
    
    # Track which boxes to keep
    keep = [True] * len(boxes)
    
    # Merge overlapping boxes
    for i in range(len(boxes)):
        if not keep[sorted_indices[i]]:
            continue
        
        box_i = boxes[sorted_indices[i]]
        
        for j in range(i + 1, len(boxes)):
            if not keep[sorted_indices[j]]:
                continue
            
            box_j = boxes[sorted_indices[j]]
            
            # Check containment
            containment = compute_containment(box_i, box_j)
            if containment >= contain_thr:
                # Merge: keep the larger/higher-score box
                keep[sorted_indices[j]] = False
                continue
            
            # Check IoU
            iou = compute_iou(box_i, box_j)
            if iou >= iou_thr:
                # Merge: keep the larger/higher-score box
                keep[sorted_indices[j]] = False
    
    # Return kept detections
    merged = [detections[i] for i in range(len(detections)) if keep[i]]
    
    # Apply max_per_image limit if specified
    if max_per_image is not None and len(merged) > max_per_image:
        # Sort by score and keep top-k
        merged = sorted(merged, key=lambda x: x['score'], reverse=True)[:max_per_image]
    
    return merged


def postprocess_coco_results(
    results: List[Dict],
    contain_thr: float = 0.8,
    iou_thr: float = 0.5,
    sort_key: str = "area",
    max_per_image: Optional[int] = None
) -> List[Dict]:
    """
    Postprocess COCO-format detection results by merging overlapping boxes per image.
    
    Args:
        results: List of COCO detection results with keys: image_id, bbox, score, category_id
        contain_thr: Containment threshold for merging
        iou_thr: IoU threshold for merging
        sort_key: Key for sorting boxes - "area" or "score"
        max_per_image: Maximum number of detections per image
    
    Returns:
        List of merged detection results
    """
    if not results:
        return []
    
    # Group detections by image_id
    image_detections = {}
    for det in results:
        img_id = det['image_id']
        if img_id not in image_detections:
            image_detections[img_id] = []
        image_detections[img_id].append(det)
    
    # Merge detections per image
    merged_results = []
    for img_id, dets in image_detections.items():
        merged_dets = merge_detections(
            dets,
            contain_thr=contain_thr,
            iou_thr=iou_thr,
            sort_key=sort_key,
            max_per_image=max_per_image
        )
        merged_results.extend(merged_dets)
    
    return merged_results
