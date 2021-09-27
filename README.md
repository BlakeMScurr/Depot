# Centralised and Neutral

<!-- TODO: find Swiss Crossbow analogy rather than steward -->

Existing social media platforms are either centralised and trusted, or decentralised and credibly neutral. Trusted servers can withhold posts and messages from their users, and decentralised protocols face architecture, logistical, alignment, and credibility complexities.

Stewarded systems, by contrast, are centralised yet credibly neutral. They have the architecture of an ordinary centralisd server, but are held accountable by an on chain arbiter which keeps it lively and honest.

Even if they are a monopolist, the owner of the server is not a monarch, and cannot impose arbitrary rules on their users. Rather, they are a steward over public infrastructure.

This paper describes the a simple stewarded chat server built on Ethereum, but the principles can be extended to social media and SaaS in general built on any blockchain.

<!-- TODO: rewrite as minimal social medium, not chat server -->

# Problems with Existing Systems

## Centralised

- Accrual of power - POTUS was destroyed by Twitter and Facebook.
- Control of narrative - Banning, shadow banning, algorithm manipulation.
- Reduction of innovation - UI monopoly.
- Addiction Optimisation - Users stuck with addictive UI and reccomenders. Can't, for example, use sense making optimised reccomenders. 

## Decentralised

- L1  novelty - Many are built on custom largely untrusted layer 1s
- Architecture - It's simply harder to build P2P software- . The web's tech stacke is built on a client-server model.
- Logistical - Decentralised systems have to coordinate to have their nodes update software, and handle potential conflicts
- Alignment - Some decentralised systems are fully non excludable, and dev/ops compensation is not aligned with the system's value

# Protocol Overview

In order to be trustworthy a server must be lively and honest. A lively server responds to every request, an honest server responds and acts correctly.

## Liveliness

Liveliness is enforced with a ForceMove pool. It is in principle limited by the capacity of the underlying blockchain, but in practice both client and server benefit by cooperating off chain.

In the normal course of events the client creates an API request, signs it, and sends it directly to the server, expecting to be served. If the server fails to respond, the client can go to the blockchain and put the request into a pool. The server then has a certain amount of time to respond on chain, if it fails it incurs a substantial loss on its deposit/guarantee, some of which is gifted to the client as incentive.

<!-- TODO: how short can the wait before slash be, to ensure that the transaction gets into the block. What MEV tricks can be used against me? -->

## Honesty

In a simple chat server, there are only two API endpoints, `sendMessage` and `checkMessages`. To respond honestly to `sendMessage` the server must recieve and store the message. To respond honestly to `checkMessages` the server must return any relevant message it had at the time.

The server returns a signed receipt for every API call. These receipts can be used together to verify that server has behaved correctly. If the server said that it stored a give for Alice at time `t`, and it also said that Alice had no messages at time `t+1`, the two receipts together prove that the server did not pass on messages correctly.

To keep itself honest, the server locks assets in a smart contract which specifies that those assets will be slashed if contradictory receipts are provided.

## Payment

The server needs to be incentivised for the service it provides. Therefore each client must prove that it has provided some value in order to access the API or the on chain request pool. Three approaches are discussed below, and ultimately a hybrid proof-of-lockup/proof-of-burn model is chosen. In any case, the steward starts by making a new (fungible) token and putting much of its supply on a DEX. 

To access the server in proof-of-lockup, a user just buys some of the token and locks for some subscription period. The price of the token rises, and the steward is able to cash out somewhat, since they own much of the supply. This is appropriate for an early stage service, where the token is largely bought by speculators and investors who don't want to spend or burn their funds.

To access the server in proof-of-burn, a user must buy some of the token and burn it in proportion to the time they want access to the server. This is appropriate for a steady state service, as the server continues to be paid via deflation, whereas if proof-of-lockup continued indefinitely users would no longer have to buy the token and the server wouldn't be rewarded. It is also better than microtransactions, as proof of burn rewards early investors and is technically simpler.

<!-- TODO: discuss sending money back to the server as a non-micropayment. In particular, this will have  -->

<!-- TODO: discuss minimum possible payment, how we can still offer reasonable services for free -->

# Throughput

The minimum possible throughput is defined by the throughput of the onchain request pool. In order to be credibly lively, adding to the pool must be as cheap as possible.

## r/a Ratio

Let `r` be the gas cost the server must pay to remove a message from the pool, and let `a` be the gas cost a user must pay to add a message to the pool. Malicious actors can always impose `r/a` times more economic damage to the server than it costs. If `r/a` is we 10, the malicious actor could spend 10k gas adding a message to force the server to spend 100k gas removing it.

On the other hand, a low `r/a` ratio reduces the server's incentive to respond off chain. I `r/a` were 0.1, the server could single censor a user, and only incur a 10k gas cost for every 100k gas the user spent enforcing their right to the service.

Therefore the `r/a` ratio creates a tension between liveliness and robustness, each of which can be exploited by enemies of neutral infrastructure. We could attempt to decude a priori which attack is more likely and adjust the ratio accordingly. In the long run (30+ years), it's safe to assume that the founding principles of a company running a stewarded system will be diluted, and it will resemble any other corporation of similar size. Therefore we must guard equally against outside attacks, as against attacks by the server against its users, and the `r/a/` ratio should be approximately 1.

We could provide an updating mechanism to alter the `r/a` ratio according to the needs of the time. However, since a steward could lower the `r/a` ratio to enable censorship, the updating mechanism would have to be finely balanced among participants. Such a mechanism would significantly increase the protocol's attack surface for little gain.

### Gas Splitting

## Multichain

The server can increase minimum throughput by duplicating the request pool contract across layer 1s. The challenge in going multichain is that the client must demonstrate proof-of-burn/proof-of-ownership on chain 2, and the server must still have a liveliness guarantee on chain 2 that can be burned. As long as the request pool contract on chain 2 produces receipts that can be used in honesty arbitration on chain 1, the server needn't have an honesty guarantee on chain 2. This means that the server can utilise low trust chains by staking small guarantees, and achieve low certainty liveliness while retaining high certainty honesty.

### Proof of Ownership

A simple solution to cross chain proof-of-ownership is to have a new token for each chain, and have the liveliness pool on chainX only accept proof of ownership for tokens on chainX. The tokens can then be pegged crosschain, ensuring a consistent price.

<!-- TODO: research - I have literally no idea how this works -->

Alternatively, if smart contracts can read the state of other chains via oracles etc, proof of ownership could be enforced on the ledger of record, and request pool on scale ledgers can simply read it there. This means that subscription is always guaranteed by the ledger of record, and scale ledgers only require minimal trust.

<!-- TODO: make nomenclature like "chain 2" "chainX" "ledger of record", and "scale ledgers" consistent -->

## Rate Limiting

# Robustness

Decentralisation creates robustness as well as neutrality. For example, the internet was designed to work if the US were nuked, and Bitcoin was designed to work even if it were illegal everywhere. Stewarded systems, by contrast, are not inherently robust. The central server and be shut off by a hosting company, the devops team can be personally targetted etc. A stewarded system therefore does not inherit all the desirable properties of its consensus layer - it is not unstoppable, it is not uncensorable.

The point of stewarded systems is not to challenge the worlds most entrenched power structures (governments), but to reverse the accrual of power in the hands of technology companies, making them stewards over critical infrastructure, not lords. Therefore stewards should take greater pains than the average crypto developer to ensure that their company is above board in their jurisdiction.

## Opsec

## Legal

<!-- TODO: discuss how we can put measures in place to prevent child porn etc -->
<!-- TODO: discuss how we can cross jurisdictions -->
<!-- TODO: discuss how we can agressively threaten people who do this -->
<!-- TODO: discuss the best possible jurisdictions to house our servers -->
## Investor/Company Relations

<!-- TODO: discuss how this is not strictly an LLC in which token investors own part of the company, but rather there is a company who owns the tokens, which are its main representation. Transfer proofs benefit the LLC, whereas burn benefits token holders. -->

## Forks

Decentralised systems eventually reach dynamic equilibrium. They can handle stressors like certain nodes being taken out, but from a bird's eye the system remains fairly constant. Centralised systems are inherently more fragile, if the central storage dies it's game over. 

<!-- TODO: outline a forced full dump mechanism that would allow hostile data takeovers -->
<!-- TODO: consider possible decentralisation attempts -->

# Pricing

# Social Strategy

<!-- TODO: do people care about free speech anyway? -->
<!-- TODO: aren't people satisfied with the fractured internet as it is? -->
<!-- TODO: how do we stop it from being perceived as a home for generally repulsive extremists? -->
