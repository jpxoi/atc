export function whenReady(callback: () => void): void {
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", callback, { once: true });
  else callback();
}

export function prefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}
