# Quick Start Guide - Postprocess Merge Evaluation Suite

## Installation
```bash
pip install numpy matplotlib
```

## Quick Commands

### Run Unit Tests
```bash
python evaluate_postprocess_merge.py --test
```

### Run Evaluation with Sample Data
```bash
python evaluate_postprocess_merge.py --eval
```

### Evaluate Your Own Predictions
```bash
python evaluate_postprocess_merge.py --eval --pred your_predictions.json --output results/
```

### Compare with Ground Truth
```bash
python evaluate_postprocess_merge.py --eval --pred pred.json --gt ground_truth.json
```

### Custom Parameters
```bash
python evaluate_postprocess_merge.py --eval \
    --contain-thr 0.7 \
    --iou-thr 0.6 \
    --sort-key score \
    --max-per-image 10
```

### Run Examples
```bash
python example_usage.py
```

## Files Overview

| File | Purpose |
|------|---------|
| `postprocess_merge.py` | Core merge algorithm |
| `evaluate_postprocess_merge.py` | Complete evaluation suite |
| `example_usage.py` | Usage demonstrations |
| `EVALUATION_SUITE_README.md` | Full documentation |

## Key Parameters

- `--contain-thr`: Containment threshold (default: 0.8)
- `--iou-thr`: IoU threshold (default: 0.5)
- `--sort-key`: Sort by 'area' or 'score' (default: area)
- `--max-per-image`: Max detections per image (default: None)

## Output Files

- `evaluation_report.json` - Complete metrics
- `evaluation_report.csv` - Spreadsheet-friendly format
- `detection_comparison.png` - Visual comparison
- `score_distribution.png` - Score histograms
- `area_distribution.png` - Area histograms

## Need More Help?

See `EVALUATION_SUITE_README.md` for complete documentation.
