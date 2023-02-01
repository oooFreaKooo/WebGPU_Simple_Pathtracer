@group(2) @binding(0) var _sampler: sampler;
@group(2) @binding(1) var _texture: texture_2d<f32>;

@group(1) @binding(0) var<uniform> directionLight : vec3<f32>;
@group(1) @binding(1) var<uniform> eyePosition : vec3<f32>;
@group(1) @binding(2) var<uniform> ambientIntensity : f32;
@group(1) @binding(3) var<uniform> diffuseIntensity : f32;
@group(1) @binding(4) var<uniform> specularIntensity : f32;


@fragment
fn fs_main(
    @location(0) fragPosition : vec3<f32>,
    @location(1) fragUV: vec2<f32>,
    @location(2) fragNormal: vec3<f32>,
) -> @location(0) vec4<f32> {

    let N:vec3<f32> = normalize(fragNormal.xyz);                
    let L:vec3<f32> = normalize(directionLight.xyz - fragPosition.xyz);     
    let V:vec3<f32> = normalize(eyePosition.xyz - fragPosition.xyz);          
    let H:vec3<f32> = normalize(L + V);

    // Options
    let shininess:f32 = 25.0;
    let specularColor = vec3(1.0, 1.0, 1.0);
    // Diffuse light
    var diffuse:f32 = diffuseIntensity * max(dot(N, L), 0.0);
    // Specular light
    var specular:f32 = specularIntensity * pow(max(dot(N, H),0.0), shininess);
    // Ambient light
    let ambient:f32 = ambientIntensity;
    // Texture 
    var textureColor:vec3<f32> = (textureSample(_texture, _sampler, fragUV)).rgb;
    // Final Color
    var finalColor:vec3<f32> = textureColor * (ambient + diffuse) + specularColor * specular; 
    return vec4<f32>(finalColor, 1.0);
}

