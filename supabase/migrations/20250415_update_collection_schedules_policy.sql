
-- Enable RLS for collection_schedules table
ALTER TABLE public.collection_schedules ENABLE ROW LEVEL SECURITY;

-- Create policy for anyone to read collection schedules
CREATE POLICY "Anyone can read collection schedules"
  ON public.collection_schedules
  FOR SELECT
  USING (true);

-- Create policy for admins to insert collection schedules
CREATE POLICY "Admins can insert collection schedules"
  ON public.collection_schedules
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Create policy for admins to update collection schedules
CREATE POLICY "Admins can update collection schedules"
  ON public.collection_schedules
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Create policy for admins to delete collection schedules
CREATE POLICY "Admins can delete collection schedules"
  ON public.collection_schedules
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Create trigger to update updated_at timestamp when collection schedules are modified
CREATE TRIGGER update_collection_schedules_updated_at
  BEFORE UPDATE ON public.collection_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_collection_schedules_updated_at();
