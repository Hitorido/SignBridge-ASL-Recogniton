-- SignBridge Database Schema
-- Run these queries in your Supabase SQL Editor

-- ====================================
-- USERS TABLE (Extends Supabase Auth)
-- ====================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  username VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255),
  avatar_url TEXT,
  bio TEXT,
  is_active BOOLEAN DEFAULT TRUE
);

-- ====================================
-- SIGNS TABLE (Hand Sign Records)
-- ====================================
CREATE TABLE IF NOT EXISTS public.signs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  sign_letter VARCHAR(1) NOT NULL, -- A-Z
  confidence_level NUMERIC(5, 2), -- 0-100%
  duration_ms INTEGER, -- How long the sign was held
  notes TEXT
);

-- ====================================
-- SIGN HISTORY TABLE
-- ====================================
CREATE TABLE IF NOT EXISTS public.sign_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  sequence TEXT NOT NULL, -- Concatenated signs (e.g., "HELLO")
  duration_ms INTEGER,
  total_confidence NUMERIC(5, 2),
  notes TEXT
);

-- ====================================
-- CONVERSATIONS TABLE (AI Chat History)
-- ====================================
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  title VARCHAR(255),
  is_archived BOOLEAN DEFAULT FALSE
);

-- ====================================
-- MESSAGES TABLE (AI Chat Messages)
-- ====================================
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  sender VARCHAR(50) NOT NULL CHECK (sender IN ('user', 'ai')), -- 'user' or 'ai'
  content TEXT NOT NULL,
  tokens_used INTEGER -- For tracking API usage
);

-- ====================================
-- LEARNING PROGRESS TABLE
-- ====================================
CREATE TABLE IF NOT EXISTS public.learning_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  total_signs_practiced INTEGER DEFAULT 0,
  accuracy_percentage NUMERIC(5, 2) DEFAULT 0,
  streak_days INTEGER DEFAULT 0,
  last_practiced_date DATE
);

-- ====================================
-- SETTINGS TABLE
-- ====================================
CREATE TABLE IF NOT EXISTS public.user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  theme VARCHAR(20) DEFAULT 'dark', -- 'dark' or 'light'
  notifications_enabled BOOLEAN DEFAULT TRUE,
  language VARCHAR(10) DEFAULT 'en',
  camera_resolution VARCHAR(20) DEFAULT 'hd', -- 'hd' or 'fullhd'
  model_detection_threshold NUMERIC(3, 2) DEFAULT 0.70 -- Confidence threshold
);

-- ====================================
-- FEEDBACK TABLE
-- ====================================
CREATE TABLE IF NOT EXISTS public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  type VARCHAR(50) NOT NULL, -- 'bug', 'feature_request', 'general'
  message TEXT NOT NULL,
  is_resolved BOOLEAN DEFAULT FALSE
);

-- ====================================
-- INDEXES FOR PERFORMANCE
-- ====================================
CREATE INDEX IF NOT EXISTS idx_signs_user_id ON public.signs(user_id);
CREATE INDEX IF NOT EXISTS idx_signs_created_at ON public.signs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sign_history_user_id ON public.sign_history(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON public.messages(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_progress_user_id ON public.learning_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);

-- ====================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================
-- Users Table RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Signs Table RLS
ALTER TABLE public.signs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own signs"
  ON public.signs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own signs"
  ON public.signs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Sign History Table RLS
ALTER TABLE public.sign_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sign history"
  ON public.sign_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sign history"
  ON public.sign_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Conversations Table RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own conversations"
  ON public.conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own conversations"
  ON public.conversations FOR ALL
  USING (auth.uid() = user_id);

-- Messages Table RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own conversation messages"
  ON public.messages FOR SELECT
  USING (
    auth.uid() = user_id OR
    conversation_id IN (
      SELECT id FROM public.conversations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages in their conversations"
  ON public.messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Learning Progress Table RLS
ALTER TABLE public.learning_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own learning progress"
  ON public.learning_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own learning progress"
  ON public.learning_progress FOR ALL
  USING (auth.uid() = user_id);

-- Settings Table RLS
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own settings"
  ON public.user_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own settings"
  ON public.user_settings FOR ALL
  USING (auth.uid() = user_id);

-- Feedback Table RLS
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own feedback"
  ON public.feedback FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert feedback"
  ON public.feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);
