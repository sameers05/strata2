// Font choices offered in Settings (SPEC.md §9 "per-area fonts"). Keys are
// stored in state; these stacks are resolved to CSS custom properties at render.
export const FONTS = {
  system: {
    label: 'System',
    stack: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  },
  serif: {
    label: 'Serif',
    stack: 'Georgia, "Times New Roman", serif',
  },
  mono: {
    label: 'Monospace',
    stack: '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
  },
  rounded: {
    label: 'Rounded',
    stack: '"Segoe UI Rounded", "SF Pro Rounded", "Nunito", system-ui, sans-serif',
  },
  humanist: {
    label: 'Humanist',
    stack: '"Optima", "Gill Sans", "Trebuchet MS", sans-serif',
  },
}

export function fontStack(key) {
  return (FONTS[key] ?? FONTS.system).stack
}
