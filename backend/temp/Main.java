import java.util.*;
import java.io.*;

public class Main {

  public int[] twoSum(int[] nums, int target) {
    int arr[] = new int[2];
    for (int i=0; i<nums.length; i++) {
        for (int j=i+1; j<nums.length; j++) {
            if (nums[i]+nums[j]==target) {
                arr[0] = i;
                arr[1] = j;
                return arr;
            }
        }
    }
    return arr;
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
    int param1 = Integer.parseInt(_tok[_ti++]);

    Main obj = new Main();
    int[] result = obj.twoSum(param0, param1);
    StringBuilder _out = new StringBuilder();
    for(int _i=0;_i<result.length;_i++){ if(_i>0) _out.append(' '); _out.append(result[_i]); }
    System.out.print(_out);
  }
}
