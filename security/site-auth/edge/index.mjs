// index.mjs — Lambda@Edge 入口：config.json 由 scripts/deploy.sh 生成，esbuild 打进包里
import config from "./config.json";
import { makeHandler } from "./handler.mjs";

export const handler = makeHandler(config);
