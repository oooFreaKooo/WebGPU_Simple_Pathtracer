struct Material {
  diffuse: f32,
  specular: f32,
  ambient: f32,
  shininess: f32,
};

@group(0) @binding(3) var<uniform> lightPos: array<vec3<f32>, 3>;
@group(0) @binding(4) var<uniform> eyePosition: vec3<f32>;
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
  let lightCount = 3;
  let texture = textureSample(difftexture, diffsampler, v_uv).rgba;
  let normal = normalize(v_normal);
  let eyeVec = normalize(eyePosition.xyz - v_pos);
  var diffuse = material.diffuse;
  var specular = material.specular;
  for (var i = 0; i < lightCount; i++) {
    let lightVec = normalize(lightPos[i] - v_pos);
    let diffuseFactor = max(dot(lightVec, normal), 0.0);
    let specularFactor = pow(max(dot(eyeVec, reflect(normalize(v_pos - lightPos[i]), normal)), 0.0), material.shininess);
    diffuse += diffuseFactor;
    specular += specularFactor;
  }
  return vec4((diffuse + specular) * texture.rgb * material.ambient , texture.a);
}
