import type { CloudMapsDisclosure } from "@elizaos/plugin-maps/client/cloud-provider";

/** Names each service that receives search text and route points, or "" for none. */
function describeLocationRecipients(
  recipients: CloudMapsDisclosure["recipients"],
  gatewayFallback?: string,
): string {
  const gateway =
    recipients.find((recipient) => recipient.role === "gateway")?.name ??
    gatewayFallback;
  const targets = [
    ...(gateway ? [gateway] : []),
    ...recipients
      .filter((recipient) => recipient.role !== "gateway")
      .map(
        (recipient) =>
          `${recipient.name} for ${recipient.role}, operated by ${recipient.operator}`,
      ),
  ];
  return targets.length
    ? `Searches, search areas and route points are sent to ${targets.join(" and ")}.`
    : "";
}

/** One sentence for location controls: who receives search text and coordinates. */
export function describeMapsDisclosure(
  disclosure: CloudMapsDisclosure | undefined,
): string {
  if (!disclosure) return "";
  return `${describeLocationRecipients(disclosure.recipients, "Cloud Maps")} Cloud keeps only the request type and result, not your searches or locations.`;
}
