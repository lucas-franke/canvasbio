import { WIDE_QUERY } from "./hooks";

/*
 * View transitions between overview and biography (navigations with `viewTransition`): on
 * wide screens the biography card fades in over the page (app/app.css). Browsers without
 * View Transitions simply navigate.
 */

const wideView = () => typeof window !== "undefined" && window.matchMedia(WIDE_QUERY).matches;

/*
 * The running transition, so focus can wait for it: moving focus while the old and new
 * snapshots are on screen is pointless for screen readers and crashes some WebKit builds.
 * React Router starts transitions via document.startViewTransition, which is wrapped once.
 *
 * Small screens get no native transitions at all: the biography sheet animates itself
 * (app/routes/people-layout.tsx), and snapshotting the long list and timeline pages crashes
 * WebKit now and then. There the update simply runs, with a stand-in for the transition
 * (React Router only uses `finished` and `skipTransition`).
 */
let running: Promise<void> | null = null;

function withoutTransition(update: (() => unknown) | undefined): ViewTransition {
  const updateCallbackDone = Promise.resolve()
    .then(() => update?.())
    .then(() => undefined);
  const ready = updateCallbackDone.then(() => Promise.reject(new DOMException("Skipped", "AbortError")));
  ready.catch(() => undefined);
  return {
    updateCallbackDone,
    ready,
    finished: updateCallbackDone.catch(() => undefined),
    skipTransition: () => undefined,
    types: new Set<string>(),
  } as unknown as ViewTransition;
}

if (typeof document !== "undefined" && typeof document.startViewTransition === "function") {
  const start = document.startViewTransition.bind(document);
  document.startViewTransition = ((...args: Parameters<typeof start>) => {
    if (!wideView()) {
      // A callback, or (newer signature) an options object with `update`.
      const options = args[0] as (() => unknown) | { update?: () => unknown } | undefined;
      return withoutTransition(typeof options === "function" ? options : options?.update);
    }
    const transition = start(...args);
    const done = transition.finished.then(
      () => undefined,
      () => undefined,
    );
    running = done;
    void done.then(() => {
      if (running === done) running = null;
    });
    return transition;
  }) as typeof document.startViewTransition;
}

/** Runs `callback` once the current view transition (if any) has finished. */
export function afterViewTransition(callback: () => void) {
  if (running) void running.then(callback);
  else callback();
}
