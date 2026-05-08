
-- ===== Helper: updated_at trigger function =====
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ===== Roles enum =====
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- ===== profiles =====
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles viewable by everyone"
  ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users insert own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== user_roles =====
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- security definer function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users view own roles"
  ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins view all roles"
  ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage roles"
  ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ===== Auto profile + default role on signup =====
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===== surveys =====
CREATE TABLE public.surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages own surveys"
  ON public.surveys FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Published surveys viewable by all"
  ON public.surveys FOR SELECT USING (is_published = true);
CREATE POLICY "Admins view all surveys"
  ON public.surveys FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage all surveys"
  ON public.surveys FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_surveys_updated_at
  BEFORE UPDATE ON public.surveys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== questions =====
CREATE TABLE public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('multiple_choice','text','rating')),
  label TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_questions_survey ON public.questions(survey_id);

CREATE POLICY "Owner manages own questions"
  ON public.questions FOR ALL
  USING (EXISTS (SELECT 1 FROM public.surveys s WHERE s.id = survey_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.surveys s WHERE s.id = survey_id AND s.owner_id = auth.uid()));
CREATE POLICY "Questions of published surveys viewable"
  ON public.questions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.surveys s WHERE s.id = survey_id AND s.is_published = true));
CREATE POLICY "Admins view all questions"
  ON public.questions FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- ===== responses =====
CREATE TABLE public.responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  respondent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_responses_survey ON public.responses(survey_id);

CREATE POLICY "Anyone can submit response to published survey"
  ON public.responses FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.surveys s WHERE s.id = survey_id AND s.is_published = true));
CREATE POLICY "Survey owner views responses"
  ON public.responses FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.surveys s WHERE s.id = survey_id AND s.owner_id = auth.uid()));
CREATE POLICY "Admins view all responses"
  ON public.responses FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- ===== answers =====
CREATE TABLE public.answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id UUID NOT NULL REFERENCES public.responses(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_answers_response ON public.answers(response_id);
CREATE INDEX idx_answers_question ON public.answers(question_id);

CREATE POLICY "Anyone can insert answer for published survey response"
  ON public.answers FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.responses r
    JOIN public.surveys s ON s.id = r.survey_id
    WHERE r.id = response_id AND s.is_published = true
  ));
CREATE POLICY "Survey owner views answers"
  ON public.answers FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.responses r
    JOIN public.surveys s ON s.id = r.survey_id
    WHERE r.id = response_id AND s.owner_id = auth.uid()
  ));
CREATE POLICY "Admins view all answers"
  ON public.answers FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
