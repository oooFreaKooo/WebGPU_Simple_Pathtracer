@group(1) @binding(0) var _sampler: sampler;
@group(1) @binding(1) var _texture: texture_2d<f32>;
@group(2) @binding(0) var<uniform> ambientIntensity : f32;
@group(2) @binding(1) var<uniform> pointLight : array<vec4<f32>, 2>;
@group(2) @binding(2) var<uniform> directionLight : array<vec4<f32>, 2>;
@group(3) @binding(0) var shadowMap: texture_depth_2d;
@group(3) @binding(1) var shadowSampler: sampler_comparison;


@fragment
fn fs_main(
    @location(0) fragPosition : vec3<f32>,
    @location(1) fragNormal: vec3<f32>,
    @location(2) fragUV: vec2<f32>,
    @location(3) shadowPos: vec3<f32>,
    @location(4) fragColor: vec4<f32>
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
    let diffuse: f32 = max(dot(normalize(directionPosition), fragNormal), 0.0);
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
    // Texture
    var textureColor:vec3<f32> = (textureSample(_texture, _sampler, fragUV)).rgb;
        var shadow : f32 = 0.0;
    let size = f32(textureDimensions(shadowMap).x);
    for (var y : i32 = -1 ; y <= 1 ; y = y + 1) {
        for (var x : i32 = -1 ; x <= 1 ; x = x + 1) {
            let offset = vec2<f32>(f32(x) / size, f32(y) / size);
            shadow = shadow + textureSampleCompare(
                shadowMap, 
                shadowSampler,
                shadowPos.xy + offset, 
                shadowPos.z - 0.005  // apply a small bias to avoid acne
            );
        }
    }
    shadow = shadow / 9.0;
    lightResult += min(0.3 + shadow * diffuse, 1.0);

    return vec4<f32>(textureColor.rgb * objectColor * lightResult, 1.0);
}
// texColor.rgb * objectColor * lightResult, 

