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
    albedo: vec3f,
    specChance: f32,
    specColor: vec3f,
    specRoughness: f32,
    emissionColor: vec3f,
    emissionStrength: f32,
    refrColor: vec3f,
    refrChance: f32,
    refrRoughness: f32,
    ior: f32,
}

struct Triangle {
    corner_a: vec3f,
    normal_a: vec3f,
    corner_b: vec3f,
    normal_b: vec3f,
    corner_c: vec3f,
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
	frameNum: f32,
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

// Group 3: Textures and Samplers
@group(3) @binding(0) var skyTexture : texture_cube<f32>;
@group(3) @binding(1) var skySampler : sampler;


const EPSILON : f32 = 0.00001;
const PI  = 3.14159265358979323846;
const TWO_PI: f32 = 6.28318530718;
const INV_PI: f32 = 0.31830988618;
const TLAS_STACK_SIZE: u32 = 64u;
const BLAS_STACK_SIZE: u32 = 32u;
const T_MIN = 0.001f;
const T_MAX = 10000f;
const DEBUG = false;

var<private> pixelCoords : vec2f;
var<private> randState : u32 = 0u;

var<workgroup> accumulated_radiance: vec3f;
var<workgroup> rng_seed: u32;
override WORKGROUP_SIZE_X: u32;
override WORKGROUP_SIZE_Y: u32;

var<workgroup> sharedAccumulatedColor: array<vec3f, 64>;

@compute @workgroup_size(WORKGROUP_SIZE_X, WORKGROUP_SIZE_Y)
fn main(
    @builtin(global_invocation_id) global_id: vec3u,
    @builtin(workgroup_id) workgroup_id: vec3<u32>,
    @builtin(local_invocation_id) local_invocation_id: vec3<u32>,
    @builtin(local_invocation_index) local_invocation_index: u32,
    @builtin(num_workgroups) num_workgroups: vec3<u32>
) {
    if global_id.x >= u32(uniforms.screenDims.x) * u32(uniforms.screenDims.y) {
        return;
    }

    let dimensions = uniforms.screenDims;
    let coord = vec2u(workgroup_id.x * WORKGROUP_SIZE_X + local_invocation_id.x, workgroup_id.y * WORKGROUP_SIZE_Y + local_invocation_id.y);
    let idx = coord.y * u32(dimensions.x) + coord.x;

    // Calculate the pixel coordinates
    let pixelCoords = vec2<f32>(f32(coord.x), f32(coord.y));

    // Random state initialization
    randState = idx + u32(uniforms.frameNum) * 719393;

    // Precompute constants outside the loops
    let sqrt_spp = sqrt(f32(setting.numSamples));
    let recip_sqrt_spp = 1.0 / sqrt_spp;
    let jitter_scale_half = setting.jitterScale * 0.5;
    let half_screen_dims = vec2<f32>(dimensions.xy) * 0.5;
    let cam_fwd = cam.forward;
    let cam_right = cam.right;
    let cam_up = cam.up;
    let cam_pos = cam.pos;
    let cam_fov = cam_setting.cameraFOV;
    let focus_dist = cam_setting.focusDistance;
    let aspect_ratio = setting.aspectRatio;

    rng_seed = idx + u32(uniforms.frameNum) * 719393 + local_invocation_index;


    var sampleCount = 0.0;
    var myRay: Ray;
    sharedAccumulatedColor[local_invocation_index] = vec3<f32>(0.0);

    for (var i: f32 = 0.0; i < sqrt_spp; i = i + 1.0) {
        for (var j: f32 = 0.0; j < sqrt_spp; j = j + 1.0) {
            // Generate stratified samples
            let stratifiedSample = (vec2<f32>(i, j) + vec2<f32>(xor_shift(randState), xor_shift(randState))) * recip_sqrt_spp;
        
            // Calculate screen jittered coordinates
            let screen_jittered = pixelCoords + stratifiedSample - half_screen_dims;
        
            // Calculate ray direction
            let horizontal_coeff = cam_fov * screen_jittered.x / dimensions.x;
            let vertical_coeff = cam_fov * screen_jittered.y / (dimensions.y * aspect_ratio);
            myRay.direction = normalize(cam_fwd + horizontal_coeff * cam_right + vertical_coeff * cam_up);
        
            // Calculate lens point and origin
            let lens_point = vec2<f32>(xor_shift(randState), xor_shift(randState)) * cam_setting.apertureSize;
            myRay.origin = cam_pos + cam_right * lens_point.x + cam_up * lens_point.y;
        
            // Adjust ray direction based on focus point
            let focus_point = cam_pos + myRay.direction * focus_dist;
            myRay.direction = normalize(focus_point - myRay.origin);
        
            // Trace the ray and accumulate color
            sharedAccumulatedColor[local_invocation_index] += trace(myRay) * recip_sqrt_spp;

            sampleCount += 1.0;
        }
    }

    var acc_radiance = sharedAccumulatedColor[local_invocation_index] / sampleCount;

    if uniforms.resetBuffer == 0.0 {
        acc_radiance += framebuffer[idx].xyz;
    }

    framebuffer[idx] = vec4<f32>(acc_radiance, 1.0);
}

fn trace(camRay: Ray) -> vec3f {
    var ray = camRay;
    var acc_radiance: vec3f = vec3(0.0, 0.0, 0.0);
    var throughput = vec3(1.0, 1.0, 1.0);
    var regularBounces: u32 = 1u;

    let maxBounces = u32(setting.maxBounces);
    let skyTextureEnabled = setting.SKY_TEXTURE == 1.0;

    for (var bounce: u32 = 0u; bounce < maxBounces; bounce++) {
        let hit = trace_tlas(ray, T_MAX);

        if !hit.hit {
            acc_radiance += throughput * select(vec3(0.8), textureSampleLevel(skyTexture, skySampler, ray.direction, 0.0).xyz, skyTextureEnabled);
            break;
        }
        var M = hit.material;
        var originalEnergy = throughput;
        M = ensure_energy_conservation(M);
        
        // Absorption if inside the object
        if hit.from_front {
            throughput *= exp(-M.refrColor * hit.dist);
        }

        let n1 = select(1.0, M.ior, !hit.from_front);
        let n2 = select(1.0, M.ior, hit.from_front);

        // Fresnel effect
        var specChance = M.specChance;
        var refrChance = M.refrChance;
        if specChance > 0.1 {
            refrChance *= (1.0 - specChance) / (1.0 - M.specChance);
        }

        // Ray type determination
        let randVal = rand2D();
        var rayType = determine_ray_type(specChance, refrChance, randVal);
        regularBounces = rayType.regularBounces;

        // Max bounces for diffuse materials
        if regularBounces >= 4u && rayType.isSpecular == 0.0 {
            break;
        }

        // Ray position update
        ray.origin = update_ray_origin(ray, hit, rayType.isRefractive);

        // New ray direction
        var specularDir = calculate_specular_dir(ray, hit);
        var refractDir = calculate_refract_dir(ray, hit, n1, n2);
        ray.direction = mix(mix(cosine_weighted_sampling_hemisphere(hit.normal), specularDir, rayType.isSpecular), refractDir, rayType.isRefractive);

        acc_radiance += throughput * M.emissionColor * M.emissionStrength;

        // Update throughput
        if rayType.isRefractive == 0.0 {
            throughput = originalEnergy * (M.albedo + M.specColor * rayType.isSpecular);
        }

        // Russian roulette
        if bounce > 2u {
            let rr_prob = max(throughput.r, max(throughput.g, throughput.b));
            let rr_threshold = 0.2;
            if rand2D() >= rr_prob * rr_threshold || length(throughput) < 0.001 {
                break;
            }
            throughput /= rr_prob;
        }
    }
    return acc_radiance;
}

fn update_ray_origin(ray: Ray, hit: HitPoint, isRefractive: f32) -> vec3f {
    return select(
        (ray.origin + ray.direction * hit.dist) + hit.normal * EPSILON,
        (ray.origin + ray.direction * hit.dist) - hit.normal * EPSILON,
        isRefractive == 1.0
    );
}

fn calculate_refract_dir(ray: Ray, hit: HitPoint, n1: f32, n2: f32) -> vec3f {
    return normalize(mix(refract(ray.direction, hit.normal, n1 / n2), cosine_weighted_sampling_hemisphere(-hit.normal), hit.material.refrRoughness * hit.material.refrRoughness));
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

fn calculate_specular_dir(ray: Ray, hit: HitPoint) -> vec3<f32> {
    let V = -ray.direction;
    let H = sample_ggx_importance(hit.material.specRoughness, hit.normal);
    let L = reflect(-V, H);

    if dot(L, hit.normal) <= 0.0 {
        return vec3<f32>(0.0, 0.0, 0.0);
    }

    return L;
}

fn ensure_energy_conservation(material: Material) -> Material {
    var M: Material = material;
    let sum = M.albedo + M.specColor + M.refrColor;
    let maxSum = max(sum.r, max(sum.g, sum.b));
    if maxSum > 1.0 {
        let factor = 1.0 / maxSum;
        M.albedo *= factor;
        M.specColor *= factor;
        M.refrColor *= factor;
    }
    return M;
}

fn sample_ggx_importance(roughness: f32, N: vec3<f32>) -> vec3<f32> {
    let alpha = roughness * roughness;
    let u1 = rand2D();
    let u2 = rand2D();

    let phi = TWO_PI * u1;
    let cosTheta = sqrt((1.0 - u2) / (1.0 + (alpha * alpha - 1.0) * u2));
    let sinTheta = sqrt(max(0.0, 1.0 - cosTheta * cosTheta));

    // Importance sampling the hemisphere in the direction of the normal
    let H = vec3<f32>(
        sinTheta * cos(phi),
        sinTheta * sin(phi),
        cosTheta
    );

    // Transform the sampled vector to the surface'stack local coordinate system
    var up: vec3<f32> = select(vec3<f32>(0.0, 0.0, 1.0), vec3<f32>(1.0, 0.0, 0.0), abs(N.z) >= 0.999);
    let T = normalize(cross(up, N));
    let B = cross(N, T);

    return normalize(T * H.x + B * H.y + N * H.z);
}

fn cosine_weighted_sampling_hemisphere(normal: vec3f) -> vec3f {
    let r1 = rand2D();
    let r2 = rand2D();
    let r = sqrt(r1);
    let theta = TWO_PI * r2;

    let x = r * cos(theta);
    let y = r * sin(theta);
    let z = sqrt(1.0 - r1);

    // Build an orthonormal basis (u, v, w)
    var w = normalize(normal);
    var a = select(vec3(0.0, 1.0, 0.0), vec3(1.0, 0.0, 0.0), abs(w.y) > 0.99);
    var u = normalize(cross(a, w));
    var v = cross(w, u);

    return normalize(u * x + v * y + w * z);
}

fn xor_shift(state: u32) -> f32 {
    var newState = state ^ (state << 13u);
    newState ^= (newState >> 17u);
    newState ^= (newState << 5u);
    return f32(newState & 0xFFFFFFFu) / f32(0x10000000u);
}

fn rand2D() -> f32 {
    randState = randState * 747796405u + 2891336453u;
    var word: u32 = ((randState >> ((randState >> 28u) + 4u)) ^ randState) * 277803737u;
    return f32((word >> 22u) ^ word) / 4294967295;
}

fn trace_tlas(ray: Ray, tMax: f32) -> HitPoint {
    var closestHit: HitPoint;
    closestHit.hit = false;
    closestHit.dist = tMax;

    var stack: array<u32, 64>;
    var stackPtr: u32 = 0u;
    stack[stackPtr] = 0u; // Start with root node index 0
    stackPtr += 1u;

    while stackPtr > 0u {
        stackPtr -= 1u;
        let nodeIdx: u32 = stack[stackPtr];
        let node: TLASNode = tlasNodes[nodeIdx];

        // Perform AABB intersection
        let distance: f32 = hit_aabb(ray, node.aabbMin, node.aabbMax);
        if distance > closestHit.dist {
            continue; // No intersection within current closest hit
        }

        // Calculate the intersection point
        let intersectionPoint: vec3<f32> = ray.origin + distance * ray.direction;

        if DEBUG {
            // Check if the intersection is on the border
            if is_on_border(intersectionPoint, node.aabbMin, node.aabbMax, 0.01) { // epsilon = 0.01
                closestHit.hit = true;
                closestHit.material.albedo = vec3<f32>(1.0, 0.0, 0.0); // Red color
                return closestHit;
            }
        }

        if node.left == 0u && node.right == 0u {
            // **Leaf Node:** Process BLAS instance
            let instanceIdx: u32 = node.instanceIdx; // Ensure 'instanceIdx' is correctly referenced
            let instance: BLASInstance = blasInstances[instanceIdx];

            // Trace against the BLAS
            let blasHit: HitPoint = trace_blas(ray, instance, closestHit.dist, closestHit);
            if blasHit.hit && blasHit.dist < closestHit.dist {
                closestHit = blasHit;
            }
        } else {
            // **Internal Node:** Push child nodes to stack
            stack[stackPtr] = node.left;
            stackPtr += 1u;
            stack[stackPtr] = node.right;
            stackPtr += 1u;
        }
    }

    return closestHit;
}

fn trace_blas(ray: Ray, instance: BLASInstance, nearestHit: f32, renderState: HitPoint) -> HitPoint {
    var object_ray: Ray;
    object_ray.origin = (instance.invTransform * vec4<f32>(ray.origin, 1.0)).xyz;
    object_ray.direction = normalize((instance.invTransform * vec4<f32>(ray.direction, 0.0)).xyz);

    var blasRenderState: HitPoint = renderState;
    blasRenderState.hit = false;

    var blasNearestHit: f32 = nearestHit;

    var stack: array<u32, 64>;
    var stackLocation: u32 = 0u;
    stack[stackLocation] = instance.blasOffset; // Start with root node of BLAS
    stackLocation += 1u;

    loop {
        if stackLocation == 0u {
            break;
        }

        stackLocation -= 1u;
        let nodeIdx: u32 = stack[stackLocation];
        let node: BLASNode = blasNodes[nodeIdx];

        // Perform AABB intersection
        let distance: f32 = hit_aabb(object_ray, node.aabbMin, node.aabbMax);
        if distance > blasNearestHit {
            continue; // No intersection within current closest hit
        }

        if node.triCount == 0u {
            // **Internal Node:** Push child nodes to stack
            var leftChildIdx: u32 = node.leftFirst;
            var rightChildIdx: u32 = node.leftFirst + 1u;

            // Perform AABB intersection for child nodes
            var distLeft: f32 = hit_aabb(object_ray, blasNodes[leftChildIdx].aabbMin, blasNodes[leftChildIdx].aabbMax);
            var distRight: f32 = hit_aabb(object_ray, blasNodes[rightChildIdx].aabbMin, blasNodes[rightChildIdx].aabbMax);

            // Sort children based on distance
            if distLeft > distRight {
                // Swap
                var tempDist: f32 = distLeft;
                distLeft = distRight;
                distRight = tempDist;

                var tempIdx: u32 = leftChildIdx;
                leftChildIdx = rightChildIdx;
                rightChildIdx = tempIdx;
            }

            // Push children to stack if they intersect within the nearest hit distance
            if distLeft < blasNearestHit {
                stack[stackLocation] = leftChildIdx;
                stackLocation += 1u;
            }

            if distRight < blasNearestHit {
                stack[stackLocation] = rightChildIdx;
                stackLocation += 1u;
            }
        } else {
            // **Leaf Node with Triangles:** Process all triangles

            let firstTriIdx: u32 = node.leftFirst;
            let triCount: u32 = node.triCount;

            for (var i: u32 = 0u; i < triCount; i = i + 1u) {
                let triIdx: u32 = triIdxInfo[firstTriIdx + i];
                let triangle: Triangle = meshTriangles[triIdx];

                let newRenderState: HitPoint = hit_triangle(object_ray, triangle, 0.001, blasNearestHit, blasRenderState);
                if newRenderState.hit && newRenderState.dist < blasNearestHit {
                    blasNearestHit = newRenderState.dist;
                    blasRenderState = newRenderState;
                }
            }
        }
    }

    if blasRenderState.hit {
        // **Transform normal back to world space**
        blasRenderState.normal = normalize(
            (transpose(instance.invTransform) * vec4<f32>(blasRenderState.normal, 0.0)).xyz
        );

        // Set material from the instance's material index
        blasRenderState.material = meshMaterial[instance.materialIdx];
    }

    return blasRenderState;
}

fn hit_triangle(ray: Ray, tri: Triangle, tMin: f32, tMax: f32, renderState: HitPoint) -> HitPoint {
    var surfacePoint: HitPoint = renderState;
    surfacePoint.hit = false;

    let edge_1: vec3<f32> = tri.corner_b - tri.corner_a;
    let edge_2: vec3<f32> = tri.corner_c - tri.corner_a;

    let h: vec3<f32> = cross(ray.direction, edge_2);
    let a: f32 = dot(edge_1, h);

    if a > -EPSILON && a < EPSILON {
        return surfacePoint; // Ray is parallel to triangle
    }

    let f: f32 = 1.0 / a;
    let s: vec3<f32> = ray.origin - tri.corner_a;
    let u: f32 = f * dot(s, h);

    if u < 0.0 || u > 1.0 {
        return surfacePoint;
    }

    let q: vec3<f32> = cross(s, edge_1);
    let v: f32 = f * dot(ray.direction, q);

    if v < 0.0 || u + v > 1.0 {
        return surfacePoint;
    }

    let dist: f32 = f * dot(edge_2, q);

    if dist < tMin || dist > tMax {
        return surfacePoint;
    }

    // Calculate the interpolated normal
    let interpolated_normal: vec3<f32> = normalize(
        tri.normal_a * (1.0 - u - v) + tri.normal_b * u + tri.normal_c * v
    );

    // Determine if the hit is from the front
    let is_front_hit: bool = dot(ray.direction, interpolated_normal) < 0.0;

    // Apply backface culling if enabled
    if setting.BACKFACE_CULLING > 0.5 && !is_front_hit {
        return surfacePoint; // Cull the back face hit
    }

    // Set the normal to always point against the ray direction using `select`
    surfacePoint.normal = select(-interpolated_normal, interpolated_normal, is_front_hit);
    surfacePoint.dist = dist;
    surfacePoint.hit = true;
    surfacePoint.from_front = is_front_hit;

    return surfacePoint;
}


fn hit_aabb(ray: Ray, aabbMin: vec3<f32>, aabbMax: vec3<f32>) -> f32 {
    let inverseDir: vec3<f32> = 1.0 / ray.direction;
    let t1: vec3<f32> = (aabbMin - ray.origin) * inverseDir;
    let t2: vec3<f32> = (aabbMax - ray.origin) * inverseDir;
    let tMin: vec3<f32> = min(t1, t2);
    let tMax: vec3<f32> = max(t1, t2);

    let t_min: f32 = max(max(tMin.x, tMin.y), tMin.z);
    let t_max: f32 = min(min(tMax.x, tMax.y), tMax.z);

    if t_min > t_max || t_max < 0.0 {
        return 99999.0; // No intersection
    } else {
        return max(t_min, 0.0); // Clamp to zero to handle rays inside AABB
    }
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

