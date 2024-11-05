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
