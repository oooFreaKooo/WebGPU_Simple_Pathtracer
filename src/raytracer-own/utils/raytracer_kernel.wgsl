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
    skyMode: f32,
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
const EPSILON: f32 = 1.0e-7;
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
    let coord = vec2u(
        workgroup_id.x * 8u + local_invocation_id.x,
        workgroup_id.y * 8u + local_invocation_id.y
    );
    let idx = coord.y * u32(DIMENSION.x) + coord.x;
    let pixelCoords = vec2<f32>(f32(coord.x), f32(coord.y));

    threadIndex = get_thread_index(local_invocation_id);
    // Random state initialization
    rngState = initialize_rng(coord * idx, uniforms.frameNum);

    // Precompute constants outside the loops
    let FOV = cam_setting.cameraFOV;
    let fov_over_dim_x = FOV / f32(DIMENSION.x);
    let fov_over_dim_y_ar = FOV / (f32(DIMENSION.y) * setting.aspectRatio);

    var myRay: Ray;
    myRay.origin = cam.pos;

    sharedAccumulatedColor[local_invocation_index] = vec3<f32>(0.0);
    var sampleCount = 0.0;

    for (var i: u32 = 0u; i < u32(setting.numSamples); i += 1u) {
        // Generate random offsets in x and y between -0.5 and 0.5
        let randOffset = rand2() - vec2f(0.5);

        // Adjust pixelCoords with random offsets
        let sampleCoords = pixelCoords + vec2<f32>(randOffset.x, randOffset.y) * setting.jitterScale;

        // Recompute screen_base, horizontal_coeff, vertical_coeff
        let screen_base = sampleCoords - (DIMENSION.xy) * 0.5;
        let horizontal_coeff = fov_over_dim_x * screen_base.x;
        let vertical_coeff = fov_over_dim_y_ar * screen_base.y;


        myRay.direction = normalize(
            cam.forward + horizontal_coeff * cam.right + vertical_coeff * cam.up
        );

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

    for (var bounce: u32 = 0u; bounce < maxBounces; bounce++) {

        // ------ Initialize hit and trace scene ------
        hit.hit = false;
        hit.dist = T_MAX;
        trace_tlas(ray, &hit);

        // ------ Handle sky radiance if no hit ------
        if !hit.hit {
            let sky_radiance = getSkyRadiance(ray.direction, setting.skyMode);
            acc_radiance = acc_radiance + throughput * sky_radiance;
            break;
        }

        let M = hit.material;

        // ------ Russian Roulette for path termination ------
        let rr_prob = max(max(throughput.r, throughput.g), throughput.b);
        if rr_prob < 0.1 || rand() >= rr_prob {
            break;
        }
        throughput /= rr_prob;

        // ------ Update throughput with absorption ------
        let absorption = select(vec3f(1.0), exp(-M.refrColor * 10.0), hit.from_front);
        throughput *= absorption;

        // ------ Precompute roughness squared ------
        let roughness2 = M.roughness * M.roughness;

        // ------ Determine ray type (diffuse, specular, refractive) ------
        var rayType: RayType;

        let rnd = rand();
        if M.specChance > 0.0 && rnd < M.specChance {
            rayType.isSpecular = 1.0;
        } else if M.refrChance > 0.0 && rnd < (M.specChance + M.refrChance) {
            rayType.isRefractive = 1.0;
        } else {
            rayType.regularBounces += 1u;
        }

        // ------ Early termination for diffuse rays ------
        if rayType.regularBounces >= 4u && rayType.isSpecular == 0.0 {
            break;
        }

        // ------ Update ray origin based on hit information and ray type ------
        let offset = select(hit.normal, -hit.normal, rayType.isRefractive == 1.0) * EPSILON;
        ray.origin = ray.origin + ray.direction * hit.dist + offset;

        // ------ Calculate refraction indices ------
        let n1 = select(1.0, M.ior, !hit.from_front);
        let n2 = select(1.0, M.ior, hit.from_front);

        // ------ Compute new ray directions ------

        // Diffuse direction
        let diffuseDir = cosine_weighted_hemisphere(hit.normal);

        // Specular direction
        var specularDir = reflect(ray.direction, hit.normal);
        specularDir = normalize(mix(specularDir, diffuseDir, roughness2));


        // Refractive direction
        var refractDir = refract(ray.direction, hit.normal, n1 / n2);
        let totalInternalReflection = length(refractDir) == 0.0;
        refractDir = select(refractDir, specularDir, totalInternalReflection);
        refractDir = normalize(mix(refractDir, cosine_weighted_hemisphere(-hit.normal), roughness2));

        // ------ Mix and update ray direction ------
        ray.direction = mix(
            mix(diffuseDir, specularDir, rayType.isSpecular),
            refractDir,
            rayType.isRefractive
        );

        // ------ Accumulate emission ------
        acc_radiance += throughput * M.emissionColor * M.emissionStrength;

        // ------ Handle subsurface scattering ------
        if M.sssStrength > 0.0 {
            let attenuation = exp(-length(ray.direction) / M.sssRadius);
            acc_radiance += throughput * (M.sssColor * M.sssStrength * attenuation);
            throughput *= (1.0 - M.sssStrength);
        }

        // ------ Update throughput with albedo and specular contribution ------
        throughput *= (M.albedo + M.specColor * rayType.isSpecular);
    }

    return acc_radiance;
}

fn getSkyRadiance(rayDirection: vec3<f32>, skyMode: f32) -> vec3<f32> {
    let skyModeInt = i32(skyMode);
    var sky_radiance: vec3<f32>;

    switch (skyModeInt) {
        case 0: { // Black Sky
            sky_radiance = vec3<f32>(0.0, 0.0, 0.0);
        }
        case 1: { // Procedural Sky
            sky_radiance = proceduralSky(rayDirection);
        }
        case 2: { // Sky Texture
            sky_radiance = textureSampleLevel(skyTexture, skySampler, rayDirection, 0.0).xyz;
        }
        default: {
            sky_radiance = vec3<f32>(0.0, 0.0, 0.0);
        }
    }

    return sky_radiance;
}

fn proceduralSky(direction: vec3<f32>) -> vec3<f32> {
    let sunDirection = normalize(vec3<f32>(0.0, 0.99, 0.5));
    let sunColor = vec3<f32>(1.0, 0.9, 0.6);
    let sunIntensity = max(dot(direction, sunDirection), 0.0);
    let horizonColor = vec3<f32>(0.8, 0.9, 1.0);
    let zenithColor = vec3<f32>(0.1, 0.4, 0.8);
    let t = clamp(direction.y * 0.5 + 0.5, 0.0, 1.0);
    let skyColor = mix(horizonColor, zenithColor, t);

    // Add sun glow
    let sunGlow = sunColor * pow(sunIntensity, 128.0);
    let color = skyColor + sunGlow;

    // Apply atmospheric attenuation
    let betaRayleigh = vec3<f32>(5.5e-6, 13.0e-6, 22.4e-6); // Rayleigh scattering coefficients
    let opticalDepth = exp(-direction.y * 0.1); // Simplified optical depth
    let atmosphericColor = color * exp(-betaRayleigh * opticalDepth);

    return clamp(atmosphericColor, vec3<f32>(0.0), vec3<f32>(1.0));
}


fn cosine_weighted_hemisphere(normal: vec3f) -> vec3f {
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

    // Early rejection based on u
    if u < 0.0 || u > 1.0 {
        return;
    }

    let q = cross(s, tri.edge1);
    let v = f * dot(ray.direction, q);

    if v < 0.0 || (u + v) > 1.0 {
        return;
    }

    let dist = f * dot(tri.edge2, q);

    // Early rejection based on distance
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