"use client";
import { useLanguage } from "../language";

import { devices, type DeviceDefinition, type DeviceEntity, type DeviceType, createDevice, deviceUnavailableReason } from "./model";
import { robotPins } from "../program/robot";
import { type Project, entityCounts, entityDirection, entityTitle, boardPins, boardProfile, boardLedHint, outputPinLabel, absoluteTopic } from "../program";
import { Button } from "@/shared/ui/button";
import { Plus, Settings2 } from "lucide-react";
export function allocateDevice(type:DeviceType,p:Project,id:string):DeviceEntity {
 const e=createDevice(type,id),d:DeviceDefinition=devices[type];
 const used=new Set(p.entities.flatMap(item=>item.kind==="device"?devices[item.device].pins.map(role=>item.pins[role.key]):item.kind==="subscriber"?[item.pin]:item.kind==="robot"?robotPins(item):[]));
 const bus=p.i2c??boardProfile(p.board).i2c;used.add(bus.sda);used.add(bus.scl);
 const profile=boardProfile(p.board);if(p.transport==="serial"||profile.family!=="esp32"){used.add(profile.uart.tx);used.add(profile.uart.rx);}
 for(const role of d.pins){const choices=boardPins(p.board,role.mode);const available=[role.initial,...choices].find(pin=>choices.includes(pin)&&!used.has(pin));e.pins[role.key]=available??choices[0]??role.initial;if(available===undefined&&role.optional)e.pins[role.key]=-1;else used.add(e.pins[role.key]);}
 const occupied=p.entities.flatMap(item=>item.kind==="device"&&item.address!==undefined?[item.address]:item.kind==="robot"&&item.behavior==="imu-yaw"?[0x28]:item.kind==="robot"&&item.behavior==="tof-triple"?[0x30,0x31,0x32]:[]);
 if(d.addresses)e.address=d.addresses.find(a=>!occupied.includes(a))??d.addresses[0];
 let n=1;while(p.entities.some(item=>item.topic===e.topic))e.topic=`${d.topic}_${n++}`;
 return e;
}
export function DeviceChoices({direction,project,add,select}:{direction:"publisher"|"subscriber";project:Project;add:(type:DeviceType)=>void;select:(id:string)=>void}){
  const { translate } = useLanguage();
 const group=project.entities.filter(e=>entityDirection(e)===direction);
 const limit=direction==="publisher"?10:5;
 const counts=entityCounts(project);const count=direction==="publisher"?counts.publishers:counts.subscribers;
 return <div className="space-y-4"><p className="text-xs leading-relaxed text-muted-foreground">{translate(direction==="publisher"?"Choose an input to add a default profile. Adjust its pins and topic in Properties.":"Choose an output to prepare its message and callback. Adjust its pins in Properties.")}</p>
  {group.length>0&&<div className="space-y-2">{group.map(e=><button key={e.id} className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-muted p-2 text-left text-xs" onClick={()=>select(e.id)}><span><strong>{translate(entityTitle(e))}</strong><span className="mono mt-1 block text-muted-foreground">{translate(e.topic)}</span></span><Settings2 size={14}/></button>)}</div>}
  <div className="grid gap-2">{(Object.entries(devices) as [DeviceType,DeviceDefinition][]).filter(([,d])=>d.direction===direction).map(([type,d])=><Button key={type} variant="outline" size="sm" title={translate(deviceUnavailableReason(type,project.board)||d.description)} disabled={count>=limit||project.entities.length>=12||!!deviceUnavailableReason(type,project.board)} onClick={()=>add(type)} className="h-auto min-h-9 justify-start whitespace-normal py-2 text-left"><Plus/><span>{translate(d.title)}</span></Button>)}</div>
 </div>;
}
export function DeviceProperties({entity:e,update,board="denky32"}:{entity:DeviceEntity;update:(e:DeviceEntity)=>void;board?:Project["board"]}){
  const { translate } = useLanguage();
 const d:DeviceDefinition=devices[e.device];
 const unavailable=deviceUnavailableReason(e.device,board);
 return <div className="space-y-4"><div className="panel-title">{translate("Properties · ")}{translate(d.title)}</div>{unavailable&&<p role="alert" className="text-xs text-destructive">{translate(unavailable)}</p>}<p className="text-xs leading-relaxed text-muted-foreground">{translate(d.description)}</p><label>{translate("ROS 2 topic")}<input placeholder={translate(d.topic)} value={e.topic} onChange={ev=>update({...e,topic:absoluteTopic(ev.target.value)})}/></label><label>{translate("Message type")}<input readOnly value={`${d.message==="Vector3"?"geometry_msgs":"std_msgs"} / ${d.message}`}/></label>
 {d.direction==="publisher"&&<label>{translate("Publishing period (ms)")}<input type="number" min={e.device==="dht11"?2000:20} value={e.period} onChange={ev=>update({...e,period:Number(ev.target.value)})}/></label>}
 {d.addresses&&<label>{translate("I2C address")}<select value={e.address} onChange={ev=>update({...e,address:Number(ev.target.value)})}>{d.addresses.map(a=><option key={a} value={a}>{translate("0x")}{translate(a.toString(16).toUpperCase())}</option>)}</select></label>}
 {d.pins.map(role=><label key={role.key}>{translate(role.label)}<select value={e.pins[role.key]} onChange={ev=>{const pin=Number(ev.target.value),led=boardProfile(board).builtInLed;update({...e,pins:{...e.pins,[role.key]:pin},...(["led","digital-output"].includes(e.device)&&led?.pin===pin?{activeLow:led.activeLow}:{})});}}>{role.optional&&<option value={-1}>{translate("Not connected")}</option>}{!(role.optional&&e.pins[role.key]===-1)&&!boardPins(board,role.mode).includes(e.pins[role.key])&&<option value={e.pins[role.key]} disabled>{translate("GPIO ")}{translate(e.pins[role.key])} {translate("· unavailable")}</option>}{(role.mode==="output"||role.mode==="pwm")&&!boardProfile(board).builtInLed&&<option disabled value="no_builtin">{translate("/led_builtin · unavailable")}</option>}{boardPins(board,role.mode).map(pin=><option key={pin} value={pin}>{translate(role.mode==="output"||role.mode==="pwm"?outputPinLabel(board,pin):`GPIO ${pin}`)}</option>)}</select></label>)}
 {e.device==="led"&&boardProfile(board).builtInLed&&<p className="rounded-lg border border-border bg-muted p-3 text-xs leading-relaxed">{translate(boardLedHint(board))}</p>}
 {["digital-input","digital-output","led","rgb-led","pwm-output","encoder"].includes(e.device)&&<label>{translate(e.device==="encoder"?"Reverse direction":"Polarity")}<select value={String(e.activeLow)} onChange={ev=>update({...e,activeLow:ev.target.value==="true"})}><option value="false">{translate("Normal")}</option><option value="true">{translate("Inverted / active low")}</option></select></label>}
 {["l298n","tb6612"].includes(e.device)&&<label>{translate("Watchdog (ms)")}<input type="number" min={50} max={5000} value={e.timeout} onChange={ev=>update({...e,timeout:Number(ev.target.value)})}/></label>}
 {d.note&&<p className="rounded-lg border border-border bg-muted p-3 text-xs leading-relaxed">{translate(d.note)}</p>}
 <p className="text-xs text-muted-foreground">{translate("Defaults are editable. Check them against your connected module.")}</p>
 </div>;
}
