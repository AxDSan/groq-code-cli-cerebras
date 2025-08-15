import React, { useEffect, useRef, useMemo } from 'react';
import { Box, Text } from 'ink';
import { ChatMessage } from '../../hooks/useAgent.js';
import ToolHistoryItem from '../display/ToolHistoryItem.js';
import { parseMarkdown, MarkdownElement, parseInlineElements } from '../../../utils/markdown.js';

interface OptimizedMessageHistoryProps {
  messages: ChatMessage[];
  showReasoning?: boolean;
}

// Memoized component for individual messages to prevent unnecessary re-renders
const MemoizedMessage = React.memo(({ 
  message, 
  showReasoning 
}: { 
  message: ChatMessage; 
  showReasoning: boolean;
}) => {
  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const timestamp = formatTimestamp(message.timestamp);
  
  switch (message.role) {
    case 'user':
      return (
        <Box key={message.id} marginBottom={1}>
          <Text color="cyan" bold>{'>'} </Text>
          <Text color="gray">{message.content}</Text>
        </Box>
      );
      
    case 'assistant':
      // Memoize the markdown parsing to prevent re-parsing on every render
      const markdownElements = useMemo(() => parseMarkdown(message.content), [message.content]);
      
      return (
        <Box key={message.id} marginBottom={1} flexDirection="column">
          {/* Render reasoning if present and showReasoning is enabled */}
          {message.reasoning && showReasoning && (
            <Box marginBottom={1}>
              <Text italic dimColor>
                {message.reasoning}
              </Text>
            </Box>
          )}
          {/* Render content only if it exists */}
          {message.content && markdownElements.map((element, index) => {
            switch (element.type) {
              case 'code-block':
                return (
                  <Box key={index} marginY={1} paddingLeft={2}>
                    <Text color="cyan">{element.content}</Text>
                  </Box>
                );
              case 'heading':
                return (
                  <Text key={index} bold color={element.level && element.level <= 2 ? "yellow" : "white"}>
                    {element.content}
                  </Text>
                );
              case 'mixed-line':
                const inlineElements = useMemo(() => parseInlineElements(element.content), [element.content]);
                return (
                  <Text key={index}>
                    {inlineElements.map((inlineElement, inlineIndex) => {
                      switch (inlineElement.type) {
                        case 'code':
                          return <Text key={inlineIndex} color="cyan">{inlineElement.content}</Text>;
                        case 'bold':
                          return <Text key={inlineIndex} bold>{inlineElement.content}</Text>;
                        case 'italic':
                          return <Text key={inlineIndex} italic>{inlineElement.content}</Text>;
                        default:
                          return <Text key={inlineIndex}>{inlineElement.content}</Text>;
                      }
                    })}
                  </Text>
                );
              default:
                return <Text key={index}>{element.content}</Text>;
            }
          })}
        </Box>
      );
      
    case 'system':
      return (
        <Box key={message.id} marginBottom={1}>
          <Text color="yellow" italic>
            {message.content}
          </Text>
        </Box>
      );
      
    case 'tool_execution':
      if (message.toolExecution) {
        return (
          <Box key={message.id} marginBottom={1}>
            <ToolHistoryItem execution={message.toolExecution} />
          </Box>
        );
      }
      return (
        <Box key={message.id} marginBottom={1}>
          <Text color="blue">Tool: {message.content}</Text>
        </Box>
      );
      
    default:
      return (
        <Box key={message.id} marginBottom={1}>
          <Text color="gray" dimColor>
            Unknown: {message.content}
          </Text>
        </Box>
      );
  }
});

export default function OptimizedMessageHistory({ messages, showReasoning = true }: OptimizedMessageHistoryProps) {
  const scrollRef = useRef<any>(null);
  const previousMessageCount = useRef(messages.length);
  const isAutoScrolling = useRef(false);

  // Optimized auto-scroll that only triggers when new messages are added
  useEffect(() => {
    if (scrollRef.current && messages.length > previousMessageCount.current) {
      // Use a small delay to ensure DOM is updated before scrolling
      const timer = setTimeout(() => {
        isAutoScrolling.current = true;
        scrollRef.current.scrollToBottom?.();
        // Reset flag after a short delay to allow manual scrolling
        setTimeout(() => {
          isAutoScrolling.current = false;
        }, 100);
      }, 0);
      
      previousMessageCount.current = messages.length;
      return () => clearTimeout(timer);
    }
  }, [messages.length]);

  // Handle manual scrolling to prevent auto-scroll from overriding user interaction
  useEffect(() => {
    const handleUserScroll = () => {
      if (!isAutoScrolling.current) {
        // User is manually scrolling, so don't auto-scroll until they reach bottom
      }
    };

    const container = scrollRef.current;
    if (container) {
      container.addEventListener('scroll', handleUserScroll);
      return () => container.removeEventListener('scroll', handleUserScroll);
    }
  }, []);

  // Memoize the rendered messages to prevent unnecessary re-renders
  const renderedMessages = useMemo(() => {
    return messages.map(message => (
      <MemoizedMessage 
        key={message.id} 
        message={message} 
        showReasoning={showReasoning} 
      />
    ));
  }, [messages, showReasoning]);

  return (
    <Box ref={scrollRef} flexDirection="column" flexGrow={1}>
      {messages.length === 0 ? (
        <Box justifyContent="center" paddingY={2} flexDirection="column" alignItems="center">
          <Text color="gray" dimColor italic>
            Ask for help with coding tasks, debugging issues, or explaining code.
          </Text>
          <Text color="gray" dimColor italic>
            Type /help for available commands and features.
          </Text>
        </Box>
      ) : (
        renderedMessages
      )}
    </Box>
  );
}