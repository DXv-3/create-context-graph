# Stage 2: Kinetic Shader Mapping

## Overview

The Kinetic Shader Mapping stage transforms semantic tokens from the Visual Tokenizer into executable GLSL shaders and animation specifications. This stage bridges the gap between semantic visual analysis and runtime graphics rendering.

## Input Schema (from Visual Tokenizer)

Semantic tokens are JSON objects with the following structure:

```json
{
  "tokenId": "string",
  "type": "shape|gradient|texture|pattern",
  "geometry": {
    "primitive": "quad|triangle|circle|complex",
    "vertices": [["x", "y"] | ["x", "y", "z"]],
    "uvs": [["u", "v"]]
  },
  "style": {
    "fill": {
      "type": "solid|linear|radial|conical",
      "colors": ["#RRGGBB" | "rgb(r,g,b)"],
      "stops": [{"offset": 0.0, "color": "..."}]
    },
    "stroke": {
      "width": "number",
      "color": "string",
      "dash": ["pattern"]
    },
    "transform": {
      "scale": [x, y],
      "rotation": "radians",
      "translation": [x, y]
    }
  },
  "animation": {
    "type": "pulse|wave|spin|drift|custom",
    "parameters": {
      "frequency": "number",
      "amplitude": "number",
      "phase": "number"
    }
  },
  "metadata": {
    "priority": "integer",
    "layer": "number"
  }
}
```

## Token-to-Shader Mapping Patterns

### Pattern 1: Solid Fill Shader
- **Token Type**: `shape` with `fill.type: "solid"`
- **Output**: Simple color passthrough fragment shader
- **Mapping Logic**: Direct color value binding to `uniform vec3 uColor`

### Pattern 2: Gradient Shader
- **Token Type**: `gradient` or `shape` with `fill.type: "linear|radial|conical"`
- **Output**: Multi-stop gradient fragment shader
- **Mapping Logic**: Color stops converted to uniform arrays, UV coordinates drive interpolation

### Pattern 3: Textured Geometry Shader
- **Token Type**: `texture` with image reference
- **Output**: UV-mapped texture sampling fragment shader
- **Mapping Logic**: Image path resolves to texture unit, UV coordinates from geometry

### Pattern 4: Animated Shader
- **Token Type**: Any with `animation` defined
- **Output**: Time-uniform driven vertex/fragment modifications
- **Mapping Logic**: Animation parameters mapped to shader uniforms

### Pattern 5: Pattern Repetition Shader
- **Token Type**: `pattern` with tiling
- **Output**: Procedural pattern generation with repetition
- **Mapping Logic**: Pattern seed + UV tiling factors

## GLSL Shader Templates

### Vertex Shader Template (Base)

```glsl
attribute vec3 aPosition;
attribute vec2 aUV;
attribute vec3 aNormal;

uniform mat4 uModelMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;
uniform mat3 uNormalMatrix;

uniform float uTime;
uniform vec3 uTranslation;
uniform vec3 uRotation;
uniform vec3 uScale;

varying vec2 vUV;
varying vec3 vPosition;
varying vec3 vNormal;
varying float vTime;

void main() {
  vUV = aUV;
  vPosition = aPosition;
  vNormal = aNormal;
  vTime = uTime;

  vec3 pos = aPosition;
  
  // Apply transformations
  pos *= uScale;
  pos += uTranslation;
  
  // Apply time-based animation
  pos = animateVertex(pos, uTime);
  
  gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * vec4(pos, 1.0);
}
```

### Fragment Shader Template (Solid Fill)

```glsl
precision mediump float;

uniform vec3 uColor;
uniform float uOpacity;

varying vec2 vUV;
varying vec3 vPosition;
varying float vTime;

void main() {
  vec3 color = uColor;
  float alpha = uOpacity;
  
  // Optional time-based effects
  color = applyColorEffects(color, vTime);
  
  gl_FragColor = vec4(color, alpha);
}
```

### Fragment Shader Template (Linear Gradient)

```glsl
precision mediump float;

uniform int uStopCount;
uniform vec2 uStopPositions[MAX_STOPS];
uniform vec3 uStopColors[MAX_STOPS];

varying vec2 vUV;
varying vec3 vPosition;

vec3 sampleGradient(vec2 uv, vec2 positions[4], vec3 colors[4], int count) {
  float t = 0.0;
  for (int i = 0; i < count; i++) {
    t = max(t, step(positions[i].x, uv.x) * step(uv.x, positions[i].y));
  }
  
  vec3 result = colors[0];
  for (int i = 1; i < count; i++) {
    float blend = smoothstep(positions[i-1].y, positions[i].x, uv.x);
    result = mix(result, colors[i], blend);
  }
  return result;
}

void main() {
  vec3 color = sampleGradient(vUV, uStopPositions, uStopColors, uStopCount);
  gl_FragColor = vec4(color, 1.0);
}
```

### Fragment Shader Template (Animated Pulse)

```glsl
precision mediump float;

uniform vec3 uBaseColor;
uniform float uFrequency;
uniform float uAmplitude;
uniform float uTime;

varying vec2 vUV;

void main() {
  float pulse = sin(uTime * uFrequency) * 0.5 + 0.5;
  vec3 color = uBaseColor * (1.0 + pulse * uAmplitude);
  gl_FragColor = vec4(color, 1.0);
}
```

## Animation Parameter Extraction

Animation semantics are extracted from the token's `animation` object:

| Token Field | Shader Uniform | Type | Range |
|-------------|---------------|------|-------|
| `animation.type` | Selects animation function | string | pulse, wave, spin, drift, custom |
| `animation.parameters.frequency` | `uFrequency` | float | 0.1 - 10.0 Hz |
| `animation.parameters.amplitude` | `uAmplitude` | float | 0.0 - 1.0 |
| `animation.parameters.phase` | `uPhase` | float | 0.0 - 2π |
| `animation.parameters.speed` | `uSpeed` | float | -1.0 - 1.0 |

### Animation Function Library

```glsl
// Vertex displacement functions
vec3 pulseVertex(vec3 pos, float time, float freq, float amp) {
  return pos + normalize(pos) * sin(time * freq) * amp;
}

vec3 waveVertex(vec3 pos, float time, float freq, float amp) {
  return pos + vec3(0.0, sin(pos.x * freq + time) * amp, 0.0);
}

vec3 spinVertex(vec3 pos, float time, float speed) {
  float c = cos(time * speed);
  float s = sin(time * speed);
  return vec3(pos.x * c - pos.y * s, pos.x * s + pos.y * c, pos.z);
}

vec3 driftVertex(vec3 pos, float time, vec3 velocity) {
  return pos + velocity * time;
}
```

## Uniform and Attribute Binding Specifications

### Required Uniforms (All Shaders)

| Uniform | Type | Purpose |
|---------|------|---------|
| `uTime` | float | Current time in seconds |
| `uModelMatrix` | mat4 | Model transformation |
| `uViewMatrix` | mat4 | View/camera transformation |
| `uProjectionMatrix` | mat4 | Projection transformation |

### Optional Uniforms (Conditional)

| Uniform | Type | Token Source | Feature |
|---------|------|--------------|---------|
| `uColor` | vec3 | `style.fill.colors[]` | Solid fill |
| `uOpacity` | float | `style.opacity` | Transparency |
| `uTexture` | sampler2D | `texture.image` | Image texture |
| `uStopCount` | int | `style.fill.stops` | Gradient |
| `uStopPositions` | vec2[4] | `stops[].offset` | Gradient stops |
| `uStopColors` | vec3[4] | `stops[].color` | Gradient colors |
| `uFrequency` | float | `animation.parameters.frequency` | Animation |
| `uAmplitude` | float | `animation.parameters.amplitude` | Amplitude |
| `uPhase` | float | `animation.parameters.phase` | Phase offset |

### Vertex Attributes

| Attribute | Type | Purpose |
|-----------|------|---------|
| `aPosition` | vec3 | Vertex position |
| `aUV` | vec2 | Texture coordinates |
| `aNormal` | vec3 | Surface normal for lighting |

### Binding Conventions

- **WebGL 1**: Use `gl.getAttribLocation` and `gl.getUniformLocation`
- **WebGL 2**: Use `gl.getProgramParameter` with `gl.ACTIVE_ATTRIBUTES`
- **Uniform naming**: Prefix with semantic category (u for uniform, a for attribute)
- **Array uniforms**: Use `[N]` suffix notation where N is max elements

## Example Shader Outputs

### Example 1: Simple Colored Quad

**Input Token:**
```json
{
  "tokenId": "quad_001",
  "type": "shape",
  "geometry": {
    "primitive": "quad",
    "vertices": [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]],
    "uvs": [[0, 0], [1, 0], [1, 1], [0, 1]]
  },
  "style": {
    "fill": { "type": "solid", "colors": ["#3498db"] }
  }
}
```

**Generated Fragment Shader:**
```glsl
precision mediump float;
uniform vec3 uColor;
varying vec2 vUV;
void main() {
  gl_FragColor = vec4(uColor, 1.0);
}
```

**Uniforms:** `{ uColor: [0.203, 0.596, 0.862] }`

### Example 2: Radial Gradient Circle

**Input Token:**
```json
{
  "tokenId": "circle_001",
  "type": "shape",
  "geometry": {
    "primitive": "circle"
  },
  "style": {
    "fill": {
      "type": "radial",
      "colors": ["#e74c3c", "#3498db"],
      "stops": [
        { "offset": 0.0, "color": "#e74c3c" },
        { "offset": 1.0, "color": "#3498db" }
      ]
    }
  }
}
```

**Generated Fragment Shader:**
```glsl
precision mediump float;
uniform vec3 uCenterColor;
uniform vec3 uEdgeColor;
varying vec2 vUV;
void main() {
  float dist = distance(vUV, vec2(0.5));
  vec3 color = mix(uCenterColor, uEdgeColor, dist);
  gl_FragColor = vec4(color, 1.0);
}
```

### Example 3: Pulsing Animated Rectangle

**Input Token:**
```json
{
  "tokenId": "pulse_rect_001",
  "type": "shape",
  "geometry": {
    "primitive": "quad"
  },
  "style": {
    "fill": { "type": "solid", "colors": ["#9b59b6"] }
  },
  "animation": {
    "type": "pulse",
    "parameters": {
      "frequency": 2.0,
      "amplitude": 0.1
    }
  }
}
```

**Generated Vertex Shader with Animation:**
```glsl
precision mediump float;
attribute vec3 aPosition;
uniform float uTime;
uniform float uAmplitude;
uniform float uFrequency;
varying vec2 vUV;

void main() {
  float scale = 1.0 + sin(uTime * uFrequency) * uAmplitude;
  vec3 pos = aPosition * scale;
  vUV = (pos.xy + 1.0) / 2.0;
  gl_Position = vec4(pos, 1.0);
}
```

## Output Schema

The stage produces a shader specification object:

```json
{
  "shaderId": "string",
  "vertexShader": "GLSL source code",
  "fragmentShader": "GLSL source code",
  "uniforms": {
    "name": { "type": "float|vec2|vec3|vec4|mat4|int|sampler2D", "value": "..." },
    ...
  },
  "attributes": ["aPosition", "aUV", "aNormal"],
  "uniformBindings": {
    "uColor": { "source": "token.style.fill.colors[0]", "transform": "..." },
    ...
  },
  "varyings": ["vUV", "vPosition", "vTime"],
  "instructions": {
    "renderMode": "triangles|lines|points",
    "cullFace": "back|front|none",
    "depthTest": true,
    "blendMode": "normal|add|multiply"
  }
}
```

## Processing Pipeline

1. **Token Validation**: Verify required fields and data types
2. **Shader Selection**: Match token types to shader templates
3. **Uniform Generation**: Convert token values to uniform bindings
4. **Animation Injection**: Insert animation code for animated tokens
5. **Optimization**: Remove unused uniforms/varyings, combine similar shaders
6. **Output Assembly**: Package into shader specification format

## Error Handling

- **Unknown token type**: Fall back to default solid fill shader
- **Invalid color format**: Default to white (1,1,1)
- **Missing animation parameters**: Use sensible defaults
- **Geometry errors**: Generate fallback quad geometry