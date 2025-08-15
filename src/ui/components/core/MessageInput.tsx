import { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { getCommandNames } from '../../../commands/index.js';
import SlashCommandSuggestions from '../input-overlays/SlashCommandSuggestions.js';

interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  placeholder?: string;
  userMessageHistory?: string[];
}

export default function MessageInput({ 
  value, 
  onChange, 
  onSubmit, 
  placeholder = "... (Esc to clear, Ctrl+C to exit)",
  userMessageHistory = []
}: MessageInputProps) {
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [draftMessage, setDraftMessage] = useState('');
  const [cursorPosition, setCursorPosition] = useState(value.length);
  
  const isSlashCommand = value.startsWith('/');
  const showSlashCommands = isSlashCommand;

  // Helpers for navigation/deletion boundaries
  const moveToPrevWord = () => {
    let newPos = cursorPosition;
    // Skip any whitespace to the left
    while (newPos > 0 && /\s/.test(value[newPos - 1])) newPos--;
    // Skip non-whitespace to word start
    while (newPos > 0 && !/\s/.test(value[newPos - 1])) newPos--;
    setCursorPosition(newPos);
  };

  const moveToNextWord = () => {
    let newPos = cursorPosition;
    // Skip non-whitespace to end of current word
    while (newPos < value.length && !/\s/.test(value[newPos])) newPos++;
    // Skip whitespace to start of next word
    while (newPos < value.length && /\s/.test(value[newPos])) newPos++;
    setCursorPosition(newPos);
  };

  const moveLineStart = () => {
    const before = value.substring(0, cursorPosition);
    const parts = before.split('\n');
    const currentLineIndex = parts.length - 1;
    const start = parts.slice(0, -1).join('\n').length + (currentLineIndex > 0 ? 1 : 0);
    setCursorPosition(start);
  };

  const moveLineEnd = () => {
    const lines = value.split('\n');
    const before = value.substring(0, cursorPosition);
    const currentLineIndex = before.split('\n').length - 1;
    const lineStart = before.split('\n').slice(0, -1).join('\n').length + (currentLineIndex > 0 ? 1 : 0);
    const end = lineStart + lines[currentLineIndex].length;
    setCursorPosition(end);
  };

  const deleteNextWord = () => {
    let endPos = cursorPosition;
    // Skip any whitespace after cursor
    while (endPos < value.length && /\s/.test(value[endPos])) endPos++;
    // Skip non-whitespace to word end
    while (endPos < value.length && !/\s/.test(value[endPos])) endPos++;
    // Skip any trailing whitespace
    while (endPos < value.length && /\s/.test(value[endPos])) endPos++;
    if (endPos > cursorPosition) {
      const newValue = value.slice(0, cursorPosition) + value.slice(endPos);
      onChange(newValue);
    }
  };

  // Keep cursor position in bounds and reset to end when value is cleared
  useEffect(() => {
    if (value.length === 0) {
      setCursorPosition(0);
      // Clear draft and reset history when input is cleared (after sending message)
      setDraftMessage('');
      setHistoryIndex(-1);
    } else if (cursorPosition > value.length) {
      setCursorPosition(value.length);
    }
  }, [value]);

  useInput((input, key) => {
    // Normalize common Windows/xterm escape sequences first
    // Ctrl+Left: ESC[1;5D or ESC[5D
    if (input === '\u001b[1;5D' || input === '\u001b[5D') {
      moveToPrevWord();
      return;
    }
    // Ctrl+Right: ESC[1;5C or ESC[5C
    if (input === '\u001b[1;5C' || input === '\u001b[5C') {
      moveToNextWord();
      return;
    }
    // Home: ESC[H or ESC[1~ or ESCOH
    if (input === '\u001b[H' || input === '\u001b[1~' || input === '\u001bOH') {
      moveLineStart();
      return;
    }
    // End: ESC[F or ESC[4~ or ESCOF
    if (input === '\u001b[F' || input === '\u001b[4~' || input === '\u001bOF') {
      moveLineEnd();
      return;
    }
    // Ctrl+Delete: ESC[3;5~
    if (input === '\u001b[3;5~') {
      deleteNextWord();
      return;
    }

    if (key.return) {
      // Shift+Enter should add a new line, Enter should send
      if (key.shift) {
        // Add a new line
        const newValue = value.slice(0, cursorPosition) + '\n' + value.slice(cursorPosition);
        onChange(newValue);
        setCursorPosition(prev => prev + 1);
        setSelectedCommandIndex(0);
        setHistoryIndex(-1);
        return;
      }
      
      if (isSlashCommand) {
        // Auto-complete to selected command
        const searchTerm = value.slice(1).toLowerCase();
        const commands = getCommandNames();
        const filteredCommands = commands.filter(cmd => 
          cmd.toLowerCase().includes(searchTerm)
        );
        if (filteredCommands.length > 0) {
          onSubmit('/' + (filteredCommands[selectedCommandIndex] || filteredCommands[0]));
          return;
        }
      }
      onSubmit(value);
      return;
    }

    if (key.upArrow) {
      if (showSlashCommands) {
        setSelectedCommandIndex(prev => Math.max(0, prev - 1));
      } else if (cursorPosition === 0 && userMessageHistory.length > 0) {
        // Store current input as draft when first navigating to history
        if (historyIndex === -1) {
          setDraftMessage(value);
        }
        // Navigate to message history when at 0th position
        const newIndex = Math.min(historyIndex + 1, userMessageHistory.length - 1);
        if (newIndex !== historyIndex) {
          setHistoryIndex(newIndex);
          const historicalMessage = userMessageHistory[userMessageHistory.length - 1 - newIndex];
          onChange(historicalMessage);
          setCursorPosition(historicalMessage.length);
        }
      } else {
        // For multi-line text, move to previous line at same column
        const lines = value.substring(0, cursorPosition).split('\n');
        if (lines.length > 1) {
          // We're not on the first line, move to previous line
          const currentLineIndex = lines.length - 1;
          const currentColumn = lines[currentLineIndex].length;
          const prevLineLength = lines[currentLineIndex - 1].length;
          const newColumn = Math.min(currentColumn, prevLineLength);
          
          // Calculate new cursor position
          let newPosition = cursorPosition - lines[currentLineIndex].length - 1; // -1 for newline
          newPosition = newPosition - (prevLineLength - newColumn);
          setCursorPosition(newPosition);
        } else {
          // Already on first line, move to beginning
          setCursorPosition(0);
        }
      }
      return;
    }

    if (key.downArrow) {
      if (showSlashCommands) {
        const searchTerm = value.slice(1).toLowerCase();
        const commands = getCommandNames();
        const filteredCommands = commands.filter(cmd => 
          cmd.toLowerCase().includes(searchTerm)
        );
        setSelectedCommandIndex(prev => Math.min(filteredCommands.length - 1, prev + 1));
      } else if (cursorPosition === value.length && historyIndex >= 0) {
        // Navigate through message history when at last position
        const newIndex = historyIndex - 1;
        if (newIndex >= 0) {
          setHistoryIndex(newIndex);
          const historicalMessage = userMessageHistory[userMessageHistory.length - 1 - newIndex];
          onChange(historicalMessage);
          setCursorPosition(historicalMessage.length);
        } else {
          // Return to draft message (current input)
          setHistoryIndex(-1);
          onChange(draftMessage);
          setCursorPosition(draftMessage.length);
        }
      } else {
        // For multi-line text, move to next line at same column
        const allLines = value.split('\n');
        const linesBeforeCursor = value.substring(0, cursorPosition).split('\n');
        const currentLineIndex = linesBeforeCursor.length - 1;
        const currentColumn = linesBeforeCursor[currentLineIndex].length;
        
        if (currentLineIndex < allLines.length - 1) {
          // We're not on the last line, move to next line
          const currentLineLength = allLines[currentLineIndex].length;
          const nextLineLength = allLines[currentLineIndex + 1].length;
          const newColumn = Math.min(currentColumn, nextLineLength);
          
          // Calculate new cursor position
          let newPosition = cursorPosition - currentLineLength + newColumn;
          // Add 1 for the newline character we skipped
          newPosition += 1;
          setCursorPosition(newPosition);
        } else {
          // Already on last line, move to end
          setCursorPosition(value.length);
        }
      }
      return;
    }

    if (key.leftArrow) {
      if (key.ctrl) {
        moveToPrevWord();
      } else {
        setCursorPosition(prev => Math.max(0, prev - 1));
      }
      return;
    }

    if (key.rightArrow) {
      if (key.ctrl) {
        moveToNextWord();
      } else {
        setCursorPosition(prev => Math.min(value.length, prev + 1));
      }
      return;
    }


    if (key.ctrl && input === 'k') {
      // Delete from cursor to end of line
      const lines = value.split('\n');
      const currentLineText = value.substring(0, cursorPosition).split('\n');
      const currentLineIndex = currentLineText.length - 1;
      const currentLineStart = currentLineText.slice(0, -1).join('\n').length + (currentLineIndex > 0 ? 1 : 0);
      const currentLine = lines[currentLineIndex];
      const currentColumn = currentLineText[currentLineIndex].length;
      const textToDelete = currentLine.slice(currentColumn);
      
      // Only delete if there's text to delete
      if (textToDelete.length > 0) {
        const newValue = value.slice(0, cursorPosition) + value.slice(cursorPosition + textToDelete.length);
        onChange(newValue);
      }
      return;
    }

    if (key.backspace || key.delete) {
      if (key.ctrl && key.delete) {
        // Ctrl+Delete: Delete next word
        let endPos = cursorPosition;
        // Skip any whitespace after cursor
        while (endPos < value.length && /\s/.test(value[endPos])) {
          endPos++;
        }
        // Skip non-whitespace characters to find word end
        while (endPos < value.length && !/\s/.test(value[endPos])) {
          endPos++;
        }
        // Skip any trailing whitespace after the word
        while (endPos < value.length && /\s/.test(value[endPos])) {
          endPos++;
        }
        const newValue = value.slice(0, cursorPosition) + value.slice(endPos);
        onChange(newValue);
      } else if (key.ctrl && key.backspace) {
        // Ctrl+Backspace: Delete previous word
        let startPos = cursorPosition;
        // Skip any whitespace before cursor
        while (startPos > 0 && /\s/.test(value[startPos - 1])) {
          startPos--;
        }
        // Skip non-whitespace characters to find word start
        while (startPos > 0 && !/\s/.test(value[startPos - 1])) {
          startPos--;
        }
        const newValue = value.slice(0, startPos) + value.slice(cursorPosition);
        onChange(newValue);
        setCursorPosition(startPos);
      } else if (key.delete && cursorPosition < value.length) {
        // Regular Delete: Delete character after cursor
        const newValue = value.slice(0, cursorPosition) + value.slice(cursorPosition + 1);
        onChange(newValue);
      } else if (key.backspace && cursorPosition > 0) {
        // Regular Backspace: Delete character before cursor
        const newValue = value.slice(0, cursorPosition - 1) + value.slice(cursorPosition);
        onChange(newValue);
        setCursorPosition(prev => prev - 1);
      }
      setSelectedCommandIndex(0);
      setHistoryIndex(-1);
      return;
    }

    if (key.ctrl) {
      // Handle Ctrl+C in parent component
      return;
    }

    // Regular character input
    if (input && !key.meta && !key.ctrl) {
      // Handle regular input (convert newlines to spaces for paste operations)
      const processedInput = input.replace(/[\r\n]+/g, ' ');
      const newValue = value.slice(0, cursorPosition) + processedInput + value.slice(cursorPosition);
      onChange(newValue);
      setCursorPosition(prev => prev + processedInput.length);
      setSelectedCommandIndex(0);
      setHistoryIndex(-1);
    }
  });

  const isPlaceholder = !value;

  // Calculate cursor position in multi-line text
  const getCursorPositionInLines = () => {
    if (isPlaceholder) return { line: 0, column: 0 };
    
    const textBeforeCursor = value.substring(0, cursorPosition);
    const lines = textBeforeCursor.split('\n');
    const lineIndex = lines.length - 1;
    const columnIndex = lines[lineIndex].length;
    
    return { line: lineIndex, column: columnIndex };
  };

  const cursorPos = getCursorPositionInLines();

  return (
    <Box flexDirection="column">
      <Box>
        <Text color="cyan" bold>{'>'} </Text>
        <Box flexGrow={1}>
          {isPlaceholder ? (
            <Text color="gray">
              <Text backgroundColor="cyan" color="white"> </Text>
              {placeholder}
            </Text>
          ) : (
            value.split('\n').map((line, lineIndex) => {
              const isCurrentLine = lineIndex === cursorPos.line;
              
              if (!isCurrentLine) {
                // Not the current line, just display it
                return <Text color="gray" key={lineIndex}>{line}</Text>;
              }
              
              // Current line, show cursor
              return (
                <Text color="gray" key={lineIndex}>
                  {line.slice(0, cursorPos.column)}
                  <Text backgroundColor="cyan" color="white">
                    {cursorPos.column < line.length ? line[cursorPos.column] : ' '}
                  </Text>
                  {line.slice(cursorPos.column + 1)}
                </Text>
              );
            })
          )}
        </Box>
      </Box>
      {showSlashCommands && (
        <SlashCommandSuggestions 
          input={value} 
          selectedIndex={selectedCommandIndex}
          onSelect={(command: string) => onSubmit('/' + command)}
        />
      )}
    </Box>
  );
}