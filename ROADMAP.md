# Light Clients

Currently every user has to save a record of their stored messages, so that they can threaten to invoke the relay thread if the server fails to relay messages correctly.

Clients should be able to be confirm that their messages are saved, then forget them and rely on the silo as the arbiter of truth.

We will achieve this with snapshots. To make a snapshot the server will arrange all messages in its history and build them into a merkle tree. The merkle root is called the snapshot. The server will make various pledges to ensure that all messages are recoverable from snapshots.

## WillSnapshotPledge

This pledge says that the server will definitely post on chain snapshots (merkle roots by block number) within a given time period (n blocks in the future).

## MerklePledge

This pledge says that if you make a `merkle` request using a signed store receipt, the server will have to provide a merkle proof that that store request was snapped.

Note, we will require every snapshot to contain every message *at and before* its current block, making each snapshot a superset of every earlier snapshot.

## Order Pledge

This pledge states that the order of any two merkle receipts must correspond to their order as messages.

## Reentrancy

Note, since these would be external contract calls to arbitrary unvetted contracts, we'd have to be wary of reentrancy attacks etc. Ideally we wouldn't require them to be vetted, since that would restrict the developer and introduce a choke point.

## Malicious Silo

With business logic contracts, no one can *force* the server to create junk data, but the server itself can decide to store junk data if it wants. It is dangerous to make a separate pledge stating that the server can't sign messages that are invalid according to their business logic contracts, since contracts are impure and a malicious developer could force the server into signing something that becomes invalid later. There may be a static analysis technique that we can use to ensure that only pure business logic contracts are enforceable.

# Reccomendation and Search

Reccomendation and Search algorithms are a critical part of any social media platform. This is a very complex feature, but ideally we would be able to implemt a neural network training and execution algorithms as quadratic arithmetic programs, and produce zk-snarks (or similar). These snarks would prove that a given model had been trained on all available data in the silo (optionally matching some criteria), and that the model had been faithfully executed for a given prompt/parameter.This would be a critical breakthrough in social media, as we'd finally be able to trust the reccomenders that are currently so opaque and manipulative.

# L2 scaling

The minimum throughput of the system is limited by the capacity of the underlying blockchain. If a server became malicious and tried to restrict access to users (despite the cost to itself), the minimum throughput would simply be the number of messages able to be put in the on chain pool. To increase this number, we should investiagate rollups, cross-chain architectures etc. Any EVM compatible rollup with a tie back to the Ethereum block.number would be the easiest solution - we could deploy another version of the liveliness pledge there, and reference it in the adjudicator.

# Decentralisation

While we achieve data availability and honesty guarantees in a bonded centralised system, we have several disadvantages over a decentralised system:

## Disadvantages of centralisation

### Low cost censorship

The central server can always require a given user to go on chain to use the system. Since there is likely to be an economic assymetry between any central server and most users, the central server can easily afford the gas fees to censor any given user. It can't apply this at scale, but the threat of gas fees against small players may be enough to deter them from trying. Similar to how large corporations (i.e., insurance companies) can risk going to court over claim enforcement, because they know most of their clients don't have the money to pay legal fees (TODO: citation needed).

Traditional blockchains on the other hand are virtually impossible to censor, as there is only a 1-of-N honesty requirement to access the network.

### High risk for central party

In the centralised model, if the there is one breach onto the server and the keys are captured, the whole bond may be forfeit. They will likely need to run on a complex architecture on a 3rd party cloud server, and the attack surface becomes extremely large and dangerous.

### Organised Pressure

A centralised server will have a specific and targettable hosting company, CDN, DDoS protector, jurisdiction, company headquarters, employee base, which can all be independently targetted. It will inevitably crumble to government pressure, which will push it to be as censorous as possible given the onchain constrctions, or destroy it altogether.

## Archive Comittees

The centralised model has one server who is responsible for both signing new data into the storage history, and making it available. We can split off these responsibilities and have other nodes be responsible for storing snapshots once they've entered the history. The blockhash can define an m-of-n subset of available archivers to store the data fro ma given block, and those archivers can be bonded by a typical liveliness, relay, and snapshot pledge combination.

This will require further thinking about incentivisation - the centralised model works by the central server being run by a major token holder, and the token appreciates as the protocol itself becomes more widely used.

There could be a way to transfer away your archiving responsibilities, however we don't want to create block level centralisisation - one person could buy up the committee for a given block and censor it (to some degree). However, this probably doesn't actually work, especially if we just allow people to enter existing archive committees (at their own risk, since they have should have all the data or risk being slashed).

There is a risk that members of archive committees will rely on their peers to store information. However, we can make it impossible for a lazy member to force another member to give them an answer by disabling the onchain inbox for equivalent requests to different members.

There needs to be a handoff period before the archivers can be expected to have recorded the full block. It needs to account for a reasonable time to force it out of the signer. The minimal time is the inbox response leeway, but that's not enough, since then everything would always go on chain.

## Signer Rotation

The signer for each block should rotate just like the block creator at L1. This makes it less likely that an inactive signer can hold up progression, or that a non-relaying signer can force the archivers to clog up the gaslimit requesting state.

## Signer Sharding

Currently we only shard in terms of time, but we could shard across the address space, such that there are multiple signers per block.

# Rich Querying

If silo is to serve as a backend to crud style apps, we need richer querying capabilities. Basic operations that would generally require one cheap API call in a traditional web2 app should ideally only require one call to Silo, and be verifiable in some small, ideally constant number of steps. For example, we are currently able to search from a given point in a list of messages, matching on user and linter (i.e., business logic) in a single request, and a single party can verify ordering with a request per earlier message, and one request per earlier user in the same block (this ought to be improved too).

Some basic use cases for richer querying:
    - Finding the highest offer in an NFT marketplace
    - Most recent post by any user for a social media feed

## Snark snapshots

By adding a snark to the snapshot, we can reduce the proof of correct response down to a constant size, and respond in a single API call. This will also be useful in proving richer queries.

Rather than just having to commit to the merkle root of a snapshot, the server could also be required to provide a zk-snark that proves that the data in the merkle tree is well ordered. If the user knows that each snapshot it ordered, then showing the returned message and the ones on either side proves that it's the right message, and (assuming that it's ordered by user too), showing the two users on either side proves that there is no message.

Note: this may make the relay pledge entirely obselete!!!

## Merkle DAG

Suppose we have an NFT marketplace, where users make offers to one another, and the offer is in some uint256 field. The linter contract can require a specific format for messages, and we can isolate the uint256 using indices in the bytes of the message. Now we can write a separate indexing function in the business logic that orders messages by offer price, and sorts them by NFTs they're offered for. We can write this indexing function in Cairo (etc), and upload a snark prover, now the server can order the the marketplace part of the merkle tree by offer, produce a snark showing it was done correctly, and provide the snark to the onchain indexing function. If the server asserts that it will provide a snark for a given indexing function for every snapshot, then find requests based on message logic can be proven in the same simple steps outlined above. For example, to find the highest offer for an NFT, we just show that there is no higher offer by showing that the next chunk in the tree belongs to the next NFT, or we show that there are no offers by showing that two surrounding NFTs are directly adjacent to one another.