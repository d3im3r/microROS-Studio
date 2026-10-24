"use client";
import { useLanguage } from "../language";
import { boardProfile, type Project } from "../program";
export function ConnectionSettings({ project: p, update }: { project: Project; update: (patch: Partial<Project>) => void }) {
  const { translate } = useLanguage();
  const board=boardProfile(p.board);
  return <div className="space-y-4">
    <div className="panel-title">{translate("Connection")}</div>
    <div className="grid grid-cols-2 gap-2">{(["wifi", "serial"] as const).map(t => <button key={t} onClick={() => update({ transport: t })} className={`rounded-lg border p-2 text-xs ${p.transport === t ? "border-primary/50 bg-primary/10 text-secondary dark:text-primary" : "border-border text-muted-foreground"}`}>{translate(t === "wifi" ? "WiFi / UDP" : "USB / Serial")}</button>)}</div>
    {p.transport === "wifi" ? <>
      <label>{translate("Network name (SSID)")}<input value={p.ssid} maxLength={32} onChange={e => update({ ssid: e.target.value })} placeholder={translate("My WiFi network")} /></label>
      <label>{translate("Password")}<input type="password" autoComplete="off" value={p.password} onChange={e => update({ password: e.target.value })} placeholder={translate("Leave empty for an open network")} /></label>
      <p className="text-[10px] leading-relaxed text-muted-foreground">{translate("The password is included in main.cpp but is not saved in the browser.")}</p>
      <div className="grid grid-cols-[1fr_80px] gap-2"><label>{translate("Agent IP")}<input value={p.agentIp} onChange={e => update({ agentIp: e.target.value })} /></label><label>{translate("Port")}<input type="number" value={8888} readOnly title={translate("Fixed Agent UDP port: 8888")} /></label></div>
    </> : <p className="rounded-lg border border-border bg-muted p-3 text-xs leading-relaxed text-muted-foreground">{translate("115200 baud. ")}{translate(board.family !== "esp32" ? `Use a 3.3 V USB–TTL adapter on TX${board.uart.tx}/RX${board.uart.rx} with a common GND. Native USB does not carry micro-ROS with this base firmware.` : "Close the serial monitor before starting the Agent; both use the same USB port.")}</p>}
  </div>;
}
