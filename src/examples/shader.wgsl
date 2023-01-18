struct TransformUniforms {
    mvpMatrix : mat4x4<f32>,
};
@group(0) @binding(0) var<uniform> transformuniforms : TransformUniforms;


struct MaterialUniforms {
    color : vec4<f32>,
};
@group(0) @binding(1) var<uniform> materialuniforms : MaterialUniforms;

@group(0) @binding(2) var<uniform> ambient : vec3<f32>;
@group(0) @binding(3) var<uniform> diffuse : vec3<f32>;
@group(0) @binding(4) var<uniform> specular : vec3<f32>;
@group(0) @binding(5) var<uniform> lightPos : vec4<f32>;
@group(0) @binding(6) var<uniform> lightColor : vec3<f32>;
@group(0) @binding(7) var<uniform> spotDirection : vec4<f32>;
@group(0) @binding(8) var<uniform> spotExponent : f32;
@group(0) @binding(9) var<uniform> spotCutoff : f32;
@group(0) @binding(10) var<uniform> shininess : f32;


struct Output {
    @builtin(position) Position : vec4<f32>,
    @location(0) normalOut : vec4<f32>,
    @location(1) colorOut : vec4<f32>,
};

@vertex
fn vs_main(@location(0) pos: vec4<f32>, @location(1) color: vec4<f32>, @location(2) normal: vec4<f32>) -> Output {
    var output: Output;
    output.Position =  transformuniforms.mvpMatrix * pos;
    output.normalOut = normal;
    output.colorOut = color;
    return output;
}

@fragment
fn fs_main(output : Output) -> @location(0) vec4<f32> {
    var egal = materialuniforms.color * 2;
    var egal2 = diffuse * 2;
    var egal3 = lightColor * 2;

    
    var lightVector = lightColor;
    var spot : f32 = 0.0f;
    let camCord = (transformuniforms.mvpMatrix * lightPos).xyz;
    // Diffuse
    if(lightPos.w > 0.001f)
    {
        lightVector = normalize(camCord - output.Position.xyz);
    }
    else{
        lightVector = normalize(camCord);
    }
    let cos_phi = max(dot(output.normalOut.xyz, lightVector), 0.0f);

    // Specular
    
    let eye = normalize(-output.Position.xyz);
    let reflection = normalize(reflect( -lightVector, output.normalOut.xyz));
    let cos_psi_n = pow(max(dot(reflection, eye), 0.0f), shininess);

    // Spotlight
    if(spotCutoff < 0.001f)
    {
        spot = 1.0f;
    }
    else{
        var tmp_lightVector = output.Position;
        tmp_lightVector.x = lightVector.x;
        tmp_lightVector.y = lightVector.y;
        tmp_lightVector.z = lightVector.z;
        tmp_lightVector.w = 0.0f;
        let cos_phi_spot = max(dot(tmp_lightVector, (transformuniforms.mvpMatrix * spotDirection)), 0.0f); // transform Matrix 
        if( cos_phi_spot >= cos(spotCutoff))
        {
            spot = pow(cos_phi_spot, spotExponent);
        }
        else{
            spot = 0.0f;
        }
    }

    var outputColor = output.colorOut.xyz * ambient;
    outputColor += spot * output.colorOut.xyz * cos_phi * lightColor;
    outputColor += spot * specular * cos_psi_n * lightColor;

    return vec4(lightVector, 1.0);
    

    /*
        // compute the light vector as the normalized vector between
    // the vertex position and the light position:
    var lightVector = normalize(lightPos - output.Position.xyz);

    // compute the eye vector as the normalized negative vertex position in
    // camera coordinates:
    var eye = normalize(-output.Position.xyz);
    
    var N = normalize(output.normalOut.xyz);

    // compute the normalized reflection vector using GLSL's built-in reflect()
    // function:
    var reflection = normalize(reflect(-lightVector, N));

    // variables used in the phong lighting model:
    var phi  = max(dot(N, lightVector), 0.0);
    var psi  = pow(max(dot(reflection, eye), 0.0), 15);
    
    //var tmp  = vec4(ambient + phi * materialuniforms.color.xyz + psi * specular, 1.0);
    var tmp  = vec4(ambient + phi * output.colorOut.xyz  + psi * specular, 1.0);
    // output.colorOut.xyz
    return tmp;   
    */
    
    
}