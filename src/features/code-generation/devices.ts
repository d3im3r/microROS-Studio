import { boardProfile, type BoardProfile, devices, type DeviceEntity, type Project, type DeviceDefinition } from "../program";
import { cppString } from "./strings";
import type { Fragment } from "./robot";
export function pwmAssignments(p: Project): number[][] {
  let servo = 0, pwm = 2;
  return p.entities.map(e=> e.kind === "robot"&&e.behavior === "motor-pwm" ? [pwm++] : e.kind !== "device" ? [] : devices[e.device].pins.filter(r=>r.mode === "pwm").map(()=>e.device === "servo" ? servo++ : pwm++));
}
export function deviceFragment(e: DeviceEntity, i: number, channels: number[], board: BoardProfile = boardProfile("denky32")): Fragment {
 const d: DeviceDefinition=devices[e.device], p=e.pins, pub=d.direction==="publisher", pkg=["Vector3","Twist"].includes(d.message)?"geometry_msgs":"std_msgs";
 const f:Fragment={includes:[`#include <${pkg}/msg/${d.message.toLowerCase()}.h>`,"#include <math.h>"],dependencies:[],declarations:`${pkg}__msg__${d.message} msg_${i};\n${pub?`rcl_publisher_t pub_${i};\nrcl_timer_t timer_${i};`:`rcl_subscription_t sub_${i};`}`,hardware:"",callbacks:"",loop:"",setup:pub?`    ok = ros.createPublisher(pub_${i}, ROSIDL_GET_MSG_TYPE_SUPPORT(${pkg}, msg, ${d.message}), ${cppString(e.topic)});\n    ros.require(ok, ${cppString(`Failed to create publisher ${e.topic}`)});\n    ok = ros.createTimer(timer_${i}, ${e.period}, timer_callback_${i});\n    ros.require(ok, ${cppString(`Failed to create timer ${e.topic}`)});`:`    ok = ros.createSubscription(sub_${i}, ROSIDL_GET_MSG_TYPE_SUPPORT(${pkg}, msg, ${d.message}), ${cppString(e.topic)}, &msg_${i}, subscription_callback_${i});\n    ros.require(ok, ${cppString(`Failed to create subscriber ${e.topic}`)});`};
 const timer=(body:string)=>`void timer_callback_${i}(rcl_timer_t * timer, int64_t last_call_time) {\n    (void) last_call_time;\n    if (!timer) return;\n${body}\n    if (!ros.publish(pub_${i}, &msg_${i})) ros.info(${cppString(`Failed to publish ${e.topic}`)});\n}`;
 const callback=(body:string)=>`void subscription_callback_${i}(const void * input) {\n    if (!input) return;\n    const auto * msg = static_cast<const ${pkg}__msg__${d.message} *>(input);\n${body}\n}`;
 const polarity=e.activeLow?"LOW : HIGH":"HIGH : LOW";
 const setupPwm=(frequency=1000,bits=8)=>d.pins.filter(r=>r.mode==="pwm").map((r,k)=>`    ros.require(ledcSetup(${channels[k]}, ${frequency}, ${bits}) > 0, "Failed to configure PWM");\n    ledcAttachPin(${p[r.key]}, ${channels[k]});\n    ledcWrite(${channels[k]}, 0);`).join("\n");
 if(d.addresses)f.includes.push("#include <Wire.h>");
 if(["potentiometer","analog-input"].includes(e.device)) {
  f.hardware=`    pinMode(${p.signal}, INPUT);\n    analogReadResolution(12);`;
  f.callbacks=timer(`    msg_${i}.data = analogRead(${p.signal});`);
 }
 if(e.device==="digital-input"){
  f.hardware=`    pinMode(${p.signal}, ${board.family==="esp32"&&p.signal>=34?"INPUT":"INPUT_PULLUP"});`;
  f.callbacks=timer(`    msg_${i}.data = digitalRead(${p.signal}) ${e.activeLow?"== LOW":"== HIGH"};`);
 }
 if(e.device==="joystick"){
  f.hardware=`    analogReadResolution(12);\n    pinMode(${p.x}, INPUT); pinMode(${p.y}, INPUT);\n    pinMode(${p.button}, ${board.family==="esp32"&&p.button>=34?"INPUT":"INPUT_PULLUP"});`;
  f.callbacks=timer(`    msg_${i}.x = analogRead(${p.x}); msg_${i}.y = analogRead(${p.y});\n    msg_${i}.z = digitalRead(${p.button}) == LOW ? 1.0 : 0.0;`);
 }
 if(e.device==="hcsr04"){
  f.hardware=`    pinMode(${p.trigger}, OUTPUT); digitalWrite(${p.trigger}, LOW);\n    pinMode(${p.echo}, INPUT);`;
  f.callbacks=timer(`    digitalWrite(${p.trigger}, LOW); delayMicroseconds(2);\n    digitalWrite(${p.trigger}, HIGH); delayMicroseconds(10); digitalWrite(${p.trigger}, LOW);\n    const unsigned long duration = pulseIn(${p.echo}, HIGH, 25000UL);\n    msg_${i}.data = duration ? duration * 0.0001715f : -1.0f;`);
 }
 if(e.device==="vl53l0x"){
  f.includes.push("#include <Adafruit_VL53L0X.h>");f.dependencies.push("adafruit/Adafruit_VL53L0X");
  f.declarations+=`\nAdafruit_VL53L0X sensor_${i};`;
  // All XSHUT pins are first held LOW by the project generator.
  f.hardware=`    digitalWrite(${p.xshut}, HIGH); delay(100);\n    ros.require(sensor_${i}.begin(${e.address}), "VL53L0X not found; check XSHUT/address");`;
  f.callbacks=timer(`    VL53L0X_RangingMeasurementData_t reading;\n    sensor_${i}.rangingTest(&reading, false);\n    msg_${i}.data = reading.RangeStatus == 0 ? reading.RangeMilliMeter / 1000.0f : -1.0f;`);
 }
 if(e.device==="bno055"){
  f.includes.push("#include <Adafruit_BNO055.h>");f.dependencies.push("adafruit/Adafruit BNO055");
  f.declarations+=`\nAdafruit_BNO055 sensor_${i}(55, ${e.address}, &Wire);`;
  f.hardware=`    ros.require(sensor_${i}.begin(), "BNO055 not found");\n    delay(1000); sensor_${i}.setExtCrystalUse(true);`;
  f.callbacks=timer(`    const auto q = sensor_${i}.getQuat();\n    msg_${i}.data = atan2(2.0*(q.w()*q.z()+q.x()*q.y()), 1.0-2.0*(q.y()*q.y()+q.z()*q.z()));`);
 }
 if(e.device==="mpu6050"){
  f.includes.push("#include <Adafruit_MPU6050.h>");f.dependencies.push("adafruit/Adafruit MPU6050");
  f.declarations+=`\nAdafruit_MPU6050 sensor_${i};`;
  f.hardware=`    ros.require(sensor_${i}.begin(${e.address}, &Wire), "MPU6050 not found");\n    sensor_${i}.setAccelerometerRange(MPU6050_RANGE_8_G);\n    sensor_${i}.setFilterBandwidth(MPU6050_BAND_21_HZ);`;
  f.callbacks=timer(`    sensors_event_t accel, gyro, temperature;\n    sensor_${i}.getEvent(&accel, &gyro, &temperature);\n    msg_${i}.x = accel.acceleration.x; msg_${i}.y = accel.acceleration.y; msg_${i}.z = accel.acceleration.z;`);
 }
 if(e.device==="dht11"){
  f.includes.push("#include <DHT.h>");f.dependencies.push("adafruit/DHT sensor library");
  f.declarations+=`\nDHT sensor_${i}(${p.signal}, DHT11);`;
  f.hardware=`    sensor_${i}.begin();`;
  f.callbacks=timer(`    const float temperature = sensor_${i}.readTemperature();\n    const float humidity = sensor_${i}.readHumidity();\n    const bool valid = isfinite(temperature) && isfinite(humidity);\n    msg_${i}.x = valid ? temperature : NAN; msg_${i}.y = valid ? humidity : NAN;\n    msg_${i}.z = valid ? 1.0 : 0.0;`);
 }
 if(e.device==="encoder"){
  f.declarations+=`\nvolatile uint32_t ticks_${i} = 0;\nportMUX_TYPE mux_${i} = portMUX_INITIALIZER_UNLOCKED;`;
  f.callbacks=`void IRAM_ATTR encoder_isr_${i}() {\n    const bool different = digitalRead(${p.a}) != digitalRead(${p.b});\n    portENTER_CRITICAL_ISR(&mux_${i});\n    ticks_${i} += different ? ${e.activeLow?"-1 : 1":"1 : -1"};\n    portEXIT_CRITICAL_ISR(&mux_${i});\n}\n`+timer(`    portENTER_CRITICAL(&mux_${i});\n    msg_${i}.data = static_cast<int32_t>(ticks_${i});\n    portEXIT_CRITICAL(&mux_${i});`);
  f.hardware=`    pinMode(${p.a}, ${board.family==="esp32"&&p.a>=34?"INPUT":"INPUT_PULLUP"}); pinMode(${p.b}, ${board.family==="esp32"&&p.b>=34?"INPUT":"INPUT_PULLUP"});\n    attachInterrupt(digitalPinToInterrupt(${p.a}), encoder_isr_${i}, CHANGE);`;
 }
 if(["led","digital-output","active-buzzer"].includes(e.device)){
  f.hardware=`    pinMode(${p.signal}, OUTPUT); digitalWrite(${p.signal}, ${e.activeLow?"HIGH":"LOW"});`;
  f.callbacks=callback(`    digitalWrite(${p.signal}, msg->data ? ${polarity});`);
 }
 if(e.device==="servo"){
  const bits=board.servoBits, scale=2**bits-1;
  f.hardware=setupPwm(50,bits)+`\n    ledcWrite(${channels[0]}, static_cast<uint32_t>(1450.0 * ${scale}.0 / 20000.0));`;
  f.callbacks=callback(`    const int angle = constrain(msg->data, 0, 180);\n    const double pulse_us = 500.0 + angle * (1900.0 / 180.0);\n    ledcWrite(${channels[0]}, static_cast<uint32_t>(pulse_us * ${scale}.0 / 20000.0));`);
 }
 if(e.device==="pwm-output"){
  f.hardware=setupPwm();
  f.callbacks=callback(`    const int duty = constrain(msg->data, 0, 255);\n    ledcWrite(${channels[0]}, ${e.activeLow?"255 - duty":"duty"});`);
  if(e.activeLow)f.hardware+=`\n    ledcWrite(${channels[0]}, 255);`;
 }
 if(e.device==="rgb-led"){
  f.hardware=setupPwm();
  if(e.activeLow)f.hardware+="\n"+channels.map(c=>`    ledcWrite(${c}, 255);`).join("\n");
  f.callbacks=callback(["x","y","z"].map((axis,k)=>`    const double value_${k} = isfinite(msg->${axis}) ? constrain(msg->${axis}, 0.0, 255.0) : 0.0;\n    ledcWrite(${channels[k]}, static_cast<uint32_t>(${e.activeLow?`255.0 - value_${k}`:`value_${k}`}));`).join("\n"));
 }
 if(e.device==="ssd1306"||e.device==="sh110x"){
  const ssd=e.device==="ssd1306";f.includes.push(ssd?"#include <Adafruit_SSD1306.h>":"#include <Adafruit_SH110X.h>");
  f.dependencies.push("adafruit/Adafruit GFX Library",ssd?"adafruit/Adafruit SSD1306":"adafruit/Adafruit SH110X@^2.1.14");
  f.declarations+=`\n${ssd?"Adafruit_SSD1306":"Adafruit_SH1106G"} screen_${i}(128, 64, &Wire, -1);`;
  f.hardware=`    ros.require(screen_${i}.begin(${ssd?`SSD1306_SWITCHCAPVCC, ${e.address}, true, false`:`${e.address}, true`}), "OLED not found");\n    screen_${i}.clearDisplay(); screen_${i}.setTextSize(1); screen_${i}.setTextColor(${ssd?"SSD1306_WHITE":"SH110X_WHITE"});\n    screen_${i}.display();`;
  f.callbacks=callback(`    screen_${i}.clearDisplay(); screen_${i}.setCursor(0, 0);\n    screen_${i}.print(msg->data); screen_${i}.display();`);
 }
 if(e.device==="tm1637"){
  f.includes.push("#include <TM1637Display.h>");f.dependencies.push("avishorp/TM1637");
  f.declarations+=`\nTM1637Display screen_${i}(${p.clk}, ${p.dio});`;
  f.hardware=`    screen_${i}.setBrightness(3); screen_${i}.showNumberDec(0);`;
  f.callbacks=callback(`    screen_${i}.showNumberDec(constrain(msg->data, -999, 9999));`);
 }
 if(e.device==="l298n"||e.device==="tb6612"){
  const tb=e.device==="tb6612";
  f.declarations+=`\nuint32_t motor_time_${i} = 0;\nbool motor_forward_${i}[2] = {true,true};`;
  const stop=`void stop_device_${i}() {\n    ledcWrite(${channels[0]}, 0); ledcWrite(${channels[1]}, 0);\n    digitalWrite(${p.in1}, LOW); digitalWrite(${p.in2}, LOW); digitalWrite(${p.in3}, LOW); digitalWrite(${p.in4}, LOW);\n${tb?`    digitalWrite(${p.standby}, LOW);`:""}\n}`;
  f.callbacks=stop+`\nvoid drive_device_${i}(double command, int in1, int in2, int channel, int side) {\n    const bool forward = command >= 0.0;\n    if (forward != motor_forward_${i}[side]) { ledcWrite(channel, 0); delayMicroseconds(300); }\n    motor_forward_${i}[side] = forward;\n    digitalWrite(in1, command == 0.0 ? LOW : (forward ? HIGH : LOW));\n    digitalWrite(in2, command == 0.0 ? LOW : (forward ? LOW : HIGH));\n    ledcWrite(channel, static_cast<uint32_t>(fabs(command) * 255.0 / 100.0));\n}\n`+callback(`    motor_time_${i} = millis();\n    if (!isfinite(msg->x) || !isfinite(msg->y)) { stop_device_${i}(); return; }\n    const double a = constrain(msg->x, -100.0, 100.0), b = constrain(msg->y, -100.0, 100.0);\n${tb?`    digitalWrite(${p.standby}, (a == 0.0 && b == 0.0) ? LOW : HIGH);`:""}\n    drive_device_${i}(a, ${p.in1}, ${p.in2}, ${channels[0]}, 0);\n    drive_device_${i}(b, ${p.in3}, ${p.in4}, ${channels[1]}, 1);`);
  f.hardware=[p.in1,p.in2,p.in3,p.in4,...(tb?[p.standby]:[])].map(v=>`    pinMode(${v}, OUTPUT); digitalWrite(${v}, LOW);`).join("\n")+"\n"+setupPwm()+`\n    stop_device_${i}(); motor_time_${i} = millis();`;
  f.loop=`    if (millis() - motor_time_${i} > ${e.timeout}) stop_device_${i}();`;
 }

 if(e.device==="touch"){
  f.callbacks=timer(`    const uint32_t raw = touchRead(${p.signal});\n    msg_${i}.data = raw > INT32_MAX ? INT32_MAX : static_cast<int32_t>(raw);`);
 }
 if(e.device==="internal-temperature"){
  f.callbacks=timer(`    msg_${i}.data = temperatureRead();`);
 }
 if(e.device==="lm35"){
  f.hardware=`    pinMode(${p.signal}, INPUT); analogReadResolution(12);\n    analogSetPinAttenuation(${p.signal}, ADC_11db);`;
  f.callbacks=timer(`    msg_${i}.data = analogReadMilliVolts(${p.signal}) / 10.0f;`);
 }
 if(e.device==="lcd1602"){
  f.includes.push("#include <LiquidCrystal_PCF8574.h>");f.dependencies.push("mathertel/LiquidCrystal_PCF8574@^2.2.0");
  f.declarations+=`\nLiquidCrystal_PCF8574 screen_${i}(${e.address});`;
  f.hardware=`    screen_${i}.begin(16, 2, Wire); screen_${i}.setBacklight(255);\n    screen_${i}.clear(); screen_${i}.print(0);`;
  f.callbacks=callback(`    screen_${i}.setCursor(0, 0); screen_${i}.print("                ");\n    screen_${i}.setCursor(0, 0); screen_${i}.print(msg->data);`);
 }
 if(e.device==="max7219"){
  f.includes.push("#include <MD_MAX72xx.h>");f.dependencies.push("majicdesigns/MD_MAX72XX@^3.5.1");
  f.declarations+=`\nMD_MAX72XX matrix_${i}(MD_MAX72XX::FC16_HW, ${p.din}, ${p.clk}, ${p.cs}, 1);`;
  f.hardware=`    ros.require(matrix_${i}.begin(), "Failed to initialize MAX7219");\n    matrix_${i}.control(MD_MAX72XX::INTENSITY, 3); matrix_${i}.clear();`;
  f.callbacks=callback(`    int remaining = constrain(msg->data, 0, 64);\n    for (int row = 0; row < 8; ++row) {\n        const int count = constrain(remaining, 0, 8);\n        matrix_${i}.setRow(0, row, static_cast<uint8_t>((1U << count) - 1U));\n        remaining -= count;\n    }`);
 }
 if(e.device==="stepper28byj"){
  f.includes.push("#include <AccelStepper.h>");f.dependencies.push("waspinator/AccelStepper@^1.64.0");
  // HALF4WIRE sequence: IN1, IN3, IN2, IN4 for a 28BYJ-48 with ULN2003.
  f.declarations+=`\nAccelStepper stepper_${i}(AccelStepper::HALF4WIRE, ${p.in1}, ${p.in3}, ${p.in2}, ${p.in4});`;
  f.hardware=`    stepper_${i}.setMaxSpeed(400); stepper_${i}.setAcceleration(200);\n    stepper_${i}.setCurrentPosition(0); stepper_${i}.disableOutputs();`;
  f.callbacks=callback(`    stepper_${i}.enableOutputs();\n    stepper_${i}.moveTo(constrain(msg->data, -1000000, 1000000));`);
  f.loop=`    stepper_${i}.run();\n    if (stepper_${i}.distanceToGo() == 0) stepper_${i}.disableOutputs();`;
 }
 return f;
}
