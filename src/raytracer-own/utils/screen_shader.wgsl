@group(0) @binding(0) var mySampler : sampler;
@group(0) @binding(1) var myTexture : texture_2d<f32>;

const EXPOSURE: f32 = 2.0;
const rangeMax: f32 = 8.0;
const FXAA_EDGE_THRESHOLD_MIN: f32 = 1.0 / 16.0;
const XAA_EDGE_THRESHOLD: f32 = 1.0 / 8.0;
const FXAA_SUBPIX_TRIM: f32 = 1.0 / 4.0;
const FXAA_SUBPIX_TRIM_SCALE: f32 = 1.0;
const FXAA_SUBPIX_CAP: f32= 3.0 / 8.0;

@fragment
fn frag_main(@location(0) TexCoord: vec2<f32>) -> @location(0) vec4<f32> {
    // with FXAA
    //let resolution = vec2<f32>(f32(textureDimensions(myTexture).x), f32(textureDimensions(myTexture).y));
    //return fxaa(TexCoord, resolution) * EXPOSURE;
    // without FXAA
    let color = textureSample(myTexture, mySampler, TexCoord) * EXPOSURE;
    return color;
}

fn FxaaLuma(rgb: vec3<f32>) -> f32 {
    return rgb.y * (0.587 / 0.299) + rgb.x;
}
fn FxaaToVec3(value: f32) -> vec3<f32> {
    return vec3<f32>(value, value, value);
}
// https://developer.download.nvidia.com/assets/gamedev/files/sdk/11/FXAA_WhitePaper.pdf
fn fxaa(TexCoord: vec2<f32>, resolution: vec2<f32>) -> vec4<f32> {
    let inverse_resolution = 1.0 / resolution;

// Pre-sample all necessary texture coordinates
    let rgbN = textureSample(myTexture, mySampler, TexCoord + (vec2<f32>(0.0, -1.0) * inverse_resolution)).rgb;
    let rgbW = textureSample(myTexture, mySampler, TexCoord + (vec2<f32>(-1.0, 0.0) * inverse_resolution)).rgb;
    let rgbM = textureSample(myTexture, mySampler, TexCoord + (vec2<f32>(0.0, 0.0) * inverse_resolution)).rgb;
    let rgbE = textureSample(myTexture, mySampler, TexCoord + (vec2<f32>(1.0, 0.0) * inverse_resolution)).rgb;
    let rgbS = textureSample(myTexture, mySampler, TexCoord + (vec2<f32>(0.0, 1.0) * inverse_resolution)).rgb;
    let rgbNW = textureSample(myTexture, mySampler, TexCoord + (vec2<f32>(-1.0, -1.0) * inverse_resolution)).rgb;
    let rgbNE = textureSample(myTexture, mySampler, TexCoord + (vec2<f32>(1.0, -1.0) * inverse_resolution)).rgb;
    let rgbSW = textureSample(myTexture, mySampler, TexCoord + (vec2<f32>(-1.0, 1.0) * inverse_resolution)).rgb;
    let rgbSE = textureSample(myTexture, mySampler, TexCoord + (vec2<f32>(1.0, 1.0) * inverse_resolution)).rgb;

    let lumaN = FxaaLuma(rgbN);
    let lumaW = FxaaLuma(rgbW);
    let lumaM = FxaaLuma(rgbM);
    let lumaE = FxaaLuma(rgbE);
    let lumaS = FxaaLuma(rgbS);
    let lumaNW = FxaaLuma(rgbNW);
    let lumaNE = FxaaLuma(rgbNE);
    let lumaSW = FxaaLuma(rgbSW);
    let lumaSE = FxaaLuma(rgbSE);
    let rangeMin = min(lumaM, min(min(lumaN, lumaW), min(lumaS, lumaE)));
    let rangeMax = max(lumaM, max(max(lumaN, lumaW), max(lumaS, lumaE)));
    let range = rangeMax - rangeMin;

    if range < max(FXAA_EDGE_THRESHOLD_MIN, rangeMax * XAA_EDGE_THRESHOLD) {
        return vec4<f32>(rgbM, 1.0);
    }

    let lumaL = (lumaN + lumaW + lumaE + lumaS) * 0.25;
    let rangeL = abs(lumaL - lumaM);
    var blendL = max(0.0, (rangeL / range) - FXAA_SUBPIX_TRIM) * FXAA_SUBPIX_TRIM_SCALE;
    blendL = min(FXAA_SUBPIX_CAP, blendL);

    var rgbL = rgbN + rgbW + rgbM + rgbE + rgbS;


    rgbL += (rgbNW + rgbNE + rgbSW + rgbSE);
    rgbL *= FxaaToVec3(1.0 / 9.0);

   // Determine edge direction
    let edgeHorz = abs(-2.0 * lumaW + lumaNW + lumaSW - 2.0 * lumaM + lumaNE + lumaSE - 2.0 * lumaE);
    let edgeVert = abs(-2.0 * lumaN + lumaNW + lumaNE - 2.0 * lumaM + lumaSW + lumaSE - 2.0 * lumaS);

    let isHorizontal = (edgeHorz >= edgeVert);

    // Calculate blend weights
    var blend = vec2<f32>(0.0, 0.0);
    if isHorizontal {
        blend.x = mix(lumaS, lumaN, 0.5);
        blend.y = mix(lumaW, lumaE, 0.5);
    } else {
        blend.x = mix(lumaW, lumaE, 0.5);
        blend.y = mix(lumaS, lumaN, 0.5);
    }

    // Calculate final blend factor
    let blendFactor = max(abs(blend.x - lumaM), abs(blend.y - lumaM));

    // Blend the original color with the anti-aliased color
    let antiAliasedColor = mix(vec4<f32>(rgbM, 1.0), vec4<f32>(rgbL, 1.0), blendFactor);

    return antiAliasedColor;
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