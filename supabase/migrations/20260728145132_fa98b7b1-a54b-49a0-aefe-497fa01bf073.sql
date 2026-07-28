
-- ===== Helpers =====
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ===== Enums =====
CREATE TYPE public.app_role AS ENUM ('super_admin','hr_admin','manager','employee');
CREATE TYPE public.course_status AS ENUM ('draft','published','archived');
CREATE TYPE public.difficulty_level AS ENUM ('beginner','intermediate','advanced');
CREATE TYPE public.lesson_type AS ENUM ('youtube','video','pdf','pptx','text','link');
CREATE TYPE public.assignee_type AS ENUM ('employee','department','role','company');
CREATE TYPE public.question_type AS ENUM ('mcq','tf','multi');
CREATE TYPE public.employment_status AS ENUM ('active','on_leave','terminated');

-- ===== Organizations =====
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#1D7A3E',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_org_updated BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== User Roles (per user, single org in v1) =====
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, organization_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer helpers (avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _org UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND organization_id=_org AND role=_role);
$$;

CREATE OR REPLACE FUNCTION public.current_org_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_hr_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles
    WHERE user_id=auth.uid() AND role IN ('hr_admin','super_admin'));
$$;

CREATE POLICY "own roles readable" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_hr_admin());
CREATE POLICY "hr can manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.is_hr_admin() AND organization_id = public.current_org_id())
  WITH CHECK (public.is_hr_admin() AND organization_id = public.current_org_id());

CREATE POLICY "read own org" ON public.organizations FOR SELECT TO authenticated
  USING (id = public.current_org_id());
CREATE POLICY "hr updates org" ON public.organizations FOR UPDATE TO authenticated
  USING (id = public.current_org_id() AND public.is_hr_admin());

-- ===== Departments =====
CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.departments TO authenticated;
GRANT ALL ON public.departments TO service_role;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_dept_updated BEFORE UPDATE ON public.departments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE POLICY "org reads depts" ON public.departments FOR SELECT TO authenticated USING (organization_id = public.current_org_id());
CREATE POLICY "hr manages depts" ON public.departments FOR ALL TO authenticated
  USING (organization_id = public.current_org_id() AND public.is_hr_admin())
  WITH CHECK (organization_id = public.current_org_id() AND public.is_hr_admin());

-- ===== Employees =====
CREATE TABLE public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  employee_code TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  job_title TEXT,
  manager_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  employment_status public.employment_status NOT NULL DEFAULT 'active',
  date_joined DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE (organization_id, email)
);
CREATE INDEX idx_employees_org ON public.employees(organization_id);
CREATE INDEX idx_employees_user ON public.employees(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employees TO authenticated;
GRANT ALL ON public.employees TO service_role;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_emp_updated BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE POLICY "org reads employees" ON public.employees FOR SELECT TO authenticated USING (organization_id = public.current_org_id());
CREATE POLICY "hr manages employees" ON public.employees FOR ALL TO authenticated
  USING (organization_id = public.current_org_id() AND public.is_hr_admin())
  WITH CHECK (organization_id = public.current_org_id() AND public.is_hr_admin());

-- ===== Courses =====
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  thumbnail_url TEXT,
  duration_minutes INT DEFAULT 0,
  difficulty public.difficulty_level DEFAULT 'beginner',
  status public.course_status NOT NULL DEFAULT 'draft',
  mandatory BOOLEAN NOT NULL DEFAULT false,
  due_date DATE,
  certificate_enabled BOOLEAN NOT NULL DEFAULT true,
  quiz_enabled BOOLEAN NOT NULL DEFAULT false,
  passing_score INT DEFAULT 70,
  min_video_completion_pct INT DEFAULT 90,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_courses_org ON public.courses(organization_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.courses TO authenticated;
GRANT ALL ON public.courses TO service_role;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_courses_updated BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE POLICY "org reads courses" ON public.courses FOR SELECT TO authenticated USING (organization_id = public.current_org_id());
CREATE POLICY "hr manages courses" ON public.courses FOR ALL TO authenticated
  USING (organization_id = public.current_org_id() AND public.is_hr_admin())
  WITH CHECK (organization_id = public.current_org_id() AND public.is_hr_admin());

-- ===== Course Lessons =====
CREATE TABLE public.course_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  order_index INT NOT NULL DEFAULT 0,
  type public.lesson_type NOT NULL,
  title TEXT NOT NULL,
  content_url TEXT,
  youtube_video_id TEXT,
  text_body TEXT,
  min_watch_pct INT DEFAULT 90,
  duration_seconds INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_lessons_course ON public.course_lessons(course_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_lessons TO authenticated;
GRANT ALL ON public.course_lessons TO service_role;
ALTER TABLE public.course_lessons ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_lessons_updated BEFORE UPDATE ON public.course_lessons FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE POLICY "org reads lessons" ON public.course_lessons FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.courses c WHERE c.id=course_id AND c.organization_id=public.current_org_id()));
CREATE POLICY "hr manages lessons" ON public.course_lessons FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.courses c WHERE c.id=course_id AND c.organization_id=public.current_org_id()) AND public.is_hr_admin())
  WITH CHECK (EXISTS (SELECT 1 FROM public.courses c WHERE c.id=course_id AND c.organization_id=public.current_org_id()) AND public.is_hr_admin());

-- ===== Lesson Progress =====
CREATE TABLE public.lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.course_lessons(id) ON DELETE CASCADE,
  current_position INT DEFAULT 0,
  highest_position INT DEFAULT 0,
  total_watch_time INT DEFAULT 0,
  completion_pct INT DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  paused_at TIMESTAMPTZ,
  last_position INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (employee_id, lesson_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_progress TO authenticated;
GRANT ALL ON public.lesson_progress TO service_role;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_lp_updated BEFORE UPDATE ON public.lesson_progress FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE POLICY "employee reads own progress" ON public.lesson_progress FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.employees e WHERE e.id=employee_id AND (e.user_id=auth.uid() OR public.is_hr_admin()) AND e.organization_id=public.current_org_id()));
CREATE POLICY "employee writes own progress" ON public.lesson_progress FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.employees e WHERE e.id=employee_id AND e.user_id=auth.uid() AND e.organization_id=public.current_org_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.employees e WHERE e.id=employee_id AND e.user_id=auth.uid() AND e.organization_id=public.current_org_id()));

-- ===== Course Assignments =====
CREATE TABLE public.course_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  assignee_type public.assignee_type NOT NULL,
  assignee_id UUID,
  due_date DATE,
  reminder_frequency TEXT,
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_assign_org ON public.course_assignments(organization_id);
CREATE INDEX idx_assign_course ON public.course_assignments(course_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_assignments TO authenticated;
GRANT ALL ON public.course_assignments TO service_role;
ALTER TABLE public.course_assignments ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_assign_updated BEFORE UPDATE ON public.course_assignments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE POLICY "org reads assignments" ON public.course_assignments FOR SELECT TO authenticated USING (organization_id = public.current_org_id());
CREATE POLICY "hr manages assignments" ON public.course_assignments FOR ALL TO authenticated
  USING (organization_id = public.current_org_id() AND public.is_hr_admin())
  WITH CHECK (organization_id = public.current_org_id() AND public.is_hr_admin());

-- ===== Quizzes =====
CREATE TABLE public.quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  time_limit_seconds INT,
  max_attempts INT DEFAULT 3,
  pass_mark INT DEFAULT 70,
  random_order BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quizzes TO authenticated;
GRANT ALL ON public.quizzes TO service_role;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_quiz_updated BEFORE UPDATE ON public.quizzes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE POLICY "org reads quizzes" ON public.quizzes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.courses c WHERE c.id=course_id AND c.organization_id=public.current_org_id()));
CREATE POLICY "hr manages quizzes" ON public.quizzes FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.courses c WHERE c.id=course_id AND c.organization_id=public.current_org_id()) AND public.is_hr_admin())
  WITH CHECK (EXISTS (SELECT 1 FROM public.courses c WHERE c.id=course_id AND c.organization_id=public.current_org_id()) AND public.is_hr_admin());

-- ===== Quiz Questions =====
CREATE TABLE public.quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  order_index INT NOT NULL DEFAULT 0,
  type public.question_type NOT NULL,
  prompt TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_questions TO authenticated;
GRANT ALL ON public.quiz_questions TO service_role;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org reads questions" ON public.quiz_questions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.quizzes q JOIN public.courses c ON c.id=q.course_id WHERE q.id=quiz_id AND c.organization_id=public.current_org_id()));
CREATE POLICY "hr manages questions" ON public.quiz_questions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.quizzes q JOIN public.courses c ON c.id=q.course_id WHERE q.id=quiz_id AND c.organization_id=public.current_org_id()) AND public.is_hr_admin())
  WITH CHECK (EXISTS (SELECT 1 FROM public.quizzes q JOIN public.courses c ON c.id=q.course_id WHERE q.id=quiz_id AND c.organization_id=public.current_org_id()) AND public.is_hr_admin());

-- ===== Quiz Answers =====
CREATE TABLE public.quiz_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_answers TO authenticated;
GRANT ALL ON public.quiz_answers TO service_role;
ALTER TABLE public.quiz_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hr manages answers" ON public.quiz_answers FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.quiz_questions qq JOIN public.quizzes q ON q.id=qq.quiz_id JOIN public.courses c ON c.id=q.course_id WHERE qq.id=question_id AND c.organization_id=public.current_org_id()) AND public.is_hr_admin())
  WITH CHECK (EXISTS (SELECT 1 FROM public.quiz_questions qq JOIN public.quizzes q ON q.id=qq.quiz_id JOIN public.courses c ON c.id=q.course_id WHERE qq.id=question_id AND c.organization_id=public.current_org_id()) AND public.is_hr_admin());
-- (No SELECT for employees so is_correct is not exposed; server fns will grade.)

-- ===== Quiz Attempts =====
CREATE TABLE public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  score INT,
  passed BOOLEAN,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at TIMESTAMPTZ,
  answers_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_attempts TO authenticated;
GRANT ALL ON public.quiz_attempts TO service_role;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own attempts" ON public.quiz_attempts FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.employees e WHERE e.id=employee_id AND (e.user_id=auth.uid() OR public.is_hr_admin()) AND e.organization_id=public.current_org_id()));
CREATE POLICY "insert own attempts" ON public.quiz_attempts FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.employees e WHERE e.id=employee_id AND e.user_id=auth.uid() AND e.organization_id=public.current_org_id()));

-- ===== Certificates =====
CREATE TABLE public.certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  certificate_number TEXT NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  pdf_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (certificate_number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.certificates TO authenticated;
GRANT ALL ON public.certificates TO service_role;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own certificates" ON public.certificates FOR SELECT TO authenticated
  USING (organization_id = public.current_org_id() AND (public.is_hr_admin() OR EXISTS (SELECT 1 FROM public.employees e WHERE e.id=employee_id AND e.user_id=auth.uid())));
CREATE POLICY "hr writes certificates" ON public.certificates FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.current_org_id() AND public.is_hr_admin());

-- ===== Notifications =====
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notif_user ON public.notifications(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- ===== Activity Logs =====
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.activity_logs TO authenticated;
GRANT ALL ON public.activity_logs TO service_role;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hr reads logs" ON public.activity_logs FOR SELECT TO authenticated
  USING (organization_id = public.current_org_id() AND public.is_hr_admin());
CREATE POLICY "user inserts own log" ON public.activity_logs FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.current_org_id() AND (user_id = auth.uid() OR user_id IS NULL));

-- ===== Handle new user: create org + hr_admin role + employee record =====
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_org_id UUID;
  v_org_name TEXT;
  v_first TEXT;
  v_last TEXT;
BEGIN
  v_org_name := COALESCE(NEW.raw_user_meta_data->>'organization_name', 'My Organization');
  v_first := COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(NEW.email, '@', 1));
  v_last  := COALESCE(NEW.raw_user_meta_data->>'last_name', '');

  INSERT INTO public.organizations (name) VALUES (v_org_name) RETURNING id INTO v_org_id;
  INSERT INTO public.user_roles (user_id, organization_id, role) VALUES (NEW.id, v_org_id, 'hr_admin');
  INSERT INTO public.employees (organization_id, user_id, first_name, last_name, email, employment_status, date_joined)
    VALUES (v_org_id, NEW.id, v_first, v_last, NEW.email, 'active', CURRENT_DATE);
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
