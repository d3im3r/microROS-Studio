import type { Project } from "../program";

export function downloadFile(name: string, content: string, mime = "text/plain;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const link = document.createElement("a");
  link.href = url; link.download = name;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function serializeProjectJson(project: Project): string {
  return JSON.stringify({ ...project, password: "" }, null, 2) + "\n";
}

export function exportProjectJson(project: Project) {
  const slug = project.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "project";
  downloadFile(`${slug}.microros.json`, serializeProjectJson(project), "application/json;charset=utf-8");
}
