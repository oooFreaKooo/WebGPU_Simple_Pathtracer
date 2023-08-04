struct PointLight {
    position: vec3<f32>,
    color: vec3<f32>,
    intensity: f32,
    size: f32,
};

struct Material {
  ambient: f32,
  diffuse: f32,
  specular: f32,
  shininess: f32,
  reflectivity: f32,
  refraction: f32,
  transparency: f32,
};

struct Triangle {
    corner_a: vec3<f32>,
    normal_a: vec3<f32>,
    corner_b: vec3<f32>,
    normal_b: vec3<f32>,
    corner_c: vec3<f32>,
    normal_c: vec3<f32>,
    color: vec3<f32>,
}

struct ObjectData {
    triangles: array<Triangle>,
}

struct Node {
    minCorner: vec3<f32>,
    leftChild: f32,
    maxCorner: vec3<f32>,
    primitiveCount: f32,
}

struct blasDescription {
    inverseModel: mat4x4<f32>,
    rootNodeIndex: vec4<f32>,
}

struct BVH {
    nodes: array<Node>,
}

struct blasDescriptions {
    descriptions: array<blasDescription>,
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

struct RenderState {
    color: vec3<f32>,
    t: f32,
    normal: vec3<f32>,
    hit: bool,
}


@group(0) @binding(0) var color_buffer: texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(1) var<uniform> scene: SceneData;
@group(0) @binding(2) var<storage, read> objects: ObjectData;
@group(0) @binding(3) var<storage, read> tree: BVH;
@group(0) @binding(4) var<storage, read> blas: blasDescriptions;
@group(0) @binding(5) var<storage, read> triangleLookup: ObjectIndices;
@group(0) @binding(6) var<storage, read> blasLookup: ObjectIndices;
@group(0) @binding(7) var skyTexture: texture_cube<f32>;
@group(0) @binding(8) var skySampler: sampler;
@group(0) @binding(9) var<uniform> light: PointLight;
@group(0) @binding(10) var<uniform> m : Material;

// Constants for glow effect
const GLOW_THRESHOLD: f32 = 0.78;
const GLOW_RANGE: f32 = 0.2;
const GLOW_POWER: f32 = 5.0;

const RAYLEIGH_SCATTERING: vec3<f32> = vec3(5.5e-6, 13.0e-6, 22.4e-6);




@compute @workgroup_size(8,8,1)
fn main(@builtin(global_invocation_id) GlobalInvocationID : vec3<u32>) {

    let screen_size: vec2<i32> = vec2<i32>(textureDimensions(color_buffer));
    let screen_pos : vec2<i32> = vec2<i32>(i32(GlobalInvocationID.x), i32(GlobalInvocationID.y));

    let aspect_ratio: f32 = f32(screen_size.x) / f32(screen_size.y);
        // Calculate the pixel size based on the camera's field of view and the screen size
    let fov: f32 = scene.cameraFOV;
    let tanHalfFOV: f32 = tan(fov * 0.5);
    //let pixelSize: vec2<f32> = vec2<f32>(
    //    tanHalfFOV * 2.0 / f32(screen_size.x),
    //    tanHalfFOV * 2.0 / f32(screen_size.y)
    //);

    
    // Adjusted coefficients:
    let horizontal_coefficient: f32 = tanHalfFOV * (f32(screen_pos.x) - f32(screen_size.x) / 2) / f32(screen_size.x);
    let vertical_coefficient: f32 = tanHalfFOV * (f32(screen_pos.y) - f32(screen_size.y) / 2) / (f32(screen_size.y) * aspect_ratio);


    let forwards: vec3<f32> = scene.cameraForwards;
    let right: vec3<f32> = scene.cameraRight;
    let up: vec3<f32> = scene.cameraUp;

    var myRay: Ray;
    myRay.direction = normalize(forwards + horizontal_coefficient * right + vertical_coefficient * up);
    myRay.origin = scene.cameraPos;



    var pixel_color : vec3<f32> = sampleRayColor(myRay);
    //var pixel_color : vec3<f32> = rayColor(myRay, pixelSize);

    // Add glow directly when looking towards the light
    pixel_color += calculateGlow(myRay);

    textureStore(color_buffer, screen_pos, vec4<f32>(pixel_color, 1.0));
}

fn sampleRayColor(ray: Ray) -> vec3<f32> {
    var color: vec3<f32> = vec3(1.0, 1.0, 1.0);
    var result: RenderState;

    var world_ray: Ray;
    world_ray.origin = ray.origin;
    world_ray.direction = ray.direction;

    let bounces: u32 = u32(scene.maxBounces);
    for(var bounce: u32 = 0; bounce < bounces; bounce++) {
        result = trace_tlas(world_ray);

        if (!result.hit) {
            // Sky color
            color *= textureSampleLevel(skyTexture, skySampler, world_ray.direction, 0.0).xyz;
            break;
        }

        let hitPoint = world_ray.origin + result.t * world_ray.direction;

        let lightDirection = normalize(light.position - hitPoint);
        let viewDirection = normalize(scene.cameraPos - hitPoint);
        let reflectDirection = reflect(-lightDirection, result.normal);
        
        let ambient = m.ambient; 
        let diffuse = max(dot(result.normal, lightDirection), 0.0);
        let specular = pow(max(dot(viewDirection, reflectDirection), 0.0), m.shininess);
        let shadowFactor = is_in_shadow(hitPoint, result.normal, light);
        let shadowedColor = mix(result.color, ambient * result.color, shadowFactor);

        if (shadowFactor < 1.0) {
            color *= shadowedColor + (1.0 - shadowFactor) * (ambient + diffuse * m.diffuse + specular * m.specular) * light.color * light.intensity;
        } else {
            color *= shadowedColor;
        }

        // Add epsilon to avoid self intersection
        let epsilon = 0.001;
        world_ray.origin = hitPoint + epsilon * world_ray.direction;
        world_ray.direction = normalize(reflect(world_ray.direction, result.normal));

        // Break out of loop if color is nearly black
        if (length(color) < epsilon) {
            break;
        }
    }

    return color;
}





fn is_in_shadow(hitPoint: vec3<f32>, normal: vec3<f32>, light: PointLight) -> f32 {
    let offsetHitPoint = hitPoint + 0.001 * normal;
    var shadowRay: Ray;
    shadowRay.origin = offsetHitPoint;

    let samples = 12; // Adjust as needed for performance/quality trade-off
    var inShadowCount = 0;

    let sqrtSamples = i32(sqrt(f32(samples)));

    for (var x = 0; x < sqrtSamples; x++) {
        for (var y = 0; y < sqrtSamples; y++) {
            let u = (f32(x) + random2D(vec2(hitPoint.x + f32(x), hitPoint.y + f32(y)))) / f32(sqrtSamples);
            let v = (f32(y) + random2D(vec2(hitPoint.y + f32(y), hitPoint.z + f32(x)))) / f32(sqrtSamples);

            // Generate random offsets in a disc shape around the light
            let theta = 2.0 * 3.14159 * u; 
            let r = light.size * sqrt(v);
            let xOff = r * cos(theta);
            let yOff = r * sin(theta);

            let randomOffset = vec3<f32>(xOff, yOff, 0.0);
            shadowRay.direction = normalize((light.position + randomOffset) - hitPoint);

            let result = trace_tlas(shadowRay);
            if (result.hit && result.t < length((light.position + randomOffset) - hitPoint)) {
                inShadowCount++;
            }
        }
    }

    return f32(inShadowCount) / f32(samples); 
}


fn hash(p: vec3<f32>) -> f32 {
    var p3 = fract(p * vec3(0.1031, 0.11369, 0.13787));
    p3 += dot(p3, p3.yxz + 19.19);
    return fract((p3.x + p3.y) * p3.z);
}

fn random2D(p: vec2<f32>) -> f32 {
    return hash(vec3(p, 1.0));
}


fn calculateGlow(ray: Ray) -> vec3<f32> {
    let directionToLight = normalize(light.position - ray.origin);
    let dotProduct = dot(ray.direction, directionToLight);

    let distanceToLight = length(light.position - ray.origin);
    let distanceFactor = 1.5 / (sqrt(distanceToLight) + 1.0);

    if (dotProduct > GLOW_THRESHOLD) {
        let intensity = pow((dotProduct - GLOW_THRESHOLD) / GLOW_RANGE, GLOW_POWER) * distanceFactor;
        return intensity * light.color * light.intensity;
    }
    return vec3<f32>(0.0, 0.0, 0.0); // Return black when no glow
}

fn calculateAtmosphere(ray_direction: vec3<f32>) -> vec3<f32> {
    let sunDirection: vec3<f32> = normalize(vec3(0.0, 1.0, 0.0)); // This represents a sun at the zenith
    let cosTheta: f32 = dot(ray_direction, sunDirection);

    let beta: vec3<f32> = RAYLEIGH_SCATTERING * (1.0 / (4.0 * 3.14159));

    let atmosphere: vec3<f32> = exp(-beta / (2.0 - cosTheta * 2.0));

    return atmosphere;
}

fn trace_tlas(ray: Ray) -> RenderState {

    //Set up the Render State
    var renderState: RenderState;
    renderState.hit = false;
    var nearestHit: f32 = 9999;

    //Set up for BVH Traversal
    var node: Node = tree.nodes[0];
    var stack: array<Node, 20>;
    var stackLocation: u32 = 0;

    while (true) {

        var primitiveCount: u32 = u32(node.primitiveCount);
        var contents: u32 = u32(node.leftChild);

        if (primitiveCount == 0) {
            var child1: Node = tree.nodes[contents];
            var child2: Node = tree.nodes[contents + 1];

            var distance1: f32 = hit_aabb(ray, child1);
            var distance2: f32 = hit_aabb(ray, child2);
            if (distance1 > distance2) {
                var tempDist: f32 = distance1;
                distance1 = distance2;
                distance2 = tempDist;

                var tempChild: Node = child1;
                child1 = child2;
                child2 = tempChild;
            }

            if (distance1 > nearestHit) {
                if (stackLocation == 0) {
                    break;
                }
                else {
                    stackLocation -= 1;
                    node = stack[stackLocation];
                }
            }
            else {
                node = child1;
                if (distance2 < nearestHit) {
                    stack[stackLocation] = child2;
                    stackLocation += 1;
                }
            }
        }
        else {
            for (var i: u32 = 0; i < primitiveCount; i++) {
        
                var newRenderState: RenderState = trace_blas(
                    ray, 
                    blas.descriptions[u32(blasLookup.primitiveIndices[i + contents])], 
                    nearestHit,
                    renderState
                );

                if (newRenderState.hit && newRenderState.t < nearestHit) {
                    nearestHit = newRenderState.t;
                    renderState = newRenderState;
                }
            }

            if (stackLocation == 0) {
                break;
            }
            else {
                stackLocation -= 1;
                node = stack[stackLocation];
            }
        }
    }

    return renderState;
}

fn trace_blas(
    ray: Ray, 
    description: blasDescription,
    nearestHit: f32,
    renderState: RenderState) -> RenderState {

    var object_ray: Ray;
    object_ray.origin = (description.inverseModel * vec4<f32>(ray.origin, 1.0)).xyz;
    object_ray.direction = (description.inverseModel * vec4<f32>(ray.direction, 0.0)).xyz;

    //Set up the Render State
    var blasRenderState: RenderState;
    blasRenderState.t = renderState.t;
    blasRenderState.normal = renderState.normal;
    blasRenderState.color = renderState.color;
    blasRenderState.hit = false;

    var blasNearestHit: f32 = nearestHit;

    //Set up for BVH Traversal
    var node: Node = tree.nodes[u32(description.rootNodeIndex.x)];
    var stack: array<Node, 20>;
    var stackLocation: u32 = 0;

    while (true) {

        var primitiveCount: u32 = u32(node.primitiveCount);
        var contents: u32 = u32(node.leftChild);

        if (primitiveCount == 0) {
            var child1: Node = tree.nodes[contents];
            var child2: Node = tree.nodes[contents + 1];

            var distance1: f32 = hit_aabb(object_ray, child1);
            var distance2: f32 = hit_aabb(object_ray, child2);
            if (distance1 > distance2) {
                var tempDist: f32 = distance1;
                distance1 = distance2;
                distance2 = tempDist;

                var tempChild: Node = child1;
                child1 = child2;
                child2 = tempChild;
            }

            if (distance1 > blasNearestHit) {
                if (stackLocation == 0) {
                    break;
                }
                else {
                    stackLocation -= 1;
                    node = stack[stackLocation];
                }
            }
            else {
                node = child1;
                if (distance2 < blasNearestHit) {
                    stack[stackLocation] = child2;
                    stackLocation += 1;
                }
            }
        }
        else {
            for (var i: u32 = 0; i < primitiveCount; i++) {
        
                var newRenderState: RenderState = hit_triangle(
                    object_ray, 
                    objects.triangles[u32(triangleLookup.primitiveIndices[i + contents])], 
                    0.001, blasNearestHit, blasRenderState
                );

                if (newRenderState.hit && newRenderState.t < blasNearestHit) {
                    blasNearestHit = newRenderState.t;
                    blasRenderState = newRenderState;
                }

            }

            if (stackLocation == 0) {
                break;
            }
            else {
                stackLocation -= 1;
                node = stack[stackLocation];
            }
        }
    }

    if (blasRenderState.hit) {
        blasRenderState.normal = normalize(
            (transpose(description.inverseModel) * vec4(blasRenderState.normal, 0.0)).xyz
        );
    }

    return blasRenderState;
}

fn hit_triangle(
    ray: Ray, tri: Triangle, 
    tMin: f32, tMax:f32,
    oldRenderState: RenderState) -> RenderState {

    var renderState: RenderState;
    renderState.color = oldRenderState.color;
    renderState.hit = false;

    //Direction vectors
    let edge_ab: vec3<f32> = tri.corner_b - tri.corner_a;
    let edge_ac: vec3<f32> = tri.corner_c - tri.corner_a;
    //Normal of the triangle
    var n: vec3<f32> = normalize(cross(edge_ab, edge_ac));
    var ray_dot_tri: f32 = dot(ray.direction, n);
    //backface reversal
    if (ray_dot_tri > 0.0) {
        ray_dot_tri = ray_dot_tri * -1;
        n = n * -1;
        return renderState;
    }
    
    //early exit, ray parallel with triangle surface
    if (abs(ray_dot_tri) < 0.00001) {
        return renderState;
    }

    var system_matrix: mat3x3<f32> = mat3x3<f32>(
        ray.direction,
        tri.corner_a - tri.corner_b,
        tri.corner_a - tri.corner_c
    );
    let denominator: f32 = determinant(system_matrix);
    if (abs(denominator) < 0.00001) {
        return renderState;
    }

    system_matrix = mat3x3<f32>(
        ray.direction,
        tri.corner_a - ray.origin,
        tri.corner_a - tri.corner_c
    );
    let u: f32 = determinant(system_matrix) / denominator;
    
    if (u < 0.0 || u > 1.0) {
        return renderState;
    }

    system_matrix = mat3x3<f32>(
        ray.direction,
        tri.corner_a - tri.corner_b,
        tri.corner_a - ray.origin,
    );
    let v: f32 = determinant(system_matrix) / denominator;
    if (v < 0.0 || u + v > 1.0) {
        return renderState;
    }

    system_matrix = mat3x3<f32>(
        tri.corner_a - ray.origin,
        tri.corner_a - tri.corner_b,
        tri.corner_a - tri.corner_c
    );
    let t: f32 = determinant(system_matrix) / denominator;

 if (t > tMin && t < tMax) {
    let triangleColor: vec4<f32> = vec4<f32>(tri.color, 0.5);  // alpha set to 0.5
    let previousColor: vec4<f32> = vec4<f32>(oldRenderState.color, 1.0);
    let blendedColor: vec4<f32> = mix(previousColor, triangleColor, triangleColor.a);
    renderState.color = blendedColor.rgb; // Only assign the RGB components
    renderState.normal = (1.0 - u - v) * tri.normal_a + u * tri.normal_b + v * tri.normal_c;
    let weirdColor: vec4<f32> = mix(triangleColor, previousColor, triangleColor.w);
    renderState.color = weirdColor.rgb;
    renderState.hit = true;
    renderState.t = t;
    renderState.normal = n;
    
    }
    

    return renderState;
}

fn hit_aabb(ray: Ray, node: Node) -> f32 {

    var inverseDir: vec3<f32> = vec3(1.0) / ray.direction;
    var t1: vec3<f32> = (node.minCorner - ray.origin) * inverseDir;
    var t2: vec3<f32> = (node.maxCorner - ray.origin) * inverseDir;
    var tMin: vec3<f32> = min(t1, t2);
    var tMax: vec3<f32> = max(t1, t2);

    var t_min: f32 = max(max(tMin.x, tMin.y), tMin.z);
    var t_max: f32 = min(min(tMax.x, tMax.y), tMax.z);

    if (t_min > t_max || t_max < 0) {
        return 99999;
    }
    else {
        return t_min;
    }
}

