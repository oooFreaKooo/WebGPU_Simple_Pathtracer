struct Node {
    minCorner: vec3<f32>,
    leftChild: f32,
    maxCorner: vec3<f32>,
    primitiveCount: f32,
}

struct BVH {
    nodes: array<Node>,
}


struct Ray {
    direction: vec3<f32>,
    origin: vec3<f32>,
}

struct SceneData {
    cameraPos: vec3<f32>,
    cameraForwards: vec3<f32>,
    cameraRight: vec3<f32>,
    cameraUp: vec3<f32>,
    cameraFOV: f32,
    maxBounces: f32,
    time: f32,
    samples: f32,
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
struct SurfacePoint {
    material: Material,
    position: vec3f,
    dist: f32,
    normal: vec3f,
    hit: bool,
    front_face: bool,
}


@group(0) @binding(0) var color_buffer : texture_storage_2d<rgba16float, write>;
@group(0) @binding(1) var<uniform> scene : SceneData;
@group(0) @binding(2) var<storage, read> objects : ObjectData;
@group(0) @binding(3) var<storage, read> tree : BVH;
@group(0) @binding(4) var<storage, read> triangleLookup : ObjectIndices;
@group(0) @binding(5) var skyTexture : texture_cube<f32>;
@group(0) @binding(6) var textureSampler : sampler;
@group(0) @binding(7) var<storage, read> mesh : MeshData;

const EPSILON : f32 = 0.00001;
const PI : f32 = 3.14159265358979323846;
const BACKFACE_CULLING = true;

//https://blog.demofox.org/2020/06/14/casual-shadertoy-path-tracing-3-fresnel-rough-refraction-absorption-orbit-camera/
fn trace(camRay: Ray, seed: f32) -> vec3f {
    var ray = camRay;
    var accumulatedColor: vec3f = vec3(0.0, 0.0, 0.0);
    var energy = vec3(1.0, 1.0, 1.0);

    for (var bounce: u32 = 0u; bounce < u32(scene.maxBounces); bounce++) {
        let hit = traverse(ray);

        if !hit.hit {
            accumulatedColor += energy * sRGBToLinear(textureSampleLevel(skyTexture, textureSampler, ray.direction, 0.0).xyz);
            //accumulatedColor += energy * vec3(0.35, 0.35, 0.35);
            break;
        }

        let material = hit.material;
        var originalEnergy = energy;

        energy *= select(vec3(1.0), exp(-material.refractionColor * hit.dist), hit.front_face);

        let newSeed = vec2(hit.position.zx + vec2<f32>(hit.position.y, seed + f32(bounce)));
        let randomFloat: f32 = random(newSeed);
        let rayDirNorm = normalize(ray.direction);


        let n1 = select(1.0, material.ior, !hit.front_face);
        let n2 = select(1.0, material.ior, hit.front_face);

        var specularChance = material.specularChance;
        var refractionChance = material.refractionChance;
        var rayProbability = 1.0;

        if specularChance > 0.0 {
            specularChance = fresnelReflect(n1, n2, hit.normal, rayDirNorm, material.specularChance, 1.0);
            let chanceMultiplier = (1.0 - specularChance) / (1.0 - material.specularChance);
            refractionChance *= chanceMultiplier;
        }

        var isSpecular: f32 = 0.0;
        var isRefractive: f32 = 0.0;
        if (specularChance > 0.0) && (randomFloat < specularChance) {
            isSpecular = 1.0;
            rayProbability = specularChance;
        } else if (refractionChance > 0.0) && (randomFloat < (specularChance + refractionChance)) {
            isRefractive = 1.0;
            rayProbability = refractionChance;
        } else {
            rayProbability = 1.0 - (specularChance + refractionChance);
        }

        rayProbability = max(rayProbability, 0.001);

        ray.origin = hit.position + hit.normal * select(0.01, -0.01, isRefractive == 1.0);


        let diffuseDir = CosineWeightedHemisphereSample(hit.normal, newSeed);
        var specularDir = reflect(rayDirNorm, hit.normal);
        specularDir = normalize(mix(specularDir, diffuseDir, material.specularRoughness * material.specularRoughness));

        let refractionRatio = select(material.ior, 1.0 / material.ior, hit.front_face);
        var refractDir = refract(rayDirNorm, hit.normal, refractionRatio);
        let randomDirection: vec3<f32> = CosineWeightedHemisphereSample(-hit.normal, newSeed);
        refractDir = normalize(mix(refractDir, randomDirection, material.refractionRoughness * material.refractionRoughness));

        ray.direction = mix(diffuseDir, specularDir, isSpecular);
        ray.direction = mix(ray.direction, refractDir, isRefractive);

        accumulatedColor += material.emissionColor * material.emissionStrength * energy;

        if isRefractive == 0.0 {
            energy = originalEnergy;
            energy *= material.albedo + material.specularColor * isSpecular;
        }

        energy /= rayProbability;

        let p = max(energy.r, max(energy.g, energy.b));
        if random(newSeed) > p {
            break;
        }
        energy *= (1.0 / p);
    }

    return accumulatedColor;
}


// https://raytracing.github.io/books/RayTracingInOneWeekend.html#dielectrics/refraction
fn refract(uv: vec3<f32>, n: vec3<f32>, etai_over_etat: f32) -> vec3<f32> {
    let cos_theta = min(dot(-uv, n), 1.0);
    let r_out_perp = etai_over_etat * (uv + cos_theta * n);
    let r_out_parallel = -sqrt(abs(1.0 - dot(r_out_perp, r_out_perp))) * n;
    return r_out_perp + r_out_parallel;
}
// https://www.scratchapixel.com/lessons/3d-basic-rendering/introduction-to-shading/reflection-refraction-fresnel.html

fn fresnelReflect(n1: f32, n2: f32, normal: vec3<f32>, rayDir: vec3<f32>, minReflectivity: f32, maxReflectivity: f32) -> f32 {
    let r0 = pow(((n1 - n2) / (n1 + n2)), 2.0);
    let cosTheta = min(dot(-rayDir, normal), 1.0);
    let reflectance = r0 + (1.0 - r0) * pow(1.0 - cosTheta, 5.0);

    return mix(minReflectivity, maxReflectivity, reflectance);
}


//https://my.eng.utah.edu/~cs6965/slides/pathtrace.pdf
fn CosineWeightedHemisphereSample(normal: vec3<f32>, seed: vec2<f32>) -> vec3<f32> {
    let u = random(seed);
    let v = random(vec2(seed.y, seed.x + 1.0));

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


//Zahl zwischen 0 und 1
//https://thebookofshaders.com/10/
fn random(seed: vec2<f32>) -> f32 {
    return fract(sin(dot(seed, vec2(12.9898, 78.233))) * 43758.5453);
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
    let edge_ab: vec3<f32> = tri.corner_b - tri.corner_a;
    let edge_ac: vec3<f32> = tri.corner_c - tri.corner_a;

    //h ist das Kreuzprodukt der Richtung des Strahls und einer Kante des Dreiecks
    let h: vec3<f32> = cross(ray.direction, edge_ac); // Vektor senkrecht zu Dreiecks ebene
    let a: f32 = dot(edge_ab, h); //Skalarprodukt : Wenn a nahe 0 ist, dann ist h fast parallel zur Kante

    if (a < EPSILON) && BACKFACE_CULLING == true {
        return surfacePoint;
    }

    let f: f32 = 1.0 / a; // Kehrwert von a
    let s: vec3<f32> = ray.origin - tri.corner_a; // Vektor vom Ursprung des Strahls zu einer Ecke des Dreiecks
    let u: f32 = f * dot(s, h);//U: Parameter für baryzentrische Koordinaten

    //Wenn u außerhalb des Intervalls [0,1] liegt, gibt es keinen Treffer
    if u < 0.0 || u > 1.0 {
        return surfacePoint;
    }

    let q: vec3<f32> = cross(s, edge_ab);
    let v: f32 = f * dot(ray.direction, q);//Berechne den Parameter v für baryzentrische Koordinaten

    //Wenn v außerhalb des Intervalls [0,1-u] liegt, gibt es keinen Treffer
    if v < 0.0 || u + v > 1.0 {
        return surfacePoint;
    }

    let dist: f32 = f * dot(edge_ac, q); //Berechne den Abstand vom Ursprung des Strahls zum Trefferpunkt

    //Wenn t außerhalb des Intervalls [tMin, tMax] liegt, gibt es keinen Treffer
    if dist < tMin || dist > tMax {
        return surfacePoint;
    }

    //Berechne die normale am Schnittpunkt mit Interpolation der Normalen der Dreiecksecken
    let normal = (1.0 - u - v) * tri.normal_a + u * tri.normal_b + v * tri.normal_c;
    surfacePoint.normal = normalize((transpose(mesh.materials[u32(tri.objectID)].inverseModel) * vec4(normal, 0.0)).xyz);

    surfacePoint.material = mesh.materials[u32(tri.objectID)];
    surfacePoint.dist = dist;
    surfacePoint.position = ray.origin + ray.direction * dist;
    surfacePoint.hit = true; //Es gibt einen Treffer

    // Determine if the ray hits the front face
    if dot(ray.direction, surfacePoint.normal) < 0.0 {
        surfacePoint.front_face = true;
    } else {
        surfacePoint.front_face = false;
        surfacePoint.normal = -surfacePoint.normal; // invert the normal for back face
    }
    return surfacePoint;
}


fn sRGBToLinear(sRGBColor: vec3<f32>) -> vec3<f32> {
    var linearColor: vec3<f32>;

    for (var i = 0u; i < 3u; i = i + 1u) {
        if sRGBColor[i] <= 0.04045 {
            linearColor[i] = sRGBColor[i] / 12.92;
        } else {
            linearColor[i] = pow((sRGBColor[i] + 0.055) / 1.055, 2.4);
        }
    }
    return linearColor;
}


//Prüfe ob bounding box getroffen wurde
fn hit_aabb(ray: Ray, node: Node) -> f32 {
    //Inverse Richtung des strahls berechnen um divisionen im code zu vermeiden (rechenzeit vebessern)
    var inverseDir: vec3<f32> = vec3(1.0) / ray.direction;
    //Berechnung der t werte (bei welchen Wert(distanz) trifft unser Strahl unsere bounding box achse?)
    var t1: vec3<f32> = (node.minCorner - ray.origin) * inverseDir;
    var t2: vec3<f32> = (node.maxCorner - ray.origin) * inverseDir;
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

@compute @workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) GlobalInvocationID: vec3<u32>) {
    let screen_size: vec2i = vec2<i32 >(textureDimensions(color_buffer));
    let screen_pos: vec2i = vec2<i32 >(i32(GlobalInvocationID.x), i32(GlobalInvocationID.y));

    let aspect_ratio: f32 = f32(screen_size.x) / f32(screen_size.y);
    let FOV: f32 = scene.cameraFOV;
    let halfScreenSize: vec2<f32> = vec2<f32 >(screen_size) * 0.5;

    let forwards: vec3f = scene.cameraForwards;
    let right: vec3f = scene.cameraRight;
    let up: vec3f = scene.cameraUp;

    let num_samples: u32 = u32(scene.samples);
    var accumulated_color: vec3f = vec3(0.0);
    var seed: f32 = scene.time * 0.00025;
    var myRay: Ray;
    myRay.origin = scene.cameraPos;

    for (var i: u32 = 0u; i < num_samples; i++) {
        let jitter: vec2<f32> = (random(vec2<f32 >(seed, f32(i))) - 0.5) / vec2<f32 >(screen_size);
        let screen_jittered: vec2<f32> = vec2<f32 >(screen_pos) + jitter - halfScreenSize;
        let horizontal_coefficient: f32 = FOV * screen_jittered.x / f32(screen_size.x);
        let vertical_coefficient: f32 = FOV * screen_jittered.y / (f32(screen_size.y) * aspect_ratio);

        myRay.direction = normalize(forwards + horizontal_coefficient * right + vertical_coefficient * up);
        accumulated_color += trace(myRay, seed + f32(i));
    }
    var textureSky = textureSampleLevel(skyTexture, textureSampler, myRay.direction, 0.0).xyz;
    var pixel_color: vec3f = accumulated_color / f32(num_samples);
    //pixel_color = clamp(pixel_color, vec3<f32>(0.0), vec3<f32>(1.5));
    textureStore(color_buffer, screen_pos, vec4<f32 >(pixel_color, 1.0));
}


