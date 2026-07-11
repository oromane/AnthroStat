-- Create the usage_logs table
CREATE TABLE usage_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamptz DEFAULT now() NOT NULL,
    usage_percentage int2 NOT NULL,
    status text NOT NULL CHECK (status IN ('active', 'error'))
);

-- Set up Row Level Security (RLS)
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;

-- Create policy to allow read access for authenticated and anonymous users
CREATE POLICY "Allow public read access"
ON usage_logs
FOR SELECT
TO public
USING (true);

-- Policy to allow inserts from authenticated API (n8n backend)
CREATE POLICY "Allow insert from authenticated"
ON usage_logs
FOR INSERT
TO authenticated
WITH CHECK (true);
