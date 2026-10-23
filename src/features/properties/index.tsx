import { Trash2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { DeviceProperties } from "../device-catalog";
import { RobotProperties } from "../robot-catalog";
import { boardProfile, boardLedHint, outputPinLabel, absoluteTopic, type Project, type Entity } from "../program";
export function EntityProperties({ entity: e, update, remove, board = "denky32" }: { board?:Project["board"]; entity: Entity; update: (entity: Entity) => void; remove: () => void }) {
  if (e.kind === "device") return <div className="space-y-5"><DeviceProperties entity={e} update={update} board={board}/><Button variant="outline" className="w-full text-destructive" onClick={remove}><Trash2/>Delete entity</Button></div>;
  if (e.kind === "robot") return <div className="space-y-5"><RobotProperties entity={e} update={update} board={board} /><Button variant="outline" className="w-full text-destructive" onClick={remove}><Trash2 />Delete entity</Button></div>;
  return <div className="space-y-5">
    <div className="flex items-center justify-between"><span className="panel-title">Properties</span><span className={`rounded px-2 py-1 text-[10px] ${e.kind === "publisher" ? "bg-primary/10 text-secondary dark:text-primary" : "bg-chart-2/10 text-secondary dark:text-chart-2"}`}>{e.kind}</span></div>
    <label>ROS 2 topic<input placeholder="/topic" value={e.topic} onChange={ev => update({ ...e, topic: absoluteTopic(ev.target.value) })} /></label>
    {e.kind === "publisher" ? <>
      <label>Message type<select value={e.message} onChange={ev => update({ ...e, message: ev.target.value as typeof e.message, behavior: ev.target.value === "Int32" ? e.behavior : "constant", value: 0 })}><option>Int32</option><option>Float32</option><option>Bool</option><option>Vector3</option><option>Twist</option></select></label>
      <label>Publishing period (ms)<input type="number" min={10} max={3600000} value={e.period} onChange={ev => update({ ...e, period: Number(ev.target.value) })} /></label>
      <p className="text-xs leading-relaxed text-muted-foreground">The timer runs the behavior and publishes the message. It uses one executor handle.</p>
    </> : <>
      <label>Message type<input value="std_msgs / Bool" readOnly /></label>
      <label>Output GPIO<select value={e.pin} onChange={ev => {const pin=Number(ev.target.value),led=boardProfile(board).builtInLed;update({ ...e, pin,...(led?.pin===pin?{activeLow:led.activeLow}:{}) });}}>{!boardProfile(board).output.includes(e.pin)&&<option value={e.pin} disabled>GPIO {e.pin} · unavailable</option>}{!boardProfile(board).builtInLed&&<option disabled value="no_builtin">/led_builtin · unavailable</option>}{boardProfile(board).output.map(pin => <option key={pin} value={pin}>{outputPinLabel(board,pin)}</option>)}</select></label>
      {boardProfile(board).builtInLed&&<p className="rounded-lg border border-border bg-muted p-3 text-xs leading-relaxed">{boardLedHint(board)}</p>}
      <label>Polarity<select value={e.activeLow ? "low" : "high"} onChange={ev => update({ ...e, activeLow: ev.target.value === "low" })}><option value="high">Active high (HIGH)</option><option value="low">Active low (LOW)</option></select></label>
      <p className="text-xs leading-relaxed text-muted-foreground">true switches the output on and false switches it off. Initially off. Check your board wiring.</p>
    </>}
    <Button variant="outline" className="w-full text-destructive" onClick={remove}><Trash2 />Delete entity</Button>
  </div>;
}
