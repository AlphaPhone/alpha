lemma lawARepeatedReleaseIsNotComplete_ensures(release: Release, manifest: int)
  ensures (lawARepeatedReleaseIsNotComplete(release, manifest) == true)
{
  var rs := [release, release];
  var f := (n: int, q: Release) => (if ((q.variant == release.variant) && (q.signer == release.signer)) then (n + 1) else n);
  assert [] + [release] == [release];
  assert [release] + [release] == rs;
  ProofLib.FoldLeftAppend(f, 0, [], release);
  ProofLib.FoldLeftAppend(f, 0, [release], release);
  assert sameKind(rs, release) == 2;
  assert release in rs;
}
