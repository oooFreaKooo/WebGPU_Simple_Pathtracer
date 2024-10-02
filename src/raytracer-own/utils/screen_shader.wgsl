struct Uniforms {
	screenDims: vec2f,
	frameNum: f32,
	resetBuffer: f32,
}

struct ImageOutput {
    vignette_strength: f32,
    vignette_radius: f32,
}


@group(0) @binding(0) var<uniform> uniforms : Uniforms;
@group(0) @binding(1) var<storage, read_write> framebuffer: array<vec4f>;
@group(0) @binding(2) var<uniform> img : ImageOutput;


fn get2Dfrom1D(pos: vec2f) -> u32 {

    return (u32(pos.y) * u32(uniforms.screenDims.x) + u32(pos.x));
}

fn aces_approx(v: vec3f) -> vec3f {
    let v1 = v * 0.6f;
    const a = 2.51f;
    const b = 0.03f;
    const c = 2.43f;
    const d = 0.59f;
    const e = 0.14f;
    return clamp((v1 * (a * v1 + b)) / (v1 * (c * v1 + d) + e), vec3(0.0f), vec3(1.0f));
}

fn filmic(x: vec3f) -> vec3f {
    let X = max(vec3f(0.0), x - 0.004);
    let result = (X * (6.2 * X + 0.5)) / (X * (6.2 * X + 1.7) + 0.06);
    return pow(result, vec3(2.2));
}

@fragment
fn frag_main(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
    // Invert the y-coordinate
    let invertedX = uniforms.screenDims.x - fragCoord.x;
    let invertedY = uniforms.screenDims.y - fragCoord.y;
    let i = get2Dfrom1D(vec2f(invertedX, invertedY));
    
    // Retrieve current and previous frame colors
    var color = framebuffer[i].xyz / uniforms.frameNum;

    //color = filmic(color.xyz);
    color = aces_approx(color.xyz);
    color = pow(color.xyz, vec3f(1 / 2.2));

    // Vignette effect
    let screenPos = (fragCoord.xy / uniforms.screenDims) * 2.0 - vec2f(1.0);
    let dist = length(screenPos);
    let vignette = clamp(1.0 - img.vignette_strength * (dist - img.vignette_radius), 0.0, 1.0);
    color *= vignette;

    // Reset buffer if needed
    if uniforms.resetBuffer == 1.0 {
        framebuffer[i] = vec4f(0);
    }

    return vec4f(color, 1);
}


struct Vertex {
	@location(0) position: vec2f,
};

@vertex 
fn vert_main(
    vert: Vertex
) -> @builtin(position) vec4f {

    return vec4f(vert.position, 0.0, 1.0);
}