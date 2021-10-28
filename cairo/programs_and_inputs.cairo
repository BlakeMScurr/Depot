from starkware.cairo.common.dict_access import DictAccess
from starkware.cairo.common.squash_dict import squash_dict
from starkware.cairo.common.alloc import alloc

struct KeyValue:
    member key : felt
    member value : felt
end

# Builds a DictAccess list for the computation of the cumulative
# sum for each key.
func build_dict(list : KeyValue*, size, dict : DictAccess*) -> (
        dict: DictAccess*):
    if size == 0:
        return (dict=dict)
    end

    %{
        # Populate ids.dict.prev_value using cumulative_sums and add list.value to cumulative_sums[list.key]...
        if cumulative_sums[list.key]:
            ids.dict.prev_value = 0
            cumulative_sums[list.key] = [0]
        else:
            ids.dict.prev_value = cumulative_sums[list.key]
            cumulative_sums[list.key].append(list.value + ids.dict.prev_value)
    %}
    # Copy list.key to dict.key...
    assert dict.key = list.key
    # Verify that dict.new_value = dict.prev_value + list.value...
    assert dict.new_value = dict.prev_value + list.value
    # Call recursively to build_dict()...
    return build_dict(list + KeyValue.SIZE, size - 1, dict + DictAccess.SIZE)
end

# Verifies that the initial values were 0, and writes the final
# values to result.
func verify_and_output_squashed_dict(
        squashed_dict : DictAccess*,
        squashed_dict_end : DictAccess*, result: KeyValue*, resultSize) -> (
        resultSize):
    tempvar diff = squashed_dict_end - squashed_dict
    if diff == 0:
        return (resultSize=resultSize)
    end

    # Verify prev_value is 0...
    assert squashed_dict.prev_value = 0
    # Copy key to result.key...
    assert result.key = squashed_dict.key
    # Copy new_value to result.value...
    assert result.value = squashed_dict.new_value
    # Call recursively to verify_and_output_squashed_dict...
    return verify_and_output_squashed_dict(
            squashed_dict + DictAccess.SIZE,
            squashed_dict_end,
            result + KeyValue.SIZE,
            resultSize + 1)
end

# Given a list of KeyValue, sums the values, grouped by key,
# and returns a list of pairs (key, sum_of_values).
func sum_by_key{range_check_ptr}(list : KeyValue*, size) -> (
        result: KeyValue*, result_size):
    %{
        # Initialize cumulative_sums with an empty dictionary.
        # This variable will be used by ``build_dict`` to hold
        # the current sum for each key.
        cumulative_sums = {}
    %}
    # Allocate memory for dict, squashed_dict and res...
    alloc_locals
    let (local dict : DictAccess*) = alloc()
    let (local squashed_dict : DictAccess*) = alloc()
    let (local res : KeyValue*) = alloc()

    let (dict_end) = build_dict(list, size, dict)
    let (squashed_dict_end) = squash_dict(dict, dict_end, squashed_dict)
    local range_check_ptr = range_check_ptr + 1
    let (resultSize) = verify_and_output_squashed_dict(squashed_dict, squashed_dict_end, res, 0)

    return (res, resultSize)
end