export interface SimulationFile {
  name: string;
  path: string;
  content: string;
  language: string;
  /** Cloudinary raw file URL — when present, content is loaded from here */
  cloudinaryUrl?: string;
  /** Cloudinary public ID for management */
  cloudinaryPublicId?: string;
}

export interface SimulationStep {
  description: string;
}

export interface Simulation {
  id: string;
  title: string;
  category: "frontend" | "backend" | "fullstack" | "devops";
  difficulty: "easy" | "medium" | "hard";
  description: string;
  incident: string;
  steps: SimulationStep[];
  initialFiles: SimulationFile[];
  solution: Record<string, string>; // fileName -> solution code
  hints?: string[];
  estimatedTime: number; // in minutes
  tags: string[];
  xpReward: number;
  /** Which file to execute (defaults to "index.js") */
  entryFile?: string;
  /** Optional expected stdout for auto-grading */
  expectedOutput?: string;
}

export const simulations: Simulation[] = [
  {
    id: "console-log-debug",
    title: "Debug: Missing Console Output",
    category: "backend",
    difficulty: "easy",
    description:
      "A simple function should log output but nothing appears in the console.",
    incident:
      "The function greet() is not producing any console output when called.",
    steps: [
      { description: "Run the code and check console." },
      { description: "Add the missing console.log statement." },
      { description: "Run again to verify output." },
    ],
    estimatedTime: 5,
    tags: ["JavaScript", "Console", "Debug"],
    xpReward: 30,
    initialFiles: [
      {
        name: "index.js",
        path: "index.js",
        language: "javascript",
        content: `function greet(name) {
  const message = \`Hello, \${name}!\`;
  // BUG: Missing console.log to display the message
}

greet("World");
`,
      },
    ],
    solution: {
      "index.js": `function greet(name) {
  const message = \`Hello, \${name}!\`;
  console.log(message);
}

greet("World");
`,
    },
    hints: [
      "The function creates a message but doesn't display it.",
      "Use console.log() to print output to the console.",
    ],
  },
  {
    id: "typo-in-variable",
    title: "Syntax: Variable Typo",
    category: "backend",
    difficulty: "easy",
    description: "A calculation is failing due to a typo in a variable name.",
    incident: "ReferenceError: totla is not defined",
    steps: [
      { description: "Read the error message carefully." },
      { description: "Find the misspelled variable." },
      { description: "Fix the typo and run the code." },
    ],
    estimatedTime: 5,
    tags: ["JavaScript", "Syntax", "Variables"],
    xpReward: 30,
    initialFiles: [
      {
        name: "calc.js",
        path: "calc.js",
        language: "javascript",
        content: `function calculateTotal(price, quantity) {
  const total = price * quantity;
  // BUG: Variable name is misspelled below
  console.log(\`Total: $\${totla}\`);
  return total;
}

calculateTotal(10, 5);
`,
      },
    ],
    solution: {
      "calc.js": `function calculateTotal(price, quantity) {
  const total = price * quantity;
  console.log(\`Total: $\${total}\`);
  return total;
}

calculateTotal(10, 5);
`,
    },
    hints: [
      "Look at the error message - which variable is undefined?",
      "Check the spelling of 'total' in the console.log statement.",
    ],
  },
  {
    id: "missing-return",
    title: "Logic: Missing Return Statement",
    category: "backend",
    difficulty: "easy",
    description:
      "A function that should return a value is returning undefined.",
    incident: "Expected function to return sum, but got undefined instead.",
    steps: [
      { description: "Check what the function should return." },
      { description: "Add the missing return statement." },
      { description: "Verify the output is correct." },
    ],
    estimatedTime: 5,
    tags: ["JavaScript", "Functions", "Return"],
    xpReward: 30,
    initialFiles: [
      {
        name: "math.js",
        path: "math.js",
        language: "javascript",
        content: `function addNumbers(a, b) {
  const sum = a + b;
  // BUG: Missing return statement
}

const result = addNumbers(5, 3);
console.log(\`Result: \${result}\`);
`,
      },
    ],
    solution: {
      "math.js": `function addNumbers(a, b) {
  const sum = a + b;
  return sum;
}

const result = addNumbers(5, 3);
console.log(\`Result: \${result}\`);
`,
    },
    hints: [
      "Functions need to return values to pass them back to the caller.",
      "Add 'return sum;' before the closing brace.",
    ],
  },
  {
    id: "frontend-homepage-crash",
    title: "Frontend: Homepage Crash",
    category: "frontend",
    difficulty: "easy",
    description:
      "The marketing homepage is crashing on mobile devices. Users report a white screen immediately after loading.",
    incident:
      "Hydration failed because the initial UI does not match what was rendered on the server.",
    steps: [
      { description: "Open the preview pane." },
      { description: "Resize to mobile width." },
      { description: "Refresh the page." },
    ],
    estimatedTime: 15,
    tags: ["React", "SSR", "Hydration", "Responsive"],
    xpReward: 50,
    initialFiles: [
      {
        name: "Nav.tsx",
        path: "components/Nav.tsx",
        language: "typescript",
        content: `import React, { useState, useEffect } from 'react';

export function Navigation() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  // BUG: window is not defined during SSR
  // Fix: Use useEffect to set state after mount
  
  return (
    <nav className="no-border-b">
      {isMobile ? (
        <button>Menu</button>
      ) : (
        <ul className="flex gap-4">
          <li>Home</li>
          <li>About</li>
        </ul>
      )}
    </nav>
  );
}`,
      },
      {
        name: "App.tsx",
        path: "App.tsx",
        language: "typescript",
        content: `import React from 'react';
import { Navigation } from './components/Nav';

export default function App() {
  return (
    <div>
      <Navigation />
      <main>
        <h1>Welcome</h1>
      </main>
    </div>
  );
}`,
      },
    ],
    solution: {
      "Nav.tsx": `import React, { useState, useEffect } from 'react';

export function Navigation() {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
  }, []);
  
  return (
    <nav className="no-border-b">
      {isMobile ? (
        <button>Menu</button>
      ) : (
        <ul className="flex gap-4">
          <li>Home</li>
          <li>About</li>
        </ul>
      )}
    </nav>
  );
}`,
    },
    hints: [
      "The error mentions SSR (Server Side Rendering). What's different between server and browser?",
      "The window object is not available during server-side rendering.",
      "Use useEffect to access browser APIs after the component mounts.",
    ],
  },
  {
    id: "backend-api-timeout",
    title: "Backend: API Timeout",
    category: "backend",
    difficulty: "easy",
    description:
      "Users are experiencing timeout errors when fetching user data from the API endpoint.",
    incident:
      "The /api/users endpoint is taking more than 30 seconds to respond, causing timeout errors.",
    steps: [
      { description: "Run the server." },
      { description: "Test the API endpoint." },
      { description: "Check the console for errors." },
    ],
    estimatedTime: 20,
    tags: ["Node.js", "Express", "Database", "Performance"],
    xpReward: 60,
    initialFiles: [
      {
        name: "server.js",
        path: "server.js",
        language: "javascript",
        content: `const express = require('express');
const app = express();

// Mock database query that's slow
async function getAllUsers() {
  const users = [];
  // BUG: N+1 query problem - fetching user details one by one
  for (let i = 1; i <= 1000; i++) {
    // Simulating individual database calls
    await new Promise(resolve => setTimeout(resolve, 30));
    users.push({ id: i, name: \`User \${i}\` });
  }
  return users;
}

app.get('/api/users', async (req, res) => {
  const users = await getAllUsers();
  res.json(users);
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});

module.exports = app;`,
      },
    ],
    solution: {
      "server.js": `const express = require('express');
const app = express();

// Optimized: Fetch all users in a single query
async function getAllUsers() {
  // Simulate a single bulk database query
  await new Promise(resolve => setTimeout(resolve, 100));
  const users = [];
  for (let i = 1; i <= 1000; i++) {
    users.push({ id: i, name: \`User \${i}\` });
  }
  return users;
}

app.get('/api/users', async (req, res) => {
  const users = await getAllUsers();
  res.json(users);
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});

module.exports = app;`,
    },
    hints: [
      "The code is making 1000 individual async calls. Can this be batched?",
      "Instead of awaiting inside a loop, generate all users at once.",
      "N+1 query problem: Fetching related data in a loop instead of a single query.",
    ],
  },
  {
    id: "memory-leak-event-listeners",
    title: "Frontend: Memory Leak",
    category: "frontend",
    difficulty: "medium",
    description:
      "The application's memory usage keeps growing over time, especially when users navigate between pages.",
    incident:
      "Event listeners are not being cleaned up when components unmount, causing memory leaks.",
    steps: [
      { description: "Open developer tools." },
      { description: "Monitor memory usage." },
      { description: "Navigate between pages multiple times." },
    ],
    estimatedTime: 25,
    tags: ["React", "Memory Leak", "Event Listeners", "useEffect"],
    xpReward: 80,
    initialFiles: [
      {
        name: "Dashboard.tsx",
        path: "components/Dashboard.tsx",
        language: "typescript",
        content: `import React, { useState, useEffect } from 'react';

export function Dashboard() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    // BUG: Event listeners not cleaned up
    window.addEventListener('mousemove', (e) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    });
    
    window.addEventListener('resize', () => {
      setWindowSize({ 
        width: window.innerWidth, 
        height: window.innerHeight 
      });
    });
  }, []);

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Mouse: {mousePos.x}, {mousePos.y}</p>
      <p>Window: {windowSize.width} x {windowSize.height}</p>
    </div>
  );
}`,
      },
    ],
    solution: {
      "Dashboard.tsx": `import React, { useState, useEffect } from 'react';

export function Dashboard() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    
    const handleResize = () => {
      setWindowSize({ 
        width: window.innerWidth, 
        height: window.innerHeight 
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('resize', handleResize);
    
    // Cleanup function to remove event listeners
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Mouse: {mousePos.x}, {mousePos.y}</p>
      <p>Window: {windowSize.width} x {windowSize.height}</p>
    </div>
  );
}`,
    },
    hints: [
      "useEffect can return a cleanup function that runs when the component unmounts.",
      "Event listeners should be removed when they're no longer needed.",
      "Store the handler function in a variable so you can remove it later.",
    ],
  },
  {
    id: "cors-error-api",
    title: "Backend: CORS Error",
    category: "backend",
    difficulty: "easy",
    description:
      "Frontend application cannot fetch data from the API due to CORS errors.",
    incident:
      "Access to fetch at 'http://localhost:3001/api/data' from origin 'http://localhost:3000' has been blocked by CORS policy.",
    steps: [
      { description: "Open the browser console." },
      { description: "Try to fetch data from the API." },
      { description: "Fix the CORS configuration." },
    ],
    estimatedTime: 15,
    tags: ["Node.js", "Express", "CORS", "API"],
    xpReward: 50,
    initialFiles: [
      {
        name: "server.js",
        path: "server.js",
        language: "javascript",
        content: `const express = require('express');
const app = express();

// BUG: CORS not configured
app.get('/api/data', (req, res) => {
  res.json({ message: 'Hello from API' });
});

app.listen(3001, () => {
  console.log('Server running on port 3001');
});

module.exports = app;`,
      },
    ],
    solution: {
      "server.js": `const express = require('express');
const cors = require('cors');
const app = express();

// Enable CORS for all routes
app.use(cors());

app.get('/api/data', (req, res) => {
  res.json({ message: 'Hello from API' });
});

app.listen(3001, () => {
  console.log('Server running on port 3001');
});

module.exports = app;`,
    },
    hints: [
      "CORS (Cross-Origin Resource Sharing) needs to be configured on the server.",
      "Express has middleware packages that can help with CORS.",
      "You can use the 'cors' package from npm.",
    ],
  },
  {
    id: "infinite-loop-useeffect",
    title: "Frontend: Infinite Loop",
    category: "frontend",
    difficulty: "medium",
    description:
      "The page becomes unresponsive and the browser tab crashes after a few seconds.",
    incident:
      "useEffect is triggering infinitely, causing excessive re-renders and memory consumption.",
    steps: [
      { description: "Open the page." },
      { description: "Check the console for warnings." },
      { description: "Identify the infinite loop." },
    ],
    estimatedTime: 20,
    tags: ["React", "useEffect", "Dependencies", "Hooks"],
    xpReward: 70,
    initialFiles: [
      {
        name: "UserProfile.tsx",
        path: "components/UserProfile.tsx",
        language: "typescript",
        content: `import React, { useState, useEffect } from 'react';

export function UserProfile() {
  const [user, setUser] = useState({ name: '', email: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // BUG: Missing dependency array causes infinite loop
    // Or wrong dependencies causing infinite updates
    fetch('/api/user')
      .then(res => res.json())
      .then(data => {
        setUser(data);
        setLoading(false);
      });
  }, [user]); // BUG: user changes trigger new fetch, which updates user

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  );
}`,
      },
    ],
    solution: {
      "UserProfile.tsx": `import React, { useState, useEffect } from 'react';

export function UserProfile() {
  const [user, setUser] = useState({ name: '', email: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/user')
      .then(res => res.json())
      .then(data => {
        setUser(data);
        setLoading(false);
      });
  }, []); // Empty dependency array - only run once on mount

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  );
}`,
    },
    hints: [
      "The dependency array in useEffect determines when the effect runs.",
      "If user is in the dependency array, updating user will trigger the effect again.",
      "For data fetching on mount, use an empty dependency array [].",
    ],
  },
  {
    id: "async-race-condition",
    title: "Backend: Race Condition",
    category: "backend",
    difficulty: "hard",
    description:
      "Users occasionally see incorrect data when multiple requests are made in quick succession.",
    incident:
      "Async operations complete out of order, causing stale data to overwrite fresh data.",
    steps: [
      { description: "Make multiple rapid API calls." },
      { description: "Observe data inconsistencies." },
      { description: "Implement request cancellation or versioning." },
    ],
    estimatedTime: 30,
    tags: ["Node.js", "Async", "Race Condition", "Concurrency"],
    xpReward: 100,
    initialFiles: [
      {
        name: "search.js",
        path: "search.js",
        language: "javascript",
        content: `const express = require('express');
const app = express();

let searchResults = [];

// BUG: No handling for concurrent requests
async function searchDatabase(query) {
  const delay = Math.random() * 2000; // Random delay
  await new Promise(resolve => setTimeout(resolve, delay));
  return [\`Result for \${query}\`];
}

app.get('/api/search', async (req, res) => {
  const query = req.query.q;
  const results = await searchDatabase(query);
  searchResults = results; // BUG: Race condition
  res.json(searchResults);
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});

module.exports = app;`,
      },
    ],
    solution: {
      "search.js": `const express = require('express');
const app = express();

let requestCounter = 0;

async function searchDatabase(query) {
  const delay = Math.random() * 2000;
  await new Promise(resolve => setTimeout(resolve, delay));
  return [\`Result for \${query}\`];
}

app.get('/api/search', async (req, res) => {
  const query = req.query.q;
  const requestId = ++requestCounter;
  
  const results = await searchDatabase(query);
  
  // Return results specific to this request
  // Don't store in shared state
  res.json({ 
    requestId, 
    query, 
    results 
  });
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});

module.exports = app;`,
    },
    hints: [
      "Each request should handle its own data independently.",
      "Avoid using shared state that can be modified by concurrent requests.",
      "Consider adding request IDs to track which response belongs to which request.",
    ],
  },
];

export function getSimulationById(id: string): Simulation | undefined {
  return simulations.find((sim) => sim.id === id);
}

export function getSimulationsByCategory(
  category: Simulation["category"],
): Simulation[] {
  return simulations.filter((sim) => sim.category === category);
}

export function getSimulationsByDifficulty(
  difficulty: Simulation["difficulty"],
): Simulation[] {
  return simulations.filter((sim) => sim.difficulty === difficulty);
}
