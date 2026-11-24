lemma lawAPermissiveAlternativeIsNeverFlagged_ensures(alternatives: seq<seq<Family>>)
  ensures (lawAPermissiveAlternativeIsNeverFlagged(alternatives) == true)
{
  if [typed0_app__image__licences(Family.Permissive)] in alternatives {
    var p := [Family.Permissive];
    assert p in alternatives;
    var init := if ((0 <= 0) && (0 < |alternatives|)) then alternatives[0] else [typed0_app__image__licences(Family.UnknownFamily)];
    PermissiveWeightZero();
    ChosenWeightAtMost(init, alternatives, p);
    var best := chosenAlternative(alternatives);
    assert best == Std.Collections.Seq.FoldLeft((best: seq<Family>, a: seq<Family>) => (if (familiesWeight(a) < familiesWeight(best)) then a else best), init, alternatives);
    FamiliesWeightNonNeg(best);
    assert familiesWeight(best) == 0;
    ZeroWeightAllPermissive(best);
    AllPermissiveNoFlags(best);
  }
}

lemma lawNoAlternativeIsUnknown_ensures(alternatives: seq<seq<Family>>)
  ensures (lawNoAlternativeIsUnknown(alternatives) == true)
{
  if alternatives == [] {
    var best := chosenAlternative(alternatives);
    assert best == [Family.UnknownFamily];
    assert ([] : seq<Family>) + [Family.UnknownFamily] == best;
    var outer := (flags: seq<Flag>, f: Family) => Std.Collections.Seq.FoldLeft((seen: seq<Flag>, flag: Flag) => (if (flag in seen) then seen else (seen + [flag])), flags, familyFlags(f));
    var inner := (seen: seq<Flag>, flag: Flag) => (if (flag in seen) then seen else (seen + [flag]));
    ProofLib.FoldLeftAppend(outer, ([] : seq<Flag>), ([] : seq<Family>), Family.UnknownFamily);
    assert familyFlags(Family.UnknownFamily) == [Flag.UnknownLicenceFlag];
    assert ([] : seq<Flag>) + [Flag.UnknownLicenceFlag] == [Flag.UnknownLicenceFlag];
    ProofLib.FoldLeftAppend(inner, ([] : seq<Flag>), ([] : seq<Flag>), Flag.UnknownLicenceFlag);
    assert licenceFlags(alternatives) == [Flag.UnknownLicenceFlag];
  }
}

lemma FlagSumStep(base: int, f: Family)
  ensures Std.Collections.Seq.FoldLeft((total: int, flag: Flag) => (total + flagWeight(flag)), base, familyFlags(f)) >= base
  ensures f.Permissive? ==> Std.Collections.Seq.FoldLeft((total: int, flag: Flag) => (total + flagWeight(flag)), base, familyFlags(f)) == base
  ensures !f.Permissive? ==> Std.Collections.Seq.FoldLeft((total: int, flag: Flag) => (total + flagWeight(flag)), base, familyFlags(f)) > base
{
  var add := (total: int, flag: Flag) => (total + flagWeight(flag));
  if f.Permissive? {
    assert familyFlags(f) == [];
  } else if f.NetworkCopyleft? {
    assert familyFlags(f) == [Flag.CopyleftStrongFlag, Flag.NetworkCopyleftFlag];
    assert ([] : seq<Flag>) + [Flag.CopyleftStrongFlag] == [Flag.CopyleftStrongFlag];
    assert [Flag.CopyleftStrongFlag] + [Flag.NetworkCopyleftFlag] == [Flag.CopyleftStrongFlag, Flag.NetworkCopyleftFlag];
    ProofLib.FoldLeftAppend(add, base, ([] : seq<Flag>), Flag.CopyleftStrongFlag);
    ProofLib.FoldLeftAppend(add, base, [Flag.CopyleftStrongFlag], Flag.NetworkCopyleftFlag);
  } else {
    var fl := familyFlags(f)[0];
    assert familyFlags(f) == ([] : seq<Flag>) + [fl];
    ProofLib.FoldLeftAppend(add, base, ([] : seq<Flag>), fl);
  }
}

lemma PermissiveWeightZero()
  ensures familiesWeight([Family.Permissive]) == 0
{
  var step := (sum: int, f: Family) => Std.Collections.Seq.FoldLeft((total: int, flag: Flag) => (total + flagWeight(flag)), sum, familyFlags(f));
  assert ([] : seq<Family>) + [Family.Permissive] == [Family.Permissive];
  ProofLib.FoldLeftAppend(step, 0, ([] : seq<Family>), Family.Permissive);
  FlagSumStep(0, Family.Permissive);
}

lemma FamiliesWeightFrom(base: int, fs: seq<Family>)
  ensures Std.Collections.Seq.FoldLeft((sum: int, f: Family) => Std.Collections.Seq.FoldLeft((total: int, flag: Flag) => (total + flagWeight(flag)), sum, familyFlags(f)), base, fs) >= base
  ensures Std.Collections.Seq.FoldLeft((sum: int, f: Family) => Std.Collections.Seq.FoldLeft((total: int, flag: Flag) => (total + flagWeight(flag)), sum, familyFlags(f)), base, fs) == base ==> forall f :: f in fs ==> f.Permissive?
  decreases |fs|
{
  var step := (sum: int, f: Family) => Std.Collections.Seq.FoldLeft((total: int, flag: Flag) => (total + flagWeight(flag)), sum, familyFlags(f));
  if |fs| > 0 {
    var prefix := fs[..|fs| - 1];
    var last := fs[|fs| - 1];
    assert prefix + [last] == fs;
    ProofLib.FoldLeftAppend(step, base, prefix, last);
    FamiliesWeightFrom(base, prefix);
    var mid := Std.Collections.Seq.FoldLeft(step, base, prefix);
    FlagSumStep(mid, last);
  }
}

lemma FamiliesWeightNonNeg(fs: seq<Family>)
  ensures familiesWeight(fs) >= 0
{
  FamiliesWeightFrom(0, fs);
}

lemma ZeroWeightAllPermissive(fs: seq<Family>)
  requires familiesWeight(fs) == 0
  ensures forall f :: f in fs ==> f.Permissive?
{
  FamiliesWeightFrom(0, fs);
}

lemma ChosenWeightAtMost(init: seq<Family>, xs: seq<seq<Family>>, target: seq<Family>)
  requires target in xs || target == init
  ensures familiesWeight(Std.Collections.Seq.FoldLeft((best: seq<Family>, a: seq<Family>) => (if (familiesWeight(a) < familiesWeight(best)) then a else best), init, xs)) <= familiesWeight(target)
  decreases |xs|
{
  var pick := (best: seq<Family>, a: seq<Family>) => (if (familiesWeight(a) < familiesWeight(best)) then a else best);
  if |xs| > 0 {
    var prefix := xs[..|xs| - 1];
    var last := xs[|xs| - 1];
    assert prefix + [last] == xs;
    ProofLib.FoldLeftAppend(pick, init, prefix, last);
    if target == last {
    } else {
      assert target in prefix || target == init;
      ChosenWeightAtMost(init, prefix, target);
    }
  }
}

lemma AllPermissiveNoFlags(fs: seq<Family>)
  requires forall f :: f in fs ==> f.Permissive?
  ensures Std.Collections.Seq.FoldLeft((flags: seq<Flag>, f: Family) => Std.Collections.Seq.FoldLeft((seen: seq<Flag>, flag: Flag) => (if (flag in seen) then seen else (seen + [flag])), flags, familyFlags(f)), ([] : seq<Flag>), fs) == []
  decreases |fs|
{
  var outer := (flags: seq<Flag>, f: Family) => Std.Collections.Seq.FoldLeft((seen: seq<Flag>, flag: Flag) => (if (flag in seen) then seen else (seen + [flag])), flags, familyFlags(f));
  if |fs| > 0 {
    var prefix := fs[..|fs| - 1];
    var last := fs[|fs| - 1];
    assert prefix + [last] == fs;
    ProofLib.FoldLeftAppend(outer, ([] : seq<Flag>), prefix, last);
    AllPermissiveNoFlags(prefix);
    assert last.Permissive?;
    assert familyFlags(last) == [];
  }
}
