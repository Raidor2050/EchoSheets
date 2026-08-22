let counter = 0;

export const uid = (prefix = "id"): string => {
  counter = (counter + 1) % Number.MAX_SAFE_INTEGER;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}`;
};
