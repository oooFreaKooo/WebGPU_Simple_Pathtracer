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
}

struct Material {
    albedo: vec3f,
    specular: vec3f,
    emission: vec3f,
    emissionStrength: f32,
    roughness: f32,
    specularExponent: f32,
    specularHighlight: f32,
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
const AVGVEC: vec3f = vec3(0.333333333);
const ENERGY_THRESHOLD: f32 = 0.01;

fn rayColor(camRay: Ray, seed: f32) -> vec3f {
    var color: vec3f = vec3(0.0, 0.0, 0.0);
    var ray = camRay;
    var energy = vec3(1.0, 1.0, 1.0);


    for (var bounce: u32 = 0u; bounce < u32(scene.maxBounces); bounce++) {
        let hit = trace(ray);

        if u32(scene.maxBounces) > 3u {
            let continueProb = max(energy.x, max(energy.y, energy.z));
            if random(hit.position.zx + vec2<f32>(hit.position.y, seed + f32(bounce))) > continueProb {
                break;
            }
            energy /= continueProb;
        }

        if hit.hit {
            color += energy * hit.material.emission * hit.material.emissionStrength * 10.0;
            let material = hit.material;
            let prob = getProbabilities(material); // prob.x = diffuse probability, prob.y = specular probability
            let randVal = random(hit.position.zx + vec2<f32>(hit.position.y, seed + f32(bounce)));



            if randVal < prob.y {
                let smoothness = 1.0 - hit.material.roughness;
                let alpha = pow(1000.0, smoothness * smoothness);
                if smoothness == 1.0 {
                    ray.direction = reflect(ray.direction, hit.normal);
                } else {
                    ray.direction = sampleSphere(reflect(ray.direction, hit.normal), alpha, hit.position.zx + vec2<f32>(hit.position.y, seed + f32(bounce)));
                }
                ray.origin = hit.position + ray.direction * EPSILON;
                let f = (alpha + 2.0) / (alpha + 1.0);
                energy *= hit.material.specular * clamp(dot(hit.normal, ray.direction) * f, 0.0, 1.0);
            } else if prob.x > 0.0 && randVal < (prob.y + prob.x) {
                ray.origin = hit.position + hit.normal * EPSILON;
                ray.direction = sampleSphere(hit.normal, 1.0, hit.position.zx + vec2<f32>(hit.position.y, seed + f32(bounce)));
                energy *= hit.material.albedo * clamp(dot(hit.normal, ray.direction), 0.0, 1.0);
            } else {
                break;
            }
                        // Early termination check
            if length(energy) < ENERGY_THRESHOLD {
                break;
            }
        } else {
            var textureSky = textureSampleLevel(skyTexture, skySampler, ray.direction, 0.0).xyz;
            color += energy * textureSky;
            break;
        }
    }

    return color;
}

fn random(seed: vec2<f32>) -> f32 {
    return fract(sin(dot(seed, vec2(12.9898, 78.233))) * 43758.5453);
}

fn sampleSphere(normal: vec3<f32>, alpha: f32, seed: vec2<f32>) -> vec3<f32> {
    // Sample the full sphere, where alpha determines the kind of the sampling
    let cosTheta: f32 = 2.0 * random(seed) - 1.0; // Range from -1 to 1
    let sinTheta: f32 = sqrt(1.0 - cosTheta * cosTheta);
    let phi: f32 = 2.0 * 3.14159265358979323846 * random(seed.yx); // Used value for PI
    let tangentSpaceDir: vec3<f32> = vec3<f32>(cos(phi) * sinTheta, sin(phi) * sinTheta, cosTheta);

    // Transform direction to world space around the normal
    return getTangentSpace(normal) * tangentSpaceDir;
}

fn getTangentSpace(normal: vec3<f32>) -> mat3x3<f32> {
    // Choose a helper vector for the cross product
    var helper: vec3<f32> = vec3<f32>(1.0, 0.0, 0.0);
    if abs(normal.x) > 0.99 {
        helper = vec3<f32>(0.0, 0.0, 1.0);
    }
    // Generate vectors
    let tangent: vec3<f32> = normalize(cross(normal, helper));
    let binormal: vec3<f32> = normalize(cross(normal, tangent));
    return mat3x3<f32>(tangent, binormal, normal);
}

fn getProbabilities(material: Material) -> vec2<f32> {
    let specProb = dot(material.specular, AVGVEC);
    let diffProb = dot(material.albedo, AVGVEC);
    let totalProb = specProb + diffProb;
    return vec2<f32>(specProb / totalProb, diffProb / totalProb);
}



fn trace(ray: Ray) -> SurfacePoint {

    //Set up the Render State
    var surfacePoint: SurfacePoint;
    surfacePoint.hit = false;
    var nearestHit: f32 = 9999.0;

    //Set up for BVH Traversal
    var node: Node = tree.nodes[0];
    var stack: array<Node, 20>;
    var stackLocation: u32 = 0u;

    while true {

        var primitiveCount: u32 = u32(node.primitiveCount);
        var contents: u32 = u32(node.leftChild);

        if primitiveCount == 0u {
            var child1: Node = tree.nodes[contents];
            var child2: Node = tree.nodes[contents + 1u];

            var distance1: f32 = hit_aabb(ray, child1);
            var distance2: f32 = hit_aabb(ray, child2);
            if distance1 > distance2 {
                var tempDist: f32 = distance1;
                distance1 = distance2;
                distance2 = tempDist;

                var tempChild: Node = child1;
                child1 = child2;
                child2 = tempChild;
            }

            if distance1 > nearestHit {
                if stackLocation == 0u {
                    break;
                } else {
                    stackLocation -= 1u;
                    node = stack[stackLocation];
                }
            } else {
                node = child1;
                if distance2 < nearestHit {
                    stack[stackLocation] = child2;
                    stackLocation += 1u;
                }
            }
        } else {
            for (var i: u32 = 0u; i < primitiveCount; i++) {

                var newSurfacePoint: SurfacePoint = hit_triangle(
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

            if stackLocation == 0u {
                break;
            } else {
                stackLocation -= 1u;
                node = stack[stackLocation];
            }
        }
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
        surfacePoint.normal = (1.0 - u - v) * tri.normal_a + u * tri.normal_b + v * tri.normal_c;
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

    let horizontal_coefficient: f32 = tanHalfFOV * (f32(screen_pos.x) - f32(screen_size.x) / 2.0) / f32(screen_size.x);
    let vertical_coefficient: f32 = tanHalfFOV * (f32(screen_pos.y) - f32(screen_size.y) / 2.0) / (f32(screen_size.y) * aspect_ratio);


    let forwards: vec3f = scene.cameraForwards;
    let right: vec3f = scene.cameraRight;
    let up: vec3f = scene.cameraUp;

    var myRay: Ray;
    myRay.direction = normalize(forwards + horizontal_coefficient * right + vertical_coefficient * up);
    myRay.origin = scene.cameraPos;
    var seed: f32 = scene.time / 25236.3;
    var pixel_color: vec3f = rayColor(myRay, seed);

    textureStore(color_buffer, screen_pos, vec4<f32>(pixel_color, 1.0));
}