export function fragmentShader(withTexture: boolean): string {
  // conditionally bind sampler and texture, only if texture is set
  const bindSamplerAndTexture = withTexture
    ? `@group(0) @binding(4) var mySampler: sampler;
       @group(0) @binding(5) var myTexture: texture_2d<f32>;`
    : ``
  // conditionally do texture sampling
  const returnStatement = withTexture
    ? `
      return vec4<f32>(textureSample(myTexture, mySampler, input.uv).rgb * lightingFactor, 1.0);
      `
    : `
      return vec4<f32>(input.fragColor  * lightingFactor, 1.0);
      `

  return (
    `
            struct LightData {        // light xyz position
                lightPos : vec3<f32>,
            };

            struct FragmentInput {              // output from vertex shader
                @location(0) fragColor : vec3<f32>,
                @location(1) uv : vec2<f32>,
                @location(2) fragNorm : vec3<f32>,
                @location(3) fragPos : vec3<f32>,
            };

            // bind light data buffer
            @group(0) @binding(3) var<uniform> lightData : LightData;

            // constants for light
            const ambientLightFactor : f32 = 0.25;     // ambient light
            ` +
    bindSamplerAndTexture +
    `
            @fragment
            fn fs_main(input : FragmentInput) -> @location(0) vec4<f32> {
                let lightDirection: vec3<f32> = normalize(lightData.lightPos - input.fragPos);

                // lambert factor
                let lambertFactor : f32 = dot(lightDirection, input.fragNorm);

                var lightFactor: f32 = 1.0;
                lightFactor = lambertFactor;

                let lightingFactor: f32 = max(min(lightFactor, 1.0), ambientLightFactor);
        ` +
    returnStatement +
    `
            }
        `
  )
}
