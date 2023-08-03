@group(0) @binding(0) var screen_sampler : sampler;
@group(0) @binding(1) var color_buffer : texture_2d<f32>;

struct VertexOutput {
    @builtin(position) Position : vec4<f32>,
    @location(0) TexCoord : vec2<f32>,
}

@vertex
fn vert_main(@builtin(vertex_index) VertexIndex : u32) -> VertexOutput {

    var positions = array<vec2<f32>, 6>(
        vec2<f32>( 1.0,  1.0),
        vec2<f32>( 1.0, -1.0),
        vec2<f32>(-1.0, -1.0),
        vec2<f32>( 1.0,  1.0),
        vec2<f32>(-1.0, -1.0),
        vec2<f32>(-1.0,  1.0)
    );

    var texCoords = array<vec2<f32>, 6>(
        vec2<f32>(1.0, 0.0),
        vec2<f32>(1.0, 1.0),
        vec2<f32>(0.0, 1.0),
        vec2<f32>(1.0, 0.0),
        vec2<f32>(0.0, 1.0),
        vec2<f32>(0.0, 0.0)
    );

    var output : VertexOutput;
    output.Position = vec4<f32>(positions[VertexIndex], 0.0, 1.0);
    output.TexCoord = texCoords[VertexIndex];
    return output;
}

@fragment
fn frag_main(@location(0) TexCoord : vec2<f32>) -> @location(0) vec4<f32> {
  
  var centeredCoord : vec2<f32> = TexCoord - vec2<f32>(0.5, 0.5); // translate to center
  var rotatedCoord : vec2<f32>;
  rotatedCoord.x = -1.0 * centeredCoord.x;
  rotatedCoord.y = -1.0 * centeredCoord.y;
  rotatedCoord = rotatedCoord + vec2<f32>(0.5, 0.5); // translate back
  
  return textureSample(color_buffer, screen_sampler, rotatedCoord);
}

