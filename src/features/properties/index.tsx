"use client";
import { useLanguage } from "../language";
import { Trash2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { DeviceProperties } from "../device-catalog";
import { RobotProperties } from "../robot-catalog";
import { boardProfile, boardLedHint, outputPinLabel, absoluteTopic, defaultGroupChannels, type Project, type Entity, type GroupEntity, type GroupChannel } from "../program";

export function GroupProperties({ entity: e, update, board = "denky32" }: { entity: GroupEntity; update: (e: GroupEntity) => void; board?: Project["board"] }) {
  const { translate } = useLanguage();
  const profile = boardProfile(board);
  const targetLabels: Record<string, string> = {
    servo: "Servo PWM (50 Hz)",
    pwm: "PWM Output (1 kHz)",
    digital: "Digital Output (On/Off)",
    disabled: "Disabled"
  };

  function changeMessage(msg: "Twist" | "Vector3") {
    if (msg === e.message) return;
    update({
      ...e,
      message: msg,
      channels: defaultGroupChannels(msg, profile.output)
    });
  }

  function updateChannel(index: number, patch: Partial<GroupChannel>) {
    const next = [...e.channels];
    next[index] = { ...next[index], ...patch };
    update({ ...e, channels: next });
  }

  return (
    <div className="space-y-4">
      <div className="panel-title">{translate("Properties · Actuator group")}</div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        {translate("Multi-actuator group subscriber. One ROS 2 topic controls multiple PWM and digital outputs simultaneously.")}
      </p>
      <label>
        {translate("ROS 2 topic")}
        <input
          placeholder="/actuators_cmd"
          value={e.topic}
          onChange={ev => update({ ...e, topic: absoluteTopic(ev.target.value) })}
        />
      </label>
      <label>
        {translate("Message type")}
        <select value={e.message} onChange={ev => changeMessage(ev.target.value as "Twist" | "Vector3")}>
          <option value="Twist">geometry_msgs / Twist (6 channels)</option>
          <option value="Vector3">geometry_msgs / Vector3 (3 channels)</option>
        </select>
      </label>
      <div className="space-y-3 pt-2">
        <div className="text-xs font-semibold text-foreground">{translate("Channel mappings")}</div>
        {e.channels.map((ch, idx) => (
          <div key={ch.field} className="rounded-lg border border-border bg-muted/50 p-2.5 space-y-2 text-xs">
            <div className="flex items-center justify-between font-mono font-medium text-foreground">
              <span>{ch.field}</span>
              <span className="text-[10px] text-muted-foreground">{translate(targetLabels[ch.target])}</span>
            </div>
            <label>
              {translate("Target actuator")}
              <select
                value={ch.target}
                onChange={ev => updateChannel(idx, { target: ev.target.value as GroupChannel["target"] })}
              >
                <option value="servo">{translate("Servo PWM (50 Hz)")}</option>
                <option value="pwm">{translate("PWM Output (1 kHz)")}</option>
                <option value="digital">{translate("Digital Output (On/Off)")}</option>
                <option value="disabled">{translate("Disabled")}</option>
              </select>
            </label>
            {ch.target !== "disabled" && (
              <label>
                {translate("Output GPIO")}
                <select
                  value={ch.pin}
                  onChange={ev => updateChannel(idx, { pin: Number(ev.target.value) })}
                >
                  {!profile.output.includes(ch.pin) && (
                    <option value={ch.pin} disabled>
                      GPIO {ch.pin} {translate("· unavailable")}
                    </option>
                  )}
                  {profile.output.map(pin => (
                    <option key={pin} value={pin}>
                      {translate(outputPinLabel(board, pin))}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {["pwm", "digital"].includes(ch.target) && (
              <label>
                {translate("Polarity")}
                <select
                  value={String(ch.activeLow)}
                  onChange={ev => updateChannel(idx, { activeLow: ev.target.value === "true" })}
                >
                  <option value="false">{translate("Normal")}</option>
                  <option value="true">{translate("Inverted / active low")}</option>
                </select>
              </label>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function EntityProperties({ entity: e, update, remove, board = "denky32" }: { board?:Project["board"]; entity: Entity; update: (entity: Entity) => void; remove: () => void }) {
  const { translate } = useLanguage();
  if (e.kind === "device") return <div className="space-y-5"><DeviceProperties entity={e} update={update} board={board}/><Button variant="outline" className="w-full text-destructive" onClick={remove}><Trash2/>{translate("Delete entity")}</Button></div>;
  if (e.kind === "robot") return <div className="space-y-5"><RobotProperties entity={e} update={update} board={board} /><Button variant="outline" className="w-full text-destructive" onClick={remove}><Trash2 />{translate("Delete entity")}</Button></div>;
  if (e.kind === "group") return <div className="space-y-5"><GroupProperties entity={e} update={update as (entity: GroupEntity) => void} board={board} /><Button variant="outline" className="w-full text-destructive" onClick={remove}><Trash2 />{translate("Delete entity")}</Button></div>;
  return <div className="space-y-5">
    <div className="flex items-center justify-between"><span className="panel-title">{translate("Properties")}</span><span className={`rounded px-2 py-1 text-[10px] ${e.kind === "publisher" ? "bg-primary/10 text-secondary dark:text-primary" : "bg-chart-2/10 text-secondary dark:text-chart-2"}`}>{translate(e.kind)}</span></div>
    <label>{translate("ROS 2 topic")}<input placeholder="/topic" value={e.topic} onChange={ev => update({ ...e, topic: absoluteTopic(ev.target.value) })} /></label>
    {e.kind === "publisher" ? <>
      <label>{translate("Message type")}<select value={e.message} onChange={ev => update({ ...e, message: ev.target.value as typeof e.message, behavior: ev.target.value === "Int32" ? e.behavior : "constant", value: 0 })}><option>{translate("Int32")}</option><option>{translate("Float32")}</option><option>{translate("Bool")}</option><option>{translate("Vector3")}</option><option>{translate("Twist")}</option></select></label>
      <label>{translate("Publishing period (ms)")}<input type="number" min={10} max={3600000} value={e.period} onChange={ev => update({ ...e, period: Number(ev.target.value) })} /></label>
      <p className="text-xs leading-relaxed text-muted-foreground">{translate("The timer runs the behavior and publishes the message. It uses one executor handle.")}</p>
    </> : <>
      <label>{translate("Message type")}<input value="std_msgs / Bool" readOnly /></label>
      <label>{translate("Output GPIO")}<select value={e.pin} onChange={ev => {const pin=Number(ev.target.value),led=boardProfile(board).builtInLed;update({ ...e, pin,...(led?.pin===pin?{activeLow:led.activeLow}:{}) });}}>{!boardProfile(board).output.includes(e.pin)&&<option value={e.pin} disabled>{translate("GPIO ")}{translate(e.pin)} {translate("· unavailable")}</option>}{!boardProfile(board).builtInLed&&<option disabled value="no_builtin">{translate("/led_builtin · unavailable")}</option>}{boardProfile(board).output.map(pin => <option key={pin} value={pin}>{translate(outputPinLabel(board,pin))}</option>)}</select></label>
      {boardProfile(board).builtInLed&&<p className="rounded-lg border border-border bg-muted p-3 text-xs leading-relaxed">{translate(boardLedHint(board))}</p>}
      <label>{translate("Polarity")}<select value={e.activeLow ? "low" : "high"} onChange={ev => update({ ...e, activeLow: ev.target.value === "low" })}><option value="high">{translate("Active high (HIGH)")}</option><option value="low">{translate("Active low (LOW)")}</option></select></label>
      <p className="text-xs leading-relaxed text-muted-foreground">{translate("true switches the output on and false switches it off. Initially off. Check your board wiring.")}</p>
    </>}
    <Button variant="outline" className="w-full text-destructive" onClick={remove}><Trash2 />{translate("Delete entity")}</Button>
  </div>;
}
