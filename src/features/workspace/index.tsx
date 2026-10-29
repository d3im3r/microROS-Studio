"use client";
import { useLanguage } from "../language";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  Activity,
  ArrowDownToLine,
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  CircleHelp,
  Cpu,
  FileJson,
  GitBranch,
  Layers3,
  Plus,
  Settings2,
  TriangleAlert,
  Upload,
  Wifi,
  X,
} from "lucide-react";
import { LanguageToggle } from "../language";
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
import { downloadFile, exportProjectJson } from "../export-files";
import { ProtectedStudio, UserSessionControl, type AuthUser } from "../auth";

const TEMPLATE_DOWNLOAD_URL = "https://github.com/d3im3r/microROS-Studio/releases/download/v1.0.0/esp32-microros-template.zip";

export function Studio({ e2eDefaultAuth = false }: { e2eDefaultAuth?: boolean }) {
  return (
    <ProtectedStudio e2eDefaultAuth={e2eDefaultAuth}>
      {({ user, signOutUser }) => <StudioWorkspace user={user} signOutUser={signOutUser} />}
    </ProtectedStudio>
  );
}

function StudioWorkspace({ user, signOutUser }: { user: AuthUser; signOutUser: () => Promise<void> }) {
  const { translate } = useLanguage();
  const { project: p, setProject, ready, importProjectJson, storageStatus } = useProject();
  const [wizardStep, setWizardStep] = useState(0);
  const [selected, setSelected] = useState<string | null>("counter");
  const [help, setHelp] = useState<"elements" | "next-steps" | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (help) dialogRef.current?.showModal();
  }, [help]);

  const [platformioEnabled, setPlatformioEnabled] = useState(false);
  const [codeVisible, setCodeVisible] = useState(true);
  const codeRef = useRef<HTMLDivElement>(null);
  const [revealCode, setRevealCode] = useState(0);

  useEffect(() => {
    if (!revealCode) return;
    codeRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [revealCode]);

  const [notice, setNotice] = useState("");
  const errors = useMemo(() => validateProject(p), [p]);
  const files = useMemo(() => (errors.length ? null : generateFiles(p)), [p, errors]);
  const entity = p.entities.find(e => e.id === selected);

  function update(patch: Partial<Project>) {
    setProject(previous => ({ ...previous, ...patch }));
  }

  function add(kind: "publisher" | "subscriber") {
    if (p.entities.length >= 12) return;
    const id = crypto.randomUUID();
    const profile = boardProfile(p.board);
    const bus = p.i2c ?? profile.i2c;
    const used = new Set(
      p.entities.flatMap(e =>
        e.kind === "subscriber" ? [e.pin] : e.kind === "device" ? Object.values(e.pins) : e.kind === "robot" ? robotPins(e) : []
      )
    );
    used.add(bus.sda);
    used.add(bus.scl);
    if (p.transport === "serial" || profile.family !== "esp32") {
      used.add(profile.uart.tx);
      used.add(profile.uart.rx);
    }
    const freePin = profile.output.find(pin => !used.has(pin)) ?? profile.output[0];
    let suffix = 1;
    const base = kind === "publisher" ? "/counter" : "/led";
    while (p.entities.some(e => e.topic === `${base}_${suffix}`)) suffix++;
    const next: Entity =
      kind === "publisher"
        ? { id, kind, topic: `${base}_${suffix}`, message: "Int32", behavior: "constant", period: 1000, value: 0 }
        : { id, kind, topic: `${base}_${suffix}`, pin: freePin, activeLow: false };
    update({ entities: [...p.entities, next] });
    setSelected(id);
  }

  const { publishers: pubs, subscribers: subs, timers } = entityCounts(p);

  function addDevice(type: DeviceType) {
    const next = allocateDevice(type, p, crypto.randomUUID());
    update({ entities: [...p.entities, next] });
    setSelected(next.id);
  }

  async function handleFileImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      const result = importProjectJson(text);
      setNotice(result.message);
      if (result.ok) {
        setSelected(result.firstEntityId);
      }
    } catch {
      setNotice("Could not read the JSON file.");
    }
  }

  if (!ready) {
    return (
      <main className="grid min-h-screen place-items-center text-secondary dark:text-primary">
        {translate("Loading microROS Studio…")}
      </main>
    );
  }

  return (
    <div className="studio-shell">
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border bg-card px-4 py-2 sm:px-5">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
          <div className="grid size-8 shrink-0 place-items-center rounded-lg border border-primary/30 bg-primary/10 text-secondary dark:text-primary">
            <Cpu size={18} />
          </div>
          <div className="whitespace-nowrap text-base font-semibold tracking-tight">
            {translate("micro")}
            <span className="text-secondary dark:text-primary">{translate("ROS")}</span>{" "}
            <span className="font-normal text-muted-foreground">{translate("Studio")}</span>
          </div>
          <span className="hidden rounded border border-border px-1.5 py-0.5 text-[9px] text-muted-foreground md:inline">
            {translate("BETA 0.3")}
          </span>
          <div className="flex shrink-0 items-center gap-2 border-l border-border pl-3">
            <span className="hidden text-[10px] text-muted-foreground lg:inline">{translate("created by:")}</span>
            <div aria-label={translate("d3im3r signature")} className="h-8 w-24 shrink-0">
              <Image
                src="/brand/d3im3r/horizontal-light.svg"
                alt={translate("d3im3r")}
                width={96}
                height={32}
                unoptimized
                className="h-8 w-24 dark:hidden"
              />
              <Image
                src="/brand/d3im3r/horizontal-dark.svg"
                alt={translate("d3im3r")}
                width={96}
                height={32}
                unoptimized
                className="hidden h-8 w-24 dark:block"
              />
            </div>
          </div>
        </div>
        <nav aria-label={translate("Preferences and help")} className="flex max-w-full flex-wrap items-center gap-2">
          <LanguageToggle />
          <ThemeSelector />
          <ThemeToggle />
          <Button
            variant="outline"
            size="icon"
            className="shrink-0 shadow-sm"
            aria-label={translate("Help")}
            title={translate("Help")}
            onClick={() => setHelp("elements")}
          >
            <CircleHelp />
          </Button>
          <Button variant="outline" size="sm" className="shrink-0 px-2 sm:px-3" asChild>
            <a href={TEMPLATE_DOWNLOAD_URL} target="_blank" rel="noreferrer" aria-label={translate("Base project")} title={translate("Base project")}>
              <GitBranch />
              <span className="hidden sm:inline">{translate("Base project")}</span>
              <ArrowUpRight className="hidden sm:block" />
            </a>
          </Button>
          <UserSessionControl user={user} onSignOut={() => void signOutUser()} />
        </nav>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-6 py-4">
        <div>
          <div className="mb-1 flex items-center gap-2 text-[10px] text-muted-foreground">
            <Layers3 size={12} />
            {translate("PROJECTS")}
            <ChevronRight size={12} />
            <span className="text-secondary dark:text-primary">{translate("EDITOR")}</span>
          </div>
          <h1 className="text-xl font-semibold tracking-tight">{translate("Build your micro-ROS node")}</h1>
          <p className="mt-1 text-xs text-muted-foreground">{translate("Configure, connect and generate code for your ESP32.")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            aria-label={translate("Import project JSON")}
            className="hidden"
            onChange={handleFileImport}
          />
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            <Upload />
            {translate("Import JSON")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              exportProjectJson(p);
              setNotice("Project JSON exported.");
            }}
          >
            <FileJson />
            {translate("Export JSON")}
          </Button>
          {platformioEnabled && (
            <Button variant="outline" size="sm" disabled={!files} onClick={() => files && downloadFile("platformio.ini", files.ini)}>
              <ArrowDownToLine />
              {translate("platformio.ini")}
            </Button>
          )}
          <Button size="sm" disabled={!files} onClick={() => files && downloadFile("main.cpp", files.main)}>
            <ArrowDownToLine />
            {translate("main.cpp")}
          </Button>
        </div>
      </div>

      <div className="studio-grid">
        <ProjectWizard
          project={p}
          update={update}
          addDevice={addDevice}
          select={setSelected}
          errors={errors}
          onStepChange={setWizardStep}
          nextSteps={() => setHelp("next-steps")}
          showCode={() => {
            setCodeVisible(true);
            setRevealCode(value => value + 1);
          }}
          reset={() => {
            if (window.confirm(translate("Replace your draft with the counter and LED example?"))) {
              setProject(structuredClone(defaultProject));
              setSelected("counter");
              setNotice("Example restored.");
            }
          }}
        />
        <main className="studio-editor w-full">
          <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-5 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                aria-expanded={codeVisible}
                aria-controls="generated-code-panel"
                onClick={() => setCodeVisible(visible => !visible)}
              >
                {codeVisible ? <ChevronDown /> : <ChevronUp />}
                {translate(codeVisible ? "Hide code" : "Show code")}
              </Button>
              <Button variant="outline" size="sm" disabled={p.entities.length >= 12 || pubs >= 10} onClick={() => add("publisher")}>
                <Plus />
                {translate("Publisher + timer")}
              </Button>
              <Button variant="outline" size="sm" disabled={p.entities.length >= 12 || subs >= 5} onClick={() => add("subscriber")}>
                <Plus />
                {translate("Subscriber")}
              </Button>
              {wizardStep > 0 && <BoardHelp board={p.board} />}
            </div>
            <span className="mono text-[10px] text-muted-foreground">
              {translate(p.entities.length)} {translate("entities · ")}
              {translate(handles(p))} {translate("handles")}
            </span>
          </div>

          <div data-code-hidden={!codeVisible} className="canvas-wrap relative bg-card">
            <VisualEditor project={p} selected={selected} onSelect={setSelected} />
            <div className="pointer-events-none absolute left-4 top-4 flex max-w-[calc(100%-2rem)] items-center gap-2 rounded-md border border-border bg-card/90 px-3 py-2 text-[10px] text-muted-foreground">
              <span className="size-1.5 shrink-0 rounded-full bg-primary" />
              <span className="min-w-0 truncate" title={p.nodeName}>
                /{p.nodeName || "micro_ros_node"}
              </span>
              <span className="shrink-0">
                {translate("·")} {translate("DOMAIN ")}
                {p.domain}
              </span>
            </div>
          </div>

          <div ref={codeRef} id="generated-code-panel" className="scroll-mt-24" hidden={!codeVisible}>
            <CodePreview files={files} platformioEnabled={platformioEnabled} />
          </div>

          <div aria-label={translate("Configuration status")} className="configuration-status space-y-2 break-words border-t border-border px-4 py-3">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium">
              {errors.length ? (
                <TriangleAlert size={15} className="text-foreground" />
              ) : (
                <CheckCircle2 size={15} className="text-secondary dark:text-primary" />
              )}
              {translate(errors.length ? `${errors.length} pending adjustments` : "Valid configuration")}
              <span className="ml-auto text-[10px] text-muted-foreground">{translate("Limits: 10 publishers · 5 subscribers")}</span>
            </div>
            {errors.length > 0 && (
              <ul role="alert" className="space-y-1 rounded-lg bg-amber-500/5 p-3 text-xs text-foreground">
                {errors.map((e, i) => (
                  <li key={i}>{translate(e)}</li>
                ))}
              </ul>
            )}
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              {translate(
                p.transport === "wifi" && p.ssid === "YOUR_WIFI_SSID"
                  ? "Replace YOUR_WIFI_SSID and enter the password before testing. "
                  : ""
              )}
              {translate("Configuration validated. Verify the connection and hardware on your ESP32.")}
            </p>
            {notice && (
              <p role="status" className="text-xs text-secondary dark:text-primary">
                {translate(notice)}
              </p>
            )}
          </div>
        </main>

        <aside className="studio-sidebar border-l border-border bg-card">
          <div className="studio-sidebar-content p-5">
            <div className="mb-6 space-y-3 border-b border-border pb-5">
              <span className="panel-title">{translate("Your program")}</span>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{translate("Publishers")}</span>
                <span className="mono text-secondary dark:text-primary">{translate(pubs)}</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{translate("Subscribers")}</span>
                <span className="mono text-secondary dark:text-chart-2">{translate(subs)}</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{translate("Timers")}</span>
                <span className="mono">{translate(timers)}</span>
              </div>
            </div>
            {entity ? (
              <EntityProperties
                board={p.board}
                entity={entity}
                update={next => update({ entities: p.entities.map(e => (e.id === next.id ? next : e)) })}
                remove={() => {
                  update({ entities: p.entities.filter(e => e.id !== entity.id) });
                  setSelected(null);
                }}
              />
            ) : (
              <div className="py-12 text-center">
                <Settings2 className="mx-auto mb-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">{translate("Select a diagram entity to edit its properties.")}</p>
              </div>
            )}
            <div className="mt-6 rounded-xl border border-primary/15 bg-primary/5 p-4">
              <div className="flex items-center gap-2 text-xs font-medium text-secondary dark:text-primary">
                <CircleHelp size={14} />
                {translate("Next steps")}
              </div>
              <p className="my-3 text-[11px] leading-relaxed text-muted-foreground">
                {translate("Download the base project from GitHub and replace src/main.cpp.")}
              </p>
              <button className="flex items-center gap-1 text-[11px] text-secondary dark:text-primary" onClick={() => setHelp("next-steps")}>
                {translate("View instructions")}
                <ChevronRight size={12} />
              </button>
            </div>
          </div>
        </aside>
      </div>

      <footer className="studio-footer flex flex-wrap justify-between gap-3 border-t border-border px-6 py-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-2">
          <Activity size={12} />
          {translate(storageStatus)}
        </span>
        <span className="flex items-center gap-2">
          <Wifi size={12} />
          {translate(p.transport === "wifi" ? "WiFi / UDP" : "USB / Serial")}
          <span>{translate("·")}</span>
          {translate(boardProfile(p.board).title)}
          <span>{translate("·")}</span>
          {translate("micro-ROS Humble")}
        </span>
      </footer>

      <details className="fixed bottom-2 right-2 z-30 rounded-md border border-border bg-card p-2 text-xs text-muted-foreground opacity-0 transition-opacity hover:opacity-100 focus-within:opacity-100 open:opacity-100">
        <summary aria-label={translate("Advanced export options")} title={translate("Advanced export options")} className="cursor-pointer list-none">
          <Settings2 size={14} />
        </summary>
        <label className="mt-2 flex cursor-pointer items-center gap-2">
          <input type="checkbox" checked={platformioEnabled} onChange={event => setPlatformioEnabled(event.target.checked)} />
          {translate("Enable platformio.ini")}
        </label>
      </details>

      {help && (
        <dialog
          ref={dialogRef}
          onCancel={() => setHelp(null)}
          aria-labelledby="help-title"
          className="fixed inset-0 m-auto max-h-[95vh] w-full max-w-2xl border-0 bg-transparent p-4 text-foreground backdrop:bg-black/75"
          onClick={e => {
            if (e.target === e.currentTarget) setHelp(null);
          }}
          onKeyDown={e => {
            if (e.key === "Escape") setHelp(null);
          }}
        >
          <section className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <h2 id="help-title" className="text-xl font-semibold">
                {translate(help === "elements" ? "Element help" : "Next steps")}
              </h2>
              <Button
                autoFocus
                variant="ghost"
                size="icon"
                aria-label={translate(help === "elements" ? "Close help" : "Close instructions")}
                onClick={() => setHelp(null)}
              >
                <X />
              </Button>
            </div>
            <div className="mt-6">{help === "elements" ? <ElementHelp /> : <NextSteps project={p} downloadUrl={TEMPLATE_DOWNLOAD_URL} />}</div>
          </section>
        </dialog>
      )}
    </div>
  );
}
