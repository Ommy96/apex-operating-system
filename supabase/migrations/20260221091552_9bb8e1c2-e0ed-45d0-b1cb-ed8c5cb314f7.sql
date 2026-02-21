
-- ============================================
-- ADVANCED M&E SUITE - DATABASE SCHEMA
-- ============================================

-- 1. LOGICAL FRAMEWORK (LOGFRAME)
-- ============================================

CREATE TABLE public.logframes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  program_id UUID REFERENCES public.programs(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','completed','archived')),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.logframe_levels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  logframe_id UUID NOT NULL REFERENCES public.logframes(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.logframe_levels(id) ON DELETE CASCADE,
  level_type TEXT NOT NULL CHECK (level_type IN ('goal','outcome','output','activity')),
  title TEXT NOT NULL,
  description TEXT,
  narrative TEXT,
  assumptions TEXT,
  risks TEXT,
  means_of_verification TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Link indicators to logframe levels
CREATE TABLE public.logframe_indicators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  logframe_level_id UUID NOT NULL REFERENCES public.logframe_levels(id) ON DELETE CASCADE,
  indicator_id UUID REFERENCES public.indicators(id) ON DELETE SET NULL,
  custom_indicator_name TEXT,
  target_value NUMERIC(15,2),
  actual_value NUMERIC(15,2) DEFAULT 0,
  unit TEXT,
  reporting_frequency TEXT DEFAULT 'quarterly',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. THEORY OF CHANGE
-- ============================================

CREATE TABLE public.theory_of_change (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  program_id UUID REFERENCES public.programs(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  narrative TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','archived')),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.toc_nodes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  toc_id UUID NOT NULL REFERENCES public.theory_of_change(id) ON DELETE CASCADE,
  node_type TEXT NOT NULL CHECK (node_type IN ('activity','output','outcome','impact','assumption','risk')),
  title TEXT NOT NULL,
  description TEXT,
  position_x NUMERIC DEFAULT 0,
  position_y NUMERIC DEFAULT 0,
  color TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.toc_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  toc_id UUID NOT NULL REFERENCES public.theory_of_change(id) ON DELETE CASCADE,
  source_node_id UUID NOT NULL REFERENCES public.toc_nodes(id) ON DELETE CASCADE,
  target_node_id UUID NOT NULL REFERENCES public.toc_nodes(id) ON DELETE CASCADE,
  label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Link indicators to ToC nodes
CREATE TABLE public.toc_node_indicators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  toc_node_id UUID NOT NULL REFERENCES public.toc_nodes(id) ON DELETE CASCADE,
  indicator_id UUID REFERENCES public.indicators(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. BASELINE & ENDLINE SURVEY SYSTEM
-- ============================================

CREATE TABLE public.surveys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  program_id UUID REFERENCES public.programs(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  survey_type TEXT NOT NULL CHECK (survey_type IN ('baseline','endline','midterm','custom')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','closed','archived')),
  start_date DATE,
  end_date DATE,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.survey_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  survey_id UUID NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('text','number','single_choice','multiple_choice','rating','date','yes_no','scale')),
  options JSONB DEFAULT '[]'::jsonb,
  is_required BOOLEAN DEFAULT false,
  section TEXT,
  sort_order INTEGER DEFAULT 0,
  linked_indicator_id UUID REFERENCES public.indicators(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.survey_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  survey_id UUID NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  beneficiary_id UUID REFERENCES public.beneficiaries(id) ON DELETE SET NULL,
  respondent_name TEXT,
  submitted_by UUID,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.survey_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  response_id UUID NOT NULL REFERENCES public.survey_responses(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.survey_questions(id) ON DELETE CASCADE,
  answer_text TEXT,
  answer_number NUMERIC,
  answer_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. BENEFICIARY RISK & PROGRESS TRACKING
-- ============================================

CREATE TABLE public.beneficiary_risk_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  beneficiary_id UUID NOT NULL REFERENCES public.beneficiaries(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  assessment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  vulnerability_index NUMERIC(5,2) DEFAULT 0,
  dropout_risk_score NUMERIC(5,2) DEFAULT 0,
  engagement_score NUMERIC(5,2) DEFAULT 0,
  academic_trend_score NUMERIC(5,2) DEFAULT 0,
  followup_compliance_score NUMERIC(5,2) DEFAULT 0,
  overall_risk_level TEXT DEFAULT 'low' CHECK (overall_risk_level IN ('low','medium','high','critical')),
  risk_flags JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  assessed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.beneficiary_progress_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  beneficiary_id UUID NOT NULL REFERENCES public.beneficiaries(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  category TEXT NOT NULL CHECK (category IN ('academic','health','social','economic','behavioral','general')),
  title TEXT NOT NULL,
  description TEXT,
  progress_value NUMERIC(5,2),
  previous_value NUMERIC(5,2),
  logged_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_logframes_org ON public.logframes(organization_id);
CREATE INDEX idx_logframes_program ON public.logframes(program_id);
CREATE INDEX idx_logframe_levels_logframe ON public.logframe_levels(logframe_id);
CREATE INDEX idx_logframe_levels_parent ON public.logframe_levels(parent_id);
CREATE INDEX idx_logframe_indicators_level ON public.logframe_indicators(logframe_level_id);

CREATE INDEX idx_toc_org ON public.theory_of_change(organization_id);
CREATE INDEX idx_toc_nodes_toc ON public.toc_nodes(toc_id);
CREATE INDEX idx_toc_connections_toc ON public.toc_connections(toc_id);

CREATE INDEX idx_surveys_org ON public.surveys(organization_id);
CREATE INDEX idx_survey_questions_survey ON public.survey_questions(survey_id);
CREATE INDEX idx_survey_responses_survey ON public.survey_responses(survey_id);
CREATE INDEX idx_survey_responses_beneficiary ON public.survey_responses(beneficiary_id);
CREATE INDEX idx_survey_answers_response ON public.survey_answers(response_id);

CREATE INDEX idx_risk_scores_beneficiary ON public.beneficiary_risk_scores(beneficiary_id);
CREATE INDEX idx_risk_scores_org ON public.beneficiary_risk_scores(organization_id);
CREATE INDEX idx_risk_scores_level ON public.beneficiary_risk_scores(overall_risk_level);
CREATE INDEX idx_progress_logs_beneficiary ON public.beneficiary_progress_logs(beneficiary_id);
CREATE INDEX idx_progress_logs_org ON public.beneficiary_progress_logs(organization_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.logframes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logframe_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logframe_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.theory_of_change ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.toc_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.toc_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.toc_node_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beneficiary_risk_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beneficiary_progress_logs ENABLE ROW LEVEL SECURITY;

-- Logframes policies
CREATE POLICY "Users can view logframes in their org" ON public.logframes
  FOR SELECT USING (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "Users can create logframes in their org" ON public.logframes
  FOR INSERT WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "Users can update logframes in their org" ON public.logframes
  FOR UPDATE USING (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "Users can delete logframes in their org" ON public.logframes
  FOR DELETE USING (public.user_belongs_to_org(auth.uid(), organization_id));

-- Logframe levels - access via parent logframe
CREATE POLICY "Users can view logframe levels" ON public.logframe_levels
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.logframes lf WHERE lf.id = logframe_id
    AND public.user_belongs_to_org(auth.uid(), lf.organization_id)
  ));
CREATE POLICY "Users can manage logframe levels" ON public.logframe_levels
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.logframes lf WHERE lf.id = logframe_id
    AND public.user_belongs_to_org(auth.uid(), lf.organization_id)
  ));

-- Logframe indicators - access via parent level
CREATE POLICY "Users can view logframe indicators" ON public.logframe_indicators
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.logframe_levels ll
    JOIN public.logframes lf ON lf.id = ll.logframe_id
    WHERE ll.id = logframe_level_id
    AND public.user_belongs_to_org(auth.uid(), lf.organization_id)
  ));
CREATE POLICY "Users can manage logframe indicators" ON public.logframe_indicators
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.logframe_levels ll
    JOIN public.logframes lf ON lf.id = ll.logframe_id
    WHERE ll.id = logframe_level_id
    AND public.user_belongs_to_org(auth.uid(), lf.organization_id)
  ));

-- Theory of Change policies
CREATE POLICY "Users can view ToC in their org" ON public.theory_of_change
  FOR SELECT USING (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "Users can create ToC in their org" ON public.theory_of_change
  FOR INSERT WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "Users can update ToC in their org" ON public.theory_of_change
  FOR UPDATE USING (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "Users can delete ToC in their org" ON public.theory_of_change
  FOR DELETE USING (public.user_belongs_to_org(auth.uid(), organization_id));

-- ToC nodes - access via parent ToC
CREATE POLICY "Users can view ToC nodes" ON public.toc_nodes
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.theory_of_change toc WHERE toc.id = toc_id
    AND public.user_belongs_to_org(auth.uid(), toc.organization_id)
  ));
CREATE POLICY "Users can manage ToC nodes" ON public.toc_nodes
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.theory_of_change toc WHERE toc.id = toc_id
    AND public.user_belongs_to_org(auth.uid(), toc.organization_id)
  ));

-- ToC connections
CREATE POLICY "Users can view ToC connections" ON public.toc_connections
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.theory_of_change toc WHERE toc.id = toc_id
    AND public.user_belongs_to_org(auth.uid(), toc.organization_id)
  ));
CREATE POLICY "Users can manage ToC connections" ON public.toc_connections
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.theory_of_change toc WHERE toc.id = toc_id
    AND public.user_belongs_to_org(auth.uid(), toc.organization_id)
  ));

-- ToC node indicators
CREATE POLICY "Users can view ToC node indicators" ON public.toc_node_indicators
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.toc_nodes tn
    JOIN public.theory_of_change toc ON toc.id = tn.toc_id
    WHERE tn.id = toc_node_id
    AND public.user_belongs_to_org(auth.uid(), toc.organization_id)
  ));
CREATE POLICY "Users can manage ToC node indicators" ON public.toc_node_indicators
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.toc_nodes tn
    JOIN public.theory_of_change toc ON toc.id = tn.toc_id
    WHERE tn.id = toc_node_id
    AND public.user_belongs_to_org(auth.uid(), toc.organization_id)
  ));

-- Surveys policies
CREATE POLICY "Users can view surveys in their org" ON public.surveys
  FOR SELECT USING (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "Users can create surveys in their org" ON public.surveys
  FOR INSERT WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "Users can update surveys in their org" ON public.surveys
  FOR UPDATE USING (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "Users can delete surveys in their org" ON public.surveys
  FOR DELETE USING (public.user_belongs_to_org(auth.uid(), organization_id));

-- Survey questions
CREATE POLICY "Users can view survey questions" ON public.survey_questions
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.surveys s WHERE s.id = survey_id
    AND public.user_belongs_to_org(auth.uid(), s.organization_id)
  ));
CREATE POLICY "Users can manage survey questions" ON public.survey_questions
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.surveys s WHERE s.id = survey_id
    AND public.user_belongs_to_org(auth.uid(), s.organization_id)
  ));

-- Survey responses
CREATE POLICY "Users can view survey responses" ON public.survey_responses
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.surveys s WHERE s.id = survey_id
    AND public.user_belongs_to_org(auth.uid(), s.organization_id)
  ));
CREATE POLICY "Users can manage survey responses" ON public.survey_responses
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.surveys s WHERE s.id = survey_id
    AND public.user_belongs_to_org(auth.uid(), s.organization_id)
  ));

-- Survey answers
CREATE POLICY "Users can view survey answers" ON public.survey_answers
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.survey_responses sr
    JOIN public.surveys s ON s.id = sr.survey_id
    WHERE sr.id = response_id
    AND public.user_belongs_to_org(auth.uid(), s.organization_id)
  ));
CREATE POLICY "Users can manage survey answers" ON public.survey_answers
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.survey_responses sr
    JOIN public.surveys s ON s.id = sr.survey_id
    WHERE sr.id = response_id
    AND public.user_belongs_to_org(auth.uid(), s.organization_id)
  ));

-- Risk scores policies
CREATE POLICY "Users can view risk scores in their org" ON public.beneficiary_risk_scores
  FOR SELECT USING (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "Users can create risk scores in their org" ON public.beneficiary_risk_scores
  FOR INSERT WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "Users can update risk scores in their org" ON public.beneficiary_risk_scores
  FOR UPDATE USING (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "Users can delete risk scores in their org" ON public.beneficiary_risk_scores
  FOR DELETE USING (public.user_belongs_to_org(auth.uid(), organization_id));

-- Progress logs policies
CREATE POLICY "Users can view progress logs in their org" ON public.beneficiary_progress_logs
  FOR SELECT USING (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "Users can create progress logs in their org" ON public.beneficiary_progress_logs
  FOR INSERT WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "Users can update progress logs in their org" ON public.beneficiary_progress_logs
  FOR UPDATE USING (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "Users can delete progress logs in their org" ON public.beneficiary_progress_logs
  FOR DELETE USING (public.user_belongs_to_org(auth.uid(), organization_id));

-- Updated_at triggers
CREATE TRIGGER update_logframes_updated_at BEFORE UPDATE ON public.logframes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_logframe_levels_updated_at BEFORE UPDATE ON public.logframe_levels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_logframe_indicators_updated_at BEFORE UPDATE ON public.logframe_indicators
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_toc_updated_at BEFORE UPDATE ON public.theory_of_change
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_toc_nodes_updated_at BEFORE UPDATE ON public.toc_nodes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_surveys_updated_at BEFORE UPDATE ON public.surveys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_survey_questions_updated_at BEFORE UPDATE ON public.survey_questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_risk_scores_updated_at BEFORE UPDATE ON public.beneficiary_risk_scores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
