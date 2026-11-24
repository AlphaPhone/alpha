# Licences

What Alpha ships, with the licence of each part: the notices the Licences
page in [Settings](../settings/licences.md) reads, and the software bill of
materials of a release, both written by `pnpm licences` from what the app
really ships. An open-source licence is never a reason to stop a build
(owner decision P-09): every licence text and notice ships, and what is
copyleft, unknown or unverified is flagged with what it obliges. A flag is
a record of what was found, not legal review. A proprietary font is not
open-source software and keeps its own named check.

## Story: Ship what Alpha is built from, with its licences

> As Alpha's release owner, I want every part Alpha ships listed with its
> licence and its notice, and what a licence asks of me flagged, so that I
> can honour each licence and see at a glance what needs care.

### A licence identifier belongs to one family, and each family has its flags

The identifier's family is read from its SPDX name: the permissive ones
Alpha had listed before P-09, permissive ones recognised from the SPDX list
since, strong copyleft (GPL, EUPL, OSL), network copyleft (AGPL), weak
copyleft (LGPL, MPL, EPL, CDDL, CPL), share-alike data (ODbL, CC-BY-SA,
CDLA-Sharing) and everything else, unknown.

```quint
type Family = Permissive | NewlyPermissive | StrongCopyleft | NetworkCopyleft | WeakCopyleft | ShareAlike | UnknownFamily
type Flag = CopyleftStrongFlag | NetworkCopyleftFlag | CopyleftWeakFlag | ShareAlikeDataFlag | UnknownLicenceFlag | PermissiveNotPreviouslyListedFlag

pure def familyFlags(f: Family): List[Flag] = match f {
  | Permissive => List()
  | NewlyPermissive => List(PermissiveNotPreviouslyListedFlag)
  | StrongCopyleft => List(CopyleftStrongFlag)
  | NetworkCopyleft => List(CopyleftStrongFlag, NetworkCopyleftFlag)
  | WeakCopyleft => List(CopyleftWeakFlag)
  | ShareAlike => List(ShareAlikeDataFlag)
  | UnknownFamily => List(UnknownLicenceFlag)
}
```

### Each flag weighs what it asks: an unknown licence most, then strong copyleft, network use, weak copyleft, share-alike data and a newly listed permissive licence

```quint
pure def flagWeight(flag: Flag): int = match flag {
  | UnknownLicenceFlag => 100
  | CopyleftStrongFlag => 40
  | NetworkCopyleftFlag => 20
  | CopyleftWeakFlag => 10
  | ShareAlikeDataFlag => 5
  | PermissiveNotPreviouslyListedFlag => 1
}

pure def familiesWeight(families: List[Family]): int = families.foldl(0, (sum, f) => familyFlags(f).foldl(sum, (total, flag) => total + flagWeight(flag)))
```

### Of a licence's alternatives, the least encumbered one is the one Alpha relies on, the first of equals

An expression that is not SPDX, or has no alternative, relies on none and
is unknown.

```quint
pure def chosenAlternative(alternatives: List[List[Family]]): List[Family] =
  alternatives.foldl(alternatives.nthOr(0, List(UnknownFamily)), (best, a) => if (familiesWeight(a) < familiesWeight(best)) a else best)

pure def licenceFlags(alternatives: List[List[Family]]): List[Flag] = chosenAlternative(alternatives).foldl(List(), (flags, f) => familyFlags(f).foldl(flags, (seen, flag) => if (seen.includes(flag)) seen else seen.append(flag)))

pure val alternativesValues = Set(List(), List(List(Permissive)), List(List(StrongCopyleft), List(Permissive)), List(List(Permissive), List(StrongCopyleft)),
  List(List(WeakCopyleft, Permissive)), List(List(NetworkCopyleft)), List(List(UnknownFamily), List(ShareAlike)))

pure def lawAPermissiveAlternativeIsNeverFlagged(alternatives: List[List[Family]]): bool =
  alternatives.includes(List(Permissive)) implies licenceFlags(alternatives) == List()

pure def lawNoAlternativeIsUnknown(alternatives: List[List[Family]]): bool =
  alternatives == List() implies licenceFlags(alternatives) == List(UnknownLicenceFlag)
```

### An open-source licence never blocks a release; a bundled font blocks it only when its check could not run, or, on the owner's word, when it has no licence recorded

A font with a licence recorded in `apps/app/licenses/font-licenses.json`,
or held outside the repository on the owner's statement, is resolved. The
owner's decision of 2026-10-10 is that a font with no licence recorded is
flagged and does not block.

```quint
type FontCheck = FontResolved | FontUnresolved | FontCheckNotRun

pure val unresolvedFontBlocks = false

pure def releaseBlockedByLicences(openSourceFlags: List[Flag], font: FontCheck): bool =
  font == FontCheckNotRun or (unresolvedFontBlocks and font == FontUnresolved)

pure val openSourceFlagsValues = Set(List(), List(UnknownLicenceFlag), List(CopyleftStrongFlag, NetworkCopyleftFlag))

pure def lawFlagsAloneNeverBlock(openSourceFlags: List[Flag]): bool = not(releaseBlockedByLicences(openSourceFlags, FontResolved))

pure def lawAnUnrunFontCheckBlocks(openSourceFlags: List[Flag]): bool = releaseBlockedByLicences(openSourceFlags, FontCheckNotRun)
```
