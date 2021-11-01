# ZK Rewrite

We are rewriting silo to use zero knowledge proofs rather than interactive proofs. The primary reason is that the server/nodes can be forced to provide a far greater range data. Indeed, since ZKPs can perform arbitrary computation, we will be able to prove arbitrary facts about the data in the silo. Simple example: if someone wanted to use Silo as the backend to an NFT marketplace, and Silo held the orderbook, it would be nice to recieve a proof that the order offered was the highest one. In order to provide such a proof with the interactive method (i.e., the style of the original RelayPledge) one would probably have to compute a new merkle tree that's ordered based on the prices of offers for particular NFTs, and you'd need to have an interactive proof to show that the tree was computed in order. This is very foolish. Instead our snapshot can be *proven* to be in order with a simple zkp cairo program, and we can have other cairo programs that could prove that we've covered all the whole tree and found the best offer.

The main trouble in building this, is considering how we are going to decentralise it across a variety of committees. But you know what, that's a problem for later! We should probably just build a simple centrlised version that updates the merkle root in the style of the "Hello Cairo" AMM or voter, that is, we prove that merkle_root_2 is exactly the same as merkle_root_1, except with data added in order from recent blocks.

State level pressure, and 3rd party zkps. These are to consider.

3rd party zkps are interesting - we could potentially add a pledge that requires the silo to dump out all the info for a given contract, (perhaps for a price, and perhaps only to a given party), then, if the pledge were robust enough, that party could make its own pledge that it would give access to the data from its own contract, and that it would do particular zkps. Nah, I don't like that particularly. That means that they are essentially just running their own silo server, and they don't benefit from the decentralization we'll build into silo.

State level pressure! In order to be properly neutral, we need to become properly decentralised, and avoid tyrannical governments etc. The existing design for Silo wouldn't let states pressure Silo into lying, but they could destroy silo quite easily - so could smaller hostile parties for that matter!

# Archive Committes

What are the critical issues:
    - cross-committee queries
        - malicious delay
        - speed
    - arbitrary proofs
    - committee selection
    - incentivisation

## Cross Committee Queries


