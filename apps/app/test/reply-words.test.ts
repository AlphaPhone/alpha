// spec/app/assistant/reply.md, "A recognized tool block outside a fence becomes its card; inside a fence every line stays code"
import { describe, expect, it } from "vitest";
import { replyBlocks, withoutTurnTags, wordsOf } from "../src/assistant/words.ts";

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

  it("takes out a tool call written as text outside a fence, holds back an unclosed one only while streaming, and keeps fenced lines exactly", () => {
    expect(replyBlocks("<function=get_weather>{}</function>\nIt is sunny today.").words).toBe("It is sunny today.");
    expect(replyBlocks("Open Maps <tool_call>\n<function=phone_use() {}</function>\n</tool_call>").words).toBe("Open Maps");
    expect(replyBlocks("Sure. <function=a>{}</function> Done. <function=b>{}</function>  ").words).toBe("Sure. Done.");
    expect(replyBlocks("```\nkept  \n<function=x>{}</function>\n```\nSee <tool_call>x</tool_call>  ").words).toBe("```\nkept  \n<function=x>{}</function>\n```\nSee");
    expect(replyBlocks("Looking.\n<tool_call>\n<function=search>{\"q\":", true).words).toBe("Looking.");
    expect(replyBlocks("Looking. <tool_c", true).words).toBe("Looking.");
    expect(replyBlocks("Use the <function=search> tag to look.").words).toBe("Use the <function=search> tag to look.");
    expect(replyBlocks("Try <function=x>\n```\n</function>\n```").words).toBe("Try <function=x>\n```\n</function>\n```");
    expect(replyBlocks("Write `<tool_call>x</tool_call>` to call it.").words).toBe("Write `<tool_call>x</tool_call>` to call it.");
    expect(wordsOf({ mine: false, text: "Hi <tool_call>x</tool_call>" })).toBe("Hi");
    expect(wordsOf({ mine: true, text: "Hi <tool_call>x</tool_call>" })).toBe("Hi <tool_call>x</tool_call>");
  });
});

describe("a reply's words without the agent's turn tag (spec/app/assistant/reply.md, \"The agent's turn tag is never drawn, copied, quoted, emailed or spoken, and a reply still being written holds back what may become one\")", () => {
  it("takes the exact tag out of prose, holds back one still being written, and never reads the owner's words", () => {
    expect([
      wordsOf({ mine: false, text: "It is [answer] Paris." }),
      replyBlocks("Paris <pro", true).words,
      replyBlocks("Paris [answer]", true).words,
      replyBlocks("Paris <pro").words,
      wordsOf({ mine: true, text: "<promise> [answer] mine" }),
    ]).toEqual(["It is Paris.", "Paris", "Paris", "Paris <pro", "<promise> [answer] mine"]);
  });

  it("keeps a type, a closing tag, another case, code and a link's words as written, whole and streamed", () => {
    const survives = ["useState<Answer>(null)", "Promise<Answer>", "```xml\n<answer>42</answer>\n```", "[answer](https://example.com)", "Run `[answer]` as written.", "Say [ANSWER] or </promise>."];
    for (const text of survives) {
      expect([withoutTurnTags(text), withoutTurnTags(text, true), replyBlocks(text).words]).toEqual([text, text, text]);
      for (let at = 1; at <= text.length; at++) expect(text.startsWith(replyBlocks(text.slice(0, at), true).words)).toBe(true);
    }
  });
});

describe("a Maps card's search handed to Maps", () => {
  it("stays left until Maps takes it, is offered once at a time, and its watchers hear it left, offered, taken and dropped", async () => {
    const { dropHandedQuery, handToMaps, handedQuery, offerHandedQuery, watchHandoff } = await import("../src/maps/handoff.ts");
    let woken = 0;
    const stop = watchHandoff(() => { woken += 1; });
    handToMaps("coffee shops");
    let answer = (_taken: boolean) => {};
    const refusing = offerHandedQuery(() => new Promise((settle) => { answer = settle; }));
    const onItsWay = [handedQuery(), await offerHandedQuery(() => Promise.resolve(true))];
    answer(false);
    await refusing;
    const refused = handedQuery();
    await offerHandedQuery(() => Promise.resolve(true));
    const taken = handedQuery();
    handToMaps("tea");
    await offerHandedQuery(() => undefined);
    const unoffered = handedQuery();
    dropHandedQuery();
    expect([onItsWay, refused, taken, unoffered, handedQuery(), woken]).toEqual([[undefined, undefined], "coffee shops", undefined, "tea", undefined, 7]);
    stop();
  });
});
