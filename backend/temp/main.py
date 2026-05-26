import sys
_lines = sys.stdin.read().replace('\r', '').split('\n')
_line_idx = 0
def _next_line():
    global _line_idx
    if _line_idx < len(_lines):
        line = _lines[_line_idx]
        _line_idx += 1
        return line
    return ""

def twoSum(nums: List[int], target: int) -> List[int]:
    # Write your code here
    pass


_n0 = int(_next_line())
_vl0 = _next_line()
param0 = list(map(int, _vl0.split())) if _vl0.strip() else []
param1 = int(_next_line())

result = twoSum(param0, param1)
print(" ".join(map(str, result)))
