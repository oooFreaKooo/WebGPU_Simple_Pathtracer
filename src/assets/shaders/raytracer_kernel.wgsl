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
    specularChance: f32,
    specularColor: vec3f,
    specularSmoothness: f32,
    emissionColor: vec3f,
    emissionStrength: f32,
    refractionColor: vec3f,
    refractionChance: f32,
    refractionRoughness: f32,
    ior: f32, //Index of Refraction
}


struct Triangle {
    corner_a: vec3f,
    normal_a: vec3f,
    corner_b: vec3f,
    normal_b: vec3f,
    corner_c: vec3f,
    normal_c: vec3f,
    material: Material,
    inverseModel: mat4x4<f32>,
}

struct ObjectData {
    triangles: array<Triangle>,
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

const EPSILON : f32 = 0.00001;
const PI : f32 = 3.14159265358979323846;


// Ray tracing function to compute the color of a ray as it bounces through the scene.
fn trace(camRay: Ray, seed: f32) -> vec3f {
    var ray = camRay;
    var accumulatedColor: vec3f = vec3(0.0, 0.0, 0.0);
    var energy = vec3(1.0, 1.0, 1.0);

    for (var bounce: u32 = 0u; bounce < u32(scene.maxBounces); bounce++) {
        let hit = traverse(ray);

        if !hit.hit {
            accumulatedColor += energy * sRGBToLinear(textureSampleLevel(skyTexture, textureSampler, ray.direction, 0.0).xyz);
            break;
        }

        let material = hit.material;
        let newSeed = vec2(hit.position.zx + vec2<f32>(hit.position.y, seed + f32(bounce)));
        let randomFloat: f32 = random(newSeed);

        let specularChance = fresnelReflect2(ray.direction, hit.normal, material.specularChance);
        let refractionChance = (1.0 - specularChance) * material.refractionChance;

        var rayType = 0; // 0: diffuse, 1: specular, 2: refractive
        if (specularChance > 0.0) && (randomFloat < specularChance) {
            rayType = 1;
        } else if (refractionChance > 0.0) && (randomFloat < (specularChance + refractionChance)) {
            rayType = 2;
        }

        ray.origin = hit.position + hit.normal * select(0.001, -0.001, rayType == 2);

        let diffuseDir = CosineWeightedHemisphereSample(hit.normal, newSeed);
        let specularDir = reflect(ray.direction, hit.normal);
        var refractDir = refract(ray.direction, hit.normal, 1.0 / material.ior);

        let randomDirection: vec3<f32> = CosineWeightedHemisphereSample(-hit.normal, newSeed);
        refractDir = normalize(mix(refractDir, randomDirection, material.refractionRoughness * material.refractionRoughness));

        ray.direction = mix(diffuseDir, specularDir, material.specularSmoothness * material.specularSmoothness * f32(rayType == 1));
        ray.direction = mix(ray.direction, refractDir, f32(rayType == 2));

        accumulatedColor += material.emissionColor * material.emissionStrength * energy;
        energy *= select(mix(material.albedo, material.specularColor, f32(rayType == 1)), material.refractionColor, rayType == 2);

        let p = max(energy.r, max(energy.g, energy.b));
        if random(newSeed) > p {
            break;
        }
        energy *= (1.0 / p);
    }

    return accumulatedColor;
}





fn trace2(camRay: Ray, seed: f32) -> vec3f {
    var ray = camRay;
    var color: vec3f = vec3(0.0, 0.0, 0.0);
    var energy = vec3(1.0, 1.0, 1.0);

    for (var bounce: u32 = 0u; bounce < u32(scene.maxBounces); bounce++) {
        let hit = traverse(ray);

        if !hit.hit {
            color = energy * sRGBToLinear(textureSampleLevel(skyTexture, textureSampler, ray.direction, 0.0).xyz);
            break;
        }

        let material = hit.material;

        var specularChance = material.specularChance;
        var refractionChance = material.refractionChance;

        // Adjust chances based on Fresnel effect
        var rayProbability = 1.0;
        let newSeed = vec2(hit.position.zx + vec2<f32>(hit.position.y, seed + f32(bounce)));
        let randomFloat: f32 = random(newSeed);

        specularChance = fresnelReflect2(ray.direction, hit.normal, material.specularChance);
        let chanceMultiplier: f32 = (1.0 - specularChance) / (1.0 - material.specularChance);
        refractionChance *= chanceMultiplier;

        // Determine ray type: diffuse, specular, or refractive
         //calculate whether we are going to do a diffuse, specular, or refractive ray
        var doSpecular: f32 = 0.0;
        var doRefraction: f32 = 0.0;

        if (specularChance > 0.0) && (randomFloat < specularChance) {
            doSpecular = 1.0;
            rayProbability = specularChance;
        } else if (refractionChance > 0.0) && (randomFloat < (specularChance + refractionChance)) {
            doRefraction = 1.0;
            rayProbability = refractionChance;
        } else {
            rayProbability = 1.0 - (specularChance + refractionChance);
        }

        //numerical problems can cause rayProbability to become small enough to cause a divide by zero.
        rayProbability = max(rayProbability, 0.001);

        // Update ray position
        ray.origin = hit.position + hit.normal * select(0.001, -0.001, doRefraction == 1.0);

        // Calculate new ray direction
        let diffuseDir = CosineWeightedHemisphereSample(hit.normal, newSeed);
        var specularDir = reflect(ray.direction, hit.normal);

        var refractionRayDir: vec3<f32> = refract(ray.direction, hit.normal, 1.0 / material.ior);
        let randomDirection: vec3<f32> = CosineWeightedHemisphereSample(-hit.normal, newSeed);
        refractionRayDir = normalize(mix(refractionRayDir, randomDirection, material.refractionRoughness * material.refractionRoughness));

        ray.direction = mix(diffuseDir, specularDir, material.specularSmoothness * material.specularSmoothness * doSpecular);
        ray.direction = mix(ray.direction, refractionRayDir, doRefraction);

        // Add emissive lighting
        color += material.emissionColor * material.emissionStrength * energy;

        // Update energy
        if doRefraction == 1.0 {
            energy *= material.refractionColor; // Multiply by refraction color for refractive rays
        } else {
            energy *= mix(material.albedo, material.specularColor, doSpecular);
        }


        energy /= rayProbability;

        // Russian Roulette termination
        let p = max(energy.r, max(energy.g, energy.b));
        if random(newSeed) > p {
            break;
        }
        energy *= (1.0 / p);
    }

    return color;
}


//https://blog.demofox.org/2020/06/14/casual-shadertoy-path-tracing-3-fresnel-rough-refraction-absorption-orbit-camera/
fn trace3(camRay: Ray, seed: f32) -> vec3f {
    var ray = camRay;

    var color: vec3f = vec3(0.0, 0.0, 0.0);
    var energy = vec3(1.0, 1.0, 1.0);

    for (var bounce: u32 = 0u; bounce < u32(scene.maxBounces); bounce++) {
        let hit = traverse(ray);

        if !hit.hit {
            var textureSky = sRGBToLinear(textureSampleLevel(skyTexture, textureSampler, ray.direction, 0.0).xyz);
            color = textureSky;
            break;
        }
        let material = hit.material;


        //Absorbiere die energie wenn wir von innen treffen
        if hit.front_face {
            energy *= exp(-material.refractionColor * hit.dist);//berechne die Basis des natürlichen Logarithmus (e) hoch einer gegebenen Zahl
        }

        var specularChance = material.specularChance;
        var refractionChance = material.refractionChance;

        //take fresnel into account for specularChance and adjust other chances.
        //specular takes priority.
        //chanceMultiplier makes sure we keep diffuse / refraction ratio the same.
        var rayProbability = 1.0;
        let newSeed = vec2(hit.position.zx + vec2<f32 >(hit.position.y, seed + f32(bounce)));
        let randomFloat: f32 = random(newSeed);

        if specularChance > randomFloat {
            var ior1 = 0.0;
            var ior2 = 0.0;

            if hit.front_face {
                ior1 = material.ior;
                ior2 = 1.0;
            } else {
                ior1 = 1.0;
                ior2 = material.ior;
            }

            specularChance = fresnelReflect(ior1, ior2, hit.normal, ray.direction, material.specularChance, 1.0);

            let chanceMultiplier: f32 = (1.0 - specularChance) / (1.0 - material.specularChance);
            refractionChance *= chanceMultiplier;
        }



        //calculate whether we are going to do a diffuse, specular, or refractive ray
        var doSpecular: f32 = 0.0;
        var doRefraction: f32 = 0.0;


        if randomFloat < specularChance {
            doSpecular = 1.0;
            rayProbability = specularChance;
        } else if randomFloat < (specularChance + refractionChance) {
            doRefraction = 1.0;
            rayProbability = refractionChance;
        } else {
            rayProbability = 1.0 - (specularChance + refractionChance);
        }

        //numerical problems can cause rayProbability to become small enough to cause a divide by zero.
        rayProbability = max(rayProbability, 0.001);

        //update the ray position
        if doRefraction == 1.0 {
            ray.origin = hit.position - hit.normal * EPSILON;
        } else {
            ray.origin = hit.position + hit.normal * EPSILON;
        }

        //Calculate a new ray direction.
        //Diffuse uses a normal oriented cosine weighted hemisphere sample.
        //Perfectly smooth specular uses the reflection ray.
        //Rough (glossy) specular lerps from the smooth specular to the rough diffuse by the material roughness squared
        //Squaring the roughness is just a convention to make roughness feel more linear perceptually.
        let diffuseDir = CosineWeightedHemisphereSample(hit.normal, newSeed);
        //let diffuseDir = normalize(hit.normal + RandomUnitVector(newSeed));

        var specularDir = reflect(ray.direction, hit.normal);


        var iorValue: f32 = 0.0;
        if hit.front_face {
            iorValue = material.ior;
        } else {
            iorValue = 1.0 / material.ior;
        }

        var refractionRayDir: vec3<f32> = refract(ray.direction, hit.normal, iorValue);

        let randomDirection: vec3<f32> = CosineWeightedHemisphereSample(-hit.normal, newSeed);
        //let randomDirection = normalize(-hit.normal + RandomUnitVector(newSeed));

        refractionRayDir = normalize(mix(refractionRayDir, randomDirection, material.refractionRoughness * material.refractionRoughness));

        ray.direction = mix(diffuseDir, specularDir, material.specularSmoothness * material.specularSmoothness * doSpecular);
        ray.direction = mix(ray.direction, refractionRayDir, doRefraction);

        //add in emissive lighting
        color += material.emissionColor * material.emissionStrength * energy;

        //update the colorMultiplier. refraction doesn't alter the color until we hit the next thing, so we can do light absorption over distance.
        if doRefraction == 0.0 {
            energy *= mix(material.albedo, material.specularColor, doSpecular);
        }

        //since we chose randomly between diffuse, specular, refract,
        //we need to account for the times we didn't do one or the other.
        energy /= rayProbability;

        //Russian Roulette
        //As the energy gets smaller, the ray is more likely to get terminated early.
        //Survivors have their value boosted to make up for fewer samples being in the average.

        //https://www.cs.princeton.edu/courses/archive/fall06/cos526/lectures/montecarlo2.pdf

        let p = max(energy.x, max(energy.y, energy.z));
        if random(newSeed) > p {
            break;
        }
        energy *= (1.0 / p);//Kompensiere die verlorene Energie

        //Diffuse und spiegelnde Richtung
        //https://github.com/SebLague/Ray-Tracing/blob/main/Assets/Scripts/Shaders/RayTracing.shader
    }

    return color;
}
// https://raytracing.github.io/books/RayTracingInOneWeekend.html#dielectrics/refraction
fn refract(uv: vec3<f32>, n: vec3<f32>, etai_over_etat: f32) -> vec3<f32> {
    let cos_theta = min(dot(-uv, n), 1.0);
    let r_out_perp = etai_over_etat * (uv + cos_theta * n);
    let r_out_parallel = -sqrt(abs(1.0 - dot(r_out_perp, r_out_perp))) * n;
    return r_out_perp + r_out_parallel;
}


fn fresnelReflect2(incident: vec3<f32>, norm: vec3<f32>, R0: f32) -> f32 {
    var cos0: f32 = dot(incident, norm);

    // Ensure cosI is in the range [0, 1]
    if cos0 < 0.0 {
        cos0 = -cos0;
    }

    // Schlick approximation
    let x: f32 = pow(1.0 - cos0, 5.0);
    let ret: f32 = R0 + (1.0 - R0) * x;

    return ret;
}

fn fresnelReflect(n1: f32, n2: f32, incident: vec3<f32>, norm: vec3<f32>, f0: f32, f90: f32) -> f32 {
    var normal = norm;
    var cosI: f32 = dot(incident, normal);
    var n: f32;
    var refl: f32;
    var trans: f32;

    if cosI > 0.0 {
        n = n1 / n2;
        normal = -normal;
    } else {
        n = n2 / n1;
        cosI = -cosI;
    }

    let sinT2: f32 = n * n * (1.0 - cosI * cosI);
    let cosT: f32 = sqrt(1.0 - sinT2);

    // Fresnel equations
    var rn: f32 = (n1 * cosI - n2 * cosT) / (n1 * cosI + n2 * cosT);
    var rt: f32 = (n2 * cosI - n1 * cosT) / (n2 * cosI + n2 * cosT);
    rn *= rn;
    rt *= rt;
    refl = (rn + rt) * 0.5;
    trans = 1.0 - refl;

    if cosT * cosT < 0.0 {
        return f90;
    }

    let x: f32 = 1.0 - cosI;
    let ret: f32 = f0 + (1.0 - f0) * x * x * x * x * x;

    // Return the reflection coefficient based on the Fresnel equations and the given f0 and f90 values
    return mix(f0, f90, ret);
}


//https://my.eng.utah.edu/~cs6965/slides/pathtrace.pdf
fn CosineWeightedHemisphereSample(normal: vec3<f32>, seed: vec2<f32>) -> vec3<f32> {
    let u = random(seed);
    let v = random(vec2(seed.y, seed.x + 1.0));

    //Sphärische Koordinaten
    //Verteilung ist kosinus gewichtet: die generierten Vektoren zeigen wahrscheinlicher in richtung der normalen
    let theta = 2.0 * PI * u; //Azimutwinkel : Vollkreis im intervall 0 und 2pi
    let phi = asin(sqrt(v));//Polarwinkel: vertikale richtung -pi/2 und pi/2. phi nah an 0 heißt vektor ist nah an horizontaler ebene

    let sin_phi = sin(phi);
    //Kartesische Koordinaten: Vektoren die in eine Zufällige richtung im Raum zeigen
    let x = cos(theta) * sin_phi;
    let y = sin(theta) * sin_phi;
    let z = cos(phi);   //von 0 bis pi/2 : Halbkugel


    //Einen up vektor erstellen der nicht parallel zur Normale ist
    let xSmallest = f32(abs(normal.x) < abs(normal.y) && abs(normal.x) < abs(normal.z)); // 1 oder 0
    let ySmallest = f32(abs(normal.y) < abs(normal.z) && abs(normal.x) >= abs(normal.y)); // 1 oder 0
    let up = vec3(xSmallest, ySmallest, 1.0 - xSmallest - ySmallest);

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
    var stack: array<Node, 32>;
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

    if a < EPSILON {
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
    surfacePoint.normal = normalize((transpose(tri.inverseModel) * vec4(normal, 0.0)).xyz);


    surfacePoint.material = tri.material;
    surfacePoint.dist = dist;
    surfacePoint.position = ray.origin + ray.direction * dist;
    surfacePoint.hit = true;//Es gibt einen Treffer

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

@compute @workgroup_size(16, 16, 1)
fn main(@builtin(global_invocation_id) GlobalInvocationID: vec3<u32>) {
    let screen_size: vec2i = vec2<i32 >(textureDimensions(color_buffer));
    let screen_pos: vec2i = vec2<i32 >(i32(GlobalInvocationID.x), i32(GlobalInvocationID.y));

    let aspect_ratio: f32 = f32(screen_size.x) / f32(screen_size.y);
    let tanHalfFOV: f32 = tan(scene.cameraFOV * 0.5);
    let halfScreenSize: vec2<f32> = vec2<f32 >(screen_size) * 0.5;

    let forwards: vec3f = scene.cameraForwards;
    let right: vec3f = scene.cameraRight;
    let up: vec3f = scene.cameraUp;

    let num_samples: u32 = u32(scene.samples);
    var accumulated_color: vec3f = vec3(0.0);
    var seed: f32 = scene.time / 25236.3;
    var myRay: Ray;
    for (var i: u32 = 0u; i < num_samples; i++) {
        let jitter: vec2<f32> = (random(vec2<f32 >(seed, f32(i))) - 0.5) / vec2<f32 >(screen_size);
        let screen_jittered: vec2<f32> = vec2<f32 >(screen_pos) + jitter - halfScreenSize;
        let horizontal_coefficient: f32 = tanHalfFOV * screen_jittered.x / f32(screen_size.x);
        let vertical_coefficient: f32 = tanHalfFOV * screen_jittered.y / (f32(screen_size.y) * aspect_ratio);

        myRay.direction = normalize(forwards + horizontal_coefficient * right + vertical_coefficient * up);
        myRay.origin = scene.cameraPos;
        accumulated_color += trace(myRay, seed + f32(i));
    }
    var textureSky = textureSampleLevel(skyTexture, textureSampler, myRay.direction, 0.0).xyz;
    var pixel_color: vec3f = accumulated_color / f32(num_samples);
    textureStore(color_buffer, screen_pos, vec4<f32 >(pixel_color, 1.0));
}
