/**
 * A simple test file for code analysis
 */

// Calculate sum of two numbers
function sum(a, b) {
  var result = a + b; // Using var instead of let/const (code smell)
  
  console.log("Result:", result); // Console log (code smell)
  
  if (result == 10) { // Using == instead of === (potential bug)
    return "Ten";
  }
  
  return result;
}

// TODO: Add more functionality (code smell)

module.exports = { sum };