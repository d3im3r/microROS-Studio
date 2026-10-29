"use client";
import { useLanguage } from "../language";

import { useEffect, useRef, useState } from "react";
import { Background, Panel, PanOnScrollMode, Handle, Position, ReactFlow, applyNodeChanges, type Node, type NodeProps, type NodeChange, type ReactFlowInstance } from "@xyflow/react";
import { Radio, Timer, Cpu, Lightbulb, TriangleAlert, ZoomIn, ZoomOut, Maximize2, Minimize2, Focus } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { useTheme } from "../theme";
import { entityDirection, entityMessage, entityTitle, devices, validateEntityIssues } from "../program";
import type { Project } from "../program";

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
export function VisualEditor({ project, selected, onSelect }: { project: Project; selected: string | null; onSelect: (id: string | null) => void }) {
  const { translate } = useLanguage();
  const { theme } = useTheme();
  // Keep the registry stable across renders and development Fast Refresh.
  const [nodeTypes] = useState(() => ({ program: ProgramNode }));
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
    function syncFullscreen() { setExpanded(document.fullscreenElement === container.current); }
    document.addEventListener("fullscreenchange", syncFullscreen);
    return () => document.removeEventListener("fullscreenchange", syncFullscreen);
  }, []);
  useEffect(() => {
    if (!expanded) return;
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setExpanded(false);
        if (document.fullscreenElement === container.current) void document.exitFullscreen().catch(() => {});
      }
    }
    document.addEventListener("keydown", escape);
    return () => { document.body.style.overflow = before; document.removeEventListener("keydown", escape); };
  }, [expanded]);
  useEffect(() => {
    if (!flow) return;
    let second = 0;
    const first = requestAnimationFrame(() => { second = requestAnimationFrame(() => { void flow.fitView({ padding: .18, minZoom: .08, maxZoom: 1.5 }); }); });
    return () => { cancelAnimationFrame(first); cancelAnimationFrame(second); };
  }, [expanded, flow, size.width, size.height]);
  async function toggleFullscreen() {
    if (expanded) {
      if (document.fullscreenElement === container.current) await document.exitFullscreen().catch(() => {});
      setExpanded(false);
    } else {
      setExpanded(true);
      // CSS provides the same expanded view if browser fullscreen is unavailable.
      await container.current?.requestFullscreen?.().catch(() => {});
    }
  }
  const [nodes, setNodes] = useState<Node[]>([]);
  useEffect(() => {
    const next: Node[] = [];
    const entityIssues = validateEntityIssues(project);
    project.entities.forEach((entity, index) => {
      const y = index * 165 + 45;
      const pub = entityDirection(entity) === "publisher";
      const issues = entityIssues[entity.id] ?? [];
      const hasError = issues.length > 0;
      const errorText = issues.join(" · ");
      next.push({ id: entity.id, type: "program", position: { x: pub ? 380 : 55, y }, selected: entity.id === selected,
        data: { kind: pub ? "publisher" : "subscriber", label: pub ? "PUBLISHER" : "SUBSCRIBER", title: entity.topic, detail: `${["Vector3", "Twist"].includes(entityMessage(entity)) ? "geometry_msgs" : "std_msgs"} / ${entityMessage(entity)}`, hasError, errorText } });
      next.push({ id: `${entity.id}:behavior`, type: "program", position: { x: pub ? 55 : 380, y },
        data: { ...(entity.kind === "device" ? { kind: pub ? "timer" : "gpio", label: pub ? "INPUT + TIMER" : "OUTPUT", title: entityTitle(entity), detail: entity.address !== undefined ? `I2C 0x${entity.address.toString(16).toUpperCase()}` : devices[entity.device].pins.map(role=>`${role.label}: ${entity.pins[role.key]===-1?"Not connected":entity.pins[role.key]}`).join(" · ") } : entity.kind === "robot" ? {kind:pub?"timer":"gpio",label:"BEHAVIOR",title:entityTitle(entity),detail:entity.behavior === "differential"?`→ ${entity.outputTopic}`:pub?`${entity.period} ms`:`Watchdog ${entity.timeout} ms`} : entity.kind === "publisher" ? {kind:"timer",label:"TIMER + BEHAVIOR",title:`${entity.period} ms`,detail:entity.behavior === "counter"?"Counter · 1, 2, 3…":"Publish message"} : {kind:"gpio",label:"DIGITAL OUTPUT",title:`GPIO ${entity.pin}`,detail:"true: on · false: off"}), hasError, errorText } });
    });
    if (!next.length) next.push({ id: "empty", type: "program", position: { x: 210, y: 140 }, data: { kind: "node", label: "ROS 2 NODE", title: project.nodeName, detail: "Add an entity to get started" } });
    setNodes(previous => next.map(n => ({ ...n, position: previous.find(p => p.id === n.id)?.position ?? n.position })));
  }, [project, selected]);
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
      <Button variant="ghost" size="icon" aria-label={translate(expanded?"Exit fullscreen":"Fullscreen diagram")} title={translate(expanded?"Exit fullscreen (Esc)":"Fullscreen")} onClick={()=>void toggleFullscreen()}>{expanded?<Minimize2/>:<Maximize2/>}</Button>
    </div></Panel>
    <Panel position="top-right" className="pointer-events-none !m-2"><span className="block max-w-[calc(100vw-48px)] rounded bg-card/90 px-2 py-1 text-right text-[10px] text-muted-foreground">{translate("Scroll ↑↓ · Ctrl + scroll: zoom · Shift + scroll ↔")}</span></Panel>
  </ReactFlow>}</div>;
}
