# WebGL/React Architecture Specification

**Version:** 1.0.0  
**Status:** Canonical Reference  
**Pipeline:** Visual Tokenizer → Kinetic Shader Mapping → Physics Component Assembly

---

## Executive Summary

This specification defines a three-stage pipeline architecture for transforming static visual references into interactive WebGL/React components with 3D physics. The pipeline synthesizes semantic analysis, shader generation, and component assembly into a cohesive artifact generation system.

---

## Pipeline Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  INPUT STAGE    │     │  PROCESSING     │     │  OUTPUT STAGE   │
│                 │     │                 │     │                 │
│ Static Visual   │──→  │ Semantic Tokens │──→  │ GLSL Shaders    │
│ References      │     │ & Metadata      │     │ & Animations    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                           │
                                                           ▼
                                                ┌─────────────────┐
                                                │  React          │
                                                │  Components     │
                                                │  w/ Physics     │
                                                └─────────────────┘
```

---

## Stage Definitions

### Stage 1: Visual Tokenizer

**Purpose:** Transform static visual references into semantic tokens for downstream processing.

**Input:**
- Raster images (PNG, JPEG, SVG)
- Design mockups
- Style guides
- Color palettes

**Output:**
- Semantic tokens (color tokens, spacing tokens, motion tokens)
- Design metadata (typography, layout grids, component hierarchies)
- Accessibility annotations (contrast ratios, semantic roles)

**Process:**
1. **Image Ingestion:** Load and normalize visual references
2. **Feature Extraction:** Extract colors, gradients, shapes, textures
3. **Semantic Mapping:** Map visual features to design tokens
4. **Metadata Generation:** Produce accessibility and interaction metadata

**Token Schema:**
```typescript
interface SemanticTokens {
  colors: Record<string, { value: string; contrast: number }>;
  spacing: Record<string, { value: number; unit: string }>;
  motion: Record<string, { duration: number; easing: string }>;
  geometry: Record<string, { primitive: string; variants: string[] }>;
}
```

### Stage 2: Kinetic Shader Mapping

**Purpose:** Convert semantic tokens into GLSL shaders and animation specifications.

**Input:**
- Semantic tokens from Stage 1
- Animation constraints
- Performance targets

**Output:**
- GLSL vertex and fragment shaders
- Animation timelines (keyframes, easing curves)
- Uniform definitions
- Shader variants for different contexts

**Process:**
1. **Token Analysis:** Parse semantic tokens for shader-relevant properties
2. **Shader Generation:** Generate GLSL code from token definitions
3. **Animation Mapping:** Create animation specs from motion tokens
4. **Optimization:** Apply shader optimizations for target platforms

**Shader Schema:**
```glsl
// Vertex shader template
attribute vec3 position;
attribute vec2 uv;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform float u_time;
uniform vec3 u_color;

void main() {
  vec3 pos = position;
  pos.x += sin(u_time * 2.0) * 0.1;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
```

### Stage 3: Physics Component Assembly

**Purpose:** Integrate shaders into React components with 3D physics simulation.

**Input:**
- Shaders and animation specs from Stage 2
- Semantic metadata from Stage 1
- Physics configuration (gravity, constraints, materials)

**Output:**
- React components with Three.js/React Three Fiber
- Physics-enabled 3D objects
- Interactive UI controls
- Performance monitoring hooks

**Process:**
1. **Component Scaffolding:** Create React component structure
2. **Shader Integration:** Apply GLSL shaders to materials
3. **Physics Attachment:** Connect physics engine (Rapier/Cannon.js)
4. **Interaction Binding:** Wire user inputs to physics controls

**Component Schema:**
```typescript
interface PhysicsComponentProps {
  shaders: {
    vertex: string;
    fragment: string;
  };
  physics: {
    mass: number;
    restitution: number;
    friction: number;
  };
  animation: {
    timeline: Keyframe[];
    loop: boolean;
  };
}
```

---

## Data Flow Architecture

### Unidirectional Flow

```
Visual Input
    │
    ▼
[Visual Tokenizer]
    │
    ├── Semantic Tokens ──────► [Kinetic Shader Mapping]
    ├── Asset Metadata ───────► [Shader Generation]
    └── Design Constraints ───► [Animation Specs]
                                    │
                                    ▼
                         [Physics Component Assembly]
                                    │
                                    ▼
                           React Components + Physics
```

### State Management

- **Token State:** Immutable semantic tokens propagated through stages
- **Shader State:** Mutable shader uniforms updated per frame
- **Physics State:** Simulated state synchronized with render loop

---

## Technical Specifications

### Core Dependencies

| Layer | Technology | Purpose |
|-------|------------|---------|
| Rendering | Three.js / React Three Fiber | WebGL abstraction |
| Physics | Rapier / Cannon.js | 3D physics simulation |
| Animation | GSAP / Framer Motion | Timeline management |
| State | Zustand / Jotai | Token state management |

### Performance Targets

- **Frame Rate:** 60 FPS baseline, 30 FPS minimum
- **Shader Complexity:** Max 100 uniform updates per frame
- **Physics Bodies:** 1000 rigid bodies max
- **Bundle Size:** < 500KB gzipped core pipeline

### File Structure

```
/src
  /pipeline
    /tokenizer      - Visual parsing utilities
    /shaders        - GLSL generation tools
    /components     - React component generators
  /types
    tokens.ts       - Semantic token definitions
    shaders.ts      - Shader schema
    physics.ts      - Physics component props
  /utils
    /color          - Color extraction algorithms
    /geometry       - Shape analysis utilities
```

---

## Implementation Patterns

### Pattern 1: Token-Driven Shader Generation

```typescript
function generateShaderFromTokens(tokens: SemanticTokens) {
  const { colors, motion } = tokens;
  return {
    uniforms: {
      u_color: { value: new Color(colors.primary.value) },
      u_speed: { value: motion.fast.duration }
    },
    vertexShader: vertexTemplate,
    fragmentShader: fragmentTemplate
  };
}
```

### Pattern 2: Physics-React Bridge

```typescript
function usePhysicsObject(props: PhysicsComponentProps) {
  const meshRef = useRef<THREE.Mesh>();
  const { nodes } = useGLTF(props.model);
  
  useFrame((state) => {
    meshRef.current.material.uniforms.u_time.value = state.clock.elapsedTime;
  });
  
  return (
    <mesh ref={meshRef} castShadow receiveShadow>
      <primitive object={nodes[props.geometry]} />
    </mesh>
  );
}
```

### Pattern 3: Pipeline Orchestration

```typescript
async function runPipeline(visualInput: ImageData) {
  const tokens = await visualTokenizer.process(visualInput);
  const shaders = await kineticMapper.generate(tokens);
  const component = await physicsAssembler.build(shaders);
  return component;
}
```

---

## API Contracts

### Pipeline Input/Output

```typescript
// Input
interface PipelineInput {
  visual: {
    source: string | Buffer;
    format: 'image' | 'design';
  };
  constraints?: {
    performance: 'high' | 'medium' | 'low';
    interactivity: boolean;
  };
}

// Output
interface PipelineOutput {
  component: React.FC<PhysicsComponentProps>;
  shaders: ShaderData[];
  tokens: SemanticTokens;
}
```

---

## Glossary

| Term | Definition |
|------|------------|
| Semantic Token | Design primitive derived from visual analysis |
| GLSL | OpenGL Shading Language for GPU programs |
| Physics Body | Simulated object with mass and constraints |
| Uniform | Shader constant passed from CPU to GPU |

---

## Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-05-16 | Initial specification |