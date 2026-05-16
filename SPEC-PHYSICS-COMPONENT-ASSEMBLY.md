# Stage 3: Physics Component Assembly

## Overview

Physics Component Assembly packages shaders from Kinetic Shader Mapping into integrated React components with 3D physics capabilities. This stage bridges the gap between visual shaders and interactive 3D experiences by providing a structured architecture for physics-enabled components.

## Architecture

### Core Concepts

- **PhysicsProvider**: Context provider that initializes and manages the physics world
- **ShaderContainer**: React component that wraps shader materials with physics bodies
- **PhysicsBody**: Abstraction layer over physics engine primitives (rigid bodies, constraints)
- **AnimatedComponent**: Components that combine shader visuals with physics simulation

### Data Flow

```
Kinetic Shader Mapping Output
        ↓
Shader Definition → Material Factory → Physics-Aware Component
        ↓               ↓                     ↓
    Uniforms      Physics Props          Render Loop
        ↓               ↓                     ↓
    Combined      Body Initialization   Three.js + Physics
```

## React Component Architecture

### PhysicsProvider

```tsx
interface PhysicsProviderProps {
  gravity?: [number, number, number];
  timestep?: number;
  iterations?: number;
  debug?: boolean;
}

const PhysicsProvider: React.FC<PhysicsProviderProps> = ({
  gravity = [0, -9.82, 0],
  timestep = 1/60,
  iterations = 8,
  children
}) => {
  const worldRef = useRef<World>();
  const { Physics } = usePhysicsEngine();

  useEffect(() => {
    worldRef.current = new Physics.World(gravity);
    return () => worldRef.current?.dispose();
  }, [gravity]);

  return (
    <PhysicsContext.Provider value={{ world: worldRef.current }}>
      {children}
    </PhysicsContext.Provider>
  );
};
```

### usePhysics Hook

```tsx
function usePhysics(bodyConfig: BodyConfig) {
  const { world } = useContext(PhysicsContext);
  const bodyRef = useRef<RigidBody>();

  useEffect(() => {
    bodyRef.current = world.createRigidBody(bodyConfig);
    return () => world.removeRigidBody(bodyRef.current);
  }, [bodyConfig]);

  return { body: bodyRef.current, update: bodyRef.current?.setPosition };
}
```

### ShaderContainer Component

```tsx
interface ShaderContainerProps {
  shader: ShaderDefinition;
  physics: PhysicsBodyConfig;
  children?: ReactNode;
}

const ShaderContainer: React.FC<ShaderContainerProps> = ({
  shader,
  physics,
  children
}) => {
  const { body } = usePhysics(physics);
  const meshRef = useRef<Mesh>();

  useFrame(() => {
    if (body && meshRef.current) {
      meshRef.current.position.copy(body.position);
      meshRef.current.quaternion.copy(body.quaternion);
    }
  });

  return (
    <mesh ref={meshRef} castShadow receiveShadow>
      {children}
      <shaderMaterial
        vertexShader={shader.vertex}
        fragmentShader={shader.fragment}
        uniforms={shader.uniforms}
      />
    </mesh>
  );
};
```

## Three.js/WebGL Integration Patterns

### Pattern 1: Direct Mesh Integration

```tsx
const PhysicsMesh: React.FC<PhysicsMeshProps> = ({
  geometry,
  shader,
  ...physicsProps
}) => {
  const meshRef = useRef<Mesh>(null!);
  const { body } = usePhysics(physicsProps);

  useFrame(() => {
    syncBodyToMesh(body, meshRef.current);
  });

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <shaderMaterial args={[shader]} />
    </mesh>
  );
};
```

### Pattern 2: Instanced Physics Objects

```tsx
const InstancedPhysicsGroup: React.FC<InstancedPhysicsProps> = ({
  count,
  shader,
  physicsFactory
}) => {
  const instancesRef = useRef<InstancedMesh>(null!);
  const bodies = useInstancedPhysics(count, physicsFactory);

  useFrame(() => {
    bodies.forEach((body, i) => {
      const matrix = new Matrix4().setPosition(body.position);
      instancesRef.current.setMatrixAt(i, matrix);
    });
    instancesRef.current.instanceMatrix.needsUpdate = true;
  });

  return <instancedMesh ref={instancesRef} args={[null, null, count]} />;
};
```

### Pattern 3: Custom Render Loop

```tsx
const usePhysicsRenderLoop = (bodies: RigidBody[], objects: Object3D[]) => {
  useThree(({ gl }) => {
    const clock = new Clock();

    gl.setAnimationLoop(() => {
      const delta = clock.getDelta();
      Physics.step(delta);
      bodies.forEach((body, i) => syncBodyToMesh(body, objects[i]));
    });

    return () => gl.setAnimationLoop(null);
  });
};
```

## Physics Engine Integration

### Cannon.js Integration

```tsx
class CannonPhysics {
  world: CANNON.World;

  constructor(config: PhysicsConfig) {
    this.world = new CANNON.World();
    this.world.gravity.set(...config.gravity);
    this.world.broadphase = new CANNON.NaiveBroadphase();
  }

  createBody(config: BodyConfig): CANNON.Body {
    const shape = this.createShape(config.geometry);
    const body = new CANNON.Body({ mass: config.mass, shape });
    body.position.set(...config.position);
    this.world.addBody(body);
    return body;
  }

  step(delta: number) {
    this.world.step(1/60, delta, 3);
  }
}
```

### Rapier Integration

```tsx
class RapierPhysics {
  world: RAPIER.World;

  constructor(config: PhysicsConfig) {
    this.world = new RAPIER.World(config.gravity);
  }

  createBody(config: BodyConfig): RAPIER.RigidBody {
    const bodyDesc = new RAPIER.RigidBodyDesc(config.mass)
      .setTranslation(...config.position);
    const body = this.world.createRigidBody(bodyDesc);

    const colliderDesc = this.createCollider(config.geometry);
    this.world.createCollider(colliderDesc, body);

    return body;
  }

  step(delta: number) {
    this.world.step();
  }
}
```

### Physics Engine Selection Strategy

| Engine | Performance | Bundle Size | Features | Use Case |
|--------|-------------|-------------|----------|----------|
| Cannon.js | Medium | ~50KB | Constraints, contacts | General purpose |
| Rapier | High | ~30KB | WASM optimized | Performance-critical |
| Ammo.js | High | ~2MB | Complete Bullet port | Complex simulations |

## Props and State Management

### Component Props Interface

```tsx
interface PhysicsComponentProps {
  // Shader props
  shader: ShaderDefinition;
  uniforms?: Record<string, UniformValue>;

  // Physics props
  position?: [number, number, number];
  rotation?: [number, number, number];
  mass?: number;
  restitution?: number;
  friction?: number;

  // Animation props
  animation?: AnimationConfig;

  // Event handlers
  onCollision?: (event: CollisionEvent) => void;
  onUpdate?: (state: PhysicsState) => void;
}
```

### State Management Pattern

```tsx
const usePhysicsState = (initial: PhysicsState) => {
  const [state, setState] = useState(initial);
  const [isAnimating, setIsAnimating] = useState(false);

  const updateState = useCallback((partial: Partial<PhysicsState>) => {
    setState(prev => ({ ...prev, ...partial }));
  }, []);

  return {
    state,
    updateState,
    isAnimating,
    startAnimation: () => setIsAnimating(true),
    stopAnimation: () => setIsAnimating(false)
  };
};
```

### Uniform Synchronization

```tsx
const useShaderUniforms = (
  shader: ShaderDefinition,
  physicsState: PhysicsState
) => {
  const uniforms = useMemo(() => ({
    ...shader.uniforms,
    u_time: { value: 0 },
    u_position: { value: physicsState.position },
    u_velocity: { value: physicsState.velocity },
    u_mass: { value: physicsState.mass }
  }), [shader.uniforms]);

  useFrame(({ clock }) => {
    uniforms.u_time.value = clock.elapsedTime;
    uniforms.u_position.value.copy(physicsState.position);
  });

  return uniforms;
};
```

## Performance Optimization Guidelines

### 1. Object Pooling for Physics Bodies

```tsx
class PhysicsBodyPool {
  private pool: RigidBody[] = [];
  private active = new Set<RigidBody>();

  acquire(config: BodyConfig): RigidBody {
    const body = this.pool.pop() || this.createBody(config);
    this.active.add(body);
    return body;
  }

  release(body: RigidBody) {
    this.active.delete(body);
    this.pool.push(body);
  }
}
```

### 2. Selective Update Frequency

```tsx
const useSelectiveUpdate = (priority: UpdatePriority) => {
  const frameCount = useFrameCount();
  const shouldUpdate = frameCount % priority === 0;

  if (!shouldUpdate) return false;

  switch (priority) {
    case 'high': return true;
    case 'medium': return frameCount % 2 === 0;
    case 'low': return frameCount % 4 === 0;
  }
};
```

### 3. Spatial Partitioning

```tsx
class SpatialOptimizer {
  private grid = new Map<string, Object3D[]>();

  queryVisible(bounds: Box3): Object3D[] {
    const key = this.getGridKey(bounds);
    return this.grid.get(key) || [];
  }

  updateObject(obj: Object3D) {
    const key = this.getGridKey(obj.geometry.boundingBox);
    const cell = this.grid.get(key) || [];
    cell.push(obj);
    this.grid.set(key, cell);
  }
}
```

### 4. Shader Optimization

```tsx
const optimizedVertexShader = `
  uniform float u_time;
  uniform vec3 u_position;
  varying vec2 v_uv;

  void main() {
    v_uv = uv;
    vec3 pos = position + sin(u_time + u_position) * 0.1;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;
```

## Example Component Implementations

### 1. Physics-Enabled Sphere

```tsx
const PhysicsSphere: React.FC<PhysicsSphereProps> = ({
  radius = 1,
  shader,
  mass = 1,
  position = [0, 5, 0]
}) => {
  const { body } = usePhysics({
    type: 'sphere',
    radius,
    mass,
    position
  });

  return (
    <ShaderContainer
      shader={shader}
      physics={{ type: 'sphere', radius, mass, position }}
    >
      <sphereGeometry args={[radius, 32, 16]} />
    </ShaderContainer>
  );
};
```

### 2. Interactive Physics Field

```tsx
const PhysicsField: React.FC<PhysicsFieldProps> = ({
  shader,
  count = 100,
  bounds = { x: 10, y: 10, z: 10 }
}) => {
  const instances = useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      position: [
        (Math.random() - 0.5) * bounds.x,
        Math.random() * bounds.y,
        (Math.random() - 0.5) * bounds.z
      ],
      mass: Math.random() * 0.5
    })), [count]
  );

  return (
    <InstancedPhysicsGroup
      count={count}
      shader={shader}
      physicsFactory={(i) => ({
        type: 'sphere',
        ...instances[i]
      })}
    />
  );
};
```

### 3. Constraint-Based Component

```tsx
const Pendulum: React.FC<PendulumProps> = ({
  shader,
  length = 2,
  position = [0, 5, 0]
}) => {
  const pivot = usePivot(position);
  const bob = useConstraint({
    type: 'point',
    bodyA: pivot.body,
    pointB: new Vector3(0, -length, 0)
  });

  return (
    <group>
      <mesh position={position}>
        <cylinderGeometry args={[0.05, 0.05, length]} />
        <meshStandardMaterial color="gray" />
      </mesh>
      <ShaderContainer
        shader={shader}
        physics={{ type: 'sphere', mass: 1, position: [0, position[1] - length, 0] }}
      >
        <sphereGeometry args={[0.5]} />
      </ShaderContainer>
    </group>
  );
};
```

### 4. Compound Physics Body

```tsx
const CompoundObject: React.FC<CompoundObjectProps> = ({
  shader,
  parts
}) => {
  const compoundBody = useCompoundBody(
    parts.map(p => ({
      type: p.type,
      position: p.position,
      rotation: p.rotation
    }))
  );

  return (
    <group>
      {parts.map((part, i) => (
        <ShaderContainer
          key={i}
          shader={shader}
          physics={{
            type: part.type,
            position: part.position,
            mass: part.mass
          }}
        >
          {part.geometry}
        </ShaderContainer>
      ))}
    </group>
  );
};
```

## Integration Checklist

- [ ] Physics provider wraps component tree
- [ ] Shader definitions loaded from Kinetic Shader Mapping output
- [ ] Physics bodies created with matching visual geometry
- [ ] Sync loop established between physics and Three.js transforms
- [ ] Uniforms updated with physics state
- [ ] Performance optimizations applied
- [ ] Debug visualization available in development

## Dependencies

- `@react-three/fiber` - React renderer for Three.js
- `@react-three/cannon` or `@react-three/rapier` - Physics integration
- `three` - WebGL library
- `react` - UI framework

## See Also

- [Stage 1: Visual Tokenizer](./SPEC-VISUAL-TOKENIZER.md)
- [Stage 2: Kinetic Shader Mapping](./SPEC-KINETIC-SHADER-MAPPING.md)
- [Master Architecture Document](./SPEC-ARCHITECTURE.md)