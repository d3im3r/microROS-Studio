"use client";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, ArrowDownToLine, ArrowUpRight, CheckCircle2, ChevronDown, ChevronUp, ChevronRight, CircleHelp, Cpu, GitBranch, Layers3, Plus, Settings2, TriangleAlert, Wifi, X } from "lucide-react";
import { ThemeToggle, ThemeSelector } from "../theme";
import { Button } from "@/shared/ui/button";
import { useProject } from "../project";
import { defaultProject, handles, validateProject, type Entity, type Project } from "../program";
import { BoardHelp } from "../board-help";
import { ProjectWizard } from "../project-wizard";
import { allocateDevice } from "../device-catalog";
import { boardProfile, robotPins, entityCounts, type DeviceType } from "../program";
import { ElementHelp, NextSteps } from "../help";
import { EntityProperties } from "../properties";
import { VisualEditor } from "../visual-editor";
import { generateFiles } from "../code-generation";
import { CodePreview } from "../code-preview";
import { downloadFile } from "../export-files";

const REPO = "https://github.com/d3im3r/esp32-microros-template";
export function Studio() {
  const { project: p, setProject, ready, storageStatus } = useProject();
  const [wizardStep,setWizardStep]=useState(0);
  const [selected, setSelected] = useState<string | null>("counter");
  const [help, setHelp] = useState<"elements" | "next-steps" | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (help) dialogRef.current?.showModal(); }, [help]);
  const [codeVisible, setCodeVisible] = useState(true);
  const codeRef = useRef<HTMLDivElement>(null);
  const [revealCode, setRevealCode] = useState(0);
  useEffect(() => {
    if (!revealCode) return;
    codeRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [revealCode]);
  const [notice, setNotice] = useState("");
  const errors = useMemo(() => validateProject(p), [p]);
  const files = useMemo(() => errors.length ? null : generateFiles(p), [p, errors]);
  const entity = p.entities.find(e => e.id === selected);
  function update(patch: Partial<Project>) { setProject(previous => ({ ...previous, ...patch })); }
  function add(kind: "publisher" | "subscriber") {
    if (p.entities.length >= 12) return;
    const id = crypto.randomUUID();
    const profile=boardProfile(p.board),bus=p.i2c??profile.i2c;
    const used=new Set(p.entities.flatMap(e=>e.kind==="subscriber"?[e.pin]:e.kind==="device"?Object.values(e.pins):e.kind==="robot"?robotPins(e):[]));
    used.add(bus.sda);used.add(bus.scl);
    if(p.transport==="serial"||profile.family!=="esp32"){used.add(profile.uart.tx);used.add(profile.uart.rx);}
    const freePin=profile.output.find(pin=>!used.has(pin))??profile.output[0];
    let suffix = 1;
    const base = kind === "publisher" ? "/counter" : "/led";
    while (p.entities.some(e => e.topic === `${base}_${suffix}`)) suffix++;
    const next: Entity = kind === "publisher" ? { id, kind, topic: `${base}_${suffix}`, message: "Int32", behavior: "constant", period: 1000, value: 0 } : { id, kind, topic: `${base}_${suffix}`, pin: freePin, activeLow: false };
    update({ entities: [...p.entities, next] }); setSelected(id);
  }
  const { publishers: pubs, subscribers: subs, timers } = entityCounts(p);
  function addDevice(type:DeviceType) {
    const next=allocateDevice(type,p,crypto.randomUUID());
    update({entities:[...p.entities,next]});setSelected(next.id);
  }
  if (!ready) return <main className="grid min-h-screen place-items-center text-secondary dark:text-primary">Loading microROS Studio…</main>;
  return <div className="min-h-screen">
    <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border bg-card px-4 py-2 sm:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid size-8 shrink-0 place-items-center rounded-lg border border-primary/30 bg-primary/10 text-secondary dark:text-primary"><Cpu size={18} /></div>
        <div className="whitespace-nowrap text-base font-semibold tracking-tight">micro<span className="text-secondary dark:text-primary">ROS</span> <span className="font-normal text-muted-foreground">Studio</span></div>
        <span className="hidden rounded border border-border px-1.5 py-0.5 text-[9px] text-muted-foreground md:inline">BETA 0.1</span>
        <div className="flex shrink-0 items-center gap-2 border-l border-border pl-3">
          <span className="hidden text-[10px] text-muted-foreground lg:inline">created by:</span>
          <div aria-label="d3im3r signature" className="h-8 w-24 shrink-0"><Image src="/brand/d3im3r/horizontal-light.svg" alt="d3im3r" width={96} height={32} unoptimized className="h-8 w-24 dark:hidden"/><Image src="/brand/d3im3r/horizontal-dark.svg" alt="d3im3r" width={96} height={32} unoptimized className="hidden h-8 w-24 dark:block"/></div>
        </div>
      </div>
      <nav aria-label="Preferences and help" className="flex max-w-full items-center gap-2"><ThemeSelector /><ThemeToggle /><Button variant="outline" size="icon" className="shrink-0 shadow-sm" aria-label="Help" title="Help" onClick={() => setHelp("elements")}><CircleHelp /></Button><Button variant="outline" size="sm" className="shrink-0 px-2 sm:px-3" asChild><a href={REPO} target="_blank" rel="noreferrer" aria-label="Base project" title="Base project"><GitBranch /><span className="hidden sm:inline">Base project</span><ArrowUpRight className="hidden sm:block" /></a></Button></nav>
    </header>
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-6 py-4">
      <div><div className="mb-1 flex items-center gap-2 text-[10px] text-muted-foreground"><Layers3 size={12} />PROJECTS<ChevronRight size={12} /><span className="text-secondary dark:text-primary">EDITOR</span></div><h1 className="text-xl font-semibold tracking-tight">Build your micro-ROS node</h1><p className="mt-1 text-xs text-muted-foreground">Configure, connect and generate code for your ESP32.</p></div>
      <div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" disabled={!files} onClick={() => files && downloadFile("platformio.ini", files.ini)}><ArrowDownToLine />platformio.ini</Button><Button size="sm" disabled={!files} onClick={() => files && downloadFile("main.cpp", files.main)}><ArrowDownToLine />main.cpp</Button></div>
    </div>
    <div className="studio-grid grid lg:items-start grid-cols-[300px_minmax(340px,1fr)_290px]">
      <ProjectWizard project={p} update={update} addDevice={addDevice} select={setSelected} errors={errors} onStepChange={setWizardStep} nextSteps={()=>setHelp("next-steps")} showCode={()=>{setCodeVisible(true);setRevealCode(value=>value+1);}} reset={()=>{if(window.confirm("Replace your draft with the counter and LED example?")){setProject(structuredClone(defaultProject));setSelected("counter");setNotice("Example restored.");}}}/>
      <main className="min-w-0 w-full lg:self-start">
          <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-5 py-3"><div className="flex flex-wrap items-center gap-2"><Button variant="ghost" size="sm" aria-expanded={codeVisible} aria-controls="generated-code-panel" onClick={() => setCodeVisible(visible => !visible)}>{codeVisible ? <ChevronDown/> : <ChevronUp/>}{codeVisible ? "Hide code" : "Show code"}</Button><Button variant="outline" size="sm" disabled={p.entities.length >= 12 || pubs >= 10} onClick={() => add("publisher")}><Plus />Publisher + timer</Button><Button variant="outline" size="sm" disabled={p.entities.length >= 12 || subs >= 5} onClick={() => add("subscriber")}><Plus />Subscriber</Button>{wizardStep>0&&<BoardHelp board={p.board}/>}</div><span className="mono text-[10px] text-muted-foreground">{p.entities.length} entities · {handles(p)} handles</span></div>
          <div data-code-hidden={!codeVisible} className="canvas-wrap relative h-[420px] bg-card"><VisualEditor project={p} selected={selected} onSelect={setSelected} /><div className="pointer-events-none absolute left-4 top-4 flex items-center gap-2 rounded-md border border-border bg-card/90 px-3 py-2 text-[10px] text-muted-foreground"><span className="size-1.5 rounded-full bg-primary" />/{p.nodeName || "micro_ros_node"}<span className="text-muted-foreground">·</span>DOMAIN {p.domain}</div></div>
        <div ref={codeRef} id="generated-code-panel" className="scroll-mt-24" hidden={!codeVisible}><CodePreview files={files} /></div>
        <div aria-label="Configuration status" className="space-y-2 border-t border-border px-4 py-3">
          <div className="flex items-center gap-2 text-xs font-medium">{errors.length ? <TriangleAlert size={15} className="text-foreground" /> : <CheckCircle2 size={15} className="text-secondary dark:text-primary" />}{errors.length ? `${errors.length} pending adjustments` : "Valid configuration"}<span className="ml-auto text-[10px] text-muted-foreground">Limits: 10 publishers · 5 subscribers</span></div>
          {errors.length > 0 && <ul role="alert" className="space-y-1 rounded-lg bg-amber-500/5 p-3 text-xs text-foreground">{errors.map((e, i) => <li key={i}>{e}</li>)}</ul>}
          <p className="text-[11px] leading-relaxed text-muted-foreground">{p.transport === "wifi" && p.ssid === "YOUR_WIFI_SSID" ? "Replace YOUR_WIFI_SSID and enter the password before testing. " : ""}Configuration validated. Verify the connection and hardware on your ESP32.</p>
          {notice && <p role="status" className="text-xs text-secondary dark:text-primary">{notice}</p>}
        </div>
      </main>
      <aside className="border-l border-border bg-card p-5 lg:sticky lg:top-0 lg:max-h-[calc(100dvh-160px)] lg:overflow-y-auto">
        <div className="mb-6 space-y-3 border-b border-border pb-5"><span className="panel-title">Your program</span><div className="flex justify-between text-xs text-muted-foreground"><span>Publishers</span><span className="mono text-secondary dark:text-primary">{pubs}</span></div><div className="flex justify-between text-xs text-muted-foreground"><span>Subscribers</span><span className="mono text-secondary dark:text-chart-2">{subs}</span></div><div className="flex justify-between text-xs text-muted-foreground"><span>Timers</span><span className="mono">{timers}</span></div></div>
        {entity ? <EntityProperties board={p.board} entity={entity} update={next => update({ entities: p.entities.map(e => e.id === next.id ? next : e) })} remove={() => { update({ entities: p.entities.filter(e => e.id !== entity.id) }); setSelected(null); }} /> : <div className="py-12 text-center"><Settings2 className="mx-auto mb-4 text-muted-foreground" /><p className="text-xs text-muted-foreground">Select a diagram entity to edit its properties.</p></div>}
        <div className="mt-6 rounded-xl border border-primary/15 bg-primary/5 p-4"><div className="flex items-center gap-2 text-xs font-medium text-secondary dark:text-primary"><CircleHelp size={14} />Next steps</div><p className="my-3 text-[11px] leading-relaxed text-muted-foreground">Download the base project from GitHub and replace the two generated files.</p><button className="flex items-center gap-1 text-[11px] text-secondary dark:text-primary" onClick={() => setHelp("next-steps")}>View instructions<ChevronRight size={12} /></button></div>
      </aside>
    </div>
    <footer className="flex flex-wrap justify-between gap-3 border-t border-border px-6 py-3 text-[10px] text-muted-foreground"><span className="flex items-center gap-2"><Activity size={12} />{storageStatus}</span><span className="flex items-center gap-2"><Wifi size={12} />{p.transport === "wifi" ? "WiFi / UDP" : "USB / Serial"}<span>·</span>{boardProfile(p.board).title}<span>·</span>micro-ROS Humble</span></footer>
    {help && <dialog ref={dialogRef} onCancel={() => setHelp(null)} aria-labelledby="help-title" className="fixed inset-0 m-auto max-h-[95vh] w-full max-w-2xl border-0 bg-transparent p-4 text-foreground backdrop:bg-black/75" onClick={e => { if (e.target === e.currentTarget) setHelp(null); }} onKeyDown={e => { if (e.key === "Escape") setHelp(null); }}><section className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-2xl border border-border bg-card p-6"><div className="flex items-center justify-between"><h2 id="help-title" className="text-xl font-semibold">{help === "elements" ? "Element help" : "Next steps"}</h2><Button autoFocus variant="ghost" size="icon" aria-label={help === "elements" ? "Close help" : "Close instructions"} onClick={() => setHelp(null)}><X /></Button></div><div className="mt-6">{help === "elements" ? <ElementHelp /> : <NextSteps project={p} repository={REPO} />}</div></section></dialog>}
  </div>;
}
