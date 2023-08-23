struct PointLight {
    position: vec3<f32>,
    color: vec3<f32>,
    intensity: f32,
    size: f32,
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
}

struct Material {
    ambient: vec3f,
    diffuse: vec3f,
    specular: vec3f,
    emission: vec3f,
    shininess: f32,
    refraction: f32,
    dissolve: f32,
    smoothness: f32,
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

struct RenderState {
    material: Material,
    t: f32,
    normal: vec3<f32>,
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


//Constants for glow effect
const GLOW_THRESHOLD : f32 = 0.78;
const GLOW_RANGE : f32 = 0.2;
const GLOW_POWER : f32 = 5.0;

const LIGH_SAMPLES: u32 = 16u;

@compute @workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) GlobalInvocationID: vec3<u32>) {

    let screen_size: vec2<i32> = vec2<i32 >(textureDimensions(color_buffer));
    let screen_pos: vec2<i32> = vec2<i32 >(i32(GlobalInvocationID.x), i32(GlobalInvocationID.y));

    let aspect_ratio: f32 = f32(screen_size.x) / f32(screen_size.y);
    let fov: f32 = scene.cameraFOV;
    let tanHalfFOV: f32 = tan(fov * 0.5);

    let horizontal_coefficient: f32 = tanHalfFOV * (f32(screen_pos.x) - f32(screen_size.x) / 2.0) / f32(screen_size.x);
    let vertical_coefficient: f32 = tanHalfFOV * (f32(screen_pos.y) - f32(screen_size.y) / 2.0) / (f32(screen_size.y) * aspect_ratio);


    let forwards: vec3<f32> = scene.cameraForwards;
    let right: vec3<f32> = scene.cameraRight;
    let up: vec3<f32> = scene.cameraUp;

    var myRay: Ray;
    myRay.direction = normalize(forwards + horizontal_coefficient * right + vertical_coefficient * up);
    myRay.origin = scene.cameraPos;

    var pixel_color: vec3<f32> = rayColor(myRay);

    pixel_color += calculateGlow(myRay);

    textureStore(color_buffer, screen_pos, vec4<f32 >(pixel_color, 1.0));
}



fn rayColor(ray: Ray) -> vec3<f32> {
    var color: vec3<f32> = vec3(1.0, 1.0, 1.0);
    var result: RenderState;
    var world_ray: Ray = ray;

    let bounces: u32 = u32(scene.maxBounces);
    for (var bounce: u32 = 0u; bounce < bounces; bounce++) {
        result = trace(world_ray);

        if result.hit {
            let material: Material = result.material;
            let hitPoint = world_ray.origin + result.t * world_ray.direction;
            let norm = normalize(result.normal);
            let viewDir = -world_ray.direction;

            // Lighting calculations
            let lightDir = normalize(light.position - hitPoint);

            // Ambient
            let ambient = material.ambient;

            // Diffuse
            let diff = max(dot(norm, lightDir), 0.0);
            let diffuse = diff * material.diffuse;

            // Specular
            let reflectDir = reflect(-lightDir, norm);
            let spec = pow(max(dot(viewDir, reflectDir), 0.0), material.shininess);
            let specular = spec * material.specular;

            // Combine lighting with material color
            color = color * (ambient + diffuse + specular) * light.intensity;

            world_ray.origin = hitPoint;
            world_ray.direction = normalize(reflect(world_ray.direction, result.normal));
        } else {
            color *= textureSampleLevel(skyTexture, skySampler, world_ray.direction, 0.0).xyz;
            break;
        }
    }
    // Rays which reached terminal state and bounced indefinitely
    if result.hit && color.x == 1.0 && color.y == 1.0 && color.z == 1.0 {
        color = result.material.diffuse;
    }

    return color;
}

fn randomHemisphereDirection(normal: vec3<f32>) -> vec3<f32> {
    // In a real scenario, we'd use a genuine random number generator.
    // Here, we'll use a simple trick to produce a pseudorandom direction.
    let u = fract(sin(dot(normal, vec3(12.9898, 78.233, 56.234))) * 43758.5453);
    let v = fract(sin(dot(normal, vec3(93.9898, 67.345, 12.367))) * 52758.5453);
    let r = sqrt(1.0 - u * u);
    let phi = 2.0 * 3.14159 * v;
    return vec3(cos(phi) * r, u, sin(phi) * r);
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

fn trace(ray: Ray) -> RenderState {

    //Set up the Render State
    var renderState: RenderState;
    renderState.hit = false;
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

                var newRenderState: RenderState = hit_triangle(
                    ray,
                    objects.triangles[u32(triangleLookup.primitiveIndices[i + contents])],
                    0.001,
                    nearestHit,
                    renderState
                );

                if newRenderState.hit && newRenderState.t < nearestHit {
                    nearestHit = newRenderState.t;
                    renderState = newRenderState;
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

    return renderState;
}

// Funktion, die überprüft, ob ein Strahl ein Dreieck trifft.
fn hit_triangle(
    ray: Ray,
    tri: Triangle,
    tMin: f32,
    tMax: f32,
    oldRenderState: RenderState
) -> RenderState {

    // Initialisierung des Render-Zustands.
    var renderState: RenderState;
    renderState.hit = false;
    renderState.material = oldRenderState.material;



    // Berechnung der Richtungsvektoren des Dreiecks.
    let edge_ab: vec3<f32> = tri.corner_b - tri.corner_a;
    let edge_ac: vec3<f32> = tri.corner_c - tri.corner_a;

    // Berechnung der Normalen des Dreiecks durch Kreuzprodukt der Kanten.
    var n: vec3<f32> = normalize(cross(edge_ab, edge_ac));

    // Skalarprodukt zwischen Strahlrichtung und Dreiecksnormale. Positiver Wert: Normale und Strahlrichtung gehen in selbe Richtung
    var ray_dot_tri: f32 = dot(ray.direction, n);

    // Überprüfung, ob der Strahl von der Rückseite des Dreiecks kommt (Backface Culling).
    if ray_dot_tri > 0.0 {
        return renderState;
    }

    // Parallel zum Dreieck? Absoluter wert nahe zu 0. (Dreieck wird tangential berührt)
    if abs(ray_dot_tri) < 0.00001 {
        return renderState;
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
        return renderState;
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
        return renderState;
    }
    // Das selbe mit v, aber wir prüfen ob beide Werte addiert größer 1 ergeben, weil dadurch ist w automatisch kleiner 0
    if v < 0.0 || u + v > 1.0 {
        return renderState;
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
        renderState.normal = (1.0 - u - v) * tri.normal_a + u * tri.normal_b + v * tri.normal_c;
        renderState.material = tri.material;


        renderState.t = t;
        renderState.hit = true;
        return renderState;
    }

    return renderState;
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
