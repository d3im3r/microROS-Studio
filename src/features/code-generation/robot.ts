import { robotDefinitions, type RobotEntity } from "../program";
import { pinName } from "./pins";
import { cppString } from "./strings";
export type Fragment = { includes: string[]; declarations: string; callbacks: string; hardware: string; setup: string; loop: string; dependencies: string[] };
export function robotFragment(e: RobotEntity, i: number, channel = i, instance = 1): Fragment {
  const d = robotDefinitions[e.behavior];
  const pins=Object.fromEntries(["center","left","right","leftA","leftB","rightA","rightB","pin","in1","in2"].map(role=>[role,pinName(e,instance,role)]));
  const pub = d.direction === "publisher";
  const pkg = d.message === "Float32" ? "std_msgs" : "geometry_msgs";
  const header = d.message === "Vector3" ? "vector3" : d.message.toLowerCase();
  const f: Fragment = {
    includes: [`#include <${pkg}/msg/${header}.h>`, "#include <math.h>"], dependencies: [], hardware: "", loop: "",
    declarations: `${pkg}__msg__${d.message} msg_${i};\n${pub ? `rcl_publisher_t pub_${i};\nrcl_timer_t timer_${i};` : `rcl_subscription_t sub_${i};`}`,
    callbacks: "", setup: pub ? `    ok = ros.createPublisher(pub_${i}, ROSIDL_GET_MSG_TYPE_SUPPORT(${pkg}, msg, ${d.message}), ${cppString(e.topic)});\n    ros.require(ok, ${cppString(`Failed to create publisher ${e.topic}`)});\n    ok = ros.createTimer(timer_${i}, ${e.period}, timer_callback_${i});\n    ros.require(ok, ${cppString(`Failed to create timer ${e.topic}`)});` : `    ok = ros.createSubscription(sub_${i}, ROSIDL_GET_MSG_TYPE_SUPPORT(${pkg}, msg, ${d.message}), ${cppString(e.topic)}, &msg_${i}, subscription_callback_${i});\n    ros.require(ok, ${cppString(`Failed to create subscriber ${e.topic}`)});`
  };
  const timer = (body: string) => `void timer_callback_${i}(rcl_timer_t * timer, int64_t last_call_time)\n{\n    (void) last_call_time;\n    if (timer == nullptr) return;\n${body}\n    if (!ros.publish(pub_${i}, &msg_${i})) ros.info(${cppString(`Failed to publish ${e.topic}`)});\n}`;
  if (e.behavior === "imu-yaw") {
    f.includes.push("#include <Wire.h>", "#include <Adafruit_BNO055.h>");
    f.dependencies.push("adafruit/Adafruit BNO055");
    f.declarations += `\nAdafruit_BNO055 bno_${i}(55, 0x28);`;
    f.hardware = `    ros.require(bno_${i}.begin(), "BNO055 not found at 0x28");\n    delay(1000);\n    bno_${i}.setExtCrystalUse(true);`;
    f.callbacks = timer(`    const auto q = bno_${i}.getQuat();\n    msg_${i}.data = atan2(2.0 * (q.w()*q.z() + q.x()*q.y()),\n        1.0 - 2.0 * (q.y()*q.y() + q.z()*q.z()));`);
  }
  if (e.behavior === "tof-triple") {
    f.includes.push("#include <Wire.h>", "#include <Adafruit_VL53L0X.h>");
    f.dependencies.push("adafruit/Adafruit_VL53L0X");
    f.declarations += `\nAdafruit_VL53L0X tof_${i}[3];\nbool tof_ok_${i}[3] = {false, false, false};\nconst uint8_t tof_pins_${i}[3] = {${pins.center}, ${pins.left}, ${pins.right}};\n// Center/left/right order; addresses from the reference firmware.\nconst uint8_t tof_addresses_${i}[3] = {0x30, 0x32, 0x31};`;
    f.hardware = `    for (int k = 0; k < 3; ++k) {\n        pinMode(tof_pins_${i}[k], OUTPUT);\n        digitalWrite(tof_pins_${i}[k], LOW);\n    }\n    delay(200);\n    for (int k = 0; k < 3; ++k) {\n        digitalWrite(tof_pins_${i}[k], HIGH);\n        delay(100);\n        tof_ok_${i}[k] = tof_${i}[k].begin(tof_addresses_${i}[k]);\n        // Keep a failed sensor disabled so it does not occupy address 0x29.\n        if (!tof_ok_${i}[k]) digitalWrite(tof_pins_${i}[k], LOW);\n    }`;
    f.callbacks = timer(`    double values[3] = {-1.0, -1.0, -1.0};\n    for (int k = 0; k < 3; ++k) {\n        if (!tof_ok_${i}[k]) continue;\n        VL53L0X_RangingMeasurementData_t measure;\n        tof_${i}[k].rangingTest(&measure, false);\n        if (measure.RangeStatus == 0) values[k] = measure.RangeMilliMeter / 1000.0;\n    }\n    msg_${i}.x = values[0]; msg_${i}.y = values[1]; msg_${i}.z = values[2];`);
  }
  if (e.behavior === "wheel-encoders") {
    f.declarations += `\nvolatile uint32_t ticks_left_${i} = 0, ticks_right_${i} = 0;\nportMUX_TYPE encoder_mux_${i} = portMUX_INITIALIZER_UNLOCKED;\nuint32_t encoder_time_${i} = 0;`;
    f.callbacks = `void IRAM_ATTR encoder_left_isr_${i}() {\n    const bool different = digitalRead(${pins.leftA}) != digitalRead(${pins.leftB});\n    portENTER_CRITICAL_ISR(&encoder_mux_${i});\n    ticks_left_${i} += different ? ${e.leftInverted ? "-1 : 1" : "1 : -1"};\n    portEXIT_CRITICAL_ISR(&encoder_mux_${i});\n}\nvoid IRAM_ATTR encoder_right_isr_${i}() {\n    const bool different = digitalRead(${pins.rightA}) != digitalRead(${pins.rightB});\n    portENTER_CRITICAL_ISR(&encoder_mux_${i});\n    ticks_right_${i} += different ? ${e.rightInverted ? "-1 : 1" : "1 : -1"};\n    portEXIT_CRITICAL_ISR(&encoder_mux_${i});\n}\n\n` + timer(`    const uint32_t now = millis();\n    const double dt = (now - encoder_time_${i}) / 1000.0;\n    if (dt <= 0.0) return;\n    int32_t left, right;\n    portENTER_CRITICAL(&encoder_mux_${i});\n    left = static_cast<int32_t>(ticks_left_${i}); right = static_cast<int32_t>(ticks_right_${i});\n    ticks_left_${i} = 0; ticks_right_${i} = 0;\n    portEXIT_CRITICAL(&encoder_mux_${i});\n    encoder_time_${i} = now;\n    msg_${i}.x = left * 2.0 * PI / (${e.ppr} * dt);\n    msg_${i}.y = right * 2.0 * PI / (${e.ppr} * dt);\n    msg_${i}.z = 0.0;`);
    f.hardware = ["leftA","leftB","rightA","rightB"].map(role => `    pinMode(${pins[role]}, ${e[role as "leftA"|"leftB"|"rightA"|"rightB"] >= 34 ? "INPUT" : "INPUT_PULLUP"});`).join("\n") + `\n    attachInterrupt(digitalPinToInterrupt(${pins.leftA}), encoder_left_isr_${i}, CHANGE);\n    attachInterrupt(digitalPinToInterrupt(${pins.rightA}), encoder_right_isr_${i}, CHANGE);\n    encoder_time_${i} = millis();`;
  }
  if (e.behavior === "differential") {
    f.includes.push("#include <geometry_msgs/msg/vector3.h>");
    f.declarations += `\nrcl_publisher_t refs_pub_${i};\ngeometry_msgs__msg__Vector3 refs_${i};\nuint32_t command_time_${i} = 0;\nbool command_active_${i} = false;`;
    f.setup = `    ok = ros.createPublisher(refs_pub_${i}, ROSIDL_GET_MSG_TYPE_SUPPORT(geometry_msgs, msg, Vector3), ${cppString(e.outputTopic)});\n    ros.require(ok, "Failed to create the reference publisher");\n` + f.setup;
    f.callbacks = `void subscription_callback_${i}(const void * input)\n{\n    if (input == nullptr) return;\n    const auto * msg = static_cast<const geometry_msgs__msg__Twist *>(input);\n    const double v = msg->linear.x, w = msg->angular.z;\n    if (!isfinite(v) || !isfinite(w)) {\n        refs_${i}.x = 0.0; refs_${i}.y = 0.0;\n    } else {\n        refs_${i}.x = constrain((v - ${e.wheelBase} * 0.5 * w) / ${e.radius}, -${e.maxSpeed}, ${e.maxSpeed});\n        refs_${i}.y = constrain((v + ${e.wheelBase} * 0.5 * w) / ${e.radius}, -${e.maxSpeed}, ${e.maxSpeed});\n    }\n    refs_${i}.z = 0.0;\n    command_time_${i} = millis(); command_active_${i} = true;\n    if (!ros.publish(refs_pub_${i}, &refs_${i})) ros.info("Failed to publish references");\n}`;
    f.loop = `    if (command_active_${i} && millis() - command_time_${i} > ${e.timeout}) {\n        refs_${i}.x = 0.0; refs_${i}.y = 0.0;\n        // Retry the zero command if publishing failed. The receiving controller needs its own watchdog.\n        command_active_${i} = !ros.publish(refs_pub_${i}, &refs_${i});\n    }`;
  }
  if (e.behavior === "motor-pwm") {
    f.declarations += `\nuint32_t motor_time_${i} = 0;\nbool motor_direction_${i} = true;`;
    f.callbacks = `void motor_stop_${i}() {\n    ledcWrite(${channel}, 0);\n    digitalWrite(${pins.in1}, LOW); digitalWrite(${pins.in2}, LOW);\n}\nvoid subscription_callback_${i}(const void * input)\n{\n    if (input == nullptr) return;\n    const auto * msg = static_cast<const std_msgs__msg__Float32 *>(input);\n    const float command = msg->data;\n    motor_time_${i} = millis();\n    if (!isfinite(command) || fabs(command) < 0.001f) { motor_stop_${i}(); return; }\n    const bool forward = command >= 0;\n    if (forward != motor_direction_${i}) { ledcWrite(${channel}, 0); delayMicroseconds(300); }\n    motor_direction_${i} = forward;\n    const bool in1 = forward != ${e.activeLow ? "true" : "false"};\n    digitalWrite(${pins.in1}, in1 ? HIGH : LOW); digitalWrite(${pins.in2}, in1 ? LOW : HIGH);\n    const float duty = constrain(fabs(command), ${e.deadband}, ${e.pwmLimit});\n    ledcWrite(${channel}, static_cast<uint32_t>(duty * 255.0f / 100.0f));\n}`;
    f.hardware = `    pinMode(${pins.in1}, OUTPUT); pinMode(${pins.in2}, OUTPUT);\n    ledcSetup(${channel}, 1000, 8); ledcAttachPin(${pins.pin}, ${channel});\n    motor_stop_${i}(); motor_time_${i} = millis();`;
    f.loop = `    if (millis() - motor_time_${i} > ${e.timeout}) motor_stop_${i}();`;
  }
  return f;
}
