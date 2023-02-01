struct TransformUniforms {
    mvpMatrix : mat4x4<f32>,
};
@group(0) @binding(0) var<uniform> transformuniforms : TransformUniforms;


struct VertexOutput {
    @builtin(position) Position : vec4<f32>,
    @location(0) vPosition : vec3<f32>,
    @location(1) vUV: vec2<f32>,
    @location(2) vNormal : vec3<f32>,
};

@vertex
fn vs_main(
    @location(0) position : vec3<f32>,
    @location(1) uv : vec2<f32>,
    @location(2) normal : vec3<f32>,
) -> VertexOutput {
    let pos = vec4<f32>(position, 1.0);
    var output : VertexOutput;
    output.Position = transformuniforms.mvpMatrix * pos;
    output.vPosition = pos.xyz;
    output.vNormal = normal;
    output.vUV = uv;
    return output;
}
