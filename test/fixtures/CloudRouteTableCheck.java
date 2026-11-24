import ai.eliza.os.agent.RouteGate;
import ai.eliza.plugins.signin.CloudRequestPolicy;
import ai.eliza.plugins.signin.CloudRequestPolicy.DeviceRoute;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Plain-JVM check of the product's ElizaCloud route table against upstream's own parser and policy
 * (RouteGate.loadWire, CloudRequestPolicy). Not an Android or device test, and nothing is sent.
 *
 * <p>stdin: line 1 is the table as capacitor.config.ts hands it to ElizaCloud (`routes`); every later
 * line is one request as `METHOD<TAB>target<TAB>body`, the body empty for none. stdout, tab-separated:
 * `loaded`, then one `route` line per parsed route with the device route it matches and its auth class
 * (or `foreign` and why), then one `plan` line per request with the policy's plan for a holder with a
 * live key and session on the deployment's https origin.
 */
public final class CloudRouteTableCheck {
  private CloudRouteTableCheck() {}

  private static String path(List<RouteGate.Piece> pieces) {
    return pieces.stream().map(piece -> piece.isParam() ? "{}" : piece.literal()).collect(Collectors.joining("/", "/", ""));
  }

  /**
   * A holder with a live key (version 2) and every other credential held and live. Built from the
   * record's components so it also fits a Holding that grows a credential (the mail lease of
   * elizaOS/eliza#40242 adds leaseHeld and leaseLive).
   */
  private static CloudRequestPolicy.Holding holdingWithEverything() throws Exception {
    java.lang.reflect.RecordComponent[] parts = CloudRequestPolicy.Holding.class.getRecordComponents();
    Class<?>[] types = new Class<?>[parts.length];
    Object[] values = new Object[parts.length];
    for (int at = 0; at < parts.length; at++) {
      types[at] = parts[at].getType();
      values[at] = types[at] == int.class ? (Object) 2 : (Object) Boolean.TRUE;
    }
    return CloudRequestPolicy.Holding.class.getDeclaredConstructor(types).newInstance(values);
  }

  public static void main(String[] args) throws Exception {
    BufferedReader in = new BufferedReader(new InputStreamReader(System.in, StandardCharsets.UTF_8));
    String table = in.readLine();
    CloudRequestPolicy policy = new CloudRequestPolicy(table);
    RouteGate parsed = new RouteGate();
    boolean wire = parsed.loadWire(table);
    System.out.println("loaded\t" + policy.loaded() + "\t" + wire + "\t" + CloudRequestPolicy.cloudTableAccepted(parsed.served()));
    for (RouteGate.Group group : parsed.served()) {
      for (RouteGate.Route route : group.routes()) {
        List<DeviceRoute> found = CloudRequestPolicy.deviceRouteOf(route);
        String verdict = CloudRequestPolicy.pageRoute(route) ? "page\t" + found.get(0).auth()
          : "foreign\t" + (found.size() != 1 ? "device routes " + found.size() : CloudRequestPolicy.signInOwned(found.get(0)) ? "sign-in owned" : "streamed");
        System.out.println("route\t" + route.method() + "\t" + path(route.path()) + "\t" + verdict);
      }
    }
    CloudRequestPolicy.Holding holding = holdingWithEverything();
    CloudRequestPolicy.Origin origin = CloudRequestPolicy.originOf("https://api.alphacompute.cc");
    for (String line = in.readLine(); line != null; line = in.readLine()) {
      if (line.isEmpty()) continue;
      String[] parts = line.split("\t", -1);
      byte[] body = parts.length > 2 && !parts[2].isEmpty() ? parts[2].getBytes(StandardCharsets.UTF_8) : null;
      CloudRequestPolicy.Planned planned = policy.plan(holding, origin, parts[0], parts[1], Map.of(), body);
      // Not an exhaustive switch, so a plan a later pin adds (a lease refresh) still compiles and is named.
      Object planned0 = planned.plan();
      String plan = planned0 instanceof CloudRequestPolicy.Send send ? "Send:" + send.attach().getClass().getSimpleName()
        : planned0 instanceof CloudRequestPolicy.Refuse refuse ? "Refuse:" + refuse.why()
        : planned0.getClass().getSimpleName();
      System.out.println("plan\t" + parts[0] + "\t" + parts[1] + "\t" + plan + "\t" + planned.route().auth());
    }
  }
}
