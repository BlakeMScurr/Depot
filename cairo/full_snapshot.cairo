%builtins output pedersen range_check ecdsa

from starkware.cairo.common.math import assert_nn_le
from starkware.cairo.common.dict import dict_squash
from starkware.cairo.common.small_merkle_tree import (
    small_merkle_tree)

# This program takes a snapshot of a store, and proves that the store is a superset of a previous snapshot.
# It also proves that all messages in the snapshot are stored in order.

# Asserts that all the requests in the store are signed and ordered
# Messages are ordered by requestLinter, then user, blockNumber, messageLength, and finally lexicographically by message (where felts are interpretted as non negative integers)
func valid_order{range_check_ptr}(curr_request : Request*, n_requests : felt):
    # Check that all requests are signed
    # TODO ^

    if n_requests == 1:
        return ()
    end

    let next_request = curr_request + 1

    # Check that all requests are in order
    assert_nn_le(curr_request.requestLinter, next_request.requestLinter)
    if curr_request.requestLinter == next_request.requestLinter:
        assert_nn_le(curr_request.user, next_request.user)
        if curr_request.user == next_request.user:
            assert_nn_le(curr_request.blockNumber, next_request.blockNumber)
            if curr_request.blockNumber == next_request.blockNumber:
                assert_nn_le(curr_request.messageLength, next_request.messageLength)
                if curr_request.messageLength == next_request.messageLength:
                    # TODO: assert message is lexicographically less than next message
                end
            end
        end
    end

    return valid_order(curr_request + 1, n_requests-1)
end

# A signed request from a user to be stored in the silo.
struct Request:
    member meta : felt              # the meta of a stored message is always "store", i.e., 0 as a felt 
    member requestLinter : felt     # ethereum address of the contract that defines the format of the message (@guthl, can we store eth addresses as a felt? felt is only 2^252, whereas ethereum addresses are 32 bytes)
    member user : felt              # EOA ethereum address of the user who sent the message (@guthl eth address == felt?)
    member blockNumber : felt       # the ethereum block number at which the message was stored
    member messageLength : felt     # length of the message in terms of felts/uint256, limited from 0 to 1024 (rather arbitrarily)
    # member message : felt           # pointer to the first element of the message
    member messageSignature : felt  # signature of all the above fields
end

# Read requests from program input
func get_requests() -> (
        requests : Request**, n_requests : felt):
    alloc_locals
    local requests : Request**
    local n_requests : felt
    %{
        requests = [
            [
                request['meta'],
                request['requestLinter'],
                request['user'],
                request['blockNumber'],
                request['messageLength'],
                # request['message'], # TODO: initialise the values of the message and make this a pointer to the message - probably a simple matter of using gen_arg
                request['messageSignature']
            ]
            for request in program_input['requests']
        ]
        ids.requests = segments.gen_arg(requests)
        ids.n_requests = len(requests)
    %}
    return (
        requests=requests,
        n_requests=n_requests)
end