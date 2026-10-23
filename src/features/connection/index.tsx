import { boardProfile, type Project } from "../program";
export function ConnectionSettings({ project: p, update }: { project: Project; update: (patch: Partial<Project>) => void }) {
  const board=boardProfile(p.board);
  return <div className="space-y-4">
    <div className="panel-title">Connection</div>
    <div className="grid grid-cols-2 gap-2">{(["wifi", "serial"] as const).map(t => <button key={t} onClick={() => update({ transport: t })} className={`rounded-lg border p-2 text-xs ${p.transport === t ? "border-primary/50 bg-primary/10 text-secondary dark:text-primary" : "border-border text-muted-foreground"}`}>{t === "wifi" ? "WiFi / UDP" : "USB / Serial"}</button>)}</div>
    {p.transport === "wifi" ? <>
      <label>Network name (SSID)<input value={p.ssid} maxLength={32} onChange={e => update({ ssid: e.target.value })} placeholder="My WiFi network" /></label>
      <label>Password<input type="password" autoComplete="off" value={p.password} onChange={e => update({ password: e.target.value })} placeholder="Leave empty for an open network" /></label>
      <p className="text-[10px] leading-relaxed text-muted-foreground">The password is included in main.cpp but is not saved in the browser.</p>
      <div className="grid grid-cols-[1fr_80px] gap-2"><label>Agent IP<input value={p.agentIp} onChange={e => update({ agentIp: e.target.value })} /></label><label>Port<input type="number" value={8888} readOnly title="Fixed Agent UDP port: 8888" /></label></div>
    </> : <p className="rounded-lg border border-border bg-muted p-3 text-xs leading-relaxed text-muted-foreground">115200 baud. {board.family !== "esp32" ? `Use a 3.3 V USB–TTL adapter on TX${board.uart.tx}/RX${board.uart.rx} with a common GND. Native USB does not carry micro-ROS with this base firmware.` : "Close the serial monitor before starting the Agent; both use the same USB port."}</p>}
  </div>;
}
