#!/usr/bin/env node
import { link, prepare, required } from "./checkout.ts";

await (process.argv.includes("--link") ? link() : process.argv.includes("--ready") ? required() : prepare());
