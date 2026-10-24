import type { Entity } from "../program";
import type { DeviceType } from "../device-catalog/model";

const devicePrefixes = {
  touch: "sensor_touch", "internal-temperature": "sensor_temperature_internal",
  lm35: "sensor_lm35", "active-buzzer": "buzzer", lcd1602: "display_lcd1602",
  stepper28byj: "motor_stepper", max7219: "matrix_max7219", vl53l0x: "sensor_vl53l0x",
  hcsr04: "sensor_hcsr04", mpu6050: "sensor_mpu6050", bno055: "sensor_bno055",
  encoder: "encoder", potentiometer: "potentiometer", dht11: "sensor_dht11",
  joystick: "joystick", "analog-input": "analog_input", "digital-input": "digital_input",
  servo: "servo", led: "led", "rgb-led": "led_rgb", ssd1306: "display_ssd1306",
  sh110x: "display_sh110x", tm1637: "display_tm1637", l298n: "driver_l298n",
  tb6612: "driver_tb", "digital-output": "digital_output", "pwm-output": "pwm_output"
} satisfies Record<DeviceType, string>;

function pinPrefix(entity: Entity) {
  if (entity.kind === "subscriber") return "led";
  if (entity.kind === "device") return devicePrefixes[entity.device];
  if (entity.kind === "robot") return {
    "imu-yaw": "sensor_bno055", "tof-triple": "sensor_tof_group",
    "wheel-encoders": "encoder_pair", differential: "differential", "motor-pwm": "driver_hbridge"
  }[entity.behavior];
  return "publisher";
}

// Number each hardware family separately. Topics and unrelated blocks do not affect names.
export function pinInstance(entities: Entity[], index: number) {
  const prefix = pinPrefix(entities[index]);
  return entities.slice(0, index + 1).filter(entity => pinPrefix(entity) === prefix).length;
}

export function pinName(entity: Entity, instance: number, role: string) {
  const prefix = pinPrefix(entity);
  const name = `${prefix}${/\d$/.test(prefix) ? "_" : ""}${instance}`;
  const signal = ({ signal: "", pin: "PWM", button: "SW", trigger: "TRIG", standby: "STBY",
    leftA: "LEFT_A", leftB: "LEFT_B", rightA: "RIGHT_A", rightB: "RIGHT_B"
  } as Record<string, string>)[role] ?? role.toUpperCase();
  return signal ? `${name}_${signal}` : name;
}
