import { projectSchema, boardProfile, devices, type DeviceDefinition, type Project } from "../program";

import { cppString } from "./strings";
export { cppString } from "./strings";
import { deviceFragment, pwmAssignments } from "./devices";
import { startupDiagnostics, wifiMonitorDeclarations, wifiMonitorLoop } from "./diagnostics";
import { robotFragment } from "./robot";
function header(message: string) { return message === "Float32" ? "float32" : message.toLowerCase(); }
export function generateFiles(input: Project) {
  const p = projectSchema.parse(input);
  const board=boardProfile(p.board);
  const assignments = pwmAssignments(p);
  const robots = p.entities.map((e, i) => e.kind === "device" ? deviceFragment(e, i, assignments[i], board) : e.kind === "robot" ? robotFragment(e, i, assignments[i][0]) : null);
  const includes = [...new Set(p.entities.filter(e => e.kind !== "robot" && e.kind !== "device").map(e => e.kind === "publisher" ? e.message : "Bool"))].sort().map(m => `#include <${["Vector3", "Twist"].includes(m) ? "geometry_msgs" : "std_msgs"}/msg/${header(m)}.h>`).join("\n");
  const declarations = p.entities.map((e, i) => (e.kind === "robot" || e.kind === "device") ? robots[i]!.declarations : e.kind === "publisher"
    ? `${["Vector3", "Twist"].includes(e.message) ? "geometry_msgs" : "std_msgs"}__msg__${e.message} msg_${i};\nrcl_publisher_t pub_${i};\nrcl_timer_t timer_${i};${e.behavior === "counter" ? `\nint32_t counter_${i} = ${e.value};` : ""}`
    : `std_msgs__msg__Bool msg_${i};\nrcl_subscription_t sub_${i};`).join("\n\n");
  const callbacks = p.entities.map((e, i) => (e.kind === "robot" || e.kind === "device") ? robots[i]!.callbacks : e.kind === "publisher" ? `void timer_callback_${i}(rcl_timer_t * timer, int64_t last_call_time)\n{\n    (void) last_call_time;\n    if (timer == nullptr) return;\n${e.behavior === "counter" ? `    counter_${i} = (counter_${i} == INT32_MAX) ? 0 : counter_${i} + 1;\n    msg_${i}.data = counter_${i};` : ["Vector3", "Twist"].includes(e.message) ? ["x", "y", "z"].map(axis => `    msg_${i}.${e.message === "Twist" ? "linear." : ""}${axis} = ${(e.vector ?? {x:0,y:0,z:0})[axis as "x" | "y" | "z"]};`).concat(e.message === "Twist" ? ["x", "y", "z"].map(axis => `    msg_${i}.angular.${axis} = ${(e.angular ?? {x:0,y:0,z:0})[axis as "x" | "y" | "z"]};`) : []).join("\n") : `    msg_${i}.data = ${e.message === "Bool" ? (e.value ? "true" : "false") : e.value};`}\n    if (!ros.publish(pub_${i}, &msg_${i})) {\n        ros.info(${cppString(`Failed to publish ${e.topic}`)});\n    }\n}` : `void subscription_callback_${i}(const void * input)\n{\n    if (input == nullptr) return;\n    const auto * msg = static_cast<const std_msgs__msg__Bool *>(input);\n    digitalWrite(${e.pin}, msg->data ? ${e.activeLow ? "LOW : HIGH" : "HIGH : LOW"});\n}`).join("\n\n");
  const gpio = p.entities.filter(e => e.kind === "subscriber").map(e => `    pinMode(${e.pin}, OUTPUT);\n    digitalWrite(${e.pin}, ${e.activeLow ? "HIGH" : "LOW"});`).join("\n");
  const setup = p.entities.map((e, i) => (e.kind === "robot" || e.kind === "device") ? robots[i]!.setup : e.kind === "publisher" ? `    ok = ros.createPublisher(pub_${i},\n        ROSIDL_GET_MSG_TYPE_SUPPORT(${["Vector3", "Twist"].includes(e.message) ? "geometry_msgs" : "std_msgs"}, msg, ${e.message}), ${cppString(e.topic)});\n    ros.require(ok, ${cppString(`Failed to create publisher ${e.topic}`)});\n    ok = ros.createTimer(timer_${i}, ${e.period}, timer_callback_${i});\n    ros.require(ok, ${cppString(`Failed to create timer ${e.topic}`)});` : `    ok = ros.createSubscription(sub_${i},\n        ROSIDL_GET_MSG_TYPE_SUPPORT(std_msgs, msg, Bool), ${cppString(e.topic)},\n        &msg_${i}, subscription_callback_${i});\n    ros.require(ok, ${cppString(`Failed to create subscriber ${e.topic}`)});`).map((code,i)=>`${code}\n    ros.info(${cppString(`Element ready: ${p.entities[i].topic}`)});`).join("\n\n");
  const robotIncludes = [...new Set(robots.flatMap(r => r?.includes ?? []))].filter(h => !includes.includes(h)).join("\n");
  const i2c = p.entities.some(e => (e.kind === "robot" && ["imu-yaw", "tof-triple"].includes(e.behavior)) || (e.kind === "device" && !!(devices[e.device] as DeviceDefinition).addresses));
  const order = (e: Project["entities"][number]) => e.kind === "device" && ["l298n", "tb6612"].includes(e.device) || e.kind === "robot" && e.behavior === "motor-pwm" ? 0 : e.kind === "device" && e.device === "vl53l0x" ? e.address === 0x29 ? 3 : 2 : 1;
  const robotHardware = p.entities.map((e,i)=>({e,f:robots[i]})).sort((a,b)=>order(a.e)-order(b.e)).map(r=>r.f?.hardware??"").join("\n");
  const vlReset = p.entities.flatMap(e=>e.kind === "device" && e.device === "vl53l0x" ? [`    pinMode(${e.pins.xshut}, OUTPUT); digitalWrite(${e.pins.xshut}, LOW);`] : []).join("\n");
  const bus = p.i2c ?? board.i2c;
  const robotLoop = robots.map(r => r?.loop ?? "").join("\n");
  const deps = [...new Set(robots.flatMap(r => r?.dependencies ?? []))];
  const wifi = p.transport === "wifi";
  const stepper=p.entities.some(e=>e.kind==="device"&&e.device==="stepper28byj");
  const main = `// Generated by microROS Studio. Requires the base firmware repository.\n// Flow: hardware -> transport/node -> entities -> timers -> executor.\n#include <Arduino.h>\n#include <stdint.h>\n#include "MicroROSHelper.h"\n${includes}\n${robotIncludes}\n\nconst size_t ROS_DOMAIN = ${p.domain};\nconst size_t EXECUTOR_HANDLES = ${p.entities.length};\nconst char NODE_NAME[] = ${cppString(p.nodeName)};\n${wifi ? `char WIFI_SSID[] = ${cppString(p.ssid)};\nchar WIFI_PASSWORD[] = ${cppString(p.password)};\nIPAddress AGENT_IP(${p.agentIp.split(".").map(Number).join(", ")});\nconst uint16_t AGENT_PORT = ${p.port};\n` : ""}\nMicroROSHelper ros;\n${wifi ? wifiMonitorDeclarations + "\n" : "// With Serial transport, ros.info() stays silent to protect the Agent protocol.\n"}${declarations}\n\n${callbacks}\n\nvoid setup()\n{\n${wifi ? "    Serial.begin(115200);" : ""}\n${startupDiagnostics(p)}\n${gpio}\n${i2c ? `    Wire.begin(${bus.sda}, ${bus.scl}, 100000);` : ""}\n${vlReset}\n${vlReset ? "    delay(200);" : ""}\n${robotHardware}\n    ros.info("Hardware configured.");\n    ros.info(${cppString(wifi ? "Connecting to WiFi and the micro-ROS Agent..." : "Initializing Serial transport and micro-ROS Agent...")});\n    // In WiFi mode the helper reports local IP, gateway, RSSI and transport status.\n    bool ok = ${wifi ? "ros.beginWiFi(NODE_NAME, EXECUTOR_HANDLES, ROS_DOMAIN,\n        WIFI_SSID, WIFI_PASSWORD, AGENT_IP, AGENT_PORT)" : "ros.beginSerial(NODE_NAME, EXECUTOR_HANDLES, ROS_DOMAIN, Serial, 115200)"};\n    ros.require(ok, "Failed to initialize micro-ROS: check transport, Agent and ROS_DOMAIN_ID");\n    ros.info("Transport, node and executor initialized.");\n\n${setup}\n    ros.info("Node ready");\n}\n\nvoid loop()\n{\n${robotLoop}\n${wifi ? wifiMonitorLoop : ""}    if (!ros.spinSome(${stepper?1:10})) {\n        ros.info("Failed to execute callbacks");\n    }\n    ${stepper?"delayMicroseconds(200);":"delay(10);"}\n}\n`;
  const sections = [
    `[env:${p.board}]\nplatform = espressif32@6.13.0\nboard = ${board.platformio}\nframework = arduino`,
    `monitor_speed = 115200${p.board === "esp32cam" ? "\nmonitor_dtr = 0\nmonitor_rts = 0" : ""}`,
    `board_microros_transport = ${p.transport}\nboard_microros_distro = humble`,
    ...(board.unflags?.length ? ["build_unflags =\n" + board.unflags.map(f=>"    "+f).join("\n")] : []),
    ...(board.flags?.length ? ["build_flags =\n" + board.flags.map(f=>"    "+f).join("\n")] : []),
    ...(deps.length ? ["lib_deps =\n" + deps.map(d=>"    "+d).join("\n")] : [])
  ];
  const ini = sections.join("\n\n") + "\n";
  return { main, ini };
}
