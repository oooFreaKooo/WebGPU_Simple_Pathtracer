export type Vec3Input = number[] | Float32Array

export function toVec3Array (values: ArrayLike<number>): Vec3Input {
    return [ values[0], values[1], values[2] ]
}
