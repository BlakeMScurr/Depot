# Reccomendation and Search

Reccomendation and Search algorithms are a critical part of any social media platform. We should be able to produce validity proofs for the training and execution of these algorithms. These snarks would prove that a given model had been trained on all available data in the silo (optionally matching some criteria), and that the model had been faithfully executed for a given prompt/parameter.This would be a critical breakthrough in social media, as we'd finally be able to trust the reccomenders that are currently so opaque and manipulative.

This repo demonstrates a simple neural network running on StarkNet, and is the only ML with validity proofs in existence to my knowledge. https://github.com/guiltygyoza/tiny-dnn-on-starknet
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