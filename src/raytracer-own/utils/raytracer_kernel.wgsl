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

struct Mesh {
	num_triangles: i32,
	offset: i32,
	global_id: i32,
	material_id: i32
}

struct ObjectData {
    triangles: array<Triangle>,
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

struct SurfacePoint {
    material: Material,
    position: vec3f,
    dist: f32,
    normal: vec3f,
    hit: bool,
    from_front: bool,
}

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

// Group 3: Textures and Samplers
@group(3) @binding(0) var skyTexture : texture_cube<f32>;
@group(3) @binding(1) var skySampler : sampler;


const EPSILON : f32 = 0.00001;
const PI  = 3.14159265358979323846;
const TWO_PI: f32 = 6.28318530718;
const RR_Scale: f32 = 0.3;

var<private> pixelCoords : vec2f;
var<private> randState : u32 = 0u;

override WORKGROUP_SIZE_X: u32;
override WORKGROUP_SIZE_Y: u32;

@compute @workgroup_size(WORKGROUP_SIZE_X, WORKGROUP_SIZE_Y, 1)
fn main(
    @builtin(global_invocation_id) global_id: vec3u, @builtin(workgroup_id) workgroup_id: vec3<u32>,
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
    
    // Accumulated color initialization
    var accumulatedColor = vec3f(0.0);

    // Stratification parameters
    let sqrt_spp = sqrt(setting.numSamples);
    let recip_sqrt_spp = 1.0 / sqrt_spp;
    var sampleCount = 0.0;
    // Initialize a new ray
    var myRay: Ray;
    myRay.origin = cam.pos;

    // Path tracing loop with stratification
    for (var i: f32 = 0.0; i < sqrt_spp; i = i + 1.0) {
        for (var j: f32 = 0.0; j < sqrt_spp; j = j + 1.0) {

            let lens_point = vec2<f32>(lcg_random(randState), lcg_random(randState)) * cam_setting.apertureSize;
            let jitter = (vec2<f32>(lcg_random(randState), lcg_random(randState)) - 0.5) * setting.jitterScale;
            let stratifiedSample = vec2<f32>(i + lcg_random(randState), j + lcg_random(randState)) * recip_sqrt_spp;
            let screen_jittered = vec2<f32>(pixelCoords) + stratifiedSample + jitter - vec2<f32>(dimensions.xy) / 2.0;

            let horizontal_coeff = cam_setting.cameraFOV * screen_jittered.x / dimensions.x;
            let vertical_coeff = cam_setting.cameraFOV * screen_jittered.y / (dimensions.y * setting.aspectRatio);
            myRay.direction = normalize(cam.forward + horizontal_coeff * cam.right + vertical_coeff * cam.up);

            myRay.origin += cam.right * lens_point.x + cam.up * lens_point.y;

            let focus_point = cam.pos + myRay.direction * cam_setting.focusDistance;

            myRay.direction = normalize(focus_point - myRay.origin);

            accumulatedColor += trace(myRay);
            sampleCount += 1.0;
        }
    }

    // Final fragment color
    accumulatedColor /= sampleCount;

    if uniforms.resetBuffer == 0.0 {
        accumulatedColor += framebuffer[idx].xyz;
    }

    // Write the final color to the framebuffer
    framebuffer[idx] = vec4<f32>(accumulatedColor, 1.0);
}


//https://blog.demofox.org/2020/06/14/casual-shadertoy-path-tracing-3-fresnel-rough-refraction-absorption-orbit-cam/
fn trace(camRay: Ray) -> vec3f {
    var ray = camRay;
    var accumulatedColor: vec3f = vec3(0.0, 0.0, 0.0);
    var energy = vec3(1.0, 1.0, 1.0);
    var regularBounces: u32 = 1u;

    for (var bounce: u32 = 0u; bounce < u32(setting.maxBounces); bounce++) {

        let hit = traverse(ray);

        if !hit.hit {
            accumulatedColor += energy * select(vec3(0.0), textureSampleLevel(skyTexture, skySampler, ray.direction, 0.0).xyz, setting.SKY_TEXTURE == 1.0);
            break;
        } else {

            var originalEnergy = energy;

            // Absorption if inside the object
            energy *= select(vec3(1.0), exp(-hit.material.refrColor * hit.dist), hit.from_front);

            let n1 = select(1.0, hit.material.ior, !hit.from_front);
            let n2 = select(1.0, hit.material.ior, hit.from_front);

            // Pre-fresnel chances
            var specChance = hit.material.specChance;
            var refrChance = hit.material.refrChance;

            // Fresnel effect
            if specChance > 0.1 {
            //specChance = FresnelReflectAmount(n1, n2, hit.normal, ray.direction, specChance, 1.0);
                let chanceMultiplier = (1.0 - specChance) / (1.0 - hit.material.specChance);
                refrChance *= chanceMultiplier;
            }

            // Ray type determination
            var isSpecular: f32 = 0.0;
            var isRefractive: f32 = 0.0;
            if (specChance > 0.0) && (rand2D() < specChance) {
                isSpecular = 1.0;
            } else if refrChance > 0.0 && rand2D() < specChance + refrChance {
                isRefractive = 1.0;
            } else {
                regularBounces += 1u;
            }

            // Max bounces for diffuse objects
            if regularBounces >= 4u && isSpecular == 0.0 {
            break;
            }
        
            // Ray position update
            ray.origin = select(
                (ray.origin + ray.direction * hit.dist) + hit.normal * EPSILON,
                (ray.origin + ray.direction * hit.dist) - hit.normal * EPSILON,
                isRefractive == 1.0
            );

            // New ray direction
            let diffuseDir = CosineWeightedHemisphereSample(hit.normal);
            var specularDir = reflect(ray.direction, hit.normal);
            var refractDir = refract(ray.direction, hit.normal, select(hit.material.ior, 1.0 / hit.material.ior, hit.from_front));

            specularDir = normalize(mix(specularDir, diffuseDir, hit.material.specRoughness * hit.material.specRoughness));
            refractDir = normalize(mix(refractDir, CosineWeightedHemisphereSample(-hit.normal), hit.material.refrRoughness * hit.material.refrRoughness));
            ray.direction = mix(mix(diffuseDir, specularDir, isSpecular), refractDir, isRefractive);

            accumulatedColor += energy * hit.material.emissionColor * hit.material.emissionStrength * vec3(2.0, 2.0, 2.0);

            // Update energy
            if isRefractive == 0.0 {
                energy = originalEnergy;
                energy *= hit.material.albedo + hit.material.specColor * isSpecular;
            }

            // Russian roulette
            let rr_prob = max(energy.r, max(energy.g, energy.b));
            if rand2D() >= rr_prob {
            break;
            }
            energy /= rr_prob;
        }
    }
    return accumulatedColor;
}

fn lcg_random(state: u32) -> f32 {
    var newState = state * 1664525u + 1013904223u;
    return f32(newState & 0xFFFFFFFu) / f32(0x10000000u);
}

fn rand2D() -> f32 {
    randState = randState * 747796405u + 2891336453u;
    var word: u32 = ((randState >> ((randState >> 28u) + 4u)) ^ randState) * 277803737u;
    return f32((word >> 22u) ^ word) / 4294967295;
}

fn CosineWeightedHemisphereSample(normal: vec3<f32>) -> vec3<f32> {
    let u = rand2D();
    let v = rand2D() + 1.0;
    // Spherical to Cartesian coordinates transformation
    let sin_phi = sqrt(u);
    let cos_phi = sqrt(1.0 - u);
    let cos_theta = cos(2.0 * PI * v);
    let sin_theta = sin(2.0 * PI * v);

    let x = cos_theta * sin_phi;
    let y = sin_theta * sin_phi;
    let z = cos_phi;

    //Einen up vektor erstellen der nicht parallel zur Normale ist
    let up = select(vec3(1.0, 0.0, 0.0), vec3(0.0, 0.0, 1.0), (abs(normal.z) < 0.99));

    //Orthonormalbasis: zwei vektoren die senkrecht zur normale stehen (kreuzprodukt)
    let tangent = normalize(cross(up, normal));
    let bitangent = cross(normal, tangent);

    //Basisvektoren werden mit den karthesischen koordinaten kombiniert
    let dir = tangent * x + bitangent * y + normal * z;
    return normalize(dir);
}

fn uniform_random_in_unit_sphere() -> vec3f {
    let phi = rand2D() * 2.0 * PI;
    let theta = acos(2.0 * rand2D() - 1.0);

    let x = sin(theta) * cos(phi);
    let y = sin(theta) * sin(phi);
    let z = cos(theta);

    return normalize(vec3f(x, y, z));
}

// https://raytracing.github.io/books/RayTracingInOneWeekend.html#dielectrics/refraction
fn refract(e1: vec3<f32>, e2: vec3<f32>, e3: f32) -> vec3<f32> {
    let k: f32 = 1.0 - e3 * e3 * (1.0 - dot(e2, e1) * dot(e2, e1));
    if k < 0.0 {
        return vec3<f32>(0.0, 0.0, 0.0); // Total internal reflection, no refraction
    } else {
        return e3 * e1 - (e3 * dot(e2, e1) + sqrt(k)) * e2;
    }
}

fn FresnelReflectAmount(n1: f32, n2: f32, normal: vec3<f32>, incident: vec3<f32>, minReflectivity: f32, maxReflectivity: f32) -> f32 {
    let r0 = pow(((n1 - n2) / (n1 + n2)), 2.0);

    var cosX: f32 = -dot(normal, incident);
    cosX = clamp(cosX, -1.0, 1.0); // Clamping to avoid numerical issues

    if n1 > n2 {
        let n: f32 = n1 / n2;
        var sinT2: f32 = n * n * (1.0 - cosX * cosX);
        sinT2 = clamp(sinT2, 0.0, 1.0); // Clamping sinT2

        if sinT2 > 1.0 {
            return maxReflectivity;
        }
        cosX = sqrt(1.0 - sinT2);
    }

    let x: f32 = pow(1.0 - cosX, 5.0);
    let ret: f32 = r0 + (1.0 - r0) * x;

    // Adjust reflect multiplier for object reflectivity
    return mix(minReflectivity, maxReflectivity, ret);
}



fn traverse(ray: Ray) -> SurfacePoint {
    var surfacePoint: SurfacePoint;
    surfacePoint.hit = false;
    var nearestHit: f32 = 9999.0;

    var currentNode: Node = tree.nodes[0];
    var stack: array<Node, 20>;
    var stackLocation: u32 = 0u;

    while true {
        let triCount: u32 = u32(currentNode.triCount);
        let contents: u32 = u32(currentNode.leftFirst);

        if triCount == 0u {
            var child1: Node = tree.nodes[contents];
            var child2: Node = tree.nodes[contents + 1u];

            var distance1: f32 = hit_aabb(ray, child1);
            var distance2: f32 = hit_aabb(ray, child2);

            if distance1 > distance2 {
                let temp: f32 = distance1;
                distance1 = distance2;
                distance2 = temp;

                var tempChild: Node = child1;
                child1 = child2;
                child2 = tempChild;
            }

            if distance1 > nearestHit {
                if stackLocation == 0u {
                    break;
                } else {
                    stackLocation -= 1u;
                    currentNode = stack[stackLocation];
                }
            } else {
                currentNode = child1;
                if distance2 < nearestHit {
                    stack[stackLocation] = child2;
                    stackLocation += 1u;
                }
            }
        } else {
            for (var i: u32 = 0u; i < triCount; i++) {
                let newSurfacePoint: SurfacePoint = hit_triangle(
                    ray,
                    objects.triangles[u32(triIdx.idx[i + contents])],
                    0.0001,
                    nearestHit,
                    surfacePoint,
                );

                if newSurfacePoint.hit {
                    nearestHit = newSurfacePoint.dist;
                    surfacePoint = newSurfacePoint;
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
    oldSurfacePoint: SurfacePoint
) -> SurfacePoint {
    var surfacePoint: SurfacePoint;
    surfacePoint.hit = false;
    surfacePoint.material = oldSurfacePoint.material;

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

    //https://www.vaultcg.com/blog/casually-raytracing-in-webgpu-part1/
    let normal = normalize(tri.normal_b * u + tri.normal_c * v + tri.normal_a * (1.0 - u - v));
    surfacePoint.normal = normalize((transpose(mesh.materials[u32(tri.meshID)].inverseModel) * vec4(normal, 0.0)).xyz);

    surfacePoint.material = mesh.materials[u32(tri.meshID)];
    surfacePoint.dist = dist;
    surfacePoint.position = ray.origin + ray.direction * dist;
    surfacePoint.hit = true;

    // Determine if the ray hits the front face
    if dot(ray.direction, surfacePoint.normal) < 0.0 {
        surfacePoint.from_front = true;
    } else {
        surfacePoint.from_front = false;
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

