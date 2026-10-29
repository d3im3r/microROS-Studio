"use client";
import { useLanguage } from "../language";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, Download, FileCode2, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { downloadFile } from "../export-files";
export function CodePreview({ files, platformioEnabled = false }: { files: { main: string; ini: string } | null; platformioEnabled?: boolean }) {
  const { translate } = useLanguage();
  const [selectedTab, setTab] = useState<"main" | "ini">("main");
  const tab = platformioEnabled ? selectedTab : "main";
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const expandButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!expanded) { dialog.current?.close(); return; }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.showModal();
    return () => {
      document.body.style.overflow = previousOverflow;
      requestAnimationFrame(() => expandButton.current?.focus({ preventScroll: true }));
    };
  }, [expanded]);
  const [error, setError] = useState("");
  const name = tab === "main" ? "main.cpp" : "platformio.ini";
  const code = files?.[tab] ?? "// Fix configuration errors to generate the files.";
  async function copy() {
    try { await navigator.clipboard.writeText(code); setCopied(true); setError(""); setTimeout(() => setCopied(false), 1600); }
    catch { setError("Copy failed. Use the adjacent download button instead."); }
  }
  const panel = <section className={expanded ? "flex h-full min-h-0 min-w-0 flex-col bg-card" : "min-w-0 border-t border-border bg-card"}>
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-2 border-b border-border px-2 sm:px-4">
      <div className="flex min-w-0 max-w-full">{(["main", ...(platformioEnabled ? ["ini" as const] : [])] as const).map(t => <button key={t} onClick={() => setTab(t)} className={`flex items-center gap-2 min-w-0 border-b-2 px-2 py-3 text-xs sm:px-4 ${tab === t ? "border-primary text-secondary dark:text-primary" : "border-transparent text-muted-foreground"}`}><FileCode2 size={14} />{translate(t === "main" ? "main.cpp" : "platformio.ini")}</button>)}</div>
      <div className="flex min-w-0 flex-wrap gap-1"><Button variant="ghost" size="sm" disabled={!files} onClick={copy}>{copied ? <Check /> : <Copy />}{translate(copied ? "Copied" : "Copy")}</Button><Button variant="ghost" size="sm" disabled={!files} onClick={() => downloadFile(name, code)}><Download />{translate("Download")}</Button><Button ref={expandButton} variant="ghost" size="icon" aria-label={translate(expanded ? "Restore code panel size" : "Maximize code")} title={translate(expanded ? "Restore size (Esc)" : "Maximize code")} onClick={() => setExpanded(value => !value)}>{expanded ? <Minimize2 /> : <Maximize2 />}</Button></div>
    </div>
    {error && <p role="alert" className="px-4 text-foreground">{translate(error)}</p>}
    <div tabIndex={0} aria-label={translate(`Generated code for ${name}`)} className={expanded ? "mono min-h-0 flex-1 overflow-auto py-4 text-xs leading-[21px]" : "mono h-[300px] overflow-auto py-4 text-[11px] leading-[21px]"}>{code.split("\n").map((line, i) => <div className="code-line" key={i}><span className="code-number">{translate(i + 1)}</span><span className={`code-text ${line.trim().startsWith("//") || line.trim().startsWith(";") ? "text-muted-foreground" : line.startsWith("#") ? "text-secondary dark:text-chart-2" : "text-secondary dark:text-primary"}`}>{line || " "}</span></div>)}</div>
    <div className="flex shrink-0 flex-wrap justify-between gap-x-3 gap-y-1 border-t border-border px-4 py-2 text-[10px] text-muted-foreground"><span>{translate("READ ONLY · Generated from your program")}</span><span>{translate(tab === "main" ? "C++ · src/main.cpp" : "INI · project root")}</span></div>
  </section>;
  return <>
    {!expanded ? panel : <div aria-hidden="true" className="h-[382px]" />}
    <dialog ref={dialog} aria-label={translate("Expanded code")} className="fixed inset-0 m-auto h-[calc(100dvh-24px)] max-h-none w-[calc(100vw-24px)] max-w-none rounded-xl border border-border bg-card p-0 text-foreground shadow-2xl backdrop:bg-black/70" onCancel={event => { event.preventDefault(); setExpanded(false); }}>{expanded && panel}</dialog>
  </>;
}
