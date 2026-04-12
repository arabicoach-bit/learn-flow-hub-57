
CREATE TABLE public.lead_comments (
  comment_id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid NOT NULL REFERENCES public.leads(lead_id) ON DELETE CASCADE,
  author_id uuid REFERENCES public.profiles(id),
  comment text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access lead_comments"
  ON public.lead_comments FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_lead_comments_lead_id ON public.lead_comments(lead_id);
