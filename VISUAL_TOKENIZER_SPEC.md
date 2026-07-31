# Stage 1: Visual Tokenizer Specification

## Overview

The Visual Tokenizer stage transforms static visual references into semantic tokens that serve as the foundation for downstream shader generation and component assembly. This stage consumes raster images and produces structured semantic data encoding visual elements, color relationships, and compositional features.

## 1. Input Format Requirements

### Supported Image Formats
| Format | MIME Type | Support Level |
|--------|-----------|---------------|
| PNG | image/png | Primary |
| JPEG | image/jpeg | Primary |
| WebP | image/webp | Secondary |
| TIFF | image/tiff | Secondary |
| SVG | image/svg+xml | Vector (rasterized) |

### Dimension Constraints
- **Minimum**: 64×64 pixels
- **Maximum**: 4096×4096 pixels
- **Optimal**: 512×512 to 1024×1024 pixels (balance precision vs. performance)
- **Aspect Ratios**: Supports any ratio; square formats recommended for consistent analysis

### Color Profile Support
| Profile | Description | Processing |
|---------|-------------|------------|
| sRGB | Standard RGB | Native support |
| Adobe RGB | Extended gamut | Converted to sRGB |
| P3 | DCI-P3 wide gamut | Converted to sRGB |
| Linear | Linear color space | Recognized, linearized |
| Grayscale | 8-bit grayscale | Expanded to RGB triplet |

### Input Metadata Requirements
```json
{
  "original_format": "string",
  "dimensions": { "width": "integer", "height": "integer" },
  "color_space": "enum[sRGB|AdobeRGB|P3|Linear|Grayscale|Unknown]",
  "dpi": "integer",
  "source": "string"
}
```

## 2. Semantic Extraction Algorithms

### 2.1 Edge Detection Pipeline

**Primary Algorithm: Canny Edge Detection**
- Gaussian blur kernel: σ = 1.0
- Sobel gradient magnitude threshold: 0.05–0.15 (auto-adjusted)
- Hysteresis thresholds: low=0.05, high=0.15
- Output: Binary edge map with sub-pixel accuracy

**Edge Classification**
```
EDGE_STRONG (1.0): High-confidence edges (gradient > 0.15)
EDGE_MEDIUM (0.6): Moderate edges (gradient 0.10–0.15)
EDGE_WEAK (0.2): Low-confidence edges (gradient 0.05–0.10)
EDGE_NONE (0.0): No edge detected
```

### 2.2 Color Palette Analysis

**Quantization Algorithm: Modified Median Cut**
- Maximum colors: 64 (configurable, default: 16)
- Color space: LAB for perceptual uniformity
- Palette refinement iterations: 3

**Color Token Attributes**
| Attribute | Description | Range |
|-----------|-------------|-------|
| dominance | Relative area coverage | 0.0–1.0 |
| saturation | Color intensity | 0.0–1.0 |
| luminance | Perceived brightness | 0.0–1.0 |
| temperature | Warm/cold bias | -1.0 (cold) to 1.0 (warm) |

### 2.3 Shape Recognition

**Contour Detection: Moore-Neighbor Tracing**
- Minimum contour area: 64 pixels
- Convexity defects analyzed for shape classification
- Polygon approximation: Douglas-Peucker with ε = 3px

**Shape Categories**
| Category | Characteristics | Token Identifier |
|----------|----------------|------------------|
| Geometric | Triangles, rectangles, circles, polygons | `geom_<n>sides` |
| Organic | Freeform, blob-like | `organic` |
| Linear | Lines, curves | `linear` |
| Composite | Group of shapes | `composite_N` |

### 2.4 Spatial Composition Analysis

**Rule of Thirds Scoring**
- Grid: 3×3 division
- Weight calculation: Element center proximity to lines/intersections

**Symmetry Detection**
- Axes: Vertical, horizontal, diagonal (22.5° increments)
- Similarity metric: SSIM > 0.85
- Symmetry score: 0.0 (asymmetric) to 1.0 (perfect symmetry)

## 3. Token Schema Definition

### 3.1 JSON Token Structure

```json
{
  "schema_version": "1.0",
  "source": {
    "filename": "string",
    "checksum": "sha256",
    "dimensions": { "width": "integer", "height": "integer" }
  },
  "metadata": {
    "analysis_timestamp": "ISO8601",
    "processing_duration_ms": "integer"
  },
  "semantic_tokens": [
    {
      "token_id": "string (UUID)",
      "type": "enum[shape|color|edge|region|composition]",
      "confidence": "float (0.0-1.0)",
      "bounding_box": {
        "x": "integer",
        "y": "integer", 
        "width": "integer",
        "height": "integer"
      },
      "properties": {
        "primary": {},
        "secondary": {}
      },
      "relationships": [
        {
          "target_token_id": "string",
          "relationship_type": "enum[adjacent|contains|overlaps|aligned]",
          "strength": "float (0.0-1.0)"
        }
      ]
    }
  ],
  "global_properties": {
    "palette": [
      {
        "color": "hex|string",
        "lab": {"l": "0-100", "a": "-128-127", "b": "-128-127"},
        "frequency": "float (0.0-1.0)"
      }
    ],
    "composition": {
      "symmetry_score": "float",
      "balance_score": "float",
      "complexity_score": "float"
    }
  }
}
```

### 3.2 Token Types

#### Shape Tokens
```json
{
  "type": "shape",
  "properties": {
    "primary": {
      "category": "enum[geom_3, geom_4, geom_5, geom_n, organic, linear]",
      "vertices": [{"x": "integer", "y": "integer"}],
      "area": "integer",
      "perimeter": "float"
    },
    "secondary": {
      "convexity": "float (0.0-1.0)",
      "aspect_ratio": "float",
      "orientation": "float (degrees -180 to 180)"
    }
  }
}
```

#### Color Tokens
```json
{
  "type": "color",
  "properties": {
    "primary": {
      "value": "hex|string",
      "lab": {"l": "float", "a": "float", "b": "float"},
      "source_region": {
        "x": "integer", "y": "integer",
        "width": "integer", "height": "integer"
      }
    },
    "secondary": {
      "saturation": "float",
      "luminance": "float",
      "temperature": "float"
    }
  }
}
```

#### Edge Tokens
```json
{
  "type": "edge",
  "properties": {
    "primary": {
      "path": [{"x": "float", "y": "float"}],
      "length": "float",
      "average_strength": "float"
    },
    "secondary": {
      "orientation": "float (degrees)",
      "continuity": "float (0.0-1.0)"
    }
  }
}
```

#### Region Tokens
```json
{
  "type": "region",
  "properties": {
    "primary": {
      "dominant_color": "hex",
      "texture_complexity": "float",
      "density": "float"
    },
    "secondary": {
      "edge_density": "float",
      "color_variance": "float"
    }
  }
}
```

#### Composition Tokens
```json
{
  "type": "composition",
  "properties": {
    "primary": {
      "symmetry_axis": "enum[vertical|horizontal|diagonal|radial|none]",
      "balance_point": {"x": "float", "y": "float"}
    },
    "secondary": {
      "depth_layers": "integer",
      "visual_weight_distribution": "object"
    }
  }
}
```

## 4. Example Token Outputs

### Example 1: Geometric Abstract Composition

**Input**: 512×512 PNG with colored rectangles on gradient background

**Output Tokens**:
```json
{
  "schema_version": "1.0",
  "source": {
    "filename": "abstract_geometric.png",
    "checksum": "a1b2c3d4...",
    "dimensions": {"width": 512, "height": 512}
  },
  "semantic_tokens": [
    {
      "token_id": "t0-geom-001",
      "type": "shape",
      "confidence": 0.95,
      "bounding_box": {"x": 50, "y": 50, "width": 150, "height": 200},
      "properties": {
        "primary": {
          "category": "geom_4",
          "vertices": [[50,50], [200,50], [200,250], [50,250]],
          "area": 30000,
          "perimeter": 800
        },
        "secondary": {
          "convexity": 1.0,
          "aspect_ratio": 0.75,
          "orientation": 0
        }
      }
    },
    {
      "token_id": "t1-color-001",
      "type": "color",
      "confidence": 0.98,
      "bounding_box": {"x": 50, "y": 50, "width": 150, "height": 200},
      "properties": {
        "primary": {
          "value": "#FF6B35",
          "lab": {"l": 65, "a": 45, "b": 40},
          "source_region": {"x": 50, "y": 50, "width": 150, "height": 200}
        },
        "secondary": {
          "saturation": 0.92,
          "luminance": 0.65,
          "temperature": 0.7
        }
      }
    },
    {
      "token_id": "t2-comp-001",
      "type": "composition",
      "confidence": 0.88,
      "bounding_box": {"x": 0, "y": 0, "width": 512, "height": 512},
      "properties": {
        "primary": {
          "symmetry_axis": "vertical",
          "balance_point": {"x": 256, "y": 256}
        },
        "secondary": {
          "depth_layers": 2,
          "visual_weight_distribution": {"left": 0.48, "right": 0.52}
        }
      }
    }
  ],
  "global_properties": {
    "palette": [
      {"color": "#FF6B35", "lab": {"l": 65, "a": 45, "b": 40}, "frequency": 0.35},
      {"color": "#2E86AB", "lab": {"l": 55, "a": -15, "b": -30}, "frequency": 0.25},
      {"color": "#1A936F", "lab": {"l": 60, "a": -35, "b": 20}, "frequency": 0.20},
      {"color": "#F4F1DE", "lab": {"l": 92, "a": -2, "b": 10}, "frequency": 0.20}
    ],
    "composition": {
      "symmetry_score": 0.72,
      "balance_score": 0.95,
      "complexity_score": 0.45
    }
  }
}
```

### Example 2: Organic Natural Scene

**Input**: 768×512 JPEG with leaf silhouette against sky

**Output Tokens (excerpt)**:
```json
{
  "semantic_tokens": [
    {
      "token_id": "t0-shape-001",
      "type": "shape",
      "confidence": 0.89,
      "bounding_box": {"x": 100, "y": 50, "width": 200, "height": 350},
      "properties": {
        "primary": {
          "category": "organic",
          "area": 45000,
          "perimeter": 1200
        },
        "secondary": {
          "convexity": 0.42,
          "aspect_ratio": 0.57,
          "orientation": 15
        }
      }
    },
    {
      "token_id": "t1-edge-001",
      "type": "edge",
      "confidence": 0.92,
      "bounding_box": {"x": 100, "y": 50, "width": 200, "height": 350},
      "properties": {
        "primary": {
          "length": 1200,
          "average_strength": 0.85
        },
        "secondary": {
          "orientation": 90,
          "continuity": 0.78
        }
      }
    }
  ]
}
```

## 5. Processing Pipeline Flow

```
┌─────────────────┐
│  Image Input    │
│  (Raster Data)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Pre-processing  │
│ • Resize/Normalize│
│ • Color Space  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Parallel Feature│
│ Extraction:     │
│ • Edge Detection│
│ • Color Quant.  │
│ • Shape Finding │
│ • Region Labels │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Semantic        │
│ Integration     │
│ • Token Creation│
│ • Relationships │
│ • Confidence    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Output          │
│ • JSON Document │
│ • Statistics    │
└─────────────────┘
```

## 6. Performance Considerations

- **Memory**: Process images in chunks for sizes > 2048×2048
- **Caching**: Cache color quantization results for identical images
- **Parallelization**: Shape and color analysis can run in parallel
- **Streaming**: Support streaming output for large token sets