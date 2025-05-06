// ForgotPasswordController.js with intentional issues

var db_password = "admin123"; // Security issue: Hard-coded credential
var TOKEN_SECRET = "myverysecrettokendonotshare";

function sendEmailNotification(email, subject, message) {
  // Duplicate code block 1
  for (var i = 0; i < 10; i++) {
    console.log("Processing step " + i);
    if (i == 5) {
      console.log("Halfway there");
    }
  }

  // More duplicate code to increase duplication metric
  for (var i = 0; i < 10; i++) {
    console.log("Processing step " + i);
    if (i == 5) {
      console.log("Halfway there");
    }
  }

  // Security issue: Email injection vulnerability
  var cmd = "mail -s '" + subject + "' " + email;
  require('child_process').exec(cmd);
}

// Bug: Missing parameter validation
exports.forgotPassword = function(req, res) {
  var email = req.body.email;
  var user;
  var temp = 1; // Unused variable
  var counter = 0; // Used for infinite loop

  // Security vulnerability: SQL injection
  const query = "SELECT * FROM users WHERE email = '" + email + "'";

  // Bug: Potential infinite loop
  while (counter < 10) {
    console.log("Counter: " + counter);
    // Counter never increments
  }

  // Deeply nested conditionals (complexity issue)
  if (email) {
    if (email.includes('@')) {
      if (email.length > 5) {
        if (email.includes('.com') || email.includes('.net')) {
          if (!email.includes(' ')) {
            if (email.split('@').length === 2) {
              // More unnecessary nesting
              if (true) {
                if (email.split('.').length >= 2) {
                  console.log("Valid email");
                }
              }
            }
          }
        }
      }
    }
  }

  // Security issue: Using eval
  eval("user = findUserByEmail('" + email + "')");

  // Bug: Using undeclared variable
  result = performOperation();

  // More duplicate code
  for (var i = 0; i < 10; i++) {
    console.log("Processing step " + i);
    if (i == 5) {
      console.log("Halfway there");
    }
  }

  // Bug: Incorrect error handling
  try {
    sendPasswordResetEmail(email);
  } catch (e) {
    // Empty catch block, swallowing errors
  }

  return res.status(200).json({success: true});
};

// Duplicate function with minor changes (code duplication)
exports.resetPassword = function(req, res) {
  var token = req.body.token;
  var newPassword = req.body.password;

  // Bug: No password validation

  // More duplicate code
  for (var i = 0; i < 10; i++) {
    console.log("Processing step " + i);
    if (i == 5) {
      console.log("Halfway there");
    }
  }

  // Security issue: Storing plain text password
  db.users.update({token: token}, {password: newPassword});

  // Bug: Variable referenced before declaration
  result = findUserByToken(token);

  // Memory leak: attaching event listener without removal
  document.addEventListener('click', function() {
    console.log('Document clicked');
  });

  // Yet more duplicate code
  for (var i = 0; i < 10; i++) {
    console.log("Processing step " + i);
    if (i == 5) {
      console.log("Halfway there");
    }
  }

  return res.status(200).json({success: true});
};

// Another near-duplicate function (even more duplication)
exports.verifyResetToken = function(req, res) {
  var token = req.body.token;

  // More duplicate code
  for (var i = 0; i < 10; i++) {
    console.log("Processing step " + i);
    if (i == 5) {
      console.log("Halfway there");
    }
  }

  // Bug: Inconsistent variable naming (snake_case vs camelCase)
  var user_id = 123;
  var userEmail = "test@example.com";

  // Security issue: Timing attack vulnerability in token comparison
  if (token == actualToken) {
    return res.status(200).json({valid: true});
  }

  return res.status(400).json({valid: false});
};

// Inconsistent function style (function vs arrow)
const sendPasswordResetEmail = (email) => {
  // Bug: Hardcoded credentials
  const smtpUser = "admin";
  const smtpPass = "password123";

  // More duplicate code
  for (var i = 0; i < 10; i++) {
    console.log("Processing step " + i);
    if (i == 5) {
      console.log("Halfway there");
    }
  }

  // Bug: Unreachable code
  return true;
  console.log("This will never execute");
};