import os
import pytest

from starkware.crypto.signature.signature import pedersen_hash
from starkware.starknet.testing.starknet import Starknet

# The path to the contract source code.
CONTRACT_FILE = os.path.join(
    os.path.dirname(__file__), "merkle_tree.cairo")


# The testing library uses python's asyncio. So the following
# decorator and the ``async`` keyword are needed.
@pytest.mark.asyncio
async def test_merkle_layer():
    # Create a new Starknet class that simulates the StarkNet
    # system.
    starknet = await Starknet.empty()

    # Deploy the contract.
    contract = await starknet.deploy(
        source=CONTRACT_FILE,
    )

    assert (await contract.merkle_layer([], 0).invoke()).result == (0,)

    assert (await contract.merkle_layer([0], 0).invoke()).result == (1,)
    assert (await contract.val_in_next_layer([0], 0).invoke()).result == (0,)

    assert (await contract.merkle_layer([69], 0).invoke()).result == (1,)
    assert (await contract.val_in_next_layer([69], 0).invoke()).result == (69,)

    assert (await contract.merkle_layer([1,2], 0).invoke()).result == (1,)
    assert (await contract.val_in_next_layer([1,2], 0).invoke()).result == (pedersen_hash(1,2),)

    assert (await contract.merkle_layer([1,2,3], 0).invoke()).result == (2,)
    assert (await contract.val_in_next_layer([1,2,3], 0).invoke()).result == (pedersen_hash(1,2),)
    assert (await contract.val_in_next_layer([1,2,3], 1).invoke()).result == (3,)

    assert (await contract.merkle_layer([1,2,3,4], 0).invoke()).result == (2,)
    assert (await contract.val_in_next_layer([1,2,3,4], 1).invoke()).result == (pedersen_hash(3,4),)

    assert (await contract.merkle_layer([1,2,3,4,5,6,7,8,9], 0).invoke()).result == (5,)
    assert (await contract.val_in_next_layer([1,2,3,4,5,6,7,8,9], 3).invoke()).result == (pedersen_hash(7,8),)
    assert (await contract.val_in_next_layer([1,2,3,4,5,6,7,8,9], 4).invoke()).result == (9,)
