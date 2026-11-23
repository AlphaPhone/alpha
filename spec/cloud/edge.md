# Edge

The small Worker in front of the cloud's web host, the host Android and
Google know the app by. The phone never browses it. It answers health,
hands the app's asset links and three return addresses to the API, and
knows nothing else: it holds no route of its own to an account, a plan or a
page. The shell splits an address into its parts; these rules decide what
is done with them.

## Story: Answer for the app on the web host

> As the phone, I want the web host to prove to Android that its links are
> mine and to bring a sign-in or a checkout back to me, and to do nothing
> else, so that nothing behind it can be reached through it.

### A request is an address over a secure connection or not, its path in parts, its query and its method

`named` says the first part of the path is spelled as an app's name:
lower-case letters, digits and hyphens, at most 63, starting with a letter
or a digit.

```quint
type Method = Get | Head | Post | Delete
type Request = { secure: bool, userinfo: bool, parts: List[str], named: bool, query: str, method: Method }

pure val rValues = Set(
  { secure: true, userinfo: false, parts: List(".well-known", "assetlinks.json"), named: false, query: "", method: Get },
  { secure: true, userinfo: false, parts: List(".well-known", "assetlinks.json"), named: false, query: "", method: Post },
  { secure: true, userinfo: false, parts: List("health"), named: true, query: "", method: Head },
  { secure: true, userinfo: false, parts: List("alphaphone", "auth", "callback"), named: true, query: "code=x&state=y", method: Get },
  { secure: true, userinfo: false, parts: List("alphaphone", "auth", "browser-start"), named: true, query: "", method: Post },
  { secure: true, userinfo: false, parts: List("alphaphone", "billing", "return"), named: true, query: "session=x", method: Get },
  { secure: true, userinfo: false, parts: List("ALPHA", "auth", "callback"), named: false, query: "", method: Get },
  { secure: false, userinfo: false, parts: List("alphaphone", "auth", "callback"), named: true, query: "", method: Get },
  { secure: true, userinfo: true, parts: List("health"), named: true, query: "", method: Get },
  { secure: true, userinfo: false, parts: List("api", "v1", "user"), named: true, query: "", method: Get }
)
```

### The web host knows asset links, health and three returns under the app's name

The returns are the sign-in callback, the browser sign-in start and the
billing return. A path with more or fewer parts is none of them.

```quint
type Place = Links | Health | Return | Nowhere

pure def isReturn(parts: List[str]): bool =
  val second = parts.nthOr(1, "")
  val third = parts.nthOr(2, "")
  parts.length() == 3 and (
    (second == "auth" and (third == "callback" or third == "browser-start"))
      or (second == "billing" and third == "return"))

pure def place(r: Request): Place =
  if (not(r.secure) or r.userinfo) Nowhere
  else if (r.parts == List(".well-known", "assetlinks.json")) Links
  else if (r.parts == List("health")) Health
  else if (r.named and isReturn(r.parts)) Return
  else Nowhere
```

### Health is answered here, asset links are read from the API, a return is forwarded whole, and anything else is not found

Asset links take only a read: any other method is told which are allowed.
A return goes to the API's hosted route with the address it arrived at,
path and query, under the method it came with.

```quint
type Answer =
  | Well
  | NotAllowed
  | NotFound
  | AskedLinks({ method: Method })
  | Forwarded({ parts: List[str], query: str, method: Method })

pure def answer(r: Request): Answer =
  val where = place(r)
  if (where == Health) Well
  else if (where == Links) (if (r.method == Get or r.method == Head) AskedLinks({ method: r.method }) else NotAllowed)
  else if (where == Return) Forwarded({ parts: r.parts, query: r.query, method: r.method })
  else NotFound

pure def notFound(a: Answer): bool =
  match a {
    | NotFound => true
    | _ => false
  }

pure def reachesTheApi(a: Answer): bool =
  match a {
    | AskedLinks(l) => true
    | Forwarded(f) => true
    | _ => false
  }
```

### Only asset links and the three returns ever reach the API

```quint
pure def lawOnlyLinksAndReturnsReachTheApi(r: Request): bool =
  reachesTheApi(answer(r)) implies (
    r.secure and not(r.userinfo)
      and (r.parts == List(".well-known", "assetlinks.json") or (r.named and isReturn(r.parts))))
```

### A forwarded return carries the address it arrived at, unchanged

```quint
pure def lawAForwardedReturnKeepsItsAddress(r: Request): bool =
  val given = answer(r)
  match given {
    | Forwarded(f) => f.parts == r.parts and f.query == r.query and f.method == r.method
    | _ => true
  }
```

### Asset links are never written through the web host

```quint
pure def lawAssetLinksAreOnlyRead(r: Request): bool =
  val given = answer(r)
  match given {
    | AskedLinks(l) => l.method == Get or l.method == Head
    | _ => true
  }
```

### An insecure address, or one that carries a user name, is not found

```quint
pure def lawAnUnsafeAddressIsNotFound(r: Request): bool =
  (not(r.secure) or r.userinfo) implies notFound(answer(r))
```

### A service route, a page of the cloud's site and a return nested deeper are not found

Nothing of the API is proxied: an account read sent to the web host goes
nowhere, and so does the cloud's own billing page.

```quint
pure def plainly(parts: List[str], named: bool, query: str, method: Method): Request =
  { secure: true, userinfo: false, parts: parts, named: named, query: query, method: method }

pure def lawNothingElseIsProxied(query: str, method: Method, named: bool): bool =
  notFound(answer(plainly(List("api", "v1", "user"), named, query, method)))
    and notFound(answer(plainly(List("cloud", "billing"), named, query, method)))
    and notFound(answer(plainly(List("a", "b", "auth", "callback"), named, query, method)))
    and notFound(answer(plainly(List("alphaphone", "auth", "token"), named, query, method)))
    and notFound(answer(plainly(List("alphaphone"), named, query, method)))
```

### A return under a name that is not an app's is not found

```quint
pure def lawAReturnNeedsAnAppsName(r: Request): bool =
  (isReturn(r.parts) and not(r.named)) implies notFound(answer(r))
```
