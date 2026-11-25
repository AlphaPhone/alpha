// spec/app/photos/index.md, "Story: Browse the library"
import { area } from "../runtime/area.tsx";
import { Photos } from "./Photos.tsx";
import { library } from "./photos.vibe";
import { trash } from "./trash.vibe";
import { viewer } from "./viewer.vibe";
import { back } from "./area.vibe";
import { together } from "../runtime/reactor.vibe";
import { imageScan } from "../files/scan.vibe";
import { agentPhotos } from "./agent.vibe";

export const photosArea = area(together(library, viewer, trash, agentPhotos, imageScan), Photos, { back });

export default photosArea;
