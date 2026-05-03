"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useApp } from "@/lib/store-supabase";
import { getSupabaseClient } from "@/lib/supabase";
import {
  ChevronRight,
  ChevronLeft,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { BrandMark } from "@/components/BrandMark";

type Step = "profile" | "project" | "task" | "preference" | "complete";

interface OnboardingData {
  fullName: string;
  avatarUrl?: string;
  projectName: string;
  clientName?: string;
  taskTitle: string;
  focusDuration: number;
}

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { addProject, addTask } = useApp();
  const supabase = getSupabaseClient();

  const [step, setStep] = useState<Step>("profile");
  const [data, setData] = useState<OnboardingData>({
    fullName: user?.user_metadata?.name || "",
    projectName: "",
    clientName: "",
    taskTitle: "",
    focusDuration: 25,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth");
    }
  }, [user, loading, router]);

  // Check if onboarding is already completed
  useEffect(() => {
    const checkOnboarding = async () => {
      if (!user) return;
      try {
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("onboarding_completed")
          .eq("user_id", user.id)
          .single();

        if (profile?.onboarding_completed) {
          router.replace("/dashboard");
        }
      } catch (err) {
        // Profile might not exist yet, that's okay
        console.log("Profile check:", err);
      }
    };

    checkOnboarding();
  }, [user, supabase, router]);

  const validateStep = (): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case "profile":
        if (!data.fullName.trim()) {
          newErrors.fullName = "Name is required";
        }
        break;
      case "project":
        if (!data.projectName.trim()) {
          newErrors.projectName = "Project name is required";
        }
        break;
      case "task":
        if (!data.taskTitle.trim()) {
          newErrors.taskTitle = "Task title is required";
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = async () => {
    if (!validateStep()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      if (step === "profile") {
        // Save profile data
        const { error: profileError } = await supabase
          .from("user_profiles")
          .upsert({
            user_id: user?.id,
            full_name: data.fullName,
            avatar_url: data.avatarUrl,
            updated_at: new Date().toISOString(),
          });

        if (profileError) throw profileError;
        setStep("project");
      } else if (step === "project") {
        setStep("task");
      } else if (step === "task") {
        setStep("preference");
      } else if (step === "preference") {
        // Save all data and mark onboarding as complete
        await saveOnboarding();
        setStep("complete");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveOnboarding = async () => {
    try {
      // Create project
      const project = await addProject({
        name: data.projectName,
        description: "",
        clientId: undefined,
        color: "indigo",
        billable: false,
      });

      // Create task
      await addTask({
        title: data.taskTitle,
        projectId: project.id,
        urgency: "normal",
        description: "",
      });

      // Save preference and mark onboarding complete
      const { error: profileError } = await supabase
        .from("user_profiles")
        .upsert({
          user_id: user?.id,
          full_name: data.fullName,
          avatar_url: data.avatarUrl,
          default_focus_duration: data.focusDuration,
          onboarding_completed: true,
          onboarding_completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (profileError) throw profileError;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save onboarding");
      throw err;
    }
  };

  const handleBack = () => {
    const steps: Step[] = ["profile", "project", "task", "preference"];
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
      setError(null);
    }
  };

  const handleComplete = () => {
    router.replace("/dashboard");
  };

  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-base">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-base">
      {/* Left decorative panel - Desktop only */}
      <div className="relative hidden w-[40%] overflow-hidden lg:flex lg:flex-col lg:items-center lg:justify-center">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,var(--card-gradient-start)_0%,var(--card-gradient-mid)_50%,var(--card-gradient-end)_100%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(59,130,246,0.15),transparent_40%)]" />

        <div className="relative z-10 space-y-4xl px-4xl py-5xl">
          <div className="flex items-center gap-lg">
            <BrandMark size="lg" />
          </div>

          <div className="space-y-2xl">
            <h1 className="max-w-[380px] font-sans text-[48px] font-semibold leading-[1.1] tracking-[-0.02em] text-text-primary">
              Get ready to focus
            </h1>
            <p className="max-w-[380px] font-sans text-[18px] leading-[1.5] text-text-muted">
              We&apos;ll set up your workspace so you can start tracking time immediately.
            </p>
          </div>

          <div className="space-y-lg pt-2xl">
            {[
              { num: 1, title: "Set your profile", active: step === "profile" },
              { num: 2, title: "Create your first project", active: step === "project" },
              { num: 3, title: "Add your first task", active: step === "task" },
              { num: 4, title: "Choose your pace", active: step === "preference" },
              { num: 5, title: "Start tracking", active: step === "complete" },
            ].map((item) => (
              <div
                key={item.num}
                className={`flex items-center gap-md transition-colors ${
                  item.active
                    ? "text-text-primary"
                    : "text-text-muted"
                }`}
              >
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full font-sans text-[13px] font-semibold ${
                    item.active
                      ? "bg-accent text-text-primary"
                      : "border border-text-muted text-text-muted"
                  }`}
                >
                  {item.num}
                </div>
                <span className="font-sans text-[15px]">{item.title}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <main className="relative flex w-full flex-col items-center justify-center overflow-y-auto lg:w-[60%]">
        <div className="w-full max-w-[480px] px-lg py-4xl sm:px-2xl">
          {/* Mobile header */}
          <div className="mb-4xl flex items-center gap-md lg:hidden">
            <BrandMark size="md" />
          </div>

          {/* Step 1: Profile */}
          {step === "profile" && (
            <div className="space-y-3xl">
              <div className="space-y-xs">
                <h2 className="font-sans text-[32px] font-semibold leading-[1.2] text-text-primary">
                  What&apos;s your name?
                </h2>
                <p className="font-sans text-[15px] leading-[1.5] text-text-muted">
                  Set up your Kettles profile.
                </p>
              </div>

              <div className="space-y-lg">
                <div className="space-y-sm">
                  <label htmlFor="fullName" className="font-sans text-[13px] font-medium text-text-secondary">
                    Your name
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    value={data.fullName}
                    onChange={(e) => {
                      setData({ ...data, fullName: e.target.value });
                      setErrors({ ...errors, fullName: "" });
                    }}
                    placeholder="John Doe"
                    disabled={isSubmitting}
                    className={`h-12 w-full rounded-lg border px-md font-sans text-[15px] text-text-primary transition-colors placeholder:text-text-faint focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent)_20%,transparent)] disabled:opacity-50 ${
                      errors.fullName
                        ? "border-status-error bg-[color-mix(in_srgb,var(--error)_5%,transparent)] focus:border-status-error"
                        : "border-[color-mix(in_srgb,var(--accent)_10%,var(--border-subtle))] bg-surface-mid focus:border-accent"
                    }`}
                  />
                  {errors.fullName && (
                    <p className="font-sans text-[12px] text-status-error">{errors.fullName}</p>
                  )}
                </div>

                {error && (
                  <div className="flex gap-md rounded-lg border border-[color-mix(in_srgb,var(--error)_25%,transparent)] bg-[color-mix(in_srgb,var(--error)_8%,transparent)] px-lg py-md">
                    <AlertCircle className="h-5 w-5 shrink-0 text-status-error" />
                    <p className="font-sans text-[13px] text-status-error">{error}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Project */}
          {step === "project" && (
            <div className="space-y-3xl">
              <div className="space-y-xs">
                <h2 className="font-sans text-[32px] font-semibold leading-[1.2] text-text-primary">
                  Create your first project
                </h2>
                <p className="font-sans text-[15px] leading-[1.5] text-text-muted">
                  Organize your time around real work.
                </p>
              </div>

              <div className="space-y-lg">
                <div className="space-y-sm">
                  <label htmlFor="projectName" className="font-sans text-[13px] font-medium text-text-secondary">
                    Project name
                  </label>
                  <input
                    id="projectName"
                    type="text"
                    value={data.projectName}
                    onChange={(e) => {
                      setData({ ...data, projectName: e.target.value });
                      setErrors({ ...errors, projectName: "" });
                    }}
                    placeholder="My Project"
                    disabled={isSubmitting}
                    className={`h-12 w-full rounded-lg border px-md font-sans text-[15px] text-text-primary transition-colors placeholder:text-text-faint focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent)_20%,transparent)] disabled:opacity-50 ${
                      errors.projectName
                        ? "border-status-error bg-[color-mix(in_srgb,var(--error)_5%,transparent)] focus:border-status-error"
                        : "border-[color-mix(in_srgb,var(--accent)_10%,var(--border-subtle))] bg-surface-mid focus:border-accent"
                    }`}
                  />
                  {errors.projectName && (
                    <p className="font-sans text-[12px] text-status-error">{errors.projectName}</p>
                  )}
                </div>

                {error && (
                  <div className="flex gap-md rounded-lg border border-[color-mix(in_srgb,var(--error)_25%,transparent)] bg-[color-mix(in_srgb,var(--error)_8%,transparent)] px-lg py-md">
                    <AlertCircle className="h-5 w-5 shrink-0 text-status-error" />
                    <p className="font-sans text-[13px] text-status-error">{error}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Task */}
          {step === "task" && (
            <div className="space-y-3xl">
              <div className="space-y-xs">
                <h2 className="font-sans text-[32px] font-semibold leading-[1.2] text-text-primary">
                  Add your first task
                </h2>
                <p className="font-sans text-[15px] leading-[1.5] text-text-muted">
                  Kettles tracks time through tasks. Start with one thing you want to focus on.
                </p>
              </div>

              <div className="space-y-lg">
                <div className="space-y-sm">
                  <label htmlFor="taskTitle" className="font-sans text-[13px] font-medium text-text-secondary">
                    Task title
                  </label>
                  <input
                    id="taskTitle"
                    type="text"
                    value={data.taskTitle}
                    onChange={(e) => {
                      setData({ ...data, taskTitle: e.target.value });
                      setErrors({ ...errors, taskTitle: "" });
                    }}
                    placeholder="Design homepage mockups"
                    disabled={isSubmitting}
                    className={`h-12 w-full rounded-lg border px-md font-sans text-[15px] text-text-primary transition-colors placeholder:text-text-faint focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent)_20%,transparent)] disabled:opacity-50 ${
                      errors.taskTitle
                        ? "border-status-error bg-[color-mix(in_srgb,var(--error)_5%,transparent)] focus:border-status-error"
                        : "border-[color-mix(in_srgb,var(--accent)_10%,var(--border-subtle))] bg-surface-mid focus:border-accent"
                    }`}
                  />
                  {errors.taskTitle && (
                    <p className="font-sans text-[12px] text-status-error">{errors.taskTitle}</p>
                  )}
                </div>

                {error && (
                  <div className="flex gap-md rounded-lg border border-[color-mix(in_srgb,var(--error)_25%,transparent)] bg-[color-mix(in_srgb,var(--error)_8%,transparent)] px-lg py-md">
                    <AlertCircle className="h-5 w-5 shrink-0 text-status-error" />
                    <p className="font-sans text-[13px] text-status-error">{error}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Preference */}
          {step === "preference" && (
            <div className="space-y-3xl">
              <div className="space-y-xs">
                <h2 className="font-sans text-[32px] font-semibold leading-[1.2] text-text-primary">
                  Choose your focus rhythm
                </h2>
                <p className="font-sans text-[15px] leading-[1.5] text-text-muted">
                  Pick a default session length. You can change this later.
                </p>
              </div>

              <div className="space-y-lg">
                <div className="grid grid-cols-3 gap-lg sm:gap-md">
                  {[
                    { value: 25, label: "25 min" },
                    { value: 45, label: "45 min" },
                    { value: 60, label: "60 min" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setData({ ...data, focusDuration: option.value })}
                      className={`rounded-lg border-2 px-lg py-md font-sans text-[14px] font-semibold transition-all ${
                        data.focusDuration === option.value
                          ? "border-accent bg-[color-mix(in_srgb,var(--accent)_15%,transparent)] text-accent"
                          : "border-[color-mix(in_srgb,var(--accent)_10%,var(--border-subtle))] text-text-muted hover:border-accent hover:text-text-primary"
                      }`}
                      disabled={isSubmitting}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                {error && (
                  <div className="flex gap-md rounded-lg border border-[color-mix(in_srgb,var(--error)_25%,transparent)] bg-[color-mix(in_srgb,var(--error)_8%,transparent)] px-lg py-md">
                    <AlertCircle className="h-5 w-5 shrink-0 text-status-error" />
                    <p className="font-sans text-[13px] text-status-error">{error}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 5: Complete */}
          {step === "complete" && (
            <div className="space-y-3xl text-center">
              <div className="space-y-xs">
                <h2 className="font-sans text-[32px] font-semibold leading-[1.2] text-text-primary">
                  You&apos;re ready to focus
                </h2>
                <p className="font-sans text-[15px] leading-[1.5] text-text-muted">
                  Your workspace is set up with your first project and task.
                </p>
              </div>

              <div className="space-y-lg pt-xl">
                <div className="rounded-lg border border-[color-mix(in_srgb,var(--accent)_20%,var(--border-subtle))] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--accent)_8%,transparent),color-mix(in_srgb,var(--accent)_4%,transparent))] px-lg py-md">
                  <p className="font-sans text-[13px] leading-[1.5] text-text-muted">
                    <span className="font-semibold text-text-primary">{data.projectName}</span> {" "}
                    is created and your first task{" "}
                    <span className="font-semibold text-text-primary">{data.taskTitle}</span> {" "}
                    is ready to track.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="mt-4xl flex gap-md">
            {step !== "profile" && step !== "complete" && (
              <button
                onClick={handleBack}
                disabled={isSubmitting}
                className="flex items-center justify-center gap-2 rounded-lg border border-[color-mix(in_srgb,var(--accent)_10%,var(--border-subtle))] px-lg py-md font-sans text-[14px] font-semibold text-text-secondary transition-colors hover:border-accent hover:text-text-primary disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>
            )}

            <button
              onClick={step === "complete" ? handleComplete : handleNext}
              disabled={isSubmitting}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-accent px-lg py-md font-sans text-[14px] font-semibold text-text-primary transition-all hover:bg-accent-hover active:scale-95 disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : step === "complete" ? (
                <>
                  Go to Dashboard
                  <ChevronRight className="h-4 w-4" />
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>

          {/* Footer */}
          <div className="mt-4xl text-center">
            <p className="font-sans text-[12px] leading-[1.5] text-text-faint">
              You can update your profile and preferences anytime after onboarding.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
