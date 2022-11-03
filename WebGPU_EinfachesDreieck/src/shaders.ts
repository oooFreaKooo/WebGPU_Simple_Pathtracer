export const Shaders = (color:string) => {
    const vertex = `
        @vertex
        fn main(@builtin(vertex_index) VertexIndex: u32) -> @builtin(position) vec4<f32> {
            var pos = array<vec2<f32>, 3>(
                vec2<f32>(0.0, 0.5),
                vec2<f32>(-0.5, -0.5),
                vec2<f32>(0.5, -0.5));
            return vec4<f32>(pos[VertexIndex], 0.0, 1.0);
        }
    `;

    const fragment = `
        @fragment
        fn main() -> @location(0) vec4<f32> {
            return vec4<f32>${color};
        }
    `;
    return {vertex, fragment};
}

export const Shaders1 = (color:string) => {
    const vertex = `
        var pos = array<vec2<f32>, 3>(
            vec2<f32>(0.0, 0.5),
            vec2<f32>(-0.5, -0.5),
            vec2<f32>(0.5, -0.5));
        [[stage(vertex)]]
        fn main([[builtin(vertex_index)]] VertexIndex: u32) -> [[builtin(position)]] vec4<f32> {
            return vec4<f32>(pos[VertexIndex], 0.0, 1.0);
        }
    `;

    const fragment = `
        [[stage(fragment)]]
        fn main() -> [[location(0)]] vec4<f32> {
            return vec4<f32>${color};
        }
    `;
    return {vertex, fragment};
}

export const ShadersOld = (color:string) => {
    const vertex = `
        const pos : array<vec2<f32>, 3> = array<vec2<f32>, 3>(
            vec2<f32>(0.0, 0.5),
            vec2<f32>(-0.5, -0.5),
            vec2<f32>(0.5, -0.5));
        [[builtin(position)]] var<out> Position : vec4<f32>;
        [[builtin(vertex_idx)]] var<in> VertexIndex : i32;
        [[stage(vertex)]]
        fn main() -> void {
            Position = vec4<f32>(pos[VertexIndex], 0.0, 1.0);
            return;
        }
    `;

    const fragment = `
        [[location(0)]] var<out> outColor : vec4<f32>;
        [[stage(fragment)]]
        fn main() -> void {
            outColor = vec4<f32>${color};
            return;
        }
    `;
    return {vertex, fragment};
}