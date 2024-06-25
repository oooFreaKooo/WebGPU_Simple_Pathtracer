struct Node {
    aabbMin: vec3<f32>,
    leftFirst: f32,
    aabbMax: vec3<f32>,
    triCount: f32,
}

struct BVH {
    nodes: array<Node>,
}


struct Ray {
    direction: vec3<f32>,
    origin: vec3<f32>,
}

struct CameraData {
    pos: vec3<f32>,
    forward: vec3<f32>,
    right: vec3<f32>,
    up: vec3<f32>,
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
    inverseModel: mat4x4<f32>,
}


struct Triangle {
    corner_a: vec3f,
    normal_a: vec3f,
    corner_b: vec3f,
    normal_b: vec3f,
    corner_c: vec3f,
    normal_c: vec3f,
    meshID: f32,
}

struct MeshData {
    materials: array<Material>,
}

struct ObjectData {
    triangles: array<Triangle>,
}

struct LightData {
    position: vec3f,
    intensity: f32,
    color: vec3f,
    size: vec3f,
}

struct Light {
    lights: array<LightData>,
}

struct ObjectIndices {
    idx: array<f32>,
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
    position: vec3f,
    dist: f32,
    normal: vec3f,
    hit: bool,
    from_front: bool,
}

struct RayType {
    isSpecular: f32,
    isRefractive: f32,
    regularBounces: u32,
};

// Group 0: Uniforms and Settings
@group(0) @binding(0) var<uniform> uniforms : Uniforms;
@group(0) @binding(1) var<uniform> cam : CameraData;
@group(0) @binding(2) var<uniform> setting : Settings;
@group(0) @binding(3) var<uniform> cam_setting : CameraSettings;

// Group 1: Framebuffer
@group(1) @binding(0) var<storage, read_write> framebuffer: array<vec4f>;

// Group 2: Object and BVH Data
@group(2) @binding(0) var<storage, read> objects : ObjectData;
@group(2) @binding(1) var<storage, read> tree : BVH;
@group(2) @binding(2) var<storage, read> triIdx : ObjectIndices;
@group(2) @binding(3) var<storage, read> mesh : MeshData;
@group(2) @binding(4) var<storage, read> light : Light;

// Group 3: Textures and Samplers
@group(3) @binding(0) var skyTexture : texture_cube<f32>;
@group(3) @binding(1) var skySampler : sampler;


const EPSILON : f32 = 0.00001;
const PI  = 3.14159265358979323846;
const TWO_PI: f32 = 6.28318530718;
const INV_PI: f32 = 0.31830988618;
const RR_Scale: f32 = 0.3;
const NEE: bool = false;

var<private> pixelCoords : vec2f;
var<private> randState : u32 = 0u;

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
    pixelCoords = vec2f(f32(coord.x), f32(coord.y));

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

    var sampleCount = 0.0;
    var myRay: Ray;
    sharedAccumulatedColor[local_invocation_index] = vec3f(0.0);

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

    var accumulatedColor = sharedAccumulatedColor[local_invocation_index] / sampleCount;

    if uniforms.resetBuffer == 0.0 {
        accumulatedColor += framebuffer[idx].xyz;
    }

    framebuffer[idx] = vec4<f32>(accumulatedColor, 1.0);
}


//https://blog.demofox.org/2020/06/14/casual-shadertoy-path-tracing-3-fresnel-rough-refraction-absorption-orbit-cam/
fn trace(camRay: Ray) -> vec3f {
    var ray = camRay;
    var accumulatedColor: vec3f = vec3(0.0, 0.0, 0.0);
    var energy = vec3(1.0, 1.0, 1.0);
    var regularBounces: u32 = 1u;

    let maxBounces = u32(setting.maxBounces);
    let skyTextureEnabled = setting.SKY_TEXTURE == 1.0;

    for (var bounce: u32 = 0u; bounce < maxBounces; bounce++) {
        let hit = traverse(ray);

        if !hit.hit {
            accumulatedColor += energy * select(vec3(0.0), textureSampleLevel(skyTexture, skySampler, ray.direction, 0.0).xyz, skyTextureEnabled);
            break;
        }

        var originalEnergy = energy;

        // Absorption if inside the object
        if hit.from_front {
            energy *= exp(-hit.material.refrColor * hit.dist);
        }

        let n1 = select(1.0, hit.material.ior, !hit.from_front);
        let n2 = select(1.0, hit.material.ior, hit.from_front);

        // Fresnel effect
        var specChance = hit.material.specChance;
        var refrChance = hit.material.refrChance;
        if specChance > 0.1 {
            refrChance *= (1.0 - specChance) / (1.0 - hit.material.specChance);
        }

        // Ray type determination
        let randVal = rand2D();
        var rayType = determine_ray_type(specChance, refrChance, randVal);
        regularBounces = rayType.regularBounces;

        // Max bounces for diffuse objects
        if regularBounces >= 4u && rayType.isSpecular == 0.0 {
            break;
        }

        // Ray position update
        ray.origin = update_ray_origin(ray, hit, rayType.isRefractive);

        // New ray direction
        var specularDir = calculate_specular_dir(ray, hit);
        var refractDir = calculate_refract_dir(ray, hit, n1, n2);
        ray.direction = mix(mix(uniform_sampling_hemisphere(hit.normal), specularDir, rayType.isSpecular), refractDir, rayType.isRefractive);

        accumulatedColor += energy * hit.material.emissionColor * hit.material.emissionStrength * vec3(3.0, 3.0, 3.0);

        // Update energy
        if rayType.isRefractive == 0.0 {
            energy = originalEnergy * (hit.material.albedo + hit.material.specColor * rayType.isSpecular);
        }

        // Russian roulette
        let rr_prob = max(energy.r, max(energy.g, energy.b));
        if rand2D() >= rr_prob || length(energy) < 0.001 {
            break;
        }

        energy /= rr_prob;

        // Next Event Estimation (NEE)
        if NEE && rayType.isSpecular == 0.0 && rayType.isRefractive == 0.0 {
            var directLight: vec3f = vec3(0.0, 0.0, 0.0);
            for (var i: u32 = 0u; i < u32(setting.numLights); i++) {
                directLight += sampleLight(light.lights[i], hit) * hit.material.albedo;
            }
            accumulatedColor += energy * directLight;
        }
    }
    return accumulatedColor;
}


fn update_ray_origin(ray: Ray, hit: HitPoint, isRefractive: f32) -> vec3f {
    return select(
        (ray.origin + ray.direction * hit.dist) + hit.normal * EPSILON,
        (ray.origin + ray.direction * hit.dist) - hit.normal * EPSILON,
        isRefractive == 1.0
    );
}

fn calculate_specular_dir(ray: Ray, hit: HitPoint) -> vec3f {
    let alpha = hit.material.specRoughness * hit.material.specRoughness;
    let specularDir = normalize(reflect(ray.direction, hit.normal));
    let halfVector = normalize(ray.direction + specularDir);
    let NdotH = max(dot(hit.normal, halfVector), 0.0);
    let D = ggxDistribution(alpha, NdotH);
    return normalize(mix(specularDir, uniform_sampling_hemisphere(hit.normal), hit.material.specRoughness * hit.material.specRoughness));
}

fn calculate_refract_dir(ray: Ray, hit: HitPoint, n1: f32, n2: f32) -> vec3f {
    return normalize(mix(refract(ray.direction, hit.normal, n1 / n2), uniform_sampling_hemisphere(-hit.normal), hit.material.refrRoughness * hit.material.refrRoughness));
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


fn ggxDistribution(alpha: f32, NdotH: f32) -> f32 {
    let alpha2 = alpha * alpha;
    let NdotH2 = NdotH * NdotH;
    let denom = NdotH2 * (alpha2 - 1.0) + 1.0;
    return alpha2 * INV_PI / (denom * denom);
}


fn sampleLight(light: LightData, hit: HitPoint) -> vec3<f32> {
    let samples = 2u;
    var totalLightContribution = vec3<f32>(0.0, 0.0, 0.0);
    let invSamples = 1.0 / f32(samples);

    // Calculate tangent and bitangent once
    let tangent = normalize(cross(select(vec3<f32>(1.0, 0.0, 0.0), vec3<f32>(0.0, 1.0, 0.0), abs(hit.normal.x) > 0.1), hit.normal));
    let bitangent = cross(hit.normal, tangent);
    let normalMatrix = mat3x3<f32>(tangent, bitangent, hit.normal);

    for (var i: u32 = 0u; i < samples; i++) {
        let xi = (f32(i) + rand2D()) * invSamples;
        let phi = TWO_PI * rand2D();
        let r = sqrt(xi);
        let sampleDir = vec3<f32>(r * cos(phi), r * sin(phi), sqrt(max(0.0, 1.0 - xi)));

        let lightDir = normalize(normalMatrix * sampleDir);
        let lightPoint = light.position + lightDir * light.size;
        let lightVec = lightPoint - hit.position;
        let dist = length(lightVec);
        let dotNL = max(dot(hit.normal, lightDir), 0.0);
        let attenuation = 1.0 / (dist * dist);
        let lightContribution = dotNL * attenuation;

        // Directly accumulate light contribution
        totalLightContribution += light.color * clamp(lightContribution, 0.0, 10.0) * light.intensity * invSamples;
    }

    return totalLightContribution;
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


fn uniform_sampling_hemisphere(normal: vec3f) -> vec3f {
    let on_unit_sphere = uniform_random_in_unit_sphere();
    let sign_dot = select(1.0, 0.0, dot(on_unit_sphere, normal) > 0.0);
    return normalize(mix(on_unit_sphere, -on_unit_sphere, sign_dot));
}

fn uniform_random_in_unit_sphere() -> vec3f {
    let phi = rand2D() * TWO_PI;
    let theta = acos(2.0 * rand2D() - 1.0);

    let x = sin(theta) * cos(phi);
    let y = sin(theta) * sin(phi);
    let z = cos(theta);

    return normalize(vec3f(x, y, z));
}

fn traverse(ray: Ray) -> HitPoint {
    var surfacePoint: HitPoint;
    surfacePoint.hit = false;
    var nearestHit: f32 = 9999.0;

    var currentNode: Node = tree.nodes[0];
    var stack: array<Node, 10>; // Reduced stack size
    var stackLocation: u32 = 0u;

    loop {
        let triCount: u32 = u32(currentNode.triCount);
        let contents: u32 = u32(currentNode.leftFirst);

        if triCount == 0u {
            let child1: Node = tree.nodes[contents];
            let child2: Node = tree.nodes[contents + 1u];

            let distance1: f32 = hit_aabb(ray, child1);
            let distance2: f32 = hit_aabb(ray, child2);

            if distance1 < distance2 {
                if distance1 < nearestHit {
                    if distance2 < nearestHit {
                        stack[stackLocation] = child2;
                        stackLocation += 1u;
                    }
                    currentNode = child1;
                } else {
                    if stackLocation == 0u {
                        break;
                    } else {
                        stackLocation -= 1u;
                        currentNode = stack[stackLocation];
                    }
                }
            } else {
                if distance2 < nearestHit {
                    if distance1 < nearestHit {
                        stack[stackLocation] = child1;
                        stackLocation += 1u;
                    }
                    currentNode = child2;
                } else {
                    if stackLocation == 0u {
                        break;
                    } else {
                        stackLocation -= 1u;
                        currentNode = stack[stackLocation];
                    }
                }
            }
        } else {
            let end: u32 = contents + triCount;
            for (var i: u32 = contents; i < end; i++) {
                let triangle = objects.triangles[u32(triIdx.idx[i])];
                let newHitPoint: HitPoint = hit_triangle(ray, triangle, 0.0001, nearestHit, surfacePoint);

                if newHitPoint.hit {
                    nearestHit = newHitPoint.dist;
                    surfacePoint = newHitPoint;
                }
            }

            if stackLocation == 0u {
                break;
            } else {
                stackLocation -= 1u;
                currentNode = stack[stackLocation];
            }
        }
    }

    return surfacePoint;
}


// Möller–Trumbore intersection algorithm
fn hit_triangle(
    ray: Ray,
    tri: Triangle,
    tMin: f32,
    tMax: f32,
    oldHitPoint: HitPoint
) -> HitPoint {
    var surfacePoint: HitPoint;
    surfacePoint.hit = false;
    surfacePoint.material = oldHitPoint.material;

    let edge_1: vec3<f32> = tri.corner_b - tri.corner_a;
    let edge_2: vec3<f32> = tri.corner_c - tri.corner_a;

    let h: vec3<f32> = cross(ray.direction, edge_2);
    let a: f32 = dot(edge_1, h);

    if (a < EPSILON) && setting.BACKFACE_CULLING == 1.0 {
        return surfacePoint;
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

    // Normalize normal calculation
    let normal = normalize(tri.normal_b * u + tri.normal_c * v + tri.normal_a * (1.0 - u - v));
    surfacePoint.normal = normalize((transpose(mesh.materials[u32(tri.meshID)].inverseModel) * vec4(normal, 0.0)).xyz);

    surfacePoint.material = mesh.materials[u32(tri.meshID)];
    surfacePoint.dist = dist;
    surfacePoint.position = ray.origin + ray.direction * dist;
    surfacePoint.hit = true;

    // Determine if the ray hits the front face
    let frontFace = dot(ray.direction, surfacePoint.normal) < 0.0;
    surfacePoint.from_front = frontFace;
    if !frontFace {
        surfacePoint.normal = -surfacePoint.normal; // invert the normal for back face
    }
    return surfacePoint;
}

fn hit_aabb(ray: Ray, node: Node) -> f32 {
    var inverseDir: vec3<f32> = vec3(1.0) / ray.direction;
    var t1: vec3<f32> = (node.aabbMin - ray.origin) * inverseDir;
    var t2: vec3<f32> = (node.aabbMax - ray.origin) * inverseDir;
    var tMin: vec3<f32> = min(t1, t2);
    var tMax: vec3<f32> = max(t1, t2);
    var t_min: f32 = max(max(tMin.x, tMin.y), tMin.z);
    var t_max: f32 = min(min(tMax.x, tMax.y), tMax.z);

    if t_min > t_max || t_max < 0.0 {
        return 99999.0;
    } else {
        return t_min;
    }
}
