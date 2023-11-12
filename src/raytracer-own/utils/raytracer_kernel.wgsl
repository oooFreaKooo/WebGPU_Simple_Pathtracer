struct Node {
    aabbMin: vec3<f32>,
    leftChild: f32,
    aabbMax: vec3<f32>,
    primitiveCount: f32,
}

struct BVH {
    nodes: array<Node>,
}


struct Ray {
    direction: vec3<f32>,
    origin: vec3<f32>,
}

struct CameraData {
    cameraPos: vec3<f32>,
    cameraForwards: vec3<f32>,
    cameraRight: vec3<f32>,
    cameraUp: vec3<f32>,
}


struct SceneVariables {
    time: f32,
    weight: f32,
}

struct Material {
    albedo: vec3f,
    specularChance: f32,
    specularColor: vec3f,
    specularRoughness: f32,
    emissionColor: vec3f,
    emissionStrength: f32,
    refractionColor: vec3f,
    refractionChance: f32,
    refractionRoughness: f32,
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
    primitiveIndices: array<f32>,
}

struct Settings {
    cameraFOV: f32,
    maxBounces: f32,
    numSamples: f32,
    BACKFACE_CULLING: f32,
    SKY_TEXTURE: f32,
    aspectRatio: f32,
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
@group(0) @binding(2) var<uniform> camera : CameraData;
@group(0) @binding(3) var<storage, read> objects : ObjectData;
@group(0) @binding(4) var<storage, read> tree : BVH;
@group(0) @binding(5) var<storage, read> triangleLookup : ObjectIndices;
@group(0) @binding(6) var skyTexture : texture_cube<f32>;
@group(0) @binding(7) var skySampler : sampler;
@group(0) @binding(8) var<storage, read> mesh : MeshData;
@group(0) @binding(9) var<uniform> settings : Settings;
@group(0) @binding(10) var<uniform> scene : SceneVariables;

const EPSILON : f32 = 0.00001;
const PI : f32 = 3.14159265358979323846;

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) GlobalInvocationID: vec3<u32>) {
    let screen_size: vec2i = vec2<i32 >(textureDimensions(outputTex));
    let screen_pos: vec2i = vec2<i32>(GlobalInvocationID.xy);

    let FOV: f32 = settings.cameraFOV;
    let halfScreenSize: vec2<f32> = vec2<f32 >(screen_size) * 0.5;

    let forwards: vec3f = camera.cameraForwards;
    let right: vec3f = camera.cameraRight;
    let up: vec3f = camera.cameraUp;
    var myRay: Ray;
    myRay.origin = camera.cameraPos;
    //var seed = u32(scene.time * 0.00025);

    var seed = (u32(screen_pos.x) * 1973u + u32(screen_pos.y) * 9277u + u32(scene.time) * 26699u) | 1u;


    let jitterScale: f32 = 3.0;

    var accumulatedColor: vec4<f32> = vec4<f32>(0.0, 0.0, 0.0, 0.0);

    for (var i: u32 = 0u; i < u32(settings.numSamples); i = i + 1u) {
        let jitter: vec2<f32> = vec2<f32>(RandomFloat01(&seed), (RandomFloat01(&seed))) * jitterScale ;
        let screen_sampled_jittered: vec2<f32> = vec2<f32>(screen_pos) + jitter - halfScreenSize;
        let horizontal_coefficient: f32 = FOV * screen_sampled_jittered.x / f32(screen_size.x);
        let vertical_coefficient: f32 = FOV * screen_sampled_jittered.y / (f32(screen_size.y) * settings.aspectRatio);
        myRay.direction = normalize(forwards + horizontal_coefficient * right + vertical_coefficient * up);
        accumulatedColor += vec4(trace(myRay, &seed), 1.0);
    }

    let newImage = accumulatedColor / settings.numSamples;
    let accumulated = textureLoad(inputTex, screen_pos, 0);

    // weighted average between the new and the accumulated image
    let result_color = saturate(scene.weight * newImage + (1.0 - scene.weight) * accumulated);

    textureStore(outputTex, screen_pos, result_color);
}


//https://blog.demofox.org/2020/06/14/casual-shadertoy-path-tracing-3-fresnel-rough-refraction-absorption-orbit-camera/
fn trace(camRay: Ray, seed: ptr<function, u32>) -> vec3f {
    var ray = camRay;
    var accumulatedColor: vec3f = vec3(0.0, 0.0, 0.0);
    var energy = vec3(1.0, 1.0, 1.0);
    var skyColor: vec3f;
    var regularBounces: u32 = 0u;
    for (var bounce: u32 = 0u; bounce < u32(settings.maxBounces); bounce++) {
        let hit = traverse(ray);

        if !hit.hit {
            accumulatedColor += energy * select(vec3(0.0), textureSampleLevel(skyTexture, skySampler, ray.direction, 0.0).xyz, settings.SKY_TEXTURE == 1.0);
            break;
        }

        let material = hit.material;
        var originalEnergy = energy;

        // do absorption if we are hitting from inside the object
        energy *= select(vec3(1.0), exp(-material.refractionColor * hit.dist), hit.from_front);

        let n1 = select(1.0, material.ior, !hit.from_front);
        let n2 = select(1.0, material.ior, hit.from_front);

        // get the pre-fresnel chances
        var specularChance = material.specularChance;
        var refractionChance = material.refractionChance;

        // take fresnel into account for specularChance and adjust other chances. specular takes priority.
        // chanceMultiplier makes sure we keep diffuse / refraction ratio the same.
        var rayProbability = 1.0;
        if specularChance > 0.0 {
            specularChance = FresnelReflectAmount(n1, n2, hit.normal, ray.direction, material.specularChance, 1.0);
            let chanceMultiplier = (1.0 - specularChance) / (1.0 - material.specularChance);
            refractionChance *= chanceMultiplier;
        }

        // calculate whether we are going to do a diffuse, specular, or refractive ray
        var isSpecular: f32 = 0.0;
        var isRefractive: f32 = 0.0;
        let randomFloat = RandomFloat01(seed);
        if (specularChance > 0.0) && (randomFloat < specularChance) {
            isSpecular = 1.0;
            rayProbability = specularChance;
        } else if refractionChance > 0.0 && randomFloat < specularChance + refractionChance {
            isRefractive = 1.0;
            rayProbability = refractionChance;
        } else {
            rayProbability = 1.0 - (specularChance + refractionChance);
            regularBounces += 1u;
        }

        if regularBounces >= 4u && isSpecular == 0.0 { // Stop if max bounces for regular materials is reached
            break;
        }
        // numerical problems can cause rayProbability to become small enough to cause a divide by zero.
        rayProbability = max(rayProbability, 0.001);

        // update the ray position
        ray.origin = select((ray.origin + ray.direction * hit.dist) + hit.normal * EPSILON, (ray.origin + ray.direction * hit.dist) - hit.normal * 0.01, isRefractive == 1.0);

        // Calculate a new ray direction.
        // Diffuse uses a normal oriented cosine weighted hemisphere sample.
        // Perfectly smooth specular uses the reflection ray.
        // Rough (glossy) specular lerps from the smooth specular to the rough diffuse by the material roughness squared
        // Squaring the roughness is just a convention to make roughness feel more linear perceptually.
        let bounces = min(1u, bounce);
        let diffuseDir = normalize(hit.normal + RandomUnitVector(seed));
        //let diffuseDir = CosineWeightedRandomUnitVector(hit.normal, seed);

        var specularDir = reflect(ray.direction, hit.normal);
        specularDir = normalize(mix(specularDir, diffuseDir, material.specularRoughness * material.specularRoughness));

        var refractDir = refract(ray.direction, hit.normal, select(material.ior, 1.0 / material.ior, hit.from_front));
        refractDir = normalize(mix(refractDir, normalize(-hit.normal + RandomUnitVector(seed)), material.refractionRoughness * material.refractionRoughness));
        ray.direction = mix(mix(diffuseDir, specularDir, isSpecular), refractDir, isRefractive);


        accumulatedColor += energy * material.emissionColor * material.emissionStrength;

        if isRefractive == 0.0 {
            energy = originalEnergy;
            energy *= material.albedo + material.specularColor * isSpecular;
        }

        energy /= rayProbability;

        let p = max(energy.r, max(energy.g, energy.b));
        if randomFloat >= p {
            break;
        }
        energy *= (1.0 / p);
    }

    return accumulatedColor;
}

fn wang_hash(seed: ptr<function, u32>) -> u32 {
    let newSeed = seed;
    *seed = (*newSeed ^ 61u) ^ (*seed >> 16u);
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
    // Schlick approximation
    let r0 = pow(((n1 - n2) / (n1 + n2)), 2.0);
    var cosX: f32 = -dot(normal, incident);
    if n1 > n2 {
        let n: f32 = n1 / n2;
        let sinT2: f32 = n * n * (1.0 - cosX * cosX);
        // Total internal reflection
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
        let primitiveCount: u32 = u32(currentNode.primitiveCount);
        let contents: u32 = u32(currentNode.leftChild);

        if primitiveCount == 0u {
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
            for (var i: u32 = 0u; i < primitiveCount; i++) {
                let newSurfacePoint: SurfacePoint = hit_triangle(
                    ray,
                    objects.triangles[u32(triangleLookup.primitiveIndices[i + contents])],
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

//https://www.vaultcg.com/blog/casually-raytracing-in-webgpu-part1/
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


    if (a < EPSILON) && settings.BACKFACE_CULLING == 1.0 {
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
    let normal = normalize(tri.normal_b * u + tri.normal_c * v + tri.normal_a * (1.0 - u - v));
    //let normal = normalize(cross(edge_1, edge_2));
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

