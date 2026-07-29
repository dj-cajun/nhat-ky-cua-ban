-- Extended tables for formal service (Phase 2+)

-- Profile cosmetics & defense
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS theme_id TEXT DEFAULT 'default',
  ADD COLUMN IF NOT EXISTS badge_emoji TEXT,
  ADD COLUMN IF NOT EXISTS surname_blur_until TIMESTAMPTZ;

-- Class founding (3-member activation)
CREATE TABLE IF NOT EXISTS class_foundings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE UNIQUE,
  founder_id UUID NOT NULL REFERENCES profiles(id),
  invite_token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'expired')),
  member_count INT NOT NULL DEFAULT 1,
  activated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Reports & blocks
CREATE TABLE IF NOT EXISTS user_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES profiles(id),
  target_id UUID NOT NULL REFERENCES profiles(id),
  reason TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES profiles(id),
  blocked_id UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (blocker_id, blocked_id)
);

-- Dotori economy (server)
CREATE TABLE IF NOT EXISTS dotori_gifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES profiles(id),
  receiver_id UUID NOT NULL REFERENCES profiles(id),
  gift_type TEXT NOT NULL CHECK (gift_type IN ('dotori', 'deco', 'theme', 'sticker', 'mystery')),
  amount INT,
  item_id TEXT,
  is_anonymous BOOLEAN DEFAULT true,
  message VARCHAR(10) DEFAULT '',
  opened_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dotori_gifts_receiver ON dotori_gifts(receiver_id, created_at DESC);

CREATE TABLE IF NOT EXISTS dotori_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  purchase_key TEXT NOT NULL,
  amount INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, purchase_key)
);

ALTER TABLE class_foundings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE dotori_gifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE dotori_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "class_foundings_read" ON class_foundings FOR SELECT USING (true);
CREATE POLICY "user_reports_insert" ON user_reports FOR INSERT WITH CHECK (true);
CREATE POLICY "user_blocks_own" ON user_blocks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dotori_gifts_class" ON dotori_gifts FOR SELECT USING (true);
CREATE POLICY "dotori_gifts_insert" ON dotori_gifts FOR INSERT WITH CHECK (true);
CREATE POLICY "dotori_purchases_own" ON dotori_purchases FOR ALL USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE dotori_gifts;
