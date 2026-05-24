/**
 * Seed script: populates the database with 10 LeetCode-style DSA questions.
 *
 * Usage:
 *   node scripts/seed-questions.js
 *
 * Environment variables (from .env):
 *   DATABASE_URL
 */

import dotenv from "dotenv";
import { PrismaClient } from "../src/generated/prisma/index.js";

dotenv.config();

const prisma = new PrismaClient();

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
];

async function seed() {
  try {
    console.log("Connecting to MongoDB via Prisma...");
    await prisma.$connect();
    console.log("Connected!");

    const existingCount = await prisma.question.count();
    console.log(`Found ${existingCount} existing questions.`);

    let created = 0;
    for (const q of seedQuestions) {
      const exists = await prisma.question.findFirst({ where: { title: q.title } });
      if (exists) {
        console.log(`  Skipping "${q.title}" (already exists)`);
        continue;
      }
      await prisma.question.create({ data: q });
      console.log(`  Created: "${q.title}" [${q.level}] - ${q.topic}`);
      created++;
    }

    console.log(`\nDone! Created ${created} new questions (${seedQuestions.length - created} skipped).`);
  } catch (err) {
    console.error("Seed failed:", err);
  } finally {
    await prisma.$disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

seed();
