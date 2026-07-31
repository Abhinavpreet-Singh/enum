/**
 * Seed script: populates the database with LeetCode-style DSA questions.
 * Also backfills test cases for existing questions that were seeded without them.
 *
 * Usage:
 *   node scripts/seed-questions.js
 *
 * Environment variables (from .env):
 *   DATABASE_URL
 */

import "dotenv/config";
import prisma from "../src/db/index.js";
import { buildQuestionNestedCreate } from "../src/utils/prismaNormalizers.js";

const seedQuestions = [
  {
    title: "Two Sum",
    desc: "Given an array of integers nums and an integer target, return the indices of the two numbers such that they add up to target.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\n\nReturn the answer as an array of two indices.",
    level: "Easy",
    topic: "Arrays",
    constraints: "2 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9\n-10^9 <= target <= 10^9\nOnly one valid answer exists.",
    functionName: "twoSum",
    parameterNames: ["nums", "target"],
    parameterTypes: ["int[]", "int"],
    returnType: "int[]",
    testcases: [
      { input: ["4\n2 7 11 15", "9"], expectedOutput: "0 1" },
      { input: ["3\n3 2 4", "6"], expectedOutput: "1 2" },
      { input: ["2\n3 3", "6"], expectedOutput: "0 1" },
      { input: ["5\n1 5 3 9 2", "8"], expectedOutput: "1 2" },
      { input: ["4\n-1 -2 -3 -4", "-7"], expectedOutput: "2 3" },
    ],
  },
  {
    title: "Reverse Integer",
    desc: "Given a signed 32-bit integer x, return x with its digits reversed.\n\nIf reversing x causes the value to go outside the signed 32-bit integer range [-2^31, 2^31 - 1], then return 0.",
    level: "Easy",
    topic: "Math",
    constraints: "-2^31 <= x <= 2^31 - 1",
    functionName: "reverseInteger",
    parameterNames: ["x"],
    parameterTypes: ["int"],
    returnType: "int",
    testcases: [
      { input: ["123"], expectedOutput: "321" },
      { input: ["-123"], expectedOutput: "-321" },
      { input: ["120"], expectedOutput: "21" },
      { input: ["0"], expectedOutput: "0" },
      { input: ["1534236469"], expectedOutput: "0" },
    ],
  },
  {
    title: "Palindrome Number",
    desc: "Given an integer x, return true if x is a palindrome, and false otherwise.\n\nAn integer is a palindrome when it reads the same backward as forward.",
    level: "Easy",
    topic: "Math",
    constraints: "-2^31 <= x <= 2^31 - 1",
    functionName: "isPalindrome",
    parameterNames: ["x"],
    parameterTypes: ["int"],
    returnType: "bool",
    testcases: [
      { input: ["121"], expectedOutput: "true" },
      { input: ["-121"], expectedOutput: "false" },
      { input: ["10"], expectedOutput: "false" },
      { input: ["0"], expectedOutput: "true" },
      { input: ["12321"], expectedOutput: "true" },
    ],
  },
  {
    title: "Valid Parentheses",
    desc: "Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.\n\nAn input string is valid if:\n1. Open brackets must be closed by the same type of brackets.\n2. Open brackets must be closed in the correct order.\n3. Every close bracket has a corresponding open bracket of the same type.",
    level: "Easy",
    topic: "Stack",
    constraints: "1 <= s.length <= 10^4\ns consists of parentheses only '()[]{}'",
    functionName: "isValid",
    parameterNames: ["s"],
    parameterTypes: ["string"],
    returnType: "bool",
    testcases: [
      { input: ["()"], expectedOutput: "true" },
      { input: ["()[]{}"], expectedOutput: "true" },
      { input: ["(]"], expectedOutput: "false" },
      { input: ["([)]"], expectedOutput: "false" },
      { input: ["{[]}"], expectedOutput: "true" },
    ],
  },
  {
    title: "Maximum Subarray",
    desc: "Given an integer array nums, find the subarray with the largest sum, and return its sum.\n\nA subarray is a contiguous non-empty sequence of elements within an array.",
    level: "Medium",
    topic: "Dynamic Programming",
    constraints: "1 <= nums.length <= 10^5\n-10^4 <= nums[i] <= 10^4",
    functionName: "maxSubArray",
    parameterNames: ["nums"],
    parameterTypes: ["int[]"],
    returnType: "int",
    testcases: [
      { input: ["9\n-2 1 -3 4 -1 2 1 -5 4"], expectedOutput: "6" },
      { input: ["1\n1"], expectedOutput: "1" },
      { input: ["5\n5 4 -1 7 8"], expectedOutput: "23" },
      { input: ["3\n-1 -2 -3"], expectedOutput: "-1" },
      { input: ["6\n-2 -1 -3 -4 -1 -2"], expectedOutput: "-1" },
    ],
  },
  {
    title: "Climbing Stairs",
    desc: "You are climbing a staircase. It takes n steps to reach the top.\n\nEach time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?",
    level: "Easy",
    topic: "Dynamic Programming",
    constraints: "1 <= n <= 45",
    functionName: "climbStairs",
    parameterNames: ["n"],
    parameterTypes: ["int"],
    returnType: "int",
    testcases: [
      { input: ["2"], expectedOutput: "2" },
      { input: ["3"], expectedOutput: "3" },
      { input: ["4"], expectedOutput: "5" },
      { input: ["5"], expectedOutput: "8" },
      { input: ["10"], expectedOutput: "89" },
    ],
  },
  {
    title: "Best Time to Buy and Sell Stock",
    desc: "You are given an array prices where prices[i] is the price of a given stock on the ith day.\n\nYou want to maximize your profit by choosing a single day to buy one stock and choosing a different day in the future to sell that stock.\n\nReturn the maximum profit you can achieve from this transaction. If you cannot achieve any profit, return 0.",
    level: "Easy",
    topic: "Arrays",
    constraints: "1 <= prices.length <= 10^5\n0 <= prices[i] <= 10^4",
    functionName: "maxProfit",
    parameterNames: ["prices"],
    parameterTypes: ["int[]"],
    returnType: "int",
    testcases: [
      { input: ["6\n7 1 5 3 6 4"], expectedOutput: "5" },
      { input: ["5\n7 6 4 3 1"], expectedOutput: "0" },
      { input: ["4\n2 4 1 7"], expectedOutput: "6" },
      { input: ["3\n1 2 3"], expectedOutput: "2" },
      { input: ["6\n3 3 5 0 0 3"], expectedOutput: "3" },
    ],
  },
  {
    title: "Container With Most Water",
    desc: "You are given an integer array height of length n. There are n vertical lines drawn such that the two endpoints of the ith line are (i, 0) and (i, height[i]).\n\nFind two lines that together with the x-axis form a container, such that the container contains the most water.\n\nReturn the maximum amount of water a container can store.",
    level: "Medium",
    topic: "Two Pointers",
    constraints: "n == height.length\n2 <= n <= 10^5\n0 <= height[i] <= 10^4",
    functionName: "maxArea",
    parameterNames: ["height"],
    parameterTypes: ["int[]"],
    returnType: "int",
    testcases: [
      { input: ["9\n1 8 6 2 5 4 8 3 7"], expectedOutput: "49" },
      { input: ["2\n1 1"], expectedOutput: "1" },
      { input: ["5\n4 3 2 1 4"], expectedOutput: "16" },
      { input: ["3\n1 2 1"], expectedOutput: "2" },
      { input: ["6\n1 8 6 2 5 4"], expectedOutput: "16" },
    ],
  },
  {
    title: "Longest Substring Without Repeating Characters",
    desc: "Given a string s, find the length of the longest substring without repeating characters.\n\nA substring is a contiguous non-empty sequence of characters within a string.",
    level: "Medium",
    topic: "Sliding Window",
    constraints: "0 <= s.length <= 5 * 10^4\ns consists of English letters, digits, symbols and spaces.",
    functionName: "lengthOfLongestSubstring",
    parameterNames: ["s"],
    parameterTypes: ["string"],
    returnType: "int",
    testcases: [
      { input: ["abcabcbb"], expectedOutput: "3" },
      { input: ["bbbbb"], expectedOutput: "1" },
      { input: ["pwwkew"], expectedOutput: "3" },
      { input: [""], expectedOutput: "0" },
      { input: ["dvdf"], expectedOutput: "3" },
    ],
  },
  {
    title: "Merge Sorted Array",
    desc: "You are given two integer arrays nums1 and nums2, sorted in non-decreasing order, and two integers m and n, representing the number of elements in nums1 and nums2 respectively.\n\nMerge nums2 into nums1 as one sorted array and return nums1.\n\nNote: nums1 has a length of m + n, where the last n elements are set to 0 and should be ignored.",
    level: "Easy",
    topic: "Arrays",
    constraints: "nums1.length == m + n\nnums2.length == n\n0 <= m, n <= 200\n-10^9 <= nums1[i], nums2[j] <= 10^9",
    functionName: "merge",
    parameterNames: ["nums1", "m", "nums2", "n"],
    parameterTypes: ["int[]", "int", "int[]", "int"],
    returnType: "int[]",
    testcases: [
      { input: ["6\n1 2 3 0 0 0", "3", "3\n2 5 6", "3"], expectedOutput: "1 2 2 3 5 6" },
      { input: ["1\n1", "1", "0\n", "0"], expectedOutput: "1" },
      { input: ["1\n0", "0", "1\n1", "1"], expectedOutput: "1" },
      { input: ["4\n1 3 0 0", "2", "2\n2 4", "2"], expectedOutput: "1 2 3 4" },
      { input: ["6\n-1 0 3 0 0 0", "3", "3\n-2 2 5", "3"], expectedOutput: "-2 -1 0 2 3 5" },
    ],
  },
  {
    title: "Fizz Buzz",
    desc: "Given an integer n, return a string array answer (1-indexed) where:\n- answer[i] == \"FizzBuzz\" if i is divisible by 3 and 5.\n- answer[i] == \"Fizz\" if i is divisible by 3.\n- answer[i] == \"Buzz\" if i is divisible by 5.\n- answer[i] == i (as a string) if none of the above conditions are true.",
    level: "Easy",
    topic: "Math",
    constraints: "1 <= n <= 10^4",
    functionName: "fizzBuzz",
    parameterNames: ["n"],
    parameterTypes: ["int"],
    returnType: "string[]",
    testcases: [
      { input: ["3"], expectedOutput: "1 2 Fizz" },
      { input: ["5"], expectedOutput: "1 2 Fizz 4 Buzz" },
      { input: ["15"], expectedOutput: "1 2 Fizz 4 Buzz Fizz 7 8 Fizz Buzz 11 Fizz 13 14 FizzBuzz" },
    ],
  },
  {
    title: "Single Number",
    desc: "Given a non-empty array of integers nums, every element appears twice except for one. Find that single one.\n\nYou must implement a solution with a linear runtime complexity and use only constant extra space.",
    level: "Easy",
    topic: "Arrays",
    constraints: "1 <= nums.length <= 3 * 10^4\n-3 * 10^4 <= nums[i] <= 3 * 10^4\nEach element in the array appears twice except for one element which appears only once.",
    functionName: "singleNumber",
    parameterNames: ["nums"],
    parameterTypes: ["int[]"],
    returnType: "int",
    testcases: [
      { input: ["3\n2 2 1"], expectedOutput: "1" },
      { input: ["5\n4 1 2 1 2"], expectedOutput: "4" },
      { input: ["1\n1"], expectedOutput: "1" },
      { input: ["7\n-1 -1 -2 -2 3 -4 -4"], expectedOutput: "3" },
    ],
  },
  {
    title: "Contains Duplicate",
    desc: "Given an integer array nums, return true if any value appears at least twice in the array, and return false if every element is distinct.",
    level: "Easy",
    topic: "Arrays",
    constraints: "1 <= nums.length <= 10^5\n-10^9 <= nums[i] <= 10^9",
    functionName: "containsDuplicate",
    parameterNames: ["nums"],
    parameterTypes: ["int[]"],
    returnType: "bool",
    testcases: [
      { input: ["4\n1 2 3 1"], expectedOutput: "true" },
      { input: ["4\n1 2 3 4"], expectedOutput: "false" },
      { input: ["10\n1 1 1 3 3 4 3 2 4 2"], expectedOutput: "true" },
      { input: ["1\n9"], expectedOutput: "false" },
    ],
  },
  {
    title: "Valid Anagram",
    desc: "Given two strings s and t, return true if t is an anagram of s, and false otherwise.\n\nAn Anagram is a word or phrase formed by rearranging the letters of a different word or phrase, typically using all the original letters exactly once.",
    level: "Easy",
    topic: "String",
    constraints: "1 <= s.length, t.length <= 5 * 10^4\ns and t consist of lowercase English letters.",
    functionName: "isAnagram",
    parameterNames: ["s", "t"],
    parameterTypes: ["string", "string"],
    returnType: "bool",
    testcases: [
      { input: ["anagram", "nagaram"], expectedOutput: "true" },
      { input: ["rat", "car"], expectedOutput: "false" },
      { input: ["a", "a"], expectedOutput: "true" },
      { input: ["ab", "a"], expectedOutput: "false" },
    ],
  },
  {
    title: "Binary Search",
    desc: "Given an array of integers nums which is sorted in ascending order, and an integer target, write a function to search target in nums. If target exists, then return its index. Otherwise, return -1.\n\nYou must write an algorithm with O(log n) runtime complexity.",
    level: "Easy",
    topic: "Binary Search",
    constraints: "1 <= nums.length <= 10^4\n-10^4 < nums[i], target < 10^4\nAll the integers in nums are unique.\nnums is sorted in ascending order.",
    functionName: "search",
    parameterNames: ["nums", "target"],
    parameterTypes: ["int[]", "int"],
    returnType: "int",
    testcases: [
      { input: ["6\n-1 0 3 5 9 12", "9"], expectedOutput: "4" },
      { input: ["6\n-1 0 3 5 9 12", "2"], expectedOutput: "-1" },
      { input: ["1\n5", "5"], expectedOutput: "0" },
      { input: ["1\n5", "2"], expectedOutput: "-1" },
    ],
  },
  {
    title: "Fibonacci Number",
    desc: "The Fibonacci numbers, commonly denoted F(n) form a sequence, called the Fibonacci sequence, such that each number is the sum of the two preceding ones, starting from 0 and 1. That is:\nF(0) = 0, F(1) = 1\nF(n) = F(n - 1) + F(n - 2), for n > 1.\n\nGiven n, calculate F(n).",
    level: "Easy",
    topic: "Math",
    constraints: "0 <= n <= 30",
    functionName: "fib",
    parameterNames: ["n"],
    parameterTypes: ["int"],
    returnType: "int",
    testcases: [
      { input: ["2"], expectedOutput: "1" },
      { input: ["3"], expectedOutput: "2" },
      { input: ["4"], expectedOutput: "3" },
      { input: ["9"], expectedOutput: "34" },
    ],
  },

  // ─── Hard ─────────────────────────────────────────────────────────────────
  {
    title: "Trapping Rain Water",
    desc: "Given n non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.\n\nWater can only be trapped between bars. The amount of water at index i is min(maxLeft, maxRight) - height[i], where maxLeft and maxRight are the tallest bars to the left and right of i (inclusive of boundaries that form a container).",
    level: "Hard",
    topic: "Two Pointers",
    constraints: "n == height.length\n1 <= n <= 2 * 10^4\n0 <= height[i] <= 10^5",
    functionName: "trap",
    parameterNames: ["height"],
    parameterTypes: ["int[]"],
    returnType: "int",
    testcases: [
      { input: ["12\n0 1 0 2 1 0 1 3 2 1 2 1"], expectedOutput: "6" },
      { input: ["6\n4 2 0 3 2 5"], expectedOutput: "9" },
      { input: ["3\n2 0 2"], expectedOutput: "2" },
      { input: ["1\n5"], expectedOutput: "0" },
      { input: ["5\n5 4 3 2 1"], expectedOutput: "0" },
      { input: ["8\n0 2 0 3 0 1 0 4"], expectedOutput: "10" },
    ],
  },
  {
    title: "First Missing Positive",
    desc: "Given an unsorted integer array nums, return the smallest missing positive integer.\n\nYou must write an algorithm that runs in O(n) time and uses O(1) auxiliary space.",
    level: "Hard",
    topic: "Arrays",
    constraints: "1 <= nums.length <= 10^5\n-2^31 <= nums[i] <= 2^31 - 1",
    functionName: "firstMissingPositive",
    parameterNames: ["nums"],
    parameterTypes: ["int[]"],
    returnType: "int",
    testcases: [
      { input: ["3\n1 2 0"], expectedOutput: "3" },
      { input: ["4\n3 4 -1 1"], expectedOutput: "2" },
      { input: ["5\n7 8 9 11 12"], expectedOutput: "1" },
      { input: ["1\n1"], expectedOutput: "2" },
      { input: ["4\n1 2 3 4"], expectedOutput: "5" },
      { input: ["6\n-1 -2 -3 0 1 2"], expectedOutput: "3" },
    ],
  },
  {
    title: "Longest Valid Parentheses",
    desc: "Given a string containing just the characters '(' and ')', return the length of the longest valid (well-formed) parentheses substring.\n\nA valid parentheses string is one that can be empty, or written as (A) or AB where A and B are valid parentheses strings.",
    level: "Hard",
    topic: "Stack",
    constraints: "0 <= s.length <= 3 * 10^4\ns consists of '(' and ')' only.",
    functionName: "longestValidParentheses",
    parameterNames: ["s"],
    parameterTypes: ["string"],
    returnType: "int",
    testcases: [
      { input: ["(()"], expectedOutput: "2" },
      { input: [")()())"], expectedOutput: "4" },
      { input: [""], expectedOutput: "0" },
      { input: ["()(()"], expectedOutput: "2" },
      { input: ["(())"], expectedOutput: "4" },
      { input: ["()(())"], expectedOutput: "6" },
      { input: ["))((("], expectedOutput: "0" },
    ],
  },
  {
    title: "Edit Distance",
    desc: "Given two strings word1 and word2, return the minimum number of operations required to convert word1 to word2.\n\nYou can perform the following operations on a word:\n1. Insert a character\n2. Delete a character\n3. Replace a character",
    level: "Hard",
    topic: "Dynamic Programming",
    constraints: "0 <= word1.length, word2.length <= 500\nword1 and word2 consist of lowercase English letters.",
    functionName: "minDistance",
    parameterNames: ["word1", "word2"],
    parameterTypes: ["string", "string"],
    returnType: "int",
    testcases: [
      { input: ["horse", "ros"], expectedOutput: "3" },
      { input: ["intention", "execution"], expectedOutput: "5" },
      { input: ["", "a"], expectedOutput: "1" },
      { input: ["a", ""], expectedOutput: "1" },
      { input: ["", ""], expectedOutput: "0" },
      { input: ["abc", "abc"], expectedOutput: "0" },
      { input: ["kitten", "sitting"], expectedOutput: "3" },
    ],
  },
  {
    title: "Largest Rectangle in Histogram",
    desc: "Given an array of integers heights representing the histogram's bar height where the width of each bar is 1, return the area of the largest rectangle in the histogram.\n\nThe rectangle must be formed by contiguous bars, and its height is limited by the shortest bar in that range.",
    level: "Hard",
    topic: "Stack",
    constraints: "1 <= heights.length <= 10^5\n0 <= heights[i] <= 10^4",
    functionName: "largestRectangleArea",
    parameterNames: ["heights"],
    parameterTypes: ["int[]"],
    returnType: "int",
    testcases: [
      { input: ["6\n2 1 5 6 2 3"], expectedOutput: "10" },
      { input: ["2\n2 4"], expectedOutput: "4" },
      { input: ["1\n1"], expectedOutput: "1" },
      { input: ["5\n1 1 1 1 1"], expectedOutput: "5" },
      { input: ["4\n4 3 2 1"], expectedOutput: "6" },
      { input: ["7\n1 2 3 4 5 4 3"], expectedOutput: "15" },
    ],
  },
  {
    title: "Minimum Window Substring",
    desc: "Given two strings s and t of lengths m and n respectively, return the minimum window substring of s such that every character in t (including duplicates) is included in the window. If there is no such substring, return the empty string \"\".\n\nThe testcases will be generated such that the answer is unique.",
    level: "Hard",
    topic: "Sliding Window",
    constraints: "m == s.length\nn == t.length\n1 <= m, n <= 10^5\ns and t consist of uppercase and lowercase English letters.",
    functionName: "minWindow",
    parameterNames: ["s", "t"],
    parameterTypes: ["string", "string"],
    returnType: "string",
    testcases: [
      { input: ["ADOBECODEBANC", "ABC"], expectedOutput: "BANC" },
      { input: ["a", "a"], expectedOutput: "a" },
      { input: ["a", "aa"], expectedOutput: "" },
      { input: ["aa", "aa"], expectedOutput: "aa" },
      { input: ["cabwefgewcwaefgcf", "cwae"], expectedOutput: "cwae" },
      { input: ["bba", "ab"], expectedOutput: "ba" },
    ],
  },
  {
    title: "Sliding Window Maximum",
    desc: "You are given an array of integers nums, and there is a sliding window of size k which is moving from the very left of the array to the very right. You can only see the k numbers in the window. Each time the sliding window moves right by one position.\n\nReturn an array of the maximum sliding window values.",
    level: "Hard",
    topic: "Deque",
    constraints: "1 <= nums.length <= 10^5\n-10^4 <= nums[i] <= 10^4\n1 <= k <= nums.length",
    functionName: "maxSlidingWindow",
    parameterNames: ["nums", "k"],
    parameterTypes: ["int[]", "int"],
    returnType: "int[]",
    testcases: [
      { input: ["8\n1 3 -1 -3 5 3 6 7", "3"], expectedOutput: "3 3 5 5 6 7" },
      { input: ["1\n1", "1"], expectedOutput: "1" },
      { input: ["4\n9 11 2 5", "2"], expectedOutput: "11 11 5" },
      { input: ["5\n1 2 3 4 5", "1"], expectedOutput: "1 2 3 4 5" },
      { input: ["6\n7 2 4 1 5 3", "3"], expectedOutput: "7 4 5 5" },
      { input: ["5\n-7 -8 -1 -2 -3", "2"], expectedOutput: "-7 -1 -1 -2" },
    ],
  },
  {
    title: "Candy",
    desc: "There are n children standing in a line. Each child is assigned a rating value given in the integer array ratings.\n\nYou are giving candies to these children subjected to the following requirements:\n1. Each child must have at least one candy.\n2. Children with a higher rating get more candies than their neighbors.\n\nReturn the minimum number of candies you need to have to distribute the candies to the children.",
    level: "Hard",
    topic: "Greedy",
    constraints: "n == ratings.length\n1 <= n <= 2 * 10^4\n0 <= ratings[i] <= 2 * 10^4",
    functionName: "candy",
    parameterNames: ["ratings"],
    parameterTypes: ["int[]"],
    returnType: "int",
    testcases: [
      { input: ["3\n1 0 2"], expectedOutput: "5" },
      { input: ["3\n1 2 2"], expectedOutput: "4" },
      { input: ["1\n1"], expectedOutput: "1" },
      { input: ["5\n1 2 3 4 5"], expectedOutput: "15" },
      { input: ["5\n5 4 3 2 1"], expectedOutput: "15" },
      { input: ["6\n1 3 2 2 1 0"], expectedOutput: "10" },
    ],
  },
  {
    title: "Wildcard Matching",
    desc: "Given an input string s and a pattern p, implement wildcard pattern matching with support for '?' and '*' where:\n- '?' matches any single character.\n- '*' matches any sequence of characters (including the empty sequence).\n\nThe matching should cover the entire input string (not partial).",
    level: "Hard",
    topic: "Dynamic Programming",
    constraints: "0 <= s.length, p.length <= 2000\ns contains only lowercase English letters.\np contains only lowercase English letters, '?' or '*'.",
    functionName: "isMatch",
    parameterNames: ["s", "p"],
    parameterTypes: ["string", "string"],
    returnType: "bool",
    testcases: [
      { input: ["aa", "a"], expectedOutput: "false" },
      { input: ["aa", "*"], expectedOutput: "true" },
      { input: ["cb", "?a"], expectedOutput: "false" },
      { input: ["adceb", "*a*b"], expectedOutput: "true" },
      { input: ["acdcb", "a*c?b"], expectedOutput: "false" },
      { input: ["", "*"], expectedOutput: "true" },
      { input: ["abc", "a?c"], expectedOutput: "true" },
    ],
  },
  {
    title: "Median of Two Sorted Arrays",
    desc: "Given two sorted arrays nums1 and nums2 of size m and n respectively, return the median of the two sorted arrays.\n\nThe overall run time complexity should be O(log (m+n)).\n\nIf the combined length is odd, return the middle element. If even, return the average of the two middle elements.",
    level: "Hard",
    topic: "Binary Search",
    constraints: "nums1.length == m\nnums2.length == n\n0 <= m <= 1000\n0 <= n <= 1000\n1 <= m + n <= 2000\n-10^6 <= nums1[i], nums2[i] <= 10^6",
    functionName: "findMedianSortedArrays",
    parameterNames: ["nums1", "nums2"],
    parameterTypes: ["int[]", "int[]"],
    returnType: "float",
    testcases: [
      { input: ["2\n1 3", "1\n2"], expectedOutput: "2.0" },
      { input: ["2\n1 2", "2\n3 4"], expectedOutput: "2.5" },
      { input: ["0\n", "1\n1"], expectedOutput: "1.0" },
      { input: ["1\n2", "0\n"], expectedOutput: "2.0" },
      { input: ["3\n1 3 5", "3\n2 4 6"], expectedOutput: "3.5" },
      { input: ["2\n0 0", "2\n0 0"], expectedOutput: "0.0" },
    ],
  },

  // ─── Matrix ─────────────────────────────────────────────────────────────────
  {
    title: "Spiral Matrix",
    desc: "Given an m x n matrix, return all elements of the matrix in spiral order (clockwise, starting from the top-left corner).\n\nFor example, a 2×3 matrix [[1,2,3],[4,5,6]] should return [1,2,3,6,5,4].",
    level: "Medium",
    topic: "Matrix",
    constraints: "1 <= m, n <= 10\n-100 <= matrix[i][j] <= 100",
    functionName: "spiralOrder",
    parameterNames: ["matrix"],
    parameterTypes: ["int[][]"],
    returnType: "int[]",
    testcases: [
      { input: ["2 3 1 2 3 4 5 6"], expectedOutput: "1 2 3 6 5 4" },
      { input: ["1 1 1"], expectedOutput: "1" },
      { input: ["2 2 1 2 3 4"], expectedOutput: "1 2 4 3" },
      { input: ["3 3 1 2 3 4 5 6 7 8 9"], expectedOutput: "1 2 3 6 9 8 7 4 5" },
    ],
  },
  {
    title: "Search a 2D Matrix",
    desc: "Write an efficient algorithm that searches for a target value in an m x n integer matrix with these properties:\n\n1. Integers in each row are sorted left to right.\n2. The first integer of each row is greater than the last integer of the previous row.\n\nReturn true if target is found, false otherwise.",
    level: "Medium",
    topic: "Matrix",
    constraints: "m == matrix.length\nn == matrix[i].length\n1 <= m, n <= 100\n-10^4 <= matrix[i][j], target <= 10^4",
    functionName: "searchMatrix",
    parameterNames: ["matrix", "target"],
    parameterTypes: ["int[][]", "int"],
    returnType: "bool",
    testcases: [
      { input: ["3 4 1 3 5 7 10 11 16 20 23 30 34 60", "3"], expectedOutput: "true" },
      { input: ["3 4 1 3 5 7 10 11 16 20 23 30 34 60", "13"], expectedOutput: "false" },
      { input: ["1 1 1", "1"], expectedOutput: "true" },
      { input: ["2 2 1 3 5 10 11", "10"], expectedOutput: "true" },
      { input: ["2 2 1 3 5 10 11", "2"], expectedOutput: "false" },
    ],
  },
  {
    title: "Matrix Diagonal Sum",
    desc: "Given a square matrix, return the sum of the matrix diagonals.\n\nThe primary diagonal runs from top-left to bottom-right. The secondary diagonal runs from top-right to bottom-left.\n\nIf the matrix size is odd, the center element is counted only once.",
    level: "Easy",
    topic: "Matrix",
    constraints: "n == matrix.length == matrix[i].length\n1 <= n <= 100\n-100 <= matrix[i][j] <= 100",
    functionName: "diagonalSum",
    parameterNames: ["matrix"],
    parameterTypes: ["int[][]"],
    returnType: "int",
    testcases: [
      { input: ["3 3 1 2 3 4 5 6 7 8 9"], expectedOutput: "25" },
      { input: ["2 2 1 2 3 4"], expectedOutput: "10" },
      { input: ["1 1 5"], expectedOutput: "5" },
      { input: ["4 4 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1"], expectedOutput: "8" },
    ],
  },
  {
    title: "Toeplitz Matrix",
    desc: "Given an m x n matrix, return true if the matrix is Toeplitz.\n\nA matrix is Toeplitz if every diagonal from top-left to bottom-right has the same elements — that is, matrix[i][j] == matrix[i+1][j+1] for all valid i and j.",
    level: "Easy",
    topic: "Matrix",
    constraints: "1 <= m, n <= 20\n0 <= matrix[i][j] <= 99",
    functionName: "isToeplitz",
    parameterNames: ["matrix"],
    parameterTypes: ["int[][]"],
    returnType: "bool",
    testcases: [
      { input: ["3 4 1 2 3 4 5 1 2 3 9 5 1 2"], expectedOutput: "true" },
      { input: ["2 2 1 2 2 3"], expectedOutput: "false" },
      { input: ["1 1 5"], expectedOutput: "true" },
      { input: ["2 3 1 2 3 4 1 2"], expectedOutput: "true" },
    ],
  },
  {
    title: "Number of Islands",
    desc: "Given an m x n 2D binary matrix grid of 1s (land) and 0s (water), return the number of islands.\n\nAn island is formed by connecting adjacent lands horizontally or vertically. You may assume all four edges of the grid are surrounded by water.",
    level: "Medium",
    topic: "Matrix",
    constraints: "m == grid.length\nn == grid[i].length\n1 <= m, n <= 300\ngrid[i][j] is 0 or 1",
    functionName: "numIslands",
    parameterNames: ["grid"],
    parameterTypes: ["int[][]"],
    returnType: "int",
    testcases: [
      { input: ["4 5 1 1 1 1 0 0 0 0 1 1 0 0 1 1 1 1 0 0 0"], expectedOutput: "3" },
      { input: ["1 1 1"], expectedOutput: "1" },
      { input: ["2 2 1 0 0 1"], expectedOutput: "2" },
      { input: ["3 3 1 1 0 1 0 0 0 0 1"], expectedOutput: "2" },
    ],
  },
];

async function upsertQuestion(q) {
  const { testcases, initialCode, ...scalars } = q;
  const existing = await prisma.question.findFirst({
    where: { title: q.title },
    include: { _count: { select: { testCases: true } } },
  });

  if (!existing) {
    await prisma.question.create({
      data: {
        ...scalars,
        ...buildQuestionNestedCreate({
          testcases,
          initialCode: initialCode || [],
        }),
      },
    });
    return "created";
  }

  // Older seeds stored the question row but never nested QuestionTestCase rows
  if (existing._count.testCases === 0 && Array.isArray(testcases) && testcases.length > 0) {
    await prisma.questionTestCase.createMany({
      data: testcases.map((tc, index) => ({
        questionId: existing.id,
        sortOrder: index,
        input: tc.input ?? "",
        expectedOutput: String(tc.expectedOutput ?? tc.output ?? ""),
      })),
    });
    return "repaired";
  }

  return "skipped";
}

async function seed() {
  try {
    console.log("Connecting to database via Prisma...");
    await prisma.$connect();
    console.log("Connected!");

    const existingCount = await prisma.question.count();
    console.log(`Found ${existingCount} existing questions.`);

    let created = 0;
    let repaired = 0;
    let skipped = 0;

    for (const q of seedQuestions) {
      const result = await upsertQuestion(q);
      if (result === "created") {
        console.log(`  Created: "${q.title}" [${q.level}] - ${q.topic}`);
        created++;
      } else if (result === "repaired") {
        console.log(`  Repaired test cases: "${q.title}" [${q.level}]`);
        repaired++;
      } else {
        console.log(`  Skipping "${q.title}" (already has test cases)`);
        skipped++;
      }
    }

    console.log(
      `\nDone! Created ${created}, repaired ${repaired}, skipped ${skipped}.`,
    );
  } catch (err) {
    console.error("Seed failed:", err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
    console.log("Disconnected from database.");
  }
}

seed();
