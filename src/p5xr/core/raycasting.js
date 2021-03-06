import p5xrViewer from './p5xrViewer';

p5xrViewer.prototype.getRayFromScreen = function (screenX, screenY) {
  const ray = {
    origin: new p5.Vector(0, 0, 0),
    direction: new p5.Vector(),
  };

  let poseMatrix = this.poseMatrix.copy();
  poseMatrix.transpose(poseMatrix);
  poseMatrix = poseMatrix.mat4;

  // set origin of ray to pose position
  ray.origin.x = poseMatrix[3];
  ray.origin.y = poseMatrix[7];
  ray.origin.z = poseMatrix[11];

  let initialMVMatrix = this.initialMVMatrix.copy();
  initialMVMatrix.transpose(initialMVMatrix);
  initialMVMatrix = initialMVMatrix.mat4;

  // transform ray origin to view space
  const rayOriginCopy = ray.origin.copy();
  ray.origin.x = initialMVMatrix[0] * rayOriginCopy.x
    + initialMVMatrix[1] * rayOriginCopy.y
    + initialMVMatrix[2] * rayOriginCopy.z
    + initialMVMatrix[3];
  ray.origin.y = initialMVMatrix[4] * rayOriginCopy.x
    + initialMVMatrix[5] * rayOriginCopy.y
    + initialMVMatrix[6] * rayOriginCopy.z
    + initialMVMatrix[7];
  ray.origin.z = initialMVMatrix[8] * rayOriginCopy.x
    + initialMVMatrix[9] * rayOriginCopy.y
    + initialMVMatrix[10] * rayOriginCopy.z
    + initialMVMatrix[11];

  // get ray direction from left eye
  const leftDirection = new p5.Vector(screenX, screenY, -1);

  let leftPMatrixInverse = new p5.Matrix();
  leftPMatrixInverse.invert(this.leftPMatrix.copy());
  leftPMatrixInverse.transpose(leftPMatrixInverse);
  leftPMatrixInverse = leftPMatrixInverse.mat4;

  const leftDirectionCopy = leftDirection.copy();
  leftDirection.x = leftPMatrixInverse[0] * leftDirectionCopy.x + leftPMatrixInverse[1] * leftDirectionCopy.y + leftPMatrixInverse[2] * leftDirectionCopy.z;
  leftDirection.y = leftPMatrixInverse[4] * leftDirectionCopy.x + leftPMatrixInverse[5] * leftDirectionCopy.y + leftPMatrixInverse[6] * leftDirectionCopy.z;
  leftDirection.normalize();

  // get ray direction from right eye
  const rightDirection = new p5.Vector(screenX, screenY, -1);

  let rightPMatrixInverse = new p5.Matrix();
  rightPMatrixInverse.invert(this.rightPMatrix.copy());
  rightPMatrixInverse.transpose(rightPMatrixInverse);
  rightPMatrixInverse = rightPMatrixInverse.mat4;

  const rightDirectionCopy = rightDirection.copy();
  rightDirection.x = rightPMatrixInverse[0] * rightDirectionCopy.x + rightPMatrixInverse[1] * rightDirectionCopy.y + rightPMatrixInverse[2] * rightDirectionCopy.z;
  rightDirection.y = rightPMatrixInverse[4] * rightDirectionCopy.x + rightPMatrixInverse[5] * rightDirectionCopy.y + rightPMatrixInverse[6] * rightDirectionCopy.z;
  rightDirection.normalize();

  // combine both ray directions
  ray.direction = p5.Vector.add(leftDirection, rightDirection).normalize();

  return ray;
};

p5.prototype.intersectsSphere = function () {
  const radius = arguments[0];
  let ray = {
    origin: null,
    direction: null,
  };
  if (arguments.length !== 2 || !arguments[1].hasOwnProperty('origin')) {
    const screenX = arguments[1] || 0; const
      screenY = arguments[2] || 0;
    ray = p5xr.instance.viewer.getRayFromScreen(screenX, screenY);
  } else {
    ray.origin = arguments[1].origin.copy();
    ray.direction = arguments[1].direction.copy();
  }

  if (ray === null) return false;

  // sphere in View space
  let uMVMatrix = p5.instance._renderer.uMVMatrix.copy();
  uMVMatrix.transpose(uMVMatrix);
  uMVMatrix = uMVMatrix.mat4;

  const sphereCenter = new p5.Vector(0, 0, 0);
  sphereCenter.x = uMVMatrix[3];
  sphereCenter.y = uMVMatrix[7];
  sphereCenter.z = uMVMatrix[11];

  if (p5.Vector.sub(ray.origin, sphereCenter).mag() <= radius) {
    return true;
  }

  // check if sphere is in front of ray
  if (p5.Vector.dot(p5.Vector.sub(sphereCenter, ray.origin), ray.direction) < 0) {
    return false;
  }

  const sphereToRayOrigin = p5.Vector.sub(ray.origin, sphereCenter);
  const b = 2 * p5.Vector.dot(ray.direction, sphereToRayOrigin);
  const c = p5.Vector.mag(sphereToRayOrigin) * p5.Vector.mag(sphereToRayOrigin) - radius * radius;

  const det = b * b - 4 * c;

  return det >= 0;
};

p5.prototype.intersectsBox = function () {
  const width = arguments[0]; let height; let
    depth;
  let ray = {
    origin: null,
    direction: null,
  };
  if (arguments[arguments.length - 1].hasOwnProperty('origin')) {
    ray.origin = arguments[arguments.length - 1].origin.copy();
    ray.direction = arguments[arguments.length - 1].direction.copy();
    height = arguments.length > 2 ? arguments[1] : width;
    depth = arguments.length > 3 ? arguments[2] : height;
  } else if (arguments.length === 5) {
    // if screenX, screenY is specified => width, height, depth must also be specified
    ray = p5xr.instance.viewer.getRayFromScreen(arguments[3], arguments[4]);
    height = arguments[1];
    depth = arguments[2];
  } else {
    ray = p5xr.instance.viewer.getRayFromScreen(0, 0);
    height = arguments.length > 1 ? arguments[1] : width;
    depth = arguments.length > 2 ? arguments[2] : height;
  }

  // bounding box in view space will not be axis aligned
  // so we will transform ray to box space by applying inverse(uMVMatrix) to origin and direction

  let uMVMatrixInv = p5.instance._renderer.uMVMatrix.copy();
  uMVMatrixInv.transpose(uMVMatrixInv);
  uMVMatrixInv.invert(uMVMatrixInv);
  uMVMatrixInv = uMVMatrixInv.mat4;

  const rayOriginCopy = ray.origin.copy();
  ray.origin.x = uMVMatrixInv[0] * rayOriginCopy.x
    + uMVMatrixInv[1] * rayOriginCopy.y
    + uMVMatrixInv[2] * rayOriginCopy.z
    + uMVMatrixInv[3];
  ray.origin.y = uMVMatrixInv[4] * rayOriginCopy.x
    + uMVMatrixInv[5] * rayOriginCopy.y
    + uMVMatrixInv[6] * rayOriginCopy.z
    + uMVMatrixInv[7];
  ray.origin.z = uMVMatrixInv[8] * rayOriginCopy.x
    + uMVMatrixInv[9] * rayOriginCopy.y
    + uMVMatrixInv[10] * rayOriginCopy.z
    + uMVMatrixInv[11];

  const rayDirectionCopy = ray.direction.copy();
  ray.direction.x = uMVMatrixInv[0] * rayDirectionCopy.x + uMVMatrixInv[1] * rayDirectionCopy.y + uMVMatrixInv[2] * rayDirectionCopy.z;
  ray.direction.y = uMVMatrixInv[4] * rayDirectionCopy.x + uMVMatrixInv[5] * rayDirectionCopy.y + uMVMatrixInv[6] * rayDirectionCopy.z;
  ray.direction.z = uMVMatrixInv[8] * rayDirectionCopy.x + uMVMatrixInv[9] * rayDirectionCopy.y + uMVMatrixInv[10] * rayDirectionCopy.z;
  ray.direction.normalize();

  // representing AABB (Axis aligned bounding box) with 2 extreme points
  const min = new p5.Vector(-0.5 * width, -0.5 * height, -0.5 * depth);
  const max = new p5.Vector(0.5 * width, 0.5 * height, 0.5 * depth);

  // ray-AABB intersection algorithm
  const t1 = (min.x - ray.origin.x) / ray.direction.x;
  const t2 = (max.x - ray.origin.x) / ray.direction.x;
  const t3 = (min.y - ray.origin.y) / ray.direction.y;
  const t4 = (max.y - ray.origin.y) / ray.direction.y;
  const t5 = (min.z - ray.origin.z) / ray.direction.z;
  const t6 = (max.z - ray.origin.z) / ray.direction.z;

  const tmin = Math.max(Math.max(Math.min(t1, t2), Math.min(t3, t4)), Math.min(t5, t6));
  const tmax = Math.min(Math.min(Math.max(t1, t2), Math.max(t3, t4)), Math.max(t5, t6));

  if (tmax < 0 || tmin > tmax) {
    return false;
  }
  return true;
};

p5.prototype.intersectsPlane = function () {
  let ray = {
    origin: null,
    direction: null,
  };
  if (arguments[0].hasOwnProperty('origin')) {
    ray.origin = arguments[0].origin.copy();
    ray.direction = arguments[0].direction.copy();
  } else {
    ray = p5xr.instance.viewer.getRayFromScreen(arguments[0], arguments[1]);
  }

  // transforming ray to local plane space
  // intersection point will be with respect to the plane

  let uMVMatrixInv = p5.instance._renderer.uMVMatrix.copy();
  uMVMatrixInv.transpose(uMVMatrixInv);
  uMVMatrixInv.invert(uMVMatrixInv);
  uMVMatrixInv = uMVMatrixInv.mat4;

  const rayOriginCopy = ray.origin.copy();
  ray.origin.x = uMVMatrixInv[0] * rayOriginCopy.x + uMVMatrixInv[1] * rayOriginCopy.y + uMVMatrixInv[2] * rayOriginCopy.z + uMVMatrixInv[3];
  ray.origin.y = uMVMatrixInv[4] * rayOriginCopy.x + uMVMatrixInv[5] * rayOriginCopy.y + uMVMatrixInv[6] * rayOriginCopy.z + uMVMatrixInv[7];
  ray.origin.z = uMVMatrixInv[8] * rayOriginCopy.x + uMVMatrixInv[9] * rayOriginCopy.y + uMVMatrixInv[10] * rayOriginCopy.z + uMVMatrixInv[11];

  const rayDirectionCopy = ray.direction.copy();
  ray.direction.x = uMVMatrixInv[0] * rayDirectionCopy.x + uMVMatrixInv[1] * rayDirectionCopy.y + uMVMatrixInv[2] * rayDirectionCopy.z;
  ray.direction.y = uMVMatrixInv[4] * rayDirectionCopy.x + uMVMatrixInv[5] * rayDirectionCopy.y + uMVMatrixInv[6] * rayDirectionCopy.z;
  ray.direction.z = uMVMatrixInv[8] * rayDirectionCopy.x + uMVMatrixInv[9] * rayDirectionCopy.y + uMVMatrixInv[10] * rayDirectionCopy.z;
  ray.direction.normalize();

  // represeting plane
  const planeNormal = new p5.Vector(0, 0, 1);
  const planePoint = new p5.Vector(0, 0, 0);

  // ray-plane intersection algorithm
  const w = p5.Vector.sub(planePoint, ray.origin);
  const d = Math.abs(p5.Vector.dot(ray.direction, planeNormal));
  if (d === 0) {
    return null;
  }

  const k = Math.abs(p5.Vector.dot(w, planeNormal) / d);
  const intersectionPoint = p5.Vector.add(ray.origin, ray.direction.copy().setMag(k));

  return createVector(intersectionPoint.x, intersectionPoint.y);
};

p5.prototype.generateRay = function (x1, y1, z1, x2, y2, z2) {
  const origin = new p5.Vector(x1, y1, z1);
  let direction = new p5.Vector(x2, y2, z2);
  direction = p5.Vector.sub(direction, origin);
  direction.normalize();

  let uMVMatrix = p5.instance._renderer.uMVMatrix.copy();
  uMVMatrix.transpose(uMVMatrix);
  uMVMatrix = uMVMatrix.mat4;

  const originCopy = origin.copy();
  origin.x = uMVMatrix[0] * originCopy.x + uMVMatrix[1] * originCopy.y + uMVMatrix[2] * originCopy.z + uMVMatrix[3];
  origin.y = uMVMatrix[4] * originCopy.x + uMVMatrix[5] * originCopy.y + uMVMatrix[6] * originCopy.z + uMVMatrix[7];
  origin.z = uMVMatrix[8] * originCopy.x + uMVMatrix[9] * originCopy.y + uMVMatrix[10] * originCopy.z + uMVMatrix[11];

  const directionCopy = direction.copy();
  direction.x = uMVMatrix[0] * directionCopy.x + uMVMatrix[1] * directionCopy.y + uMVMatrix[2] * directionCopy.z;
  direction.y = uMVMatrix[4] * directionCopy.x + uMVMatrix[5] * directionCopy.y + uMVMatrix[6] * directionCopy.z;
  direction.z = uMVMatrix[8] * directionCopy.x + uMVMatrix[9] * directionCopy.y + uMVMatrix[10] * directionCopy.z;

  direction.normalize();

  return {
    origin,
    direction,
  };
};
