# Easement

An Easement is a method to ensure cencorship free access to an offchain data store.

It can be used for simple read/write applications like most social media or publishing. I also suspect it can be paired with a validium to assure users of data availability.

# Properties

Free read/write in cooperative case.

Constant cost to read/write in the adversarial case.

Stateless clients.

# How does it work?

Censorship resistance for Easements has three components: liveliness, findability, and storability.

Liveliness means that anyone with an internet connection has access to the Easement, and that their requests will be addressed.

Findability means that anything stored by any user can be provably found by any other user.

Storability means that any message can be provably stored by any user.

## Liveliness

We call the person/group who runs the data store the ***Steward***.

Any Ethereum user can read and write to the data store by making requests to the onchain ***Inbox***.

The Steward must address every message in the inbox, as they can have their ***Bond*** slashed if they let messages get stale.

It costs gas for the Steward to address a message in the inbox, so they have an incentive to accept and address requests offchain.

So we say Easements are lively, since requests made to the Steward are always addressed.

## Findability

The store is just a list of store requests sorted by user, then chronologically, then lexicographically.

The state of the store is commited to at each (n) block(s) with a ***Snapshot*** posted to Ethereum. A snapshot is simply a merkle root of the state, a merkle root of the previous state, and a zk proof that the state is properly formed.

The Steward is required to post a Snapshot regularly or else the bond will be slashed.

A find request asks for the message in the list before a given message.

To address a find request, the Steward must respond with a signed receipt containing the returned message and a zk proof it was found correctly within a given Snapshot.

If the Steward responds with an invalid proof, the bond is slashed.

So we can say any message is findable by any user, since any user can incrementally request the whole store, and each response must be correct.

## Storability

To address a store request, the Steward must simply sign the request.

Each store request specifies the time (block number) at which it should be included in the store. So once the time has passed, the user can send a find request to confirm that their message was properly stored.

If the message was not stored, the user can provide the receipts (one declaring that the message would be stored, another proving that the message was not stored) and slash the bond.

Once the message is proven to be stored the user can discard the receipts, knowing that they can retrieve the message again if needed.

Thus we can say that any user can store any message via an Easement.
