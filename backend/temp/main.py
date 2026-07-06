import sys as _sys
_tokens = _sys.stdin.read().split()
_ti = [0]
def _next_tok():
    v = _tokens[_ti[0]]; _ti[0] += 1; return v

class Solution:
    def maxProfit(self, prices):
        min_price = float('inf')
        max_profit = 0

        for price in prices:
            min_price = min(min_price, price)
            max_profit = max(max_profit, price - min_price)

        return max_profit

_n0 = int(_next_tok())
param0 = [int(_next_tok()) for _ in range(_n0)]

result = maxProfit(param0)
print(result)
