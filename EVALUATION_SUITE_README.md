# Postprocess Merge Evaluation Suite

A comprehensive evaluation toolkit for the `postprocess_merge.py` algorithm that merges overlapping bounding boxes in object detection results.

## Overview

This evaluation suite provides complete functionality for:
- **Unit Testing**: Verify merge algorithm correctness
- **Performance Evaluation**: Compare detection metrics before/after merging
- **Visualization**: Display detections with matplotlib plots
- **Statistical Analysis**: Generate detailed JSON/CSV reports
- **COCO Integration**: Load and compare predictions with ground truth

## Components

### 1. `postprocess_merge.py`
The core merge algorithm that processes object detection results by:
- Computing IoU (Intersection over Union) between boxes
- Computing containment ratios
- Merging overlapping detections based on thresholds
- Supporting COCO format input/output

### 2. `evaluate_postprocess_merge.py`
The comprehensive evaluation suite with:
- Unit tests for algorithm correctness
- Performance metrics computation
- Visualization generation
- Report generation in JSON/CSV formats
- Ground truth comparison

## Installation

### Requirements
```bash
pip install numpy matplotlib
```

### Files
Place both files in the same directory:
- `postprocess_merge.py` - Core algorithm
- `evaluate_postprocess_merge.py` - Evaluation suite

## Usage

### 1. Run Unit Tests
Verify the merge algorithm works correctly:
```bash
python evaluate_postprocess_merge.py --test
```

**Output**: Test results showing pass/fail status for 8 unit tests covering:
- IoU computation
- Containment computation
- Box area calculation
- Merge logic with different parameters
- COCO format processing

### 2. Run Evaluation with Sample Data
Evaluate the algorithm with automatically generated test data:
```bash
python evaluate_postprocess_merge.py --eval --output results/
```

**Generates**:
- Sample predictions in COCO format
- Merged detections
- Performance comparison reports
- Visualization plots

### 3. Evaluate Custom Predictions
Use your own prediction files:
```bash
python evaluate_postprocess_merge.py --eval \
    --pred predictions.json \
    --output results/
```

### 4. Compare with Ground Truth
Evaluate predictions against ground truth annotations:
```bash
python evaluate_postprocess_merge.py --eval \
    --pred predictions.json \
    --gt ground_truth.json \
    --output results/
```

**Additional Metrics**:
- Precision, Recall, F1-score
- True/False positives/negatives
- Before and after merge comparison

### 5. Custom Parameters
Adjust merge thresholds and behavior:
```bash
python evaluate_postprocess_merge.py --eval \
    --pred predictions.json \
    --contain-thr 0.7 \
    --iou-thr 0.6 \
    --sort-key score \
    --max-per-image 10 \
    --output results/
```

**Parameters**:
- `--contain-thr`: Containment threshold (default: 0.8)
- `--iou-thr`: IoU threshold (default: 0.5)
- `--sort-key`: Sort by 'area' or 'score' (default: area)
- `--max-per-image`: Max detections per image (default: None)

### 6. Run Everything
Run both tests and evaluation:
```bash
python evaluate_postprocess_merge.py --test --eval --output results/
```

## Command-Line Options

```
usage: evaluate_postprocess_merge.py [-h] [--test] [--eval] [--pred PRED] 
                                     [--gt GT] [--output OUTPUT]
                                     [--contain-thr CONTAIN_THR] 
                                     [--iou-thr IOU_THR] 
                                     [--sort-key {area,score}]
                                     [--max-per-image MAX_PER_IMAGE]

options:
  --test                Run unit tests
  --eval                Run evaluation pipeline
  --pred PRED           Path to predictions JSON (COCO format)
  --gt GT               Path to ground truth JSON (COCO format)
  --output OUTPUT       Output directory (default: results/)
  --contain-thr         Containment threshold (default: 0.8)
  --iou-thr             IoU threshold (default: 0.5)
  --sort-key            Sort by 'area' or 'score' (default: area)
  --max-per-image       Max detections per image (default: None)
```

## Output Files

### Generated Files
When running evaluation, the following files are created in the output directory:

1. **evaluation_report.json**
   - Complete evaluation metrics
   - Before/after statistics
   - Parameters used

2. **evaluation_report.csv**
   - Flattened metrics in CSV format
   - Easy to import into spreadsheets

3. **detection_comparison.png**
   - Side-by-side visualization
   - Original vs merged detections
   - Shows first image with bounding boxes

4. **score_distribution.png**
   - Histogram of detection scores
   - Before and after merging

5. **area_distribution.png**
   - Histogram of box areas
   - Before and after merging

6. **sample_predictions.json** (if no --pred provided)
   - Auto-generated test data
   - COCO format with multiple images

### Report Structure

**JSON Report**:
```json
{
  "parameters": {
    "contain_threshold": 0.8,
    "iou_threshold": 0.5,
    "sort_key": "area",
    "max_per_image": null
  },
  "evaluation_metrics": {
    "original": {
      "box_count": 75,
      "score_stats": { "mean": 0.766, "std": 0.148, ... },
      "area_stats": { "mean": 9785, "std": 4209, ... },
      "boxes_per_image": { "mean": 15, ... }
    },
    "merged": {
      "box_count": 55,
      "score_stats": { ... },
      "area_stats": { ... },
      "boxes_per_image": { ... }
    },
    "box_count_reduction": 20,
    "box_count_reduction_percentage": 26.67
  },
  "summary": {
    "total_boxes_before": 75,
    "total_boxes_after": 55,
    "boxes_removed": 20,
    "reduction_percentage": 26.67
  }
}
```

## COCO Format

### Predictions Format
```json
[
  {
    "image_id": 1,
    "bbox": [x, y, width, height],
    "score": 0.95,
    "category_id": 1
  },
  ...
]
```

### Ground Truth Format
```json
{
  "images": [
    {"id": 1, "file_name": "img1.jpg", "width": 1000, "height": 1000}
  ],
  "annotations": [
    {
      "image_id": 1,
      "bbox": [x, y, width, height],
      "category_id": 1
    }
  ],
  "categories": [
    {"id": 1, "name": "object"}
  ]
}
```

## Algorithm Details

### Merge Strategy
1. **Grouping**: Detections are grouped by image_id
2. **Sorting**: Boxes sorted by area or score (descending)
3. **Comparison**: For each pair of boxes:
   - Calculate containment ratio
   - Calculate IoU
   - If either exceeds threshold, merge (keep larger/higher-score box)
4. **Limiting**: Apply max_per_image limit if specified

### Metrics Computed

**Per-Detection Metrics**:
- Score statistics (mean, std, min, max, median)
- Area statistics (mean, std, min, max, median)
- Boxes per image statistics

**Comparison Metrics**:
- Box count reduction (absolute and percentage)
- Score distribution changes
- Area distribution changes

**Ground Truth Metrics** (if GT provided):
- Precision, Recall, F1-score
- True/False positives/negatives

## Examples

### Example 1: Quick Test
```bash
# Run all tests
python evaluate_postprocess_merge.py --test
```

### Example 2: Evaluate Sample Data
```bash
# Generate and evaluate sample data
python evaluate_postprocess_merge.py --eval --output my_results/
```

### Example 3: Production Evaluation
```bash
# Evaluate real predictions with ground truth
python evaluate_postprocess_merge.py --eval \
    --pred model_predictions.json \
    --gt coco_annotations.json \
    --contain-thr 0.75 \
    --iou-thr 0.55 \
    --output production_eval/
```

### Example 4: Score-Based Merging
```bash
# Use score instead of area for sorting
python evaluate_postprocess_merge.py --eval \
    --pred predictions.json \
    --sort-key score \
    --max-per-image 20 \
    --output score_based_results/
```

## Unit Test Coverage

The suite includes 8 comprehensive unit tests:

1. **test_compute_iou**: Validates IoU calculation
2. **test_compute_containment**: Validates containment ratio
3. **test_box_area**: Validates area calculation
4. **test_merge_detections_basic**: Tests basic merge functionality
5. **test_merge_detections_no_overlap**: Ensures non-overlapping boxes preserved
6. **test_merge_detections_sort_by_area**: Tests area-based sorting
7. **test_merge_detections_max_per_image**: Tests detection limiting
8. **test_postprocess_coco_results**: Tests multi-image processing

## Visualization Examples

The suite generates three types of plots:

1. **Detection Comparison**: Side-by-side view of boxes before/after merging
2. **Score Distribution**: Histograms showing score changes
3. **Area Distribution**: Histograms showing area changes

All plots are saved as high-resolution PNG files (150 DPI).

## Performance Considerations

- **Memory**: Scales linearly with number of detections
- **Speed**: O(n²) per image for pairwise comparisons
- **Typical Runtime**: 
  - 100 detections: <1 second
  - 1000 detections: ~5 seconds
  - 10000 detections: ~1 minute

## Troubleshooting

### Import Error
```
ModuleNotFoundError: No module named 'numpy'
```
**Solution**: Install dependencies
```bash
pip install numpy matplotlib
```

### File Not Found
```
FileNotFoundError: Predictions file not found
```
**Solution**: Check file path and ensure COCO format JSON exists

### Invalid COCO Format
```
ValueError: Invalid COCO predictions format
```
**Solution**: Ensure JSON has correct structure (list or dict with 'annotations' key)

## Contributing

To extend the evaluation suite:

1. Add new test cases to `TestMergeAlgorithm` class
2. Implement additional metrics in `PerformanceEvaluator`
3. Add new visualizations in `VisualizationTools`
4. Extend report formats in `ReportGenerator`

## License

This evaluation suite is provided as-is for evaluating object detection merge algorithms.

## Support

For issues or questions:
1. Check this README for usage examples
2. Review unit tests for expected behavior
3. Examine generated reports for detailed metrics
