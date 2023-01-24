struct TransformUniforms {
    mvpMatrix : mat4x4<f32>
};

@group(0) @binding(0) var<storage> modelViews : array<mat4x4<f32>>;
@group(0) @binding(1) var<uniform> transformuniforms : TransformUniforms;
@group(0) @binding(2) var<storage> colors : array<vec4<f32>>;
@group(1) @binding(0) var _texture : texture_2d<f32>;
@group(1) @binding(1) var _sampler : sampler;

struct VertexOutput {
    @builtin(position) Position : vec4<f32>,
    @location(0) fragPosition : vec3<f32>,
    @location(1) fragNormal : vec3<f32>,
    @location(2) fragUV: vec2<f32>,
    @location(3) fragColor: vec4<f32>,
};

@vertex
fn vs_main(
    @builtin(instance_index) index : u32,
    @location(0) position : vec3<f32>,
    @location(1) normal : vec3<f32>,
    @location(2) uv : vec2<f32>,
) -> VertexOutput {
    let modelview = modelViews[index];
    let pos = vec4<f32>(position, 1.0);
    var output : VertexOutput;
    output.Position = transformuniforms.mvpMatrix * pos;
    output.fragPosition = (modelview * pos).xyz;
    output.fragNormal =  (modelview * vec4<f32>(normal, 0.0)).xyz;
    output.fragUV = uv;
    output.fragColor = colors[index];
    return output;
}

@group(2) @binding(0) var<uniform> ambientIntensity : f32;
@group(2) @binding(1) var<uniform> pointLight : array<vec4<f32>, 2>;
@group(2) @binding(2) var<uniform> directionLight : array<vec4<f32>, 2>;
@group(1) @binding(2) var<uniform> hasTexture : f32;

@fragment
fn fs_main(
    @location(0) fragPosition : vec3<f32>,
    @location(1) fragNormal: vec3<f32>,
    @location(2) fragUV: vec2<f32>,
    @location(3) fragColor: vec4<f32>
) -> @location(0) vec4<f32> {
    let objectColor = fragColor.rgb;
    let ambintLightColor = vec3(1.0,1.0,1.0);
    let pointLightColor = vec3(1.0,1.0,1.0);
    let dirLightColor = vec3(1.0,1.0,1.0);
    var lightResult = vec3(0.0, 0.0, 0.0);
    // ambient
    lightResult += ambintLightColor * ambientIntensity;
    // Directional Light
    var directionPosition = directionLight[0].xyz;
    var directionIntensity: f32 = directionLight[1][0];
    var diffuse: f32 = max(dot(normalize(directionPosition), fragNormal), 0.0);
    lightResult += dirLightColor * directionIntensity * diffuse;
    // Point Light
    var pointPosition = pointLight[0].xyz;
    var pointIntensity: f32 = pointLight[1][0];
    var pointRadius: f32 = pointLight[1][1];
    var L = pointPosition - fragPosition;
    var distance = length(L);
    if(distance < pointRadius){
        var diffuse: f32 = max(dot(normalize(L), fragNormal), 0.0);
        var distanceFactor: f32 = pow(1.0 - distance / pointRadius, 2.0);
        lightResult += pointLightColor * pointIntensity * diffuse * distanceFactor;
    }
    // Specular Reflection
    var cameraPosition = vec3(0.0, 0.0, 1.0); // position of the camera
    var viewDirection = normalize(cameraPosition - fragPosition);
    var reflectDirection = reflect(-viewDirection, fragNormal);
    var specular = pow(max(dot(reflectDirection, normalize(directionPosition)), 0.0), 16.0);
    lightResult += vec3(1.0, 1.0, 1.0) * specular * directionIntensity;

    // Sample the texture using the fragUV coordinates and the _texture and _sampler variables
    if (hasTexture > 0.5) {
        var texColor = textureSample(_texture, _sampler, fragUV) * vec4(fragPosition, 1.0);  // remove " * vec4(fragPosition, 1.0)" to remove rainbow colors
        return vec4<f32>(texColor.rgb * objectColor * lightResult, texColor.a);
    } else {
        return vec4<f32>(objectColor * lightResult, 1.0);
    }
    
}


