Here are the files for a simple Node.js project that you can ZIP and use for testing:

1. First, create this file structure:
```
sample-project/
├── package.json
├── index.js
├── src/
│   ├── utils.js
│   ├── calculator.js
│   └── userManager.js
└── test/
    └── calculator.test.js
```

2. Copy each file's content below to the corresponding file:

package.json:
```json
{
  "name": "sample-project",
  "version": "1.0.0",
  "description": "A sample project for SonarCloud testing",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "test": "jest"
  },
  "dependencies": {
    "express": "^4.18.2"
  },
  "devDependencies": {
    "jest": "^29.5.0"
  }
}
```

index.js:
```javascript
const express = require('express');
const utils = require('./src/utils');
const calculator = require('./src/calculator');
const userManager = require('./src/userManager');

// Create Express app
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Unnecessary variable (code smell)
const unusedVariable = 'This variable is never used';

// Routes
app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.get('/calculate/:operation', (req, res) => {
  const { operation } = req.params;
  const { num1, num2 } = req.query;

  // Potential bug: not validating input
  let result;

  switch (operation) {
    case 'add':
      result = calculator.add(parseFloat(num1), parseFloat(num2));
      break;
    case 'subtract':
      result = calculator.subtract(parseFloat(num1), parseFloat(num2));
      break;
    case 'multiply':
      result = calculator.multiply(parseFloat(num1), parseFloat(num2));
      break;
    case 'divide':
      // Bug: no division by zero check
      result = calculator.divide(parseFloat(num1), parseFloat(num2));
      break;
    default:
      return res.status(400).json({ error: 'Invalid operation' });
  }

  // Security issue: logging sensitive data
  console.log(`User calculated: ${num1} ${operation} ${num2} = ${result}`);
  
  res.json({ result });
});

app.post('/users', (req, res) => {
  const { username, password } = req.body;
  
  // Security issue: not hashing passwords
  const user = userManager.createUser(username, password);
  
  res.status(201).json({ user });
});

// Start server
app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});

// Duplicate code (code smell)
function processData(data) {
  let result = [];
  
  for (let i = 0; i < data.length; i++) {
    if (data[i] > 0) {
      result.push(data[i] * 2);
    }
  }
  
  return result;
}

// Duplicate code again (code smell)
function transformData(data) {
  let result = [];
  
  for (let i = 0; i < data.length; i++) {
    if (data[i] > 0) {
      result.push(data[i] * 2);
    }
  }
  
  return result;
}

// Complex function (code smell)
function complexFunction(a, b, c, d, e, f) {
  let result = 0;
  
  if (a > b) {
    if (c > d) {
      if (e > f) {
        result = a + c + e;
      } else {
        result = a + c + f;
      }
    } else {
      if (e > f) {
        result = a + d + e;
      } else {
        result = a + d + f;
      }
    }
  } else {
    if (c > d) {
      if (e > f) {
        result = b + c + e;
      } else {
        result = b + c + f;
      }
    } else {
      if (e > f) {
        result = b + d + e;
      } else {
        result = b + d + f;
      }
    }
  }
  
  return result;
}

module.exports = app;
```

src/utils.js:
```javascript
/**
 * Utility functions
 */

// Bug: Math.random() is not secure for cryptographic purposes
function generateRandomId() {
  return Math.floor(Math.random() * 1000000);
}

// Security issue: eval is dangerous
function evaluateExpression(expression) {
  try {
    return eval(expression);
  } catch (error) {
    return null;
  }
}

// Overly complex function (code smell)
function processArray(arr) {
  for (let i = 0; i < arr.length; i++) {
    for (let j = 0; j < arr.length; j++) {
      for (let k = 0; k < arr.length; k++) {
        arr[i] = arr[i] + arr[j] + arr[k];
      }
    }
  }
  return arr;
}

function formatString(str) {
  // Bug: doesn't handle null
  return str.trim().toLowerCase();
}

// Export functions
module.exports = {
  generateRandomId,
  evaluateExpression,
  processArray,
  formatString
};
```

src/calculator.js:
```javascript
/**
 * Calculator module
 */

function add(a, b) {
  return a + b;
}

function subtract(a, b) {
  return a - b;
}

function multiply(a, b) {
  return a * b;
}

function divide(a, b) {
  // Bug: no division by zero check
  return a / b;
}

// Complex function with poor naming (code smell)
function calc(a, b, c) {
  let x = 0;
  
  if (c === 1) {
    x = a + b;
  } else if (c === 2) {
    x = a - b;
  } else if (c === 3) {
    x = a * b;
  } else {
    x = a / b;
  }
  
  return x;
}

module.exports = {
  add,
  subtract,
  multiply,
  divide,
  calc
};
```

src/userManager.js:
```javascript
/**
 * User manager module
 */

// In-memory user storage (not recommended for production)
const users = [];

// Security issue: passwords stored in plain text
function createUser(username, password) {
  // Bug: no validation for username or password
  const user = {
    id: users.length + 1,
    username,
    password,
    createdAt: new Date()
  };
  
  users.push(user);
  return user;
}

function findUserByUsername(username) {
  return users.find(user => user.username === username);
}

function authenticateUser(username, password) {
  // Security issue: potential timing attack vulnerability
  const user = findUserByUsername(username);
  
  if (!user) {
    return null;
  }
  
  // Security issue: comparing passwords in plain text
  if (user.password === password) {
    return user;
  }
  
  return null;
}

// Duplicate code (code smell)
function findUserById(id) {
  for (let i = 0; i < users.length; i++) {
    if (users[i].id === id) {
      return users[i];
    }
  }
  return null;
}

// Another duplicate code block (code smell)
function findUserByEmail(email) {
  for (let i = 0; i < users.length; i++) {
    if (users[i].email === email) {
      return users[i];
    }
  }
  return null;
}

module.exports = {
  createUser,
  findUserByUsername,
  authenticateUser,
  findUserById,
  findUserByEmail
};
```

test/calculator.test.js:
```javascript
const calculator = require('../src/calculator');

test('adds 1 + 2 to equal 3', () => {
  expect(calculator.add(1, 2)).toBe(3);
});

test('subtracts 5 - 2 to equal 3', () => {
  expect(calculator.subtract(5, 2)).toBe(3);
});

test('multiplies 3 * 4 to equal 12', () => {
  expect(calculator.multiply(3, 4)).toBe(12);
});

test('divides 10 / 2 to equal 5', () => {
  expect(calculator.divide(10, 2)).toBe(5);
});

// Bug: missing test for division by zero
```

3. After creating these files, zip the entire "sample-project" directory.