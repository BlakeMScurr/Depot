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

# Business Logic

## Problem

Suppose a developer wants to use Silo as a backend for their chat application. They could set up their own silo, and have to develop trust with users that they are running the silo well, and that their bond is sufficient, or they could run their application on a well established third party silo. This is simple, just have the chat connect to the third party Silo backend and send/threaten messages that way. We already have the functionality to force search by prefix, so chat messages can be prepended with `\x01somechat`, and we can only ask for messages with that prefix. However, anyone else using the silo could store, or have their users store, some messages with the same prefix. And if the messages were actually binary for some complex data structure, that would corrupt the data and break the user experience.

## Solution

The solution is to have a `businessLogicAddress` prepended instead of an arbitrary string. Then, in the livelinessPledge, the adjudicator checks that the message is valid according to some separate contract specifying the business logic. This way, the chat developer can specifiy the meaning of each message, and no one else can add corrupted messages to the server.

## Reentrancy

Note, since these would be external contract calls to arbitrary unvetted contracts, we'd have to be wary of reentrancy attacks etc. Ideally we wouldn't require them to be vetted, since that would restrict the developer and introduce a choke point.

## Malicious Silo

With business logic contracts, no one can *force* the server to create junk data, but the server itself can decide to store junk data if it wants. It is dangerous to make a separate pledge stating that the server can't sign messages that are invalid according to their business logic contracts, since contracts are impure and a malicious developer could force the server into signing something that becomes invalid later. There may be a static analysis technique that we can use to ensure that only pure business logic contracts are enforceable.

# Reccomendation and Search

Reccomendation and Search algorithms are a critical part of any social media platform. This is a very complex feature, but ideally we would be able to implemt a neural network training and execution algorithms as quadratic arithmetic programs, and produce zk-snarks (or similar). These snarks would prove that a given model had been trained on all available data in the silo (optionally matching some criteria), and that the model had been faithfully executed for a given prompt/parameter.This would be a critical breakthrough in social media, as we'd finally be able to trust the reccomenders that are currently so opaque and manipulative.