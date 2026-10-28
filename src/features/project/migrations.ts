// Retired hardware must not silently become a different physical device or message type.
export function removeRetiredDevices(entities: unknown) {
  if (!Array.isArray(entities)) return { entities, removedActiveBuzzer: false };
  const kept = entities.filter(entity => !(entity && typeof entity === "object" && entity.kind === "device" && entity.device === "active-buzzer"));
  return { entities: kept, removedActiveBuzzer: kept.length !== entities.length };
}
