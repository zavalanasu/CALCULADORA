// Simple Testing Framework
const testResults = [];
let testsPassed = 0;
let testsFailed = 0;

function describe(description, fn) {
    testResults.push(`<h2>${description}</h2>`);
    fn();
}

function it(description, fn) {
    try {
        fn();
        testResults.push(`<li class="pass">PASS: ${description}</li>`);
        testsPassed++;
    } catch (e) {
        testResults.push(`<li class="fail">FAIL: ${description}<div class="log-details">Error: ${e.message}<br>Stack: ${e.stack ? e.stack.split('\n').slice(1,3).join('<br>') : 'N/A'}</div></li>`);
        testsFailed++;
    }
}

function assertEquals(actual, expected, message = "") {
    if (actual !== expected) {
        throw new Error(`${message} Expected ${expected} but got ${actual}`);
    }
}

function assertAlmostEquals(actual, expected, tolerance = 1e-9, message = "") {
    if (Math.abs(actual - expected) > tolerance) {
        throw new Error(`${message} Expected ${expected} (approx) but got ${actual}`);
    }
}

function assertArrayEquals(actual, expected, message = "") {
    if (actual.length !== expected.length || !actual.every((val, idx) => val === expected[idx])) {
        throw new Error(`${message} Expected [${expected.join(', ')}] but got [${actual.join(', ')}]`);
    }
}

function beforeEach() {
    clearDisplay(); // Clear calculator state before each test
    memoryClear();  // Clear memory state
    calculationHistory = []; // Clear history
    renderHistory(); // Clear history display
}

// Helper function to simulate user input for basic arithmetic and get result
function simulateCalculation(inputSequence) {
    beforeEach(); // Ensure clean state
    for (const item of inputSequence) {
        if (typeof item === 'string' && (isOperator(item) || item === '.' || item === '^')) {
            appendToDisplay(item);
        } else if (typeof item === 'number') {
            appendToDisplay(item.toString());
        } else if (item === '=') {
            calculateResult();
        }
    }
    return display.value;
}

// Helper function to simulate pressing buttons that directly call a function
function simulateButtonPress(buttonFn, arg) {
    beforeEach();
    if (arg !== undefined) buttonFn(arg);
    else buttonFn();
    return display.value;
}


// --- Test Suites ---
document.addEventListener('DOMContentLoaded', () => {
    // Initial setup for tests that need DOM elements not directly managed by script.js
    // (display and historyList are already handled by script.js's own DOMContentLoaded listener)

    describe("Basic Arithmetic", () => {
        it("should add two positive integers", () => {
            assertEquals(simulateCalculation([2, '+', 3, '=']), "5");
        });
        it("should add two positive decimals", () => {
            assertEquals(simulateCalculation([2.5, '+', 3.5, '=']), "6");
        });
        it("should subtract two positive integers", () => {
            assertEquals(simulateCalculation([5, '-', 3, '=']), "2");
        });
        it("should subtract resulting in a negative number", () => {
            assertEquals(simulateCalculation([3, '-', 5, '=']), "-2");
        });
        it("should multiply two positive integers", () => {
            assertEquals(simulateCalculation([2, '*', 3, '=']), "6");
        });
        it("should multiply by zero", () => {
            assertEquals(simulateCalculation([5, '*', 0, '=']), "0");
        });
        it("should divide two positive integers", () => {
            assertEquals(simulateCalculation([6, '/', 2, '=']), "3");
        });
        it("should handle division resulting in a decimal", () => {
            assertEquals(simulateCalculation([5, '/', 2, '=']), "2.5");
        });
        it("should follow order of operations (PEMDAS/BODMAS) e.g. 2 + 3 * 4 = 14", () => {
            assertEquals(simulateCalculation([2, '+', 3, '*', 4, '=']), "14");
        });
        it("should follow order of operations e.g. (2 + 3) * 4 = 20 (implicit from left-to-right or explicit if parens were supported)", () => {
            // Our calculator is simple and evaluates left-to-right for same precedence, or strictly by PEMDAS
            // For 2+3*4, it becomes 2 + (3*4) = 14.
            // For (2+3)*4, this would be 5*4=20. Our current eval doesn't take parens.
            // Let's test a sequence that would show this: 10 - 4 + 2 = 8 (not 10 - (4+2)=4)
            assertEquals(simulateCalculation([10, '-', 4, '+', 2, '=']), "8");
        });
        it("should handle calculations with negative numbers: -5 + 3 = -2", () => {
            assertEquals(simulateCalculation(['-', 5, '+', 3, '=']), "-2");
        });
        it("should handle calculations like 5 * -2 = -10", () => {
            simulateCalculation([5, '*', '-']); // appendToDisplay('-') after '*' should work
            appendToDisplay('2');
            calculateResult();
            assertEquals(display.value, "-10");
        });
        it("should handle multiple operations: 10 / 2 * 5 = 25", () => {
            assertEquals(simulateCalculation([1,0,'/',2,'*',5,'=']), "25");
        });
    });

    describe("Clear Function", () => {
        it("should reset the display when clearDisplay() is called", () => {
            simulateCalculation([1,2,3]);
            clearDisplay();
            assertEquals(display.value, "");
            assertEquals(currentExpression, "");
        });
        it("should reset internal state (currentExpression, lastInputIsOperator, lastInputIsEquals, baseForPower)", () => {
            simulateCalculation([1, '+', 2, '=']); // Sets lastInputIsEquals, currentExpression to result
            simulateCalculation([5, '^']); // Sets baseForPower
            clearDisplay();
            assertEquals(currentExpression, "");
            assertEquals(lastInputIsOperator, false);
            assertEquals(lastInputIsEquals, false);
            assertEquals(baseForPower, null);
        });
    });

    describe("Error Handling", () => {
        it("should display 'Division by zero' for division by zero", () => {
            assertEquals(simulateCalculation([5, '/', 0, '=']), "Division by zero");
        });
        it("should display 'Error' for 0/0", () => {
            // new Function('return 0/0')() results in NaN -> "Error"
            assertEquals(simulateCalculation([0, '/', 0, '=']), "Error");
        });
        it("should display 'Error' for invalid operations like 5 * / 2 (ends with operator)", () => {
             // current logic prevents strict "5*/2", it becomes "5/2" if '*' then '/' is pressed.
             // If we force an invalid end state for calculateResult:
            beforeEach();
            appendToDisplay('5');
            appendToDisplay('*');
            calculateResult(); // Ends with operator
            assertEquals(display.value, "5*"); // No error, just no calculation
            
            // Test for an expression that would cause new Function() to fail, e.g. "5+*3"
            beforeEach();
            currentExpression = "5+*3"; // Manually set invalid expression
            calculateResult();
            assertEquals(display.value, "Error");
        });
        it("should handle operations on an empty display (e.g. pressing '=' early)", () => {
            assertEquals(simulateCalculation(['=']), ""); // Stays empty
        });
        it("should handle pressing an operator first (except minus)", () => {
            assertEquals(simulateCalculation(['*']), ""); // Stays empty
            assertEquals(simulateCalculation(['/']), ""); // Stays empty
            assertEquals(simulateCalculation(['+']), ""); // Stays empty
        });
        it("should allow starting with minus for negative numbers", () => {
            simulateCalculation(['-']);
            assertEquals(display.value, "-");
            appendToDisplay('5');
            assertEquals(display.value, "-5");
        });
        it("sqrt of negative number should be 'Error'", () => {
            simulateCalculation(['-', 9]);
            calculateScientific('sqrt');
            assertEquals(display.value, "Error");
        });
         it("should display 'Error' after incomplete power expression e.g. 5^ then =", () => {
            assertEquals(simulateCalculation([5, '^', '=']), "Invalid input");
        });
    });

    describe("Memory Functions", () => {
        it("MC should clear memoryValue", () => {
            simulateCalculation([5, '=']); // display.value is "5"
            memoryAdd(); // memoryValue = 5
            memoryClear();
            assertEquals(memoryValue, 0);
        });
        it("MR should recall memoryValue to display", () => {
            beforeEach();
            memoryValue = 123; // Set manually for test
            memoryRecall();
            assertEquals(display.value, "123");
        });
        it("M+ should add display.value to memoryValue", () => {
            simulateCalculation([1,0, '=']); // display is "10"
            memoryAdd(); // memoryValue = 10
            assertEquals(memoryValue, 10);
            simulateCalculation([5, '=']); // display is "5"
            memoryAdd(); // memoryValue = 10 + 5 = 15
            assertEquals(memoryValue, 15);
        });
        it("M- should subtract display.value from memoryValue", () => {
            beforeEach();
            memoryValue = 20;
            simulateCalculation([5, '=']); // display is "5"
            memorySubtract(); // memoryValue = 20 - 5 = 15
            assertEquals(memoryValue, 15);
            simulateCalculation([2, '=']); // display is "2"
            memorySubtract(); // memoryValue = 15 - 2 = 13
            assertEquals(memoryValue, 13);
        });
        it("M+ should add result of current expression to memoryValue if display is not a direct number", () => {
            beforeEach();
            memoryValue = 10;
            simulateCalculation([2,'+',3]); // currentExpression = "2+3", display = "2+3"
            memoryAdd(); // memoryValue = 10 + (2+3) = 15
            assertEquals(memoryValue, 15);
        });
         it("M- should subtract result of current expression from memoryValue", () => {
            beforeEach();
            memoryValue = 20;
            simulateCalculation([8,'-',3]); // currentExpression = "8-3", display = "8-3"
            memorySubtract(); // memoryValue = 20 - (8-3) = 15
            assertEquals(memoryValue, 15);
        });
        it("M+ should show Error if current expression is invalid", () => {
            beforeEach();
            memoryValue = 10;
            appendToDisplay('5');
            appendToDisplay('*'); // currentExpression = "5*"
            memoryAdd();
            assertEquals(display.value, "Error");
            assertEquals(memoryValue, 10); // Should not change
        });

    });

    describe("Scientific Operations", () => {
        it("Square root (√) of 9 should be 3", () => {
            simulateCalculation([9]);
            calculateScientific('sqrt');
            assertEquals(display.value, "3");
        });
        it("Square root (√) of 2 should be approx 1.414213562", () => {
            simulateCalculation([2]);
            calculateScientific('sqrt');
            assertAlmostEquals(parseFloat(display.value), Math.sqrt(2));
        });
        it("Square root (√) of a complex expression (e.g. 2+7) should be 3", () => {
            simulateCalculation([2, '+', 7]); // currentExpression = "2+7"
            calculateScientific('sqrt'); // operates on result of "2+7"
            assertEquals(display.value, "3");
        });
        it("Power (x^y) of 2^3 should be 8", () => {
            assertEquals(simulateCalculation([2, '^', 3, '=']), "8");
        });
        it("Power (x^y) of 5^0 should be 1", () => {
            assertEquals(simulateCalculation([5, '^', 0, '=']), "1");
        });
        it("Power (x^y) of 2^-2 should be 0.25", () => {
            assertEquals(simulateCalculation([2, '^', '-', 2, '=']), "0.25");
        });
        it("Power (x^y) of 0.5^2 should be 0.25", () => {
            assertEquals(simulateCalculation([0,'.',5, '^', 2, '=']), "0.25");
        });
        it("Power (x^y) with x^y button: 3, x^y, 4, = should be 81", () => {
            simulateCalculation([3]);
            calculateScientific('power'); // This appends '^'
            appendToDisplay('4');
            calculateResult();
            assertEquals(display.value, "81");
        });
        it("Sine (sin) of 0 degrees should be 0", () => {
            simulateCalculation([0]);
            calculateScientific('sin');
            assertAlmostEquals(parseFloat(display.value), 0);
        });
        it("Sine (sin) of 90 degrees should be 1", () => {
            simulateCalculation([9,0]);
            calculateScientific('sin');
            assertAlmostEquals(parseFloat(display.value), 1);
        });
        it("Sine (sin) of 30 degrees should be 0.5", () => {
            simulateCalculation([3,0]);
            calculateScientific('sin');
            assertAlmostEquals(parseFloat(display.value), 0.5);
        });
    });

    describe("Input Logic", () => {
        it("should append numbers correctly", () => {
            simulateCalculation([1]);
            assertEquals(display.value, "1");
            appendToDisplay('2');
            assertEquals(display.value, "12");
            appendToDisplay('3');
            assertEquals(display.value, "123");
        });
        it("should prevent multiple leading zeros (e.g. 000 -> 0)", () => {
            simulateCalculation([0]);
            assertEquals(display.value, "0");
            appendToDisplay('0');
            assertEquals(display.value, "0");
            appendToDisplay('5');
            assertEquals(display.value, "05"); // Current logic allows this, then "05" becomes 5.
                                             // Let's test if "0" then "5" becomes "5"
            beforeEach();
            appendToDisplay('0');
            appendToDisplay('5');
            assertEquals(currentExpression, "5"); // It should be "5" not "05"
        });
         it("should replace leading zero if a non-zero number is entered", () => {
            beforeEach();
            appendToDisplay('0');
            appendToDisplay('5');
            assertEquals(display.value, "5");
        });
        it("should allow leading zero if followed by decimal", () => {
            beforeEach();
            appendToDisplay('0');
            appendToDisplay('.');
            appendToDisplay('5');
            assertEquals(display.value, "0.5");
        });
        it("should prevent multiple consecutive operators (e.g., ++ becomes +)", () => {
            simulateCalculation([5, '+']);
            appendToDisplay('+');
            assertEquals(display.value, "5+");
            appendToDisplay('*'); // 5+* should become 5*
            assertEquals(display.value, "5*");
        });
        it("should allow operator after minus for negative numbers (e.g. 5 * -2)", () => {
            simulateCalculation([5, '*']);
            appendToDisplay('-'); // For negative
            assertEquals(display.value, "5*-");
            appendToDisplay('2');
            assertEquals(display.value, "5*-2");
        });
        it("should only allow one decimal point per number segment", () => {
            simulateCalculation([1, '.', 2]);
            assertEquals(display.value, "1.2");
            appendToDisplay('.');
            assertEquals(display.value, "1.2"); // Should not change
            appendToDisplay('3');
            assertEquals(display.value, "1.23");
            appendToDisplay('+');
            appendToDisplay('4');
            appendToDisplay('.');
            appendToDisplay('5');
            assertEquals(display.value, "1.23+4.5");
            appendToDisplay('.');
            assertEquals(display.value, "1.23+4.5"); // Should not change
        });
        it("should clear previous result if a new number is entered after '='", () => {
            simulateCalculation([2, '+', 3, '=']); // display is "5"
            assertEquals(lastInputIsEquals, true);
            appendToDisplay('7'); // Start new number
            assertEquals(display.value, "7");
            assertEquals(currentExpression, "7");
            assertEquals(lastInputIsEquals, false);
        });
        it("should use previous result if an operator is entered after '='", () => {
            simulateCalculation([2, '+', 3, '=']); // display is "5"
            appendToDisplay('*');
            assertEquals(display.value, "5*");
            assertEquals(currentExpression, "5*");
        });
        it("should prevent multiple '^' operators", () => {
            simulateCalculation([5, '^']);
            appendToDisplay('^');
            assertEquals(currentExpression, "5^"); // Should not become 5^^
        });
    });

    describe("Calculation History", () => {
        it("should add a basic calculation to history", () => {
            simulateCalculation([2, '+', 3, '=']); // 2+3=5
            assertArrayEquals(calculationHistory, ["2+3 = 5"]);
        });
        it("should add scientific calculation to history (sqrt)", () => {
            beforeEach();
            appendToDisplay('9');
            calculateScientific('sqrt'); // sqrt(9) = 3
            assertArrayEquals(calculationHistory, ["sqrt(9) = 3"]);
        });
        it("should add power calculation to history (x^y)", () => {
            simulateCalculation([2, '^', 3, '=']); // 2^3 = 8
            assertArrayEquals(calculationHistory, ["2^3 = 8"]);
        });
        it("should respect history limit (MAX_HISTORY_ITEMS = 10)", () => {
            beforeEach();
            for (let i = 0; i < MAX_HISTORY_ITEMS + 5; i++) {
                appendToDisplay(i.toString());
                appendToDisplay('+');
                appendToDisplay('1');
                calculateResult(); // i+1 = result
            }
            assertEquals(calculationHistory.length, MAX_HISTORY_ITEMS);
            // Last item added should be at the top (index 0)
            // The oldest item (0+1=1) should be gone.
            // The (MAX_HISTORY_ITEMS+5-1)+1 should be the first entry.
            // e.g. if limit is 3, items are 0+1, 1+1, 2+1, 3+1, 4+1. History: [4+1=5, 3+1=4, 2+1=3]
            const lastCalcIndex = MAX_HISTORY_ITEMS + 5 - 1;
            assertEquals(calculationHistory[0], `${lastCalcIndex}+1 = ${lastCalcIndex+1}`);
            const oldestVisibleCalcIndex = (MAX_HISTORY_ITEMS + 5 - 1) - (MAX_HISTORY_ITEMS - 1);
            assertEquals(calculationHistory[MAX_HISTORY_ITEMS-1], `${oldestVisibleCalcIndex}+1 = ${oldestVisibleCalcIndex+1}`);
        });
        it("history should be empty after clearDisplay then renderHistory (via clearDisplay)", () => {
            simulateCalculation([1, '+', 1, '=']);
            clearDisplay(); // This should clear history array and call render
            renderHistory(); // explicit call to be sure (though clearDisplay should handle it)
            assertEquals(calculationHistory.length, 0);
            const historyUl = document.getElementById('history-list');
            assertEquals(historyUl.children.length, 0);
        });
    });


    // --- Render Results ---
    const resultsList = document.getElementById('results');
    resultsList.innerHTML = testResults.join('');
    const summaryDiv = document.getElementById('summary');
    summaryDiv.textContent = `Tests completed: ${testsPassed + testsFailed} | Passed: ${testsPassed} | Failed: ${testsFailed}`;
    if (testsFailed > 0) {
        summaryDiv.style.color = 'red';
    } else {
        summaryDiv.style.color = 'green';
    }
});
