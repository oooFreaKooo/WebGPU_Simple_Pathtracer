struct BLASInstance {
    transform: mat4x4<f32>,
    invTransform: mat4x4<f32>,
    blasOffset: u32,
    materialIdx: u32,
    _padding: vec2<f32>,
}

struct BLASNode {
    aabbMin: vec3<f32>,
    leftFirst: u32,
    aabbMax: vec3<f32>,
    triCount: u32,
}

struct TLASNode {
    aabbMin: vec3<f32>,
    left: u32,
    aabbMax: vec3<f32>,
    right: u32,
    instanceIdx: u32, // BLAS instance index for leaf nodes
}

struct Material {
    albedo: vec3f,             // Diffuse color
    specChance: f32,           // Probability of specular reflection
    specColor: vec3f,          // Specular color
    roughness: f32,            // Roughness for specular and refractive
    emissionColor: vec3f,      // Emission color
    emissionStrength: f32,     // Emission strength
    refrColor: vec3f,          // Refractive color
    refrChance: f32,           // Probability of refraction
    sssColor: vec3f,           // Subsurface scattering color
    sssStrength: f32,          // Subsurface scattering strength
    sssRadius: f32,            // Subsurface scattering radius
    ior: f32,                  // Index of refraction
}

struct Triangle {
    edge1: vec3f,
    edge2: vec3f,
    corner_a: vec3f,
    normal_a: vec3f,
    normal_b: vec3f,
    normal_c: vec3f,
}

struct HitPoint {
    material: Material,
    dist: f32,
    normal: vec3f,
    hit: bool,
    from_front: bool,
}

// Group 2: Object and BVH Data
@group(2) @binding(0) var<storage, read> meshTriangles : array<Triangle>;
@group(2) @binding(1) var<storage, read> blasNodes: array<BLASNode>;
@group(2) @binding(2) var<storage, read> blasInstances: array<BLASInstance>;
@group(2) @binding(3) var<storage, read> tlasNodes: array<TLASNode>;
@group(2) @binding(4) var<storage, read> triIdxInfo: array<u32>;
@group(2) @binding(5) var<storage, read> meshMaterial : array<Material>;
//@group(2) @binding(6) var object_textures: texture_2d_array<f32>;

// BVH Vars
const STACK_SIZE_TLAS: u32 = 16u;
const STACK_SIZE_BLAS: u32 = 16u;
const TOTAL_STACK_SIZE: u32 = 32u;
const T_MAX = 10000f;
var<private> threadIndex : u32;
var<workgroup> sharedStack: array<u32, 2048>;

fn get_thread_index(local_invocation_id: vec3<u32>) -> u32 {
    return local_invocation_id.x + local_invocation_id.y * 8u + local_invocation_id.z * 8u * 8u;
}

fn get_tlas_stack_base(threadIndex: u32) -> u32 {
    return threadIndex * TOTAL_STACK_SIZE;
}

fn get_blas_stack_base(threadIndex: u32) -> u32 {
    return threadIndex * TOTAL_STACK_SIZE + STACK_SIZE_TLAS;
}

fn trace_tlas(ray: Ray, hit_point: ptr<function, HitPoint>) {
    let inverseDir: vec3<f32> = 1.0 / ray.direction;
    
    // Calculate the base index for TLAS stack slice
    let tlasStackBase: u32 = get_tlas_stack_base(threadIndex);
    
    // Initialize TLAS stack pointer
    var tlas_sp: u32 = 0u;

    // Push root node onto the TLAS shared stack
    sharedStack[tlasStackBase + tlas_sp] = 0u;
    tlas_sp += 1u;

    while tlas_sp > 0u {
        tlas_sp -= 1u;
        let nodeIdx: u32 = sharedStack[tlasStackBase + tlas_sp];
        let tlasNode = tlasNodes[nodeIdx];

        // Early AABB hit test
        let nodeDistance: f32 = hit_aabb(ray, tlasNode.aabbMin, tlasNode.aabbMax, inverseDir);
        if nodeDistance >= (*hit_point).dist {
            continue;
        }

        let isLeaf = (tlasNode.left == 0u) && (tlasNode.right == 0u);
        if isLeaf {
            let instance: BLASInstance = blasInstances[tlasNode.instanceIdx];
            var blasHit: HitPoint;
            blasHit.hit = false;
            blasHit.dist = (*hit_point).dist;

            // Call trace_blas with shared stack
            trace_blas(ray, instance, &blasHit, threadIndex, &tlas_sp);

            if blasHit.hit && blasHit.dist < (*hit_point).dist {
                (*hit_point) = blasHit;
                // Early exit if hit is very close
                if blasHit.dist < EPSILON {
                    break;
                }
            }
        } else {
            // Fetch child indices
            let leftIdx = tlasNode.left;
            let rightIdx = tlasNode.right;

            // Retrieve AABBs for children
            let leftAabbMin = tlasNodes[leftIdx].aabbMin;
            let leftAabbMax = tlasNodes[leftIdx].aabbMax;
            let rightAabbMin = tlasNodes[rightIdx].aabbMin;
            let rightAabbMax = tlasNodes[rightIdx].aabbMax;

            // Calculate intersection distances
            let leftDistance = hit_aabb(ray, leftAabbMin, leftAabbMax, inverseDir);
            let rightDistance = hit_aabb(ray, rightAabbMin, rightAabbMax, inverseDir);

            // Traverse closer child first
            if leftDistance < rightDistance {
                if rightIdx != 0u && rightDistance < (*hit_point).dist {
                    sharedStack[tlasStackBase + tlas_sp] = rightIdx;
                    tlas_sp += 1u;
                }
                if leftIdx != 0u && leftDistance < (*hit_point).dist {
                    sharedStack[tlasStackBase + tlas_sp] = leftIdx;
                    tlas_sp += 1u;
                }
            } else {
                if leftIdx != 0u && leftDistance < (*hit_point).dist {
                    sharedStack[tlasStackBase + tlas_sp] = leftIdx;
                    tlas_sp += 1u;
                }
                if rightIdx != 0u && rightDistance < (*hit_point).dist {
                    sharedStack[tlasStackBase + tlas_sp] = rightIdx;
                    tlas_sp += 1u;
                }
            }
        }
    }
}

fn trace_blas(
    ray: Ray,
    instance: BLASInstance,
    hit_point: ptr<function, HitPoint>,
    threadIndex: u32,
    tlas_sp: ptr<function, u32>
) {
    var nearestHit: f32 = (*hit_point).dist;

    // Transform the ray into object space
    var object_ray: Ray;
    object_ray.origin = (instance.invTransform * vec4<f32>(ray.origin, 1.0)).xyz;
    object_ray.direction = (instance.invTransform * vec4<f32>(ray.direction, 0.0)).xyz;
    let inverseDir: vec3<f32> = 1.0 / object_ray.direction;

    // Cache material
    let material: Material = meshMaterial[instance.materialIdx];

    // Calculate the base index for BLAS stack slice
    let blasStackBase: u32 = get_blas_stack_base(threadIndex);
    
    // Initialize BLAS stack pointer
    var blas_sp: u32 = 0u;

    // Push root node onto the BLAS shared stack
    sharedStack[blasStackBase + blas_sp] = instance.blasOffset;
    blas_sp += 1u;

    while blas_sp > 0u {
        blas_sp -= 1u;
        let nodeIdx: u32 = sharedStack[blasStackBase + blas_sp];
        let node: BLASNode = blasNodes[nodeIdx];

        let hitDistance: f32 = hit_aabb(object_ray, node.aabbMin, node.aabbMax, inverseDir);

        if hitDistance >= nearestHit {
            continue;
        }

        let triCount: u32 = node.triCount;
        let leftFirst: u32 = node.leftFirst;

        if triCount > 0u {
            // Leaf node: Test all triangles
            var i: u32 = 0u;
            loop {
                if i >= triCount || i >= 2u {
                    break;
                }
                let triIdx: u32 = triIdxInfo[leftFirst + i];
                let triangle: Triangle = meshTriangles[triIdx];
                var triangleHitPoint: HitPoint;
                triangleHitPoint.hit = false;
                triangleHitPoint.dist = nearestHit;

                // Pass pointer to triangleHitPoint
                hit_triangle(object_ray, triangle, 0.001, nearestHit, &triangleHitPoint);

                if triangleHitPoint.hit && triangleHitPoint.dist < nearestHit {
                    nearestHit = triangleHitPoint.dist;
                    (*hit_point) = triangleHitPoint;
                    (*hit_point).normal = normalize((instance.transform * vec4<f32>((*hit_point).normal, 0.0)).xyz);
                    (*hit_point).material = material;
                }
                i += 1u;
            }
        } else {
            // Internal node: Traverse children in front-to-back order
            let childIdx1: u32 = node.leftFirst;
            let childIdx2: u32 = node.leftFirst + 1u;

            let child1: BLASNode = blasNodes[childIdx1];
            let child2: BLASNode = blasNodes[childIdx2];

            let hitDist1: f32 = hit_aabb(object_ray, child1.aabbMin, child1.aabbMax, inverseDir);
            let hitDist2: f32 = hit_aabb(object_ray, child2.aabbMin, child2.aabbMax, inverseDir);

            // Push the farther child first to ensure front-to-back traversal
            if hitDist1 < hitDist2 {
                if hitDist2 < nearestHit {
                    sharedStack[blasStackBase + blas_sp] = childIdx2;
                    blas_sp += 1u;
                }
                if hitDist1 < nearestHit {
                    sharedStack[blasStackBase + blas_sp] = childIdx1;
                    blas_sp += 1u;
                }
            } else {
                if hitDist1 < nearestHit {
                    sharedStack[blasStackBase + blas_sp] = childIdx1;
                    blas_sp += 1u;
                }
                if hitDist2 < nearestHit {
                    sharedStack[blasStackBase + blas_sp] = childIdx2;
                    blas_sp += 1u;
                }
            }
        }
    }

    // Update hit_point.dist if necessary
    (*hit_point).dist = nearestHit;
}

fn hit_triangle(
    ray: Ray,
    tri: Triangle,
    tMin: f32,
    tMax: f32,
    hit_point: ptr<function, HitPoint>
) {
    let h = cross(ray.direction, tri.edge2);
    let a = dot(tri.edge1, h);

    // Early rejection based on backface culling and parallelism
    if (a < EPSILON && setting.BACKFACE_CULLING == 1.0) || abs(a) < EPSILON {
        return;
    }

    let f = 1.0 / a;
    let s = ray.origin - tri.corner_a;
    let u = f * dot(s, h);

    // Early rejection based on u
    if u < 0.0 || u > 1.0 {
        return;
    }

    let q = cross(s, tri.edge1);
    let v = f * dot(ray.direction, q);

    if v < 0.0 || (u + v) > 1.0 {
        return;
    }

    let dist = f * dot(tri.edge2, q);

    // Early rejection based on distance
    if dist < tMin || dist > tMax {
        return;
    }

    let interpolated_normal = tri.normal_a * (1.0 - u - v) + tri.normal_b * u + tri.normal_c * v;
    let dotProduct = dot(ray.direction, interpolated_normal);
    let frontFace = dotProduct < 0.0;
    let finalNormal = select(interpolated_normal, -interpolated_normal, !frontFace);

    (*hit_point).dist = dist;
    (*hit_point).hit = true;
    (*hit_point).normal = finalNormal;
    (*hit_point).from_front = frontFace;
}


fn hit_aabb(ray: Ray, aabbMin: vec3<f32>, aabbMax: vec3<f32>, inverseDir: vec3<f32>) -> f32 {
    let t1: vec3<f32> = (aabbMin - ray.origin) * inverseDir;
    let t2: vec3<f32> = (aabbMax - ray.origin) * inverseDir;

    let tMin: vec3<f32> = min(t1, t2);
    let tMax: vec3<f32> = max(t1, t2);
    let t_min: f32 = max(max(tMin.x, tMin.y), tMin.z);
    let t_max: f32 = min(min(tMax.x, tMax.y), tMax.z);

    let condition: bool = (t_min > t_max) || (t_max < 0.0);
    return select(t_min, T_MAX, condition);
}

fn is_on_border(point: vec3<f32>, aabbMin: vec3<f32>, aabbMax: vec3<f32>, epsilon: f32) -> bool {
    var count: u32 = 0u;

    // Check proximity to each face
    if abs(point.x - aabbMin.x) < epsilon { count = count + 1u; }
    if abs(point.x - aabbMax.x) < epsilon { count = count + 1u; }
    if abs(point.y - aabbMin.y) < epsilon { count = count + 1u; }
    if abs(point.y - aabbMax.y) < epsilon { count = count + 1u; }
    if abs(point.z - aabbMin.z) < epsilon { count = count + 1u; }
    if abs(point.z - aabbMax.z) < epsilon { count = count + 1u; }

    // A point is on the border if it's near two or more faces (edges or corners)
    return count >= 2u;
}

//let intersectionPoint: vec3<f32> = ray.origin + distance * ray.direction;

//if DEBUG {
//    // Check if the intersection is on the border
//    if is_on_border(intersectionPoint, node.aabbMin, node.aabbMax, 0.01) {
//        closestHit.hit = true;
//        closestHit.material.albedo = vec3<f32>(1.0, 0.0, 0.0);
//        return closestHit;
//    }
//}