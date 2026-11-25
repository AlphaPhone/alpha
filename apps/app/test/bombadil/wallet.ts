// spec/app/wallet/index.md, "A wallet that is absent or off shows no account, holding, request or past transfer, and reads none"; spec/app/wallet/transfer.md, "A review lapses at the time the agent gave, and a lapsed review approves nothing"
import { always } from "@antithesishq/bombadil";
import { extract } from "@antithesishq/bombadil/browser";

const offered = extract(({ document }) => {
  const names = [...document.querySelectorAll("button")].map((button) => button.getAttribute("aria-label") ?? button.textContent ?? "");
  return {
    resting: names.includes("Make wallet") || names.includes("Turn on"),
    lists: document.querySelector("section[aria-label=Wallet] section[aria-label=Holdings], section[aria-label=Wallet] section[aria-label='Past transfers'], section[aria-label=Wallet] section[aria-label='Waiting for your decision']") !== null,
    approve: names.includes("Approve"),
    again: names.includes("Review again"),
  };
});

/** A wallet that offers its making or its switching on shows nothing of a wallet. */
export const walletThatDoesNotServeShowsNothing = always(() => !(offered.current.resting && offered.current.lists));

/** Approve is never offered beside a fresh review of the same request: only a live review approves. */
export const walletApprovesOnlyALiveReview = always(() => !(offered.current.approve && offered.current.again));
