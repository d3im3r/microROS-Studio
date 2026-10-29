"use client";
import { useLanguage } from "../language";

import { boardReferences } from "../board-help/catalog";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Check, RotateCcw } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { type Project, type DeviceType, entityCounts, entityDirection, entityMessage, entityTitle, boards, boardProfile, suggestNodeName, validateEntityIssues } from "../program";
import { DeviceChoices } from "../device-catalog";
import { ConnectionSettings } from "../connection";
import { BoardHelp } from "../board-help";

const steps = ["Project and node", "Communication", "Inputs and sensors", "Outputs and actuators", "Review and generate"];

export function ProjectWizard({
  project: p,
  update,
  addDevice,
  select,
  errors,
  reset,
  showCode,
  onStepChange,
  nextSteps,
}: {
  project: Project;
  update: (patch: Partial<Project>) => void;
  addDevice: (type: DeviceType) => void;
  select: (id: string) => void;
  errors: string[];
  reset: () => void;
  showCode: () => void;
  onStepChange: (step: number) => void;
  nextSteps: () => void;
}) {
  const { translate } = useLanguage();
  const profile = boardProfile(p.board);
  const [step, setStep] = useState(0);
  const counts = entityCounts(p);
  const entityIssues = useMemo(() => validateEntityIssues(p), [p]);

  useEffect(() => onStepChange(step), [step, onStepChange]);

  const hasI2c = p.entities.some(
    e => (e.kind === "device" && e.address !== undefined) || (e.kind === "robot" && ["imu-yaw", "tof-triple"].includes(e.behavior))
  );
  const stepErrors =
    step === 0
      ? errors.filter(e => /^(name|nodeName|domain|board):/.test(e))
      : step === 1
        ? errors.filter(e => /^(ssid|agentIp|port):|I2C: SDA/.test(e))
        : [];

  return (
    <aside aria-label={translate("micro-ROS application wizard")} className="studio-sidebar border-r border-border bg-card">
      <div className="studio-sidebar-content space-y-5 p-5">
        <div>
          <h2 className="text-sm font-semibold">{translate("Build your application")}</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {translate("Step ")}{translate(step + 1)} {translate("of ")}{translate(steps.length)}
          </p>
        </div>

        <nav aria-label={translate("Build steps")} className="space-y-1">
          {steps.map((name, i) => (
            <button
              key={name}
              aria-current={i === step ? "step" : undefined}
              onClick={() => setStep(i)}
              className={`flex w-full items-center gap-2 rounded-lg p-2 text-left text-xs ${
                i === step ? "bg-primary/15 font-semibold text-secondary dark:text-primary" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <span className="grid size-5 shrink-0 place-items-center rounded-full border border-border">
                {i < step ? <Check size={12} /> : i + 1}
              </span>
              {translate(name)}
            </button>
          ))}
        </nav>

        <div className="border-t border-border pt-4">
          <h3 className="mb-3 text-sm font-semibold">{translate(steps[step])}</h3>

          {step === 0 && (
            <div className="space-y-4">
              <p className="text-xs leading-relaxed text-muted-foreground">
                {translate("Choose the board and node identity. The helper uses these values to initialize the ROS domain, node and executor.")}
              </p>
              <label>
                {translate("Project name")}
                <input
                  list="project-name-suggestions"
                  placeholder="My first robot"
                  value={p.name}
                  onChange={e => update({ name: e.target.value })}
                />
              </label>
              <datalist id="project-name-suggestions">
                <option value="My first robot" />
                <option value="Temperature monitor" />
                <option value="Sensor station" />
              </datalist>
              <div className="flex items-end gap-2">
                <label className="min-w-0 flex-1">
                  {translate("Board")}
                  <select
                    value={p.board}
                    onChange={e => {
                      const board = e.target.value as Project["board"];
                      const defaults = profile.i2c;
                      const bus = p.i2c;
                      update({
                        board,
                        ...(!bus || (bus.sda === defaults.sda && bus.scl === defaults.scl) ? { i2c: boardProfile(board).i2c } : {}),
                      });
                    }}
                  >
                    {Object.entries(boards).map(([id, b]) => (
                      <option key={id} value={id}>
                        {translate(b.title)}
                      </option>
                    ))}
                  </select>
                </label>
                <BoardHelp board={p.board} />
              </div>
              <p className="rounded-lg border border-border bg-muted px-3 py-2 text-xs leading-snug">
                {translate(boardReferences[p.board].summary)}
              </p>
              <div className="rounded-lg border border-border bg-muted p-3 text-xs">{translate("Arduino · ROS 2 Humble")}</div>
              <label>
                {translate("Node name")}
                <input
                  aria-describedby="node-name-hint"
                  className="mono"
                  placeholder="micro_ros_node"
                  value={p.nodeName}
                  onChange={e => update({ nodeName: e.target.value })}
                  onBlur={() => update({ nodeName: suggestNodeName(p.nodeName) })}
                />
              </label>
              <p id="node-name-hint" className="text-[10px] text-muted-foreground">
                {translate("Use an English name ending in _node.")}
              </p>
              <label>
                {translate("ROS_DOMAIN_ID")}
                <input type="number" min={0} max={232} value={p.domain} onChange={e => update({ domain: Number(e.target.value) })} />
              </label>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <p className="text-xs leading-relaxed text-muted-foreground">
                {translate("Choose beginWiFi() or beginSerial(). The domain and transport must match the Agent.")}
              </p>
              <ConnectionSettings project={p} update={update} />
              <div className="space-y-3 border-t border-border pt-4">
                <div className="panel-title">{translate("Shared I2C bus")}</div>
                <p className="text-xs text-muted-foreground">
                  {translate("SDA/SCL are shared; each sensor or display needs its own address.")}
                </p>
                {(["sda", "scl"] as const).map(key => (
                  <label key={key}>
                    {translate(key.toUpperCase())}
                    <select
                      value={(p.i2c ?? profile.i2c)[key]}
                      onChange={e => update({ i2c: { ...profile.i2c, ...p.i2c, [key]: Number(e.target.value) } })}
                    >
                      {!profile.output.includes((p.i2c ?? profile.i2c)[key]) && (
                        <option value={(p.i2c ?? profile.i2c)[key]} disabled>
                          {translate("GPIO ")}{translate((p.i2c ?? profile.i2c)[key])} {translate("· unavailable")}
                        </option>
                      )}
                      {profile.output.map(pin => (
                        <option key={pin} value={pin}>
                          {translate("GPIO ")}{translate(pin)}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
                <p className="text-xs text-muted-foreground">
                  {translate(hasI2c ? "Bus enabled by the selected devices." : "Enabled when an I2C device is added.")}
                </p>
              </div>
            </div>
          )}

          {step === 2 && <DeviceChoices direction="publisher" project={p} add={addDevice} select={select} />}
          {step === 3 && <DeviceChoices direction="subscriber" project={p} add={addDevice} select={select} />}

          {step === 4 && (
            <div className="space-y-4">
              <p className="text-xs leading-relaxed text-muted-foreground">
                {translate("The helper creates entities, registers timers and runs callbacks with spinSome(). Download both files and replace them in your base project.")}
              </p>
              <div className="rounded-lg border border-border bg-muted p-3 text-xs">
                {translate(counts.publishers)} {translate("publishers · ")}{translate(counts.subscribers)} {translate("subscribers · ")}{translate(counts.timers)} {translate("timers")}
                <br />
                {translate(p.entities.length)} {translate("executor handles")}
              </div>
              {p.entities.map(e => {
                const hasIssue = Boolean(entityIssues[e.id]?.length);
                return (
                  <button
                    key={e.id}
                    data-conflict={hasIssue ? "true" : undefined}
                    className={`w-full rounded-lg border p-3 text-left text-xs ${
                      hasIssue ? "border-destructive bg-destructive/5" : "border-border"
                    }`}
                    onClick={() => select(e.id)}
                  >
                    <strong>{translate(entityTitle(e))}</strong>
                    <span className="mono mt-1 block break-all">{translate(e.topic)}</span>
                    <span className="mt-1 block text-muted-foreground">
                      {translate(entityDirection(e))} {translate("· ")}{translate(entityMessage(e))}
                    </span>
                  </button>
                );
              })}
              {errors.length ? (
                <div
                  role="alert"
                  aria-label={translate("Configuration conflicts")}
                  className="space-y-3 rounded-lg border border-destructive bg-destructive/10 p-3 text-xs text-destructive"
                >
                  <strong className="block text-sm">{translate("Resolve conflicts before generating")}</strong>
                  <p>{translate("Check GPIO conflicts between inputs, outputs and buses. Downloads remain disabled until errors are resolved.")}</p>
                  <ul className="space-y-2">
                    {errors.map((e, i) => (
                      <li key={i}>{translate(e)}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-xs text-secondary dark:text-primary">{translate("Configuration ready to generate both files.")}</p>
              )}
              <Button className="w-full" disabled={!!errors.length} onClick={showCode}>
                {translate("View generated code")}
              </Button>
            </div>
          )}
        </div>

        {!!stepErrors.length && (
          <ul role="alert" className="space-y-1 text-xs text-destructive">
            {stepErrors.map((e, i) => (
              <li key={i}>{translate(e)}</li>
            ))}
          </ul>
        )}

        <div className="flex justify-between gap-2 border-t border-border pt-4">
          <Button variant="outline" size="sm" disabled={step === 0} onClick={() => setStep(step - 1)}>
            <ChevronLeft />
            {translate("Back")}
          </Button>
          <Button
            size="sm"
            disabled={!!stepErrors.length || (step === 4 && !!errors.length)}
            onClick={() => (step === 4 ? nextSteps() : setStep(step + 1))}
          >
            {translate(step === 4 ? "Next steps" : "Next")}
            <ChevronRight />
          </Button>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-full shadow-sm"
          onClick={() => {
            reset();
            setStep(0);
          }}
        >
          <RotateCcw />
          {translate("Restore example")}
        </Button>
      </div>
    </aside>
  );
}
