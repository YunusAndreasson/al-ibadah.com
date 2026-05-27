/// <reference path="../.astro/types.d.ts" />

// Fontsource packages ship CSS without type declarations; the bare
// side-effect imports need ambient module declarations under TS 6+ (ts2882).
declare module '@fontsource-variable/inter'
declare module '@fontsource-variable/source-serif-4'
