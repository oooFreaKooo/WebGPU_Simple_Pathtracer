struct TransformUniforms {
    mvpMatrix : mat4x4<f32>,
};
@binding(0) @group(0) var<uniform> transformuniforms : TransformUniforms;

struct MaterialUniforms {
    color : vec4<f32>,
};
@binding(1) @group(1) var<uniform> materialuniforms : MaterialUniforms;

@binding(2) @group(0) var<uniform> ambient : vec3<f32>;
@binding(2) @group(1) var<uniform> diffuse : vec3<f32>;
@binding(2) @group(2) var<uniform> lightColor : vec3<f32>;
@binding(2) @group(3) var<uniform> lightPos : vec3<f32>;
//@binding(2) @group(4) var<uniform> specular : vec3<f32>;

struct Output {
    @builtin(position) Position : vec4<f32>,
};

@vertex
fn vs_main( @location(0) pos: vec4<f32> ) -> Output {
    var output: Output;
    output.Position =  transformuniforms.mvpMatrix * pos;
    return output;
    
}

@fragment
fn fs_main( @location(2) normal : vec3<f32>, output : Output) -> @location(0) vec4<f32> {

        // compute the light vector as the normalized vector between
    // the vertex position and the light position:
    var lightVector = normalize(lightPos - output.Position.xyz);

    // compute the eye vector as the normalized negative vertex position in
    // camera coordinates:
    var eye = normalize(-output.Position.xyz);

    var N = normalize(normal);

    // compute the normalized reflection vector using GLSL's built-in reflect()
    // function:
    var reflection = normalize(reflect(-lightVector, N));

    // variables used in the phong lighting model:
    var phi  = max(dot(N, lightVector), 0.0);
    var psi  = pow(max(dot(reflection, eye), 0.0), 15);
    
    //var tmp  = vec4(ambient + phi * materialuniforms.color.xyz + psi * specular, 1.0);
    var tmp  = vec4(ambient + phi * materialuniforms.color.xyz + psi, 1.0);

    return tmp;
        
}