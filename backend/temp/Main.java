import java.util.*;
import java.io.*;

public class Main {

  public int maxProfit(int[] prices) {
  int minPrice = Integer.MAX_VALUE;
  int maxProfit = 0;
  for (int price : prices) {
    minPrice = Math.min(minPrice, price);
    maxProfit = Math.max(maxProfit, price - minPrice);
  }
  return maxProfit;
}

  public static void main(String[] args) throws Exception {
    
    String[] _tok;
    {
      StringBuilder _sb = new StringBuilder();
      java.io.BufferedReader _br2 = new java.io.BufferedReader(new java.io.InputStreamReader(System.in));
      String _l2;
      while((_l2 = _br2.readLine()) != null){ _sb.append(_l2).append(' '); }
      String _raw = _sb.toString().trim();
      _tok = _raw.isEmpty() ? new String[0] : _raw.split("\\s+");
    }
    int _ti = 0;

    int _n0 = Integer.parseInt(_tok[_ti++]);
    int[] param0 = new int[_n0];
    for(int _i=0;_i<_n0;_i++) param0[_i] = Integer.parseInt(_tok[_ti++]);

    Main obj = new Main();
    int result = obj.maxProfit(param0);
    System.out.print(result);
  }
}
