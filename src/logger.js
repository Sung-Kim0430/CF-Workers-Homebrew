let debugEnabled = false;

export function initLogger(env) {
  debugEnabled = env.DEBUG === '1' || env.DEBUG === 'true';
}

export function debug(...args) {
  if (debugEnabled) {
    console.log(...args);
  }
}
