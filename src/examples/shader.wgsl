struct TransformUniforms {
    mvpMatrix : mat4x4<f32>
};
@binding(0) @group(0) var<uniform> transformuniforms : TransformUniforms;

struct MaterialUniforms {
    color : vec4<f32>,
};
@binding(1) @group(1) var<uniform> materialuniforms : MaterialUniforms;



struct Output {
    @builtin(position) Position : vec4<f32>,
};

@vertex
fn vs_main( @location(0) pos: vec4<f32> ) -> Output {
    var output: Output;
    output.Position = transformuniforms.mvpMatrix * pos;
    return output;
}

@fragment
fn fs_main() -> @location(0) vec4<f32> {
    return vec4(1.0,0,0,1);//materialuniforms.color;
    
}