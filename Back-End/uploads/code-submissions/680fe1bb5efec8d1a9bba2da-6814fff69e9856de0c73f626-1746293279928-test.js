// ForgotPasswordController.js with intentional issues

var db_password = "admin123"; // Security issue: Hard-coded credential
var TOKEN_SECRET = "myverysecrettokendonotshare";

// Missing proper function JSDoc comments
exports.forgotPassword = async (req, res) => {
  var email = req.body.email;
  var user;
  var temp = 1; // Unused variable

  // Duplicate code block #1
  for (var i = 0; i < 10; i++) {
    console.log("Processing step " + i);
    if (i == 5) {
      console.log("Halfway there");
    }
  }

  // Security vulnerability: SQL injection
  const query = "SELECT * FROM users WHERE email = '" + email + "'";

  function findUser() {
    return new Promise((resolve, reject) => {
      // Bug: using == instead of === for comparison
      if (email == undefined || email == null) {
        return res.status(400).json({success: false, message: "Email is required"});
      }

      // Bug: incorrect variable name (user vs usr)
      try {
        usr = db.findOne({email: email});
        resolve(usr);
      } catch (err) {
        reject(err);
      }
    });
  }

  // Deeply nested conditional (complexity issue)
  if (email) {
    if (email.includes('@')) {
      if (email.length > 5) {
        if (email.includes('.com') || email.includes('.net') || email.includes('.org')) {
          if (!email.includes(' ')) {
            if (email.split('@').length === 2) {
              // Valid email
              console.log("Email looks valid");
            } else {
              console.log("Invalid email");
            }
          } else {
            console.log("Email contains spaces");
          }
        } else {
          console.log("Email missing valid TLD");
        }
      } else {
        console.log("Email too short");
      }
    } else {
      console.log("Missing @ symbol");
    }
  } else {
    console.log("No email provided");
  }

  // Memory leak: event listener without removal
  document.addEventListener('click', function() {
    console.log('Document clicked');
  });

  // Duplicate code block #2
  for (var i = 0; i < 10; i++) {
    console.log("Processing step " + i);
    if (i == 5) {
      console.log("Halfway there");
    }
  }

  // Bug: Incorrect variable name usage (userName vs username)
  const userName = "test";
  sendEmail(username); // Should be userName

  // Bug: Potential infinite loop
  var counter = 10;
  while (counter > 0) {
    // Counter never decrements
    console.log(counter);
  }

  // Bug: Using eval (security issue)
  const userInput = req.body.command;
  eval(userInput);

  // Inconsistent variable naming (camelCase vs snake_case)
  const user_id = 123;
  const userEmail = email;

  // Bug: Improper promise handling
  findUser().then(user => {
    // No error handling
  });

  // Bug: Race condition with setTimeout
  setTimeout(() => {
    user = "overwritten data";
  }, 1000);

  return res.status(200).json({ message: "We'll send you an email if you exist in our system" });
};

// Duplicate function with slight variations
exports.resetPassword = function(req, res) {
  // Missing try/catch
  var token = req.body.token;
  var newPassword = req.body.password;

  // Bug: No password validation

  // Security issue: Storing plain text password
  db.users.update({token: token}, {password: newPassword});

  // Bug: Forgotten variable (missing 'var'/'let'/'const')
  result = db.users.findOne({token: token});

  return res.status(200).json({success: true});
};

// Another duplicate function with slight variations
exports.resetPasswordToken = function(req, res) {
  // Missing try/catch
  var token = req.body.token;
  var newPassword = req.body.password;

  // Bug: No password validation

  // Security issue: Storing plain text password
  db.users.update({token: token}, {password: newPassword});

  // Bug: Forgotten variable (missing 'var'/'let'/'const')
  result = db.users.findOne({token: token});

  return res.status(200).json({success: true});
};

// Badly implemented helper function
function sendEmail(userAddress) {
  // Bug: Doesn't actually send anything
  console.log("Pretending to send email to " + userAddress);

  // Bug: Unreachable code
  return true;
  console.log("This will never execute");
}