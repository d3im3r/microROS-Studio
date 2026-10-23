import { z } from "zod";
export const outputPins = [2,4,5,12,13,14,15,16,17,18,19,21,22,23,25,26,27,32,33];
const outputPin = z.number().int().refine(v => outputPins.includes(v), "Output GPIO unavailable in this ESP32 profile.");
const inputPin = z.number().int().refine(v => [...outputPins,34,35,36,39].includes(v), "Input GPIO unavailable.");
export const topicSchema = z.string().regex(/^\/[a-zA-Z_][a-zA-Z0-9_]*(\/[a-zA-Z_][a-zA-Z0-9_]*)*$/, "Invalid absolute ROS topic.");
export const robotSchema = z.object({
  id: z.string().min(1), kind: z.literal("robot"),
  behavior: z.enum(["imu-yaw", "tof-triple", "wheel-encoders", "differential", "motor-pwm"]),
  topic: topicSchema, outputTopic: topicSchema.default("/wheel_refs_rad_s"),
  period: z.number().int().min(20).max(3600000).default(50),
  pin: outputPin.default(13), in1: outputPin.default(26), in2: outputPin.default(27),
  center: outputPin.default(5), left: outputPin.default(14), right: outputPin.default(23),
  leftA: inputPin.default(4), leftB: inputPin.default(2), rightA: inputPin.default(18), rightB: inputPin.default(19),
  leftInverted: z.boolean().default(true), rightInverted: z.boolean().default(false),
  activeLow: z.boolean().default(false),
  ppr: z.number().finite().min(1).max(1000000).default(2112),
  radius: z.number().finite().min(0.001).max(10).default(0.0217),
  wheelBase: z.number().finite().min(0.001).max(10).default(0.10144),
  maxSpeed: z.number().finite().min(0.01).max(1000).default(13),
  pwmLimit: z.number().finite().min(1).max(100).default(100),
  deadband: z.number().finite().min(0).max(100).default(12),
  timeout: z.number().int().min(50).max(5000).default(500)
}).superRefine((e, ctx) => {
  if (e.behavior === "motor-pwm" && e.deadband > e.pwmLimit) ctx.addIssue({ code: "custom", message: "The deadband cannot exceed the PWM limit." });
});
export type RobotEntity = z.infer<typeof robotSchema>;
export type RobotBehavior = RobotEntity["behavior"];
export const robotDefinitions: Record<RobotBehavior, { title: string; message: "Float32" | "Vector3" | "Twist"; direction: "publisher" | "subscriber"; description: string; topic: string; source: string; }> = {
  "imu-yaw": { title: "BNO055 · yaw", message: "Float32", direction: "publisher", description: "Yaw in radians from the quaternion. BNO055 at 0x28; I2C 21/22.", topic: "/imu_yaw_rad", source: "src/sensors.cpp" },
  "tof-triple": { title: "VL53L0X · tres distancias", message: "Vector3", direction: "publisher", description: "x: center, y: left, z: right, in meters. -1 indicates an invalid reading. I2C 21/22.", topic: "/tof_distances_m", source: "src/sensors.cpp" },
  "wheel-encoders": { title: "Encoders · velocities", message: "Vector3", direction: "publisher", description: "x: left wheel, y: right wheel, z: 0; rad/s. CHANGE interrupt on channel A; configurable effective PPR.", topic: "/wheel_velocities_rad_s", source: "src/encoders.cpp" },
  "differential": { title: "Differential kinematics", message: "Twist", direction: "subscriber", description: "Receives linear.x (m/s) and angular.z (rad/s); publishes left/right references as Vector3 in rad/s. Does not drive motors.", topic: "/cmd_vel", source: "src/kinematics.cpp" },
  "motor-pwm": { title: "Motor · puente H", message: "Float32", direction: "subscriber", description: "Signed percentage command; saturation, deadband, inversion and command watchdog. 1 kHz / 8-bit PWM from control_config.h.", topic: "/motor_pwm_cmd", source: "src/motors.cpp" }
};
export function createRobotEntity(behavior: RobotBehavior, id: string): RobotEntity {
  return robotSchema.parse({ id, kind: "robot", behavior, topic: robotDefinitions[behavior].topic, period: behavior === "tof-triple" ? 150 : 50 });
}
export function robotPins(e: RobotEntity): number[] {
  if (e.behavior === "motor-pwm") return [e.pin, e.in1, e.in2];
  if (e.behavior === "tof-triple") return [e.center, e.left, e.right];
  if (e.behavior === "wheel-encoders") return [e.leftA, e.leftB, e.rightA, e.rightB];
  return [];
}
