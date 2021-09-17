# Queues and Pools

I recently simplified the code in a way that I think is instructive for writing safe and simple solidity.

## Synopsis

In Stewarded Servers, there must be a way to make requests on chain, to force the server to respond and remain active. My initial thinking was that there should be a request queue. The server addresses requests in order, if it falls behind a certain threshhold, it incurs a penalty. But some considerations around timing and signing meant that I couldn't do a simple fifo queue, and I had to use a proper priority queue instead. This additional complexity caused problems with the enqueue/dequeue cost ratio, opening up surface area for attacks. Eventually, I realise I could drop the queue, and use a simple map. Maps (I think) have constant time insertion and deletion, and are built into the language, making them incredibly simple to use. I had to drop the ordering, but I can still ensure that all requests are promptly responded to. So the server could delay responses for a given user, but it will still be within the allotted time.

## Timing and signing

It turns out that the timing of requests is highly relevant to the integrity of the system. Say the server pledges that it will faithfully relay any message by Alice to Bob if he asks for it. If Bob requests Alices message at time `t` before she has sent anything, the server will respond that she sent nothing. If she sends a message at time `t+1` and he asks the same thing at time `t+2`, the server will respond with her message. Therefore it's critical that our messages have reliable timestamps to enforce the server's pledge.

Signing is also important. We don't want Eve to be able to send unsigned messages on behalf of Alice and force the server to respond to them. Unfortunately, if the block number (or other timing mechanism) is built into the signed request, we can't have any on chain flexibility about when the message was recivied. The queue has to ensure that requests aren't pretended to be in the past, or else users could rewrite history, that means that users have to sign a request with a blocknumber some time in the future, and hope that they have provided enough gas for it not to be rejected.

Unfortunately this means that if we have a queue, and a block number in our signed messages, we have to allow some amount of flexibility in which block number the user can sign, and we can't use a simple fifo queue. Suppose we have a very timid and frugal user who pays minimal gas fees but is happy for their request to be addressed 100 blocks from now, after which we have a rich and impatient user who wants their request addressed in the next couple of blocks. Then our queue will be out of order with respect to the blocks each request is supposed to be addressed in. Continuing with fifo will have terrible consequences, as the server will either have to respond to a message very early before it has appropriate information, or it will have to ignore a message.

## Priority Queues

The first possible alternative to a naive array based queue is using binary search insertion. However, to implement that in solidity we'd need a linked list for random insertion. An alternative is a heap based priority queue, however I suspect that can be gamed by a malicious attacker who always enqueues in a way that imposes maximum cost on the dequeuer - maybe this is wrong, but surely one could create a highly imbalanced binary tree. Even if not, the cost of dequeueing is variable and higher than enqueueing, which imposes an unbalanced cost on the server - and we can do better.

## Pool

When I realised I wanted constant time insertion and deletion I realised I needed a mapping. If I simply store requests with their hash as a key, the server can respond to any request and delete it at any time, and one can impose a penalty for lateness by giving a key for a message that is late. We can implement a simple free off chain method for finding late requests by either searching through logs, or creating a view function that returns the requests in the queue. Thus we have moved much of the calculation off chain, and we end up with simpler and more comprehensible contracts.