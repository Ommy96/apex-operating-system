// Production-safe logger — silences debug/log in production builds
const isProd = import.meta.env.PROD;

export const logger = {
  log: (...args: any[]) => { if (!isProd) console.log(...args); },
  warn: (...args: any[]) => { if (!isProd) console.warn(...args); },
  error: (...args: any[]) => console.error(...args), // always log errors
  debug: (...args: any[]) => { if (!isProd) console.debug(...args); },
  info: (...args: any[]) => { if (!isProd) console.info(...args); },
};
