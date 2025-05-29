let display = document.getElementById('display');
let historyList = document.getElementById('history-list');
let currentExpression = '';
let lastInputIsOperator = false;
let lastInputIsEquals = false;
let memoryValue = 0;
let calculationHistory = [];
const MAX_HISTORY_ITEMS = 10; // Max items to show in history

// Power operation state
let baseForPower = null;


function appendToDisplay(value) {
    if (display.value === 'Error' || display.value === 'Division by zero' || display.value === 'Invalid input') {
        clearDisplay();
    }

    if (lastInputIsEquals) {
        if (!isOperator(value) && value !== '^') { // Also check for power operator
            currentExpression = '';
        }
        lastInputIsEquals = false;
    }
    
    // Handle x^y (power) operator
    if (value === '^') {
        if (currentExpression === '' || isOperator(currentExpression.slice(-1))) {
            display.value = 'Invalid input';
            currentExpression = '';
            return;
        }
        baseForPower = parseFloat(currentExpression); // Store the base
        currentExpression += '^'; // Add ^ to display
        display.value = currentExpression;
        lastInputIsOperator = true; // Treat '^' as an operator for input logic
        return;
    }

    if (isOperator(value)) {
        if (currentExpression === '' && value !== '-') {
            return; // Cannot start with an operator other than minus
        }
        // If the last char is an operator (and not a minus part of a negative number like in "5*-")
        const lastChar = currentExpression.slice(-1);
        const secondLastChar = currentExpression.slice(-2, -1);

        if (isOperator(lastChar) && !(lastChar === '-' && (isOperator(secondLastChar) || secondLastChar === '^'))) {
            // Replace the last operator, unless it's a minus for negation
            if (value !== '-' || (value === '-' && lastChar === '-')) { // don't replace if new is '-' and old is not, e.g. 5* with - => 5*-
                 // if current value is '-' and last char is already '-', do nothing e.g. 5*-- should not happen
                if (value === '-' && lastChar === '-') { return; }
                currentExpression = currentExpression.slice(0, -1) + value;
            } else {
                 currentExpression += value; // Allows 5* - by adding -
            }
        } else {
            currentExpression += value;
        }
        lastInputIsOperator = true;
    } else if (value === '.') {
        // Handle decimal point input logic (prevent multiple dots in one number segment)
        const segments = currentExpression.split(/[+\-*/^]/);
        const currentSegment = segments[segments.length - 1];
        if (!currentSegment.includes('.')) {
            currentExpression += value;
        }
        lastInputIsOperator = false;
    } else { // Number input
        if (currentExpression === '0' && value === '0') return; // Prevent "00"
        if (currentExpression === '0' && value !== '0' && value !== '.') currentExpression = value; // Replace "0" with new number
        else currentExpression += value;
        lastInputIsOperator = false;
    }

    display.value = currentExpression;
}

function isOperator(char) {
    return ['+', '-', '*', '/', '^'].includes(char); // Added ^
}

function clearDisplay() {
    currentExpression = '';
    display.value = '';
    lastInputIsOperator = false;
    lastInputIsEquals = false;
    baseForPower = null; // Reset power calculation state
}

function calculateResult() {
    if (currentExpression === '' || (isOperator(currentExpression.slice(-1)) && currentExpression.slice(-1) !== '%') ) {
        if(currentExpression.slice(-1) === '^') { // e.g. "5^" then "="
            display.value = "Invalid input";
            currentExpression = "";
            baseForPower = null;
            return;
        }
        return; // Do not calculate if empty or ends with an operator (unless it's a special op like %)
    }

    let expressionToEvaluate = currentExpression;
    let originalExpressionForHistory = currentExpression; // For history

    try {
        // Handle power (x^y) operation specifically
        if (expressionToEvaluate.includes('^')) {
            const parts = expressionToEvaluate.split('^');
            if (parts.length === 2 && baseForPower !== null) {
                const exponent = parseFloat(parts[1]);
                if (isNaN(exponent)) throw new Error("Invalid input for exponent");
                expressionToEvaluate = Math.pow(baseForPower, exponent).toString();
                originalExpressionForHistory = `${baseForPower}^${exponent}`;
            } else if (parts.length === 2 && baseForPower == null && !isNaN(parseFloat(parts[0])) && !isNaN(parseFloat(parts[1]))) {
                // Case where user types x^y directly then hits equals
                 expressionToEvaluate = Math.pow(parseFloat(parts[0]), parseFloat(parts[1])).toString();
            }
            else {
                throw new Error("Invalid power expression");
            }
        }
        
        // Replace "--" with "+" for calculations like "5--2" -> "5+2"
        // Ensure this doesn't mess up negative exponents if not handled by power function above.
        // It should be fine as power is handled first.
        expressionToEvaluate = expressionToEvaluate.replace(/--/g, '+');

        // Check for division by zero before evaluation
        // This regex looks for /0 followed by an operator, end of string, or just /0.
        // It also tries to avoid /0. by using a negative lookahead for a decimal point.
        if (/\/0(?!\.)([+\-*/%]|$)/.test(expressionToEvaluate) || /\/0$/.test(expressionToEvaluate)) {
            // Further check: ensure the '0' is not part of a larger number like '10' or '05'
            // This can be complex. A simpler check is to split by '/' and evaluate the divisor.
            // For now, the regex is a decent first pass.
            const segments = expressionToEvaluate.split('/');
            for (let i = 1; i < segments.length; i++) {
                // Attempt to evaluate the segment before the next operator
                const divisorSegment = segments[i].split(/[+\-*/%^]/)[0];
                if (parseFloat(divisorSegment) === 0) {
                    throw new Error("Division by zero");
                }
            }
        }
        
        // Using Function constructor for basic arithmetic.
        // Ensure expressionToEvaluate is a simple arithmetic string at this point.
        const result = new Function('return ' + expressionToEvaluate)();

        if (isNaN(result) || !isFinite(result)) {
            throw new Error("Error"); // Catches NaN or Infinity
        }
        
        display.value = result;
        addToHistory(originalExpressionForHistory + " = " + result);
        currentExpression = result.toString();
        
    } catch (error) {
        display.value = error.message === "Division by zero" ? "Division by zero" : "Error";
        currentExpression = ''; // Reset expression on error
    }
    
    lastInputIsOperator = false;
    lastInputIsEquals = true;
    baseForPower = null; // Reset power calculation state
}


// Memory Functions
function memoryClear() {
    memoryValue = 0;
    lastInputIsEquals = false; // Allow new input after MC
}

function memoryRecall() {
    currentExpression = memoryValue.toString();
    display.value = currentExpression;
    lastInputIsOperator = false;
    lastInputIsEquals = false; // Allow using MR value in new expressions
}

function memoryAdd() {
    let currentValue = parseFloat(display.value);
    if (!isNaN(currentValue)) {
        memoryValue += currentValue;
    } else if (currentExpression !== '' && !isOperator(currentExpression.slice(-1))) {
        // If display is not a direct number (e.g. after an op), try to calculate currentExpression first
        try {
            const tempResult = new Function('return ' + currentExpression)();
            if(!isNaN(tempResult) && isFinite(tempResult)) {
                memoryValue += tempResult;
            } else {
                display.value = "Error";
            }
        } catch (e) {
            display.value = "Error";
        }
    } else {
        display.value = "Error"; // Cannot add non-numeric or invalid expression to memory
    }
    lastInputIsEquals = true; // Treat M+ like equals for chaining new calculations
}

function memorySubtract() {
    let currentValue = parseFloat(display.value);
    if (!isNaN(currentValue)) {
        memoryValue -= currentValue;
    } else if (currentExpression !== '' && !isOperator(currentExpression.slice(-1))) {
        try {
            const tempResult = new Function('return ' + currentExpression)();
             if(!isNaN(tempResult) && isFinite(tempResult)) {
                memoryValue -= tempResult;
            } else {
                display.value = "Error";
            }
        } catch (e) {
            display.value = "Error";
        }
    } else {
        display.value = "Error";
    }
    lastInputIsEquals = true;
}

// Scientific Operations
function calculateScientific(operation) {
    if (currentExpression === '' && operation !== 'power') { // Power can start an expression with its base
        display.value = "Invalid input";
        return;
    }
    
    let value;
    // Try to evaluate the current expression first if it's complex
    // However, for unary operations like sqrt, sin, it's better to operate on the last number or result
    // For this implementation, we'll assume these operations apply to the current display.value if it's a valid number,
    // or the result of currentExpression.

    let numberToOperateOn;
    try {
        // If currentExpression is a full expression, calculate it first.
        // This is tricky logic. For simplicity, let's assume scientific operations are on the current display value or a number just entered.
        // A more robust way would be to parse the expression or operate on the last number.
        
        // Let's try to parse the current display value as a float.
        // If it's something like "5+2", parseFloat will give "5". We need to be careful.
        // For now, let's make scientific operations work on the *result* of the current display, or the direct number.
        if (isOperator(currentExpression.slice(-1)) && currentExpression.slice(-1) !== '%') {
             display.value = "Invalid input"; return;
        }

        // Evaluate the current expression to a single value before applying scientific function
        // This ensures "2+3" then "sqrt" operates on 5.
        if (currentExpression !== '' && !lastInputIsEquals && !/^[-\d.]+$/.test(currentExpression)) { // if it's not a simple number
             // If it's not a simple number, try to evaluate it.
             // This is a dangerous spot if currentExpression is not complete e.g. "5*"
            if (isOperator(currentExpression.slice(-1))) {
                display.value = "Error"; currentExpression = ''; return;
            }
            numberToOperateOn = new Function('return ' + currentExpression)();
            if (isNaN(numberToOperateOn) || !isFinite(numberToOperateOn)) {
                 display.value = "Error"; currentExpression = ''; return;
            }
        } else {
            numberToOperateOn = parseFloat(currentExpression);
             if (isNaN(numberToOperateOn)) {
                display.value = "Invalid input"; currentExpression = ''; return;
            }
        }

    } catch (e) {
        display.value = "Error";
        currentExpression = '';
        return;
    }


    let result;
    let opPerformed = `${operation}(${numberToOperateOn})`;

    switch (operation) {
        case 'sqrt':
            if (numberToOperateOn < 0) { display.value = "Error"; currentExpression = ''; return; }
            result = Math.sqrt(numberToOperateOn);
            break;
        case 'sin':
            result = Math.sin(numberToOperateOn * Math.PI / 180); // Assuming degrees
            opPerformed = `sin(${numberToOperateOn}°)`;
            break;
        case 'power': 
            // This button is now primarily for initiating x^y. The appendToDisplay handles '^'.
            // If pressed without prior number, it's an error or could be a feature (0^y).
            // We'll assume it follows a number, and appendToDisplay has set baseForPower.
            // If calculateScientific('power') is called directly, it might be after a number,
            // so we set currentExpression to include '^' and let user input exponent.
            if (currentExpression === '' || isOperator(currentExpression.slice(-1))) {
                 display.value = "Invalid input"; currentExpression = ''; return;
            }
            appendToDisplay('^'); // This will set baseForPower and add '^' to display
            return; // Exit because we need exponent input
        default:
            display.value = "Error"; // Unknown operation
            currentExpression = '';
            return;
    }

    if (isNaN(result) || !isFinite(result)) {
        display.value = "Error";
    } else {
        display.value = result;
        addToHistory(opPerformed + " = " + result);
        currentExpression = result.toString();
    }
    lastInputIsOperator = false;
    lastInputIsEquals = true; // Treat as calculation complete
    baseForPower = null;
}


// History Function
function addToHistory(entry) {
    calculationHistory.unshift(entry); // Add to the beginning
    if (calculationHistory.length > MAX_HISTORY_ITEMS) {
        calculationHistory.pop(); // Remove the oldest item
    }
    renderHistory();
}

function renderHistory() {
    if (!historyList) return; // Guard if historyList element isn't found
    historyList.innerHTML = ''; // Clear current list
    calculationHistory.forEach(item => {
        const listItem = document.createElement('li');
        listItem.textContent = item;
        historyList.appendChild(listItem);
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    display = document.getElementById('display');
    historyList = document.getElementById('history-list'); // Initialize historyList here
    clearDisplay();
    renderHistory(); // Initial render (empty)
});
