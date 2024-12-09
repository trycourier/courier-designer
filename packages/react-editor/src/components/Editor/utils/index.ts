export function randomElement<T>(array: Array<T>): T {
  return array[Math.floor(Math.random() * array.length)];
}

export * from "./isCustomNodeSelected";
export * from "./isTextSelected";
