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


struct SceneVariables {
    time: f32,
    weight: f32,
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
    ior: f32, //Index of Refraction
    inverseModel: mat4x4<f32>,
}


struct Triangle {
    corner_a: vec3f,
    normal_a: vec3f,
    corner_b: vec3f,
    normal_b: vec3f,
    corner_c: vec3f,
    normal_c: vec3f,
    objectID: f32,
}

struct MeshData {
    materials: array<Material>,
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
    numLights: f32,
}

struct LightData {
    position: vec3f,
    color: vec3f,
    size: vec3f,
    intensity: f32,
}

struct Light {
    lights: array<LightData>,
}

struct SurfacePoint {
    material: Material,
    position: vec3f,
    dist: f32,
    normal: vec3f,
    hit: bool,
    from_front: bool,
}

@group(0) @binding(0) var outputTex : texture_storage_2d<rgba16float, write>;
@group(0) @binding(1) var inputTex : texture_2d<f32>;
@group(0) @binding(2) var<uniform> cam : CameraData;
@group(0) @binding(3) var<storage, read> objects : ObjectData;
@group(0) @binding(4) var<storage, read> tree : BVH;
@group(0) @binding(5) var<storage, read> triIdx : ObjectIndices;
@group(0) @binding(6) var skyTexture : texture_cube<f32>;
@group(0) @binding(7) var skySampler : sampler;
@group(0) @binding(8) var<storage, read> mesh : MeshData;
@group(0) @binding(9) var<uniform> setting : Settings;
@group(0) @binding(10) var<uniform> scene : SceneVariables;
@group(0) @binding(11) var<storage, read> lightsource : Light;

const EPSILON : f32 = 0.00001;
const PI  = 3.14159265358979323846;
const TWO_PI: f32 = 6.28318530718;

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) GlobalInvocationID: vec3<u32>) {
    let screen_size = vec2<i32 >(textureDimensions(outputTex));
    let pixel_pos = vec2<i32>(GlobalInvocationID.xy);


    let halfScreenSize: vec2<f32> = vec2<f32 >(screen_size) * 0.5;

    var pixelIndex = u32(pixel_pos.y) * u32(screen_size.x) + u32(pixel_pos.x);
    var seed = pixelIndex + u32(scene.time) * 1193u;
    var accumulatedColor = vec4<f32>(0.0, 0.0, 0.0, 0.0);

    for (var i: u32 = 0u; i < u32(setting.numSamples); i = i + 1u) {
        var myRay: Ray;
        myRay.origin = cam.pos;
        let jitter: vec2<f32> = vec2<f32>(RandomFloat01(&seed), RandomFloat01(&seed)) * setting.jitterScale;
        let screen_jittered: vec2<f32> = vec2<f32>(pixel_pos) + jitter - halfScreenSize;
        let horizontal_coeff: f32 = setting.cameraFOV * screen_jittered.x / f32(screen_size.x);
        let vertical_coeff: f32 = setting.cameraFOV * screen_jittered.y / (f32(screen_size.y) * setting.aspectRatio);
        myRay.direction = normalize(cam.forward + horizontal_coeff * cam.right + vertical_coeff * cam.up);
        accumulatedColor += vec4(trace(myRay, &seed), 1.0);
    }

    let newImage = accumulatedColor / setting.numSamples;
    let accumulated = textureLoad(inputTex, pixel_pos, 0);

    // weighted average between the new and the accumulated image
    let result_color = scene.weight * newImage + (1.0 - scene.weight) * accumulated;

    textureStore(outputTex, pixel_pos, result_color);
}


//https://blog.demofox.org/2020/06/14/casual-shadertoy-path-tracing-3-fresnel-rough-refraction-absorption-orbit-cam/
fn trace(camRay: Ray, seed: ptr<function, u32>) -> vec3f {
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
            if (specChance > 0.0) && (RandomFloat01(seed) < specChance) {
                isSpecular = 1.0;
            } else if refrChance > 0.0 && RandomFloat01(seed) < specChance + refrChance {
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
            let diffuseDir = normalize(hit.normal + RandomUnitVector(seed));
            var specularDir = reflect(ray.direction, hit.normal);
            var refractDir = refract(ray.direction, hit.normal, select(hit.material.ior, 1.0 / hit.material.ior, hit.from_front));

            specularDir = normalize(mix(specularDir, diffuseDir, hit.material.specRoughness * hit.material.specRoughness));
            refractDir = normalize(mix(refractDir, normalize(-hit.normal + RandomUnitVector(seed)), hit.material.refrRoughness * hit.material.refrRoughness));
            ray.direction = mix(mix(diffuseDir, specularDir, isSpecular), refractDir, isRefractive);

            accumulatedColor += energy * hit.material.emissionColor * hit.material.emissionStrength;

            // Update energy
            if isRefractive == 0.0 {
                energy = originalEnergy;
                energy *= hit.material.albedo + hit.material.specColor * isSpecular;
            }

            // Russian roulette
            let rr_prob = max(energy.r, max(energy.g, energy.b));
            if RandomFloat01(seed) >= rr_prob {
            break;
            }
            energy /= rr_prob;
                        // Next Event Estimation (NEE)
            if isSpecular == 0.0 && isRefractive == 0.0 {
                for (var i: u32 = 0u; i < u32(setting.numLights); i++) {
                    let lightContribution = sampleLight(lightsource.lights[i], hit, seed);
                    accumulatedColor += energy * lightContribution * hit.material.albedo;
                }
            }
            accumulatedColor /= rr_prob;
        }
    }

    return accumulatedColor;
}

fn sampleLight(light: LightData, hit: SurfacePoint, seed: ptr<function, u32>) -> vec3f {
    let samples = 4u; // Number of samples for area light approximation
    var totalLightContribution = vec3(0.0, 0.0, 0.0);

    for (var i: u32 = 0u; i < samples; i++) {
        // Random point on the light source area
        let lightPoint = light.position + vec3(
            (RandomFloat01(seed) - 0.5) * light.size.x,
            (RandomFloat01(seed) - 0.5) * light.size.y,
            (RandomFloat01(seed) - 0.5) * light.size.z,
        );

        // Compute the vector from the surface point to the sampled light point
        let lightVec = lightPoint - hit.position;
        let lightDir = normalize(lightVec);

        // Calculate the dot product of the light direction and the surface normal
        let dotNL = max(dot(hit.normal, lightDir), 0.0);

        // Calculate the distance to the light source
        let dist = length(lightVec);

        // Calculate the attenuation based on the inverse square law
        let attenuation = 1.0 / (dist * dist);

        // Light contribution considering only the Lambertian term and attenuation
        let lightContribution = dotNL * attenuation;


        totalLightContribution += light.color * lightContribution * light.intensity;
    }

    // Average the light contribution over the number of samples
    return totalLightContribution / f32(samples);
}


//https://simonstechblog.blogspot.com/2018/06/simple-gpu-path-tracer.html
fn wang_hash(seed: ptr<function, u32>) -> u32 {
    *seed = (*seed ^ 61u) ^ (*seed >> 16u);
    *seed *= 9u;
    *seed = *seed ^ (*seed >> 4u);
    *seed *= 0x27d4eb2du;
    *seed = *seed ^ (*seed >> 15u);
    return *seed;
}
fn RandomFloat01(state: ptr<function, u32>) -> f32 {
    return f32(wang_hash(state)) / 4294967296.0;
}

fn RandomUnitVector(state: ptr<function, u32>) -> vec3<f32> {
    let z: f32 = RandomFloat01(state) * 2.0 - 1.0;
    let a: f32 = RandomFloat01(state) * (2.0 * PI);
    let r: f32 = sqrt(1.0 - z * z);
    let x: f32 = r * cos(a);
    let y: f32 = r * sin(a);
    return vec3<f32>(x, y, z);
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
    surfacePoint.normal = normalize((transpose(mesh.materials[u32(tri.objectID)].inverseModel) * vec4(normal, 0.0)).xyz);

    surfacePoint.material = mesh.materials[u32(tri.objectID)];
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

