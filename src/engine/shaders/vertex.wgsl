struct TransformData {
    view: mat4x4<f32>,
    projection: mat4x4<f32>,
};

struct ObjectData {
    model: array<mat4x4<f32>>,
};

@binding(0) @group(0) var<uniform> transformUBO: TransformData;
@binding(1) @group(0) var<storage, read> objects: ObjectData;

struct VertexOutput {
    @builtin(position) Position : vec4<f32>,
    @location(0) TexCoord : vec2<f32>,
    @location(1) Normals : vec3<f32>,
};

@vertex
fn vs_main(
    @builtin(instance_index) ID: u32,
    @location(0) vertexPostion: vec3<f32>, 
    @location(1) vertexTexCoord: vec2<f32>,
    @location(2) vertexNormals: vec3<f32>) -> VertexOutput {

    var output : VertexOutput;
    output.Position = transformUBO.projection * transformUBO.view * objects.model[ID] * vec4<f32>(vertexPostion, 1.0);
    output.TexCoord = vertexTexCoord;
    output.Normals = vertexNormals;

    return output;
}

@binding(0) @group(1) var myTexture: texture_2d<f32>;
@binding(1) @group(1) var mySampler: sampler;

@group(2) @binding(0) var<uniform> directionLight : vec3<f32>;
@group(2) @binding(1) var<uniform> eyePosition : vec3<f32>;
@group(2) @binding(2) var<uniform> ambientIntensity : f32;
@group(2) @binding(3) var<uniform> diffuseIntensity : f32;
@group(2) @binding(4) var<uniform> specularIntensity : f32;

@fragment
fn fs_main(
    @location(0) TexCoord : vec2<f32>,
    @location(1) Normals: vec3<f32>) -> @location(0) vec4<f32> {

    let N:vec3<f32> = normalize(Normals.xyz);                
    let L:vec3<f32> = normalize(directionLight.xyz);     
    let V:vec3<f32> = normalize(eyePosition.xyz);          
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
    var textureColor:vec3<f32> = (textureSample(myTexture, mySampler, TexCoord)).rgb;
    // Final Color
    var finalColor:vec3<f32> = textureColor * (ambient + diffuse) + specularColor * specular; 

    return vec4<f32>(finalColor, 0.5);
}