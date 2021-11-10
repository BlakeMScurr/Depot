import os
import pytest
from pre_proof import merkle_tree, merkle_layer, chain_hash

from starkware.crypto.signature.signature import pedersen_hash
from starkware.starknet.testing.starknet import Starknet

# The path to the contract source code.
CONTRACT_FILE = os.path.join(
    os.path.dirname(__file__), "tester.cairo")


@pytest.mark.asyncio
async def test_merkle_layer():
    starknet = await Starknet.empty()
    contract = await starknet.deploy(
        source=CONTRACT_FILE,
    )

    assert (await contract.merkle_layer_t([], 0).invoke()).result == (0,)

    assert (await contract.merkle_layer_t([0], 0).invoke()).result == (1,)
    assert (await contract.val_in_next_layer([0], 0).invoke()).result == (0,)

    assert (await contract.merkle_layer_t([69], 0).invoke()).result == (1,)
    assert (await contract.val_in_next_layer([69], 0).invoke()).result == (69,)

    assert (await contract.merkle_layer_t([1,2], 0).invoke()).result == (1,)
    assert (await contract.val_in_next_layer([1,2], 0).invoke()).result == (pedersen_hash(1,2),)

    assert (await contract.merkle_layer_t([1,2,3], 0).invoke()).result == (2,)
    assert (await contract.val_in_next_layer([1,2,3], 0).invoke()).result == (pedersen_hash(1,2),)
    assert (await contract.val_in_next_layer([1,2,3], 1).invoke()).result == (3,)

    assert (await contract.merkle_layer_t([1,2,3,4], 0).invoke()).result == (2,)
    assert (await contract.val_in_next_layer([1,2,3,4], 1).invoke()).result == (pedersen_hash(3,4),)

    assert (await contract.merkle_layer_t([1,2,3,4,5,6,7,8,9], 0).invoke()).result == (5,)
    assert (await contract.val_in_next_layer([1,2,3,4,5,6,7,8,9], 3).invoke()).result == (pedersen_hash(7,8),)
    assert (await contract.val_in_next_layer([1,2,3,4,5,6,7,8,9], 4).invoke()).result == (9,)
    assert merkle_layer([1,2,3,4,5,6,7,8,9]) == [pedersen_hash(1,2), pedersen_hash(3,4), pedersen_hash(5,6), pedersen_hash(7,8), 9]

@pytest.mark.asyncio
async def test_merkle_tree():
    starknet = await Starknet.empty()
    contract = await starknet.deploy(
        source=CONTRACT_FILE,
    )

    # TODO: handle the trivial case of an empty tree - currently panics
    assert (await contract.merkle_tree_t([]).invoke()).result == (0,)
    assert (await contract.merkle_tree_t([1]).invoke()).result == (1,)
    assert (await contract.merkle_tree_t([1,2]).invoke()).result == (pedersen_hash(1,2),)
    assert merkle_tree([1,2]) == pedersen_hash(1,2)

    merkleTree1to4 = (await contract.merkle_tree_t([1,2,3,4]).invoke()).result.root_hash
    assert merkleTree1to4  == pedersen_hash(
        pedersen_hash(1,2),
        pedersen_hash(3,4)
    )
    assert merkleTree1to4 == merkle_tree([1,2,3,4])

    merkleTree1to5 = (await contract.merkle_tree_t([1,2,3,4,5]).invoke()).result.root_hash
    assert merkleTree1to5 == pedersen_hash(
        pedersen_hash(
            pedersen_hash(1,2),
            pedersen_hash(3,4)
        ),
        5
    )
    assert merkleTree1to5 == merkle_tree([1,2,3,4,5])

@pytest.mark.asyncio
async def test_hash_single_request():
    starknet = await Starknet.empty()
    contract = await starknet.deploy(
        source=CONTRACT_FILE,
    )

    zeroHash = (await contract.hash_request_t(0,0,0,0,0,0,0,0,0,0).invoke()).result.hash
    assert zeroHash == pedersen_hash(
        pedersen_hash(
        pedersen_hash(
        pedersen_hash(
        pedersen_hash(
        pedersen_hash(
        pedersen_hash(
        pedersen_hash(
        pedersen_hash(0,0),0),0),0),0),0),0),0),0)
    assert zeroHash == chain_hash([0,0,0,0,0,0,0,0,0,0])

    inchash = (await contract.hash_request_t(0,1,2,3,4,5,6,7,8,9).invoke()).result.hash
    assert inchash == pedersen_hash(
        pedersen_hash(
        pedersen_hash(
        pedersen_hash(
        pedersen_hash(
        pedersen_hash(
        pedersen_hash(
        pedersen_hash(
        pedersen_hash(0,1),2),3),4),5),6),7),8),9)
    assert inchash == chain_hash([0,1,2,3,4,5,6,7,8,9])

@pytest.mark.asyncio
async def test_hash_request_tree():
    starknet = await Starknet.empty()
    contract = await starknet.deploy(
        source=CONTRACT_FILE,
    )

    # expect (somewhat) randomly built request trees to hash as normally

    # expect failure if meta is not 0, as 0 represents "store" and only stored messages should be found in the snapshot

    # expect failure for out of order requests
    # ensure we fail if we are out of order by requestLinter, user, blockNumber, message1, message2, message3, or message4

    # expect failure for two totally identical messages being included
    
    # expect failure when any message is stored after the specified block (i.e., ensure all messages are before a certain block)


