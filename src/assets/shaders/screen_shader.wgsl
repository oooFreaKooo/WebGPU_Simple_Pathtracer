@group(0) @binding(0) var screen_sampler : sampler;
@group(0) @binding(1) var color_buffer : texture_2d<f32>;
@group(0) @binding(2) var<uniform> frameCount : u32;
@group(0) @binding(3) var accum_buffer_in: texture_2d<f32>;
@group(0) @binding(4) var accum_buffer_out: texture_storage_2d<rgba16float, write>;

@fragment
fn frag_main(@location(0) TexCoord: vec2<f32>) -> @location(0) vec4<f32> {

    let screen_pos: vec2i = vec2<i32 >(i32(TexCoord.x), i32(TexCoord.y));

    var color = textureSample(color_buffer, screen_sampler, TexCoord);

    var accum_color = vec4(0.0);
    if frameCount > 0u {
        accum_color = textureLoad(accum_buffer_in, screen_pos, 0);
    }
    accum_color += color;

    textureStore(accum_buffer_out, screen_pos, accum_color);

    // Safe division
    if frameCount + 1u > 0u {
        color = accum_color / f32(frameCount + 1u);
    } else {
        color = accum_color;
    }

    // sRGB-mapping
    color.r = linear_to_srgb(color.r);
    color.g = linear_to_srgb(color.g);
    color.b = linear_to_srgb(color.b);

    return color;
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