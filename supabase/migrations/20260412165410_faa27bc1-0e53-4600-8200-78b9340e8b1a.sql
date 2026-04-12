
-- Comment bank table
CREATE TABLE public.report_comment_bank (
  comment_id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  skill TEXT NOT NULL CHECK (skill IN ('reading', 'speaking')),
  level TEXT NOT NULL CHECK (level IN ('beginner', 'developing', 'strong')),
  comment_type TEXT NOT NULL CHECK (comment_type IN ('strength', 'next_step')),
  comment_text TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.report_comment_bank ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access report_comment_bank"
  ON public.report_comment_bank FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers can view report_comment_bank"
  ON public.report_comment_bank FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'teacher'));

-- Trial reports table
CREATE TABLE public.trial_reports (
  report_id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trial_id UUID NOT NULL REFERENCES public.trial_students(trial_id) ON DELETE CASCADE,
  reading_level TEXT NOT NULL CHECK (reading_level IN ('beginner', 'developing', 'strong')),
  speaking_level TEXT NOT NULL CHECK (speaking_level IN ('beginner', 'developing', 'strong')),
  selected_comments JSONB NOT NULL DEFAULT '[]',
  template_text TEXT,
  ai_polished_text TEXT,
  final_text TEXT NOT NULL,
  generated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.trial_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access trial_reports"
  ON public.trial_reports FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers view own trial reports"
  ON public.trial_reports FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM trial_students ts
    WHERE ts.trial_id = trial_reports.trial_id
    AND ts.teacher_id = get_user_teacher_id(auth.uid())
  ));

CREATE POLICY "Teachers create own trial reports"
  ON public.trial_reports FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM trial_students ts
    WHERE ts.trial_id = trial_reports.trial_id
    AND ts.teacher_id = get_user_teacher_id(auth.uid())
  ));

-- Seed comment bank data
-- READING - BEGINNER - STRENGTHS
INSERT INTO report_comment_bank (skill, level, comment_type, comment_text, display_order) VALUES
('reading', 'beginner', 'strength', 'can recognise some Arabic letters when shown individually', 1),
('reading', 'beginner', 'strength', 'is beginning to connect letters to their sounds', 2),
('reading', 'beginner', 'strength', 'can identify a few familiar words by sight', 3),
('reading', 'beginner', 'strength', 'shows enthusiasm and willingness to try reading tasks', 4),
('reading', 'beginner', 'strength', 'can follow along when text is read aloud', 5);

-- READING - BEGINNER - NEXT STEPS
INSERT INTO report_comment_bank (skill, level, comment_type, comment_text, display_order) VALUES
('reading', 'beginner', 'next_step', 'practise recognising all Arabic letters in different positions', 1),
('reading', 'beginner', 'next_step', 'work on blending letter sounds to form simple words', 2),
('reading', 'beginner', 'next_step', 'build a sight-word vocabulary with daily practice', 3),
('reading', 'beginner', 'next_step', 'read short, illustrated texts with support at home', 4),
('reading', 'beginner', 'next_step', 'focus on letter-sound connections through phonics activities', 5);

-- READING - DEVELOPING - STRENGTHS
INSERT INTO report_comment_bank (skill, level, comment_type, comment_text, display_order) VALUES
('reading', 'developing', 'strength', 'can read simple words and short sentences with some support', 1),
('reading', 'developing', 'strength', 'recognises most Arabic letters and their different forms', 2),
('reading', 'developing', 'strength', 'is beginning to read short passages with growing confidence', 3),
('reading', 'developing', 'strength', 'can understand the main idea of a simple text', 4),
('reading', 'developing', 'strength', 'uses context clues to guess unfamiliar words', 5);

-- READING - DEVELOPING - NEXT STEPS
INSERT INTO report_comment_bank (skill, level, comment_type, comment_text, display_order) VALUES
('reading', 'developing', 'next_step', 'practise reading longer texts to build fluency and stamina', 1),
('reading', 'developing', 'next_step', 'work on reading with correct tashkeel and pronunciation', 2),
('reading', 'developing', 'next_step', 'develop comprehension skills by answering questions about texts', 3),
('reading', 'developing', 'next_step', 'expand vocabulary through regular reading of age-appropriate material', 4),
('reading', 'developing', 'next_step', 'practise reading aloud to improve speed and accuracy', 5);

-- READING - STRONG - STRENGTHS
INSERT INTO report_comment_bank (skill, level, comment_type, comment_text, display_order) VALUES
('reading', 'strong', 'strength', 'reads Arabic text fluently with good pronunciation and tashkeel', 1),
('reading', 'strong', 'strength', 'demonstrates strong comprehension and can retell what was read', 2),
('reading', 'strong', 'strength', 'can read and understand age-appropriate texts independently', 3),
('reading', 'strong', 'strength', 'identifies key details and answers questions about the text accurately', 4),
('reading', 'strong', 'strength', 'shows excellent decoding skills and reads with expression', 5);

-- READING - STRONG - NEXT STEPS
INSERT INTO report_comment_bank (skill, level, comment_type, comment_text, display_order) VALUES
('reading', 'strong', 'next_step', 'challenge themselves with more complex texts and vocabulary', 1),
('reading', 'strong', 'next_step', 'develop analytical reading skills by comparing and contrasting ideas', 2),
('reading', 'strong', 'next_step', 'practise summarising longer passages in their own words', 3),
('reading', 'strong', 'next_step', 'explore different genres of Arabic literature for wider exposure', 4),
('reading', 'strong', 'next_step', 'work on inferencing skills to understand implied meanings', 5);

-- SPEAKING - BEGINNER - STRENGTHS
INSERT INTO report_comment_bank (skill, level, comment_type, comment_text, display_order) VALUES
('speaking', 'beginner', 'strength', 'can respond to simple greetings and basic questions in Arabic', 1),
('speaking', 'beginner', 'strength', 'is beginning to use single words and short phrases to communicate', 2),
('speaking', 'beginner', 'strength', 'shows willingness to participate and try speaking Arabic', 3),
('speaking', 'beginner', 'strength', 'can repeat words and phrases with reasonable pronunciation', 4),
('speaking', 'beginner', 'strength', 'understands simple instructions given in Arabic', 5);

-- SPEAKING - BEGINNER - NEXT STEPS
INSERT INTO report_comment_bank (skill, level, comment_type, comment_text, display_order) VALUES
('speaking', 'beginner', 'next_step', 'practise speaking in short sentences instead of single words', 1),
('speaking', 'beginner', 'next_step', 'build confidence by practising common conversational phrases', 2),
('speaking', 'beginner', 'next_step', 'work on pronunciation of difficult Arabic sounds', 3),
('speaking', 'beginner', 'next_step', 'try to respond in Arabic more often during lessons', 4),
('speaking', 'beginner', 'next_step', 'listen to Arabic at home to improve understanding and vocabulary', 5);

-- SPEAKING - DEVELOPING - STRENGTHS
INSERT INTO report_comment_bank (skill, level, comment_type, comment_text, display_order) VALUES
('speaking', 'developing', 'strength', 'can form simple sentences and express basic ideas in Arabic', 1),
('speaking', 'developing', 'strength', 'responds to questions with short but clear answers', 2),
('speaking', 'developing', 'strength', 'is growing in confidence when speaking during lessons', 3),
('speaking', 'developing', 'strength', 'can describe familiar topics using learned vocabulary', 4),
('speaking', 'developing', 'strength', 'follows and participates in simple conversations', 5);

-- SPEAKING - DEVELOPING - NEXT STEPS
INSERT INTO report_comment_bank (skill, level, comment_type, comment_text, display_order) VALUES
('speaking', 'developing', 'next_step', 'practise forming longer and more detailed sentences', 1),
('speaking', 'developing', 'next_step', 'work on using connectives to link ideas when speaking', 2),
('speaking', 'developing', 'next_step', 'expand vocabulary to express a wider range of topics', 3),
('speaking', 'developing', 'next_step', 'practise initiating conversations, not just responding', 4),
('speaking', 'developing', 'next_step', 'focus on correct grammar when forming sentences', 5);

-- SPEAKING - STRONG - STRENGTHS
INSERT INTO report_comment_bank (skill, level, comment_type, comment_text, display_order) VALUES
('speaking', 'strong', 'strength', 'speaks Arabic confidently with clear pronunciation and fluency', 1),
('speaking', 'strong', 'strength', 'can express ideas and opinions in well-formed sentences', 2),
('speaking', 'strong', 'strength', 'engages actively in conversations and asks thoughtful questions', 3),
('speaking', 'strong', 'strength', 'uses a wide range of vocabulary appropriate to the topic', 4),
('speaking', 'strong', 'strength', 'can narrate events and describe experiences in detail', 5);

-- SPEAKING - STRONG - NEXT STEPS
INSERT INTO report_comment_bank (skill, level, comment_type, comment_text, display_order) VALUES
('speaking', 'strong', 'next_step', 'work on using more sophisticated vocabulary and expressions', 1),
('speaking', 'strong', 'next_step', 'practise presenting ideas formally and structuring arguments', 2),
('speaking', 'strong', 'next_step', 'develop the ability to debate and discuss complex topics', 3),
('speaking', 'strong', 'next_step', 'refine grammar and sentence structure for formal speaking', 4),
('speaking', 'strong', 'next_step', 'explore speaking in different registers and contexts', 5);
