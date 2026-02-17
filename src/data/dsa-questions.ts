import { proxy } from "@/app/proxy";
import axios from "axios";

export interface Question {
  id: string;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  category: string;
  description: string;
  examples: {
    input: string;
    output: string;
    explanation: string;
  }[];
  constraints: string[];
  initialCode: string;
}

// Backend question interface
interface BackendQuestion {
  _id: string;
  title: string;
  desc: string;
  level: "Easy" | "Medium" | "Hard";
  testcases: Array<{ input: string; output: string }>;
  constraints: string;
  topic: string;
}

let questions: Question[] = [];

export const fetchQuestions = async (): Promise<Question[]> => {
  try {
    const response = await axios.post(`${proxy}/api/v1/admin/getDSAQuestions`);
    console.log("Questions fetched:", response.data);

    // Map backend data to frontend Question interface
    if (response.data && response.data.data) {
      questions = response.data.data.map((q: BackendQuestion) => {
        // Ensure constraints is an array of strings
        let constraintsArray: string[] = [];
        if (typeof q.constraints === 'string' && q.constraints.trim()) {
          constraintsArray = q.constraints.split('\n').filter(c => c.trim());
        } else if (Array.isArray(q.constraints)) {
          constraintsArray = q.constraints.map(c => String(c));
        }

        return {
          id: q._id,
          title: q.title || "Untitled",
          difficulty: q.level || "Easy",
          category: q.topic || "General",
          description: q.desc || "",
          examples: Array.isArray(q.testcases) ? q.testcases.map((tc, index) => ({
            input: String(tc.input || ""),
            output: String(tc.output || ""),
            explanation: index === 0 ? "Example test case" : `Test case ${index + 1}`
          })) : [],
          constraints: constraintsArray,
          initialCode: `function solution() {\n  // Your code here\n  \n}`
        };
      });
    }

    return questions;
  } catch (error) {
    console.error("Error fetching questions:", error);
    return [];
  }
};

export const getQuestions = (): Question[] => {
  return questions;
};

export { questions };

// export const questions: Question[] = [
//   {
//     id: "print-hello",
//     title: "Print 'I love ENUM'",
//     difficulty: "Easy",
//     category: "Basics",
//     description:
//       "Write a function that returns the string 'I love ENUM'. This is a basic warm-up problem to get familiar with the workspace.",
//     examples: [
//       {
//         input: "No input",
//         output: "'I love ENUM'",
//         explanation: "Simply return the string.",
//       },
//     ],
//     constraints: ["Return type should be a string"],
//     initialCode: `function printLoveEnum() {
//   // Your code here
  
// }`,
//   },
//   {
//     id: "add-two-numbers",
//     title: "Add Two Numbers",
//     difficulty: "Easy",
//     category: "Basics",
//     description:
//       "Write a function that takes two numbers and returns their sum.",
//     examples: [
//       {
//         input: "a = 5, b = 3",
//         output: "8",
//         explanation: "5 + 3 = 8",
//       },
//     ],
//     constraints: ["-1000 <= a, b <= 1000"],
//     initialCode: `function addTwoNumbers(a, b) {
//   // Your code here
  
// }`,
//   },
//   {
//     id: "is-even",
//     title: "Check if Even",
//     difficulty: "Easy",
//     category: "Basics",
//     description:
//       "Write a function that takes a number and returns true if it's even, false if it's odd.",
//     examples: [
//       {
//         input: "num = 4",
//         output: "true",
//         explanation: "4 is divisible by 2",
//       },
//       {
//         input: "num = 7",
//         output: "false",
//         explanation: "7 is not divisible by 2",
//       },
//     ],
//     constraints: ["Integer input only"],
//     initialCode: `function isEven(num) {
//   // Your code here
  
// }`,
//   },
//   {
//     id: "two-sum",
//     title: "Two Sum",
//     difficulty: "Easy",
//     category: "Array",
//     description:
//       "Given an array of integers nums and an integer target, return the indices of the two numbers that add up to target. You may assume that each input has exactly one solution, and you may not use the same element twice.",
//     examples: [
//       {
//         input: "nums = [2,7,11,15], target = 9",
//         output: "[0,1]",
//         explanation: "Because nums[0] + nums[1] == 9, we return [0, 1].",
//       },
//       {
//         input: "nums = [3,2,4], target = 6",
//         output: "[1,2]",
//         explanation: "Because nums[1] + nums[2] == 6, we return [1, 2].",
//       },
//     ],
//     constraints: [
//       "2 <= nums.length <= 10^4",
//       "-10^9 <= nums[i] <= 10^9",
//       "-10^9 <= target <= 10^9",
//       "Only one valid answer exists.",
//     ],
//     initialCode: `function twoSum(nums, target) {
//   // Your code here
  
// }`,
//   },
//   {
//     id: "reverse-string",
//     title: "Reverse String",
//     difficulty: "Easy",
//     category: "String",
//     description:
//       "Write a function that reverses a string. The input string is given as an array of characters s.",
//     examples: [
//       {
//         input: 's = ["h","e","l","l","o"]',
//         output: '["o","l","l","e","h"]',
//         explanation: "Reverse the array in-place.",
//       },
//     ],
//     constraints: [
//       "1 <= s.length <= 10^5",
//       "s[i] is a printable ascii character.",
//     ],
//     initialCode: `function reverseString(s) {
//   // Your code here
  
// }`,
//   },
//   {
//     id: "binary-search",
//     title: "Binary Search",
//     difficulty: "Easy",
//     category: "Binary Search",
//     description:
//       "Given an array of integers nums which is sorted in ascending order, and an integer target, write a function to search target in nums. If target exists, then return its index. Otherwise, return -1.",
//     examples: [
//       {
//         input: "nums = [-1,0,3,5,9,12], target = 9",
//         output: "4",
//         explanation: "9 exists in nums and its index is 4",
//       },
//       {
//         input: "nums = [-1,0,3,5,9,12], target = 13",
//         output: "-1",
//         explanation: "13 does not exist in nums so return -1",
//       },
//     ],
//     constraints: [
//       "1 <= nums.length <= 10^4",
//       "-10^4 < nums[i], target < 10^4",
//       "All the integers in nums are unique.",
//       "nums is sorted in ascending order.",
//     ],
//     initialCode: `function search(nums, target) {
//   // Your code here
  
// }`,
//   },
//   {
//     id: "valid-palindrome",
//     title: "Valid Palindrome",
//     difficulty: "Easy",
//     category: "String",
//     description:
//       "A phrase is a palindrome if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward.",
//     examples: [
//       {
//         input: 's = "A man, a plan, a canal: Panama"',
//         output: "true",
//         explanation:
//           "After removing non-alphanumeric characters and converting to lowercase.",
//       },
//     ],
//     constraints: [
//       "1 <= s.length <= 2 * 10^5",
//       "s consists of printable ASCII characters.",
//     ],
//     initialCode: `function isPalindrome(s) {
//   // Your code here
  
// }`,
//   },
//   {
//     id: "merge-sorted-array",
//     title: "Merge Sorted Array",
//     difficulty: "Easy",
//     category: "Array",
//     description:
//       "You are given two integer arrays nums1 and nums2, sorted in non-decreasing order, and two integers m and n, representing the number of valid elements in nums1 and nums2 respectively. Merge nums2 into nums1 as one sorted array.",
//     examples: [
//       {
//         input: "nums1 = [1,2,3,0,0,0], m = 3, nums2 = [2,5,6], n = 3",
//         output: "[1,2,2,3,5,6]",
//         explanation: "Merge the two arrays.",
//       },
//     ],
//     constraints: [
//       "nums1.length == m + n",
//       "nums2.length == n",
//       "0 <= m, n <= 200",
//       "1 <= m + n <= 200",
//     ],
//     initialCode: `function merge(nums1, m, nums2, n) {
//   // Your code here
  
// }`,
//   },
// ];
