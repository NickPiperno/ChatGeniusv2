# Emoji Reactions

## Behavior
- Users can only have one emoji reaction per message
- Clicking a new emoji will remove the user's previous reaction and add the new one
- Clicking the same emoji again will remove the reaction
- Only reactions with a count greater than 0 are displayed
- Multiple users can react with different emojis, which are displayed horizontally

## Implementation Details

### Message Reactions
- Reactions are stored in the message object with the following structure:
```typescript
reactions: {
  [emoji: string]: {
    count: number,
    users: string[] // Array of user IDs who reacted with this emoji
  }
}
```

### Handling Reactions
The reaction logic follows these steps:
1. Check if the user has a previous reaction
2. If clicking the same emoji:
   - Remove the reaction
3. If clicking a different emoji:
   - Remove the previous reaction
   - Add the new reaction
4. Hide reactions when their count reaches 0

### UI Components
- Emoji picker appears next to the three-dot menu
- Active reactions are displayed horizontally below the message
- Each reaction shows the emoji and its count
- User's active reaction is highlighted with a background color 