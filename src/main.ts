import { Application } from "./raytracer-own/core/app"

async function mainFunc() {
  const canvas = document.createElement("canvas")
  //canvas.width = window.innerWidth
  //canvas.height = window.innerHeight
  canvas.width = 1920
  canvas.height = 1080
  // Get the .time-container from the html file
  const timeContainer = document.querySelector(".time-container")

  // If the timeContainer exists, insert the canvas before it. Otherwise, append the canvas to the body.
  if (timeContainer) {
    document.body.insertBefore(canvas, timeContainer)
  } else {
    document.body.appendChild(canvas)
  }

  // start the application
  const app = new Application(canvas)
  await app.start()
}

mainFunc()

/* 
fn reflectance(cosine: f32, ref_idx: f32) -> f32 {
    var r0 = (1 - ref_idx) / (1 + ref_idx);
    r0 = r0 * r0;
    return r0 + (1 - r0) * pow((1 - cosine), 5);
}

fn uniform_random_in_unit_sphere() -> vec3f {
    let phi = rand2D() * 2.0 * PI;
    let theta = acos(2.0 * rand2D() - 1.0);

    let x = sin(theta) * cos(phi);
    let y = sin(theta) * sin(phi);
    let z = cos(theta);

    return normalize(vec3f(x, y, z));
}

fn random_in_unit_disk() -> vec3f {
    let theta = 2 * PI * rand2D();
    let r = sqrt(rand2D());
    return normalize(vec3f(r * cos(theta), r * sin(theta), 0));
}

fn uniform_sampling_hemisphere() -> vec3f {
    let on_unit_sphere = uniform_random_in_unit_sphere();
    let sign_dot = select(1.0, 0.0, dot(on_unit_sphere, hitPoint.normal) > 0.0);
    return normalize(mix(on_unit_sphere, -on_unit_sphere, sign_dot));
}

fn cosine_sampling_hemisphere() -> vec3f {
    return uniform_random_in_unit_sphere() + hitPoint.normal;
}

// generates a random direction weighted by PDF = cos_theta / PI relative to z axis
fn cosine_sampling_wrt_Z() -> vec3f {
    let r1 = rand2D();
    let r2 = rand2D();

    let phi = 2 * PI * r1;
    let x = cos(phi) * sqrt(r2);
    let y = sin(phi) * sqrt(r2);
    let z = sqrt(1 - r2);

    return vec3f(x, y, z);
}

fn lambertian_scattering_pdf(scattered: Ray) -> f32 {
    let cos_theta = max(0, dot(hitPoint.normal, scattered.dir));
    return cos_theta / PI;
}

fn uniform_scattering_pdf(scattered: Ray) -> f32 {
    return 1 / (2 * PI);
}

var<private> unit_w : vec3f;
var<private> u : vec3f;
var<private> v : vec3f;
// creates an orthonormal basis 
fn onb_build_from_w(w: vec3f) -> mat3x3f {
    unit_w = normalize(w);
    let a = select(vec3f(1, 0, 0), vec3f(0, 1, 0), abs(unit_w.x) > 0.9);
    v = normalize(cross(unit_w, a));
    u = cross(unit_w, v);

    return mat3x3f(u, v, unit_w);
}

fn onb_get_local(a: vec3f) -> vec3f {
    return u * a.x + v * a.y + unit_w * a.z;
}

fn onb_lambertian_scattering_pdf(scattered: Ray) -> f32 {
    let cosine_theta = dot(normalize(scattered.dir), unit_w);
    return max(0, cosine_theta / PI);
}

fn get_random_on_quad(q: Quad, origin: vec3f) -> Ray {
    let p = q.Q + (rand2D() * q.u) + (rand2D() * q.v);
    return Ray(origin, normalize(p - origin));
}

fn get_random_on_quad_point(q: Quad) -> vec3f {
    let p = q.Q + (rand2D() * q.u) + (rand2D() * q.v);
    return p;
}

fn light_pdf(ray: Ray, quad: Quad) -> f32 {

    if dot(ray.dir, quad.normal) > 0 {
        return MIN_FLOAT;
    }

    let denom = dot(quad.normal, ray.dir);

    if abs(denom) < 1e-8 {
        return MIN_FLOAT;
    }

    let t = (quad.D - dot(quad.normal, ray.origin)) / denom;
    if t <= 0.001 || t >= MAX_FLOAT {
        return MIN_FLOAT;
    }

    let intersection = at(ray, t);
    let planar_hitpt_vector = intersection - quad.Q;
    let alpha = dot(quad.w, cross(planar_hitpt_vector, quad.v));
    let beta = dot(quad.w, cross(quad.u, planar_hitpt_vector));

    if alpha < 0 || 1 < alpha || beta < 0 || 1 < beta {
        return MIN_FLOAT;
    }

    var hitNormal = quad.normal;
    let front_face = dot(ray.dir, quad.normal) < 0;
    if front_face == false {
        hitNormal = -hitNormal;
    }

    let distance_squared = t * t * length(ray.dir) * length(ray.dir);
    let cosine = abs(dot(ray.dir, hitNormal) / length(ray.dir));

    return (distance_squared / (cosine * length(cross(lights.u, lights.v))));
}

fn at(ray: Ray, t: f32) -> vec3f {
    return ray.origin + t * ray.dir;
}

// PCG prng
// https://www.shadertoy.com/view/XlGcRh
fn rand2D() -> f32 {
    randState = randState * 747796405u + 2891336453u;
    var word: u32 = ((randState >> ((randState >> 28u) + 4u)) ^ randState) * 277803737u;
    return f32((word >> 22u) ^ word) / 4294967295;
}

// random numbers from a normal distribution
fn randNormalDist() -> f32 {
    let theta = 2 * PI * rand2D();
    let rho = sqrt(-2 * log(rand2D()));
    return rho * cos(theta);
}

fn random_double(min: f32, max: f32) -> f32 {
    return min + (max - min) * rand2D();
}

fn near_zero(v: vec3f) -> bool {
    return (abs(v[0]) < 0 && abs(v[1]) < 0 && abs(v[2]) < 0);
}

fn hit_sphere(sphere: Sphere, tmin: f32, tmax: f32, ray: Ray) -> bool {
	
	// let ray = Ray((vec4f(incidentRay.origin, 1) * transforms[i32(sphere.id)].invModelMatrix).xyz, (vec4f(incidentRay.dir, 0) * transforms[i32(sphere.id)].invModelMatrix).xyz);

    let oc = ray.origin - sphere.center;
    let a = dot(ray.dir, ray.dir);
    let half_b = dot(ray.dir, oc);
    let c = dot(oc, oc) - sphere.r * sphere.r;
    let discriminant = half_b * half_b - a * c;

    if discriminant < 0 {
        return false;
    }

    let sqrtd = sqrt(discriminant);
    var root = (-half_b - sqrtd) / a;
    if root <= tmin || root >= tmax {
        root = (-half_b + sqrtd) / a;
        if root <= tmin || root >= tmax {
            return false;
        }
    }

    hitPoint.t = root;
    hitPoint.p = at(ray, root);

	// hitPoint.p = (vec4f(hitPoint.p, 1) * transforms[i32(sphere.id)].invModelMatrix).xyz;
	// hitPoint.t = distance(hitPoint.p, incidentRay.origin);

    hitPoint.normal = normalize((hitPoint.p - sphere.center) / sphere.r);

	// hitPoint.normal = normalize((vec4f(hitPoint.normal, 0) * transpose(transforms[i32(sphere.id)].modelMatrix)).xyz);

    hitPoint.front_face = dot(ray.dir, hitPoint.normal) < 0;
    if hitPoint.front_face == false {
        hitPoint.normal = -hitPoint.normal;
    }


    hitPoint.material = materials[i32(sphere.material_id)];
    return true;
}

fn hit_sphere_local(sphere: Sphere, tmin: f32, tmax: f32, ray: Ray) -> f32 {
	
	// let ray = Ray((vec4f(incidentRay.origin, 1) * transforms[i32(sphere.id)].invModelMatrix).xyz, (vec4f(incidentRay.dir, 0) * transforms[i32(sphere.id)].invModelMatrix).xyz);
    let oc = ray.origin - sphere.center;
    let a = dot(ray.dir, ray.dir);
    let half_b = dot(ray.dir, oc);
    let c = dot(oc, oc) - sphere.r * sphere.r;
    let discriminant = half_b * half_b - a * c;

    if discriminant < 0 {
        return MAX_FLOAT + 1;
    }

    let sqrtd = sqrt(discriminant);
    var root = (-half_b - sqrtd) / a;
    if root <= tmin || root >= tmax {
        root = (-half_b + sqrtd) / a;
        if root <= tmin || root >= tmax {
            return MAX_FLOAT + 1;
        }
    }

    return root;
}

fn hit_volume(sphere: Sphere, tmin: f32, tmax: f32, ray: Ray) -> bool {

    var rec1 = hit_sphere_local(sphere, -MAX_FLOAT, MAX_FLOAT, ray);
    if rec1 == MAX_FLOAT + 1 {
        return false;
    }

    var rec2 = hit_sphere_local(sphere, rec1 + 0.0001, MAX_FLOAT, ray);
    if rec2 == MAX_FLOAT + 1 {
        return false;
    }

    if rec1 < tmin {
        rec1 = tmin;
    }

    if rec2 > tmax {
        rec2 = tmax;
    }

    if rec1 >= rec2 {
        return false;
    }

    if rec1 < 0 {
        rec1 = 0;
    }

    hitPoint.material = materials[i32(sphere.material_id)];

    let ray_length = length(ray.dir);
    let dist_inside = (rec2 - rec1) * ray_length;
    let hit_dist = hitPoint.material.roughness * log(rand2D());

    if hit_dist > dist_inside {
        return false;
    }

    hitPoint.t = rec1 + (hit_dist / ray_length);
    hitPoint.p = at(ray, hitPoint.t);
    hitPoint.normal = normalize(hitPoint.p - sphere.center);
    hitPoint.front_face = true;

    return true;
}

fn hit_quad(quad: Quad, tmin: f32, tmax: f32, ray: Ray) -> bool {

    if dot(ray.dir, quad.normal) > 0 {
        return false;
    }

    let denom = dot(quad.normal, ray.dir);

	// No hit if the ray is paraller to the plane
    if abs(denom) < 1e-8 {
        return false;
    }

    let t = (quad.D - dot(quad.normal, ray.origin)) / denom;
    if t <= tmin || t >= tmax {
        return false;
    }

	// determine if hit point lies within quarilateral
    let intersection = at(ray, t);
    let planar_hitpt_vector = intersection - quad.Q;
    let alpha = dot(quad.w, cross(planar_hitpt_vector, quad.v));
    let beta = dot(quad.w, cross(quad.u, planar_hitpt_vector));

    if alpha < 0 || 1 < alpha || beta < 0 || 1 < beta {
        return false;
    }

    hitPoint.t = t;
    hitPoint.p = intersection;
    hitPoint.normal = normalize(quad.normal);
    hitPoint.front_face = dot(ray.dir, hitPoint.normal) < 0;
    if hitPoint.front_face == false {
        hitPoint.normal = -hitPoint.normal;
    }

    hitPoint.material = materials[i32(quad.material_id)];
    return true;
}

fn get_lights() -> bool {
    for (var i = 0; i < NUM_QUADS; i++) {
        let emission = materials[i32(quad_objs[i].material_id)].emissionColor;

        if emission.x > 0.0 {
            lights = quad_objs[i];
			break;
        }
    }

    return true;
}

// ACES approximation for tone mapping
// https://knarkowicz.wordpress.com/2016/01/06/aces-filmic-tone-mapping-curve/):
fn aces_approx(v: vec3f) -> vec3f {
    let v1 = v * 0.6f;
    const a = 2.51f;
    const b = 0.03f;
    const c = 2.43f;
    const d = 0.59f;
    const e = 0.14f;
    return clamp((v1 * (a * v1 + b)) / (v1 * (c * v1 + d) + e), vec3(0.0f), vec3(1.0f));
}

var<private> doSpecular : f32;
fn material_scatter(ray_in: Ray) -> Ray {

    var scattered = Ray(vec3f(0), vec3f(0));
    doSpecular = 0;
    if hitPoint.material.material_type == LAMBERTIAN {

        let uvw = onb_build_from_w(hitPoint.normal);
        var diffuse_dir = cosine_sampling_wrt_Z();
        diffuse_dir = normalize(onb_get_local(diffuse_dir));

        scattered = Ray(hitPoint.p, diffuse_dir);

        doSpecular = select(0.0, 1.0, rand2D() < hitPoint.material.specularStrength);

		// var diffuse_dir = uniform_sampling_hemisphere();
		// var diffuse_dir = cosine_sampling_hemisphere();
		// if(near_zero(diffuse_dir)) {
		// 	diffuse_dir = hitPoint.normal;
		// }

		// scattered = Ray(hitPoint.p, normalize(diffuse_dir));
        var specular_dir = reflect(ray_in.dir, hitPoint.normal);
        specular_dir = normalize(mix(specular_dir, diffuse_dir, hitPoint.material.roughness));

        scattered = Ray(hitPoint.p, normalize(mix(diffuse_dir, specular_dir, doSpecular)));

        scatterRec.skip_pdf = false;

        if doSpecular == 1.0 {
            scatterRec.skip_pdf = true;
            scatterRec.skip_pdf_ray = scattered;
        }
    } else if hitPoint.material.material_type == MIRROR {
        var reflected = reflect(ray_in.dir, hitPoint.normal);
        scattered = Ray(hitPoint.p, normalize(reflected + hitPoint.material.roughness * uniform_random_in_unit_sphere()));

        scatterRec.skip_pdf = true;
        scatterRec.skip_pdf_ray = scattered;
    } else if hitPoint.material.material_type == GLASS {
        var ir = hitPoint.material.eta;
        if hitPoint.front_face == true {
            ir = (1.0 / ir);
        }

        let unit_direction = normalize(ray_in.dir);
        let cos_theta = min(dot(-unit_direction, hitPoint.normal), 1.0);
        let sin_theta = sqrt(1 - cos_theta * cos_theta);

        var direction = vec3f(0);
        if ir * sin_theta > 1.0 || reflectance(cos_theta, ir) > rand2D() {
		// if(ir * sin_theta > 1.0) {
            direction = reflect(unit_direction, hitPoint.normal);
        } else {
            direction = refract(unit_direction, hitPoint.normal, ir);
        }

        if near_zero(direction) {
            direction = hitPoint.normal;
        }

        scattered = Ray(hitPoint.p, normalize(direction));

        scatterRec.skip_pdf = true;
        scatterRec.skip_pdf_ray = scattered;
    } else if hitPoint.material.material_type == ISOTROPIC {
		// scattered = Ray(hitPoint.p, uniform_random_in_unit_sphere());
		// scatterRec.skip_pdf = true;
		// scatterRec.skip_pdf_ray = scattered;

        let g = hitPoint.material.specularStrength;
		// let cos_hg = (1 - g*g) / (4 * PI * pow(1 + g*g - 2*g*cos(2 * PI * rand2D()), 3/2));
        let cos_hg = (1 + g * g - pow(((1 - g * g) / (1 - g + 2 * g * rand2D())), 2)) / (2 * g);
        let sin_hg = sqrt(1 - cos_hg * cos_hg);
        let phi = 2 * PI * rand2D();

        let hg_dir = vec3f(sin_hg * cos(phi), sin_hg * sin(phi), cos_hg);

        let uvw = onb_build_from_w(ray_in.dir);
        scattered = Ray(hitPoint.p, normalize(onb_get_local(hg_dir)));

		// scatterRec.pdf = (1 - g*g) / (4 * PI * pow(1 + g*g - 2*g*cos(2 * PI * rand2D()), 3/2));
        scatterRec.skip_pdf = true;
        scatterRec.skip_pdf_ray = scattered;
    }

    return scattered;
} */
