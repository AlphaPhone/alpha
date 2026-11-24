import test from 'node:test';
import assert from 'node:assert/strict';
import {loadBundled, installDocument} from '../specs/quint/refinement/application/browser-model-traces.mjs';

/** The web build's bookmark store keeps titles in a second document bound to the exact address
 * list. Two saves that overlap (two Alpha tabs) must not lose the names already saved. The
 * documents here are in memory: each edit holds its own key, as the real IndexedDB store does, and
 * yields between reading and writing; `navigator.locks` is a same-process stand-in for Web Locks. */
const documents = `
const store=new Map(),chains=new Map(),tick=()=>new Promise(resolve=>setTimeout(resolve,0));
function document(key){return{
 async read(initial){await tick();return store.has(key)?JSON.parse(store.get(key)):await initial();},
 async edit(initial,edit){
  const before=chains.get(key)??Promise.resolve();let release;const mine=new Promise(resolve=>{release=resolve;});chains.set(key,before.then(()=>mine));
  await before;
  try{await tick();const data=store.has(key)?JSON.parse(store.get(key)):await initial();const result=await edit(data);await tick();store.set(key,JSON.stringify(data));return result;}
  finally{release();}
 }};}
export const bookmarkDocument=document('bookmarks'),bookmarkTitleDocument=document('titles'),browsingSessionDocument=document('session');`;

async function surfaces(count, run) {
  const dom = await installDocument();
  const held = new Map();
  Object.defineProperty(dom.window.navigator, 'locks', {configurable: true, value: {request(name, ...rest) {
    const callback = rest.at(-1), turn = (held.get(name) ?? Promise.resolve()).then(() => callback({name}));
    held.set(name, turn.catch(() => {}));return turn;
  }}});
  try {
    const {BrowserSurface} = await (await loadBundled('apps/app/src/browser/browser-surface.ts', {'./preference-documents': documents}))();
    await run(Array.from({length: count}, () => new BrowserSurface()));
  } finally { dom.restore(); }
}

test('overlapping bookmark saves from two tabs keep every saved name', async () => {
  await surfaces(2, async ([first, second]) => {
    await first.setBookmark({url: 'https://kept.example/old', saved: true, title: 'Old page'});
    await Promise.all([
      first.setBookmark({url: 'https://kept.example/a', saved: true, title: 'Page A'}),
      second.setBookmark({url: 'https://kept.example/b', saved: true, title: 'Page B'}),
    ]);
    const {entries} = await first.bookmarks();
    assert.deepEqual(Object.fromEntries(entries.map(entry => [entry.url, entry.title])), {
      'https://kept.example/a': 'Page A', 'https://kept.example/b': 'Page B', 'https://kept.example/old': 'Old page'});
  });
});

test('an omitted title keeps the saved one; a blank one removes it', async () => {
  await surfaces(1, async ([surface]) => {
    await surface.setBookmark({url: 'https://kept.example/a', saved: true, title: 'Page\u0007A'});
    await surface.setBookmark({url: 'https://kept.example/b', saved: true});
    assert.deepEqual((await surface.bookmarks()).entries, [{url: 'https://kept.example/b'}, {url: 'https://kept.example/a', title: 'Page A'}]);
    await surface.setBookmark({url: 'https://kept.example/a', saved: false});
    await surface.setBookmark({url: 'https://kept.example/a', saved: true, title: '  '});
    assert.deepEqual((await surface.bookmarks()).entries, [{url: 'https://kept.example/a'}, {url: 'https://kept.example/b'}]);
  });
});
