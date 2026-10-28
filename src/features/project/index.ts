"use client";
import { useEffect, useState } from "react";
import { defaultProject, projectSchema, suggestNodeName, type Project } from "../program";
import { removeRetiredDevices } from "./migrations";
const KEY = "microros-studio-v1";
export function useProject() {
  const [project, setProject] = useState<Project>(defaultProject);
  const [ready, setReady] = useState(false);
  const [migrationNotice,setMigrationNotice]=useState("");
  const [storageStatus, setStorageStatus] = useState("Loading project…");
  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved) {
        // Translate the previous default title while preserving custom project names.
        const draft=JSON.parse(saved);
        const migrated=removeRetiredDevices(draft.entities);
        const parsed = projectSchema.safeParse({...draft,entities:migrated.entities,name:draft.name==="Mi primer robot"?"My first robot":draft.name,port:8888,nodeName:suggestNodeName(typeof draft.nodeName==="string"?draft.nodeName:"micro_ros_node")});
        if (parsed.success) {
          setProject({ ...parsed.data, password: "", entities: parsed.data.entities });
          if(migrated.removedActiveBuzzer)setMigrationNotice("The active buzzer was removed from the draft. Add a passive buzzer to use tones.");
        }
        else setStorageStatus("The draft was incompatible; the example was loaded.");
      }
    } catch { setStorageStatus("The local draft could not be restored."); }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
      try {
        localStorage.setItem(KEY, JSON.stringify({ ...project, password: "" }));
        setStorageStatus("Draft saved in this browser");
      } catch { setStorageStatus("Save failed: check browser storage."); }
  }, [project, ready]);
  return { project, setProject, ready, storageStatus: migrationNotice?`${storageStatus} · ${migrationNotice}`:storageStatus };
}
