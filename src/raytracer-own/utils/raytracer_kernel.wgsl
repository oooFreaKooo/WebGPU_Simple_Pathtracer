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
    cameraFOV: f32,
    maxBounces: f32,
    numSamples: f32,
    BACKFACE_CULLING: f32,
    SKY_TEXTURE: f32,
    aspectRatio: f32,
    jitterScale: f32,
}

struct Uniforms {
	screenDims: vec2f,
	frameNum: f32,
	resetBuffer: f32,
}

struct AABB {
	min: vec3f,
	right_offset: f32,
	max: vec3f,

	prim_type: f32,
	prim_id: f32,
	prim_count: f32,
	skip_link: f32,
	axis: f32,
}

struct SurfacePoint {
    material: Material,
    position: vec3f,
    dist: f32,
    normal: vec3f,
    hit: bool,
    from_front: bool,
}

@group(0) @binding(0) var<uniform> uniforms : Uniforms;
@group(0) @binding(1) var<storage, read_write> framebuffer: array<vec4f>;
@group(0) @binding(2) var<uniform> cam : CameraData;
@group(0) @binding(3) var<storage, read> objects : ObjectData;
@group(0) @binding(4) var<storage, read> tree : BVH;
@group(0) @binding(5) var<storage, read> triIdx : ObjectIndices;
@group(0) @binding(6) var skyTexture : texture_cube<f32>;
@group(0) @binding(7) var skySampler : sampler;
@group(0) @binding(8) var<storage, read> mesh : MeshData;
@group(0) @binding(9) var<uniform> setting : Settings;

const EPSILON : f32 = 0.00001;
const PI  = 3.14159265358979323846;
const TWO_PI: f32 = 6.28318530718;
const STRATIFY: bool = true;

var<private> NUM_MESHES : i32;
var<private> NUM_TRIANGLES : i32;
var<private> NUM_AABB : i32;
var<private> pixelCoords : vec2f;
var<private> cam_origin : vec3f;
var<private> randState : u32 = 0u;

@compute @workgroup_size(8, 8, 1)
fn main(
    @builtin(workgroup_id) workgroup_id: vec3<u32>,
    @builtin(local_invocation_id) local_invocation_id: vec3<u32>,
    @builtin(local_invocation_index) local_invocation_index: u32,
    @builtin(num_workgroups) num_workgroups: vec3<u32>
) {
  // Calculate the global pixel index
    let global_x = workgroup_id.x * 8u + local_invocation_id.x;
    let global_y = workgroup_id.y * 8u + local_invocation_id.y;
    let pixelIndex = global_y * u32(uniforms.screenDims.x) + global_x;

    // Calculate the pixel coordinates
    pixelCoords = vec2f(f32(pixelIndex) % uniforms.screenDims.x, f32(pixelIndex) / uniforms.screenDims.x);

    // Random state initialization
    randState = pixelIndex + u32(uniforms.frameNum) * 719393u;
    // Accumulated color initialization
    var accumulatedColor = framebuffer[pixelIndex];

    if STRATIFY {
        // Stratification parameters
        let sqrt_spp = sqrt(f32(setting.numSamples));
        let recip_sqrt_spp = 1.0 / sqrt_spp;

        // Path tracing loop with stratification
        for (var i: f32 = 0.0; i < sqrt_spp; i = i + 1.0) {
            for (var j: f32 = 0.0; j < sqrt_spp; j = j + 1.0) {
                // Initialize a new ray
                var myRay: Ray;
                myRay.origin = cam.pos;

                // Generate jitter for anti-aliasing within each stratified cell
                let jitter = vec2<f32>(rand2D(), rand2D()) * setting.jitterScale;
                let stratifiedSample = vec2<f32>(i + rand2D(), j + rand2D()) * recip_sqrt_spp;
                let screen_jittered = vec2<f32>(pixelCoords) + stratifiedSample + jitter - vec2<f32>(uniforms.screenDims.xy) / 2.0;

                // Calculate ray direction based on camera parameters
                let horizontal_coeff = setting.cameraFOV * screen_jittered.x / f32(uniforms.screenDims.x);
                let vertical_coeff = setting.cameraFOV * screen_jittered.y / (f32(uniforms.screenDims.y) * setting.aspectRatio);
                myRay.direction = normalize(cam.forward + horizontal_coeff * cam.right + vertical_coeff * cam.up);

                // Trace the ray and accumulate the color
                accumulatedColor += vec4<f32>(trace(myRay), 1.0);
            }
        }
    } else {
        // Path tracing loop without stratification
        for (var i: u32 = 0u; i < u32(setting.numSamples); i = i + 1u) {
            // Initialize a new ray
            var myRay: Ray;
            myRay.origin = cam.pos;

            // Generate jitter for anti-aliasing
            let jitter = vec2<f32>(rand2D(), rand2D()) * setting.jitterScale;
            let screen_jittered = vec2<f32>(pixelCoords) + jitter - vec2<f32>(uniforms.screenDims.xy) / 2.0;

            // Calculate ray direction based on camera parameters
            let horizontal_coeff = setting.cameraFOV * screen_jittered.x / f32(uniforms.screenDims.x);
            let vertical_coeff = setting.cameraFOV * screen_jittered.y / (f32(uniforms.screenDims.y) * setting.aspectRatio);
            myRay.direction = normalize(cam.forward + horizontal_coeff * cam.right + vertical_coeff * cam.up);

            // Trace the ray and accumulate the color
            accumulatedColor += vec4<f32>(trace(myRay), 1.0);
        }
    }

    // Final fragment color
    var fragColor = accumulatedColor.xyz / f32(setting.numSamples);

    // If resetBuffer is 0, accumulate the color
    if uniforms.resetBuffer == 0 {
        let weight = 1.0 / f32(uniforms.frameNum);
        fragColor = weight * accumulatedColor.xyz + (1.0 - weight) * fragColor;
    }

    // Write the final color to the framebuffer
    framebuffer[pixelIndex] = vec4<f32>(fragColor, 1.0);
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
        } else if hit.material.emissionStrength > 0.0 {
            accumulatedColor = energy * hit.material.emissionColor * hit.material.emissionStrength;
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
            let diffuseDir = normalize(hit.normal + uniform_random_in_unit_sphere());
            var specularDir = reflect(ray.direction, hit.normal);
            var refractDir = refract(ray.direction, hit.normal, select(hit.material.ior, 1.0 / hit.material.ior, hit.from_front));

            specularDir = normalize(mix(specularDir, diffuseDir, hit.material.specRoughness * hit.material.specRoughness));
            refractDir = normalize(mix(refractDir, normalize(-hit.normal + uniform_random_in_unit_sphere()), hit.material.refrRoughness * hit.material.refrRoughness));
            ray.direction = mix(mix(diffuseDir, specularDir, isSpecular), refractDir, isRefractive);

            accumulatedColor += energy * hit.material.emissionColor * hit.material.emissionStrength;

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

fn rand2D() -> f32 {
    randState = randState * 747796405u + 2891336453u;
    var word: u32 = ((randState >> ((randState >> 28u) + 4u)) ^ randState) * 277803737u;
    return f32((word >> 22u) ^ word) / 4294967295;
}

fn cosine_sampling_wrt_Z() -> vec3f {
    let r1 = rand2D();
    let r2 = rand2D();

    let phi = 2 * PI * r1;
    let x = cos(phi) * sqrt(r2);
    let y = sin(phi) * sqrt(r2);
    let z = sqrt(1 - r2);

    return vec3f(x, y, z);
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

    //Kanten des Dreiecks vom Punkt A
    let edge_1: vec3<f32> = tri.corner_b - tri.corner_a;
    let edge_2: vec3<f32> = tri.corner_c - tri.corner_a;

    //h ist das Kreuzprodukt der Richtung des Strahls und einer Kante des Dreiecks
    let h: vec3<f32> = cross(ray.direction, edge_2); // Vektor senkrecht zu Dreiecks ebene
    let a: f32 = dot(edge_1, h); //Skalarprodukt : Wenn a nahe 0 ist, dann ist h fast parallel zur Kante


    if (a < EPSILON) && setting.BACKFACE_CULLING == 1.0 {
        return surfacePoint;
    }

    let f: f32 = 1.0 / a; // Kehrwert von a
    let s: vec3<f32> = ray.origin - tri.corner_a; // Vektor vom Ursprung des Strahls zu einer Ecke des Dreiecks
    let u: f32 = f * dot(s, h);//U: Parameter für baryzentrische Koordinaten

    //Wenn u außerhalb des Intervalls [0,1] liegt, gibt es keinen Treffer
    if u < 0.0 || u > 1.0 {
        return surfacePoint;
    }

    let q: vec3<f32> = cross(s, edge_1);
    let v: f32 = f * dot(ray.direction, q);//Berechne den Parameter v für baryzentrische Koordinaten

    //Wenn v außerhalb des Intervalls [0,1-u] liegt, gibt es keinen Treffer
    if v < 0.0 || u + v > 1.0 {
        return surfacePoint;
    }

    let dist: f32 = f * dot(edge_2, q); //Berechne den Abstand vom Ursprung des Strahls zum Trefferpunkt

    //Wenn t außerhalb des Intervalls [tMin, tMax] liegt, gibt es keinen Treffer
    if dist < tMin || dist > tMax {
        return surfacePoint;
    }

    //Berechne die normale am Schnittpunkt mit Interpolation der Normalen der Dreiecksecken
    //https://www.vaultcg.com/blog/casually-raytracing-in-webgpu-part1/
    let normal = normalize(tri.normal_b * u + tri.normal_c * v + tri.normal_a * (1.0 - u - v));
    surfacePoint.normal = normalize((transpose(mesh.materials[u32(tri.meshID)].inverseModel) * vec4(normal, 0.0)).xyz);

    surfacePoint.material = mesh.materials[u32(tri.meshID)];
    surfacePoint.dist = dist;
    surfacePoint.position = ray.origin + ray.direction * dist;
    surfacePoint.hit = true; //Es gibt einen Treffer

    // Determine if the ray hits the front face
    if dot(ray.direction, surfacePoint.normal) < 0.0 {
        surfacePoint.from_front = true;
    } else {
        surfacePoint.from_front = false;
        surfacePoint.normal = -surfacePoint.normal; // invert the normal for back face
    }
    return surfacePoint;
}


//Prüfe ob bounding box getroffen wurde
fn hit_aabb(ray: Ray, node: Node) -> f32 {
    //Inverse Richtung des strahls berechnen um divisionen im code zu vermeiden (rechenzeit vebessern)
    var inverseDir: vec3<f32> = vec3(1.0) / ray.direction;
    //Berechnung der t werte (bei welchen Wert(distanz) trifft unser Strahl unsere bounding box achse?)
    var t1: vec3<f32> = (node.aabbMin - ray.origin) * inverseDir;
    var t2: vec3<f32> = (node.aabbMax - ray.origin) * inverseDir;
    //Sicherstellen dass tMin immer den kleineren und tMax den größeren Wert für jede Achse enthält. (zB bei negativer Stahrrichtung)
    var tMin: vec3<f32> = min(t1, t2);
    var tMax: vec3<f32> = max(t1, t2);
    //Bestimmen den größten minimalen wert (sicherstellen dass der Stahl tatsächlich in der Box ist und durch alle 3 Seiten ging)
    var t_min: f32 = max(max(tMin.x, tMin.y), tMin.z);
    //Bestimme den kleinsten maximalen Wert (Wann der strahl unsere bounding box verlässt)
    var t_max: f32 = min(min(tMax.x, tMax.y), tMax.z);

    //Prüfen ob der Schnittpunkt gültig ist. eintrittspunkt muss kleiner als der ausstrittspunkt sein.
    //Und wenn t_max kleiner null ist der punkt hinter dem strahl ursprung.
    if t_min > t_max || t_max < 0.0 {
        return 99999.0;
    } else {
        return t_min;
    }
}

