import java.util.*;
import java.io.*;
import java.util.HashMap;

public class Main {

  
public int[] twoSum(int[] nums, int target) {
    HashMap<Integer, Integer> map = new HashMap<>();

    for (int i = 0; i < nums.length; i++) {
        int complement = target - nums[i];

        if (map.containsKey(complement)) {
            return new int[]{map.get(complement), i};
        }

        map.put(nums[i], i);
    }

    return new int[]{}; // if no solution found
}

  public static void main(String[] args) throws Exception {
    BufferedReader _br = new BufferedReader(new InputStreamReader(System.in));
    List<String> _lines = new ArrayList<>();
    String _line;
    while((_line = _br.readLine()) != null) _lines.add(_line);
    int _li = 0;

    int _n0 = Integer.parseInt(_lines.get(_li++).trim());
    String _vl0 = _li < _lines.size() ? _lines.get(_li++) : "";
    int[] param0 = new int[_n0];
    if(_n0 > 0 && !_vl0.trim().isEmpty()){ String[] _p = _vl0.trim().split("\\s+"); for(int i=0;i<_n0;i++) param0[i] = Integer.parseInt(_p[i]); }
    int param1 = Integer.parseInt(_lines.get(_li++).trim());


    Main obj = new Main();
    int[] result = obj.twoSum(param0, param1);
    StringBuilder sb = new StringBuilder();
    for(int i=0;i<result.length;i++){ if(i>0) sb.append(" "); sb.append(result[i]); }
    System.out.print(sb.toString());
  }
}
