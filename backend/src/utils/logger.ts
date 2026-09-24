type Meta = unknown;

const format = (message: string, meta?: Meta): [string, Meta?] => {
  const timestamp = new Date().toISOString();
  return meta === undefined ? [`[${timestamp}] ${message}`] : [`[${timestamp}] ${message}`, meta];
};

export const logger = {
  info(message: string, meta?: Meta): void {
    console.log(...format(message, meta));
  },
  warn(message: string, meta?: Meta): void {
    console.warn(...format(message, meta));
  },
  error(message: string, meta?: Meta): void {
    console.error(...format(message, meta));
  },
};
