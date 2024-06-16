struct Uniforms {
	screenDims: vec2f,
	frameNum: f32,
	resetBuffer: f32,
}

@group(0) @binding(0) var<uniform> uniforms : Uniforms;
@group(0) @binding(1) var<storage, read_write> framebuffer: array<vec4f>;


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


@fragment
fn frag_main(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
    // Invert the y-coordinate
    let invertedX = uniforms.screenDims.x - fragCoord.x;
    let invertedY = uniforms.screenDims.y - fragCoord.y;
    let i = get2Dfrom1D(vec2f(invertedX, invertedY));
    var color = framebuffer[i].xyz / uniforms.frameNum;

    // Apply gamma correction
    color = aces_approx(color.xyz);
    color = pow(color.xyz, vec3f(1 / 2.2));

    // Reset buffer if needed
    if uniforms.resetBuffer == 1 {
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