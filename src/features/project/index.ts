"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { defaultProject, projectSchema, suggestNodeName, type Project } from "../program";
import { removeRetiredDevices } from "./migrations";
const KEY = "microros-studio-v1";

export function parseProjectDraft(raw: string): { ok: true; project: Project; removedActiveBuzzer: boolean } | { ok: false; reason: "incompatible" | "corrupt" } {
  try {
    const draft = JSON.parse(raw);
    if (!draft || typeof draft !== "object") return { ok: false, reason: "corrupt" };
    const migrated = removeRetiredDevices(draft.entities);
    const parsed = projectSchema.safeParse({
      ...draft,
      entities: migrated.entities,
      name: draft.name === "Mi primer robot" ? "My first robot" : draft.name,
      port: 8888,
      nodeName: suggestNodeName(typeof draft.nodeName === "string" ? draft.nodeName : "micro_ros_node"),
    });
    if (!parsed.success) return { ok: false, reason: "incompatible" };
    return {
      ok: true,
      project: { ...parsed.data, password: "", entities: parsed.data.entities },
      removedActiveBuzzer: migrated.removedActiveBuzzer,
    };
  } catch {
    return { ok: false, reason: "corrupt" };
  }
}

export function useProject() {
  const [project, setProject] = useState<Project>(defaultProject);
  const [ready, setReady] = useState(false);
  const [migrationNotice, setMigrationNotice] = useState("");
  const [storageStatus, setStorageStatus] = useState("Loading project…");
  const lastSavedRef = useRef<string>("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved) {
        const result = parseProjectDraft(saved);
        if (result.ok) {
          setProject(result.project);
          if (result.removedActiveBuzzer) {
            setMigrationNotice("The active buzzer was removed from the draft. Add a passive buzzer to use tones.");
          }
        } else if (result.reason === "incompatible") {
          setStorageStatus("The draft was incompatible; the example was loaded.");
        } else {
          setStorageStatus("The local draft could not be restored.");
        }
      }
    } catch {
      setStorageStatus("The local draft could not be restored.");
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      const payload = JSON.stringify({ ...project, password: "" });
      if (payload !== lastSavedRef.current) {
        localStorage.setItem(KEY, payload);
        lastSavedRef.current = payload;
      }
      setStorageStatus("Draft saved in this browser");
    } catch {
      setStorageStatus("Save failed: check browser storage.");
    }
  }, [project, ready]);

  const importProjectJson = useCallback((raw: string): { ok: boolean; message: string; firstEntityId: string | null } => {
    const result = parseProjectDraft(raw);
    if (!result.ok) {
      return {
        ok: false,
        message: result.reason === "incompatible"
          ? "Invalid project JSON: check board, pins and schema."
          : "Could not read the JSON file.",
        firstEntityId: null,
      };
    }
    setProject(result.project);
    setMigrationNotice(
      result.removedActiveBuzzer
        ? "The active buzzer was removed from the draft. Add a passive buzzer to use tones."
        : ""
    );
    return {
      ok: true,
      message: "Project JSON imported.",
      firstEntityId: result.project.entities[0]?.id ?? null,
    };
  }, []);

  return {
    project,
    setProject,
    ready,
    importProjectJson,
    storageStatus: migrationNotice ? `${storageStatus} · ${migrationNotice}` : storageStatus,
  };
}
