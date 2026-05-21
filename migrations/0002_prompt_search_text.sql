CREATE INDEX IF NOT EXISTS idx_prompts_search_filters
ON prompts(status, access, pack_id, tool, modality, quality_score, updated_at);
