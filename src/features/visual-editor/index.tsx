"use client";
import { useLanguage } from "../language";

import { useEffect, useRef, useState } from "react";
import { Background, Panel, PanOnScrollMode, Handle, Position, ReactFlow, applyNodeChanges, type Node, type NodeProps, type NodeChange, type ReactFlowInstance } from "@xyflow/react";
import { Radio, Timer, Cpu, Lightbulb, TriangleAlert, ZoomIn, ZoomOut, Maximize2, Minimize2, Focus, Layers, LayoutGrid } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { useTheme } from "../theme";
import { entityDirection, entityMessage, entityTitle, devices, validateEntityIssues, defaultGroupChannels, boardProfile, boardPins, type GroupEntity, type GroupChannel, type Entity } from "../program";
import type { Project } from "../program";

function GroupNode({ data, selected }: NodeProps) {
  const { translate } = useLanguage();
  const entity = data.entity as GroupEntity;
  const project = data.project as Project;
  const onUpdate = data.onUpdate as ((entity: GroupEntity) => void) | undefined;
  const profile = boardProfile(project.board);
  const isPub = (entity.direction ?? "subscriber") === "publisher";
  const hasError = Boolean(data.hasError);
  const errorText = data.errorText ? String(data.errorText) : "";
  const color = hasError ? "var(--destructive)" : selected ? "var(--primary)" : "var(--border)";

  function toggleDirection(newDir: "publisher" | "subscriber") {
    if (!onUpdate || newDir === (entity.direction ?? "subscriber")) return;
    const defaultTopic = newDir === "publisher" ? "/sensors_data" : "/actuators_cmd";
    onUpdate({
      ...entity,
      direction: newDir,
      topic: defaultTopic,
      period: newDir === "publisher" ? (entity.period ?? 100) : entity.period,
      channels: defaultGroupChannels(entity.message, newDir, profile[newDir === "publisher" ? "adc" : "output"])
    });
  }

  function changeMsg(msg: "Twist" | "Vector3") {
    if (!onUpdate || msg === entity.message) return;
    const dir = entity.direction ?? "subscriber";
    onUpdate({
      ...entity,
      message: msg,
      channels: defaultGroupChannels(msg, dir, profile[dir === "publisher" ? "adc" : "output"])
    });
  }

  function changeChannelSource(idx: number, source: GroupChannel["source"]) {
    if (!onUpdate) return;
    const next = [...entity.channels];
    let pin = next[idx].pin;
    let echoPin = next[idx].echoPin;
    if (source === "internal-temperature") {
      pin = -1;
    } else if (source === "touch") {
      const touchPins = boardPins(project.board, "touch");
      if (!touchPins.includes(pin)) pin = touchPins[0] ?? pin;
    } else if (source === "adc" || source === "lm35") {
      if (!profile.adc.includes(pin)) pin = profile.adc[0] ?? pin;
    } else if (source === "hcsr04") {
      if (!profile.output.includes(pin)) pin = profile.output[0] ?? pin;
      if (echoPin === undefined || !profile.input.includes(echoPin)) echoPin = profile.input[0] ?? 4;
    } else if (source === "digital") {
      if (!profile.input.includes(pin)) pin = profile.input[0] ?? pin;
    }
    next[idx] = { ...next[idx], source, pin, echoPin };
    onUpdate({ ...entity, channels: next });
  }

  function changeChannelEchoPin(idx: number, echoPin: number) {
    if (!onUpdate) return;
    const next = [...entity.channels];
    next[idx] = { ...next[idx], echoPin };
    onUpdate({ ...entity, channels: next });
  }

  function changeChannelTarget(idx: number, target: GroupChannel["target"]) {
    if (!onUpdate) return;
    const next = [...entity.channels];
    next[idx] = { ...next[idx], target };
    onUpdate({ ...entity, channels: next });
  }

  function changeChannelPin(idx: number, pin: number) {
    if (!onUpdate) return;
    const next = [...entity.channels];
    next[idx] = { ...next[idx], pin };
    onUpdate({ ...entity, channels: next });
  }

  return (
    <div
      data-conflict={hasError ? "true" : undefined}
      title={hasError ? translate(errorText) : undefined}
      style={{ borderColor: color, width: 340 }}
      className="rounded-xl border-2 bg-card/95 shadow-xl backdrop-blur-sm"
    >
      {!isPub && <Handle type="target" position={Position.Left} />}
      <div className="flex items-center justify-between border-b border-border bg-muted/40 px-3 py-2">
        <div className="flex items-center gap-1.5">
          <Layers size={15} className={isPub ? "text-primary" : "text-secondary dark:text-primary"} />
          <select
            className="nodrag nopan rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] font-bold text-foreground"
            value={isPub ? "publisher" : "subscriber"}
            onChange={e => toggleDirection(e.target.value as "publisher" | "subscriber")}
          >
            <option value="subscriber">DEMUX · OUT</option>
            <option value="publisher">MUX · IN</option>
          </select>
          {hasError && <TriangleAlert size={13} className="text-destructive shrink-0" />}
        </div>
        <select
          className="nodrag nopan rounded border border-border bg-background px-2 py-0.5 font-mono text-[10px] text-foreground"
          value={entity.message}
          onChange={e => changeMsg(e.target.value as "Twist" | "Vector3")}
        >
          <option value="Twist">Twist</option>
          <option value="Vector3">Vector3</option>
        </select>
      </div>

      <div className="border-b border-border px-3.5 py-1.5 flex items-center justify-between text-[10px]">
        <span className="font-mono font-medium text-foreground truncate max-w-[170px]" title={entity.topic}>
          {entity.topic}
        </span>
        <span className="text-muted-foreground">
          {entity.channels.filter(c => isPub ? (c.source && c.source !== "disabled") : (c.target && c.target !== "disabled")).length} {translate("active")}
        </span>
      </div>

      <div className="p-2 space-y-1.5 max-h-[220px] overflow-y-auto">
        {entity.channels.map((ch, idx) => {
          const isDisabled = isPub ? (!ch.source || ch.source === "disabled") : (!ch.target || ch.target === "disabled");
          return (
            <div
              key={ch.field}
              className={`flex items-center justify-between gap-1.5 rounded-md border p-1 text-[11px] ${
                isDisabled
                  ? "border-dashed border-border/50 bg-muted/20 opacity-50"
                  : "border-border bg-background shadow-xs"
              }`}
            >
              <span className="font-mono text-[10px] font-medium text-foreground min-w-[55px] truncate" title={ch.field}>
                {ch.field}
              </span>

              {isPub ? (
                <>
                  <select
                    className="nodrag nopan rounded border border-border bg-muted/50 px-1 py-0.5 text-[10px] text-foreground"
                    value={ch.source ?? "disabled"}
                    onChange={e => changeChannelSource(idx, e.target.value as GroupChannel["source"])}
                  >
                    <option value="adc">{translate("ADC (Analog)")}</option>
                    <option value="digital">{translate("Digital In")}</option>
                    <option value="lm35">{translate("LM35 (°C)")}</option>
                    <option value="touch">{translate("Touch")}</option>
                    <option value="internal-temperature">{translate("Internal Temp")}</option>
                    <option value="hcsr04">{translate("HC-SR04 (m)")}</option>
                    <option value="disabled">{translate("Disabled")}</option>
                  </select>
                  {ch.source === "internal-temperature" ? (
                    <span className="text-[10px] text-muted-foreground italic px-1.5">—</span>
                  ) : ch.source === "hcsr04" ? (
                    <div className="flex items-center gap-1">
                      <select
                        title={translate("Trigger GPIO")}
                        className="nodrag nopan rounded border border-border bg-muted/50 px-1 py-0.5 font-mono text-[10px] text-foreground"
                        value={ch.pin}
                        onChange={e => changeChannelPin(idx, Number(e.target.value))}
                      >
                        {profile.output.map(pin => (
                          <option key={pin} value={pin}>T:{pin}</option>
                        ))}
                      </select>
                      <select
                        title={translate("Echo GPIO")}
                        className="nodrag nopan rounded border border-border bg-muted/50 px-1 py-0.5 font-mono text-[10px] text-foreground"
                        value={ch.echoPin ?? profile.input[0]}
                        onChange={e => changeChannelEchoPin(idx, Number(e.target.value))}
                      >
                        {profile.input.map(pin => (
                          <option key={pin} value={pin}>E:{pin}</option>
                        ))}
                      </select>
                    </div>
                  ) : ch.source && ch.source !== "disabled" ? (
                    <select
                      className="nodrag nopan rounded border border-border bg-muted/50 px-1 py-0.5 font-mono text-[10px] text-foreground"
                      value={ch.pin}
                      onChange={e => changeChannelPin(idx, Number(e.target.value))}
                    >
                      {(ch.source === "adc" || ch.source === "lm35" ? profile.adc : ch.source === "touch" ? boardPins(project.board, "touch") : profile.input).map(pin => (
                        <option key={pin} value={pin}>
                          GPIO {pin}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-[10px] text-muted-foreground italic px-1.5">—</span>
                  )}
                </>
              ) : (
                <>
                  <select
                    className="nodrag nopan rounded border border-border bg-muted/50 px-1 py-0.5 text-[10px] text-foreground"
                    value={ch.target ?? "disabled"}
                    onChange={e => changeChannelTarget(idx, e.target.value as GroupChannel["target"])}
                  >
                    <option value="servo">{translate("Servo (50 Hz)")}</option>
                    <option value="pwm">{translate("PWM (1 kHz)")}</option>
                    <option value="digital">{translate("Digital")}</option>
                    <option value="buzzer">{translate("Buzzer (Hz)")}</option>
                    <option value="disabled">{translate("Disabled")}</option>
                  </select>
                  {ch.target && ch.target !== "disabled" ? (
                    <select
                      className="nodrag nopan rounded border border-border bg-muted/50 px-1 py-0.5 font-mono text-[10px] text-foreground"
                      value={ch.pin}
                      onChange={e => changeChannelPin(idx, Number(e.target.value))}
                    >
                      {profile.output.map(pin => (
                        <option key={pin} value={pin}>
                          GPIO {pin}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-[10px] text-muted-foreground italic px-1.5">—</span>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
      {isPub && <Handle type="source" position={Position.Right} />}
    </div>
  );
}

function ProgramNode({ data, selected }: NodeProps) {
  const { translate } = useLanguage();
  const kind = data.kind as string;
  const hasError = Boolean(data.hasError);
  const errorText = data.errorText ? String(data.errorText) : "";
  const Icon = kind === "timer" ? Timer : kind === "gpio" ? Lightbulb : kind === "node" ? Cpu : Radio;
  const color = hasError ? "var(--destructive)" : kind === "subscriber" || kind === "gpio" ? "var(--diagram-output-accent, var(--secondary))" : "var(--ring)";
  return <div data-conflict={hasError ? "true" : undefined} title={hasError ? translate(errorText) : undefined} style={{ borderColor: hasError ? "var(--destructive)" : selected ? color : "var(--border)", width: 214 }} className="border bg-card shadow-xl">
    {kind !== "timer" && kind !== "subscriber" && <Handle type="target" position={Position.Left} />}
    <div className="flex items-center gap-2 border-b border-border px-4 py-3"><Icon size={15} style={{ color }} /><span className="text-[10px] font-bold tracking-widest" style={{ color }}>{translate(String(data.label))}</span>{hasError && <TriangleAlert size={13} aria-label={translate("Conflict")} className="ml-auto shrink-0 text-destructive" />}</div>
    <div className="px-4 py-3"><div className="mono break-words text-sm text-foreground">{translate(String(data.title))}</div><div className="mt-1.5 break-words text-[11px] text-muted-foreground">{translate(String(data.detail))}</div></div>
    {kind !== "gpio" && kind !== "publisher" && kind !== "node" && <Handle type="source" position={Position.Right} />}
  </div>;
}
function buildDefaultNodes(project: Project, selected: string | null, onUpdate?: (entity: Entity) => void): Node[] {
  const next: Node[] = [];
  const entityIssues = validateEntityIssues(project);
  let currentY = 45;
  project.entities.forEach((entity) => {
    const y = currentY;
    currentY += entity.kind === "group" ? 280 : 165;
    const pub = entityDirection(entity) === "publisher";
    const issues = entityIssues[entity.id] ?? [];
    const hasError = issues.length > 0;
    const errorText = issues.join(" · ");

    if (entity.kind === "group") {
      next.push({
        id: entity.id,
        type: "program",
        position: { x: pub ? 410 : 55, y },
        selected: entity.id === selected,
        data: {
          kind: pub ? "publisher" : "subscriber",
          label: pub ? "PUBLISHER" : "SUBSCRIBER",
          title: entity.topic,
          detail: `geometry_msgs / ${entity.message}`,
          hasError,
          errorText
        }
      });
      next.push({
        id: `${entity.id}:behavior`,
        type: "group",
        position: { x: pub ? 55 : 350, y },
        selected: entity.id === selected,
        data: {
          entity,
          project,
          onUpdate,
          hasError,
          errorText
        }
      });
    } else {
      next.push({
        id: entity.id,
        type: "program",
        position: { x: pub ? 380 : 55, y },
        selected: entity.id === selected,
        data: {
          kind: pub ? "publisher" : "subscriber",
          label: pub ? "PUBLISHER" : "SUBSCRIBER",
          title: entity.topic,
          detail: `${["Vector3", "Twist"].includes(entityMessage(entity)) ? "geometry_msgs" : "std_msgs"} / ${entityMessage(entity)}`,
          hasError,
          errorText
        }
      });
      next.push({
        id: `${entity.id}:behavior`,
        type: "program",
        position: { x: pub ? 55 : 380, y },
        data: {
          ...(entity.kind === "device"
            ? {
                kind: pub ? "timer" : "gpio",
                label: pub ? "INPUT + TIMER" : "OUTPUT",
                title: entityTitle(entity),
                detail:
                  entity.address !== undefined
                    ? `I2C 0x${entity.address.toString(16).toUpperCase()}`
                    : devices[entity.device].pins.map(role => `${role.label}: ${entity.pins[role.key] === -1 ? "Not connected" : entity.pins[role.key]}`).join(" · ")
              }
            : entity.kind === "robot"
            ? {
                kind: pub ? "timer" : "gpio",
                label: "BEHAVIOR",
                title: entityTitle(entity),
                detail: entity.behavior === "differential" ? `→ ${entity.outputTopic}` : pub ? `${entity.period} ms` : `Watchdog ${entity.timeout} ms`
              }
            : entity.kind === "publisher"
            ? {
                kind: "timer",
                label: "TIMER + BEHAVIOR",
                title: `${entity.period} ms`,
                detail: entity.behavior === "counter" ? "Counter · 1, 2, 3…" : "Publish message"
              }
            : {
                kind: "gpio",
                label: "DIGITAL OUTPUT",
                title: `GPIO ${entity.pin}`,
                detail: "true: on · false: off"
              }),
          hasError,
          errorText
        }
      });
    }
  });
  if (!next.length) {
    next.push({ id: "empty", type: "program", position: { x: 210, y: 140 }, data: { kind: "node", label: "ROS 2 NODE", title: project.nodeName, detail: "Add an entity to get started" } });
  }
  return next;
}

export function VisualEditor({ project, selected, onSelect, onUpdate }: { project: Project; selected: string | null; onSelect: (id: string | null) => void; onUpdate?: (entity: Entity) => void }) {
  const { translate } = useLanguage();
  const { theme } = useTheme();
  // Keep the registry stable across renders and development Fast Refresh.
  const [nodeTypes] = useState(() => ({ program: ProgramNode, group: GroupNode }));
  const container = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    // React Flow must never mount with unresolved percentage dimensions.
    const measure = () => {
      const width = element.clientWidth;
      const height = element.clientHeight;
      setSize(previous => previous.width === width && previous.height === height ? previous : { width, height });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const [flow, setFlow] = useState<ReactFlowInstance | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [zoom, setZoom] = useState(1);
  useEffect(() => {
    const element = container.current;
    if (!element || !flow) return;
    let shiftPressed = false;
    function trackShift(event: KeyboardEvent) { shiftPressed = event.shiftKey; }
    function resetShift() { shiftPressed = false; }
    function shiftScroll(event: WheelEvent) {
      if (event.ctrlKey || event.metaKey) return;
      const horizontalWheel = Math.abs(event.deltaX) > Math.abs(event.deltaY);
      if (!event.shiftKey && !shiftPressed && !horizontalWheel) return;
      if ((event.target as Element).closest?.(".react-flow__panel")) return;
      // Shift may arrive as deltaX without shiftKey, depending on browser and device.
      event.preventDefault();
      event.stopPropagation();
      const delta = horizontalWheel ? event.deltaX : event.deltaY;
      const unit = event.deltaMode === 1 ? 20 : event.deltaMode === 2 ? element!.clientHeight : 1;
      const viewport = flow!.getViewport();
      void flow!.setViewport({ ...viewport, x: viewport.x - delta * unit * .5 });
    }
    document.addEventListener("keydown", trackShift);
    document.addEventListener("keyup", trackShift);
    window.addEventListener("blur", resetShift);
    element.addEventListener("wheel", shiftScroll, { capture: true, passive: false });
    return () => {
      document.removeEventListener("keydown", trackShift);
      document.removeEventListener("keyup", trackShift);
      window.removeEventListener("blur", resetShift);
      element.removeEventListener("wheel", shiftScroll, true);
    };
  }, [flow]);
  useEffect(() => {
    function syncFullscreen() {
      if (!document.fullscreenElement) {
        setExpanded(false);
      }
    }
    document.addEventListener("fullscreenchange", syncFullscreen);
    return () => document.removeEventListener("fullscreenchange", syncFullscreen);
  }, []);
  useEffect(() => {
    if (!expanded) return;
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape" || event.code === "Escape" || event.keyCode === 27) {
        setExpanded(false);
        if (typeof document !== "undefined" && document.fullscreenElement) {
          void document.exitFullscreen().catch(() => {});
        }
      }
    }
    window.addEventListener("keydown", escape, { capture: true });
    return () => {
      document.body.style.overflow = before;
      window.removeEventListener("keydown", escape, { capture: true });
    };
  }, [expanded]);
  useEffect(() => {
    if (!flow) return;
    let second = 0;
    const first = requestAnimationFrame(() => { second = requestAnimationFrame(() => { void flow.fitView({ padding: .18, minZoom: .08, maxZoom: 1.5 }); }); });
    return () => { cancelAnimationFrame(first); cancelAnimationFrame(second); };
  }, [expanded, flow, size.width, size.height]);
  async function toggleFullscreen() {
    if (expanded) {
      setExpanded(false);
      if (typeof document !== "undefined" && document.fullscreenElement) {
        await document.exitFullscreen().catch(() => {});
      }
    } else {
      setExpanded(true);
      // CSS provides the same expanded view if browser fullscreen is unavailable.
      await container.current?.requestFullscreen?.().catch(() => {});
    }
  }
  const [nodes, setNodes] = useState<Node[]>([]);
  useEffect(() => {
    const next = buildDefaultNodes(project, selected, onUpdate);
    setNodes(previous => next.map(n => ({ ...n, position: previous.find(p => p.id === n.id)?.position ?? n.position })));
  }, [project, selected, onUpdate]);

  function autoArrange() {
    const next = buildDefaultNodes(project, selected, onUpdate);
    setNodes(next);
    setTimeout(() => {
      void flow?.fitView({ padding: 0.18, minZoom: 0.08, maxZoom: 1.5, duration: 200 });
    }, 20);
  }
  const entityIssues = validateEntityIssues(project);
  const edges = project.entities.map(e => ({ id: `edge-${e.id}`, source: (entityDirection(e) === "publisher") ? `${e.id}:behavior` : e.id, target: (entityDirection(e) === "publisher") ? e.id : `${e.id}:behavior`, animated: true, style: { stroke: entityIssues[e.id]?.length ? "var(--destructive)" : (entityDirection(e) === "publisher") ? "var(--ring)" : "var(--diagram-output-accent, var(--secondary))" } }));
  function change(changes: NodeChange[]) { setNodes(n => applyNodeChanges(changes, n)); }
  return <div ref={container} data-expanded={expanded} aria-label={translate("Program diagram")} className={expanded ? "diagram-fullscreen bg-card" : "absolute inset-0 min-h-0 min-w-0 bg-card"}>
  {size.width > 0 && size.height > 0 && <ReactFlow style={{ width: size.width, height: size.height }} onInit={setFlow} onMove={(_,viewport)=>setZoom(viewport.zoom)} panOnScroll panOnScrollMode={PanOnScrollMode.Vertical} zoomOnScroll={false} zoomOnPinch zoomActivationKeyCode="Control" preventScrolling nodes={nodes} edges={edges} onNodesChange={change} nodeTypes={nodeTypes} onNodeClick={(_, n) => onSelect(n.id.replace(":behavior", ""))} onPaneClick={() => onSelect(null)} nodesConnectable={false} deleteKeyCode={null} fitView minZoom={.08} maxZoom={2} colorMode={theme}>
    <Background color="var(--border)" gap={22} size={1} />
    <Panel position="bottom-right" style={{ left: "auto", right: 8, top: "auto", bottom: 8, margin: 0 }}><div role="group" aria-label={translate("Diagram controls")} className="flex items-center gap-1 rounded-lg border border-border bg-card/95 p-1 shadow-sm"><div className="flex items-center gap-1">
      <Button variant="ghost" size="icon" aria-label={translate("Zoom in diagram")} title={translate("Zoom in")} disabled={!flow || zoom >= 2} onClick={()=>void flow?.zoomIn({duration:150})}><ZoomIn/></Button>
      <Button variant="ghost" size="icon" aria-label={translate("Zoom out diagram")} title={translate("Zoom out")} disabled={!flow || zoom <= .08} onClick={()=>void flow?.zoomOut({duration:150})}><ZoomOut/></Button>
      <span aria-label={translate("Zoom level")} className="mono min-w-10 text-center text-xs text-muted-foreground">{translate(Math.round(zoom*100))}{translate("%")}</span></div>
      <Button variant="ghost" size="icon" aria-label={translate("Fit diagram")} title={translate("Fit all blocks")} onClick={()=>void flow?.fitView({padding:.18,minZoom:.08,maxZoom:1.5,duration:200})}><Focus/></Button>
      <Button variant="ghost" size="icon" aria-label={translate("Auto-arrange diagram")} title={translate("Auto-arrange diagram")} onClick={autoArrange}><LayoutGrid/></Button>
      <Button variant="ghost" size="icon" aria-label={translate(expanded?"Exit fullscreen":"Fullscreen diagram")} title={translate(expanded?"Exit fullscreen (Esc)":"Fullscreen")} onClick={()=>void toggleFullscreen()}>{expanded?<Minimize2/>:<Maximize2/>}</Button>
    </div></Panel>
    <Panel position="top-right" className="pointer-events-none !m-2"><span className="block max-w-[calc(100vw-48px)] rounded bg-card/90 px-2 py-1 text-right text-[10px] text-muted-foreground">{translate("Scroll ↑↓ · Ctrl + scroll: zoom · Shift + scroll ↔")}</span></Panel>
  </ReactFlow>}</div>;
}
