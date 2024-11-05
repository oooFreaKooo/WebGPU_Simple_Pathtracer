struct CameraData {
    pos: vec3<f32>,
    forward: vec3<f32>,
    right: vec3<f32>,
    up: vec3<f32>,
}

struct Settings {
    maxBounces: f32,
    numSamples: f32,
    BACKFACE_CULLING: f32,
    skyMode: f32,
    aspectRatio: f32,
    jitterScale: f32,
    numLights: f32,
}

struct CameraSettings {
    cameraFOV: f32,
    focusDistance: f32,
    apertureSize: f32,
}

struct Uniforms {
	screenDims: vec2f,
	frameNum: u32,
	resetBuffer: f32,
}

struct Ray {
    direction: vec3<f32>,
    origin: vec3<f32>,
}

struct RayType {
    isSpecular: f32,
    isRefractive: f32,
    regularBounces: u32,
}

struct SFC32State {
    a: u32,
    b: u32,
    c: u32,
    d: u32,
}

// Group 0: Uniforms and Settings
@group(0) @binding(0) var<uniform> uniforms : Uniforms;
@group(0) @binding(1) var<uniform> cam : CameraData;
@group(0) @binding(2) var<uniform> setting : Settings;
@group(0) @binding(3) var<uniform> cam_setting : CameraSettings;

// Group 1: Framebuffer
@group(1) @binding(0) var<storage, read_write> framebuffer: array<vec4f>;

// Group 3: Textures and Samplers
@group(3) @binding(0) var skyTexture : texture_cube<f32>;
@group(3) @binding(1) var skySampler : sampler;

const DEBUG = false;
const EPSILON: f32 = 1.0e-7;
const PI  = 3.14159265358979323846;
const TWO_PI: f32 = 6.28318530718;

var<private> pixelCoords : vec2f;
var<private> rngState: SFC32State;
var<workgroup> sharedAccumulatedColor: array<vec3f, 64>;

@compute @workgroup_size(8, 8)
fn main(
    @builtin(global_invocation_id) GlobalInvocationID: vec3u,
    @builtin(workgroup_id) workgroup_id: vec3<u32>,
    @builtin(local_invocation_id) local_invocation_id: vec3<u32>,
    @builtin(local_invocation_index) local_invocation_index: u32,
) {
    if GlobalInvocationID.x >= u32(uniforms.screenDims.x) * u32(uniforms.screenDims.y) {
        return;
    }
    let DIMENSION = uniforms.screenDims;
    let coord = vec2u(
        workgroup_id.x * 8u + local_invocation_id.x,
        workgroup_id.y * 8u + local_invocation_id.y
    );
    let idx = coord.y * u32(DIMENSION.x) + coord.x;
    let pixelCoords = vec2<f32>(f32(coord.x), f32(coord.y));

    threadIndex = get_thread_index(local_invocation_id);
    // Random state initialization
    rngState = initialize_rng(coord * idx, uniforms.frameNum);

    // Precompute constants outside the loops
    let FOV = cam_setting.cameraFOV;
    let fov_over_dim_x = FOV / f32(DIMENSION.x);
    let fov_over_dim_y_ar = FOV / (f32(DIMENSION.y) * setting.aspectRatio);

    var myRay: Ray;
    myRay.origin = cam.pos;

    sharedAccumulatedColor[local_invocation_index] = vec3<f32>(0.0);
    var sampleCount = 0.0;

    for (var i: u32 = 0u; i < u32(setting.numSamples); i += 1u) {
        // Generate random offsets in x and y between -0.5 and 0.5
        let randOffset = rand2() - vec2f(0.5);

        // Adjust pixelCoords with random offsets
        let sampleCoords = pixelCoords + vec2<f32>(randOffset.x, randOffset.y) * setting.jitterScale;

        // Recompute screen_base, horizontal_coeff, vertical_coeff
        let screen_base = sampleCoords - (DIMENSION.xy) * 0.5;
        let horizontal_coeff = fov_over_dim_x * screen_base.x;
        let vertical_coeff = fov_over_dim_y_ar * screen_base.y;


        myRay.direction = normalize(
            cam.forward + horizontal_coeff * cam.right + vertical_coeff * cam.up
        );

        sharedAccumulatedColor[local_invocation_index] += trace(myRay);
    }

    var acc_radiance = sharedAccumulatedColor[local_invocation_index] / f32(setting.numSamples);

    if uniforms.resetBuffer == 0.0 {
        acc_radiance += framebuffer[idx].xyz;
    }

    framebuffer[idx] = vec4<f32>(acc_radiance, 1.0);
}

fn trace(camRay: Ray) -> vec3f {
    var hit: HitPoint;
    var ray = camRay;
    var acc_radiance: vec3f = vec3(0.0);
    var throughput: vec3f = vec3(1.0);

    let maxBounces = u32(setting.maxBounces);

    for (var bounce: u32 = 0u; bounce < maxBounces; bounce++) {

        // ------ Initialize hit and trace scene ------
        hit.hit = false;
        hit.dist = T_MAX;
        trace_tlas(ray, &hit);

        // ------ Handle sky radiance if no hit ------
        if !hit.hit {
            let sky_radiance = getSkyRadiance(ray.direction, setting.skyMode);
            acc_radiance = acc_radiance + throughput * sky_radiance;
            break;
        }

        let M = hit.material;

        // ------ Russian Roulette for path termination ------
        let rr_prob = max(max(throughput.r, throughput.g), throughput.b);
        if rr_prob < 0.1 || rand() >= rr_prob {
            break;
        }
        throughput /= rr_prob;

        // ------ Update throughput with absorption ------
        let absorption = select(vec3f(1.0), exp(-M.refrColor * 10.0), hit.from_front);
        throughput *= absorption;

        // ------ Precompute roughness squared ------
        let roughness2 = M.roughness * M.roughness;

        // ------ Determine ray type (diffuse, specular, refractive) ------
        var rayType: RayType;

        let rnd = rand();
        if M.specChance > 0.0 && rnd < M.specChance {
            rayType.isSpecular = 1.0;
        } else if M.refrChance > 0.0 && rnd < (M.specChance + M.refrChance) {
            rayType.isRefractive = 1.0;
        } else {
            rayType.regularBounces += 1u;
        }

        // ------ Early termination for diffuse rays ------
        if rayType.regularBounces >= 4u && rayType.isSpecular == 0.0 {
            break;
        }

        // ------ Update ray origin based on hit information and ray type ------
        let offset = select(hit.normal, -hit.normal, rayType.isRefractive == 1.0) * EPSILON;
        ray.origin = ray.origin + ray.direction * hit.dist + offset;

        // ------ Calculate refraction indices ------
        let n1 = select(1.0, M.ior, !hit.from_front);
        let n2 = select(1.0, M.ior, hit.from_front);

        // ------ Compute new ray directions ------

        // Diffuse direction
        let diffuseDir = cosine_weighted_hemisphere(hit.normal);

        // Specular direction
        var specularDir = reflect(ray.direction, hit.normal);
        specularDir = normalize(mix(specularDir, diffuseDir, roughness2));


        // Refractive direction
        var refractDir = refract(ray.direction, hit.normal, n1 / n2);
        let totalInternalReflection = length(refractDir) == 0.0;
        refractDir = select(refractDir, specularDir, totalInternalReflection);
        refractDir = normalize(mix(refractDir, cosine_weighted_hemisphere(-hit.normal), roughness2));

        // ------ Mix and update ray direction ------
        ray.direction = mix(
            mix(diffuseDir, specularDir, rayType.isSpecular),
            refractDir,
            rayType.isRefractive
        );

        // ------ Accumulate emission ------
        acc_radiance += throughput * M.emissionColor * M.emissionStrength;

        // ------ Handle subsurface scattering ------
        if M.sssStrength > 0.0 {
            let attenuation = exp(-length(ray.direction) / M.sssRadius);
            acc_radiance += throughput * (M.sssColor * M.sssStrength * attenuation);
            throughput *= (1.0 - M.sssStrength);
        }

        // ------ Update throughput with albedo and specular contribution ------
        throughput *= (M.albedo + M.specColor * rayType.isSpecular);
    }

    return acc_radiance;
}

fn getSkyRadiance(rayDirection: vec3<f32>, skyMode: f32) -> vec3<f32> {
    let skyModeInt = i32(skyMode);
    var sky_radiance: vec3<f32>;

    switch (skyModeInt) {
        case 0: { // Black Sky
            sky_radiance = vec3<f32>(0.0, 0.0, 0.0);
        }
        case 1: { // Procedural Sky
            sky_radiance = proceduralSky(rayDirection);
        }
        case 2: { // Sky Texture
            sky_radiance = textureSampleLevel(skyTexture, skySampler, rayDirection, 0.0).xyz;
        }
        default: {
            sky_radiance = vec3<f32>(0.0, 0.0, 0.0);
        }
    }

    return sky_radiance;
}

fn proceduralSky(direction: vec3<f32>) -> vec3<f32> {
    let sunDirection = normalize(vec3<f32>(0.0, 0.99, 0.5));
    let sunColor = vec3<f32>(1.0, 0.9, 0.6);
    let sunIntensity = max(dot(direction, sunDirection), 0.0);
    let horizonColor = vec3<f32>(0.8, 0.9, 1.0);
    let zenithColor = vec3<f32>(0.1, 0.4, 0.8);
    let t = clamp(direction.y * 0.5 + 0.5, 0.0, 1.0);
    let skyColor = mix(horizonColor, zenithColor, t);

    // Add sun glow
    let sunGlow = sunColor * pow(sunIntensity, 128.0);
    let color = skyColor + sunGlow;

    // Apply atmospheric attenuation
    let betaRayleigh = vec3<f32>(5.5e-6, 13.0e-6, 22.4e-6); // Rayleigh scattering coefficients
    let opticalDepth = exp(-direction.y * 0.1); // Simplified optical depth
    let atmosphericColor = color * exp(-betaRayleigh * opticalDepth);

    return clamp(atmosphericColor, vec3<f32>(0.0), vec3<f32>(1.0));
}

fn cosine_weighted_hemisphere(normal: vec3f) -> vec3f {
    let r1 = rand();
    let r2 = rand();
    let r = sqrt(r1);
    let theta = TWO_PI * r2;

    let x = r * cos(theta);
    let y = r * sin(theta);
    let z = sqrt(1.0 - r1);

    var w = normalize(normal);
    var tangent = select(vec3(0.0, 1.0, 0.0), vec3(1.0, 0.0, 0.0), abs(w.y) > 0.999);
    let u = normalize(cross(tangent, w));
    let v = cross(w, u);

    return normalize(u * x + v * y + w * z);
}

fn initialize_rng(id: vec2u, frameNum: u32) -> SFC32State {
    return SFC32State(
        frameNum ^ id.x,
        frameNum ^ id.y,
        frameNum ^ (id.x + id.y),
        frameNum ^ (id.x * id.y)
    );
}

// SFC32 RNG implementation
fn rand() -> f32 {
    let t = rngState.a + rngState.b;
    rngState.a = rngState.b ^ (rngState.b >> 9u);
    rngState.b = rngState.c + (rngState.c << 3u);
    rngState.c = (rngState.c << 21u) | (rngState.c >> 11u);
    rngState.d = rngState.d + 1u;
    let t_new = t + rngState.d;
    rngState.c = rngState.c + t_new;
    return f32(t_new) / 4294967296.0;
}

fn rand2() -> vec2f {
    return vec2f(rand(), rand());
}
