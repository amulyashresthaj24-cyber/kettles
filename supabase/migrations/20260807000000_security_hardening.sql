-- Security hardening: lock down SECURITY DEFINER functions and tighten RLS.

-- 1) handle_new_user: pin search_path (prevents search_path hijack via SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, data)
    VALUES (
        NEW.id,
        jsonb_build_object(
            'email', NEW.email,
            'name', COALESCE(NEW.raw_user_meta_data->>'name', NEW.email)
        )
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- 2) Ensure record_report_share_view keeps a pinned search_path (already set in prior migration;
--    re-assert execute grants so PUBLIC cannot call it).
REVOKE ALL ON FUNCTION public.record_report_share_view(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_report_share_view(UUID, TEXT) TO service_role;

-- 3) RLS policies: add explicit WITH CHECK on older FOR ALL policies
DROP POLICY IF EXISTS "Users can CRUD own clients" ON clients;
CREATE POLICY "Users can CRUD own clients" ON clients
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can CRUD own projects" ON projects;
CREATE POLICY "Users can CRUD own projects" ON projects
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can CRUD own tasks" ON tasks;
CREATE POLICY "Users can CRUD own tasks" ON tasks
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can CRUD own sessions" ON sessions;
CREATE POLICY "Users can CRUD own sessions" ON sessions
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own data" ON users;
CREATE POLICY "Users can update own data" ON users
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- 4) FK integrity: tasks.project_id must belong to the same user (when set)
CREATE OR REPLACE FUNCTION public.enforce_task_project_ownership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.project_id IS NULL THEN
        RETURN NEW;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = NEW.project_id AND p.user_id = NEW.user_id
    ) THEN
        RAISE EXCEPTION 'project_id does not belong to user';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_task_project_ownership ON tasks;
CREATE TRIGGER trg_task_project_ownership
    BEFORE INSERT OR UPDATE OF project_id, user_id ON tasks
    FOR EACH ROW EXECUTE FUNCTION public.enforce_task_project_ownership();

-- 5) projects.client_id must belong to the same user (when set)
CREATE OR REPLACE FUNCTION public.enforce_project_client_ownership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.client_id IS NULL THEN
        RETURN NEW;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.clients c
        WHERE c.id = NEW.client_id AND c.user_id = NEW.user_id
    ) THEN
        RAISE EXCEPTION 'client_id does not belong to user';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_project_client_ownership ON projects;
CREATE TRIGGER trg_project_client_ownership
    BEFORE INSERT OR UPDATE OF client_id, user_id ON projects
    FOR EACH ROW EXECUTE FUNCTION public.enforce_project_client_ownership();

-- 6) sessions.task_id / project_id must belong to the same user (when set)
CREATE OR REPLACE FUNCTION public.enforce_session_fk_ownership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.task_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.tasks t
        WHERE t.id = NEW.task_id AND t.user_id = NEW.user_id
    ) THEN
        RAISE EXCEPTION 'task_id does not belong to user';
    END IF;
    IF NEW.project_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = NEW.project_id AND p.user_id = NEW.user_id
    ) THEN
        RAISE EXCEPTION 'project_id does not belong to user';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_session_fk_ownership ON sessions;
CREATE TRIGGER trg_session_fk_ownership
    BEFORE INSERT OR UPDATE OF task_id, project_id, user_id ON sessions
    FOR EACH ROW EXECUTE FUNCTION public.enforce_session_fk_ownership();
