import { z } from "zod";
import { boardSchema, boardProfile, boardPins } from "./boards";
export * from "./boards";
import { deviceSchema, devices, type DeviceDefinition, pwmCount } from "../device-catalog/model";
export * from "../device-catalog/model";
import { robotSchema, robotPins, robotDefinitions } from "./robot";
export * from "./robot";

const identifier = z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, "Use letters, numbers and underscores; start with a letter or underscore.");
const topic = z.string().regex(/^\/[a-zA-Z_][a-zA-Z0-9_]*(\/[a-zA-Z_][a-zA-Z0-9_]*)*$/, "Use a valid absolute topic, such as /robot/counter.");
const publisher = z.object({
  id: z.string().min(1), kind: z.literal("publisher"), topic,
  message: z.enum(["Int32", "Float32", "Bool", "Vector3", "Twist"]),
  behavior: z.enum(["counter", "constant"]),
  period: z.number().int().min(10).max(3600000),
  value: z.number().finite().min(-2147483648).max(2147483647),
  vector: z.object({ x: z.number().finite(), y: z.number().finite(), z: z.number().finite() }).optional(),
  angular: z.object({ x: z.number().finite(), y: z.number().finite(), z: z.number().finite() }).optional()
}).superRefine((e, ctx) => {
  if (e.behavior === "counter" && e.message !== "Int32") ctx.addIssue({ code: "custom", message: "The counter requires Int32." });
  if (e.message === "Int32" && !Number.isInteger(e.value)) ctx.addIssue({ code: "custom", message: "Int32 requires an integer." });
  if (e.message === "Bool" && e.value !== 0 && e.value !== 1) ctx.addIssue({ code: "custom", message: "Bool uses 0 or 1." });
});
const subscriber = z.object({
  id: z.string().min(1), kind: z.literal("subscriber"), topic,
  pin: z.number().int().min(0).max(48),
  activeLow: z.boolean()
});
export const projectSchema = z.object({
  version: z.literal(1), name: z.string().min(1).max(80), nodeName: identifier.refine(value=>value.endsWith("_node"), "The node name must end with _node."),
  board: boardSchema, domain: z.number().int().min(0).max(232),
  transport: z.enum(["wifi", "serial"]), ssid: z.string().max(32), password: z.string().max(63),
  agentIp: z.string(), port: z.number().int().min(8888,"The Agent port is fixed at 8888.").max(8888,"The Agent port is fixed at 8888."),
  i2c: z.object({ sda: z.number().int(), scl: z.number().int() }).optional(),
  entities: z.array(z.union([publisher, subscriber, robotSchema, deviceSchema])).max(12)
}).superRefine((p, ctx) => {
  if (p.transport === "wifi") {
    if (!p.ssid.trim()) ctx.addIssue({ code: "custom", path: ["ssid"], message: "Enter the WiFi network name." });
    if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(p.agentIp) || p.agentIp.split(".").some(v => Number(v) > 255)) ctx.addIssue({ code: "custom", path: ["agentIp"], message: "The Agent IP must be a valid IPv4 address." });
  }
  const board = boardProfile(p.board);
  const topics = new Set<string>(), pins = new Set<number>(), ids = new Set<string>();
  const pinOwners = new Map<number, string>();
  const hardware = new Set<string>();
  const usesI2c = p.entities.some(e => (e.kind === "robot" && ["imu-yaw", "tof-triple"].includes(e.behavior)) || (e.kind === "device" && !!(devices[e.device] as DeviceDefinition).addresses));
  if (usesI2c) {
    const { sda, scl } = p.i2c ?? board.i2c;
    if (!board.output.includes(sda) || !board.output.includes(scl) || sda === scl) ctx.addIssue({ code: "custom", message: "I2C: SDA/SCL must be distinct output-capable GPIOs." });
    if ((p.transport === "serial" || board.family !== "esp32") && [sda,scl].some(pin=>pin===board.uart.tx||pin===board.uart.rx)) ctx.addIssue({code:"custom",message:"I2C: SDA/SCL overlap reserved Serial TX/RX pins. Choose different GPIOs."});
    pins.add(sda); pins.add(scl);
    pinOwners.set(sda, "I2C bus (SDA)"); pinOwners.set(scl, "I2C bus (SCL)");
  }
  const addresses = new Set<number>();
  const hasVl = p.entities.some(e => e.kind === "device" && e.device === "vl53l0x");
  const hasLegacyTof = p.entities.some(e => e.kind === "robot" && e.behavior === "tof-triple");
  if (hasVl && hasLegacyTof) ctx.addIssue({ code: "custom", message: "Replace the triple ToF block with individual VL53L0X sensors to coordinate XSHUT and addresses." });
  const vlSensors=p.entities.filter(e=>e.kind==="device"&&e.device==="vl53l0x");
  for(const e of vlSensors){if(e.kind!=="device")continue;if(e.pins.xshut===-1&&(vlSensors.length>1||e.address!==0x29))ctx.addIssue({code:"custom",message:"VL53L0X: without XSHUT, use a single sensor at address 0x29. Multiple sensors require separate XSHUT pins."});}
  let pubs = 0, subs = 0, generalPwm = 0, servos = 0;
  p.entities.forEach(e => {
    if (e.kind === "publisher") pubs++;
    if (e.kind === "subscriber") subs++;
    if (e.kind === "robot") { if (robotDefinitions[e.behavior].direction === "publisher") pubs++; else subs++; if (e.behavior === "differential") pubs++; if(e.behavior === "motor-pwm")generalPwm++; }
    if (e.kind === "device") { if (devices[e.device].direction === "publisher") pubs++; else subs++; if(e.device === "servo")servos++;else generalPwm+=pwmCount(e); }
    const assigned = e.kind === "device" ? ((devices[e.device] as DeviceDefinition).addresses ? [e.address!] : []) : e.kind === "robot" ? (e.behavior === "imu-yaw" ? [0x28] : e.behavior === "tof-triple" ? [0x30,0x31,0x32] : []) : [];
    for(const addr of assigned){
      if(addresses.has(addr))ctx.addIssue({code:"custom",message:`I2C: address 0x${addr.toString(16)} duplicated.`});
      addresses.add(addr);
      if((hasVl||hasLegacyTof)&&addr===0x29&&!(e.kind === "device"&&e.device === "vl53l0x"))ctx.addIssue({code:"custom",message:"I2C: keep 0x29 free while initializing VL53L0X sensors. Change the other device address."});
    }
  });
  if(pubs>10||subs>5)ctx.addIssue({code:"custom",message:"The base firmware supports up to 10 publishers and 5 subscribers."});
  if(servos>2||generalPwm>board.pwmChannels-2)ctx.addIssue({code:"custom",message:`PWM: ${board.title} supports 2 servos and ${board.pwmChannels-2} additional channels in this profile (separate 50 Hz and 1 kHz timers).${p.entities.some(e=>e.kind==="device"&&e.device==="passive-buzzer")?" Each passive buzzer reserves 2 channels for an independent tone timer.":""}`});
  if (p.transport === "serial" || board.family !== "esp32") { pins.add(board.uart.tx); pins.add(board.uart.rx); pinOwners.set(board.uart.tx, "Serial TX"); pinOwners.set(board.uart.rx, "Serial RX"); }
  p.entities.forEach((e, i) => {
    const entityTopics = [e.topic, ...(e.kind === "robot" && e.behavior === "differential" ? [e.outputTopic] : [])];
    for (const t of entityTopics) {
      if (topics.has(t)) ctx.addIssue({ code: "custom", path: ["entities", i], message: `Duplicate topic: ${t}.` });
      topics.add(t);
    }
    if (ids.has(e.id)) ctx.addIssue({ code: "custom", message: "Some entities have duplicate IDs." });
    ids.add(e.id);
    const title = e.kind === "device" ? devices[e.device].title : e.kind === "robot" ? robotDefinitions[e.behavior].title : e.kind === "subscriber" ? "LED / digital output" : "Publisher";
    const owner = `${title} (${e.topic})`;
    if(e.kind==="device"&&e.device==="touch"&&!boardPins(p.board,"touch").length)ctx.addIssue({code:"custom",path:["entities",i],message:`Touch unavailable on ${board.title}.`});
    const used = e.kind === "device" ? devices[e.device].pins.filter(role=>!(role.optional&&e.pins[role.key]===-1)).map(role=>({pin:e.pins[role.key],label:role.label})) : (e.kind === "subscriber" ? [e.pin] : e.kind === "robot" ? robotPins(e) : []).map((pin,index)=>({pin,label:`pin ${index+1}`}));
    for (const {pin,label} of used) {
      const current = `${owner} · ${label}`;
      const mode = e.kind === "device" ? devices[e.device].pins.find(role=>role.label===label)!.mode : e.kind === "robot" && e.behavior === "wheel-encoders" ? "input" : "output";
      if (!boardPins(p.board, mode).includes(pin)) ctx.addIssue({code:"custom",path:["entities",i],message:`${current}: GPIO ${pin} unavailable for ${mode === "adc" ? "ADC1" : mode === "input" ? "input" : "output"} on ${board.title}.`});
      if (pins.has(pin)) ctx.addIssue({ code: "custom", path: ["entities", i], message: `GPIO ${pin} conflict: ${pinOwners.get(pin) ?? "reserved resource"} and ${current}. Assign a different GPIO.` });
      else pinOwners.set(pin,current);
      pins.add(pin);
    }
    if (e.kind === "robot" && ["imu-yaw", "tof-triple"].includes(e.behavior)) {
      if (hardware.has(e.behavior)) ctx.addIssue({ code: "custom", path: ["entities", i], message: "Only one block per I2C sensor group is supported." });
      hardware.add(e.behavior);
    }

  });
});
export type Project = z.infer<typeof projectSchema>;
export type Entity = Project["entities"][number];
export const defaultProject: Project = {
  version: 1, name: "My first robot", nodeName: "micro_ros_node", board: "denky32", domain: 13,
  transport: "wifi", ssid: "YOUR_WIFI_SSID", password: "", agentIp: "192.168.1.100", port: 8888,
  entities: [
    { id: "counter", kind: "publisher", topic: "/counter", message: "Int32", behavior: "counter", period: 1000, value: 0 },
    { id: "led", kind: "subscriber", topic: "/led", pin: 2, activeLow: false }
  ]
};
export function validateProject(project: Project): string[] {
  const result = projectSchema.safeParse(project);
  return result.success ? [] : result.error.issues.map(i => `${i.path.join(".") || "Program"}: ${i.message}`);
}
export function validateEntityIssues(project: Project): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  const add = (id: string | undefined, msg: string) => {
    if (!id) return;
    if (!map[id]) map[id] = [];
    if (!map[id].includes(msg)) map[id].push(msg);
  };
  const result = projectSchema.safeParse(project);
  if (result.success) return map;
  for (const issue of result.error.issues) {
    if (issue.path[0] === "entities" && typeof issue.path[1] === "number") {
      add(project.entities[issue.path[1]]?.id, issue.message);
    }
  }
  const topicOwners = new Map<string, string>();
  const pinOwners = new Map<number, string>();
  const addrOwners = new Map<number, string>();
  const vlSensors = project.entities.filter(e => e.kind === "device" && e.device === "vl53l0x");
  for (const e of project.entities) {
    const topics = [e.topic, ...(e.kind === "robot" && e.behavior === "differential" ? [e.outputTopic] : [])];
    for (const t of topics) {
      if (topicOwners.has(t)) {
        const msg = `Duplicate topic: ${t}.`;
        add(topicOwners.get(t), msg);
        add(e.id, msg);
      } else topicOwners.set(t, e.id);
    }
    const assigned = e.kind === "device" ? ((devices[e.device] as DeviceDefinition).addresses ? [e.address!] : []) : e.kind === "robot" ? (e.behavior === "imu-yaw" ? [0x28] : e.behavior === "tof-triple" ? [0x30, 0x31, 0x32] : []) : [];
    for (const addr of assigned) {
      if (addrOwners.has(addr)) {
        const msg = `I2C: address 0x${addr.toString(16)} duplicated.`;
        add(addrOwners.get(addr), msg);
        add(e.id, msg);
      } else addrOwners.set(addr, e.id);
      if (vlSensors.length > 0 && addr === 0x29 && !(e.kind === "device" && e.device === "vl53l0x")) {
        add(e.id, "I2C: keep 0x29 free while initializing VL53L0X sensors. Change the other device address.");
      }
    }
    if (e.kind === "device" && e.device === "vl53l0x" && e.pins.xshut === -1 && (vlSensors.length > 1 || e.address !== 0x29)) {
      add(e.id, "VL53L0X: without XSHUT, use a single sensor at address 0x29. Multiple sensors require separate XSHUT pins.");
    }
    const usedPins = e.kind === "device"
      ? devices[e.device].pins.filter(role => !(role.optional && e.pins[role.key] === -1)).map(role => e.pins[role.key])
      : e.kind === "subscriber" ? [e.pin] : e.kind === "robot" ? robotPins(e) : [];
    for (const pin of usedPins) {
      if (pinOwners.has(pin)) {
        add(pinOwners.get(pin), `GPIO ${pin} conflict`);
        add(e.id, `GPIO ${pin} conflict`);
      } else pinOwners.set(pin, e.id);
    }
  }
  return map;
}
export function handles(project: Project) { return project.entities.length; }

export function entityDirection(e: Entity): "publisher" | "subscriber" { return e.kind === "device" ? devices[e.device].direction : e.kind === "robot" ? robotDefinitions[e.behavior].direction : e.kind; }
export function entityMessage(e: Entity): string { return e.kind === "device" ? devices[e.device].message : e.kind === "robot" ? robotDefinitions[e.behavior].message : e.kind === "publisher" ? e.message : "Bool"; }
export function entityTitle(e: Entity): string { return e.kind === "device" ? devices[e.device].title : e.kind === "robot" ? robotDefinitions[e.behavior].title : e.kind === "subscriber" ? "LED / digital output" : e.behavior === "counter" ? "Counter" : "Periodic publication"; }
export function entityCounts(p: Project) { return { publishers: p.entities.filter(e => entityDirection(e) === "publisher").length + p.entities.filter(e=>e.kind === "robot"&&e.behavior === "differential").length, subscribers: p.entities.filter(e => entityDirection(e) === "subscriber").length, timers: p.entities.filter(e=>entityDirection(e) === "publisher").length }; }

export function suggestNodeName(value:string){const name=value.trim().replace(/[^a-zA-Z0-9_]/g,"_");const safe=/^[a-zA-Z_]/.test(name)?name:`node_${name}`;return safe.endsWith("_node")?safe:`${safe}_node`;}
export function absoluteTopic(value:string){return value.startsWith("/")?value:`/${value}`;}
