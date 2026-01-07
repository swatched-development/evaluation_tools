/**
 * Face angles calculation utility using MediaPipe face landmarks
 * Calculates yaw, pitch, and roll angles from facial landmarks
 */

// MediaPipe face landmark indices based on proven implementations
// Using landmarks from vladmandic/human library and research papers
const LANDMARK_INDICES = {
  // Core face points for 3D orientation calculation
  TOP: 10,         // Forehead center
  BOTTOM: 152,     // Chin center
  LEFT: 234,       // Left face edge
  RIGHT: 454,      // Right face edge

  // Specific landmarks for roll calculation (forehead points)
  ROLL_LEFT: 151,  // Left forehead
  ROLL_RIGHT: 337, // Right forehead

  // Specific landmarks for pitch calculation
  PITCH_TOP: 10,   // Top forehead
  PITCH_BOTTOM: 152, // Bottom chin

  // Nose reference points
  NOSE_TIP: 1,
  NOSE_BRIDGE: 6
};

/**
 * Calculate yaw, pitch, and roll angles from MediaPipe face landmarks
 * @param {Array} landmarks - Array of MediaPipe face landmarks (normalized coordinates)
 * @returns {Object} Object containing yaw, pitch, and roll angles in degrees
 */
export function calculateFaceAngles(landmarks) {
  if (!landmarks || landmarks.length < 468) {
    return { yaw: null, pitch: null, roll: null };
  }

  try {
    // Get landmarks using proven indices from human library
    const top = landmarks[LANDMARK_INDICES.TOP];
    const bottom = landmarks[LANDMARK_INDICES.BOTTOM];
    const left = landmarks[LANDMARK_INDICES.LEFT];
    const right = landmarks[LANDMARK_INDICES.RIGHT];

    // Specific landmarks for roll
    const rollLeft = landmarks[LANDMARK_INDICES.ROLL_LEFT];
    const rollRight = landmarks[LANDMARK_INDICES.ROLL_RIGHT];

    // Calculate angles using proven methods
    const roll = calculateRollFromForehead(rollLeft, rollRight);
    const pitch = calculatePitchFromVertical(top, bottom);
    const yaw = calculateYawFromHorizontal(left, right, top, bottom);

    return {
      yaw: isFinite(yaw) ? Math.round(yaw * 10) / 10 : null,
      pitch: isFinite(pitch) ? Math.round(pitch * 10) / 10 : null,
      roll: isFinite(roll) ? Math.round(roll * 10) / 10 : null
    };
  } catch (error) {
    return { yaw: null, pitch: null, roll: null };
  }
}

/**
 * Calculate roll angle using forehead landmarks (proven method)
 * Based on research: use landmarks 151 and 337
 * @param {Object} rollLeft - Left forehead landmark
 * @param {Object} rollRight - Right forehead landmark
 * @returns {number} Roll angle in degrees
 */
function calculateRollFromForehead(rollLeft, rollRight) {
  const dx = rollRight.x - rollLeft.x;
  const dy = rollRight.y - rollLeft.y;

  // Calculate roll using atan2 and multiply by -1 as per research
  const rollRadians = Math.atan2(dy, dx);
  const rollDegrees = (rollRadians * (180 / Math.PI)) * -1;

  return normalizeAngle(rollDegrees);
}

/**
 * Calculate pitch angle using vertical landmarks
 * @param {Object} top - Top forehead landmark
 * @param {Object} bottom - Bottom chin landmark
 * @returns {number} Pitch angle in degrees
 */
function calculatePitchFromVertical(top, bottom) {
  const dx = bottom.x - top.x;
  const dy = bottom.y - top.y;

  // Calculate pitch angle
  const pitchRadians = Math.atan2(dy, dx);
  const pitchDegrees = (pitchRadians * (180 / Math.PI)) - 90; // Subtract 90 to normalize

  return normalizeAngle(pitchDegrees);
}

/**
 * Calculate yaw angle using 3D face orientation
 * Based on the Human library approach using face plane normal
 * @param {Object} left - Left face landmark
 * @param {Object} right - Right face landmark
 * @param {Object} top - Top landmark
 * @param {Object} bottom - Bottom landmark
 * @returns {number} Yaw angle in degrees
 */
function calculateYawFromHorizontal(left, right, top, bottom) {
  // Calculate face center
  const centerX = (left.x + right.x) / 2;
  const centerY = (top.y + bottom.y) / 2;

  // Calculate vectors for face plane
  const horizontalVector = { x: right.x - left.x, y: right.y - left.y, z: (right.z || 0) - (left.z || 0) };
  const verticalVector = { x: bottom.x - top.x, y: bottom.y - top.y, z: (bottom.z || 0) - (top.z || 0) };

  // Calculate normal vector using cross product
  const normal = {
    x: horizontalVector.y * verticalVector.z - horizontalVector.z * verticalVector.y,
    y: horizontalVector.z * verticalVector.x - horizontalVector.x * verticalVector.z,
    z: horizontalVector.x * verticalVector.y - horizontalVector.y * verticalVector.x
  };

  // Calculate yaw from normal vector
  const yawRadians = Math.atan2(normal.x, normal.z);
  const yawDegrees = yawRadians * (180 / Math.PI);

  return normalizeAngle(yawDegrees);
}

/**
 * Normalize angle to [-180, 180] range
 * @param {number} angle - Angle in degrees
 * @returns {number} Normalized angle
 */
function normalizeAngle(angle) {
  while (angle > 180) angle -= 360;
  while (angle < -180) angle += 360;
  return angle;
}

/**
 * Get 3D face orientation using multiple landmarks for improved accuracy
 * Alternative method using plane fitting
 * @param {Array} landmarks - Face landmarks array
 * @returns {Object} Face angles object
 */
export function calculateFaceAnglesAdvanced(landmarks) {
  if (!landmarks || landmarks.length < 468) {
    return { yaw: null, pitch: null, roll: null };
  }

  try {
    // Define 3D reference points for face plane
    const referencePoints = [
      landmarks[LANDMARK_INDICES.NOSE_TIP],
      landmarks[LANDMARK_INDICES.LEFT_FACE_EDGE],
      landmarks[LANDMARK_INDICES.RIGHT_FACE_EDGE],
      landmarks[LANDMARK_INDICES.CHIN_BOTTOM],
      landmarks[LANDMARK_INDICES.FOREHEAD_CENTER]
    ];

    // Calculate face normal vector using cross product
    const faceNormal = calculateFaceNormal(referencePoints);

    // Convert normal vector to Euler angles
    const angles = normalVectorToEulerAngles(faceNormal);

    return {
      yaw: Math.round(angles.yaw * 10) / 10,
      pitch: Math.round(angles.pitch * 10) / 10,
      roll: Math.round(angles.roll * 10) / 10
    };
  } catch (error) {
    console.error('Error calculating advanced face angles:', error);
    return calculateFaceAngles(landmarks); // Fallback to basic method
  }
}

/**
 * Calculate face normal vector from multiple 3D points
 * @param {Array} points - Array of 3D points
 * @returns {Object} Normal vector {x, y, z}
 */
function calculateFaceNormal(points) {
  // Use first three non-collinear points to define plane
  const p1 = points[0]; // nose tip
  const p2 = points[1]; // left face
  const p3 = points[2]; // right face

  // Create vectors
  const v1 = { x: p2.x - p1.x, y: p2.y - p1.y, z: (p2.z || 0) - (p1.z || 0) };
  const v2 = { x: p3.x - p1.x, y: p3.y - p1.y, z: (p3.z || 0) - (p1.z || 0) };

  // Calculate cross product for normal vector
  const normal = {
    x: v1.y * v2.z - v1.z * v2.y,
    y: v1.z * v2.x - v1.x * v2.z,
    z: v1.x * v2.y - v1.y * v2.x
  };

  // Normalize the vector
  const magnitude = Math.sqrt(normal.x * normal.x + normal.y * normal.y + normal.z * normal.z);
  if (magnitude === 0) return { x: 0, y: 0, z: 1 }; // Default facing forward

  return {
    x: normal.x / magnitude,
    y: normal.y / magnitude,
    z: normal.z / magnitude
  };
}

/**
 * Convert normal vector to Euler angles
 * @param {Object} normal - Normal vector {x, y, z}
 * @returns {Object} Euler angles {yaw, pitch, roll}
 */
function normalVectorToEulerAngles(normal) {
  // Calculate yaw (rotation around Y axis)
  const yaw = Math.atan2(normal.x, normal.z) * (180 / Math.PI);

  // Calculate pitch (rotation around X axis)
  const pitch = Math.asin(-normal.y) * (180 / Math.PI);

  // Roll is more complex to calculate from normal alone
  // For simplicity, we'll use a basic approximation
  const roll = Math.atan2(normal.x, Math.sqrt(normal.y * normal.y + normal.z * normal.z)) * (180 / Math.PI);

  return {
    yaw: normalizeAngle(yaw),
    pitch: normalizeAngle(pitch),
    roll: normalizeAngle(roll)
  };
}