%builtins output

from starkware.cairo.common.alloc import alloc
from starkware.cairo.common.serialize import serialize_word

# Computes the product of the memory elements at even addresses:
#   arr + 0, arr + 1, ..., arr + (size - 1).
func array_sum(arr : felt*, size) -> (sum):
    if size == 0:
        return (sum=1)
    end
    if size == 1:
        return (sum=[arr])
    end

    # size is not zero.
    let (product_of_rest) = array_sum(arr=arr + 2, size=size - 2)
    return (sum=[arr] * product_of_rest)
end

func main{output_ptr : felt*}():
    const ARRAY_SIZE = 3

    # Allocate an array.
    let (ptr) = alloc()

    # Populate some values in the array.
    assert [ptr] = 9
    assert [ptr + 1] = 16
    assert [ptr + 2] = 25


    # Call array_sum to compute the sum of the elements.
    let (sum) = array_sum(arr=ptr, size=ARRAY_SIZE)

    # Write the sum to the program output.
    serialize_word(sum)

    return ()
end
