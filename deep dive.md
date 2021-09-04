# Centralised and Neutral

<!-- TODO: rewrite intro to introduce stewarded systems in general, and Pelendur as an example -->

Existing chat protocols are either centralised and trusted, or  decentralised and credibly neutral. Trusted servers can withhold messages from their users, and decentralised protocols face architecture, logistical, and alignment complexities.

Pelendur, by contrast, is a credibly neutral centralised chat server.

It has the architecture of an ordinary centralised server, but it is held accountable to an on chain arbiter which keeps it lively and honest.

This approach should apply to social media and SaaS broadly.

# Protocol Overview

In order to be trustworthy a server must be lively and honest. A lively server responds to every request, an honest server responds and acts correctly.

## Liveliness

Liveliness is enforced with a ForceMove queue. It is in principle limited by the capacity of the underlying blockchain, but in practice both client and server benefit by cooperating off chain.

In the normal course of events the client creates an API request, signs it, and sends it directly to the server, expecting to be served. If the server fails to respond, the client can go to the blockchain and put the request into a queue. The server then has a certain amount of time to respond on chain, if it fails it incurs a substantial loss on its deposit/guarantee, some of which is gifted to the client as incentive.

## Honesty

In a simple chat server, there are only two API endpoints, `sendMessage` and `checkMessages`. To respond honestly to `sendMessage` the server must recieve and store the message. To respond honestly to `checkMessages` the server must return any relevant message it had at the time.

The server returns a signed receipt for every API call. These receipts can be used together to verify that server has behaved correctly. If the server said that it stored a give for Alice at time `t`, and it also said that Alice had no messages at time `t+1`, the two receipts together prove that the server did not pass on messages correctly.

To keep itself honest, the server locks assets in a smart contract which specifies that those assets will be slashed if contradictory receipts are provided.

## Payment

The server needs to be incentivised for the service it provides. Therefore each client must prove that it has provided some value in order to access the API or the on chain request queue. Three approaches are discussed below, and ultimately a hybrid proof-of-lockup/proof-of-burn model is chosen. The steward starts by making a new token and putting much of its supply on a DEX. 

To access the server in proof-of-lockup, a user just buys some of the token and locks for some subscription period. The price of the token rises, and the steward is able to cash out somewhat, since they own much of the supply. This is appropriate for an early stage service, where the token is largely bought by speculators and investors who don't want to spend or burn their funds.

To access the server in proof-of-burn, a user must buy some of the token and burn it in proportion to the time they want access to the server. This is appropriate for a steady state service, as the server continues to be paid via deflation, whereas if proof-of-lockup continued indefinitely users would no longer have to buy the token and the server wouldn't be rewarded. It is also better than microtransactions, as proof of burn rewards early investors and is technically simpler.

# Throughput

## Multichain

# Robustness

Decentralisation creates robustness as well as neutrality. For example, the internet was designed to work if the US were nuked, and Bitcoin was designed to work even if it were illegal everywhere. Stewarded systems, by contrast, are not inherently robust. The central server and be shut off by a hosting company, the devops team can be personally targetted etc. A stewarded system therefore does not inherit all the desirable properties of its consensus layer - it is not unstoppable, it is not uncensorable.

The point of stewarded systems is not to challenge the worlds most entrenched power structures (governments), but to reverse the accrual of power in the hands of technology companies, making them stewards over critical infrastructure, not lords. Therefore stewards should take greater pains than the average crypto developer to ensure that their company is above board in their jurisdiction.

## Opsec

## On chain DoS