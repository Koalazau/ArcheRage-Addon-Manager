import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bqowsaiwpqmztxyujmoa.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxb3dzYWl3cHFtenR4eXVqbW9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxNTg3OTQsImV4cCI6MjA2NzczNDc5NH0.PfivsdHpMEdGfeoA6WNXm5G7m5WNOTD4XW2mB06641g';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
