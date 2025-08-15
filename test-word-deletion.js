// Test script for word deletion functionality
const testWordDeletion = () => {
  console.log('Testing word deletion functionality...');
  
  // This would normally be tested in the actual UI component
  // But we can at least verify the logic here
  
  const testText = "This is a sample text for testing";
  const cursorPosition = 10; // After "This is a "
  
  console.log('Original text:', JSON.stringify(testText));
  console.log('Cursor position:', cursorPosition);
  console.log('Text at cursor:', JSON.stringify(testText.slice(cursorPosition)));
  
  // Test forward word deletion (Ctrl+Delete)
  let endPos = cursorPosition;
  // Skip any whitespace after cursor
  while (endPos < testText.length && /\s/.test(testText[endPos])) {
    endPos++;
  }
  // Skip non-whitespace characters to find word end
  while (endPos < testText.length && !/\s/.test(testText[endPos])) {
    endPos++;
  }
  // Skip any trailing whitespace after the word
  while (endPos < testText.length && /\s/.test(testText[endPos])) {
    endPos++;
  }
  
  const forwardResult = testText.slice(0, cursorPosition) + testText.slice(endPos);
  console.log('After Ctrl+Delete:', JSON.stringify(forwardResult));
  console.log('Deleted text:', JSON.stringify(testText.slice(cursorPosition, endPos)));
  
  // Test backward word deletion (Ctrl+Backspace)
  let startPos = cursorPosition;
  // Skip any whitespace before cursor
  while (startPos > 0 && /\s/.test(testText[startPos - 1])) {
    startPos--;
  }
  // Skip non-whitespace characters to find word start
  while (startPos > 0 && !/\s/.test(testText[startPos - 1])) {
    startPos--;
  }
  
  const backwardResult = testText.slice(0, startPos) + testText.slice(cursorPosition);
  console.log('After Ctrl+Backspace:', JSON.stringify(backwardResult));
  console.log('Deleted text:', JSON.stringify(testText.slice(startPos, cursorPosition)));
};

testWordDeletion();