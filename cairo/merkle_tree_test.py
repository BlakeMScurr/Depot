import os
import pytest

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

    assert await contract.merkle_layer([], 0).invoke() == (0,)
    assert await contract.merkle_layer([0], 0).invoke() == (1,)
    assert await contract.merkle_layer([69], 0).invoke() == (1,)
    assert await contract.merkle_layer([1,2], 0).invoke() == (1,)
    assert await contract.merkle_layer([1,2,3], 0).invoke() == (2,)
    assert await contract.merkle_layer([1,2,3,4], 0).invoke() == (2,)
    assert await contract.merkle_layer([1,2,3,4,5,6,7,8,9], 0).invoke() == (5,)
