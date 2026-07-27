// Backward-compatible re-export shim.
// The shared domain type definitions now live in `./types`. This file simply
// re-exports them so existing `@/services/mockData` imports keep working.
// Prefer importing from `@/services/types` going forward.
export * from "./types"
