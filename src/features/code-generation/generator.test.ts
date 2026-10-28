import test from "node:test";
import assert from "node:assert/strict";
import { defaultProject, validateProject, type Project } from "../program";
import { cppString, generateFiles } from "./generator";

test("generates a counter, LED and two handles using the base helper", () => {
  const { main, ini } = generateFiles({ ...defaultProject, entities: defaultProject.entities.map(e => e.kind === "publisher" ? { ...e, behavior: "counter" } : e) });
  assert.match(main, /EXECUTOR_HANDLES = 2/);
  assert.match(main, /createPublisher\(pub_0/);
  assert.match(main, /createTimer\(timer_0, 1000/);
  assert.match(main, /createSubscription\(sub_1/);
  assert.match(main, /counter_0 == INT32_MAX/);
  assert.match(main, /digitalWrite\(led1, msg->data \? HIGH : LOW\)/);
  assert.match(ini, /board_microros_transport = wifi/);
  assert.doesNotMatch(ini, /lib_deps/);
});
test("Serial has no WiFi guard that prevents callbacks", () => {
  const { main, ini } = generateFiles({ ...defaultProject, transport: "serial" });
  assert.match(main, /ros.beginSerial/);
  assert.doesNotMatch(main, /wifiConnected|beginWiFi|WIFI_PASSWORD|AGENT_IP/);
  assert.match(ini, /board_microros_transport = serial/);
});
test("active-low output starts off and inverts commands", () => {
  const project = structuredClone(defaultProject);
  const led = project.entities[1];
  if (led.kind !== "subscriber") throw new Error("Invalid fixture");
  led.activeLow = true;
  const { main } = generateFiles(project);
  assert.match(main, /digitalWrite\(led1, HIGH\)/);
  assert.match(main, /msg->data \? LOW : HIGH/);
});
test("deduplicates includes and supports Float32 and Bool constants", () => {
  const p: Project = { ...defaultProject, entities: [
    { id: "a", kind: "publisher", topic: "/a", message: "Float32", behavior: "constant", period: 250, value: 1.25 },
    { id: "b", kind: "publisher", topic: "/b", message: "Bool", behavior: "constant", period: 500, value: 1 },
    { id: "c", kind: "subscriber", topic: "/c", pin: 2, activeLow: false }
  ] };
  const { main } = generateFiles(p);
  assert.match(main, /std_msgs\/msg\/float32.h/);
  assert.equal(main.match(/#include <std_msgs\/msg\/bool.h>/g)?.length, 1);
  assert.match(main, /msg_0.data = 1.25/);
  assert.match(main, /msg_1.data = true/);
});
test("escapes quotes, newlines, slashes and UTF-8 without injecting C++", () => {
  assert.equal(cppString('a"\\\nñ'), '"a\\042\\134\\012\\303\\261"');
  const { main } = generateFiles({ ...defaultProject, password: '";\n#error injected\n//' });
  assert.doesNotMatch(main, /^#error injected/m);
  assert.match(main, /\\042;\\012#error injected/);
});
test("rejects invalid IP addresses, identifiers and topics", () => {
  for (const patch of [{ agentIp: "999.1.1.1" }, { nodeName: 'node";' }, { port: 0 }, { domain: -1 }]) {
    assert.ok(validateProject({ ...defaultProject, ...patch }).length);
    assert.throws(() => generateFiles({ ...defaultProject, ...patch }));
  }
  assert.throws(() => generateFiles({ ...defaultProject, entities: [{ ...defaultProject.entities[0], topic: "/foo;bar" }] }));
});
test("rejects duplicate topics, shared pins and incompatible values", () => {
  const led = { id: "led", kind: "subscriber" as const, topic: "/led", pin: 2, activeLow: false };
  assert.ok(validateProject({ ...defaultProject, entities: [led, { ...led, id: "other", topic: "/other" }] }).length);
  assert.ok(validateProject({ ...defaultProject, entities: [led, { ...led, id: "other", pin: 4 }] }).length);
  assert.ok(validateProject({ ...defaultProject, entities: [{ id: "a", kind: "publisher", topic: "/a", message: "Bool", behavior: "constant", period: 1000, value: 8 }] }).length);
});
test("empty program generates a node without handles", () => {
  const { main } = generateFiles({ ...defaultProject, entities: [] });
  assert.match(main, /EXECUTOR_HANDLES = 0/);
  assert.doesNotMatch(main, /createTimer|createSubscription|createPublisher/);
});

test("generates Vector3 and Twist with geometry_msgs typesupport", () => {
  const entities: Project["entities"] = [{ id: "vec", kind: "publisher", topic: "/vec", message: "Vector3", behavior: "constant", period: 100, value: 0, vector: { x: 1, y: 2, z: 3 } }, { id: "twist", kind: "publisher", topic: "/twist", message: "Twist", behavior: "constant", period: 100, value: 0, vector: { x: 0.1, y: 0, z: 0 }, angular: { x: 0, y: 0, z: 0.2 } }];
  const { main } = generateFiles({ ...defaultProject, entities });
  assert.match(main, /geometry_msgs__msg__Vector3/);
  assert.match(main, /ROSIDL_GET_MSG_TYPE_SUPPORT\(geometry_msgs, msg, Twist\)/);
  assert.match(main, /msg_0.z = 3;/);
  assert.match(main, /msg_1.linear.x = 0.1;/);
  assert.match(main, /msg_1.angular.z = 0.2;/);
  assert.doesNotMatch(main, /msg_0.data|msg_1.data/);
});

import { createRobotEntity } from "../program";
test("sensors use actual contracts and only required dependencies", () => {
  const entities = [createRobotEntity("imu-yaw", "imu"), createRobotEntity("tof-triple", "tof")];
  const { main, ini } = generateFiles({ ...defaultProject, entities });
  assert.equal((main.match(/Wire.begin\(i2c_SDA, i2c_SCL, 100000\)/g) ?? []).length, 1);
  assert.match(main, /atan2\(/);
  assert.match(main, /\{0x30, 0x32, 0x31\}/);
  assert.match(main, /RangeStatus == 0/);
  assert.match(main, /values\[3\] = \{-1.0, -1.0, -1.0\}/);
  assert.match(main, /"\/imu_yaw_rad"/);
  assert.match(ini, /Adafruit BNO055/);
  assert.match(ini, /Adafruit_VL53L0X/);
  assert.doesNotMatch(ini, /SH110X|GFX/);
});
test("validates internal, cross-device and I2C conflicts", () => {
  const motor = createRobotEntity("motor-pwm", "motor");
  const led = { id: "led", kind: "subscriber" as const, topic: "/led", pin: 13, activeLow: false };
  assert.ok(validateProject({ ...defaultProject, entities: [motor, led] }).length);
  assert.ok(validateProject({ ...defaultProject, entities: [{ ...motor, in1: motor.pin }] }).length);
  const imu = createRobotEntity("imu-yaw", "imu");
  assert.ok(validateProject({ ...defaultProject, entities: [imu, { ...led, pin: 21 }] }).length);
  assert.ok(validateProject({ ...defaultProject, entities: [imu, { ...imu, id: "imu2", topic: "/imu2" }] }).length);
});
test("kinematics registers one subscriber and publisher with one handle", () => {
  const { main } = generateFiles({ ...defaultProject, entities: [createRobotEntity("differential", "kin")] });
  assert.match(main, /EXECUTOR_HANDLES = 1/);
  assert.match(main, /msg->linear.x, w = msg->angular.z/);
  assert.match(main, /0.10144 \* 0.5 \* w\) \/ 0.0217/);
  assert.match(main, /constrain\(/);
  assert.match(main, /isfinite\(v\)/);
  assert.match(main, /refs_0.x = 0.0; refs_0.y = 0.0/);
});
test("motor starts stopped and handles its watchdog before the WiFi guard", () => {
  const { main, ini } = generateFiles({ ...defaultProject, entities: [createRobotEntity("motor-pwm", "motor")] });
  assert.ok(main.indexOf("motor_stop_0(); motor_time_0") < main.indexOf("ros.beginWiFi"));
  const loop = main.slice(main.indexOf("void loop()"));
  assert.ok(loop.indexOf("motor_stop_0") < loop.indexOf("wifiConnected"));
  assert.doesNotMatch(loop, /delay\(1000\)/);
  assert.match(main, /delayMicroseconds\(300\)/);
  assert.match(main, /!isfinite\(command\)/);
  assert.match(ini, /espressif32@6.13.0/);
});
test("encoders honor direction, real dt, PPR and critical sections", () => {
  const e = createRobotEntity("wheel-encoders", "enc");
  const { main } = generateFiles({ ...defaultProject, entities: [e] });
  assert.match(main, /portENTER_CRITICAL_ISR/);
  assert.match(main, /different \? -1 : 1/);
  assert.match(main, /different \? 1 : -1/);
  assert.match(main, /2112 \* dt/);
  assert.match(main, /ticks_left_0 = 0; ticks_right_0 = 0/);
});

import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, mkdirSync, copyFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
test("C++ syntax for every block and transport with API doubles", { skip: spawnSync("g++", ["--version"]).status !== 0 }, () => {
  const dir = mkdtempSync(join(tmpdir(), "microros-cpp-"));
  try {
    copyFileSync("tests/firmware-stubs/Arduino.h", join(dir, "Arduino.h"));
    for (const path of ["MicroROSHelper.h", "Wire.h", "Adafruit_BNO055.h", "Adafruit_VL53L0X.h", "std_msgs/msg/bool.h", "std_msgs/msg/int32.h", "std_msgs/msg/float32.h", "geometry_msgs/msg/vector3.h", "geometry_msgs/msg/twist.h", "Adafruit_MPU6050.h", "Adafruit_SSD1306.h", "Adafruit_SH110X.h", "DHT.h", "TM1637Display.h", "LiquidCrystal_PCF8574.h", "MD_MAX72xx.h", "AccelStepper.h"]) {
      const file = join(dir, path); mkdirSync(join(file, ".."), { recursive: true }); writeFileSync(file, "#pragma once\n");
    }
    const robot = ["imu-yaw", "tof-triple", "wheel-encoders", "differential", "motor-pwm"] as const;
    for (const transport of ["wifi", "serial"] as const) {
      for (const behavior of robot) {
        const { main } = generateFiles({ ...defaultProject, transport, entities: [createRobotEntity(behavior, "test")] });
        writeFileSync(join(dir, "main.cpp"), main);
        const result = spawnSync("g++", ["-std=c++17", "-fsyntax-only", "-I", dir, join(dir, "main.cpp")], { encoding: "utf8" });
        assert.equal(result.status, 0, `${behavior}/${transport}: ${result.stderr}`);
      }
      for (const type of Object.keys(devices) as DeviceType[]) {
       for(const disconnected of [false,true]) {
        const entity=createDevice(type,"test");
        if(disconnected)for(const role of devices[type].pins){if("optional" in role&&role.optional)entity.pins[role.key]=-1;}
        const { main } = generateFiles({ ...defaultProject, transport, entities: [entity] });
        writeFileSync(join(dir, "main.cpp"), main);
        const result = spawnSync("g++", ["-std=c++17", "-fsyntax-only", "-I", dir, join(dir, "main.cpp")], { encoding: "utf8" });
        assert.equal(result.status, 0, `${type}/${transport}: ${result.stderr}`);
       }
      }
    }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});


test("starter program includes a 1 Hz counter and Bool LED on GPIO2", () => {
  assert.equal(defaultProject.entities.length, 2);
  const counter = defaultProject.entities[0];
  assert.equal(counter.kind, "publisher");
  if (counter.kind !== "publisher") throw new Error("Expected publisher");
  assert.equal(counter.topic, "/counter");
  assert.equal(counter.behavior, "counter");
  assert.equal(counter.period, 1000);
  const { main } = generateFiles(defaultProject);
  assert.match(main, /counter_0 = \(counter_0 == INT32_MAX\)/);
  assert.match(main, /digitalWrite\(led1, msg->data \? HIGH : LOW\)/);
});


import { createDevice, devices, entityCounts, type DeviceType } from "../program";
import { pwmAssignments } from "./devices";
test("all catalog profiles generate correct callbacks and handles",()=>{
  assert.equal(Object.keys(devices).length,27);
  for(const type of Object.keys(devices) as DeviceType[]){
    const p={...defaultProject,entities:[createDevice(type,type)]};
    assert.deepEqual(validateProject(p),[],type);
    const {main}=generateFiles(p);assert.doesNotMatch(main,/undefined/);
    assert.match(main,/EXECUTOR_HANDLES = 1/);
    if(devices[type].direction === "publisher"){assert.match(main,/createPublisher/);assert.match(main,/createTimer/);}else{assert.match(main,/createSubscription/);assert.doesNotMatch(main,/createTimer/);}
  }
});
test("I2C final addresses and VL53L0X startup collisions",()=>{
  const vl=createDevice("vl53l0x","vl"),bno=createDevice("bno055","bno");
  assert.ok(validateProject({...defaultProject,entities:[vl,{...bno,address:0x29}]}).length);
  assert.deepEqual(validateProject({...defaultProject,entities:[vl,bno]}),[]);
  const oled=createDevice("ssd1306","oled"),sh=createDevice("sh110x","sh");
  assert.ok(validateProject({...defaultProject,entities:[oled,sh]}).some(e=>e.includes("I2C")));
  assert.deepEqual(validateProject({...defaultProject,entities:[oled,{...sh,address:0x3d,topic:"/pantalla2"}]}),[]);
  const second={...vl,id:"vl2",topic:"/distance2",address:0x30,pins:{xshut:22}};
  assert.ok(validateProject({...defaultProject,entities:[vl,second]}).length);
  const {main}=generateFiles({...defaultProject,entities:[vl,{...second,pins:{xshut:18}}]});
  const setup=main.slice(main.indexOf("void setup()"));
  assert.ok(setup.indexOf("digitalWrite(sensor_vl53l0x1_XSHUT, LOW)")<setup.indexOf("sensor_1.begin(48)"));
  assert.ok(setup.indexOf("sensor_1.begin(48)")<setup.indexOf("sensor_0.begin(41)"));
});
test("ADC1 and I2C pins, custom bus and resource conflicts",()=>{
 const pot=createDevice("potentiometer","pot");
 assert.ok(validateProject({...defaultProject,entities:[{...pot,pins:{signal:25}}]}).length);
 const imu=createDevice("mpu6050","imu");
 assert.ok(validateProject({...defaultProject,i2c:{sda:18,scl:18},entities:[imu]}).length);
 assert.ok(validateProject({...defaultProject,i2c:{sda:34,scl:22},entities:[imu]}).length);
 const {main}=generateFiles({...defaultProject,i2c:{sda:18,scl:19},entities:[imu]});assert.match(main,/Wire.begin\(i2c_SDA, i2c_SCL, 100000\)/);
 const dht=createDevice("dht11","dht");assert.ok(validateProject({...defaultProject,entities:[{...dht,period:50}]}).length);
});
test("distinct PWM channels and separate servo timers",()=>{
 const entities=[createDevice("servo","servo"),createDevice("rgb-led","rgb"),{...createDevice("l298n","driver"),pins:{pwmA:13,pwmB:14,in1:4,in2:5,in3:16,in4:17}}];
 const p={...defaultProject,entities};
 assert.deepEqual(validateProject(p),[]);
 assert.deepEqual(pwmAssignments(p),[[0],[2,3,4],[5,6]]);
 const {main}=generateFiles(p);assert.match(main,/ledcSetup\(0, 50, 16\)/);assert.match(main,/ledcSetup\(2, 1000, 8\)/);
 const loop=main.slice(main.indexOf("void loop()"));assert.ok(loop.indexOf("stop_device_2")<loop.indexOf("wifiConnected"));
});
test("middleware capacity: 10 publishers and 5 subscribers",()=>{
 const outputs=Array.from({length:6},(_,i)=>({...createDevice("ssd1306",`o${i}`),topic:`/o${i}`,address:0x3c}));
 assert.ok(validateProject({...defaultProject,entities:outputs}).some(e=>e.includes("5 subscribers")));
 assert.equal(entityCounts(defaultProject).timers,1);
});

test("GPIO conflicts identify both devices and signal roles",()=>{
 const input={...createDevice("digital-input","in"),pins:{signal:2}};
 const p={...defaultProject,entities:[...defaultProject.entities,input]};
 const error=validateProject(p).find(e=>e.includes("GPIO 2 conflict"));
 assert.ok(error?.includes("LED / digital output (/led)"));
 assert.ok(error?.includes("Generic digital input · GPIO (/digital_input)"));
 assert.throws(()=>generateFiles(p));
 const internal={...createDevice("l298n","driver"),pins:{pwmA:13,pwmB:25,in1:26,in2:26,in3:33,in4:32}};
 const internalError=validateProject({...defaultProject,entities:[internal]}).find(e=>e.includes("GPIO 26 conflict"));
 assert.ok(internalError?.includes("IN1 / AIN1"));assert.ok(internalError?.includes("IN2 / AIN2"));
});


import { projectSchema, boards, boardProfile, boardPins, type BoardId } from "../program";
import { allocateDevice } from "../device-catalog";
test("board profiles and PlatformIO IDs without duplicate Denky32",()=>{
 assert.equal(Object.keys(boards).length,6);
 assert.equal(Object.keys(boards).filter(id=>id==="denky32").length,1);
 assert.ok(!JSON.stringify(boards).includes("Yahboom"));
 const expected:Record<BoardId,string>={denky32:"denky32",esp32cam:"esp32cam","ttgo-t-camera":"esp32dev",seeed_xiao_esp32s3:"seeed_xiao_esp32s3","esp32-c3-supermini":"esp32-c3-devkitm-1",wemos_d1_mini32:"wemos_d1_mini32"};
 for(const id of Object.keys(boards) as BoardId[]){
   const entities=id==="ttgo-t-camera"?[defaultProject.entities[0],{...defaultProject.entities[1],pin:21}]:defaultProject.entities;
   const p={...defaultProject,board:id,entities};assert.deepEqual(validateProject(p),[],id);
   const files=generateFiles(p);assert.ok(files.ini.includes(`board = ${expected[id]}\n`));
   assert.deepEqual(Object.keys(files).sort(),["ini","main"]);
   for(const transport of ["wifi","serial"] as const) assert.deepEqual(validateProject({...p,transport}),[],id+transport);
 }
});
test("GPIO and ADC options follow the selected board",()=>{
 const analog=createDevice("analog-input","analog");
 assert.ok(validateProject({...defaultProject,board:"esp32-c3-supermini",entities:[analog]}).some(e=>e.includes("GPIO 34")&&e.includes("ADC1")));
 assert.deepEqual(validateProject({...defaultProject,board:"esp32-c3-supermini",entities:[{...analog,pins:{signal:0}}]}),[]);
 assert.ok(validateProject({...defaultProject,board:"esp32cam",entities:[{...analog,pins:{signal:13}}]}).some(e=>e.includes("ADC1")));
 assert.ok(validateProject({...defaultProject,board:"seeed_xiao_esp32s3",entities:[{...createDevice("led","led"),pins:{signal:25}}]}).some(e=>e.includes("GPIO 25")));
 for(const board of Object.keys(boards) as BoardId[]) {
  const p={...defaultProject,board,entities:[]};
  const analog=allocateDevice("analog-input",p,"a");
  if(boardProfile(board).adc.length)assert.ok(boardPins(board,"adc").includes(analog.pins.signal),board);
  const led=allocateDevice("led",p,"l");assert.deepEqual(validateProject({...p,entities:[led]}),[],board);
 }
});
test("C3 and XIAO use their own I2C and UART pins",()=>{
 for(const board of ["esp32-c3-supermini","seeed_xiao_esp32s3"] as const){
   const profile=boardProfile(board),imu=createDevice("mpu6050","imu");
   const p={...defaultProject,board,entities:[imu]};
   assert.deepEqual(validateProject(p),[]);
   assert.ok(generateFiles(p).main.includes(`const uint8_t i2c_SDA = ${profile.i2c.sda};`));
   if(board==="seeed_xiao_esp32s3")assert.ok(generateFiles(p).ini.includes("-DARDUINO_USB_CDC_ON_BOOT=0"));
   else assert.doesNotMatch(generateFiles(p).ini,/build_flags|build_unflags/);
   assert.ok(validateProject({...p,entities:[{...createDevice("led","led"),pins:{signal:profile.uart.tx}}]}).some(e=>e.includes("Serial TX")));
   assert.ok(validateProject({...p,i2c:{sda:21,scl:22}}).length);
   assert.ok(validateProject({...p,i2c:{sda:profile.uart.tx,scl:profile.uart.rx}}).some(e=>e.includes("reserved Serial TX/RX")));
 }
});
test("PWM respects C3 and S3 channels and resolution",()=>{
 for(const board of ["esp32-c3-supermini","seeed_xiao_esp32s3"] as const){
   const p={...defaultProject,board,entities:[{...createDevice("servo","s"),pins:{signal:3}}]};
   assert.deepEqual(validateProject(p),[]);
   const {main}=generateFiles(p);assert.match(main,/ledcSetup\(0, 50, 14\)/);assert.match(main,/16383.0/);assert.doesNotMatch(main,/65535.0/);
 }
 const outputs=Array.from({length:5},(_,i)=>({...createDevice("pwm-output",`o${i}`),topic:`/o${i}`,pins:{signal:i}}));
 assert.ok(validateProject({...defaultProject,board:"esp32-c3-supermini",entities:outputs}).some(e=>e.includes("PWM:")));
 assert.deepEqual(validateProject({...defaultProject,board:"seeed_xiao_esp32s3",entities:outputs.map((e,i)=>({...e,pins:{signal:i+1}}))}),[]);
});


test("SuperMini specifications and onboard LED I2C conflict",()=>{
 const board=boardProfile("esp32-c3-supermini");
 assert.deepEqual(board.output,[0,1,2,3,4,5,6,7,8,9,10,20,21]);
 assert.deepEqual(board.adc,[0,1,2,3,4]);
 assert.deepEqual(board.builtInLed,{pin:8,activeLow:true});
 assert.deepEqual(board.bootPins,[2,8,9]);
 const led={...createDevice("led","led"),pins:{signal:8},activeLow:true};
 const p={...defaultProject,board:"esp32-c3-supermini" as const,entities:[led]};
 assert.deepEqual(validateProject(p),[]);
 const {main,ini}=generateFiles(p);
 assert.doesNotMatch(ini,/board_build.f_cpu/);
 assert.doesNotMatch(ini,/board_upload.flash_size/);
 assert.match(main,/digitalWrite\(led1, HIGH\)/);
 assert.match(main,/msg->data \? LOW : HIGH/);
 const imu=createDevice("mpu6050","imu");
 assert.ok(validateProject({...p,entities:[led,imu]}).some(error=>error.includes("GPIO 8 conflict")));
 assert.deepEqual(validateProject({...p,i2c:{sda:6,scl:7},entities:[led,imu]}),[]);
 assert.ok(validateProject({...p,entities:[{...createDevice("analog-input","a"),pins:{signal:5}}]}).some(error=>error.includes("ADC1")));
 for(const pin of [11,12,13,18,19,22])assert.ok(validateProject({...p,entities:[{...led,pins:{signal:pin}}]}).some(error=>error.includes("unavailable")));
});


test("Denky32 exports the user-confirmed board target",()=>{
 assert.equal(boardProfile("denky32").platformio,"denky32");
 assert.equal(boardProfile("denky32").title,"ESP32 Denky32");
 assert.equal(Object.keys(boards).length,6);
 const {ini}=generateFiles(defaultProject);
 assert.match(ini,/\[env:denky32\]/);assert.match(ini,/board = denky32/);
 assert.equal(boardProfile("wemos_d1_mini32").platformio,"wemos_d1_mini32");
 assert.ok(boardProfile("wemos_d1_mini32").specifications!["USB and power"].includes("CP2104"));
});
test("TTGO does not expose camera or PSRAM pins as outputs",()=>{
 const b=boardProfile("ttgo-t-camera");
 assert.deepEqual(b.output,[21,22]);assert.deepEqual(b.input,[21,22,33,34]);assert.deepEqual(b.adc,[]);
 const bad={...defaultProject,board:"ttgo-t-camera" as const};
 assert.ok(validateProject(bad).some(e=>e.includes("GPIO 2 unavailable")));
 const pir={...createDevice("digital-input","pir"),pins:{signal:33}};
 assert.deepEqual(validateProject({...bad,entities:[pir]}),[]);
 assert.ok(validateProject({...bad,entities:[{...createDevice("led","led"),pins:{signal:33}}]}).some(e=>e.includes("unavailable")));
 const display=createDevice("ssd1306","display"),imu=createDevice("mpu6050","imu");
 assert.deepEqual(validateProject({...bad,entities:[display,imu]}),[]);
 assert.match(generateFiles({...bad,entities:[display,imu]}).main,/Wire.begin\(i2c_SDA, i2c_SCL, 100000\)/);
});
test("AI-Thinker and XIAO onboard LEDs preserve polarity",()=>{
 for(const [board,pin] of [["esp32cam",33],["seeed_xiao_esp32s3",21]] as const){
  const e={...createDevice("led","led"),pins:{signal:pin},activeLow:true};
  const p={...defaultProject,board,entities:[e]};assert.deepEqual(validateProject(p),[]);
  assert.ok(generateFiles(p).main.includes(`digitalWrite(led1, HIGH)`));
  assert.ok(generateFiles(p).main.includes(`digitalWrite(led1, msg->data ? LOW : HIGH)`));
 }
 const xiao=boardProfile("seeed_xiao_esp32s3");
 assert.ok(xiao.title.includes("OV3660"));assert.ok(xiao.specifications!["Camera OV3660"].includes("2048×1536"));
 for(const pin of [10,11,38,39,40,41,42,47,48])assert.ok(!xiao.output.includes(pin));
 assert.ok(!boardProfile("esp32cam").output.includes(16));
 assert.ok(!boardProfile("esp32cam").output.includes(17));
});


import { boardPinInformation, boardReferences } from "../board-help/catalog";
test("legacy Dev Module draft migrates without losing entities",()=>{
 assert.equal(Object.keys(boards).length,6);assert.ok(!("esp32dev" in boards));
 const parsed=projectSchema.parse({...defaultProject,board:"esp32dev",name:"Borrador previo"});
 assert.equal(parsed.board,"denky32");assert.equal(parsed.name,"Borrador previo");assert.deepEqual(parsed.entities,defaultProject.entities);
});
test("board references and pin tables match generator capabilities",()=>{
 for(const id of Object.keys(boards) as BoardId[]){
  assert.ok(boardReferences[id].image.startsWith("/boards/"));
  const rows=boardPinInformation(id);const pins=rows.flatMap(row=>row.gpio===undefined?[]:[row.gpio]);
  assert.equal(pins.length,new Set(pins).size);
  for(const pin of boardProfile(id).output)assert.ok(pins.includes(pin));
  for(const pin of boardProfile(id).adc)assert.ok(rows.find(r=>r.gpio===pin)!.features.some(f=>f.startsWith("ADC1_CH")));
  assert.ok(rows.some(r=>r.label==="GND"));
 }
 const c3=boardPinInformation("esp32-c3-supermini");
 assert.equal(c3.find(r=>r.gpio===18)!.availability,"Onboard / reserved");
 assert.ok(c3.find(r=>r.gpio===8)!.features.includes("Active-low LED"));
 const ttgo=boardPinInformation("ttgo-t-camera");assert.equal(ttgo.find(r=>r.gpio===33)!.availability,"Onboard input");
 assert.equal(ttgo.find(r=>r.gpio===16)!.availability,"Onboard / reserved");
});

import { boardTouchPins, suggestNodeName, absoluteTopic, outputPinLabel } from "../program";
import { deviceUnavailableReason } from "../device-catalog/model";
test("board-specific touch, internal temperature and LM35 ADC1",()=>{
 assert.deepEqual(boardTouchPins("esp32-c3-supermini"),[]);
 assert.deepEqual(boardTouchPins("ttgo-t-camera"),[]);
 assert.deepEqual(boardTouchPins("esp32cam"),[2,4,12,13,14,15]);
 assert.deepEqual(boardTouchPins("seeed_xiao_esp32s3"),[1,2,3,4,5,6,7,8,9]);
 for(const board of Object.keys(boards) as BoardId[]){
  assert.match(generateFiles({...defaultProject,board,entities:[createDevice("internal-temperature","t")]}).main,/temperatureRead\(\)/);
  if(boardTouchPins(board).length){const e=allocateDevice("touch",{...defaultProject,board,entities:[]},"t");assert.equal(validateProject({...defaultProject,board,entities:[e]}).length,0);assert.match(generateFiles({...defaultProject,board,entities:[e]}).main,/touchRead/);}
  else assert.ok(validateProject({...defaultProject,board,entities:[createDevice("touch","t")]}).some(x=>x.includes("Touch")));
 }
 assert.ok(deviceUnavailableReason("lm35","esp32cam"));
 const main=generateFiles({...defaultProject,entities:[createDevice("lm35","t")]}).main;
 assert.match(main,/analogReadMilliVolts\(sensor_lm35_1\) \/ 10.0f/);
});
test("names, fixed port, onboard LED and new actuators",()=>{
 assert.equal(suggestNodeName("temperature"),"temperature_node");assert.equal(suggestNodeName("sensor_node"),"sensor_node");
 assert.equal(absoluteTopic("temperature"),"/temperature");assert.equal(absoluteTopic("/temperature"),"/temperature");
 assert.ok(validateProject({...defaultProject,nodeName:"sensor"}).length);assert.ok(validateProject({...defaultProject,port:9999}).length);
 assert.match(outputPinLabel("esp32-c3-supermini",8),/led_builtin/);
 const stepper=generateFiles({...defaultProject,entities:[createDevice("stepper28byj","s")]});
 assert.match(stepper.main,/HALF4WIRE, motor_stepper1_IN1, motor_stepper1_IN3, motor_stepper1_IN2, motor_stepper1_IN4/);assert.match(stepper.main,/stepper_0.run/);assert.match(stepper.main,/spinSome\(1\)/);assert.doesNotMatch(stepper.main,/runToPosition/);
 assert.match(stepper.ini,/AccelStepper/);
 const lcd=createDevice("lcd1602","lcd"),oled=createDevice("ssd1306","oled");
 assert.ok(validateProject({...defaultProject,entities:[{...lcd,address:0x3c},oled]}).some(x=>x.includes("I2C")));
 assert.match(generateFiles({...defaultProject,entities:[lcd]}).main,/begin\(16, 2, Wire\)/);
 assert.match(generateFiles({...defaultProject,entities:[createDevice("max7219","m")]}).main,/setRow/);
 assert.match(generateFiles({...defaultProject,entities:[createDevice("passive-buzzer","b")]}).main,/ledcAttachPin\(buzzer1, 2\)/);
});

test("minimal INI with inherited settings and required exceptions",()=>{
 assert.equal(generateFiles(defaultProject).ini,"[env:denky32]\nplatform = espressif32@6.13.0\nboard = denky32\nframework = arduino\n\nmonitor_speed = 115200\n\nboard_microros_transport = wifi\nboard_microros_distro = humble\n");
 for(const board of Object.keys(boards) as BoardId[]){
  const ini=generateFiles({...defaultProject,board,entities:[]}).ini;
  assert.doesNotMatch(ini,/board_build.f_cpu|board_upload.flash_size|lib_deps|esp32-camera|upload_speed/);
 }
 assert.match(generateFiles({...defaultProject,board:"esp32cam",entities:[]}).ini,/monitor_dtr = 0\nmonitor_rts = 0/);
 assert.match(generateFiles({...defaultProject,board:"ttgo-t-camera",entities:[]}).ini,/-DBOARD_HAS_PSRAM/);
 assert.match(generateFiles({...defaultProject,board:"seeed_xiao_esp32s3",entities:[]}).ini,/build_unflags =\n    -DARDUINO_USB_CDC_ON_BOOT=1/);
 const lcd=generateFiles({...defaultProject,entities:[createDevice("lcd1602","lcd")]}).ini;
 assert.match(lcd,/lib_deps =\n    mathertel\/LiquidCrystal_PCF8574/);assert.doesNotMatch(lcd,/Adafruit|AccelStepper|MD_MAX72/);
});

test("diagnostics across all profiles and transports",()=>{
 for(const board of Object.keys(boards) as BoardId[]){
  for(const transport of ["wifi","serial"] as const){
   const main=generateFiles({...defaultProject,board,transport,entities:[]}).main;
   assert.match(main,/Configuring hardware/);assert.match(main,/Hardware configured/);assert.match(main,/Node ready/);
   if(transport==="wifi"){
    for(const value of ["NODE_NAME","ROS_DOMAIN","EXECUTOR_HANDLES","WIFI_SSID","AGENT_IP","AGENT_PORT"])assert.ok(main.includes(`Serial.println(${value})`));
    assert.doesNotMatch(main,/Serial\.(?:print|println)\(WIFI_PASSWORD\)/);
    assert.match(main,/WiFi connection lost/);assert.match(main,/WiFi connection restored/);
   }else assert.doesNotMatch(main,/Serial\.(?:print|println)|wifi_was_connected|wifiConnected/);
  }
 }
 for(const type of Object.keys(devices) as DeviceType[]){const e=createDevice(type,"d");const main=generateFiles({...defaultProject,entities:[e]}).main;assert.ok(main.includes(`Element ready: ${e.topic}`));}
});

test("C++ runtime: WiFi loss, throttled warnings, recovery and clean Serial",{skip:spawnSync("g++",["--version"]).status!==0},()=>{
 const dir=mkdtempSync(join(tmpdir(),"microros-diagnostics-"));
 try{
  copyFileSync("tests/firmware-stubs/Arduino.h",join(dir,"Arduino.h"));writeFileSync(join(dir,"MicroROSHelper.h"),"#pragma once\n");
  for(const transport of ["wifi","serial"] as const){
   const {main}=generateFiles({...defaultProject,transport,entities:[]});
   const harness=transport==="wifi"?`
#include <cassert>
#include <algorithm>
int main(){
 setup();
 auto count=[](const char* text){return std::count_if(test_info_messages.begin(),test_info_messages.end(),[text](const auto& m){return m.find(text)!=std::string::npos;});};
 assert(count("Node ready")==1);assert(test_serial_text_calls>0);
 test_info_messages.clear();test_spin_calls=0;test_max_delay_ms=0;
 loop();assert(test_spin_calls==1);
 test_wifi_connected=false;loop();assert(count("WiFi connection lost")==1);assert(test_spin_calls==1);
 test_clock_ms+=999;loop();assert(count("WiFi connection lost")==1);
 test_clock_ms+=1;loop();assert(count("WiFi connection lost")==2);
 test_wifi_connected=true;loop();assert(count("restored")==1);assert(test_spin_calls==2);
 loop();assert(count("restored")==1);
 test_clock_ms=0xffffff00U;test_wifi_connected=false;loop();const auto before=count("WiFi connection lost");
 test_clock_ms+=999;loop();assert(count("WiFi connection lost")==before);
 test_clock_ms+=1;loop();assert(count("WiFi connection lost")==before+1);
 assert(test_max_delay_ms<=10);
}
`:`
#include <cassert>
int main(){setup();test_wifi_connected=false;loop();assert(test_spin_calls==1);assert(test_serial_text_calls==0);assert(test_info_messages.empty());}
`;
   writeFileSync(join(dir,"main.cpp"),main+harness);
   const binary=join(dir,"diagnostics");
   const compiled=spawnSync("g++",["-std=c++17","-DTEST_CAPTURE_LOGS",transport==="wifi"?"-DMICRO_ROS_TRANSPORT_ARDUINO_WIFI":"-DMICRO_ROS_TRANSPORT_ARDUINO_SERIAL","-I",dir,join(dir,"main.cpp"),"-o",binary],{encoding:"utf8"});
   assert.equal(compiled.status,0,compiled.stderr);
   const result=spawnSync(binary,[],{encoding:"utf8"});assert.equal(result.status,0,`${transport}: ${result.stderr}`);
  }
 }finally{rmSync(dir,{recursive:true,force:true});}
});


test("optional pins omit hardware access and keep required pins validated", () => {
 for(const [type,role] of [["joystick","button"],["vl53l0x","xshut"],["tb6612","standby"]] as const){
  const device=createDevice(type,type); device.pins[role]=-1;
  const project={...defaultProject,entities:[device]};
  assert.deepEqual(validateProject(project),[]);
  const {main}=generateFiles(project);
  assert.doesNotMatch(main, /(?:pinMode|digitalWrite|digitalRead)\(-1/);
  assert.doesNotMatch(main,new RegExp(`const uint8_t [a-zA-Z0-9_]+_${({button:"SW",xshut:"XSHUT",standby:"STBY"})[role]} =`));
  if(type==="joystick")assert.match(main,/msg_0.z = 0.0;/);
  if(type==="tb6612"){assert.match(main,/stop_device_0/);assert.doesNotMatch(main,/STANDBY/);}
  if(type==="vl53l0x")assert.match(main,/sensor_0.begin\(41\)/);
 }
 const input=createDevice("digital-input","input"); input.pins.signal=-1;
 assert.ok(validateProject({...defaultProject,entities:[input]}).length);
 const joystick=createDevice("joystick","j"); joystick.pins.button=-1;
 const led={...createDevice("led","led"),pins:{signal:4}};
 assert.deepEqual(validateProject({...defaultProject,entities:[joystick,led]}),[]);
 joystick.pins.button=4;
 assert.ok(validateProject({...defaultProject,entities:[joystick,led]}).some(e=>e.includes("GPIO 4 conflict")));
});

test("VL53L0X without XSHUT requires one sensor at the default address",()=>{
 const sensor=createDevice("vl53l0x","distance");sensor.pins.xshut=-1;
 assert.ok(validateProject({...defaultProject,entities:[{...sensor,address:0x30}]}).some(e=>e.includes("without XSHUT")));
 const other={...sensor,id:"second",topic:"/distance2",address:0x30,pins:{xshut:18}};
 assert.ok(validateProject({...defaultProject,entities:[sensor,other]}).some(e=>e.includes("without XSHUT")));
 assert.throws(()=>generateFiles({...defaultProject,entities:[sensor,other]}));
});

test("every generated hardware GPIO uses a unique named constant",()=>{
 for(const type of Object.keys(devices) as DeviceType[]){
  const {main}=generateFiles({...defaultProject,entities:[createDevice(type,type)]});
  assert.doesNotMatch(main, /(?:pinMode|digitalWrite|digitalRead|analogRead|analogReadMilliVolts|analogSetPinAttenuation|touchRead|ledcAttachPin|digitalPinToInterrupt|pulseIn|Wire.begin)\(\d+/);
  const names=[...main.matchAll(/const uint8_t ([a-zA-Z][a-zA-Z0-9_]*) =/g)].map(m=>m[1]);
  assert.equal(new Set(names).size,names.length);
 }
 const one={...createDevice("led","one"),topic:"/led/a",pins:{signal:2}};
 const two={...createDevice("led","two"),topic:"/led_a",pins:{signal:4}};
 const {main}=generateFiles({...defaultProject,entities:[one,two]});
 assert.match(main,/const uint8_t led1 = 2/);
 assert.match(main,/const uint8_t led2 = 4/);
});

import { translateText } from "../language/messages";
test("language translation preserves identifiers and original English",()=>{
 assert.equal(translateText("Build your micro-ROS node","es"),"Construye tu nodo micro-ROS");
 assert.equal(translateText("Step 3 of 5","es"),"Paso 3 de 5");
 assert.equal(translateText("of ","es"),"de ");
 assert.equal(translateText("Duplicate topic: /digital_output.","es"),"Tópico duplicado: /digital_output.");
 assert.equal(translateText("Properties · Analog joystick","es"),"Propiedades · Joystick analógico");
 assert.equal(translateText("Not connected","en"),"Not connected");
 assert.equal(translateText("/digital_output","es"),"/digital_output");
});


test("hardware constants use device identity and instance counts instead of topics",()=>{
 const driver={...createDevice("tb6612","driver"),topic:"/motors_1",pins:{...createDevice("tb6612","driver").pins,in4:16}};
 const first={...defaultProject,entities:[defaultProject.entities[0],driver]};
 const a=generateFiles(first).main;
 assert.match(a,/const uint8_t driver_tb1_IN4 = 16;/);
 assert.match(a,/pinMode\(driver_tb1_IN4, OUTPUT\)/);
 assert.match(a,/digitalWrite\(driver_tb1_STBY,/);
 assert.doesNotMatch(a,/PIN_MOTORS|MOTORS_1|driver_tb2/);
 const second={...driver,id:"driver2",topic:"/motors_2",pins:{pwmA:4,in1:5,in2:12,pwmB:14,in3:15,in4:17,standby:18}};
 const pair=generateFiles({...defaultProject,entities:[driver,second]}).main;
 assert.match(pair,/const uint8_t driver_tb1_IN4 = 16;/);
 assert.match(pair,/const uint8_t driver_tb2_IN4 = 17;/);
 assert.match(pair,/digitalWrite\(driver_tb2_STBY,/);
 const b=generateFiles({...first,entities:[{...createDevice("led","extra"),pins:{signal:2}},first.entities[0],{...driver,topic:"/renamed_driver"}]}).main;
 assert.match(b,/const uint8_t driver_tb1_IN4 = 16;/);
 assert.match(b,/const uint8_t led1 = 2;/);
 const joystick=createDevice("joystick","j");
 const j=generateFiles({...defaultProject,entities:[joystick]}).main;
 assert.match(j,/const uint8_t joystick1_X = 34;/);
 assert.match(j,/const uint8_t joystick1_Y = 35;/);
 assert.match(j,/const uint8_t joystick1_SW = 4;/);
});

test("shared naming families never duplicate constants in mixed LED programs",()=>{
 const starter=defaultProject.entities[1];
 const extra={...createDevice("led","extra"),topic:"/extra_led",pins:{signal:4}};
 const {main}=generateFiles({...defaultProject,entities:[starter,extra]});
 assert.match(main,/const uint8_t led1 = 2;/);
 assert.match(main,/const uint8_t led2 = 4;/);
 assert.match(main,/digitalWrite\(led2, msg->data/);
});

test("catalog labels identify sensing technology and motor drivers in both languages",()=>{
 assert.match(devices.vl53l0x.title,/Infrared ToF/);
 assert.match(devices.hcsr04.title,/Ultrasonic/);
 assert.match(devices.mpu6050.title,/6-axis inertial/);
 assert.match(devices.bno055.title,/9-axis orientation/);
 for(const device of [devices.l298n,devices.tb6612]){
  assert.match(device.title,/motor driver/);
  assert.match(translateText(device.title,"es"),/Driver de motores/);
 }
 assert.equal(translateText(devices.vl53l0x.title,"es"),"Sensor de distancia infrarrojo ToF · VL53L0Xv2");
 assert.equal(translateText(devices.joystick.title,"es"),"Joystick analógico de 2 ejes");
});


import { removeRetiredDevices } from "../project/migrations";
test("passive buzzer replaces active hardware with Int32 frequency commands",()=>{
 assert.ok(!("active-buzzer" in devices));
 const buzzer=createDevice("passive-buzzer","buzzer");
 assert.equal(buzzer.topic,"/buzzer_frequency");
 assert.equal(devices[buzzer.device].message,"Int32");
 assert.equal(translateText(devices[buzzer.device].title,"es"),"Buzzer pasivo · Tonos por frecuencia");
 const {main}=generateFiles({...defaultProject,entities:[buzzer]});
 assert.match(main,/std_msgs__msg__Int32/);
 assert.match(main,/const uint8_t buzzer1 = 4;/);
 assert.match(main,/ledcSetup\(2, 1000, 10\)/);
 assert.match(main,/ledcAttachPin\(buzzer1, 2\)/);
 assert.match(main,/ledcWrite\(2, 0\)/);
 assert.match(main,/frequency < 100 \|\| frequency > 10000/);
 assert.match(main,/ledcWriteTone\(2, static_cast<uint32_t>\(frequency\)\)/);
 assert.doesNotMatch(main,/digitalWrite\(buzzer1/);
});

test("passive buzzer owns an independent timer pair on every board",()=>{
 const tone1=createDevice("passive-buzzer","b1"),tone2={...tone1,id:"b2",topic:"/tone2"};
 const mixed={...defaultProject,entities:[createDevice("servo","s"),tone1,createDevice("pwm-output","p"),tone2]};
 assert.deepEqual(pwmAssignments(mixed),[[0],[2],[6],[4]]);
 for(const board of Object.keys(boards) as BoardId[]){
  const entities=Array.from({length:3},(_,i)=>({...tone1,id:`tone${i}`,topic:`/tone${i}`,pins:{signal:boardProfile(board).output[i]}}));
  const p={...defaultProject,board,entities};
  assert.equal(validateProject(p).some(e=>e.includes("independent tone timer")),boardProfile(board).pwmChannels-2<6,board);
  const channels=pwmAssignments(p).flat();
  assert.equal(new Set(channels.map(channel=>Math.floor(channel/2))).size,channels.length);
 }
});

test("retiring the active buzzer preserves the rest of the saved draft",()=>{
 const previous=[...defaultProject.entities,{...createDevice("passive-buzzer","old"),device:"active-buzzer",topic:"/buzzer"}];
 const migrated=removeRetiredDevices(previous);
 assert.equal(migrated.removedActiveBuzzer,true);
 assert.deepEqual(migrated.entities,defaultProject.entities);
 assert.equal(previous.length,3);
 assert.deepEqual(removeRetiredDevices(defaultProject.entities),{entities:defaultProject.entities,removedActiveBuzzer:false});
 assert.deepEqual(removeRetiredDevices(null),{entities:null,removedActiveBuzzer:false});
});

test("C++ runtime: passive buzzer frequency, silence, invalid commands and PWM failure",{skip:spawnSync("g++",["--version"]).status!==0},()=>{
 const dir=mkdtempSync(join(tmpdir(),"microros-passive-buzzer-"));
 try{
  copyFileSync("tests/firmware-stubs/Arduino.h",join(dir,"Arduino.h"));
  for(const path of ["MicroROSHelper.h","std_msgs/msg/int32.h"]){const file=join(dir,path);mkdirSync(join(file,".."),{recursive:true});writeFileSync(file,"#pragma once\n");}
  const main=generateFiles({...defaultProject,entities:[createDevice("passive-buzzer","b")]}).main;
  const harness=`
#include <cassert>
int main(){
 setup();assert(test_pwm_duty[2]==0);
 std_msgs__msg__Int32 command;
 for(const int hz : {100,440,1000,10000}){command.data=hz;subscription_callback_0(&command);assert(test_tone_frequency[2]==static_cast<uint32_t>(hz));assert(test_pwm_duty[2]>0);}
 command.data=0;subscription_callback_0(&command);assert(test_pwm_duty[2]==0);
 for(const int hz : {-1,99,10001,INT32_MAX}){command.data=440;subscription_callback_0(&command);command.data=hz;subscription_callback_0(&command);assert(test_pwm_duty[2]==0);}
 test_tone_failure=true;command.data=440;subscription_callback_0(&command);assert(test_pwm_duty[2]==0);
 subscription_callback_0(nullptr);assert(test_pwm_duty[2]==0);
}
`;
  writeFileSync(join(dir,"main.cpp"),main+harness);
  const binary=join(dir,"buzzer");
  const compiled=spawnSync("g++",["-std=c++17","-DTEST_CAPTURE_LOGS","-DMICRO_ROS_TRANSPORT_ARDUINO_WIFI","-I",dir,join(dir,"main.cpp"),"-o",binary],{encoding:"utf8"});
  assert.equal(compiled.status,0,compiled.stderr);
  const result=spawnSync(binary,[],{encoding:"utf8"});assert.equal(result.status,0,result.stderr);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
