# Silo - Scalable Offchain Storage

Silo is a bonded centralised server that pledges to store and relay data for any Ethereum user.

## Centralised and Neutral

Existing tech giants are centralised and they can withhold and promote information arbitrarily. Decentralised systems like Ethereum offer neutrality to end users, but face a trade off between neutrality and scale.

Silo, by contrast, completely trades off decentralisation for scale, but retains neutrality. A Silo is an ordinary centralised server, but it is held accountable by an on chain [adjudicator](contracts/Adjudicator.sol) who slashes its [bond](contracts/Bond.sol) if it is not lively, or withholds information.

## Liveliness

A Silo guarantees that it will remain lively and accessible by taking a [liveliness pledge](contracts/Pledge/LivelinessPledge.sol). The liveliness pledge is essentially an on chain inbox. If the server becomes unresponsive, the user can make their request via the inbox. If the server doesn't respond in a timely manner, the pledge is considered broken and the adjudicator slashes the server's bond.

In principle, the server could ignore off chain requests and only address its requests in its inbox. However, it costs gas to respond on chain, so if a user makes an off chain request, the server is incentivised to respond off chain to avoid the risk of the user using the inbox and inducing gas fees. This results in similar scalability guarantees to [state channels](https://statechannels.org/) - no cost reduction in the uncooperative case, infinite cost reduction in the game theoretically favoured cooperative case.

## Relay

A Silo guarantees that it will honestly relay messages by taking a [relay pledge](contracts/Pledge/RelayPledge.sol). The relay pledge is an assertion that any stored messages will be relayed if they are requested. Whenever the server stores or relays a message it signs a receipt, and if the server stores a message then withholds it when requested, the receipts can be provided to the adjudicator to slash the bond.