struct Material {
  shininess: f32,
};

// bind light data buffer
@group(0) @binding(3) var<uniform> lightPos: array<vec3<f32>, 3>;  // light lightPos
@group(0) @binding(4) var<uniform> eyePosition: vec3<f32>;  // camera position
@group(0) @binding(5) var<uniform> material : Material;
@group(0) @binding(6) var diffsampler: sampler;
@group(0) @binding(7) var difftexture: texture_2d<f32>;

@fragment
fn fs_main(
  @location(0) v_color: vec4<f32>,
  @location(1) v_uv: vec2<f32>,
  @location(2) v_normal: vec3<f32>,
  @location(3) v_pos: vec3<f32>
) -> @location(0) vec4<f32> {
  let lightCount: i32 = 3;
  let texture:vec4<f32> = textureSample(difftexture, diffsampler, v_uv).rgba;
  let normal: vec3<f32> = normalize(v_normal);
  let eyeVec: vec3<f32> = normalize(eyePosition.xyz - v_pos);
  var diffuse: f32 = 0.0;
  var specular: f32 = 0.0;
for (var i : i32 = 0; i < lightCount; i = i + 1) {
  let incidentVec: vec3<f32> = normalize(v_pos - lightPos[i]);
  let lightVec: vec3<f32> = normalize(lightPos[i] - v_pos);
  diffuse = diffuse + max(dot(lightVec, normal), 0.0);
  specular = specular + pow(max(dot(eyeVec, reflect(incidentVec, normal)), 0.0), material.shininess);
}
  let ambient: f32 = 0.1;
  return vec4(texture.rgb * (diffuse + specular + ambient), texture.a);
}
