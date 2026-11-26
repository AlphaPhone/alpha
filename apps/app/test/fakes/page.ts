import { plugIn } from "./phone.ts";
import { plugins } from "./plugins.ts";
import { servedUnder } from "./routes.ts";
import { scene } from "./scene.ts";
import { developTelephony } from "./telephony.ts";

plugIn(plugins({ ...scene(), phone: true, image: true, telephony: developTelephony(Date.now()) }, { agent: servedUnder("/agent"), cloud: servedUnder("/cloud") }));
