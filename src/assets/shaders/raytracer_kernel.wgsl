struct Node {
    minCorner: vec3<f32>,
    leftChild: f32,
    maxCorner: vec3<f32>,
    primitiveCount: f32,
}

struct BVH {
    nodes: array<Node>,
}


struct ObjectIndices {
    primitiveIndices: array<f32>,
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
    specular: vec3f,
    emission: vec3f,
    emissionStrength: f32,
    smoothness: f32,
    specularProbability: f32,
}

struct Triangle {
    corner_a: vec3f,
    normal_a: vec3f,
    corner_b: vec3f,
    normal_b: vec3f,
    corner_c: vec3f,
    normal_c: vec3f,
    material: Material,
}

struct ObjectData {
    triangles: array<Triangle>,
}

struct SurfacePoint {
    material: Material,
    position: vec3f,
    t: f32,
    normal: vec3f,
    hit: bool,
}


@group(0) @binding(0) var color_buffer : texture_storage_2d<rgba16float, write>;
@group(0) @binding(1) var<uniform> scene : SceneData;
@group(0) @binding(2) var<storage, read> objects : ObjectData;
@group(0) @binding(3) var<storage, read> tree : BVH;
@group(0) @binding(4) var<storage, read> triangleLookup : ObjectIndices;
@group(0) @binding(5) var skyTexture : texture_cube<f32>;
@group(0) @binding(6) var skySampler : sampler;

const EPSILON : f32 = 1e-5;
const PI : f32 = 3.14159265358979323846;


fn trace(camRay: Ray, seed: f32) -> vec3f {
    var ray = camRay;
    var color: vec3f = vec3(0.0, 0.0, 0.0);
    var energy = vec3(1.0, 1.0, 1.0);

    for (var bounce: u32 = 0u; bounce < u32(scene.maxBounces); bounce++) {
        let hit = traverse(ray);

        if !hit.hit {
            break;
        }

        let material = hit.material;
        let newSeed = vec2(hit.position.zx + vec2<f32>(hit.position.y, seed + f32(bounce)));
        ray.origin = hit.position;
        // Diffuse und spiegelnde Richtung
        // https://github.com/SebLague/Ray-Tracing/blob/main/Assets/Scripts/Shaders/RayTracing.shader
        let diffuseDir = randomDirection(hit.normal, newSeed);
        let specularDir = reflect(ray.direction, hit.normal);

        let isSpecular = random(newSeed) < material.specularProbability;

        if isSpecular {
            ray.direction = mix(diffuseDir, specularDir, material.smoothness);
        } else {
            ray.direction = diffuseDir;
        }
        // TODO: Importance Sampling : https://computergraphics.stackexchange.com/questions/4979/what-is-importance-sampling
        // Importance Sampling
        let pdf = dot(hit.normal, ray.direction) / PI; // Probability Density Function
        if pdf < 0.001 {
            break;
        }
        energy *= material.albedo / pdf;


        color += material.emission * material.emissionStrength * energy;

        // Russisches roulette: Wahrscheinlichkeit, dass der Strahl weiterhin Energie hat
        // https://www.cs.princeton.edu/courses/archive/fall06/cos526/lectures/montecarlo2.pdf
        let p = max(energy.r, max(energy.g, energy.b)); // Hoher p wert: Pfad wird fortgesetzt
        if random(newSeed) >= p { 
            break;
        }
        energy *= 1.0 / p;
    }

    return color;
}


// https://my.eng.utah.edu/~cs6965/slides/pathtrace.pdf
fn randomDirection(normal: vec3<f32>, seed: vec2<f32>) -> vec3<f32> {
    let u = random(seed);
    let v = random(vec2(seed.y, seed.x + 1.0));

    // Sphärische Koordinaten mit kosinus gewichtung (wahrscheinlichkeit dass vektor zur normale zeigt ist höher wegen sqrt v)
    let theta = 2.0 * PI * u; // Azimutwinkel: horizontale richtung zwischen 0 und 2pi
    let phi = asin(sqrt(v)); // vertikale richtung -pi/2 und pi/2. phi nah an 0 heißt vektor ist nah an horizontaler ebene
    
    // Kartesische Koordinaten: Vektor der in eine Zufällige richtung im Raum zeigt
    let x = cos(theta) * sin(phi);
    let y = sin(theta) * sin(phi);
    let z = cos(phi);

    // Achse aussuchen mit dem kleinsten wert der normale
    var up: vec3<f32>;
    if abs(normal.x) < abs(normal.y) && abs(normal.x) < abs(normal.z) {
        up = vec3(1.0, 0.0, 0.0);
    } else if abs(normal.y) < abs(normal.z) {
        up = vec3(0.0, 1.0, 0.0);
    } else {
        up = vec3(0.0, 0.0, 1.0);
    }
    // Orthonormalbasis: Wir erstellen zwei vektoren die senkrecht zur normale stehen (kreuzprodukt)
    let tangent = normalize(cross(up, normal));
    let bitangent = cross(normal, tangent);

    // Basisvektoren werden mit den karthesischen koordinaten kombiniert
    let dir = tangent * x + bitangent * y + normal * z;
    return normalize(dir);
}

// Zahl zwischen 0 und 1
// https://thebookofshaders.com/10/
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
            let child1: Node = tree.nodes[contents];
            let child2: Node = tree.nodes[contents + 1u];

            var distance1: f32 = hit_aabb(ray, child1);
            var distance2: f32 = hit_aabb(ray, child2);

            if distance1 > distance2 {
                let temp: f32 = distance1;
                distance1 = distance2;
                distance2 = temp;
            }

            if distance1 <= nearestHit {
                currentNode = child1;
                if distance2 < nearestHit {
                    stack[stackLocation] = child2;
                    stackLocation += 1u;
                }
                continue;
            }
        } else {
            for (var i: u32 = 0u; i < primitiveCount; i++) {
                let newSurfacePoint: SurfacePoint = hit_triangle(
                    ray,
                    objects.triangles[u32(triangleLookup.primitiveIndices[i + contents])],
                    0.001,
                    nearestHit,
                    surfacePoint,
                );

                if newSurfacePoint.hit && newSurfacePoint.t < nearestHit {
                    nearestHit = newSurfacePoint.t;
                    surfacePoint = newSurfacePoint;
                }
            }
        }

        if stackLocation == 0u {
            break;
        }

        stackLocation -= 1u;
        currentNode = stack[stackLocation];
    }

    return surfacePoint;
}




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

    let edge_ab: vec3<f32> = tri.corner_b - tri.corner_a;
    let edge_ac: vec3<f32> = tri.corner_c - tri.corner_a;
    //Normale
    var n: vec3<f32> = normalize(cross(edge_ab, edge_ac));
    var ray_dot_tri: f32 = dot(ray.direction, n);
    //backface culling
    if ray_dot_tri > 0.0 {
        //ray_dot_tri = ray_dot_tri * -1.0;
        //n = n * -1.0;
        return surfacePoint;
    }
    let h: vec3<f32> = cross(ray.direction, edge_ac);
    let a: f32 = dot(edge_ab, h);

    if abs(a) < 0.00001 {
        return surfacePoint;
    }

    let f: f32 = 1.0 / a;
    let s: vec3<f32> = ray.origin - tri.corner_a;
    let u: f32 = f * dot(s, h);

    if u < 0.0 || u > 1.0 {
        return surfacePoint;
    }

    let q: vec3<f32> = cross(s, edge_ab);
    let v: f32 = f * dot(ray.direction, q);

    if v < 0.0 || u + v > 1.0 {
        return surfacePoint;
    }

    let t: f32 = f * dot(edge_ac, q);

    if t > tMin && t < tMax {
        surfacePoint.normal = n;
        surfacePoint.material = tri.material;
        surfacePoint.t = t;
        surfacePoint.position = ray.origin + t * ray.direction;
        surfacePoint.hit = true;
        return surfacePoint;
    }

    return surfacePoint;
}

// Prüfe ob bounding box getroffen wurde
fn hit_aabb(ray: Ray, node: Node) -> f32 {
    // Inverse Richtung des strahls berechnen um divisionen im code zu vermeiden (rechenzeit vebessern)
    var inverseDir: vec3<f32> = vec3(1.0) / ray.direction;
    // Berechnung der t werte (bei welchen Wert(distanz) trifft unser Strahl unsere bounding box achse?)
    var t1: vec3<f32> = (node.minCorner - ray.origin) * inverseDir;
    var t2: vec3<f32> = (node.maxCorner - ray.origin) * inverseDir;
    // Sicherstellen dass tMin immer den kleineren und tMax den größeren Wert für jede Achse enthält. (zB bei negativer Stahrrichtung)
    var tMin: vec3<f32> = min(t1, t2);
    var tMax: vec3<f32> = max(t1, t2);
    // Bestimmen den größten minimalen wert (sicherstellen dass der Stahl tatsächlich in der Box ist und durch alle 3 Seiten ging)
    var t_min: f32 = max(max(tMin.x, tMin.y), tMin.z);
    // Bestimme den kleinsten maximalen Wert (Wann der strahl unsere bounding box verlässt)
    var t_max: f32 = min(min(tMax.x, tMax.y), tMax.z);

    // Prüfen ob der Schnittpunkt gültig ist. eintrittspunkt muss kleiner als der ausstrittspunkt sein. 
    //Und wenn t_max kleiner null ist der punkt hinter dem strahl ursprung.
    if t_min > t_max || t_max < 0.0 {
        return 99999.0;
    } else {
        return t_min;
    }
}

@compute @workgroup_size(16, 16, 1)
fn main(@builtin(global_invocation_id) GlobalInvocationID: vec3<u32>) {
    let screen_size: vec2i = vec2<i32 >(textureDimensions(color_buffer));
    let screen_pos: vec2i = vec2<i32 >(i32(GlobalInvocationID.x), i32(GlobalInvocationID.y));

    let aspect_ratio: f32 = f32(screen_size.x) / f32(screen_size.y);
    let fov: f32 = scene.cameraFOV;
    let tanHalfFOV: f32 = tan(fov * 0.5);
    let halfScreenSize: vec2<f32> = vec2<f32>(screen_size) * 0.5;

    let forwards: vec3f = scene.cameraForwards;
    let right: vec3f = scene.cameraRight;
    let up: vec3f = scene.cameraUp;

    let num_samples: u32 = u32(scene.samples);
    var accumulated_color: vec3f = vec3(0.0);
    var seed: f32 = scene.time / 25236.3;

    for (var i: u32 = 0u; i < num_samples; i++) {
        let jitter: vec2<f32> = (random(vec2<f32>(seed, f32(i))) - 0.5) / vec2<f32>(screen_size);
        let screen_jittered: vec2<f32> = vec2<f32>(screen_pos) + jitter - halfScreenSize;
        let horizontal_coefficient: f32 = tanHalfFOV * screen_jittered.x / f32(screen_size.x);
        let vertical_coefficient: f32 = tanHalfFOV * screen_jittered.y / (f32(screen_size.y) * aspect_ratio);

        var myRay: Ray;
        myRay.direction = normalize(forwards + horizontal_coefficient * right + vertical_coefficient * up);
        myRay.origin = scene.cameraPos;
        accumulated_color += trace(myRay, seed + f32(i));
        var textureSky = textureSampleLevel(skyTexture, skySampler, myRay.direction, 0.0).xyz;
    }

    var pixel_color: vec3f = accumulated_color / f32(num_samples);
    textureStore(color_buffer, screen_pos, vec4<f32>(pixel_color, 1.0));
}
