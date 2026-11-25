// spec/app/assistant/reply.md, "A recognized tool block outside a fence becomes its card; inside a fence every line stays code"
import { describe, expect, it } from "vitest";
import { replyBlocks, wordsOf } from "../src/assistant/words.ts";

const card = '[MAPSCARD]\n{"kind":"locate","intent":"place-near","prompt":"Where are you?","query":"coffee shops"}\n[/MAPSCARD]';
const share = "[CHOICE:maps-share id=maps-share-1]\nYes, share the location of Blue Bottle.=Share location\nNo, do not share it.=Don't share\n[/CHOICE]";
const form = '[FORM]\n{"id":"f","fields":[]}\n[/FORM]';

describe("a reply's words as the owner reads and hears them", () => {
  it("takes out Maps cards, share questions and forms, keeps each share question's answers, and leaves the owner's words as written", () => {
    expect(replyBlocks(`Here you go.\n${card}\nShare it?\n${share}\n${form}`)).toEqual({
      words: "Here you go.\nShare it?",
      choices: [{ id: "maps-share-1", options: [{ value: "Yes, share the location of Blue Bottle.", label: "Share location" }, { value: "No, do not share it.", label: "Don't share" }] }],
    });
    expect(wordsOf({ mine: true, text: `Mine ${card}` })).toBe(`Mine ${card}`);
  });

  it("holds back a block still being written, keeps a code fence and a malformed card as written", () => {
    expect(replyBlocks('Looking now.\n[MAPSCARD]\n{"kind":"loc', true).words).toBe("Looking now.");
    expect(replyBlocks("A.\n[MAPS", true).words).toBe("A.");
    expect(replyBlocks("Done.\n[CHOICE:maps-share id=x]\nYes=Share", false).words).toBe("Done.\n[CHOICE:maps-share id=x]\nYes=Share");
    expect(replyBlocks("[CHOICE:task id=t]\nok=OK\n[/CHOICE]").words).toBe("[CHOICE:task id=t]\nok=OK\n[/CHOICE]");
    expect(replyBlocks("```\n[FORM]x[/FORM]\n```").words).toBe("```\n[FORM]x[/FORM]\n```");
    expect(replyBlocks("[MAPSCARD]\nnot json\n[/MAPSCARD]").words).toBe("[MAPSCARD]\nnot json\n[/MAPSCARD]");
  });
});

describe("a Maps card's search handed to Maps", () => {
  it("is taken once, and its watchers hear it left and taken", async () => {
    const { handToMaps, handedQuery, takeHandedQuery, watchHandoff } = await import("../src/maps/handoff.ts");
    let woken = 0;
    const stop = watchHandoff(() => { woken += 1; });
    handToMaps("coffee shops");
    expect([handedQuery(), takeHandedQuery(), takeHandedQuery(), woken]).toEqual(["coffee shops", "coffee shops", undefined, 3]);
    stop();
  });
});
