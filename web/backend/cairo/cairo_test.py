import os
import pytest
from pre_proof import merkle_tree, make_merkle_tree, merkle_layer, chain_hash

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
    assert merkle_layer([1,2,3,4,5,6,7,8]) == [pedersen_hash(1,2), pedersen_hash(3,4), pedersen_hash(5,6), pedersen_hash(7,8)]

@pytest.mark.asyncio
async def test_merkle_tree():
    starknet = await Starknet.empty()
    contract = await starknet.deploy(
        source=CONTRACT_FILE,
    )

    # TODO: handle the trivial case of an empty tree
    assert (await contract.merkle_tree_t(0, [1]).invoke()).result == (1,)
    assert (await contract.merkle_tree_t(1, [1,2]).invoke()).result == (pedersen_hash(1,2),)
    print(make_merkle_tree([1,2]))
    assert make_merkle_tree([1,2])[0][0] == pedersen_hash(1,2)

    merkleTree1to4 = (await contract.merkle_tree_t(2, [1,2,3,4]).invoke()).result.root_hash
    assert merkleTree1to4  == pedersen_hash(
        pedersen_hash(1,2),
        pedersen_hash(3,4)
    )
    assert merkleTree1to4 == make_merkle_tree([1,2,3,4])[0][0]

    merkleTree1to5 = (await contract.merkle_tree_t(3, [1,2,3,4,5]).invoke()).result.root_hash
    mv = 2 ** 250
    max_hash = chain_hash([mv, mv, mv, mv, mv, mv, mv, mv, mv, mv])
    assert merkleTree1to5 == pedersen_hash(
        pedersen_hash(
            pedersen_hash(1,2),
            pedersen_hash(3,4)
        ),
        pedersen_hash(
            pedersen_hash(5, max_hash),
            pedersen_hash(max_hash, max_hash),
        )
    )

    assert merkleTree1to5 == make_merkle_tree([1,2,3,4,5, max_hash, max_hash, max_hash])[0][0]

    with pytest.raises(Exception) as e_info:
        await contract.merkle_tree_t(1, [1,2,3,4]).invoke()
    assert e_info.value.message.find("assert_nn_le(elems_len, full_length)") != -1

    with pytest.raises(Exception) as e_info:
        await contract.merkle_tree_t(4, [1,2,3,4]).invoke()
    assert e_info.value.message.find("assert_nn_le(full_length, elems_len*2)") != -1

    with pytest.raises(Exception) as e_info:
        await contract.merkle_tree_t(5, [1,2,3,4,5]).invoke()
    assert e_info.value.message.find("assert_nn_le(full_length, elems_len*2)") != -1

    assert make_merkle_tree([1,2,3,4]) == [[3000975577331064457418989440417805546270001226817465829206893032529539211230], [2592987851775965742543459319508348457290966253241455514226127639100457844774, 1078504723311822443900992338775481548059850561756203702548080974952533155775]]

@pytest.mark.asyncio
async def test_merkle_proofs():
    t = merkle_tree([1,2,3,4,5,6,7,8])
    assert t.is_member(1) == True
    assert t.is_member(9) == False

    assert t.layers == [[1130932076458321799193601272100481259942281698893666036448733638625239224522], 
        [3000975577331064457418989440417805546270001226817465829206893032529539211230, 2557636746132495840978977608457255533565501289266531688603149201889498212683], 
        [2592987851775965742543459319508348457290966253241455514226127639100457844774, 1078504723311822443900992338775481548059850561756203702548080974952533155775, 887847247223813684398612989470912626224213579404697697378648600264021898263, 1639567931862120316944501436886260401899290029152657621735471556017756287204],
        [1,2,3,4,5,6,7,8]
    ]

    # assert t.proof(1) == [
    #     {"left": True, "value": 2557636746132495840978977608457255533565501289266531688603149201889498212683},
    #     {"left": True, "value": 1078504723311822443900992338775481548059850561756203702548080974952533155775},
    #     {"left": True, "value": 2}
    # ]

    assert t.proof(8) == [
        {"left": False, "value": 3000975577331064457418989440417805546270001226817465829206893032529539211230},
        {"left": False, "value": 887847247223813684398612989470912626224213579404697697378648600264021898263},
        {"left": False, "value": 7},
    ]

    assert t.proof(5) == [
        {"left": False, "value": 3000975577331064457418989440417805546270001226817465829206893032529539211230},
        {"left": True, "value": 1639567931862120316944501436886260401899290029152657621735471556017756287204},
        {"left": True, "value": 6},
    ]

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

    incHash = (await contract.hash_request_t(0,1,2,3,4,5,6,7,8,9).invoke()).result.hash
    assert incHash == pedersen_hash(
        pedersen_hash(
        pedersen_hash(
        pedersen_hash(
        pedersen_hash(
        pedersen_hash(
        pedersen_hash(
        pedersen_hash(
        pedersen_hash(0,1),2),3),4),5),6),7),8),9)
    assert incHash == chain_hash([0,1,2,3,4,5,6,7,8,9])

@pytest.mark.asyncio
async def test_hash_requests():
    starknet = await Starknet.empty()
    contract = await starknet.deploy(
        source=CONTRACT_FILE,
    )

    zeroHash = (await contract.val_of_hashed_requests(
        0,0,0,0,0,0,0,0,0,0,
        0,1,2,3,4,5,6,7,8,9,
        0,
    ).invoke()).result.hash
    assert zeroHash == chain_hash([0,0,0,0,0,0,0,0,0,0])

    incHash = (await contract.val_of_hashed_requests(
        0,0,0,0,0,0,0,0,0,0,
        0,1,2,3,4,5,6,7,8,9,
        1,
    ).invoke()).result.hash
    assert incHash == chain_hash([0,1,2,3,4,5,6,7,8,9])

@pytest.mark.asyncio
async def test_hash_request_tree():
    starknet = await Starknet.empty()
    contract = await starknet.deploy(
        source=CONTRACT_FILE,
    )

    m = 2 ** 250
    requestData = lambda : [
        # meta  rql user    bn  1   2   3   4   r   s
        0,      0,  1,      1,  0,  0,  0,  0,  0,  0,
        0,      0,  1,      1,  1,  0,  0,  0,  0,  0,
        0,      0,  1,      2,  0,  0,  0,  0,  0,  0,
        0,      0,  3,      2,  0,  0,  0,  0,  0,  0,
        0,      0,  4,      5,  0,  0,  0,  0,  0,  0,
    ]

    # expect basic request trees to hash as normally
    root_hash = (await contract.hash_request_tree_t(
        3, 5, *requestData()
    ).invoke()).result.root_hash

    assert root_hash == make_merkle_tree([
        chain_hash([0,      0,  0,      0,  0,  0,  0,  0,  0,  0]),
    
        chain_hash([0,      0,  1,      1,  0,  0,  0,  0,  0,  0]),
        chain_hash([0,      0,  1,      1,  1,  0,  0,  0,  0,  0]),
        chain_hash([0,      0,  1,      2,  0,  0,  0,  0,  0,  0]),
        chain_hash([0,      0,  3,      2,  0,  0,  0,  0,  0,  0]),
        chain_hash([0,      0,  4,      5,  0,  0,  0,  0,  0,  0]),

        chain_hash([m,      m,  m,      m,  m,  m,  m,  m,  m,  m]),
        chain_hash([m,      m,  m,      m,  m,  m,  m,  m,  m,  m]),
    ])

    # expect failure if meta is not 0, as 0 represents "store" and only stored messages should be found in the snapshot
    with pytest.raises(Exception) as e_info:
        d = requestData()
        d[0] = 1 # set meta to 1
        _ = (await contract.hash_request_tree_t(
            3, 5, *d,
        ).invoke())
    assert e_info.value.message.find("assert request.meta = 0 # 0 represents a store request") != -1

    # expect failure for out of order requests
    with pytest.raises(Exception) as e_info:
        _ = (await contract.hash_request_tree_t(
            3, 4, *requestData(),
        ).invoke())
    assert e_info.value.message.find("assert_nn_le(request.blockNumber, blockNumber)") != -1

    # expect failure for two totally identical messages being included
    with pytest.raises(Exception) as e_info:
        d = requestData()
        d[14] = 0 # make two adjacent requests equal, therefore not strictly ordered
        _ = (await contract.hash_request_tree_t(
            3, 5, *d,
        ).invoke())
    assert e_info.value.message.find("assert_nn_le(a.message4 + 1, b.message4)") != -1
    
    # expect failure when any message is stored after the specified block (i.e., ensure all messages are before a certain block)
    with pytest.raises(Exception) as e_info:
        d = requestData()
        d[0] = 1 # set meta to 1
        _ = (await contract.hash_request_tree_t(
            3, 5, *d,
        ).invoke())
    assert e_info.value.message.find("assert request.meta = 0 # 0 represents a store request") != -1

async def le_test_case(index, value, contract, errorMessage):
    d = [
        # meta  rql user    bn  1   2   3   4   r   s
        0,      0,  0,      0,  0,  0,  0,  0,  0,  0,
        0,      0,  0,      0,  0,  0,  0,  0,  0,  0,
    ]
    d[index] = value

    with pytest.raises(Exception) as e_info:
        await contract.request_le_t(*d).invoke()
    assert e_info.value.message.find(errorMessage) != -1

@pytest.mark.asyncio
async def test_request_le():
    starknet = await Starknet.empty()
    contract = await starknet.deploy(
        source=CONTRACT_FILE,
    )

    await contract.request_le_t(
        0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,1,0,0,
    ).invoke()

    await le_test_case(0, 0, contract, "assert_nn_le(a.message4 + 1, b.message4)")
    await le_test_case(1, 1, contract, "assert_nn_le(a.requestLinter, b.requestLinter)")
    await le_test_case(2, 1, contract, "assert_nn_le(a.user, b.user)")
    await le_test_case(3, 1, contract, "assert_nn_le(a.blockNumber, b.blockNumber)")
    await le_test_case(4, 1, contract, "assert_nn_le(a.message1, b.message1)")
    await le_test_case(5, 1, contract, "assert_nn_le(a.message2, b.message2)")
    await le_test_case(6, 1, contract, "assert_nn_le(a.message3, b.message3)")
    await le_test_case(7, 1, contract, "assert_nn_le(a.message4 + 1, b.message4)")

