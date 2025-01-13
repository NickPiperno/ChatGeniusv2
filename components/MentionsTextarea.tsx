import { MentionsInput, Mention, SuggestionDataItem } from 'react-mentions'
import { cn } from '@/lib/utils'

interface User extends SuggestionDataItem {
  imageUrl?: string
}

interface MentionsTextareaProps {
  value: string
  onChange: (event: { target: { value: string } }) => void
  onKeyDown: (event: React.KeyboardEvent) => void
  placeholder?: string
  users: User[]
  className?: string
}

export function MentionsTextarea({
  value,
  onChange,
  onKeyDown,
  placeholder,
  users,
  className
}: MentionsTextareaProps) {
  return (
    <div className="relative w-full">
      <MentionsInput
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className={cn("mentions", className)}
        style={{
          control: {
            fontFamily: 'inherit',
            fontSize: '0.875rem',
            fontWeight: 'normal',
          },
          input: {
            margin: 0,
            overflow: 'auto',
            height: '80px',
          },
          highlighter: {
            boxSizing: 'border-box',
            overflow: 'hidden',
            height: '80px',
          },
          suggestions: {
            position: 'absolute',
            bottom: '100%',
            left: 0,
            right: 0,
            marginBottom: '8px',
          }
        }}
        forceSuggestionsAboveCursor={true}
      >
        <Mention
          trigger="@"
          data={users}
          renderSuggestion={(suggestion: User, search, highlightedDisplay, index, focused) => (
            <div
              className={cn(
                'flex items-center gap-2 px-3 py-2 transition-colors duration-150',
                focused ? 'bg-gray-100' : 'hover:bg-gray-50'
              )}
            >
              {suggestion.imageUrl && (
                <img
                  src={suggestion.imageUrl}
                  alt={suggestion.display}
                  className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                />
              )}
              <span className="truncate">{highlightedDisplay}</span>
            </div>
          )}
          displayTransform={(id, display) => `@${display}`}
          appendSpaceOnAdd={true}
        />
      </MentionsInput>
    </div>
  )
} 