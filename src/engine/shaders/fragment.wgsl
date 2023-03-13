struct LightData {
  position: vec3<f32>,  // light position
  //color: vec3<f32>,     // light color
  eyePosition: vec3<f32>, // camera position
};

struct Material {
  shininess: f32,
};

// bind light data buffer
@group(0) @binding(3) var<uniform> light : LightData;
@group(0) @binding(4) var<uniform> material : Material;
@group(0) @binding(5) var diffsampler: sampler;
@group(0) @binding(6) var difftexture: texture_2d<f32>;


@fragment
fn fs_main(
  @location(0) v_color: vec4<f32>,
  @location(1) v_uv: vec2<f32>,
  @location(2) v_normal: vec3<f32>,
  @location(3) v_pos: vec3<f32>
) -> @location(0) vec4<f32> {

  let texture:vec4<f32> = textureSample(difftexture, diffsampler, v_uv).rgba;
  let normal: vec3<f32> = normalize(v_normal);
  let eyeVec: vec3<f32> = normalize(light.eyePosition.xyz - v_pos);
  let incidentVec: vec3<f32> = normalize(v_pos - light.position.xyz);
  let lightVec: vec3<f32> = -incidentVec;
  let diffuse: f32 = max(dot(lightVec, normal), 0.0);
  let specular: f32 = pow(max(dot(eyeVec, reflect(incidentVec, normal)), 0.0), material.shininess);
  let ambient: f32 = 0.1;
  return vec4(texture.rgb * (diffuse + specular + ambient), texture.a);
}