import { useFormContext } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';

export function BackgroundSection() {
  const form = useFormContext();

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
          Background Story
        </h4>

        <FormField
          control={form.control}
          name="background_narrative"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Background Narrative</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Write a detailed background story about the beneficiary, their family situation, challenges faced, and how they came to be part of the program..."
                  className="min-h-[200px]"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                This narrative helps sponsors and staff understand the beneficiary's story
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="space-y-4">
        <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
          Personal Interests
        </h4>

        <FormField
          control={form.control}
          name="hobbies"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Hobbies & Interests</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., Football, Reading, Drawing, Music"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                List the beneficiary's hobbies and interests
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="future_ambition"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Future Ambition</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., Doctor, Teacher, Engineer"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                What does the beneficiary want to become in the future?
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="religion"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Religion</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., Christian, Muslim, Hindu"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="space-y-4">
        <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
          Profile Image
        </h4>

        <FormField
          control={form.control}
          name="background_image_url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Background Image URL</FormLabel>
              <FormControl>
                <Input
                  placeholder="https://example.com/background-image.jpg"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                A cover or background image for the beneficiary's profile
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
