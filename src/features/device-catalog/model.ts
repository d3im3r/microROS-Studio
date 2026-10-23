import { boardPins, type BoardId } from "../program/boards";
import { z } from "zod";
import { topicSchema } from "../program/robot";
export type PinRole = { key: string; label: string; mode: "input" | "output" | "adc" | "pwm" | "touch"; initial: number };
export type DeviceDefinition = { title: string; direction: "publisher" | "subscriber"; message: "Int32" | "Float32" | "Bool" | "Vector3"; topic: string; period: number; pins: PinRole[]; addresses?: number[]; description: string; note?: string };
const pin = (key: string, label: string, mode: PinRole["mode"], initial: number): PinRole => ({ key, label, mode, initial });
const motorPins = [pin("pwmA","PWM A","pwm",13),pin("in1","IN1 / AIN1","output",26),pin("in2","IN2 / AIN2","output",27),pin("pwmB","PWM B","pwm",25),pin("in3","IN3 / BIN1","output",33),pin("in4","IN4 / BIN2","output",32)];
export const devices = {
  "touch": {title:"Capacitive touch pin",direction:"publisher",message:"Int32",topic:"/touch",period:100,pins:[pin("signal","Touch signal","touch",4)],description:"Raw capacitive reading. Touch decreases the value on ESP32 and increases it on ESP32-S3.",note:"Choose a touch-capable pin available in this profile. Calibrate the threshold in your application; this input publishes a raw reading rather than a calibrated touch state."},
  "internal-temperature": {title:"Internal chip temperature",direction:"publisher",message:"Float32",topic:"/chip_temperature",period:1000,pins:[],description:"Internal chip temperature in °C through temperatureRead(); no external GPIO required.",note:"An approximate silicon temperature, not ambient temperature. It varies with workload, WiFi and chip revision; a failed reading is published as NaN."},
  "lm35": {title:"LM35 temperature sensor",direction:"publisher",message:"Float32",topic:"/temperature",period:1000,pins:[pin("signal","LM35 signal · ADC1","adc",34)],description:"Temperature in °C: calibrated millivolt reading divided by 10 mV/°C.",note:"LM35 supply: 4–30 V. Use a 5 V supply and common GND. Keep the ESP32 signal below 3.3 V. This single-supply profile measures positive temperatures; ADC accuracy is limited, especially near 0 °C."},
  "active-buzzer": {title:"Active buzzer",direction:"subscriber",message:"Bool",topic:"/buzzer",period:100,pins:[pin("signal","Buzzer output","output",4)],description:"true turns sound on and false turns it off; initially off. Designed for an active buzzer; no PWM tones are generated.",note:"Use a module with a 3.3 V logic input or a driver transistor; do not power a high-current buzzer from a GPIO."},
  "lcd1602": {title:"16×2 I²C LCD",direction:"subscriber",message:"Int32",topic:"/lcd",period:100,pins:[],addresses:[0x27,0x3f,0x20,0x21,0x22,0x23,0x24,0x25,0x26,0x38,0x39,0x3a,0x3b,0x3c,0x3d,0x3e],description:"HD44780 LCD with 16 columns, 2 rows and a PCF8574/PCF8574A adapter. Displays the received integer.",note:"Default address: 0x27; check A0–A2 jumpers. Adapters commonly use 5 V: add I2C level shifting and keep 5 V pull-ups away from the ESP32."},
  "stepper28byj": {title:"28BYJ-48 stepper motor + ULN2003",direction:"subscriber",message:"Int32",topic:"/stepper_position",period:100,pins:[pin("in1","IN1","output",13),pin("in2","IN2","output",14),pin("in3","IN3","output",25),pin("in4","IN4","output",26)],description:"Absolute position in half-steps from startup (±1000000). Nonblocking motion: up to 400 half-steps/s and 200 steps/s² acceleration.",note:"No homing or position feedback. The 28BYJ-48 gear ratio varies; calibrate steps per revolution. Power the motor through ULN2003 from its own supply and share GND. Coils are released at the target."},
  "max7219": {title:"MAX7219 LED matrix",direction:"subscriber",message:"Int32",topic:"/led_matrix",period:100,pins:[pin("din","DIN","output",23),pin("clk","CLK","output",18),pin("cs","CS / LOAD","output",5)],description:"One 8×8 matrix. An integer from 0 to 64 sets how many LEDs are lit, filling rows from the first row.",note:"Profile for a single FC-16 MAX7219 module. Use a 5 V supply, common GND and control-signal level shifting when required by the module."},
  "vl53l0x": { title:"VL53L0Xv2", direction:"publisher", message:"Float32", topic:"/distance", period:150, pins:[pin("xshut","XSHUT","output",23)], addresses:[0x29,0x30,0x31,0x32,0x33,0x34], description:"Distance in meters; -1 for an invalid reading. VL53L0X profile, including v2 modules.", note:"Each VL53L0X needs its own XSHUT pin. Its address is assigned at every startup." },
  "hcsr04": { title:"HC-SR04", direction:"publisher", message:"Float32", topic:"/ultrasonic_distance", period:100, pins:[pin("trigger","Trigger","output",18),pin("echo","Echo","input",19)], description:"Distance in meters; -1 when no echo is received. Echo timeout: 25 ms.",note:"Echo is usually 5 V: use a divider or level shifter to 3.3 V for the ESP32." },
  "mpu6050": { title:"MPU-6050", direction:"publisher", message:"Vector3", topic:"/acceleration", period:100, pins:[],addresses:[0x68,0x69],description:"Acceleration x/y/z in m/s². Defaults: ±8 g range and 21 Hz filter." },
  "bno055": { title:"BNO055",direction:"publisher",message:"Float32",topic:"/orientation",period:100,pins:[],addresses:[0x28,0x29],description:"Yaw in radians derived from the quaternion." },
  "encoder": { title:"Incremental quadrature encoder",direction:"publisher",message:"Int32",topic:"/encoder",period:50,pins:[pin("a","Channel A","input",18),pin("b","Channel B","input",19)],description:"Signed count; CHANGE interrupt on A, direction from B. No predefined robot geometry." },
  "potentiometer": { title:"Potentiometer",direction:"publisher",message:"Int32",topic:"/potentiometer",period:100,pins:[pin("signal","ADC1 signal","adc",34)],description:"12-bit ADC reading: 0–4095.",note:"Maximum input: 3.3 V. GPIO34–39 have no internal pull-up resistors." },
  "dht11": { title:"DHT11",direction:"publisher",message:"Vector3",topic:"/environment",period:2000,pins:[pin("signal","Data","output",4)],description:"x: temperature °C; y: humidity %; z: 1 for a valid reading, 0 on failure (x/y NaN)." },
  "joystick": { title:"Analog joystick",direction:"publisher",message:"Vector3",topic:"/joystick",period:100,pins:[pin("x","X axis · ADC1","adc",34),pin("y","Y axis · ADC1","adc",35),pin("button","Button","input",4)],description:"x/y: ADC 0–4095; z: 1 pressed / 0 released. Active-low button." },
  "analog-input": { title:"Generic analog input",direction:"publisher",message:"Int32",topic:"/analog_input",period:100,pins:[pin("signal","ADC1 signal","adc",34)],description:"12-bit ADC1 (0–4095), compatible with WiFi. Maximum input: 3.3 V." },
  "digital-input": { title:"Generic digital input",direction:"publisher",message:"Bool",topic:"/digital_input",period:100,pins:[pin("signal","Signal","input",4)],description:"Publishes the logic level. Uses an internal pull-up on supported pins; active-low behavior is configurable." },
  "servo": { title:"Servo motor",direction:"subscriber",message:"Int32",topic:"/servo",period:100,pins:[pin("signal","Servo signal","pwm",18)],description:"Angle: 0–180°, 50 Hz PWM, 500–2400 µs pulses. Starts at 90°.",note:"Power the servo from a suitable supply and share GND with the ESP32." },
  "led": { title:"LED",direction:"subscriber",message:"Bool",topic:"/led",period:100,pins:[pin("signal","LED output","output",2)],description:"true switches on; false switches off. Initially off." },
  "rgb-led": { title:"RGB LED",direction:"subscriber",message:"Vector3",topic:"/rgb_led",period:100,pins:[pin("r","Red","pwm",25),pin("g","Green","pwm",26),pin("b","Blue","pwm",27)],description:"x/y/z: red/green/blue from 0 to 255. Common cathode by default; select active low for common anode." },
  "ssd1306": { title:"SSD1306 OLED display",direction:"subscriber",message:"Int32",topic:"/screen",period:100,pins:[],addresses:[0x3c,0x3d],description:"Default 128×64 I2C profile. Displays the received number." },
  "sh110x": { title:"SH1106/SH110x OLED display",direction:"subscriber",message:"Int32",topic:"/screen",period:100,pins:[],addresses:[0x3c,0x3d],description:"Default 128×64 SH1106G I2C profile. Displays the received number; other SH110x controllers require profile changes." },
  "tm1637": { title:"TM1637 4-digit display",direction:"subscriber",message:"Int32",topic:"/display",period:100,pins:[pin("clk","CLK","output",18),pin("dio","DIO","output",19)],description:"Default TM1637 profile; displays integers from -999 to 9999. CLK/DIO are dedicated signals, not I2C." },
  "l298n": { title:"L298N",direction:"subscriber",message:"Vector3",topic:"/motors",period:100,pins:motorPins,description:"Two motors: x/y are signed percentages from -100 to 100; z is reserved. 500 ms watchdog.",note:"Remove ENA/ENB jumpers when using external PWM. Use a separate motor supply and common GND." },
  "tb6612": { title:"TB6612FNG driver",direction:"subscriber",message:"Vector3",topic:"/motors",period:100,pins:[...motorPins,pin("standby","STBY","output",23)],description:"Two motors: x/y are signed percentages from -100 to 100; z is reserved. STBY goes low when stopped or after watchdog timeout." },
  "digital-output": { title:"Generic digital output",direction:"subscriber",message:"Bool",topic:"/digital_output",period:100,pins:[pin("signal","Output","output",2)],description:"true activates; false deactivates. Initially inactive, with configurable polarity." },
  "pwm-output": { title:"Generic analog PWM output",direction:"subscriber",message:"Int32",topic:"/pwm_output",period:100,pins:[pin("signal","PWM output","pwm",25)],description:"Duty cycle: 0–255, 1 kHz / 8 bits. PWM output, not a DAC." }
} as const satisfies Record<string,DeviceDefinition>;
export type DeviceType = keyof typeof devices;
export const deviceSchema = z.object({
 id:z.string().min(1),kind:z.literal("device"),device:z.enum(Object.keys(devices) as [DeviceType,...DeviceType[]]),topic:topicSchema,
 pins:z.record(z.string(),z.number().int()),address:z.number().int().min(8).max(119).optional(),
 period:z.number().int().min(20).max(3600000),activeLow:z.boolean(),timeout:z.number().int().min(50).max(5000)
}).superRefine((e,ctx)=>{
 const d:DeviceDefinition=devices[e.device];
 if(d.addresses&&!d.addresses.includes(e.address??-1))ctx.addIssue({code:"custom",message:"I2C address not supported by this profile."});
 if(e.device==="dht11"&&e.period<2000)ctx.addIssue({code:"custom",message:"DHT11: the minimum profile period is 2000 ms."});
});
export type DeviceEntity=z.infer<typeof deviceSchema>;
export function createDevice(device:DeviceType,id:string):DeviceEntity{const d:DeviceDefinition=devices[device];return {id,kind:"device",device,topic:d.topic,pins:Object.fromEntries(d.pins.map(p=>[p.key,p.initial])),address:d.addresses?.[0],period:d.period,activeLow:false,timeout:500};}
export function deviceDirection(e:DeviceEntity){return devices[e.device].direction;}
export function pwmCount(e:DeviceEntity){return devices[e.device].pins.filter(p=>p.mode==="pwm").length;}

export function deviceUnavailableReason(type:DeviceType,board:BoardId){
 const d:DeviceDefinition=devices[type];
 if(type==="touch"&&!boardPins(board,"touch").length)return "This board does not expose compatible touch pins.";
 if(d.pins.some(role=>!boardPins(board,role.mode).length))return "This board does not provide the pins required by this device.";
 const available=new Set(d.pins.flatMap(role=>boardPins(board,role.mode)));
 if(available.size<d.pins.length)return "This board does not expose enough distinct GPIOs for this device.";
 return "";
}
