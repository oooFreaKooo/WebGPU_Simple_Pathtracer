import { vec3, vec2 } from 'gl-matrix'
import { Triangle } from './triangle'


const MAX_VALUE = Number.POSITIVE_INFINITY
const MIN_VALUE = Number.NEGATIVE_INFINITY

export class ObjLoader {
    maxCorner: vec3 = vec3.fromValues(MAX_VALUE, MAX_VALUE, MAX_VALUE)
    minCorner: vec3 = vec3.fromValues(MIN_VALUE, MIN_VALUE, MIN_VALUE)

    v: vec3[] = []
    vn: vec3[] = []
    vt: vec2[] = []
    triangles: Triangle[] = []

    async initialize (url: string) {
        await this.readFile(url)
        this.v.length = 0
        this.vt.length = 0
        this.vn.length = 0
    }

    async readFile (url: string) {
        const response = await fetch(url)
        const file_contents = await response.text()
        const lines = file_contents.split(/\r?\n/) 
    
        lines.forEach((line) => {
            const trimmedLine = line.trim()
            if (trimmedLine.length === 0 || trimmedLine.startsWith('#')) {
                return
            }
    
            const prefix = trimmedLine.slice(0, 2)
            switch (prefix) {
            case 'v ':
                this.read_vertex_data(trimmedLine)
                break
            case 'vt':
                this.read_texcoord_data(trimmedLine)
                break
            case 'vn':
                this.read_normal_data(trimmedLine)
                break
            case 'f ':
                this.read_face_data(trimmedLine)
                break
            default:
                // Optionally handle other prefixes or ignore
                break
            }
        })
    }
    

    private read_vertex_data (line: string) {
        const [ , x, y, z ] = line.split(' ').map(Number)
        const new_vertex = vec3.fromValues(x, y, z)

        this.v.push(new_vertex)
        vec3.min(this.minCorner, this.minCorner, new_vertex)
        vec3.max(this.maxCorner, this.maxCorner, new_vertex)
    }

    private read_texcoord_data (line: string) {
        const [ , u, v ] = line.split(' ').map(Number)
        this.vt.push([ u, v ])
    }

    private read_normal_data (line: string) {
        const [ , nx, ny, nz ] = line.split(' ').map(Number)
        this.vn.push([ nx, ny, nz ])
    }

    private read_face_data (line: string) {
        const vertex_descriptions = line.trim().split(' ')

        if (vertex_descriptions.length === 4) {
            const tri = new Triangle()
            this.read_corner(vertex_descriptions[1], tri)
            this.read_corner(vertex_descriptions[2], tri)
            this.read_corner(vertex_descriptions[3], tri)
            tri.make_centroid()
            this.triangles.push(tri)
        } else if (vertex_descriptions.length === 5) {
            const tri1 = new Triangle()
            this.read_corner(vertex_descriptions[1], tri1)
            this.read_corner(vertex_descriptions[2], tri1)
            this.read_corner(vertex_descriptions[3], tri1)
            tri1.make_centroid()
            this.triangles.push(tri1)

            const tri2 = new Triangle()
            this.read_corner(vertex_descriptions[1], tri2)
            this.read_corner(vertex_descriptions[3], tri2)
            this.read_corner(vertex_descriptions[4], tri2)
            tri2.make_centroid()
            this.triangles.push(tri2)
        }
    }

    private read_corner (vertex_description: string, tri: Triangle) {
        const parts = vertex_description.split('/')
        const vIndex = parseInt(parts[0], 10) - 1
        const vtIndex = parts[1] ? parseInt(parts[1], 10) - 1 : -1
        const vnIndex = parts[2] ? parseInt(parts[2], 10) - 1 : -1

        tri.corners.push(this.v[vIndex])
        tri.normals.push(this.vn[vnIndex])

        if (vtIndex >= 0) {
            tri.uvs.push(this.vt[vtIndex])
        } else {
        // If no UV is provided, push a default UV (e.g., [0, 0])
            tri.uvs.push(vec2.fromValues(0, 0))
        }
    }  
}