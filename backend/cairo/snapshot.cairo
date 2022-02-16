from starkware.cairo.common.cairo_builtins import (HashBuiltin, SignatureBuiltin)
from starkware.cairo.common.math import assert_nn_le
from starkware.cairo.common.math_cmp import is_le
from merkle_tree import hash_requests, merkle_tree
from request import Request, zero_request, max_request, hash_request, request_equal
from starkware.cairo.common.alloc import alloc

# This program takes a snapshot of a store, and proves that the store is a superset of a previous snapshot.
# It also proves that all messages in the snapshot are stored in order.

func snapshot_transition{range_check_ptr, pedersen_ptr : HashBuiltin*}(earlierBlock: felt, laterBlock: felt, request_len: felt, request: Request*):
end

# Take all requests before or at a certain block number and place them at the young_requests pointer
func collect_requests{range_check_ptr}(block: felt, all_requests_len: felt, all_requests: Request*, young_requests: Request*) -> (young_requests_len: felt) :
    if all_requests_len == 0:
        return (0)
    end

    if is_le(all_requests.block_number, block) == 1:
        young_requests = all_requests[0]
        let (res) = collect_requests(block, all_requests_len - 1, all_requests + Request.SIZE, young_requests + Request.SIZE)
        return (res + 1)
    else:
        let (res) = collect_requests(block, all_requests_len - 1, all_requests + Request.SIZE, young_requests)
        return (res)
    end
end

func hash_request_tree{range_check_ptr, pedersen_ptr : HashBuiltin*}(depth: felt, blockNumber: felt, request_len: felt, request: Request*) -> (root_hash: felt):
    alloc_locals
    
    # assert that all requests are in order
    all_valid(request_len, request)
    local range_check_ptr = range_check_ptr # Store range_check_ptr in a local variable to make it accessible after the call to all_valid()
    before_block(blockNumber, request_len, request)
    
    # hash requests into a merkle tree
    let (hashes : felt*) = alloc()
    hash_requests(request_len, request, hashes)

    let (mr) = max_request()
    let (mrh) = hash_request{pedersen_ptr=pedersen_ptr}(mr)
    let (res) = merkle_tree(depth, mrh, request_len, hashes)
    return (res)
end

func before_block{range_check_ptr}(blockNumber: felt, request_len: felt, request: Request*):
    alloc_locals
    if request_len == 0:
        return ()
    end

    assert_nn_le(request.blockNumber, blockNumber)
    local range_check_ptr = range_check_ptr
    before_block(blockNumber, request_len - 1, request + Request.SIZE)
    return ()
end

# Asserts that all the requests in the store are ordered and that they're store requests
func all_valid{range_check_ptr}(request_len : felt, request : Request*):
    alloc_locals
    assert request.meta = 0 # 0 represents a store request
    local range_check_ptr = range_check_ptr
    if request_len == 1:
        return ()
    end

    let next_request = request + Request.SIZE
    request_le(request, next_request) 
    local range_check_ptr = range_check_ptr # Store range_check_ptr in a local variable to make it accessible after the call to request_le()
    return all_valid(request_len-1, next_request)
end

# Checks a is less than or equal to b. Ordered by requestLinter, then user, then blockNumber, and finally numerically by message (where felts are interpretted as non negative integers)
# Solves revoked reference as per https://cairo-lang.org/docs/how_cairo_works/builtins.html#revoked-implicit-arguments @guthl I have no idea how revoked references work or why lol
func request_le{range_check_ptr}(a: Request*, b: Request*):
    assert_nn_le(a.requestLinter, b.requestLinter)
    if a.requestLinter == b.requestLinter:
        assert_nn_le(a.user, b.user)
        tempvar range_check_ptr = range_check_ptr
        if a.user == b.user:
            assert_nn_le(a.blockNumber, b.blockNumber)
            if a.blockNumber == b.blockNumber:
                assert_nn_le(a.message1, b.message1)
                if a.message1 == b.message1:
                    assert_nn_le(a.message2, b.message2)
                    if a.message2 == b.message2:
                        assert_nn_le(a.message3, b.message3)
                        if a.message3 == b.message3:
                            assert_nn_le(a.message4 + 1, b.message4)
                        else:
                            tempvar range_check_ptr = range_check_ptr
                        end
                    else:
                        tempvar range_check_ptr = range_check_ptr
                    end
                else:
                    tempvar range_check_ptr = range_check_ptr
                end
            else:
                tempvar range_check_ptr = range_check_ptr
            end
        else:
            tempvar range_check_ptr = range_check_ptr
        end
    else:
        tempvar range_check_ptr = range_check_ptr
    end

    return ()
end
