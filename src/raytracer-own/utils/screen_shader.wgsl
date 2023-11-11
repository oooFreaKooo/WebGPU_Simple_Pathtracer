@group(0) @binding(0) var mySampler : sampler;
@group(0) @binding(1) var myTexture : texture_2d<f32>;

const RADIUS : i32 = 1;
const SIGMA_SPACE : f32 = 5.0;
const SIGMA_COLOR : f32 = 0.3;
const EXPOSURE: f32 = 2.0;

//  bilateral filter for smoother image
@fragment
fn frag_main(@location(0) TexCoord: vec2<f32>) -> @location(0) vec4<f32> {
    var central_color: vec4<f32> = textureSample(myTexture, mySampler, TexCoord);

    var weight_sum: f32 = 0.0;
    var result: vec4<f32> = vec4<f32>(0.0, 0.0, 0.0, 0.0);

    for (var y: i32 = -RADIUS; y <= RADIUS; y = y + 1) {
        for (var x: i32 = -RADIUS; x <= RADIUS; x = x + 1) {
            let sample_coord = TexCoord + vec2<f32>(f32(x) / f32(textureDimensions(myTexture).x), f32(y) / f32(textureDimensions(myTexture).y));
            let sample_color = textureSample(myTexture, mySampler, sample_coord);

            let distance = length(vec2<f32>(f32(x), f32(y)));
            let color_difference = length(central_color - sample_color);

            let weight = weight_function(distance, color_difference);

            weight_sum = weight_sum + weight;
            result = result + weight * sample_color;
        }
    }

    return (central_color) * EXPOSURE;
}

fn weight_function(distance: f32, difference: f32) -> f32 {
    let spatial = exp(-distance / (2.0 * SIGMA_SPACE * SIGMA_SPACE));
    let color = exp(-difference / (2.0 * SIGMA_COLOR * SIGMA_COLOR));
    return spatial * color;
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