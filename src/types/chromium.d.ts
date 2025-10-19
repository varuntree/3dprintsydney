declare module "@sparticuz/chromium" {
  import type { Viewport } from "puppeteer-core";

  const chromium: {
    args: string[];
    defaultViewport?: Viewport;
    executablePath(): Promise<string>;
    headless?: boolean;
  };

  export default chromium;
}
