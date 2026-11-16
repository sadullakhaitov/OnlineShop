/**
 * Name of a readable cookie that only says "this browser is signed in".
 * The real sign-in cookie is separate and hidden from scripts.
 */
export const AUTH_HINT_COOKIE = "mm_user";

/** Fired in the browser after signing in or out. */
export const AUTH_EVENT = "multimedia:auth-change";
