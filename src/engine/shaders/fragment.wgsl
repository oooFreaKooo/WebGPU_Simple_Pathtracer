struct Material {
  ambient: f32,
  diffuse: f32,
  specular: f32,
  shininess: f32,
};

struct Camera {
  eyePosition: vec3<f32>,
}
const MAX_LIGHTS = 100;
const attenuationValue = 0.001;
const lightRadius = 40.0;

@group(0) @binding(3) var<uniform> camera : Camera;
@group(0) @binding(4) var<uniform> m : Material;
@group(0) @binding(5) var diffsampler: sampler;
@group(0) @binding(6) var difftexture: texture_2d<f32>;
@group(0) @binding(7) var<uniform> ambientColor: vec3<f32>;
@group(0) @binding(8) var<uniform> diffuseColor: array<vec3<f32>, MAX_LIGHTS>;
@group(0) @binding(10) var<uniform> lightPos: array<vec3<f32>, MAX_LIGHTS>;

@fragment
fn fs_main(
  @location(0) v_color: vec4<f32>,
  @location(1) v_uv: vec2<f32>,
  @location(2) v_normal: vec3<f32>,
  @location(3) v_pos: vec3<f32>,
) -> @location(0) vec4<f32> {

let texture = textureSample(difftexture, diffsampler, v_uv).rgba;
let N = normalize(v_normal);
var diffuse = vec3(0.0);
var specular = vec3(0.0);
var specularColor = vec3(0.0);
for (var i = 0; i < MAX_LIGHTS; i++) {
  let L = normalize(lightPos[i] - v_pos.xyz);
  let distance = length(lightPos[i] - v_pos.xyz);
  let attenuation = 1.0 / (1.0 + attenuationValue * distance * distance);
  var diffuseFactor = max(dot(L, N), 0.0) * attenuation;
  var specularFactor = 0.0;
  if (length(L) > 0.0){
    var R = reflect(-L, N);
    var V = normalize(camera.eyePosition.xyz - v_pos);
    var specAngle = max(dot(R, V), 0.0);
    var F0 = 0.5;
    var F = F0 + (1.0 - F0) * pow(1.0 - dot(-V, N), 5.0);
    var falloff = 1.0 - smoothstep(0.0, lightRadius, distance);
    specularFactor = pow(max(dot(R, V), 0.0), m.shininess) * F * falloff * attenuation;
  }
  specularColor = diffuseColor[i];
  diffuse += diffuseFactor * diffuseColor[i];
  specular += specularFactor * specularColor;
}

return vec4(
  (m.ambient * ambientColor + m.diffuse * diffuse + m.specular * specular) * texture.rgb, texture.a);
}
