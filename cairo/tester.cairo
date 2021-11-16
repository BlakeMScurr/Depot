%lang starknet

from merkle_tree import merkle_layer, merkle_tree, hash_request, Request, hash_requests
from snapshot import hash_request_tree
from starkware.cairo.common.cairo_builtins import HashBuiltin
from starkware.cairo.common.alloc import alloc

# exposes the values of merkle layer
# TODO: return the whole lot, though (@guthl) apparently we can't return a felt*
@external
func val_in_next_layer{pedersen_ptr : HashBuiltin*}(elems_len: felt, elems: felt*, index: felt) -> (val):
    let (next_len) = merkle_layer(elems_len, elems, 0)
    return ([elems + elems_len + index + 1]) # +1 accounts for the memory cell after the array assigned to 0
end

# expose the internal merkle_tree function for testing
@external
func merkle_tree_t{pedersen_ptr : HashBuiltin*}(elems_len: felt, elems: felt*) -> (root_hash):
    let (res) = merkle_tree(elems_len, elems)
    return (res)
end

# expose the internal merkle_layer function for testing
@external
func merkle_layer_t{pedersen_ptr : HashBuiltin*}(elems_len: felt, elems: felt*, hash_index: felt) -> (next_len):
    let (res) = merkle_layer(elems_len, elems, hash_index)
    return (res)
end

# pass data for a request in for testing
@external
func hash_request_t{pedersen_ptr : HashBuiltin*}(meta, requestLinter, user, blockNumber, message1, message2, message3, message4, signature_r, signature_s) -> (hash):
    let (rq) = alloc()
    [rq] = meta
    [rq + 1] = requestLinter
    [rq + 2] = user
    [rq + 3] = blockNumber
    [rq + 4] = message1
    [rq + 5] = message2
    [rq + 6] = message3
    [rq + 7] = message4
    [rq + 8] = signature_r
    [rq + 9] = signature_s
    let (res) = hash_request(cast(rq, Request*))
    return (res)
end

# exposes the values of merkle layer
# TODO: return the whole lot, though (@guthl) apparently we can't return a felt*
@external
func val_of_hashed_requests{pedersen_ptr : HashBuiltin*}(
    meta_1, requestLinter_1, user_1, blockNumber_1, message1_1, message2_1, message3_1, message4_1, signature_r_1, signature_s_1,
    meta_2, requestLinter_2, user_2, blockNumber_2, message1_2, message2_2, message3_2, message4_2, signature_r_2, signature_s_2,
    index
) -> (hash):
    alloc_locals

    let (rq) = alloc()
    local res: felt*

    [rq] = meta_1
    [rq + 1] = requestLinter_1
    [rq + 2] = user_1
    [rq + 3] = blockNumber_1
    [rq + 4] = message1_1
    [rq + 5] = message2_1
    [rq + 6] = message3_1
    [rq + 7] = message4_1
    [rq + 8] = signature_r_1
    [rq + 9] = signature_s_1

    [rq + 10] = meta_2
    [rq + 11] = requestLinter_2
    [rq + 12] = user_2
    [rq + 13] = blockNumber_2
    [rq + 14] = message1_2
    [rq + 15] = message2_2
    [rq + 16] = message3_2
    [rq + 17] = message4_2
    [rq + 18] = signature_r_2
    [rq + 19] = signature_s_2

    let (res : felt*) = alloc()

    hash_requests(2, cast(rq, Request*), res)
    return ([res + index])
end

# pass in testing data
# TODO: more elegance pls
# TODO: arbitrary length so we can test other length trees (i.e., 0, 7, 8, etc, where the tree behaviour is slightly different)
# @guthl, any ideas on how to pass testing data in? I think unit testing basically requires %lang starknet, which means I can't use hints.
@external
func hash_request_tree_t{range_check_ptr, pedersen_ptr : HashBuiltin*}(
        blockNumber,
        meta_1, requestLinter_1, user_1, blockNumber_1, message1_1, message2_1, message3_1, message4_1, signature_r_1, signature_s_1,
        meta_2, requestLinter_2, user_2, blockNumber_2, message1_2, message2_2, message3_2, message4_2, signature_r_2, signature_s_2,
        meta_3, requestLinter_3, user_3, blockNumber_3, message1_3, message2_3, message3_3, message4_3, signature_r_3, signature_s_3,
        meta_4, requestLinter_4, user_4, blockNumber_4, message1_4, message2_4, message3_4, message4_4, signature_r_4, signature_s_4,
        meta_5, requestLinter_5, user_5, blockNumber_5, message1_5, message2_5, message3_5, message4_5, signature_r_5, signature_s_5,
    ) -> (root_hash):
    let (rq) = alloc()
    [rq] = meta_1
    [rq + 1] = requestLinter_1
    [rq + 2] = user_1
    [rq + 3] = blockNumber_1
    [rq + 4] = message1_1
    [rq + 5] = message2_1
    [rq + 6] = message3_1
    [rq + 7] = message4_1
    [rq + 8] = signature_r_1
    [rq + 9] = signature_s_1

    [rq + 10] = meta_2
    [rq + 11] = requestLinter_2
    [rq + 12] = user_2
    [rq + 13] = blockNumber_2
    [rq + 14] = message1_2
    [rq + 15] = message2_2
    [rq + 16] = message3_2
    [rq + 17] = message4_2
    [rq + 18] = signature_r_2
    [rq + 19] = signature_s_2

    [rq + 20] = meta_3
    [rq + 21] = requestLinter_3
    [rq + 22] = user_3
    [rq + 23] = blockNumber_3
    [rq + 24] = message1_3
    [rq + 25] = message2_3
    [rq + 26] = message3_3
    [rq + 27] = message4_3
    [rq + 28] = signature_r_3
    [rq + 29] = signature_s_3

    [rq + 30] = meta_4
    [rq + 31] = requestLinter_4
    [rq + 32] = user_4
    [rq + 33] = blockNumber_4
    [rq + 34] = message1_4
    [rq + 35] = message2_4
    [rq + 36] = message3_4
    [rq + 37] = message4_4
    [rq + 38] = signature_r_4
    [rq + 39] = signature_s_4

    [rq + 40] = meta_5
    [rq + 41] = requestLinter_5
    [rq + 42] = user_5
    [rq + 43] = blockNumber_5
    [rq + 44] = message1_5
    [rq + 45] = message2_5
    [rq + 46] = message3_5
    [rq + 47] = message4_5
    [rq + 48] = signature_r_5
    [rq + 49] = signature_s_5

    let (res) = hash_request_tree(blockNumber, 5, cast(rq, Request*))
    return (res)
end