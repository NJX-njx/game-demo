#!/usr/bin/env python3
"""
Example Usage Demonstration for Postprocess Merge Evaluation Suite

This script demonstrates various ways to use the evaluation suite.
"""

import json
import os
import sys

# Add current directory to path
sys.path.insert(0, os.path.dirname(__file__))

from postprocess_merge import postprocess_coco_results
from evaluate_postprocess_merge import TestDataGenerator


def example_1_basic_usage():
    """Example 1: Basic usage with generated data."""
    print("=" * 70)
    print("Example 1: Basic Usage - Generate and Merge Detections")
    print("=" * 70)
    
    # Generate sample detections
    print("\n1. Generating sample detections...")
    detections = TestDataGenerator.generate_sample_detections(
        num_images=3,
        boxes_per_image=10,
        overlap_ratio=0.3
    )
    print(f"   Generated {len(detections)} detections across 3 images")
    
    # Apply merging
    print("\n2. Applying merge algorithm with default parameters...")
    merged = postprocess_coco_results(
        detections,
        contain_thr=0.8,
        iou_thr=0.5,
        sort_key='area'
    )
    print(f"   After merging: {len(merged)} detections")
    print(f"   Reduction: {len(detections) - len(merged)} boxes ({(len(detections) - len(merged)) / len(detections) * 100:.1f}%)")
    
    # Show stats per image
    print("\n3. Detections per image:")
    for img_id in sorted(set(d['image_id'] for d in detections)):
        orig_count = sum(1 for d in detections if d['image_id'] == img_id)
        merged_count = sum(1 for d in merged if d['image_id'] == img_id)
        print(f"   Image {img_id}: {orig_count} → {merged_count} boxes")
    
    return detections, merged


def example_2_custom_parameters():
    """Example 2: Using custom merge parameters."""
    print("\n" + "=" * 70)
    print("Example 2: Custom Parameters - Aggressive Merging")
    print("=" * 70)
    
    # Generate sample detections
    detections = TestDataGenerator.generate_sample_detections(
        num_images=2,
        boxes_per_image=15,
        overlap_ratio=0.5
    )
    print(f"\nGenerated {len(detections)} detections")
    
    # Try different parameter combinations
    configs = [
        {"contain_thr": 0.8, "iou_thr": 0.5, "name": "Conservative"},
        {"contain_thr": 0.6, "iou_thr": 0.4, "name": "Moderate"},
        {"contain_thr": 0.5, "iou_thr": 0.3, "name": "Aggressive"},
    ]
    
    print("\nComparing different merge strategies:")
    for config in configs:
        merged = postprocess_coco_results(
            detections,
            contain_thr=config['contain_thr'],
            iou_thr=config['iou_thr']
        )
        reduction_pct = (len(detections) - len(merged)) / len(detections) * 100
        print(f"   {config['name']:12s} (contain={config['contain_thr']}, iou={config['iou_thr']}): "
              f"{len(merged):2d} boxes ({reduction_pct:5.1f}% reduction)")


def example_3_score_vs_area_sorting():
    """Example 3: Comparing score-based vs area-based sorting."""
    print("\n" + "=" * 70)
    print("Example 3: Sort Strategy Comparison")
    print("=" * 70)
    
    # Generate detections
    detections = TestDataGenerator.generate_sample_detections(
        num_images=2,
        boxes_per_image=12,
        overlap_ratio=0.4
    )
    print(f"\nGenerated {len(detections)} detections")
    
    # Compare sorting strategies
    print("\nComparing sort strategies:")
    
    # Sort by area
    merged_area = postprocess_coco_results(
        detections,
        sort_key='area',
        contain_thr=0.7,
        iou_thr=0.4
    )
    avg_score_area = sum(d['score'] for d in merged_area) / len(merged_area)
    avg_area_area = sum(d['bbox'][2] * d['bbox'][3] for d in merged_area) / len(merged_area)
    
    # Sort by score
    merged_score = postprocess_coco_results(
        detections,
        sort_key='score',
        contain_thr=0.7,
        iou_thr=0.4
    )
    avg_score_score = sum(d['score'] for d in merged_score) / len(merged_score)
    avg_area_score = sum(d['bbox'][2] * d['bbox'][3] for d in merged_score) / len(merged_score)
    
    print(f"\n   Sort by Area:")
    print(f"      Boxes kept: {len(merged_area)}")
    print(f"      Avg score: {avg_score_area:.3f}")
    print(f"      Avg area: {avg_area_area:.1f}")
    
    print(f"\n   Sort by Score:")
    print(f"      Boxes kept: {len(merged_score)}")
    print(f"      Avg score: {avg_score_score:.3f}")
    print(f"      Avg area: {avg_area_score:.1f}")


def example_4_max_per_image():
    """Example 4: Using max_per_image limit."""
    print("\n" + "=" * 70)
    print("Example 4: Max Detections Per Image")
    print("=" * 70)
    
    # Generate detections with varying counts per image
    detections = TestDataGenerator.generate_sample_detections(
        num_images=4,
        boxes_per_image=20,
        overlap_ratio=0.3
    )
    print(f"\nGenerated {len(detections)} detections across 4 images")
    
    # Apply different max_per_image limits
    limits = [None, 15, 10, 5]
    
    print("\nApplying different max_per_image limits:")
    for limit in limits:
        merged = postprocess_coco_results(
            detections,
            contain_thr=0.8,
            iou_thr=0.5,
            max_per_image=limit
        )
        limit_str = "None" if limit is None else str(limit)
        print(f"   max_per_image={limit_str:4s}: {len(merged)} total boxes")


def example_5_save_and_load():
    """Example 5: Saving and loading COCO format data."""
    print("\n" + "=" * 70)
    print("Example 5: Save and Load COCO Format")
    print("=" * 70)
    
    # Generate detections
    detections = TestDataGenerator.generate_sample_detections(
        num_images=3,
        boxes_per_image=10,
        overlap_ratio=0.3
    )
    
    # Save original detections
    output_dir = "/tmp/eval_examples"
    os.makedirs(output_dir, exist_ok=True)
    
    original_path = os.path.join(output_dir, "original_detections.json")
    print(f"\n1. Saving original detections to {original_path}")
    TestDataGenerator.save_sample_coco_format(detections, original_path)
    
    # Merge detections
    merged = postprocess_coco_results(
        detections,
        contain_thr=0.8,
        iou_thr=0.5
    )
    
    # Save merged detections
    merged_path = os.path.join(output_dir, "merged_detections.json")
    print(f"2. Saving merged detections to {merged_path}")
    with open(merged_path, 'w') as f:
        json.dump(merged, f, indent=2)
    
    # Load and verify
    print(f"3. Loading and verifying saved files...")
    with open(original_path, 'r') as f:
        loaded_original = json.load(f)
    with open(merged_path, 'r') as f:
        loaded_merged = json.load(f)
    
    print(f"   Original: {len(loaded_original['annotations'])} detections")
    print(f"   Merged: {len(loaded_merged)} detections")
    print(f"   Files saved successfully!")


def run_all_examples():
    """Run all example demonstrations."""
    print("\n")
    print("*" * 70)
    print("*" + " " * 68 + "*")
    print("*" + " " * 12 + "Postprocess Merge - Usage Examples" + " " * 22 + "*")
    print("*" + " " * 68 + "*")
    print("*" * 70)
    
    try:
        example_1_basic_usage()
        example_2_custom_parameters()
        example_3_score_vs_area_sorting()
        example_4_max_per_image()
        example_5_save_and_load()
        
        print("\n" + "=" * 70)
        print("All examples completed successfully!")
        print("=" * 70)
        
        print("\nNext steps:")
        print("  1. Run unit tests: python evaluate_postprocess_merge.py --test")
        print("  2. Run full evaluation: python evaluate_postprocess_merge.py --eval")
        print("  3. Check the README: EVALUATION_SUITE_README.md")
        print("=" * 70 + "\n")
        
    except Exception as e:
        print(f"\n\nError running examples: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    return True


if __name__ == '__main__':
    success = run_all_examples()
    sys.exit(0 if success else 1)
