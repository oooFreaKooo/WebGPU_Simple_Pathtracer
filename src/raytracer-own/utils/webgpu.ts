export function computePass(
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
  let encoder = device.createCommandEncoder({ label: "computeEncoder" })
  let pass = encoder.beginComputePass({ label: "computePass" })
  pass.setPipeline(computePipeline)
  pass.setBindGroup(0, bindGroups.uniformBindGroup)
  pass.setBindGroup(1, bindGroups.frameBufferBindGroup)
  pass.setBindGroup(2, bindGroups.objectBindGroup)
  pass.setBindGroup(3, bindGroups.textureBindGroup)
  pass.dispatchWorkgroups(workGroupsX, workGroupsY, 1)
  pass.end()
  let commandBuffer = encoder.finish()
  device.queue.submit([commandBuffer])
}

export function renderPass(
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
    console.error("The first colorAttachment is null")
  }

  const renderEncoder = device.createCommandEncoder({ label: "render encoder" })
  const renderPass = renderEncoder.beginRenderPass(renderPassDescriptor)
  renderPass.setPipeline(renderPipeline)
  renderPass.setBindGroup(0, bindGroup)
  renderPass.setVertexBuffer(0, vertexBuffer)
  renderPass.draw(6) // call our vertex shader 6 times (2 triangles)
  renderPass.end()

  const renderCommandBuffer = renderEncoder.finish()
  device.queue.submit([renderCommandBuffer])
}

export function createRenderPassDescriptor() {
  const renderPassDescriptor = {
    label: "renderPass",
    colorAttachments: [
      {
        clearValue: [0.3, 0.3, 0.3, 1],
        loadOp: "clear",
        storeOp: "store",
      },
    ],
  }

  return renderPassDescriptor as GPURenderPassDescriptor
}

export function createVertexBuffer(device: GPUDevice, bufferArray: Float32Array): GPUBuffer {
  const vertexBuffer = device.createBuffer({
    label: "vertexBuffer",
    size: bufferArray.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  })
  device.queue.writeBuffer(vertexBuffer, 0, bufferArray)

  return vertexBuffer
}
