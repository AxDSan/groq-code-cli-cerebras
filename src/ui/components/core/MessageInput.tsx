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
  // Buffer for ESC (ANSI) sequences since some terminals split them
  const [escBuffer, setEscBuffer] = useState('');
  
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
    // Minimal CSI/SS3 parser to handle variable-length escape sequences and modifiers
    const parseAndHandleCSI = (buf: string): { consumed: number } => {
      // CSI sequences start with ESC [
      if (!(buf.startsWith('\u001b['))) return { consumed: 0 };
      // Find the final byte (ASCII 0x40-0x7E). Common finals: ~ A B C D H F
      // We accumulate until we see one.
      for (let i = 2; i < buf.length; i++) {
        const ch = buf[i];
        const code = ch.charCodeAt(0);
        if (code >= 0x40 && code <= 0x7e) {
          const full = buf.slice(0, i + 1);
          // Example forms:
          // ESC [ C            -> Right
          // ESC [ 1 ; 5 D     -> Ctrl+Left (D)
          // ESC [ 3 ~         -> Delete
          // ESC [ 3 ; 5 ~     -> Ctrl+Delete
          const body = full.slice(2, -1); // between '[' and final
          const final = full.slice(-1);
          const parts = body.length ? body.split(';') : [];
          const nums = parts.map(p => parseInt(p, 10)).filter(n => !Number.isNaN(n));
          const modifier = nums.length >= 2 ? nums[1] : (nums.length === 1 && (final === 'C' || final === 'D' || final === 'H' || final === 'F') ? 1 : 0);
          const isCtrl = modifier === 5; // 5 = Ctrl, 3 = Alt, 2 = Shift
          const isAlt = modifier === 3;

          switch (final) {
            case 'C': // Right
              if (isCtrl || isAlt) moveToNextWord(); else setCursorPosition(prev => Math.min(value.length, prev + 1));
              break;
            case 'D': // Left
              if (isCtrl || isAlt) moveToPrevWord(); else setCursorPosition(prev => Math.max(0, prev - 1));
              break;
            case 'H': // Home
              moveLineStart();
              break;
            case 'F': // End
              moveLineEnd();
              break;
            case '~': {
              // Tilde-coded sequences, first param indicates key
              const keycode = nums[0];
              if (keycode === 3) { // Delete
                if (modifier === 5) {
                  // Ctrl+Delete
                  deleteNextWord();
                } else if (cursorPosition < value.length) {
                  const newValue = value.slice(0, cursorPosition) + value.slice(cursorPosition + 1);
                  onChange(newValue);
                }
              } else if (keycode === 1 || keycode === 7) {
                // Home variants
                moveLineStart();
              } else if (keycode === 4 || keycode === 8) {
                // End variants
                moveLineEnd();
              }
              break;
            }
          }
          return { consumed: full.length };
        }
      }
      // Not complete yet
      return { consumed: 0 };
    };

    const parseAndHandleSS3 = (buf: string): { consumed: number } => {
      // SS3 sequences start with ESC O (often Home/End)
      if (!(buf.startsWith('\u001bO'))) return { consumed: 0 };
      if (buf.length < 3) return { consumed: 0 };
      const final = buf[2];
      if (final === 'H') moveLineStart();
      else if (final === 'F') moveLineEnd();
      else return { consumed: 0 };
      return { consumed: 3 };
    };

    // Process escape buffer + new input as a stream
    let stream = escBuffer + input;
    let consumedTotal = 0;
    while (stream.startsWith('\u001b')) {
      // Try SS3 first
      const ss3 = parseAndHandleSS3(stream);
      if (ss3.consumed > 0) {
        stream = stream.slice(ss3.consumed);
        consumedTotal += ss3.consumed;
        continue;
      }
      // Then CSI
      const csi = parseAndHandleCSI(stream);
      if (csi.consumed > 0) {
        stream = stream.slice(csi.consumed);
        consumedTotal += csi.consumed;
        continue;
      }
      // Wait for more bytes for an incomplete ESC sequence
      break;
    }

    // Whatever remains that starts with ESC but incomplete, keep buffered
    const firstEsc = stream.indexOf('\u001b');
    if (firstEsc === 0) {
      // Entire remaining stream is partial ESC sequence
      setEscBuffer(stream);
      // Also, process any leading non-ESC portion we consumed earlier (none here)
      if (consumedTotal > 0) return;
    } else {
      // No leading ESC; store any trailing ESC fragment only
      if (firstEsc > 0) {
        const before = stream.slice(0, firstEsc);
        stream = stream.slice(firstEsc);
        setEscBuffer(stream);
        // Process 'before' as normal text below
        input = before; // reassign to process as plain characters
      } else {
        // No ESC at all leftover
        setEscBuffer('');
      }
    }
    // Helper: consume known escape sequences from a buffer
    const tryHandleEscSeq = (buf: string): { handled: boolean; remainder: string } => {
      // Map of exact sequences to handlers
      const seqMap: Record<string, () => void> = {
        // Ctrl+Left variants
        '\u001b[1;5D': moveToPrevWord,
        '\u001b[5D': moveToPrevWord,
        // Ctrl+Right variants
        '\u001b[1;5C': moveToNextWord,
        '\u001b[5C': moveToNextWord,
        // Home variants
        '\u001b[H': moveLineStart,
        '\u001b[1~': moveLineStart,
        '\u001b[7~': moveLineStart,
        '\u001bOH': moveLineStart,
        // End variants
        '\u001b[F': moveLineEnd,
        '\u001b[4~': moveLineEnd,
        '\u001b[8~': moveLineEnd,
        '\u001bOF': moveLineEnd,
        // Ctrl+Home/End (treat as Home/End navigation)
        '\u001b[1;5H': moveLineStart,
        '\u001b[1;5F': moveLineEnd,
        // Delete variants
        '\u001b[3~': () => {
          if (cursorPosition < value.length) {
            const newValue = value.slice(0, cursorPosition) + value.slice(cursorPosition + 1);
            onChange(newValue);
          }
        },
        // Ctrl+Delete
        '\u001b[3;5~': () => deleteNextWord()
      };

      // If we have an exact match
      if (seqMap[buf]) {
        seqMap[buf]();
        return { handled: true, remainder: '' };
      }

      // If current buffer is a prefix of any known sequence, wait for more input
      const isPrefix = Object.keys(seqMap).some(seq => seq.startsWith(buf));
      if (isPrefix) return { handled: false, remainder: buf };

      // Not a known sequence or prefix; drop it
      return { handled: false, remainder: '' };
    };

    // First, accumulate and parse escape sequences robustly
    if (input.includes('\u001b')) {
      const parts = input.split('\u001b');
      // The first part may be plain text (before an ESC)
      const leading = parts.shift()!;
      if (leading) {
        // Process any leading regular chars immediately
        const processedInput = leading.replace(/[\r\n]+/g, ' ');
        if (processedInput && !key.meta && !key.ctrl) {
          const newValue = value.slice(0, cursorPosition) + processedInput + value.slice(cursorPosition);
          onChange(newValue);
          setCursorPosition(prev => prev + processedInput.length);
          setSelectedCommandIndex(0);
          setHistoryIndex(-1);
        }
      }

      // Now handle each ESC-prefixed segment
      let buffer = escBuffer;
      for (const seg of parts) {
        buffer += '\u001b' + seg;
        const res = tryHandleEscSeq(buffer);
        if (res.handled) {
          buffer = '';
        } else {
          buffer = res.remainder;
        }
      }
      setEscBuffer(buffer);
      // We already consumed this input event
      return;
    }
    // If we have a pending escape buffer, try to resolve it with this input
    if (escBuffer) {
      const res = ((): { handled: boolean; remainder: string } => {
        // Try to see if appending current input finalizes any known sequence
        const combined = escBuffer + input;
        // Reuse same logic as above
        const seqs = [
          '\u001b[1;5D','\u001b[5D','\u001b[1;5C','\u001b[5C',
          '\u001b[H','\u001b[1~','\u001b[7~','\u001bOH',
          '\u001b[F','\u001b[4~','\u001b[8~','\u001bOF',
          '\u001b[1;5H','\u001b[1;5F','\u001b[3~','\u001b[3;5~'
        ];
        if (seqs.some(s => s === combined)) return { handled: true, remainder: '' };
        if (seqs.some(s => s.startsWith(combined))) return { handled: false, remainder: combined };
        return { handled: false, remainder: '' };
      })();
      if (res.handled) {
        // Force re-run by simulating that buffer contained a full sequence
        const full = escBuffer + input;
        setEscBuffer('');
        // Manually invoke handling path by calling useInput body again would be improper;
        // Instead, set buffer and return; next keystroke isn't guaranteed. So do a minimal direct handle:
        switch (full) {
          case '\u001b[1;5D':
          case '\u001b[5D':
            moveToPrevWord();
            break;
          case '\u001b[1;5C':
          case '\u001b[5C':
            moveToNextWord();
            break;
          case '\u001b[H':
          case '\u001b[1~':
          case '\u001b[7~':
          case '\u001bOH':
          case '\u001b[1;5H':
            moveLineStart();
            break;
          case '\u001b[F':
          case '\u001b[4~':
          case '\u001b[8~':
          case '\u001bOF':
          case '\u001b[1;5F':
            moveLineEnd();
            break;
          case '\u001b[3~':
            if (cursorPosition < value.length) {
              const newValue = value.slice(0, cursorPosition) + value.slice(cursorPosition + 1);
              onChange(newValue);
            }
            break;
          case '\u001b[3;5~':
            deleteNextWord();
            break;
        }
        return;
      }
      // If still a possible prefix, keep buffering and return
      if (res.remainder) {
        setEscBuffer(res.remainder);
        return;
      }
      // Otherwise clear buffer and continue processing
      setEscBuffer('');
    }
    // If we still have raw known sequences (rare), handle direct matches and Meta-b/f
    // Alt+f / Alt+b are sent as ESC f / ESC b by some terminals for word navigation
    if (input === '\u001bf') {
      moveToNextWord();
      return;
    }
    if (input === '\u001bb') {
      moveToPrevWord();
      return;
    }

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

    // Also try to support Home/End via potential runtime key flags (untyped)
    const anyKey = key as any;
    if (anyKey.home) {
      moveLineStart();
      return;
    }
    if (anyKey.end) {
      moveLineEnd();
      return;
    }

    // Treat Backspace with Ctrl or Alt as delete-previous-word (for terminals that don't emit distinct codes)
    if ((key.backspace && (key.ctrl || key.meta))) {
      let startPos = cursorPosition;
      while (startPos > 0 && /\s/.test(value[startPos - 1])) startPos--;
      while (startPos > 0 && !/\s/.test(value[startPos - 1])) startPos--;
      const newValue = value.slice(0, startPos) + value.slice(cursorPosition);
      onChange(newValue);
      setCursorPosition(startPos);
      setSelectedCommandIndex(0);
      setHistoryIndex(-1);
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

    // Ctrl+Backspace often sends ASCII 0x17 (Ctrl+W). Treat that as delete previous word.
    if (input === '\u0017') {
      // Delete previous word
      let startPos = cursorPosition;
      while (startPos > 0 && /\s/.test(value[startPos - 1])) startPos--;
      while (startPos > 0 && !/\s/.test(value[startPos - 1])) startPos--;
      const newValue = value.slice(0, startPos) + value.slice(cursorPosition);
      onChange(newValue);
      setCursorPosition(startPos);
      setSelectedCommandIndex(0);
      setHistoryIndex(-1);
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
      {isPlaceholder ? (
        <Box>
          <Text color="cyan" bold>{'>'} </Text>
          <Text color="gray">
            <Text backgroundColor="cyan" color="white"> </Text>
            {placeholder}
          </Text>
        </Box>
      ) : (
        // Render each line on its own row with a continuation marker
        value.split('\n').map((line, lineIndex) => {
          const isCurrentLine = lineIndex === cursorPos.line;
          return (
            <Box key={lineIndex}>
              <Text color={lineIndex === 0 ? 'cyan' : 'gray'} bold={lineIndex === 0}>
                {lineIndex === 0 ? '>' : '…'}
              </Text>
              <Text> </Text>
              {isCurrentLine ? (
                <Text color="gray">
                  {line.slice(0, cursorPos.column)}
                  <Text backgroundColor="cyan" color="white">
                    {cursorPos.column < line.length ? line[cursorPos.column] : ' '}
                  </Text>
                  {line.slice(cursorPos.column + 1)}
                </Text>
              ) : (
                <Text color="gray">{line}</Text>
              )}
            </Box>
          );
        })
      )}

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