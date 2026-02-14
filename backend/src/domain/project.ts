export interface Project {
  id: number;
  name: string;
  slug: string;
  path: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  created_at: string;
  updated_at: string;
}
