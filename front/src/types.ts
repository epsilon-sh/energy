export const hashRoutes = [
  'comparator',
  'preview',
] as const;

export type PanelsView = {
  workspace: boolean | typeof hashRoutes[number];
  options: boolean;
  modal: boolean;
};
