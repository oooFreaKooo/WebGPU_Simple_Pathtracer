struct BLASInstance {
    transform: mat4x4<f32>,
    invTransform: mat4x4<f32>,
    blasOffset: u32,
    materialIdx: u32,
    _padding: vec2<f32>,
}

struct BLASNode {
    aabbMin: vec3<f32>,
    leftFirst: u32,
    aabbMax: vec3<f32>,
    triCount: u32,
}

struct TLASNode {
    aabbMin: vec3<f32>,
    left: u32,
    aabbMax: vec3<f32>,
    right: u32,
    instanceIdx: u32, // BLAS instance index for leaf nodes
}

struct Material {
    albedo: vec3f,             // Diffuse color
    specChance: f32,           // Probability of specular reflection
    specColor: vec3f,          // Specular color
    roughness: f32,            // Roughness for specular and refractive
    emissionColor: vec3f,      // Emission color
    emissionStrength: f32,     // Emission strength
    refrColor: vec3f,          // Refractive color
    refrChance: f32,           // Probability of refraction
    sssColor: vec3f,           // Subsurface scattering color
    sssStrength: f32,          // Subsurface scattering strength
    sssRadius: f32,            // Subsurface scattering radius
    ior: f32,                  // Index of refraction
}

struct Triangle {
    edge1: vec3f,
    edge2: vec3f,
    corner_a: vec3f,
    normal_a: vec3f,
    normal_b: vec3f,
    normal_c: vec3f,
}

struct CameraData {
    pos: vec3<f32>,
    forward: vec3<f32>,
    right: vec3<f32>,
    up: vec3<f32>,
}

struct Settings {
    maxBounces: f32,
    numSamples: f32,
    BACKFACE_CULLING: f32,
    SKY_TEXTURE: f32,
    aspectRatio: f32,
    jitterScale: f32,
    numLights: f32,
}

struct CameraSettings {
    cameraFOV: f32,
    focusDistance: f32,
    apertureSize: f32,
}

struct Uniforms {
	screenDims: vec2f,
	frameNum: u32,
	resetBuffer: f32,
}

struct HitPoint {
    material: Material,
    dist: f32,
    normal: vec3f,
    hit: bool,
    from_front: bool,
}

struct Ray {
    direction: vec3<f32>,
    origin: vec3<f32>,
}

struct RayType {
    isSpecular: f32,
    isRefractive: f32,
    regularBounces: u32,
}

struct SFC32State {
    a: u32,
    b: u32,
    c: u32,
    d: u32,
}

// Group 0: Uniforms and Settings
@group(0) @binding(0) var<uniform> uniforms : Uniforms;
@group(0) @binding(1) var<uniform> cam : CameraData;
@group(0) @binding(2) var<uniform> setting : Settings;
@group(0) @binding(3) var<uniform> cam_setting : CameraSettings;

// Group 1: Framebuffer
@group(1) @binding(0) var<storage, read_write> framebuffer: array<vec4f>;

// Group 2: Object and BVH Data
@group(2) @binding(0) var<storage, read> meshTriangles : array<Triangle>;
@group(2) @binding(1) var<storage, read> blasNodes: array<BLASNode>;
@group(2) @binding(2) var<storage, read> blasInstances: array<BLASInstance>;
@group(2) @binding(3) var<storage, read> tlasNodes: array<TLASNode>;
@group(2) @binding(4) var<storage, read> triIdxInfo: array<u32>;
@group(2) @binding(5) var<storage, read> meshMaterial : array<Material>;
//@group(2) @binding(6) var object_textures: texture_2d_array<f32>;

// Group 3: Textures and Samplers
@group(3) @binding(0) var skyTexture : texture_cube<f32>;
@group(3) @binding(1) var skySampler : sampler;


const DEBUG = false;
const EPSILON : f32 = 0.00001;
const PI  = 3.14159265358979323846;
const TWO_PI: f32 = 6.28318530718;

var<private> pixelCoords : vec2f;
var<private> rngState: SFC32State;
var<workgroup> sharedAccumulatedColor: array<vec3f, 64>;

// BVH Vars
const STACK_SIZE_TLAS: u32 = 16u;
const STACK_SIZE_BLAS: u32 = 16u;
const TOTAL_STACK_SIZE: u32 = 32u;
const T_MAX = 10000f;
var<private> threadIndex : u32;
var<workgroup> sharedStack: array<u32, 2048>;

@compute @workgroup_size(8, 8)
fn main(
    @builtin(global_invocation_id) GlobalInvocationID: vec3u,
    @builtin(workgroup_id) workgroup_id: vec3<u32>,
    @builtin(local_invocation_id) local_invocation_id: vec3<u32>,
    @builtin(local_invocation_index) local_invocation_index: u32,
) {
    if GlobalInvocationID.x >= u32(uniforms.screenDims.x) * u32(uniforms.screenDims.y) {
        return;
    }
    let DIMENSION = uniforms.screenDims;
    let coord = vec2u(workgroup_id.x * 8u + local_invocation_id.x, workgroup_id.y * 8u + local_invocation_id.y);
    let idx = coord.y * u32(DIMENSION.x) + coord.x;
    let pixelCoords = vec2<f32>(f32(coord.x), f32(coord.y));

    threadIndex = get_thread_index(local_invocation_id);
    // Random state initialization
    rngState = initialize_rng(coord * idx, uniforms.frameNum);

    // Precompute constants outside the loops
    let FORWARD = cam.forward;
    let RIGHT = cam.right;
    let UP = cam.up;
    let POS = cam.pos;
    let FOV = cam_setting.cameraFOV;
    let focus_dist = cam_setting.focusDistance;
    let aspect_ratio = setting.aspectRatio;

    // Precompute coefficients
    let fov_over_dim_x = FOV / f32(DIMENSION.x);
    let fov_over_dim_y_ar = FOV / (f32(DIMENSION.y) * aspect_ratio);
    let screen_base = pixelCoords - (DIMENSION.xy) * 0.5;

    // Precompute ray origin
    let rand_state_vec = rand2();
    let lens_point = rand_state_vec * cam_setting.apertureSize;
    let ray_origin = POS + RIGHT * lens_point.x + UP * lens_point.y;

    var myRay: Ray;
    sharedAccumulatedColor[local_invocation_index] = vec3<f32>(0.0);

    for (var i: u32 = 0u; i < u32(setting.numSamples); i += 1u) {
        let randomOffset: vec2<f32> = setting.jitterScale * (rand_state_vec - vec2<f32>(0.5));
        let screen_jittered = screen_base + randomOffset;

        myRay.origin = ray_origin;

        let horizontal_coeff = fov_over_dim_x * screen_jittered.x;
        let vertical_coeff = fov_over_dim_y_ar * screen_jittered.y;

        let focus_point = POS + normalize(FORWARD + horizontal_coeff * RIGHT + vertical_coeff * UP) * focus_dist;

        myRay.direction = normalize(focus_point - myRay.origin);

        sharedAccumulatedColor[local_invocation_index] += trace(myRay);
    }

    var acc_radiance = sharedAccumulatedColor[local_invocation_index] / f32(setting.numSamples);

    if uniforms.resetBuffer == 0.0 {
        acc_radiance += framebuffer[idx].xyz;
    }

    framebuffer[idx] = vec4<f32>(acc_radiance, 1.0);
}

fn trace(camRay: Ray) -> vec3f {
    var hit: HitPoint;
    var ray = camRay;
    var acc_radiance: vec3f = vec3(0.0);
    var throughput: vec3f = vec3(1.0);

    let maxBounces = u32(setting.maxBounces);
    let skyTextureEnabled = setting.SKY_TEXTURE == 1.0;
    let inv_maxBounces = 1.0 / f32(maxBounces); // Precompute if needed

    for (var bounce: u32 = 0u; bounce < maxBounces; bounce++) {
        // Initialize hit
        hit.hit = false;
        hit.dist = T_MAX;
        
        // Trace the ray
        trace_tlas(ray, &hit);
        
        // Accumulate sky radiance if no hit occurs
        if !hit.hit {
            acc_radiance += throughput * select(
                proceduralSky(ray.direction),
                //vec3f(0.0) for black sky
                textureSampleLevel(skyTexture, skySampler, ray.direction, 0.0).xyz,
                skyTextureEnabled
            );
            break;
        }
        
        // Material handling
        var M = ensure_energy_conservation(hit.material);
        let originalEnergy = throughput;

        // Russian Roulette for Path Termination
        let rr_prob = max(max(throughput.r, throughput.g), throughput.b);
        if rand() >= rr_prob || length(throughput) < 0.1 {
            break;
        }
        throughput /= rr_prob;

        // TODO: Implement correct absorption
        throughput *= select(vec3<f32>(1.0), exp(-M.refrColor * 5.0), hit.from_front);

        // Indices of refraction
        let n1 = select(1.0, M.ior, !hit.from_front);
        let n2 = select(1.0, M.ior, hit.from_front);
        
        // Fresnel effect
        let randVal = rand();
        var specChance = M.specChance;
        var refrChance = M.refrChance;

        if specChance > 0.0 {
            specChance = FresnelReflectAmount(n1, n2, hit.normal, ray.direction, M.specChance, 1.0);
            refrChance *= (1.0 - specChance) / max(1.0 - M.specChance, EPSILON);
        }

        var rayType = determine_ray_type(specChance, refrChance, randVal);
        
        // Early termination for diffuse rays
        if rayType.regularBounces >= 4u && rayType.isSpecular == 0.0 {
            break;
        }

        // ------ Update ray origin ------
        ray.origin = update_ray_origin(ray, hit, rayType.isRefractive);

        // ------ Diffuse & Specular & Refraction Directions ------
        let diffuseDir = cosine_weighted_sampling_hemisphere(hit.normal);
        var specularDir = normalize(reflect(ray.direction, hit.normal));
        specularDir = normalize(mix(specularDir, diffuseDir, M.roughness * M.roughness));

        var refractDir = refract(ray.direction, hit.normal, n1 / n2);
        refractDir = normalize(mix(refractDir, cosine_weighted_sampling_hemisphere(-hit.normal), M.roughness * M.roughness));
        
        // Combine directions
        ray.direction = mix(diffuseDir, specularDir, rayType.isSpecular);
        ray.direction = mix(ray.direction, refractDir, rayType.isRefractive);
        
        // Accumulate emission
        acc_radiance += throughput * M.emissionColor * M.emissionStrength;
        
        // ------ Subsurface scattering ------
        if M.sssStrength > 0.0 {
            let distance = length(ray.direction);
            let attenuation = exp(-distance / M.sssRadius);
            acc_radiance += throughput * (M.sssColor * M.sssStrength * attenuation);
            throughput *= (1.0 - M.sssStrength);
        }

        if rayType.isRefractive == 0.0 {
            throughput *= (M.albedo + M.specColor * rayType.isSpecular);
        }
    }

    return acc_radiance;
}

fn proceduralSky(direction: vec3<f32>) -> vec3<f32> {
    let t = 0.5 * (direction.y + 1.0);
    let randColor = vec3<f32>(0.2, 0.2, 0.2) * t;
    return randColor;
}

fn update_ray_origin(ray: Ray, hit: HitPoint, isRefractive: f32) -> vec3f {
    return select(
        (ray.origin + ray.direction * hit.dist) + hit.normal * EPSILON,
        (ray.origin + ray.direction * hit.dist) - hit.normal * EPSILON,
        isRefractive == 1.0
    );
}

fn determine_ray_type(specChance: f32, refrChance: f32, randVal: f32) -> RayType {
    var result: RayType;
    result.isSpecular = 0.0;
    result.isRefractive = 0.0;
    result.regularBounces = 1u;

    if specChance > 0.0 && randVal < specChance {
        result.isSpecular = 1.0;
    } else if refrChance > 0.0 && randVal < (specChance + refrChance) {
        result.isRefractive = 1.0;
    } else {
        result.regularBounces += 1u;
    }

    return result;
}


fn FresnelReflectAmount(
    n1: f32,
    n2: f32,
    normal: vec3<f32>,
    incident: vec3<f32>,
    f0: f32,
    f90: f32
) -> f32 {
    // Calculate r0
    var r0: f32 = (n1 - n2) / (n1 + n2);
    r0 = r0 * r0;
    var cosX: f32 = -dot(normal, incident);
    if n1 > n2 {
        let eta: f32 = n1 / n2;
        let sinT2: f32 = eta * eta * (1.0 - cosX * cosX);
        if sinT2 > 1.0 {
            return f90;
        }
        cosX = sqrt(1.0 - sinT2);
    }

    let x: f32 = 1.0 - cosX;
    let ret: f32 = r0 + (1.0 - r0) * pow(x, 5.0);

    return mix(f0, f90, ret);
}


fn ensure_energy_conservation(material: Material) -> Material {
    var M: Material = material;

    let sum = M.albedo + M.specColor;
    let maxSum = max(sum.r, max(sum.g, sum.b));

    if maxSum > 1.0 {
        let factor = 1.0 / maxSum;
        M.albedo *= factor;
        M.specColor *= factor;
    }

    M.albedo = clamp(M.albedo, vec3f(0.0), vec3f(1.0));
    M.specColor = clamp(M.specColor, vec3f(0.0), vec3f(1.0));

    return M;
}

fn cosine_weighted_sampling_hemisphere(normal: vec3f) -> vec3f {
    let r1 = rand();
    let r2 = rand();
    let r = sqrt(r1);
    let theta = TWO_PI * r2;

    let x = r * cos(theta);
    let y = r * sin(theta);
    let z = sqrt(1.0 - r1);

    var w = normalize(normal);
    var tangent = select(vec3(0.0, 1.0, 0.0), vec3(1.0, 0.0, 0.0), abs(w.y) > 0.999);
    let u = normalize(cross(tangent, w));
    let v = cross(w, u);

    return normalize(u * x + v * y + w * z);
}


fn initialize_rng(id: vec2u, frameNum: u32) -> SFC32State {
    return SFC32State(
        frameNum ^ id.x,
        frameNum ^ id.y,
        frameNum ^ (id.x + id.y),
        frameNum ^ (id.x * id.y)
    );
}

// SFC32 RNG implementation
fn rand() -> f32 {
    let t = rngState.a + rngState.b;
    rngState.a = rngState.b ^ (rngState.b >> 9u);
    rngState.b = rngState.c + (rngState.c << 3u);
    rngState.c = (rngState.c << 21u) | (rngState.c >> 11u);
    rngState.d = rngState.d + 1u;
    let t_new = t + rngState.d;
    rngState.c = rngState.c + t_new;
    return f32(t_new) / 4294967296.0;
}

fn rand2() -> vec2f {
    return vec2f(rand(), rand());
}

fn get_thread_index(local_invocation_id: vec3<u32>) -> u32 {
    return local_invocation_id.x + local_invocation_id.y * 8u + local_invocation_id.z * 8u * 8u;
}

fn get_tlas_stack_base(threadIndex: u32) -> u32 {
    return threadIndex * TOTAL_STACK_SIZE;
}

fn get_blas_stack_base(threadIndex: u32) -> u32 {
    return threadIndex * TOTAL_STACK_SIZE + STACK_SIZE_TLAS;
}

fn trace_tlas(ray: Ray, hit_point: ptr<function, HitPoint>) {
    let inverseDir: vec3<f32> = 1.0 / ray.direction;
    
    // Calculate the base index for TLAS stack slice
    let tlasStackBase: u32 = get_tlas_stack_base(threadIndex);
    
    // Initialize TLAS stack pointer
    var tlas_sp: u32 = 0u;

    // Push root node onto the TLAS shared stack
    sharedStack[tlasStackBase + tlas_sp] = 0u;
    tlas_sp += 1u;

    while tlas_sp > 0u {
        tlas_sp -= 1u;
        let nodeIdx: u32 = sharedStack[tlasStackBase + tlas_sp];
        let tlasNode = tlasNodes[nodeIdx];

        // Early AABB hit test
        let nodeDistance: f32 = hit_aabb(ray, tlasNode.aabbMin, tlasNode.aabbMax, inverseDir);
        if nodeDistance >= (*hit_point).dist {
            continue;
        }

        let isLeaf = (tlasNode.left == 0u) && (tlasNode.right == 0u);
        if isLeaf {
            let instance: BLASInstance = blasInstances[tlasNode.instanceIdx];
            var blasHit: HitPoint;
            blasHit.hit = false;
            blasHit.dist = (*hit_point).dist;

            // Call trace_blas with shared stack
            trace_blas(ray, instance, &blasHit, threadIndex, &tlas_sp);

            if blasHit.hit && blasHit.dist < (*hit_point).dist {
                (*hit_point) = blasHit;
                // Early exit if hit is very close
                if blasHit.dist < EPSILON {
                    break;
                }
            }
        } else {
            // Fetch child indices
            let leftIdx = tlasNode.left;
            let rightIdx = tlasNode.right;

            // Retrieve AABBs for children
            let leftAabbMin = tlasNodes[leftIdx].aabbMin;
            let leftAabbMax = tlasNodes[leftIdx].aabbMax;
            let rightAabbMin = tlasNodes[rightIdx].aabbMin;
            let rightAabbMax = tlasNodes[rightIdx].aabbMax;

            // Calculate intersection distances
            let leftDistance = hit_aabb(ray, leftAabbMin, leftAabbMax, inverseDir);
            let rightDistance = hit_aabb(ray, rightAabbMin, rightAabbMax, inverseDir);

            // Traverse closer child first
            if leftDistance < rightDistance {
                if rightIdx != 0u && rightDistance < (*hit_point).dist {
                    sharedStack[tlasStackBase + tlas_sp] = rightIdx;
                    tlas_sp += 1u;
                }
                if leftIdx != 0u && leftDistance < (*hit_point).dist {
                    sharedStack[tlasStackBase + tlas_sp] = leftIdx;
                    tlas_sp += 1u;
                }
            } else {
                if leftIdx != 0u && leftDistance < (*hit_point).dist {
                    sharedStack[tlasStackBase + tlas_sp] = leftIdx;
                    tlas_sp += 1u;
                }
                if rightIdx != 0u && rightDistance < (*hit_point).dist {
                    sharedStack[tlasStackBase + tlas_sp] = rightIdx;
                    tlas_sp += 1u;
                }
            }
        }
    }
}

fn trace_blas(
    ray: Ray,
    instance: BLASInstance,
    hit_point: ptr<function, HitPoint>,
    threadIndex: u32,
    tlas_sp: ptr<function, u32>
) {
    var nearestHit: f32 = (*hit_point).dist;

    // Transform the ray into object space
    var object_ray: Ray;
    object_ray.origin = (instance.invTransform * vec4<f32>(ray.origin, 1.0)).xyz;
    object_ray.direction = (instance.invTransform * vec4<f32>(ray.direction, 0.0)).xyz;
    let inverseDir: vec3<f32> = 1.0 / object_ray.direction;

    // Cache material
    let material: Material = meshMaterial[instance.materialIdx];

    // Calculate the base index for BLAS stack slice
    let blasStackBase: u32 = get_blas_stack_base(threadIndex);
    
    // Initialize BLAS stack pointer
    var blas_sp: u32 = 0u;

    // Push root node onto the BLAS shared stack
    sharedStack[blasStackBase + blas_sp] = instance.blasOffset;
    blas_sp += 1u;

    while blas_sp > 0u {
        blas_sp -= 1u;
        let nodeIdx: u32 = sharedStack[blasStackBase + blas_sp];
        let node: BLASNode = blasNodes[nodeIdx];

        let hitDistance: f32 = hit_aabb(object_ray, node.aabbMin, node.aabbMax, inverseDir);

        if hitDistance >= nearestHit {
            continue;
        }

        let triCount: u32 = node.triCount;
        let leftFirst: u32 = node.leftFirst;

        if triCount > 0u {
            // Leaf node: Test all triangles
            var i: u32 = 0u;
            loop {
                if i >= triCount || i >= 2u {
                    break;
                }
                let triIdx: u32 = triIdxInfo[leftFirst + i];
                let triangle: Triangle = meshTriangles[triIdx];
                var triangleHitPoint: HitPoint;
                triangleHitPoint.hit = false;
                triangleHitPoint.dist = nearestHit;

                // Pass pointer to triangleHitPoint
                hit_triangle(object_ray, triangle, 0.001, nearestHit, &triangleHitPoint);

                if triangleHitPoint.hit && triangleHitPoint.dist < nearestHit {
                    nearestHit = triangleHitPoint.dist;
                    (*hit_point) = triangleHitPoint;
                    (*hit_point).normal = normalize((instance.transform * vec4<f32>((*hit_point).normal, 0.0)).xyz);
                    (*hit_point).material = material;
                }
                i += 1u;
            }
        } else {
            // Internal node: Traverse children in front-to-back order
            let childIdx1: u32 = node.leftFirst;
            let childIdx2: u32 = node.leftFirst + 1u;

            let child1: BLASNode = blasNodes[childIdx1];
            let child2: BLASNode = blasNodes[childIdx2];

            let hitDist1: f32 = hit_aabb(object_ray, child1.aabbMin, child1.aabbMax, inverseDir);
            let hitDist2: f32 = hit_aabb(object_ray, child2.aabbMin, child2.aabbMax, inverseDir);

            // Push the farther child first to ensure front-to-back traversal
            if hitDist1 < hitDist2 {
                if hitDist2 < nearestHit {
                    sharedStack[blasStackBase + blas_sp] = childIdx2;
                    blas_sp += 1u;
                }
                if hitDist1 < nearestHit {
                    sharedStack[blasStackBase + blas_sp] = childIdx1;
                    blas_sp += 1u;
                }
            } else {
                if hitDist1 < nearestHit {
                    sharedStack[blasStackBase + blas_sp] = childIdx1;
                    blas_sp += 1u;
                }
                if hitDist2 < nearestHit {
                    sharedStack[blasStackBase + blas_sp] = childIdx2;
                    blas_sp += 1u;
                }
            }
        }
    }

    // Update hit_point.dist if necessary
    (*hit_point).dist = nearestHit;
}


fn hit_triangle(
    ray: Ray,
    tri: Triangle,
    tMin: f32,
    tMax: f32,
    hit_point: ptr<function, HitPoint>
) {
    let h = cross(ray.direction, tri.edge2);
    let a = dot(tri.edge1, h);

    // Early rejection based on backface culling and parallelism
    if (a < EPSILON && setting.BACKFACE_CULLING == 1.0) || abs(a) < EPSILON {
        return;
    }

    let f = 1.0 / a;
    let s = ray.origin - tri.corner_a;
    let u = f * dot(s, h);

    if u < 0.0 || u > 1.0 {
        return;
    }

    let q = cross(s, tri.edge1);
    let v = f * dot(ray.direction, q);

    if v < 0.0 || (u + v) > 1.0 {
        return;
    }

    let dist = f * dot(tri.edge2, q);

    if dist < tMin || dist > tMax {
        return;
    }

    let interpolated_normal = tri.normal_a * (1.0 - u - v) + tri.normal_b * u + tri.normal_c * v;
    let dotProduct = dot(ray.direction, interpolated_normal);
    let frontFace = dotProduct < 0.0;
    let finalNormal = select(interpolated_normal, -interpolated_normal, !frontFace);

    (*hit_point).dist = dist;
    (*hit_point).hit = true;
    (*hit_point).normal = finalNormal;
    (*hit_point).from_front = frontFace;
}


fn hit_aabb(ray: Ray, aabbMin: vec3<f32>, aabbMax: vec3<f32>, inverseDir: vec3<f32>) -> f32 {
    let t1: vec3<f32> = (aabbMin - ray.origin) * inverseDir;
    let t2: vec3<f32> = (aabbMax - ray.origin) * inverseDir;

    let tMin: vec3<f32> = min(t1, t2);
    let tMax: vec3<f32> = max(t1, t2);
    let t_min: f32 = max(max(tMin.x, tMin.y), tMin.z);
    let t_max: f32 = min(min(tMax.x, tMax.y), tMax.z);

    let condition: bool = (t_min > t_max) || (t_max < 0.0);
    return select(t_min, T_MAX, condition);
}

fn is_on_border(point: vec3<f32>, aabbMin: vec3<f32>, aabbMax: vec3<f32>, epsilon: f32) -> bool {
    var count: u32 = 0u;

    // Check proximity to each face
    if abs(point.x - aabbMin.x) < epsilon { count = count + 1u; }
    if abs(point.x - aabbMax.x) < epsilon { count = count + 1u; }
    if abs(point.y - aabbMin.y) < epsilon { count = count + 1u; }
    if abs(point.y - aabbMax.y) < epsilon { count = count + 1u; }
    if abs(point.z - aabbMin.z) < epsilon { count = count + 1u; }
    if abs(point.z - aabbMax.z) < epsilon { count = count + 1u; }

    // A point is on the border if it's near two or more faces (edges or corners)
    return count >= 2u;
}

//let intersectionPoint: vec3<f32> = ray.origin + distance * ray.direction;

//if DEBUG {
//    // Check if the intersection is on the border
//    if is_on_border(intersectionPoint, node.aabbMin, node.aabbMax, 0.01) {
//        closestHit.hit = true;
//        closestHit.material.albedo = vec3<f32>(1.0, 0.0, 0.0);
//        return closestHit;
//    }
//}