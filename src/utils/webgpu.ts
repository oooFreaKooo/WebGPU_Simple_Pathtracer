import { BLASNode } from '../bvh/blas'
import { BLASInstance } from '../bvh/blas-instance'
import { TLASNode } from '../bvh/tlas'
import { Material } from '../components/material'
import { Triangle } from '../components/triangle'

export function computePass (
    device: GPUDevice,
    computePipeline: GPUComputePipeline,
    bindGroups: {
    uniformBindGroup: GPUBindGroup
    frameBufferBindGroup: GPUBindGroup
    objectBindGroup: GPUBindGroup
    textureBindGroup: GPUBindGroup
  },
    workGroupsX: number,
    workGroupsY: number,
) {
    const encoder = device.createCommandEncoder({ label: 'computeEncoder' })
    const pass = encoder.beginComputePass({ label: 'computePass' })
    pass.setPipeline(computePipeline)
    pass.setBindGroup(0, bindGroups.uniformBindGroup)
    pass.setBindGroup(1, bindGroups.frameBufferBindGroup)
    pass.setBindGroup(2, bindGroups.objectBindGroup)
    pass.setBindGroup(3, bindGroups.textureBindGroup)
    pass.dispatchWorkgroups(workGroupsX, workGroupsY, 1)
    pass.end()
    const commandBuffer = encoder.finish()
    device.queue.submit([ commandBuffer ])
}

export function renderPass (
    device: GPUDevice,
    context: GPUCanvasContext,
    renderPassDescriptor: GPURenderPassDescriptor,
    renderPipeline: GPURenderPipeline,
    bindGroup: GPUBindGroup,
    vertexBuffer: GPUBuffer,
) {
    // Explicitly assert the type of colorAttachments
    const colorAttachments = renderPassDescriptor.colorAttachments as (GPURenderPassColorAttachment | null)[]

    // Check if the first colorAttachment is not null
    if (colorAttachments[0] !== null) {
        colorAttachments[0].view = context.getCurrentTexture().createView()
    } else {
        console.error('The first colorAttachment is null')
    }

    const renderEncoder = device.createCommandEncoder({ label: 'render encoder' })
    const renderPass = renderEncoder.beginRenderPass(renderPassDescriptor)
    renderPass.setPipeline(renderPipeline)
    renderPass.setBindGroup(0, bindGroup)
    renderPass.setVertexBuffer(0, vertexBuffer)
    renderPass.draw(6) // call our vertex shader 6 times (2 triangles)
    renderPass.end()

    const renderCommandBuffer = renderEncoder.finish()
    device.queue.submit([ renderCommandBuffer ])
}

export function createRenderPassDescriptor () {
    const renderPassDescriptor = {
        label: 'renderPass',
        colorAttachments: [
            {
                clearValue: [ 0.0, 0.0, 0.0, 1.0 ],
                loadOp: 'clear',
                storeOp: 'store',
            },
        ],
    }

    return renderPassDescriptor as GPURenderPassDescriptor
}

export function createVertexBuffer (device: GPUDevice, bufferArray: Float32Array): GPUBuffer {
    const vertexBuffer = device.createBuffer({
        label: 'vertexBuffer',
        size: bufferArray.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    })
    device.queue.writeBuffer(vertexBuffer, 0, bufferArray)

    return vertexBuffer
}

// Function to create a compute pipeline
export function createComputePipeline (
    device: GPUDevice,
    shaderCode: string,
    entryPoint: string = 'main',
): GPUComputePipeline {
    return device.createComputePipeline({
        layout: 'auto',
        compute: {
            module: device.createShaderModule({ code: shaderCode }),
            entryPoint: entryPoint,
        },
    })
}
  
// Function to create multiple bind groups for a pipeline
export function createBindGroups (
    device: GPUDevice,
    pipeline: GPUComputePipeline | GPURenderPipeline,
    bindGroupEntries: Array<Array<GPUBindGroupEntry>>,
): GPUBindGroup[] {
    return bindGroupEntries.map((entries, index) => {
        const layout = pipeline.getBindGroupLayout(index)
        return device.createBindGroup({
            layout: layout,
            entries: entries,
        })
    })
}
  
// Function to create a render pipeline
export function createRenderPipeline (
    device: GPUDevice,
    vertexShaderCode: string,
    fragmentShaderCode: string,
    vertexEntryPoint: string,
    fragmentEntryPoint: string,
    vertexBuffers: GPUVertexBufferLayout[],
    format: GPUTextureFormat,
): GPURenderPipeline {
    const vertexModule = device.createShaderModule({ code: vertexShaderCode })
    const fragmentModule = device.createShaderModule({ code: fragmentShaderCode })
    return device.createRenderPipeline({
        layout: 'auto',
        vertex: {
            module: vertexModule,
            entryPoint: vertexEntryPoint,
            buffers: vertexBuffers,
        },
        fragment: {
            module: fragmentModule,
            entryPoint: fragmentEntryPoint,
            targets: [
                {
                    format: format,
                },
            ],
        },
    })
}

// Function to create a buffer with initial data
export function createBufferWithData (
    device: GPUDevice,
    label: string,
    usage: GPUBufferUsageFlags,
    data: Float32Array | Uint32Array,
): GPUBuffer {
    const buffer = device.createBuffer({
        label: label,
        size: data.byteLength,
        usage: usage,
    })
    device.queue.writeBuffer(buffer, 0, data)
    return buffer
}
  
// Function to create a buffer without initial data
export function createBuffer (
    device: GPUDevice,
    label: string,
    usage: GPUBufferUsageFlags,
    size: number,
): GPUBuffer {
    return device.createBuffer({
        label: label,
        size: size,
        usage: usage,
    })
}
  
// Function to update buffer data
export function updateBuffer (
    device: GPUDevice,
    buffer: GPUBuffer,
    data: Float32Array | Uint32Array,
    offset: number = 0,
): void {
    device.queue.writeBuffer(buffer, offset, data)
}

// Function to create and initialize a material buffer
export function createAndUpdateMaterialBuffer (
    device: GPUDevice,
    materials: Material[],
): GPUBuffer {

    const materialDataSize = 24 // 24 floats per material
    const materialData = new Float32Array(materialDataSize * materials.length)
  
    for (let i = 0; i < materials.length; i++) {
        const material = materials[i]
        const baseIndex = materialDataSize * i
  
        // Pack material properties into the array
        materialData[baseIndex + 0] = material.albedo[0]
        materialData[baseIndex + 1] = material.albedo[1]
        materialData[baseIndex + 2] = material.albedo[2]
        materialData[baseIndex + 3] = material.specularChance
  
        materialData[baseIndex + 4] = material.specularColor[0]
        materialData[baseIndex + 5] = material.specularColor[1]
        materialData[baseIndex + 6] = material.specularColor[2]
        materialData[baseIndex + 7] = material.roughness
  
        materialData[baseIndex + 8] = material.emissionColor[0]
        materialData[baseIndex + 9] = material.emissionColor[1]
        materialData[baseIndex + 10] = material.emissionColor[2]
        materialData[baseIndex + 11] = material.emissionStrength
  
        materialData[baseIndex + 12] = material.refractionColor[0]
        materialData[baseIndex + 13] = material.refractionColor[1]
        materialData[baseIndex + 14] = material.refractionColor[2]
        materialData[baseIndex + 15] = material.refractionChance
  
        materialData[baseIndex + 16] = material.sssColor[0]
        materialData[baseIndex + 17] = material.sssColor[1]
        materialData[baseIndex + 18] = material.sssColor[2]
        materialData[baseIndex + 19] = material.sssStrength
  
        materialData[baseIndex + 20] = material.sssRadius
        materialData[baseIndex + 21] = material.ior
        materialData[baseIndex + 22] = 0.0
        materialData[baseIndex + 23] = 0.0
    }
  
    return createBufferWithData(
        device,
        'Material Buffer',
        GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        materialData,
    )
}
  
// Function to create and update triangle buffer
export function createAndUpdateTriangleBuffer (
    device: GPUDevice,
    triangles: Triangle[],
): GPUBuffer {
    const triangleDataSize = 24 // Each triangle takes 24 floats
  
    const triangleData = new Float32Array(triangleDataSize * triangles.length)
  
    for (let i = 0; i < triangles.length; i++) {
        const tri = triangles[i]
        const baseIndex = triangleDataSize * i
  
        // Store edge1
        triangleData[baseIndex + 0] = tri.edge1[0]
        triangleData[baseIndex + 1] = tri.edge1[1]
        triangleData[baseIndex + 2] = tri.edge1[2]
        triangleData[baseIndex + 3] = 0.0 // padding
  
        // Store edge2
        triangleData[baseIndex + 4] = tri.edge2[0]
        triangleData[baseIndex + 5] = tri.edge2[1]
        triangleData[baseIndex + 6] = tri.edge2[2]
        triangleData[baseIndex + 7] = 0.0 // padding
  
        // Store corners[0]
        triangleData[baseIndex + 8] = tri.corners[0][0]
        triangleData[baseIndex + 9] = tri.corners[0][1]
        triangleData[baseIndex + 10] = tri.corners[0][2]
        triangleData[baseIndex + 11] = 0.0 // padding
  
        // Store normals[0]
        triangleData[baseIndex + 12] = tri.normals[0][0]
        triangleData[baseIndex + 13] = tri.normals[0][1]
        triangleData[baseIndex + 14] = tri.normals[0][2]
        triangleData[baseIndex + 15] = 0.0 // padding
  
        // Store normals[1]
        triangleData[baseIndex + 16] = tri.normals[1][0]
        triangleData[baseIndex + 17] = tri.normals[1][1]
        triangleData[baseIndex + 18] = tri.normals[1][2]
        triangleData[baseIndex + 19] = 0.0 // padding
  
        // Store normals[2]
        triangleData[baseIndex + 20] = tri.normals[2][0]
        triangleData[baseIndex + 21] = tri.normals[2][1]
        triangleData[baseIndex + 22] = tri.normals[2][2]
        triangleData[baseIndex + 23] = 0.0 // padding
    }
  
    return createBufferWithData(
        device,
        'Triangle Buffer',
        GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        triangleData,
    )
}

export function createAndUpdateBlasNodeBuffer (
    device: GPUDevice,
    blasNodes: BLASNode[],
): GPUBuffer {

    const floatData = new Float32Array(blasNodes.length * 8)
    const uintData = new Uint32Array(floatData.buffer)
  
    for (let i = 0; i < blasNodes.length; i++) {
        const node = blasNodes[i]
        const baseIndex = i * 8
  
        floatData[baseIndex + 0] = node.aabb.bmin[0]
        floatData[baseIndex + 1] = node.aabb.bmin[1]
        floatData[baseIndex + 2] = node.aabb.bmin[2]
        uintData[baseIndex + 3] = node.leftFirst
  
        floatData[baseIndex + 4] = node.aabb.bmax[0]
        floatData[baseIndex + 5] = node.aabb.bmax[1]
        floatData[baseIndex + 6] = node.aabb.bmax[2]
        uintData[baseIndex + 7] = node.triangleCount
    }
  
    return createBufferWithData(
        device,
        'BLAS Node Buffer',
        GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        floatData,
    )
}

export function createAndUpdateTlasNodeBuffer (
    device: GPUDevice,
    tlasNodes: TLASNode[],
): GPUBuffer {

    const floatData = new Float32Array(tlasNodes.length * 12)
    const uintData = new Uint32Array(floatData.buffer)
  
    for (let i = 0; i < tlasNodes.length; i++) {
        const node = tlasNodes[i]
        const baseIndex = i * 12
  
        floatData[baseIndex + 0] = node.aabb.bmin[0]
        floatData[baseIndex + 1] = node.aabb.bmin[1]
        floatData[baseIndex + 2] = node.aabb.bmin[2]
        uintData[baseIndex + 3] = node.left >= 0 ? node.left : 0
  
        floatData[baseIndex + 4] = node.aabb.bmax[0]
        floatData[baseIndex + 5] = node.aabb.bmax[1]
        floatData[baseIndex + 6] = node.aabb.bmax[2]
        uintData[baseIndex + 7] = node.right >= 0 ? node.right : 0
  
        uintData[baseIndex + 8] = node.blas >= 0 ? node.blas : 0
        uintData[baseIndex + 9] = 0
        uintData[baseIndex + 10] = 0
        uintData[baseIndex + 11] = 0
    }
  
    return createBufferWithData(
        device,
        'TLAS Node Buffer',
        GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        floatData,
    )
}

export function createAndUpdateBlasInstanceBuffer (
    device: GPUDevice,
    blasInstances: BLASInstance[],
): GPUBuffer {

    const floatData = new Float32Array(36 * blasInstances.length) // 36 floats per instance
    const uintData = new Uint32Array(floatData.buffer)
  
    for (let i = 0; i < blasInstances.length; i++) {
        const instance = blasInstances[i]
        const baseIndex = 36 * i
  
        // Copy transform matrix (16 floats)
        floatData.set(instance.transform, baseIndex)
  
        // Copy inverse transform matrix (16 floats)
        floatData.set(instance.transformInv, baseIndex + 16)
  
        // Add blasOffset and materialIdx (as uint32)
        uintData[baseIndex + 32] = instance.blasOffset
        uintData[baseIndex + 33] = instance.materialIdx
  
        // Padding to align to 16 bytes (2 floats)
        floatData[baseIndex + 34] = 0.0
        floatData[baseIndex + 35] = 0.0
    }
  
    return createBufferWithData(
        device,
        'BLAS Instance Buffer',
        GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        floatData,
    )
}