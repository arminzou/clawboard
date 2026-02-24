export interface Document {
  id: number;
  file_path: string;
  file_type: string | null;
  last_modified: string | null;
  last_modified_by: string | null;
  size_bytes: number | null;
  git_status: string | null;
}
