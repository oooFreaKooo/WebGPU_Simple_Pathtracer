struct ViewParams {
    frameCount: u32,
};

@group(0) @binding(0) var screen_sampler : sampler;
@group(0) @binding(1) var color_buffer : texture_2d<f32>;
@group(0) @binding(2) var<uniform> params: ViewParams;
@group(0) @binding(3) var accum_buffer_in: texture_2d<f32>;
@group(0) @binding(4) var accum_buffer_out: texture_storage_2d<rgba16float, write>;

@fragment
fn frag_main(@location(0) TexCoord: vec2<f32>) -> @location(0) vec4<f32> {
    let screen_pos: vec2i = vec2<i32>(i32(TexCoord.x * 2560.0), i32(TexCoord.y * 1284.0));

    var color = textureSample(color_buffer, screen_sampler, TexCoord);

    var accum_color = vec4(0.0);

    if params.frameCount > 0u {
        accum_color = textureLoad(accum_buffer_in, screen_pos, 0);
    }
    accum_color += color;

    textureStore(accum_buffer_out, screen_pos, accum_color);


    color = accum_color / f32(params.frameCount + 1u);
    color.r = ACESFilmChannel(color.r);
    color.g = ACESFilmChannel(color.g);
    color.b = ACESFilmChannel(color.b);

    // sRGB-mapping
    color.r = linear_to_srgb(color.r);
    color.g = linear_to_srgb(color.g);
    color.b = linear_to_srgb(color.b);

    return color;
}
fn ACESFilmChannel(x: f32) -> f32 {
    let a: f32 = 2.51;
    let b: f32 = 0.03;
    let c: f32 = 2.43;
    let d: f32 = 0.59;
    let e: f32 = 0.14;
    return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}


fn linear_to_srgb(x: f32) -> f32 {
    if x <= 0.0031308 {
        return 12.92 * x;
    }
    return 1.055 * pow(x, 1.0 / 2.4) - 0.055;
}



struct VertexOutput {
    @builtin(position) Position: vec4<f32>,
    @location(0) TexCoord: vec2<f32>,
}

@vertex
fn vert_main(@builtin(vertex_index) VertexIndex: u32) -> VertexOutput {

    var positions = array<vec2<f32>, 6>(
        vec2<f32>(-1.0, -1.0),
        vec2<f32>(-1.0, 1.0),
        vec2<f32>(1.0, 1.0),
        vec2<f32>(-1.0, -1.0),
        vec2<f32>(1.0, 1.0),
        vec2<f32>(1.0, -1.0)
    );

    var texCoords = array<vec2<f32>, 6>(
        vec2<f32>(1.0, 0.0),
        vec2<f32>(1.0, 1.0),
        vec2<f32>(0.0, 1.0),
        vec2<f32>(1.0, 0.0),
        vec2<f32>(0.0, 1.0),
        vec2<f32>(0.0, 0.0)
    );

    var output: VertexOutput;
    output.Position = vec4<f32>(positions[VertexIndex], 0.0, 1.0);
    output.TexCoord = texCoords[VertexIndex];
    return output;
}