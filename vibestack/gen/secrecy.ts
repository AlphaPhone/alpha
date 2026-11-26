// Which values carry a secret, and where they may go (SPEC.md, "Secrets"). A type named Secret<Something> marks
// its values secret. A secret may be kept only in a place whose type is secret: a field, a variant's field, a list,
// set or map element, or the result of a definition. Every other place is public, since the program may say, log or
// show it. A value computed from a secret, or chosen by a condition on one, is secret too. A definition named
// declassify<Something> is the one way out: what it returns is public, and review names it (review.ts, `pending`).
import { fail, type Json, type Types } from "./types.ts";
import type { Param, Roles } from "./classify.ts";

const SECRET = /^Secret[A-Z0-9_]/;
export const DECLASSIFY = /^declassify[A-Z]/;

interface Flow {
  funs: Json[];
  vals: Json[];
  sig: (d: Json) => { params: Param[]; result: Json };
  inferred: (id: number) => Json | undefined;
  /** Where a definition is in the spec, for messages. */
  where: (def: string) => string;
  variants: Set<string>;
  /** Declared types of imported values and functions, requalified into this module. */
  importedTypes?: Map<string, Json>;
}

/** `outer`: the value itself depends on a secret; `inner`: the value or any nested field/element holds a secret. */
interface Taint { outer: boolean; inner: boolean }
const taint = (outer: boolean, inner = outer): Taint => ({ outer, inner: outer || inner });

/** Fails with every place a secret reaches that is not secret. */
export function checkSecrets({ funs, vals, sig, inferred, where, variants, importedTypes = new Map() }: Flow, roles: Roles, { typedef, resolve, fields, payload, ownerOf, named }: Types) {
  /** A type that is secret itself, directly or as an alias of one, or a list, set or map of such: what is read from it is secret. */
  const secret = (t: Json | undefined, seen = new Set<string>()): boolean => {
    if (!t) return false;
    if (t.kind === "const") {
      if (seen.has(t.name)) return false;
      const next = new Set(seen);
      next.add(t.name);
      return SECRET.test(t.name.split("::").pop()) || SECRET.test(typedef(t.name).base ?? "") || secret(typedef(t.name).type, next);
    }
    if (t.kind === "list" || t.kind === "set") return secret(t.elem, seen);
    if (t.kind === "fun") return secret(t.arg, seen) || secret(t.res, seen);
    return false;
  };
  /** Whether a value of type `t` carries a secret anywhere inside it (including a record field or variant payload). */
  const containsSecret = (t: Json | undefined, seen = new Set<string>()): boolean => {
    if (!t) return false;
    if (secret(t, seen)) return true;
    if (t.kind === "const") {
      if (seen.has(t.name)) return false;
      const next = new Set(seen);
      next.add(t.name);
      return containsSecret(typedef(t.name).type, next);
    }
    if (t.kind === "list" || t.kind === "set") return containsSecret(t.elem, seen);
    if (t.kind === "fun") return containsSecret(t.arg, seen) || containsSecret(t.res, seen);
    if (t.kind === "rec") return fields(t).some((f: Json) => containsSecret(f.fieldType, seen));
    if (t.kind === "sum") return fields(t).some((f: Json) => { const p = payload(f); return p !== undefined && containsSecret(p, seen); });
    return false;
  };
  const name = (t: Json) => (t.kind === "const" ? t.name : t.kind);
  const byName = new Map(funs.map((d) => [d.name as string, d]));
  const valsByName = new Map(vals.map((d) => [d.name as string, d]));
  // Rules only check, so what they return goes nowhere; opaque laws are rules too.
  const rules = new Set([...roles.always, ...roles.sometimes, ...roles.steps.map((r) => r.name), ...roles.leadsTo,
    ...[...roles.laws, ...roles.opaques.flatMap((o) => o.laws)].map((l) => l.name), ...(roles.refines ? [roles.refines.fn] : [])]);
  const found = new Set<string>();
  /** The field `f` of a record type, as declared. */
  const field = (t: Json | undefined, f: string): Json | undefined => {
    const r = t && resolve(t);
    return r?.kind === "rec" ? fields(r).find((x: Json) => x.fieldName === f)?.fieldType : undefined;
  };
  const mapKey = (t: Json | undefined): Json | undefined => { const r = t && resolve(t); return r?.kind === "fun" ? r.arg : undefined; };
  const elem = (t: Json | undefined): Json | undefined => { const r = t && resolve(t); return r?.kind === "list" || r?.kind === "set" ? r.elem : r?.kind === "fun" ? r.res : undefined; };
  // Types as the spec declares them: an inferred type may have lost the name of a secret type to unification.
  const result = (d: Json): Json => d.typeAnnotation?.res ?? sig(d).result;
  /** The declared type of a record value: the place it goes into, else the named type with its fields (preserving its name). */
  const declared = (e: Json, slot: Json | undefined): Json | undefined => {
    if (slot) return slot;
    const foundType = named(inferred(e.id) ?? { kind: "none" }, "rec");
    return foundType ? { kind: "const", name: foundType.name } : inferred(e.id);
  };

  /**
   * Whether `e` carries a secret, with `env` saying which names do. `slot` is the declared type of the place `e`
   * goes into, which a record literal's fields are checked against.
   */
  const carries = (e: Json, env: Map<string, Taint>, at: string, slot?: Json): Taint => {
    const ownType = inferred(e.id);
    const own = secret(ownType);
    const ownInner = own || containsSecret(ownType);
    /** Whether `x` carries a secret into a place of type `t`, which must then be secret. */
    const into = (x: Json, t: Json | undefined, what: string): Taint => {
      const carried = carries(x, env, at, t);
      if (carried.outer && !secret(t)) found.add(`${at}: a secret reaches ${what}${t ? `, of type ${name(t)},` : ""} which is not secret: give that place a Secret type, or pass the value through a declassify function`);
      return carried;
    };
    // A lambda's parameters carry what the values it is applied to carry.
    const all = (xs: Json[], bodySlot?: Json): Taint => {
      const nonLambdas = xs.filter((x) => x.kind !== "lambda").map((x) => carries(x, env, at));
      const outer = nonLambdas.some((x) => x.outer);
      const outerInner = nonLambdas.some((x) => x.inner);
      const lambdas = xs.filter((x) => x.kind === "lambda").map((l) => carries(
        l.expr,
        new Map([...env, ...l.params.map((p: Json) => [p.name, taint(outer || secret(inferred(p.id)), outerInner || containsSecret(inferred(p.id)))] as const)]),
        at,
        bodySlot,
      ));
      return taint(outer || lambdas.some((x) => x.outer), outerInner || lambdas.some((x) => x.inner));
    };
    if (e.kind === "name") {
      const imp = importedTypes.get(e.name);
      const binding = env.get(e.name) ?? valCarries(e.name);
      return taint(own || secret(imp) || binding.outer, ownInner || containsSecret(imp) || binding.inner);
    }
    if (e.kind === "let") return carries(e.expr, new Map([...env, [e.opdef.name, carries(e.opdef.expr, env, at)]]), at, slot);
    if (e.kind !== "app") return taint(own, ownInner);
    const a: Json[] = e.args;
    const op: string = e.opcode;
    if (DECLASSIFY.test(op.split("::").pop()!)) { all(a); return taint(false); }
    if (byName.has(op)) {
      const called = call(op, a.map((x) => carries(x, env, at)));
      return taint(own || called.outer, ownInner || called.inner);
    }
    if (variants.has(op)) {
      const owner = ownerOf(op);
      const ownerType = { kind: "const", name: owner.name };
      const tag = op.split("::").pop()!;
      if (secret(ownerType)) {
        if (a.length) carries(a[0], env, at);
        return taint(true);
      }
      const p = payload(fields(owner.type).find((f: Json) => f.fieldName === tag));
      const inner = (a.length ? into(a[0], p, `the payload of ${tag}`).inner : false) || containsSecret(ownerType);
      return taint(false, inner);
    }
    if (op === "Rec") {
      const t = declared(e, slot);
      if (secret(t)) {
        for (let i = 0; i < a.length; i += 2) carries(a[i + 1], env, at);
        return taint(true);
      }
      let inner = containsSecret(t);
      for (let i = 0; i < a.length; i += 2) {
        const c = into(a[i + 1], field(t, a[i].value), `the field ${a[i].value}`);
        if (c.inner) inner = true;
      }
      return taint(false, inner);
    }
    if (op === "with") {
      const t = declared(e, slot);
      if (secret(t)) {
        carries(a[0], env, at, t);
        carries(a[2], env, at);
        return taint(true);
      }
      const updated = into(a[2], field(t, a[1].value), `the field ${a[1].value}`);
      const base = carries(a[0], env, at, t);
      return taint(base.outer, base.inner || updated.inner || containsSecret(t));
    }
    if (op === "ite") {
      const cond = carries(a[0], env, at);
      const yes = carries(a[1], env, at, slot);
      const no = carries(a[2], env, at, slot);
      return taint(own || cond.outer || yes.outer || no.outer, ownInner || cond.inner || yes.inner || no.inner);
    }
    if (op === "eq" || op === "neq") {
      const left = carries(a[0], env, at);
      const right = carries(a[1], env, at);
      return taint(left.inner || right.inner || containsSecret(inferred(a[0].id)) || containsSecret(inferred(a[1].id)));
    }
    // A collection is as secret as what it holds: whatever reads an element reads a secret.
    if (op === "List" || op === "Set") {
      const t = slot ?? ownType;
      const items = a.map((x) => into(x, elem(t), "an element of a collection"));
      return taint(own || items.some((x) => x.outer), ownInner || items.some((x) => x.inner) || containsSecret(t));
    }
    if (op === "append") {
      const t = slot ?? ownType;
      const list = carries(a[0], env, at, t);
      const item = into(a[1], elem(t), "an element of a list");
      return taint(own || list.outer || item.outer, ownInner || list.inner || item.inner || containsSecret(t));
    }
    if (op === "put" || op === "set") {
      const t = slot ?? ownType;
      const map = carries(a[0], env, at, t);
      const key = into(a[1], mapKey(t), "a key in a map");
      const val = into(a[2], elem(t), "a value in a map");
      return taint(own || map.outer || key.outer || val.outer, ownInner || map.inner || key.inner || val.inner || containsSecret(t));
    }
    if (op === "field") {
      const base = carries(a[0], env, at);
      const ft = field(inferred(a[0].id), a[1].value);
      const outer = own || secret(ft) || base.outer;
      return taint(outer, outer || containsSecret(ft));
    }
    if (op === "contains" || op === "in" || op === "subseteq") {
      const args = all(a);
      return taint(own || args.inner || a.some((x) => containsSecret(inferred(x.id))));
    }
    const imp = importedTypes.get(op);
    const args = all(a, op === "matchVariant" ? slot : undefined);
    return taint(own || secret(imp) || args.outer, ownInner || containsSecret(imp) || args.inner);
  };

  const valMemo = new Map<string, Taint>();
  const valCarries = (n: string): Taint => {
    const d = valsByName.get(n);
    if (!d) return taint(false);
    if (!valMemo.has(n)) valMemo.set(n, carries(d.expr, new Map(), where(n), d.typeAnnotation ?? inferred(d.id)));
    return valMemo.get(n)!;
  };
  /** What a definition returns carries a secret, given which of its arguments do. Quint has no recursion, so this ends. */
  const memo = new Map<string, Taint>();
  const call = (fn: string, args: Taint[]): Taint => {
    const key = `${fn}(${args.map((a) => `${Number(a.outer)}${Number(a.inner)}`).join(",")})`;
    if (!memo.has(key)) {
      const d = byName.get(fn)!;
      const env = new Map<string, Taint>(d.expr.params.map((p: Json, i: number) => {
        const pt = p.typeAnnotation ?? sig(d).params[i].type;
        return [p.name, taint(args[i].outer || secret(pt), args[i].inner || containsSecret(pt))];
      }));
      memo.set(key, carries(d.expr.expr, env, where(fn), result(d)));
    }
    return memo.get(key)!;
  };
  for (const v of vals) {
    const t = v.typeAnnotation ?? inferred(v.id);
    if (valCarries(v.name).outer && !secret(t)) found.add(`${where(v.name)}: it holds a secret, but its type ${name(t)} is not secret`);
  }
  // Each definition on its own, its parameters as secret as their types say.
  for (const d of funs)
    if (call(d.name, d.expr.params.map(() => taint(false))).outer && !rules.has(d.name) && !DECLASSIFY.test(d.name) && !secret(result(d)))
      found.add(`${where(d.name)}: what it returns depends on a secret, but its type ${name(result(d))} is not secret: give it a Secret type, or decide by something public`);
  if (found.size) fail([...found].join("\n"));
}
