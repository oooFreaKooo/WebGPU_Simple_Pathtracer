struct TransformUniforms {
    mvpMatrix : mat4x4<f32>
};
@group(0) @binding(0) var<uniform> transformuniforms : TransformUniforms;

struct MaterialUniforms {
    color : vec4<f32>,
};
struct LightUniforms {
    lightColor : vec4<f32>,
    ambient : vec3<f32>,
    diffuse : vec3<f32>,
    specular : vec3<f32>,
};
@group(0) @binding(1) var<uniform> materialuniforms : MaterialUniforms;
@group(1) @binding(0) var<uniform> lightuniforms : LightUniforms;
@group(2) @binding(0) var<uniform> lightPos : vec3<f32>;

struct Output {
    @builtin(position) Position : vec4<f32>,
    @location(0) normalOut : vec4<f32>,
};

@vertex
fn vs_main(@location(0) pos: vec4<f32>, @location(2) normal: vec4<f32>) -> Output {
    var output: Output;
    output.Position =  transformuniforms.mvpMatrix * pos;
    output.normalOut = normal;
    return output;
}

@fragment
fn fs_main(output : Output) -> @location(0) vec4<f32> {
    var lightVector = normalize(lightPos - output.Position.xyz.xyz) * lightuniforms.diffuse.xyz * lightuniforms.lightColor.xyz;
    var eye = normalize(output.Position.xyz);
    var N = normalize(output.normalOut);
    var reflection = normalize(reflect(vec4(lightVector,1.0), N));
    var phi  = max(dot(N, vec4(lightVector,1.0)), 0.0);
    var psi  = pow(max(dot(reflection, vec4(eye,1.0)), 0.0), 5);
    var tmp  = vec4(lightuniforms.ambient + phi * materialuniforms.color.xyz + psi * lightuniforms.specular, 1.0);
    return tmp;    
}


