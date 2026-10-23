import { z } from "zod";
export type BoardProfile = {
  title: string; platformio: string; family: "esp32" | "esp32c3" | "esp32s3";
  output: number[]; input: number[]; adc: number[]; i2c: {sda:number;scl:number};
  uart: {tx:number;rx:number}; pwmChannels:number; servoBits:number;
  flags?:string[]; unflags?:string[]; note?:string;
  specifications?:Record<string,string>;
  builtInLed?:{pin:number;activeLow:boolean;note?:string}; bootPins?:number[];
};
const output=[2,4,5,12,13,14,15,16,17,18,19,21,22,23,25,26,27,32,33];
const classic:BoardProfile={title:"",platformio:"",family:"esp32",output,input:[...output,34,35,36,39],adc:[32,33,34,35,36,39],i2c:{sda:21,scl:22},uart:{tx:1,rx:3},pwmChannels:16,servoBits:16};
const c3=[0,1,2,3,4,5,6,7,8,9,10,20,21];
const xiao=[1,2,3,4,5,6,7,8,9,43,44];
export const boards = {
  denky32:{...classic,title:"ESP32 Denky32",platformio:"denky32",builtInLed:{pin:2,activeLow:false},bootPins:[0,2,5,12,15],specifications:{"Model":"DOIT ESP32 DEVKIT V1 · 30 pins · editor name: Denky32","Processor":"ESP32-WROOM-32 · dual-core Xtensa · 240 MHz","Memory":"4 MB Flash · 520 KB chip SRAM","GPIO":"Use GPIO numbers, not connector contact positions","Analog inputs":"ADC1 on GPIO32, 33, 34, 35, 36 and 39; GPIO34–39 are input only and have no internal pull-up","I2C and UART":"SDA21 / SCL22; UART TX1 / RX3 through a USB–UART bridge","LED":"GPIO2, active high; check your board variant"},note:"The editor retains the Denky32 name. Its reference pinout is DOIT ESP32 DevKit V1; the confirmed PlatformIO target is board = denky32. Observe the required boot pin levels during reset."},
  esp32cam:{...classic,title:"ESP32-CAM AI-Thinker",platformio:"esp32cam",output:[2,4,12,13,14,15,33],input:[2,4,12,13,14,15],adc:[],i2c:{sda:13,scl:14},builtInLed:{pin:33,activeLow:true,note:"This is the red status LED; the white flash LED uses GPIO4, active high."},bootPins:[0,2,5,12,15],specifications:{
    "Model":"AI-Thinker ESP32-CAM · camera OV2640",
    "Memory":"4 MB Flash; PSRAM enabled by the PlatformIO profile",
    "Available GPIOs":"2, 4, 12, 13, 14 and 15 for peripherals without microSD; 33 only drives the onboard red LED",
    "LED":"Red status LED on GPIO33, active low; white flash LED on GPIO4, active high",
    "MicroSD":"CLK14, CMD15, D0=2, D1=4, D2=12 and D3=13; not initialized by the generated code",
    "UART":"TX1 / RX3; requires a 3.3 V USB–UART programmer or ESP32-CAM-MB base",
    "Boot":"Connect GPIO0 to GND to upload; disconnect it from GND for normal boot",
    "PSRAM":"GPIO16/17 are not available for peripherals because they may be connected to PSRAM",
    "Camera OV2640":"Y2–Y9: 5/18/19/21/36/39/34/35; XCLK0, PCLK22, VSYNC25, HREF23, SCCB26/27, PWDN32",
    "ADC and I2C":"No external ADC1 in this profile; default external bus SDA13/SCL14 with microSD disabled",
    "Power":"Use the 5V pin for power; VCC is an output, not a supply input"
  },note:"Camera and microSD are not initialized. GPIO33 drives the active-low red LED and GPIO4 the white flash. MicroSD GPIOs are free only while the card is unused. GPIO16/17 are reserved for PSRAM."},
  "ttgo-t-camera":{...classic,title:"TTGO T-Camera ESP32-WROVER-B",platformio:"esp32dev",output:[21,22],input:[21,22,33,34],adc:[],flags:["-DBOARD_HAS_PSRAM","-mfix-esp32-psram-cache-issue"],specifications:{
    "Revision":"T-Camera with AS312 PIR and SSD1306 OLED; distinct from the microphone/BME280 variant",
    "Memory":"ESP32-WROVER-B · 4 MB Flash · 8 MB PSRAM in the reference model",
    "External connector":"5-contact JST: SDA21, SCL22 and power; general DevKit GPIOs are not exposed",
    "Display":"SSD1306 0.96 inches · 128×64 · I2C SDA21/SCL22",
    "Onboard inputs":"PIR on GPIO33; function button on GPIO34 (input only)",
    "Camera":"OV2640 camera signals and PSRAM GPIO16/17 are not available as free GPIOs",
    "Camera pin mapping":"Y2–Y9: 5/14/4/15/18/23/36/39; XCLK32, PCLK19, VSYNC27, HREF25, SCCB13/12, PWDN26",
    "Connection":"Micro-USB with CP2104; 2.4 GHz WiFi and Bluetooth 4.2",
    "Power":"5 V USB or 3.7 V Li-ion battery with IP5306 power management; no microSD slot"
  },note:"Only GPIO21/22 are available as external JST outputs. GPIO33 (PIR) and GPIO34 (button) are onboard inputs. Camera, PIR and OLED are not added automatically; use a digital input on GPIO33 for PIR. I2C is shared with the display and requires distinct addresses. GPIO2 cannot drive an external LED on this model."},
  seeed_xiao_esp32s3:{...classic,title:"Seeed Studio XIAO ESP32-S3 Sense · OV3660",platformio:"seeed_xiao_esp32s3",family:"esp32s3",output:[...xiao,21],input:xiao,adc:[1,2,3,4,5,6,7,8,9],i2c:{sda:5,scl:6},uart:{tx:43,rx:44},pwmChannels:8,servoBits:14,builtInLed:{pin:21,activeLow:true,note:"GPIO21 is also microSD CS; this profile does not initialize the card."},bootPins:[0,3,45,46],unflags:["-DARDUINO_USB_CDC_ON_BOOT=1"],flags:["-DARDUINO_USB_CDC_ON_BOOT=0"],specifications:{
    "Variant":"XIAO ESP32-S3 Sense with the selected OV3660 camera; OV2640 and OV5640 are not assumed",
    "Processor":"ESP32-S3R8 · dual-core Xtensa LX7 · 240 MHz",
    "Memory":"8 MB Flash and 8 MB PSRAM; distinct from the 16 MB Flash XIAO S3 Plus",
    "Camera OV3660":"Maximum resolution 2048×1536, fixed focus; no autofocus",
    "D0–D5":"GPIO1/2/3/4/5/6; I2C SDA=D4 (5), SCL=D5 (6)",
    "D6–D10":"TX43, RX44, SCK7, MISO8, MOSI9; 3.3 V logic",
    "ADC":"ADC1 on GPIO1–9; GPIO41/42 are not ADC inputs",
    "LED and microSD":"Active-low user LED on GPIO21; CS21/SCK7/MISO8/MOSI9 are shared with microSD",
    "Microphone":"PDM: clock on GPIO42, data on GPIO41; not available as free external pins",
    "Camera pins":"XCLK10, PCLK13, VSYNC38, HREF47, SCCB40/39; datos 15/17/18/16/14/12/11/48",
    "USB and battery":"Native USB-C and battery charging; with this helper, micro-ROS Serial uses UART TX43/RX44 and a USB–TTL adapter",
    "Firmware status":"This profile identifies OV3660; the generator does not initialize the camera, microphone or microSD"
  },note:"Profile fixed to Sense OV3660. Seeed also ships OV5640 revisions; check your sensor. GPIO21 can drive the onboard LED while microSD is unused. Serial uses UART TX43/RX44 with a 3.3 V USB–TTL adapter. The example external LED remains on GPIO2."},
  "esp32-c3-supermini":{
    ...classic,title:"ESP32-C3 SuperMini",platformio:"esp32-c3-devkitm-1",family:"esp32c3",
    output:c3,input:c3,adc:[0,1,2,3,4],i2c:{sda:8,scl:9},uart:{tx:21,rx:20},pwmChannels:6,servoBits:14,
    builtInLed:{pin:8,activeLow:true},bootPins:[2,8,9],

    specifications:{
      "Processor":"ESP32-C3FN4 · 32-bit RISC-V · single core · 160 MHz",
      "Memory":"4 MB Flash · 400 KB SRAM · 384 KB ROM · no PSRAM",
      "Connectivity":"WiFi 2.4 GHz 802.11 b/g/n · Bluetooth 5 LE",
      "Exposed GPIOs":"0–10, 20 and 21 (13 GPIOs); 3.3 V logic",
      "ADC":"12 bits · ADC1: GPIO0–4 · GPIO5 is ADC2 and is not available for analog input in this profile",
      "PWM":"6 LEDC channels; the generator reserves 2 for servos and 4 for 1 kHz PWM",
      "I2C":"Default SDA8 / SCL9; configurable, one shared bus",
      "UART0":"TX 21 / RX 20",
      "USB-C":"Native USB Serial/JTAG · GPIO18 (D−) / 19 (D+), unavailable as external GPIOs",
      "LED and buttons":"Blue LED on GPIO8, active low · BOOT on GPIO9 · RESET on EN",
      "Boot":"GPIO2, 8 and 9: do not drive incompatible levels during reset",
      "Power":"USB-C or 5V pin; 3.3 V GPIO logic · approximately 22.5 × 18 mm"
    },
    note:"Onboard LED: GPIO8, active low; shared with default SDA. Choose another SDA GPIO to use it with I2C. The example LED remains external on GPIO2. GPIO2/8/9 affect boot. Serial uses UART TX21/RX20 with a 3.3 V USB–TTL adapter; native USB-C uploads firmware with this base project."
  },
  wemos_d1_mini32:{...classic,title:"ESP32 D1 Mini / ESP32-S",platformio:"wemos_d1_mini32",builtInLed:{pin:2,activeLow:false},specifications:{
    "Model":"Wemos D1 MINI KIT ESP32 / ESP32-S · 40-contact USB-C model",
    "Processor":"ESP-WROOM-32 with ESP32-D0WDQ6 · dual-core 32-bit Xtensa LX6 · 240 MHz",
    "Memory":"4 MB QSPI Flash · 520 KB SRAM · 448 KB ROM · 16 KB SRAM RTC",
    "Connectivity":"WiFi 2.4 GHz 802.11 b/g/n · Bluetooth 4.2 BR/EDR and BLE",
    "USB and power":"USB-C with CP2104 · 5 V USB power · 3.3 V GPIO logic",
    "Pins":"40 contacts in two rows per side; not 40 GPIOs. Use GPIO numbers, not D labels from another variant.",
    "D0–D8 (Naylamp)":"D0=26, D1=22, D2=21, D3=17, D4=16, D5=18, D6=19, D7=23, D8=5; A0=36",
    "ADC":"12-bit inputs; the generator uses ADC1 on 32/33/34/35/36/39 for WiFi compatibility",
    "PWM and DAC":"16 chip PWM channels; this profile separates 2 servo channels and 14 PWM channels. Hardware DAC on GPIO25/26; catalog analog outputs use PWM.",
    "I2C and UART":"SDA21/SCL22 in the PlatformIO Arduino variant; TX1/RX3 through CP2104",
    "Identification":"Distinct from the 80 MHz ESP8266 D1 mini; other revisions may use different D0–D8 mappings",
    "Dimensions":"39 × 31 mm according to Naylamp's USB-C model specifications"
  },note:"Wemos D1 MINI KIT ESP32 USB-C profile, with board = wemos_d1_mini32. The two references differ in contacts and D0–D8 labels; this profile follows Naylamp's 40-contact ESP32 model and uses GPIO numbers. Do not use the ESP8266 D1 mini pinout."}

} satisfies Record<string,BoardProfile>;
export type BoardId=keyof typeof boards;
// Preserve existing Dev Module drafts using the retained DOIT-compatible profile.
export const boardSchema=z.preprocess(value=>value==="esp32dev"?"denky32":value,z.enum(Object.keys(boards) as [BoardId,...BoardId[]]));
export function boardProfile(id:BoardId):BoardProfile{return boards[id];}
export function boardPins(id:BoardId,mode:"input"|"output"|"adc"|"pwm"|"touch"){const b=boardProfile(id);return mode==="touch"?boardTouchPins(id):mode==="adc"?b.adc:mode==="input"?b.input:b.output;}

export function boardLedHint(id:BoardId){const board=boardProfile(id),led=board.builtInLed;if(!led)return "";return `Onboard LED on GPIO ${led.pin}: active-${led.activeLow?"low":"high"} polarity.${led.pin===board.i2c.sda?" Shared with default SDA: change SDA when using both.":""}${led.note?" "+led.note:""}`;}

// Only touch-capable contacts exposed by this board profile are selectable.
export function boardTouchPins(id:BoardId):number[]{
 const b=boardProfile(id);
 if(b.family==="esp32c3"||id==="ttgo-t-camera")return [];
 return b.input.filter(pin=>b.family==="esp32s3"?pin>=1&&pin<=14:[0,2,4,12,13,14,15,27,32,33].includes(pin));
}
export function outputPinLabel(id:BoardId,pin:number){return `GPIO ${pin}${boardProfile(id).builtInLed?.pin===pin?" /led_builtin":""}`;}
