struct Material {
  ambient: f32,
  diffuse: f32,
  specular: f32,
  shininess: f32,
};
const NUM_LIGHTS = 3;


@group(0) @binding(3) var<uniform> eyePosition: vec3<f32>;
@group(0) @binding(4) var<uniform> m : Material;
@group(0) @binding(5) var diffsampler: sampler;
@group(0) @binding(6) var difftexture: texture_2d<f32>;
@group(0) @binding(7) var<uniform> ambientColor: vec3<f32>;
@group(0) @binding(8) var<uniform> diffuseColor: array<vec3<f32>, NUM_LIGHTS>;
@group(0) @binding(9) var<uniform> specularColor: array<vec3<f32>, NUM_LIGHTS>;
@group(0) @binding(10) var<uniform> lightPos: array<vec3<f32>, NUM_LIGHTS>;

@fragment
fn fs_main(
  @location(0) v_color: vec4<f32>,
  @location(1) v_uv: vec2<f32>,
  @location(2) v_normal: vec3<f32>,
  @location(3) v_pos: vec3<f32>,
) -> @location(0) vec4<f32> {

let lightCount = NUM_LIGHTS;
let texture = textureSample(difftexture, diffsampler, v_uv).rgba;
let N = normalize(v_normal);
var diffuse =  vec3(0.0);
var specular = vec3(0.0);
for (var i = 0; i < lightCount; i++) {
  let L = normalize(lightPos[i] - v_pos.xyz);
  let diffuseFactor = max(dot(L, N), 0.0);
  var specularFactor = 0.0;
  if (length(L) > 0.0){
    var R = reflect(-L, N);
    var V = normalize(eyePosition.xyz - v_pos);
    var specAngle = max(dot(R, V), 0.0);
    specularFactor = pow(specAngle, m.shininess);
  }
  diffuse += diffuseFactor * diffuseColor[i];
  specular += specularFactor * specularColor[i];
}
return vec4(
  (m.ambient * ambientColor + m.diffuse * diffuse + m.specular * specular) * texture.rgb, texture.a);
}
