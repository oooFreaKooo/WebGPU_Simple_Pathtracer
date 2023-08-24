struct PointLight {
    position: vec3<f32>,
    color: vec3<f32>,
    intensity: f32,
    radius: f32,
    reach: f32,
}

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


@group(0) @binding(0) var color_buffer : texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(1) var<uniform> scene : SceneData;
@group(0) @binding(2) var<storage, read> objects : ObjectData;
@group(0) @binding(3) var<storage, read> tree : BVH;
@group(0) @binding(4) var<storage, read> triangleLookup : ObjectIndices;
@group(0) @binding(5) var skyTexture : texture_cube<f32>;
@group(0) @binding(6) var skySampler : sampler;
@group(0) @binding(7) var<uniform> light : PointLight;
@group(0) @binding(8) var accumulation_buffer : texture_storage_2d<rgba32float, write>;
@group(0) @binding(9) var<uniform> accumulationCount : u32;

const EPSILON : f32 = 1e-5;
const SHADOW_RESOLUTION: f32 = 1.0;
//Constants for glow effect
const GLOW_THRESHOLD : f32 = 0.78;
const GLOW_RANGE : f32 = 0.2;
const GLOW_POWER : f32 = 5.0;

const LIGH_SAMPLES: u32 = 16u;

@compute @workgroup_size(8, 8, 1)
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
    var seed: f32 = scene.time;
    var pixel_color: vec3f = rayColor(myRay, seed);

    pixel_color += calculateGlow(myRay);

    textureStore(color_buffer, screen_pos, vec4<f32>(pixel_color, 1.0));
}

fn rayColor(cameraRay: Ray, seed: f32) -> vec3f {
    var colorResult: vec3f = vec3(0.0, 0.0, 0.0);
    var ray = cameraRay;

    var energy = vec3(1.0, 1.0, 1.0);

    for (var bounce: u32 = 0u; bounce < u32(scene.maxBounces); bounce++) {
        let hitPoint = trace(ray);

        if hitPoint.hit {
            // Part one: Hit object's emission
            colorResult += energy * hitPoint.material.emission * hitPoint.material.emissionStrength;

            // Part two: Direct light (received directly from light sources)
            colorResult += energy * computeDirectIllumination(hitPoint, ray.origin, seed);

            // Part three: Indirect light (other objects + skybox)
            var specChance: f32 = dot(hitPoint.material.specular, vec3<f32>(1.0 / 3.0, 1.0 / 3.0, 1.0 / 3.0));
            var diffChance: f32 = dot(hitPoint.material.albedo, vec3<f32>(1.0 / 3.0, 1.0 / 3.0, 1.0 / 3.0));

            var sum: f32 = specChance + diffChance;
            specChance /= sum;
            diffChance /= sum;

            // Roulette-select the ray's path
            var roulette: f32 = random(hitPoint.position.zx + vec2<f32>(hitPoint.position.y, hitPoint.position.y) + vec2<f32>(seed, scene.maxBounces));

            if roulette < specChance {
                // Specular reflection
                var smoothness: f32 = 1.0 - hitPoint.material.roughness;
                var alpha: f32 = pow(1000.0, smoothness * smoothness);

                if smoothness == 1.0 {
                    ray.direction = reflect(ray.direction, hitPoint.normal);
                } else {
                    ray.direction = sampleHemisphere(reflect(ray.direction, hitPoint.normal), alpha, hitPoint.position.zx + vec2<f32>(hitPoint.position.y, hitPoint.position.y) + vec2<f32>(seed, scene.maxBounces));
                }
                ray.origin = hitPoint.position + ray.direction * EPSILON;
                var f: f32 = (alpha + 2.0) / (alpha + 1.0);
                energy *= hitPoint.material.specular * clamp(dot(hitPoint.normal, ray.direction) * f, 0.0, 1.0);
            } else if diffChance > 0.0 && roulette < specChance + diffChance {
                // Diffuse reflection
                ray.origin = hitPoint.position + hitPoint.normal * EPSILON;
                ray.direction = sampleHemisphere(hitPoint.normal, 1.0, hitPoint.position.zx + vec2<f32>(hitPoint.position.y, hitPoint.position.y) + vec2<f32>(seed, scene.maxBounces));
                energy *= hitPoint.material.albedo * clamp(dot(hitPoint.normal, ray.direction), 0.0, 1.0);
            } else {
                // This means both the hit material's albedo and specular are totally black, so there won't be anymore light. We can stop here.
                break;
            }
        } else {
            // The ray didn't hit anything, so we add the sky's color and we're done
            colorResult += energy * textureSampleLevel(skyTexture, skySampler, ray.direction, 0.0).xyz;
            break;
        }
    }

    return colorResult;
}

fn computeDirectIllumination(surfacePoint: SurfacePoint, observerPos: vec3<f32>, seed: f32) -> vec3<f32> {
    var point = surfacePoint;

    var directIllumination: vec3<f32> = vec3<f32>(0.0, 0.0, 0.0);

    let lightDistance: f32 = length(light.position - point.position);
    if lightDistance > light.reach {
        return vec3<f32>(0.0, 0.0, 0.0);
    }

    let diffuse: f32 = clamp(dot(point.normal, normalize(light.position - point.position)), 0.0, 1.0);

    if diffuse > EPSILON || point.material.roughness < 1.0 {
        var shadowRays: i32 = i32(SHADOW_RESOLUTION * light.radius * light.radius / (lightDistance * lightDistance) + 1.0);
        var shadowRayHits: i32 = 0;
        var lightDir: vec3<f32>;
        for (var i: i32 = 0; i < shadowRays; i = i + 1) {
            let lightSurfacePoint: vec3<f32> = light.position + normalize(vec3<f32>(random(vec2<f32>(f32(i) + seed, 1.0) + point.position.xy), random(vec2<f32>(f32(i) + seed, 2.0) + point.position.yz), random(vec2<f32>(f32(i) + seed, 3.0) + point.position.xz))) * light.radius;
            lightDir = normalize(lightSurfacePoint - point.position);
            let rayOrigin: vec3<f32> = point.position + lightDir * EPSILON * 2.0;
            let maxRayLength: f32 = length(lightSurfacePoint - rayOrigin);
            let shadowRay: Ray = Ray(rayOrigin, lightDir);
            var SR_hit: SurfacePoint;
            if trace(shadowRay).hit {
                if length(SR_hit.position - rayOrigin) < maxRayLength {
                    shadowRayHits = shadowRayHits + 1;
                }
            }
        }

        let attenuation: f32 = lightDistance * lightDistance;
        directIllumination = directIllumination + light.color * light.intensity * diffuse * point.material.albedo * (1.0 - f32(shadowRayHits) / f32(shadowRays)) / attenuation;

        lightDir = normalize(point.position - light.position);
        let reflectedLightDir: vec3<f32> = reflect(lightDir, point.normal);
        let cameraDir: vec3<f32> = normalize(observerPos - point.position);
        directIllumination = directIllumination + point.material.specularHighlight * light.color * (light.intensity / (lightDistance * lightDistance)) * pow(max(dot(cameraDir, reflectedLightDir), 0.0), 1.0 / max(point.material.specularExponent, EPSILON));
    }
    return directIllumination;
}
fn random(seed: vec2<f32>) -> f32 {
    return fract(sin(dot(seed, vec2(12.9898, 78.233))) * 43758.5453);
}

fn sampleHemisphere(normal: vec3<f32>, alpha: f32, seed: vec2<f32>) -> vec3<f32> {
    // Sample the hemisphere, where alpha determines the kind of the sampling
    let cosTheta: f32 = pow(random(seed), 1.0 / (alpha + 1.0));
    let sinTheta: f32 = sqrt(1.0 - cosTheta * cosTheta);
    let phi: f32 = 2.0 * 3.14159265358979323846 * random(seed.yx); // Used value for PI
    let tangentSpaceDir: vec3<f32> = vec3<f32>(cos(phi) * sinTheta, sin(phi) * sinTheta, cosTheta);

    // Transform direction to world space
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


fn calculateGlow(ray: Ray) -> vec3<f32> {
    let directionToLight = normalize(light.position - ray.origin);
    let dotProduct = dot(ray.direction, directionToLight);

    let distanceToLight = length(light.position - ray.origin);
    let distanceFactor = 1.5 / (sqrt(distanceToLight) + 1.0);

    if dotProduct > GLOW_THRESHOLD {
        let intensity = pow((dotProduct - GLOW_THRESHOLD) / GLOW_RANGE, GLOW_POWER) * distanceFactor;
        return intensity * light.color * light.intensity;
    }
    return vec3<f32 >(0.0, 0.0, 0.0);
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

// Funktion, die überprüft, ob ein Strahl ein Dreieck trifft.
fn hit_triangle(
    ray: Ray,
    tri: Triangle,
    tMin: f32,
    tMax: f32,
    oldSurfacePoint: SurfacePoint
) -> SurfacePoint {

    // Initialisierung des Render-Zustands.
    var surfacePoint: SurfacePoint;
    surfacePoint.hit = false;
    surfacePoint.material = oldSurfacePoint.material;



    // Berechnung der Richtungsvektoren des Dreiecks.
    let edge_ab: vec3<f32> = tri.corner_b - tri.corner_a;
    let edge_ac: vec3<f32> = tri.corner_c - tri.corner_a;

    // Berechnung der Normalen des Dreiecks durch Kreuzprodukt der Kanten.
    var n: vec3<f32> = normalize(cross(edge_ab, edge_ac));

    // Skalarprodukt zwischen Strahlrichtung und Dreiecksnormale. Positiver Wert: Normale und Strahlrichtung gehen in selbe Richtung
    var ray_dot_tri: f32 = dot(ray.direction, n);

    // Überprüfung, ob der Strahl von der Rückseite des Dreiecks kommt (Backface Culling).
    //if ray_dot_tri > 0.0 {
    //    return renderState;
    //}

    // Parallel zum Dreieck? Absoluter wert nahe zu 0. (Dreieck wird tangential berührt)
    if abs(ray_dot_tri) < 0.00001 {
        return surfacePoint;
    }

    // Systemmatrix für die Berechnung der baryzentrischen Koordinaten.
    // Nutze dazu den Richtungsvektor vom Strahl und die Kanten des Dreiecks
    var system_matrix: mat3x3<f32> = mat3x3<f32 >(
        ray.direction,
        tri.corner_a - tri.corner_b,
        tri.corner_a - tri.corner_c
    );
    // det = 0 Vektoren kollinear, also spannen keinen vollen 3D Raum
    // Dieser Wert gibt uns an wie "parallel" die vektoren zueinander sind
    let denominator: f32 = determinant(system_matrix); // det(A) = a ⋅ (b x c) -> Skalarprodukt von a mit dem Kreuzprodukt von b und c

    // Matrix ist nahezu singulär. Also nicht invertierbar.
    if abs(denominator) < 0.00001 {
        return surfacePoint;
    }

    // Cramersche Regel: Lösung eines lin. Gleichungssystems Ax = b ist gegeben durch xi = det(Ai) / det(A).
    // Damit werden die baryzentrischen koordinaten verwendet
    system_matrix = mat3x3<f32 >(
        ray.direction,
        tri.corner_a - ray.origin,
        tri.corner_a - tri.corner_c
    );
    let u: f32 = determinant(system_matrix) / denominator;

    system_matrix = mat3x3<f32 >(
        ray.direction,
        tri.corner_a - tri.corner_b,
        tri.corner_a - ray.origin,
    );
    let v: f32 = determinant(system_matrix) / denominator;

    // Überprüfung, ob u und v ausserhalb des dreiecks liegt. u + v + w = 1 
    // Wenn u ausserhalb des dreicks ist, dann ist sein Wert entweder kleiner 0 oder größer 1
    if u < 0.0 || u > 1.0 {
        return surfacePoint;
    }
    // Das selbe mit v, aber wir prüfen ob beide Werte addiert größer 1 ergeben, weil dadurch ist w automatisch kleiner 0
    if v < 0.0 || u + v > 1.0 {
        return surfacePoint;
    }

    // t wird berechnet um den Abstand vom ray Ursprung zur Ebene des Dreiecks herauszufinden
    system_matrix = mat3x3<f32 >(
        tri.corner_a - ray.origin,
        tri.corner_a - tri.corner_b,
        tri.corner_a - tri.corner_c
    );
    let t: f32 = determinant(system_matrix) / denominator;

    // Prüfen ob t im gültigen Bereich liegt
    if t > tMin && t < tMax {
        // Baryzentrische Interpolation: Damit wir keine konstante normale über die gesamte fläche haben
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
fn lerp(a: vec3<f32>, b: vec3<f32>, t: f32) -> vec3<f32> {
    return a + t * (b - a);
}
