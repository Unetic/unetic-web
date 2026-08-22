type JsonObject = Record<string, unknown>;

export function mergeJsonPatch(current: unknown, patch: unknown): unknown {
  if (patch === null || typeof patch !== 'object' || Array.isArray(patch)) {
    return patch;
  }

  const currentObject = isObject(current) ? current : {};
  const result: JsonObject = { ...currentObject };
  for (const [key, value] of Object.entries(patch)) {
    if (value === null) {
      delete result[key];
    } else {
      result[key] = mergeJsonPatch(result[key], value);
    }
  }
  return result;
}

function isObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
