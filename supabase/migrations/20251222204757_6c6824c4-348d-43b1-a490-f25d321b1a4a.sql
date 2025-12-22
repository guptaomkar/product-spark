-- Create update_updated_at_column function first
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create table for manufacturer training configurations
CREATE TABLE public.manufacturer_trainings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  manufacturer TEXT NOT NULL,
  test_url TEXT NOT NULL,
  selectors JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(manufacturer)
);

-- Enable Row Level Security (public access for now as no auth)
ALTER TABLE public.manufacturer_trainings ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
CREATE POLICY "Allow public read access" 
ON public.manufacturer_trainings 
FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert access" 
ON public.manufacturer_trainings 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public update access" 
ON public.manufacturer_trainings 
FOR UPDATE 
USING (true);

CREATE POLICY "Allow public delete access" 
ON public.manufacturer_trainings 
FOR DELETE 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_manufacturer_trainings_updated_at
BEFORE UPDATE ON public.manufacturer_trainings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();