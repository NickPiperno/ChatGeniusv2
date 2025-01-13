# Message Formatting Guide

## Text Formatting

### Active Format Indicators
- Format buttons show active state when cursor is within formatted text
- Active formats are highlighted with a secondary button variant
- Click an active format button to remove that formatting
- Multiple formats can be active simultaneously (e.g., bold and italic)

### Keyboard Shortcuts
- **Bold**: Ctrl/Cmd + B (`**text**`)
- **Italic**: Ctrl/Cmd + I (`*text*`)
- **Underline**: Ctrl/Cmd + U (`__text__`)
- **Link**: Ctrl/Cmd + K (`[text](url)`)

### Using Format Buttons
When using the formatting buttons in the toolbar:

1. **With Selected Text**:
   - Text will be wrapped with appropriate Markdown syntax
   - Example: Selecting "hello" and clicking Bold → `**hello**`
   - Click the active format button to remove formatting

2. **Without Selection**:
   - Placeholder text will be inserted and selected
   - Example: Clicking Bold → `**bold**` (with "bold" selected)
   - Format button remains active while cursor is within formatted text

3. **Toggling Formats**:
   - Click an active format button to remove that formatting
   - Formatting markers are removed while preserving the text
   - Button returns to inactive state
   - Cursor position is maintained after toggling

## List Formatting

### List Types
Lists can be either bulleted or numbered:

- **Bullet Lists**: Items start with `• `
- **Numbered Lists**: Items start with incrementing numbers (`1. `, `2. `, etc.)

### List Button States
- Active list type button is highlighted with secondary variant
- Only one list type can be active at a time
- Click active list button to remove list formatting entirely
- Click inactive list button to convert to that list type

### List Behavior
1. **Starting a List**:
   - Click list button to convert text to list format
   - Empty lines are preserved
   - Each non-empty line gets a marker

2. **Removing List Format**:
   - Click active list button to remove all list markers
   - Text content is preserved
   - Line positions are maintained
   - List state is cleared

3. **Converting Lists**:
   - Click different list button to switch formats
   - Bullet to Number: `• ` → `1. `, `2. `, etc.
   - Number to Bullet: `1. `, `2. ` → `• `
   - Formatting within list items is preserved

### List Navigation
- Press Enter to add new list item
- Double Enter on empty item exits list
- Shift + Enter for line break without new marker

## Message Controls

### Sending Messages
- Press Enter to send (when not in a list)
- Click send button
- Shift + Enter for new line without sending

### Line Breaks
- Use Shift + Enter for manual line break
- Lists automatically handle line breaks
- Empty lines can be added between list items

## Examples

### Mixed Formatting in Lists
```markdown
• **Important** item
• Item with *emphasis*
• Item with [link](url)
• Code sample: `example`

Converting to numbers:
1. **Important** item
2. Item with *emphasis*
3. Item with [link](url)
4. Code sample: `example`

Removing list format:
**Important** item
Item with *emphasis*
Item with [link](url)
Code sample: `example`
```

## Tips
1. Use keyboard shortcuts for faster formatting
2. Watch format buttons for active state indicators
3. Click active buttons to remove formatting
4. Multiple text formats can be active at once
5. Only one list type can be active at a time
6. Double-click list button to remove list format 