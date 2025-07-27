import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: Date | null;
  blockedUntil: Date | null;
}

export class RateLimitManager {
  static async checkRateLimit(
    actionType: string, 
    maxAttempts: number = 5, 
    windowMinutes: number = 60
  ): Promise<RateLimitResult> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        throw new Error('User not authenticated');
      }

      // Call the rate limiting function
      const { data, error } = await supabase.rpc('check_rate_limit', {
        user_id_param: user.user.id,
        action_type_param: actionType,
        max_attempts: maxAttempts,
        window_minutes: windowMinutes
      });

      if (error) {
        console.error('Rate limit check error:', error);
        // If rate limit check fails, allow the action but log the error
        return {
          allowed: true,
          remaining: maxAttempts,
          resetTime: null,
          blockedUntil: null
        };
      }

      // Get current rate limit status
      const { data: rateLimitRecord } = await supabase
        .from('rate_limits')
        .select('*')
        .eq('user_id', user.user.id)
        .eq('action_type', actionType)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const remaining = rateLimitRecord 
        ? Math.max(0, maxAttempts - rateLimitRecord.attempt_count)
        : maxAttempts;

      const blockedUntil = rateLimitRecord?.blocked_until 
        ? new Date(rateLimitRecord.blocked_until)
        : null;

      const resetTime = rateLimitRecord?.window_start
        ? new Date(new Date(rateLimitRecord.window_start).getTime() + windowMinutes * 60 * 1000)
        : null;

      return {
        allowed: data,
        remaining,
        resetTime,
        blockedUntil
      };
    } catch (error) {
      console.error('Rate limit manager error:', error);
      // Default to allowing the action if rate limiting fails
      return {
        allowed: true,
        remaining: maxAttempts,
        resetTime: null,
        blockedUntil: null
      };
    }
  }

  static handleRateLimitExceeded(result: RateLimitResult) {
    if (result.blockedUntil) {
      const blockedFor = Math.ceil((result.blockedUntil.getTime() - Date.now()) / (1000 * 60));
      toast({
        title: "Rate Limit Exceeded",
        description: `You have exceeded the maximum number of role changes. Please wait ${blockedFor} minutes before trying again.`,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Too Many Attempts",
        description: `You have ${result.remaining} attempts remaining in this time window.`,
        variant: "destructive",
      });
    }
  }

  static displayRemainingAttempts(result: RateLimitResult) {
    if (result.remaining <= 2 && result.remaining > 0) {
      toast({
        title: "Rate Limit Warning",
        description: `You have ${result.remaining} role change attempts remaining.`,
        variant: "default",
      });
    }
  }
}