-- Review author avatars: snapshot column + public read for reviewers' profiles.

ALTER TABLE public.product_reviews
  ADD COLUMN IF NOT EXISTS author_avatar_url TEXT;

-- Allow reading avatar_url (and name) for users who have posted reviews.
DROP POLICY IF EXISTS profiles_select_review_authors ON public.profiles;
CREATE POLICY profiles_select_review_authors
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.product_reviews r
      WHERE r.user_id = profiles.id
    )
  );
