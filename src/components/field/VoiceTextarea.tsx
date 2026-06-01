import { useCallback } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Mic, MicOff } from 'lucide-react';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { cn } from '@/lib/utils';

interface Props extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string;
  onValueChange: (v: string) => void;
}

/**
 * Textarea with a "tap to dictate" button. Falls back to plain textarea when
 * the browser SpeechRecognition API is unavailable.
 */
export function VoiceTextarea({ value, onValueChange, className, ...rest }: Props) {
  const handle = useCallback((chunk: string) => {
    onValueChange((value ? value + ' ' : '') + chunk);
  }, [onValueChange, value]);

  const { supported, listening, start, stop } = useVoiceInput(handle);

  return (
    <div className="relative">
      <Textarea
        {...rest}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        className={cn('pr-12', className)}
      />
      {supported && (
        <Button
          type="button"
          size="icon"
          variant={listening ? 'default' : 'outline'}
          onClick={listening ? stop : start}
          className={cn(
            'absolute right-2 top-2 h-8 w-8 rounded-full',
            listening && 'animate-pulse'
          )}
          aria-label={listening ? 'Stop dictation' : 'Start dictation'}
        >
          {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </Button>
      )}
    </div>
  );
}