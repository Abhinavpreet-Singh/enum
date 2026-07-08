import sys as _sys
_tokens = _sys.stdin.read().split()
_ti = [0]
def _next_tok():
    v = _tokens[_ti[0]]; _ti[0] += 1; return v

def twoSum(nums: List[int], target: int) -> List[int]:
    # Write your code here
    pass


_n0 = int(_next_tok())
param0 = [int(_next_tok()) for _ in range(_n0)]
param1 = int(_next_tok())

result = twoSum(param0, param1)
print(" ".join(map(str, result)))
