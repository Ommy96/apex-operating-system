import { useState } from 'react';
import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Cake, PartyPopper } from 'lucide-react';
import { useDonorPortal } from '@/hooks/useDonorPortal';
import { toast } from 'sonner';

export function UpcomingMilestones() {
  const { milestones, sendCorrespondence } = useDonorPortal();
  const [target, setTarget] = useState<any | null>(null);
  const [message, setMessage] = useState('');

  if (!milestones.length) return null;

  const open = (m: any) => {
    setTarget(m);
    setMessage(
      m.kind === 'birthday'
        ? `Happy birthday, ${m.name}! Wishing you a wonderful year ahead.`
        : `Thinking of you, ${m.name} — happy sponsorship anniversary!`,
    );
  };

  const send = () => {
    if (!target || !message.trim()) return;
    sendCorrespondence.mutate(
      {
        beneficiaryId: target.beneficiaryId,
        message: message.trim(),
        kind: target.kind === 'birthday' ? 'birthday_message' : 'anniversary_message',
        subject: target.kind === 'birthday' ? 'Birthday message' : 'Anniversary message',
      },
      {
        onSuccess: () => {
          toast.success('Message sent to the team for delivery');
          setTarget(null);
        },
        onError: (e: any) => toast.error(e?.message || 'Could not send your message'),
      },
    );
  };

  return (
    <>
      <Card className="border-border/50 bg-gradient-to-r from-primary/5 to-accent/5">
        <CardContent className="p-4 sm:p-5 space-y-3">
          <div className="flex items-center gap-2">
            <PartyPopper className="h-4 w-4 text-primary" />
            <h2 className="font-semibold text-foreground text-sm uppercase tracking-wider">
              Upcoming milestones
            </h2>
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
            {milestones.map((m) => (
              <div
                key={`${m.kind}-${m.beneficiaryId}`}
                className="min-w-[240px] rounded-xl border border-border/50 bg-card p-3 flex items-center gap-3"
              >
                <Avatar className="h-10 w-10">
                  {m.photoUrl ? <AvatarImage src={m.photoUrl} alt="" /> : null}
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                    {m.name?.[0]?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{m.name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    {m.kind === 'birthday' ? <Cake className="h-3 w-3" /> : <PartyPopper className="h-3 w-3" />}
                    {m.kind === 'birthday'
                      ? `Turns ${m.turningAge} on ${format(m.date, 'MMM d')}`
                      : `Anniversary ${format(m.date, 'MMM d')}`}
                  </p>
                  <Badge variant="secondary" className="text-[10px] mt-1">
                    {m.daysAway === 0 ? 'Today' : `in ${m.daysAway} day${m.daysAway === 1 ? '' : 's'}`}
                  </Badge>
                </div>
                <Button size="sm" variant="outline" onClick={() => open(m)}>
                  Send
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send a message to {target?.name}</DialogTitle>
            <DialogDescription>
              Your message is passed to the organization's team, who will deliver it in person.
            </DialogDescription>
          </DialogHeader>
          <Textarea rows={5} value={message} onChange={(e) => setMessage(e.target.value)} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setTarget(null)}>Cancel</Button>
            <Button onClick={send} disabled={sendCorrespondence.isPending || !message.trim()}>
              Send message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
