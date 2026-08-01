
-- Add screenshots array column for multiple images per slide
ALTER TABLE public.tutorial_slides
ADD COLUMN screenshots jsonb DEFAULT '[]'::jsonb;

-- Migrate existing screenshot_url into the new array
UPDATE public.tutorial_slides
SET screenshots = jsonb_build_array(jsonb_build_object('url', screenshot_url, 'width', 100))
WHERE screenshot_url IS NOT NULL;
