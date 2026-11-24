#!/usr/bin/env node
import { link, prepare, required } from "./checkout.ts";
import { packCheckout } from "./pack.ts";

const pack = process.argv.indexOf("--pack");
await (pack >= 0
  ? packCheckout(process.argv.slice(pack + 1)).then(({ root }) => { process.stdout.write(`the agent pack's eliza is ready at ${root}\n`); })
  : process.argv.includes("--link") ? link() : process.argv.includes("--ready") ? required() : prepare());
