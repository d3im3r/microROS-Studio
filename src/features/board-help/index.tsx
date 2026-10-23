"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { CircleHelp, X } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { boardProfile, type BoardId } from "../program";
import { boardPinInformation, boardReferences } from "./catalog";
export function BoardHelp({board}:{board:BoardId}) {
 const [open,setOpen]=useState(false),[failed,setFailed]=useState<BoardId|null>(null);
 const dialog=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLButtonElement>(null);
 const profile=boardProfile(board),reference=boardReferences[board];
 useEffect(()=>{
  if(!open){dialog.current?.close();return;}
  const overflow=document.body.style.overflow;document.body.style.overflow="hidden";dialog.current?.showModal();
  return ()=>{document.body.style.overflow=overflow;requestAnimationFrame(()=>trigger.current?.focus({preventScroll:true}));};
 },[open]);
 return <>
  <Button ref={trigger} variant="outline" size="icon" className="shrink-0 shadow-sm" aria-label="Board and pins" title="View the board pinout and pin capabilities" onClick={()=>setOpen(true)}><CircleHelp/></Button>
  <dialog ref={dialog} aria-labelledby="board-help-title" className="fixed inset-0 m-auto max-h-[92dvh] w-[calc(100vw-24px)] max-w-5xl rounded-xl border border-border bg-card p-0 text-foreground shadow-2xl backdrop:bg-black/70" onCancel={e=>{e.preventDefault();setOpen(false);}}>
   {open&&<>
    <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-3"><div><h2 id="board-help-title" className="text-base font-semibold">Board and pins · {profile.title}</h2><p className="mt-1 text-xs text-muted-foreground">GPIO numbers, capabilities and restrictions for the selected profile.</p></div><Button autoFocus variant="ghost" size="icon" className="shrink-0" aria-label="Close board help" onClick={()=>setOpen(false)}><X/></Button></header>
    <div className="grid min-w-0 gap-5 p-4 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
     <div className="min-w-0 space-y-4">
      <figure className="rounded-lg border border-border bg-background p-3">
       {failed===board?<p role="status" className="p-6 text-sm text-muted-foreground">The board image could not be loaded.</p>:<a href={reference.image} target="_blank" rel="noreferrer" aria-label="Open the full-size board image"><Image key={board} src={reference.image} alt={reference.alt} width={1000} height={750} unoptimized onError={()=>setFailed(board)} className="h-auto max-h-[420px] w-full rounded object-contain"/></a>}
       <figcaption className="mt-3 space-y-1 text-xs leading-relaxed text-muted-foreground"><p>{reference.caption}</p><p>Image: <a href={reference.source} target="_blank" rel="noreferrer" className="underline underline-offset-2">{reference.credit}</a>.</p></figcaption>
      </figure>
      <p className="rounded-lg border border-border bg-muted p-3 text-xs leading-relaxed">{profile.note}</p>
      {profile.specifications&&<details className="rounded-lg border border-border p-3 text-sm"><summary className="cursor-pointer font-semibold">Board specifications</summary><dl className="mt-3 space-y-3">{Object.entries(profile.specifications).map(([label,value])=><div key={label}><dt className="text-xs font-medium">{label}</dt><dd className="mt-1 text-xs leading-relaxed text-muted-foreground">{value}</dd></div>)}</dl></details>}
     </div>
     <section className="min-w-0" aria-labelledby="board-pins-title"><h3 id="board-pins-title" className="text-sm font-semibold">Pin list and capabilities</h3><p className="mb-3 mt-1 text-xs leading-relaxed text-muted-foreground">Numbers identify chip GPIOs, not physical connector positions. All GPIOs use 3.3 V logic. Onboard or reserved signals are not offered as free external pins.</p>
      <div className="overflow-x-auto rounded-lg border border-border"><table className="w-full text-left text-xs"><thead className="bg-muted"><tr><th scope="col" className="p-3">Pin</th><th scope="col" className="p-3">Capabilities and usage</th></tr></thead><tbody className="divide-y divide-border">{boardPinInformation(board).map(pin=><tr key={pin.label}><th scope="row" className="whitespace-nowrap p-3 align-top font-medium">{pin.label}</th><td className="p-3"><span className="font-medium">{pin.availability}</span><ul className="mt-1 space-y-0.5 text-muted-foreground">{pin.features.map(feature=><li key={feature}>{feature}</li>)}</ul>{pin.note&&<p className="mt-2 leading-relaxed text-muted-foreground">{pin.note}</p>}</td></tr>)}</tbody></table></div>
     </section>
    </div>
   </>}
  </dialog>
 </>;
}
