# Web host

The Worker on Alpha Cloud's web origin, the host Android verifies for Alpha
Phone's links. It answers its own health, and hands every other address of
its origin to the API Worker of its environment, through a service binding,
which serves the App Link file and the pages that return the owner to the
app. It keeps no route of its own beyond that.

## Story: Bring me back to the app when its link did not open

> As the owner, when a sign-in, payment or Google return opens in my browser
> instead of in Alpha, I want its address to show the page that takes me back
> to the app, and the web host to answer nothing else.

### The web host answers its own health, hands each other https address of its own origin, without credentials, to the same path and query on the API origin, and refuses every other address

```quint
type Route = Health | Forward | NotFound

pure def edgeRoute(secure: bool, credentials: bool, onWebOrigin: bool, health: bool, staysOnApi: bool): Route =
  if (not(secure) or credentials or not(onWebOrigin)) NotFound
  else if (health) Health
  else if (staysOnApi) Forward
  else NotFound

pure def lawForwardsOnlyItsOwnSecureAddresses(secure: bool, credentials: bool, onWebOrigin: bool, health: bool, staysOnApi: bool): bool =
  edgeRoute(secure, credentials, onWebOrigin, health, staysOnApi) == Forward
    implies (secure and not(credentials) and onWebOrigin and not(health) and staysOnApi)
```

### A forwarded address is answered by the API Worker, and one it cannot reach is a retryable 503, never a final answer

```quint
type EdgeAnswer = Healthy | Answered | Retry | Missing

pure def edgeAnswer(route: Route, apiReached: bool): EdgeAnswer =
  if (route == Health) Healthy
  else if (route == NotFound) Missing
  else if (apiReached) Answered
  else Retry

pure def lawAnUnreachableApiIsRetried(route: Route): bool =
  route == Forward implies edgeAnswer(route, false) == Retry
```

### The API Worker is told the web host it was asked for, and gets none of the caller's forwarding or hop-by-hop headers

```quint
pure val hopByHop = Set("host", "forwarded", "connection", "keep-alive", "proxy-connection", "transfer-encoding", "te", "trailer", "upgrade")

pure def headerKept(name: str, forwarding: bool): bool = not(forwarding) and not(hopByHop.contains(name))

pure def lawNoForwardingHeaderPasses(name: str): bool = not(headerKept(name, true))
```
