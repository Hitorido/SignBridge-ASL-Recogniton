export function useSharedValue<T>(init: T) {
  return { value: init };
}
export const Worklets = {
  createRunOnJS: <T extends (...args: unknown[]) => unknown>(fn: T) => fn,
};
