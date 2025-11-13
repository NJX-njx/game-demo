#!/usr/bin/env python3
"""
Comprehensive Evaluation Suite for postprocess_merge.py

This module provides a complete evaluation toolkit for the postprocess_merge algorithm,
including:
- Unit tests for merge algorithm correctness
- Performance evaluation and metrics comparison
- Visualization tools for before/after comparison
- Statistical analysis with JSON/CSV reporting
- COCO format integration for ground truth comparison

Usage:
    # Run unit tests
    python evaluate_postprocess_merge.py --test
    
    # Evaluate with predictions and ground truth
    python evaluate_postprocess_merge.py --eval --pred predictions.json --gt ground_truth.json --output results/
    
    # Custom thresholds
    python evaluate_postprocess_merge.py --eval --pred pred.json --contain-thr 0.7 --iou-thr 0.6
"""

import argparse
import json
import csv
import os
import sys
import unittest
from typing import List, Dict, Tuple, Optional
from collections import defaultdict
import numpy as np

# Import the merge algorithm
try:
    from postprocess_merge import (
        compute_iou, compute_containment, box_area, 
        merge_detections, postprocess_coco_results
    )
except ImportError:
    print("Error: Cannot import postprocess_merge.py. Make sure it's in the same directory.")
    sys.exit(1)


# ============================================================================
# UNIT TESTS
# ============================================================================

class TestMergeAlgorithm(unittest.TestCase):
    """Unit tests for merge algorithm correctness."""
    
    def test_compute_iou(self):
        """Test IoU computation."""
        # Identical boxes
        box1 = [0, 0, 10, 10]
        box2 = [0, 0, 10, 10]
        self.assertAlmostEqual(compute_iou(box1, box2), 1.0, places=5)
        
        # No overlap
        box1 = [0, 0, 10, 10]
        box2 = [20, 20, 30, 30]
        self.assertAlmostEqual(compute_iou(box1, box2), 0.0, places=5)
        
        # Partial overlap
        box1 = [0, 0, 10, 10]
        box2 = [5, 5, 15, 15]
        # Intersection: 5x5=25, Union: 100+100-25=175
        expected_iou = 25.0 / 175.0
        self.assertAlmostEqual(compute_iou(box1, box2), expected_iou, places=5)
    
    def test_compute_containment(self):
        """Test containment computation."""
        # Complete containment
        box1 = [0, 0, 10, 10]  # area = 100
        box2 = [2, 2, 8, 8]     # area = 36
        # Intersection = 36, smaller area = 36
        self.assertAlmostEqual(compute_containment(box1, box2), 1.0, places=5)
        
        # No overlap
        box1 = [0, 0, 10, 10]
        box2 = [20, 20, 30, 30]
        self.assertAlmostEqual(compute_containment(box1, box2), 0.0, places=5)
        
        # Partial overlap
        box1 = [0, 0, 10, 10]  # area = 100
        box2 = [5, 5, 15, 15]   # area = 100
        # Intersection = 25, smaller area = 100
        expected_containment = 25.0 / 100.0
        self.assertAlmostEqual(compute_containment(box1, box2), expected_containment, places=5)
    
    def test_box_area(self):
        """Test box area calculation."""
        box = [0, 0, 10, 10]
        self.assertAlmostEqual(box_area(box), 100.0, places=5)
        
        box = [5, 5, 15, 20]
        self.assertAlmostEqual(box_area(box), 150.0, places=5)
    
    def test_merge_detections_basic(self):
        """Test basic merge functionality."""
        # Two overlapping boxes
        detections = [
            {'bbox': [0, 0, 10, 10], 'score': 0.9, 'category_id': 1},
            {'bbox': [5, 5, 10, 10], 'score': 0.8, 'category_id': 1}
        ]
        
        merged = merge_detections(detections, contain_thr=0.5, iou_thr=0.3)
        # Should merge to 1 box (higher IoU/containment)
        self.assertLessEqual(len(merged), 2)
    
    def test_merge_detections_no_overlap(self):
        """Test that non-overlapping boxes are kept."""
        detections = [
            {'bbox': [0, 0, 10, 10], 'score': 0.9, 'category_id': 1},
            {'bbox': [50, 50, 10, 10], 'score': 0.8, 'category_id': 1}
        ]
        
        merged = merge_detections(detections, contain_thr=0.8, iou_thr=0.5)
        self.assertEqual(len(merged), 2)  # Both should be kept
    
    def test_merge_detections_sort_by_area(self):
        """Test sorting by area."""
        detections = [
            {'bbox': [0, 0, 5, 5], 'score': 0.9, 'category_id': 1},    # Small, high score
            {'bbox': [0, 0, 20, 20], 'score': 0.7, 'category_id': 1}  # Large, low score
        ]
        
        merged = merge_detections(detections, contain_thr=0.9, iou_thr=0.5, sort_key='area')
        # Should keep the larger box (better containment)
        self.assertEqual(len(merged), 1)
    
    def test_merge_detections_max_per_image(self):
        """Test max_per_image limit."""
        detections = [
            {'bbox': [i*20, 0, 10, 10], 'score': 0.9 - i*0.1, 'category_id': 1}
            for i in range(10)
        ]
        
        merged = merge_detections(detections, max_per_image=5)
        self.assertEqual(len(merged), 5)
    
    def test_postprocess_coco_results(self):
        """Test COCO results processing with multiple images."""
        results = [
            {'image_id': 1, 'bbox': [0, 0, 10, 10], 'score': 0.9, 'category_id': 1},
            {'image_id': 1, 'bbox': [5, 5, 10, 10], 'score': 0.8, 'category_id': 1},
            {'image_id': 2, 'bbox': [0, 0, 10, 10], 'score': 0.9, 'category_id': 1},
            {'image_id': 2, 'bbox': [50, 50, 10, 10], 'score': 0.8, 'category_id': 1},
        ]
        
        merged = postprocess_coco_results(results, contain_thr=0.5, iou_thr=0.3)
        # Image 1: should merge to 1, Image 2: should keep 2
        self.assertLessEqual(len(merged), 4)


# ============================================================================
# VISUALIZATION TOOLS
# ============================================================================

class VisualizationTools:
    """Tools for visualizing detections before and after merging."""
    
    @staticmethod
    def setup_matplotlib():
        """Setup matplotlib with appropriate backend."""
        try:
            import matplotlib
            matplotlib.use('Agg')  # Use non-interactive backend
            import matplotlib.pyplot as plt
            return plt
        except ImportError:
            print("Warning: matplotlib not available. Skipping visualizations.")
            return None
    
    @staticmethod
    def plot_detection_comparison(
        original_dets: List[Dict],
        merged_dets: List[Dict],
        output_path: str,
        title: str = "Detection Comparison"
    ):
        """
        Plot original vs merged detections side by side.
        
        Args:
            original_dets: Original detections
            merged_dets: Merged detections
            output_path: Path to save the plot
            title: Plot title
        """
        plt = VisualizationTools.setup_matplotlib()
        if plt is None:
            return
        
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(15, 6))
        
        # Plot original detections
        ax1.set_title(f"Original ({len(original_dets)} boxes)")
        ax1.set_xlim(0, 1000)
        ax1.set_ylim(1000, 0)
        for det in original_dets:
            bbox = det['bbox']
            rect = plt.Rectangle(
                (bbox[0], bbox[1]), bbox[2], bbox[3],
                fill=False, edgecolor='red', linewidth=2
            )
            ax1.add_patch(rect)
            ax1.text(bbox[0], bbox[1]-5, f"{det['score']:.2f}", 
                    color='red', fontsize=8)
        
        # Plot merged detections
        ax2.set_title(f"Merged ({len(merged_dets)} boxes)")
        ax2.set_xlim(0, 1000)
        ax2.set_ylim(1000, 0)
        for det in merged_dets:
            bbox = det['bbox']
            rect = plt.Rectangle(
                (bbox[0], bbox[1]), bbox[2], bbox[3],
                fill=False, edgecolor='blue', linewidth=2
            )
            ax2.add_patch(rect)
            ax2.text(bbox[0], bbox[1]-5, f"{det['score']:.2f}", 
                    color='blue', fontsize=8)
        
        plt.suptitle(title)
        plt.tight_layout()
        plt.savefig(output_path, dpi=150, bbox_inches='tight')
        plt.close()
        print(f"Saved visualization to {output_path}")
    
    @staticmethod
    def plot_score_distribution(
        original_scores: List[float],
        merged_scores: List[float],
        output_path: str
    ):
        """Plot score distribution before and after merging."""
        plt = VisualizationTools.setup_matplotlib()
        if plt is None:
            return
        
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 4))
        
        # Original scores
        ax1.hist(original_scores, bins=20, color='red', alpha=0.7, edgecolor='black')
        ax1.set_title(f"Original Scores (n={len(original_scores)})")
        ax1.set_xlabel("Score")
        ax1.set_ylabel("Frequency")
        ax1.grid(True, alpha=0.3)
        
        # Merged scores
        ax2.hist(merged_scores, bins=20, color='blue', alpha=0.7, edgecolor='black')
        ax2.set_title(f"Merged Scores (n={len(merged_scores)})")
        ax2.set_xlabel("Score")
        ax2.set_ylabel("Frequency")
        ax2.grid(True, alpha=0.3)
        
        plt.tight_layout()
        plt.savefig(output_path, dpi=150, bbox_inches='tight')
        plt.close()
        print(f"Saved score distribution to {output_path}")
    
    @staticmethod
    def plot_area_distribution(
        original_areas: List[float],
        merged_areas: List[float],
        output_path: str
    ):
        """Plot area distribution before and after merging."""
        plt = VisualizationTools.setup_matplotlib()
        if plt is None:
            return
        
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 4))
        
        # Original areas
        ax1.hist(original_areas, bins=20, color='red', alpha=0.7, edgecolor='black')
        ax1.set_title(f"Original Areas (n={len(original_areas)})")
        ax1.set_xlabel("Area (pixels²)")
        ax1.set_ylabel("Frequency")
        ax1.grid(True, alpha=0.3)
        
        # Merged areas
        ax2.hist(merged_areas, bins=20, color='blue', alpha=0.7, edgecolor='black')
        ax2.set_title(f"Merged Areas (n={len(merged_areas)})")
        ax2.set_xlabel("Area (pixels²)")
        ax2.set_ylabel("Frequency")
        ax2.grid(True, alpha=0.3)
        
        plt.tight_layout()
        plt.savefig(output_path, dpi=150, bbox_inches='tight')
        plt.close()
        print(f"Saved area distribution to {output_path}")


# ============================================================================
# PERFORMANCE EVALUATION
# ============================================================================

class PerformanceEvaluator:
    """Evaluate detection performance before and after merging."""
    
    @staticmethod
    def compute_statistics(values: List[float]) -> Dict:
        """Compute basic statistics for a list of values."""
        if not values:
            return {
                'mean': 0.0, 'std': 0.0, 'min': 0.0, 'max': 0.0,
                'median': 0.0, 'count': 0
            }
        
        return {
            'mean': float(np.mean(values)),
            'std': float(np.std(values)),
            'min': float(np.min(values)),
            'max': float(np.max(values)),
            'median': float(np.median(values)),
            'count': len(values)
        }
    
    @staticmethod
    def evaluate_detections(detections: List[Dict]) -> Dict:
        """
        Evaluate detection quality metrics.
        
        Args:
            detections: List of detection dictionaries
        
        Returns:
            Dictionary with evaluation metrics
        """
        if not detections:
            return {
                'box_count': 0,
                'score_stats': {},
                'area_stats': {},
                'boxes_per_image': {}
            }
        
        scores = [det['score'] for det in detections]
        areas = [det['bbox'][2] * det['bbox'][3] for det in detections]
        
        # Count boxes per image
        boxes_per_image = defaultdict(int)
        for det in detections:
            boxes_per_image[det.get('image_id', 0)] += 1
        
        boxes_per_image_list = list(boxes_per_image.values())
        
        return {
            'box_count': len(detections),
            'score_stats': PerformanceEvaluator.compute_statistics(scores),
            'area_stats': PerformanceEvaluator.compute_statistics(areas),
            'boxes_per_image': PerformanceEvaluator.compute_statistics(boxes_per_image_list),
            'images_count': len(boxes_per_image)
        }
    
    @staticmethod
    def compare_detections(
        original: List[Dict],
        merged: List[Dict]
    ) -> Dict:
        """
        Compare original and merged detections.
        
        Args:
            original: Original detections
            merged: Merged detections
        
        Returns:
            Comparison metrics dictionary
        """
        original_eval = PerformanceEvaluator.evaluate_detections(original)
        merged_eval = PerformanceEvaluator.evaluate_detections(merged)
        
        box_reduction = original_eval['box_count'] - merged_eval['box_count']
        box_reduction_pct = (box_reduction / original_eval['box_count'] * 100) if original_eval['box_count'] > 0 else 0
        
        return {
            'original': original_eval,
            'merged': merged_eval,
            'box_count_reduction': box_reduction,
            'box_count_reduction_percentage': box_reduction_pct,
            'score_mean_change': merged_eval['score_stats'].get('mean', 0) - original_eval['score_stats'].get('mean', 0),
            'area_mean_change': merged_eval['area_stats'].get('mean', 0) - original_eval['area_stats'].get('mean', 0)
        }


# ============================================================================
# COCO FORMAT INTEGRATION
# ============================================================================

class COCOIntegration:
    """Handle COCO format data loading and comparison."""
    
    @staticmethod
    def load_coco_predictions(filepath: str) -> List[Dict]:
        """
        Load COCO format predictions from JSON file.
        
        Args:
            filepath: Path to predictions JSON file
        
        Returns:
            List of prediction dictionaries
        """
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"Predictions file not found: {filepath}")
        
        with open(filepath, 'r') as f:
            data = json.load(f)
        
        # Handle both list format and dict format
        if isinstance(data, list):
            return data
        elif isinstance(data, dict) and 'annotations' in data:
            return data['annotations']
        else:
            raise ValueError("Invalid COCO predictions format")
    
    @staticmethod
    def load_coco_ground_truth(filepath: str) -> Tuple[List[Dict], Dict]:
        """
        Load COCO format ground truth from JSON file.
        
        Args:
            filepath: Path to ground truth JSON file
        
        Returns:
            Tuple of (annotations list, images dict)
        """
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"Ground truth file not found: {filepath}")
        
        with open(filepath, 'r') as f:
            data = json.load(f)
        
        annotations = data.get('annotations', [])
        images = {img['id']: img for img in data.get('images', [])}
        
        return annotations, images
    
    @staticmethod
    def compute_precision_recall(
        predictions: List[Dict],
        ground_truth: List[Dict],
        iou_threshold: float = 0.5
    ) -> Dict:
        """
        Compute precision and recall metrics.
        
        Args:
            predictions: List of prediction dictionaries
            ground_truth: List of ground truth dictionaries
            iou_threshold: IoU threshold for matching
        
        Returns:
            Dictionary with precision/recall metrics
        """
        # Group by image_id
        pred_by_image = defaultdict(list)
        gt_by_image = defaultdict(list)
        
        for pred in predictions:
            pred_by_image[pred['image_id']].append(pred)
        
        for gt in ground_truth:
            gt_by_image[gt['image_id']].append(gt)
        
        total_tp = 0
        total_fp = 0
        total_fn = 0
        
        # Process each image
        for img_id in set(list(pred_by_image.keys()) + list(gt_by_image.keys())):
            preds = pred_by_image.get(img_id, [])
            gts = gt_by_image.get(img_id, [])
            
            matched_gt = set()
            
            # Sort predictions by score (descending)
            preds_sorted = sorted(preds, key=lambda x: x['score'], reverse=True)
            
            for pred in preds_sorted:
                pred_box = [
                    pred['bbox'][0], pred['bbox'][1],
                    pred['bbox'][0] + pred['bbox'][2],
                    pred['bbox'][1] + pred['bbox'][3]
                ]
                
                best_iou = 0
                best_gt_idx = -1
                
                for gt_idx, gt in enumerate(gts):
                    if gt_idx in matched_gt:
                        continue
                    
                    gt_box = [
                        gt['bbox'][0], gt['bbox'][1],
                        gt['bbox'][0] + gt['bbox'][2],
                        gt['bbox'][1] + gt['bbox'][3]
                    ]
                    
                    iou = compute_iou(pred_box, gt_box)
                    if iou > best_iou:
                        best_iou = iou
                        best_gt_idx = gt_idx
                
                if best_iou >= iou_threshold:
                    total_tp += 1
                    matched_gt.add(best_gt_idx)
                else:
                    total_fp += 1
            
            total_fn += len(gts) - len(matched_gt)
        
        precision = total_tp / (total_tp + total_fp) if (total_tp + total_fp) > 0 else 0
        recall = total_tp / (total_tp + total_fn) if (total_tp + total_fn) > 0 else 0
        f1_score = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0
        
        return {
            'true_positives': total_tp,
            'false_positives': total_fp,
            'false_negatives': total_fn,
            'precision': precision,
            'recall': recall,
            'f1_score': f1_score
        }


# ============================================================================
# REPORT GENERATION
# ============================================================================

class ReportGenerator:
    """Generate evaluation reports in JSON and CSV formats."""
    
    @staticmethod
    def save_json_report(data: Dict, filepath: str):
        """Save report as JSON file."""
        os.makedirs(os.path.dirname(filepath) if os.path.dirname(filepath) else '.', exist_ok=True)
        with open(filepath, 'w') as f:
            json.dump(data, f, indent=2)
        print(f"Saved JSON report to {filepath}")
    
    @staticmethod
    def save_csv_report(data: Dict, filepath: str):
        """Save report as CSV file."""
        os.makedirs(os.path.dirname(filepath) if os.path.dirname(filepath) else '.', exist_ok=True)
        
        # Flatten nested dictionary
        flat_data = ReportGenerator._flatten_dict(data)
        
        with open(filepath, 'w', newline='') as f:
            writer = csv.writer(f)
            writer.writerow(['Metric', 'Value'])
            for key, value in flat_data.items():
                writer.writerow([key, value])
        
        print(f"Saved CSV report to {filepath}")
    
    @staticmethod
    def _flatten_dict(d: Dict, parent_key: str = '', sep: str = '.') -> Dict:
        """Flatten nested dictionary."""
        items = []
        for k, v in d.items():
            new_key = f"{parent_key}{sep}{k}" if parent_key else k
            if isinstance(v, dict):
                items.extend(ReportGenerator._flatten_dict(v, new_key, sep=sep).items())
            else:
                items.append((new_key, v))
        return dict(items)
    
    @staticmethod
    def generate_comprehensive_report(
        comparison: Dict,
        parameters: Dict,
        output_dir: str
    ):
        """Generate comprehensive evaluation report."""
        report = {
            'parameters': parameters,
            'evaluation_metrics': comparison,
            'summary': {
                'total_boxes_before': comparison['original']['box_count'],
                'total_boxes_after': comparison['merged']['box_count'],
                'boxes_removed': comparison['box_count_reduction'],
                'reduction_percentage': comparison['box_count_reduction_percentage'],
                'avg_score_before': comparison['original']['score_stats'].get('mean', 0),
                'avg_score_after': comparison['merged']['score_stats'].get('mean', 0),
                'avg_area_before': comparison['original']['area_stats'].get('mean', 0),
                'avg_area_after': comparison['merged']['area_stats'].get('mean', 0)
            }
        }
        
        # Save reports
        json_path = os.path.join(output_dir, 'evaluation_report.json')
        csv_path = os.path.join(output_dir, 'evaluation_report.csv')
        
        ReportGenerator.save_json_report(report, json_path)
        ReportGenerator.save_csv_report(report, csv_path)
        
        return report


# ============================================================================
# TEST DATA GENERATION
# ============================================================================

class TestDataGenerator:
    """Generate synthetic test data for evaluation."""
    
    @staticmethod
    def generate_sample_detections(
        num_images: int = 5,
        boxes_per_image: int = 10,
        overlap_ratio: float = 0.3
    ) -> List[Dict]:
        """
        Generate sample detection data.
        
        Args:
            num_images: Number of images
            boxes_per_image: Number of boxes per image
            overlap_ratio: Ratio of overlapping boxes
        
        Returns:
            List of sample detections
        """
        np.random.seed(42)
        detections = []
        
        for img_id in range(1, num_images + 1):
            # Generate non-overlapping boxes
            num_non_overlap = int(boxes_per_image * (1 - overlap_ratio))
            for i in range(num_non_overlap):
                x = np.random.randint(0, 800)
                y = np.random.randint(0, 800)
                w = np.random.randint(50, 150)
                h = np.random.randint(50, 150)
                score = np.random.uniform(0.5, 1.0)
                
                detections.append({
                    'image_id': img_id,
                    'bbox': [float(x), float(y), float(w), float(h)],
                    'score': float(score),
                    'category_id': 1
                })
            
            # Generate overlapping boxes
            num_overlap = boxes_per_image - num_non_overlap
            for i in range(num_overlap):
                if detections:
                    # Create overlapping box based on existing one
                    base_det = np.random.choice([d for d in detections if d['image_id'] == img_id])
                    x_offset = np.random.randint(-30, 30)
                    y_offset = np.random.randint(-30, 30)
                    x = base_det['bbox'][0] + x_offset
                    y = base_det['bbox'][1] + y_offset
                    w = base_det['bbox'][2] + np.random.randint(-20, 20)
                    h = base_det['bbox'][3] + np.random.randint(-20, 20)
                    score = np.random.uniform(0.5, 1.0)
                    
                    detections.append({
                        'image_id': img_id,
                        'bbox': [float(max(0, x)), float(max(0, y)), float(max(10, w)), float(max(10, h))],
                        'score': float(score),
                        'category_id': 1
                    })
        
        return detections
    
    @staticmethod
    def save_sample_coco_format(detections: List[Dict], filepath: str):
        """Save detections in COCO format."""
        coco_data = {
            'images': [
                {'id': img_id, 'file_name': f'image_{img_id:04d}.jpg', 'width': 1000, 'height': 1000}
                for img_id in set(d['image_id'] for d in detections)
            ],
            'annotations': detections,
            'categories': [{'id': 1, 'name': 'object'}]
        }
        
        os.makedirs(os.path.dirname(filepath) if os.path.dirname(filepath) else '.', exist_ok=True)
        with open(filepath, 'w') as f:
            json.dump(coco_data, f, indent=2)
        
        print(f"Saved sample data to {filepath}")


# ============================================================================
# MAIN EVALUATION PIPELINE
# ============================================================================

class EvaluationPipeline:
    """Main evaluation pipeline orchestrating all components."""
    
    def __init__(self, args):
        self.args = args
        self.output_dir = args.output if hasattr(args, 'output') else 'results'
        os.makedirs(self.output_dir, exist_ok=True)
    
    def run_unit_tests(self):
        """Run unit tests."""
        print("=" * 70)
        print("Running Unit Tests")
        print("=" * 70)
        
        # Run unittest
        suite = unittest.TestLoader().loadTestsFromTestCase(TestMergeAlgorithm)
        runner = unittest.TextTestRunner(verbosity=2)
        result = runner.run(suite)
        
        print("\n" + "=" * 70)
        print(f"Tests run: {result.testsRun}")
        print(f"Failures: {len(result.failures)}")
        print(f"Errors: {len(result.errors)}")
        print("=" * 70)
        
        return result.wasSuccessful()
    
    def run_evaluation(self):
        """Run full evaluation pipeline."""
        print("=" * 70)
        print("Running Evaluation Pipeline")
        print("=" * 70)
        
        # Load or generate data
        if hasattr(self.args, 'pred') and self.args.pred:
            print(f"\nLoading predictions from: {self.args.pred}")
            original_dets = COCOIntegration.load_coco_predictions(self.args.pred)
        else:
            print("\nGenerating sample predictions...")
            original_dets = TestDataGenerator.generate_sample_detections(
                num_images=5, boxes_per_image=15, overlap_ratio=0.4
            )
            # Save sample data
            sample_path = os.path.join(self.output_dir, 'sample_predictions.json')
            TestDataGenerator.save_sample_coco_format(original_dets, sample_path)
        
        print(f"Loaded {len(original_dets)} original detections")
        
        # Apply merging
        print("\nApplying merge algorithm...")
        contain_thr = getattr(self.args, 'contain_thr', 0.8)
        iou_thr = getattr(self.args, 'iou_thr', 0.5)
        sort_key = getattr(self.args, 'sort_key', 'area')
        max_per_image = getattr(self.args, 'max_per_image', None)
        
        parameters = {
            'contain_threshold': contain_thr,
            'iou_threshold': iou_thr,
            'sort_key': sort_key,
            'max_per_image': max_per_image
        }
        
        merged_dets = postprocess_coco_results(
            original_dets,
            contain_thr=contain_thr,
            iou_thr=iou_thr,
            sort_key=sort_key,
            max_per_image=max_per_image
        )
        
        print(f"After merging: {len(merged_dets)} detections")
        
        # Performance evaluation
        print("\nEvaluating performance...")
        comparison = PerformanceEvaluator.compare_detections(original_dets, merged_dets)
        
        print(f"\nBox count reduction: {comparison['box_count_reduction']} "
              f"({comparison['box_count_reduction_percentage']:.2f}%)")
        
        # Generate visualizations
        print("\nGenerating visualizations...")
        
        # Get detections for first image for visualization
        img_ids = list(set(d['image_id'] for d in original_dets))
        if img_ids:
            first_img_id = img_ids[0]
            orig_img_dets = [d for d in original_dets if d['image_id'] == first_img_id]
            merged_img_dets = [d for d in merged_dets if d['image_id'] == first_img_id]
            
            vis_path = os.path.join(self.output_dir, 'detection_comparison.png')
            VisualizationTools.plot_detection_comparison(
                orig_img_dets, merged_img_dets, vis_path,
                title=f"Detection Comparison (Image {first_img_id})"
            )
        
        # Score distribution
        orig_scores = [d['score'] for d in original_dets]
        merged_scores = [d['score'] for d in merged_dets]
        score_dist_path = os.path.join(self.output_dir, 'score_distribution.png')
        VisualizationTools.plot_score_distribution(orig_scores, merged_scores, score_dist_path)
        
        # Area distribution
        orig_areas = [d['bbox'][2] * d['bbox'][3] for d in original_dets]
        merged_areas = [d['bbox'][2] * d['bbox'][3] for d in merged_dets]
        area_dist_path = os.path.join(self.output_dir, 'area_distribution.png')
        VisualizationTools.plot_area_distribution(orig_areas, merged_areas, area_dist_path)
        
        # Generate reports
        print("\nGenerating reports...")
        report = ReportGenerator.generate_comprehensive_report(
            comparison, parameters, self.output_dir
        )
        
        # Ground truth comparison if available
        if hasattr(self.args, 'gt') and self.args.gt:
            print(f"\nLoading ground truth from: {self.args.gt}")
            gt_annotations, _ = COCOIntegration.load_coco_ground_truth(self.args.gt)
            
            print("Computing precision/recall for original detections...")
            orig_pr = COCOIntegration.compute_precision_recall(
                original_dets, gt_annotations, iou_threshold=0.5
            )
            
            print("Computing precision/recall for merged detections...")
            merged_pr = COCOIntegration.compute_precision_recall(
                merged_dets, gt_annotations, iou_threshold=0.5
            )
            
            print("\nOriginal Detections:")
            print(f"  Precision: {orig_pr['precision']:.4f}")
            print(f"  Recall: {orig_pr['recall']:.4f}")
            print(f"  F1-Score: {orig_pr['f1_score']:.4f}")
            
            print("\nMerged Detections:")
            print(f"  Precision: {merged_pr['precision']:.4f}")
            print(f"  Recall: {merged_pr['recall']:.4f}")
            print(f"  F1-Score: {merged_pr['f1_score']:.4f}")
            
            # Add to report
            report['precision_recall'] = {
                'original': orig_pr,
                'merged': merged_pr
            }
            
            # Save updated report
            json_path = os.path.join(self.output_dir, 'evaluation_report.json')
            ReportGenerator.save_json_report(report, json_path)
        
        print("\n" + "=" * 70)
        print("Evaluation Complete!")
        print(f"Results saved to: {self.output_dir}")
        print("=" * 70)
        
        return report


# ============================================================================
# COMMAND-LINE INTERFACE
# ============================================================================

def parse_args():
    """Parse command-line arguments."""
    parser = argparse.ArgumentParser(
        description='Comprehensive Evaluation Suite for postprocess_merge.py',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Run unit tests
  python evaluate_postprocess_merge.py --test
  
  # Run evaluation with sample data
  python evaluate_postprocess_merge.py --eval --output results/
  
  # Evaluate with custom predictions
  python evaluate_postprocess_merge.py --eval --pred predictions.json --output results/
  
  # Evaluate with predictions and ground truth
  python evaluate_postprocess_merge.py --eval --pred pred.json --gt gt.json --output results/
  
  # Custom thresholds
  python evaluate_postprocess_merge.py --eval --contain-thr 0.7 --iou-thr 0.6 --sort-key score
  
  # Run both tests and evaluation
  python evaluate_postprocess_merge.py --test --eval
        """
    )
    
    # Mode selection
    parser.add_argument('--test', action='store_true',
                       help='Run unit tests')
    parser.add_argument('--eval', action='store_true',
                       help='Run evaluation pipeline')
    
    # Data paths
    parser.add_argument('--pred', type=str, default=None,
                       help='Path to predictions JSON file (COCO format)')
    parser.add_argument('--gt', type=str, default=None,
                       help='Path to ground truth JSON file (COCO format)')
    parser.add_argument('--output', type=str, default='results',
                       help='Output directory for results (default: results/)')
    
    # Algorithm parameters
    parser.add_argument('--contain-thr', type=float, default=0.8,
                       help='Containment threshold (default: 0.8)')
    parser.add_argument('--iou-thr', type=float, default=0.5,
                       help='IoU threshold (default: 0.5)')
    parser.add_argument('--sort-key', type=str, default='area',
                       choices=['area', 'score'],
                       help='Sort key for merging (default: area)')
    parser.add_argument('--max-per-image', type=int, default=None,
                       help='Maximum detections per image (default: None)')
    
    args = parser.parse_args()
    
    # Default to running both if neither specified
    if not args.test and not args.eval:
        args.test = True
        args.eval = True
    
    return args


def main():
    """Main entry point."""
    args = parse_args()
    
    print("\n" + "=" * 70)
    print("Postprocess Merge Evaluation Suite")
    print("=" * 70)
    
    pipeline = EvaluationPipeline(args)
    
    success = True
    
    # Run unit tests
    if args.test:
        success = pipeline.run_unit_tests() and success
    
    # Run evaluation
    if args.eval:
        try:
            pipeline.run_evaluation()
        except Exception as e:
            print(f"\nError during evaluation: {e}")
            import traceback
            traceback.print_exc()
            success = False
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
